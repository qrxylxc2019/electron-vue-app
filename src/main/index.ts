import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import { OpenAI } from 'openai';
import fs from 'fs';
import { getOpenAIClient, getCurrentModel, PROMPTS, callAIWithFallback, setDeepSeekLocalToken } from './apikey';
import { setupDeepSeekIpc, initDeepSeekClient, getDeepSeekClient } from './deepseek';
import { DeepSeekClient } from './deepseek/client';

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

// 日志文件路径
const logFile = path.join(app.getPath('userData'), 'app.log');

function log(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {
    console.error('Write log failed:', e);
  }
  console.log(message);
}

// 清空日志（每次启动时）
function clearLog() {
  try {
    fs.writeFileSync(logFile, '');
  } catch (e) {
    console.error('Clear log failed:', e);
  }
}

// 获取数据库路径
function getDbPath(): string {
  const isDev = !app.isPackaged;
  log(`getDbPath: isDev=${isDev}`);
  log(`getDbPath: __dirname=${__dirname}`);
  log(`getDbPath: app.getAppPath()=${app.getAppPath()}`);

  // 统一使用项目目录下的数据库，开发和生产环境都用同一个
  const projectRoot = isDev
    ? path.join(__dirname, '..', '..')
    : path.join(process.resourcesPath, '..', '..', '..');
  const dbDir = path.join(projectRoot, 'out', 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    log(`Created dbDir: ${dbDir}`);
  }
  const dbPath = path.join(dbDir, 'qingrui.db');
  log(`Unified dbPath: ${dbPath}`);
  return dbPath;
}

// 从打包资源中复制初始数据库（仅在数据库不存在时复制）
function copyDbFromResources() {
  const isDev = !app.isPackaged;
  log(`copyDbFromResources: isDev=${isDev}`);

  // 如果数据库已存在，跳过复制
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    log('Database already exists, skipping copy');
    return;
  }

  // 开发环境不需要复制
  if (isDev) {
    log('Dev mode: no database to copy');
    return;
  }

  // 打包环境：从 resources 复制初始数据库
  try {
    const resourceDbPath = path.join(process.resourcesPath, 'data', 'qingrui.db');
    log(`Resource DB path: ${resourceDbPath}`);
    log(`Resource DB exists: ${fs.existsSync(resourceDbPath)}`);

    if (fs.existsSync(resourceDbPath)) {
      fs.copyFileSync(resourceDbPath, dbPath);
      log('Database copied from resources');
    } else {
      log('Resource database not found, will create new database');
    }
  } catch (err: any) {
    log(`Copy database error: ${err.message}`);
  }
}

// 初始化数据库
function initDatabase() {
  log('=== initDatabase start ===');
  // 先尝试从资源目录复制数据库
  copyDbFromResources();

  const dbPath = getDbPath();
  log(`Final Database path: ${dbPath}`);
  log(`Database file exists: ${fs.existsSync(dbPath)}`);

  try {
    db = new Database(dbPath);
    log('Database opened successfully');

    // 创建目录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES directories(id)
      )
    `);

    // ������Ŀ??
    db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        pid INTEGER DEFAULT NULL,
        question_type TEXT NOT NULL CHECK(question_type IN ('single', 'multiple', 'judge', 'write')),
        title TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        option_e TEXT,
        correct_answer TEXT,
        explanation TEXT,
        ai_explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id),
        FOREIGN KEY (pid) REFERENCES questions(id)
      )
    `);

    // �������±� article ��ר�����洢��������
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        correct_answer TEXT,
        explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id)
      )
    `);

    // 英语阅读材料表
    db.exec(`
      CREATE TABLE IF NOT EXISTS english_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id)
      )
    `);

    // 英语阅读题目表
    db.exec(`
      CREATE TABLE IF NOT EXISTS english_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        question_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_answer TEXT,
        explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES english_materials(id) ON DELETE CASCADE
      )
    `);

    // 案例材料表
    db.exec(`
      CREATE TABLE IF NOT EXISTS case_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id)
      )
    `);

    // 案例小题表
    db.exec(`
      CREATE TABLE IF NOT EXISTS case_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        pid INTEGER DEFAULT NULL,
        question_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        answer TEXT,
        ai_explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES case_materials(id) ON DELETE CASCADE,
        FOREIGN KEY (pid) REFERENCES case_questions(id)
      )
    `);

    // API 设置已改为前端本地存储 + 后端硬编码，无需数据库表

    console.log('Database initialized successfully');

    // 初始化默认数据：高项论文章节和论文题目
    seedDefaultData();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// API 设置已改为前端本地存储 + 后端硬编码，无需数据库相关函数

// 初始化默认数据
function seedDefaultData() {
  if (!db) return;

  try {
    // 检查是否已有高项论文科目
    const checkDir = db.prepare("SELECT id FROM directories WHERE name = '高项论文'");
    const existingDir = checkDir.get();

    let dirId: number;
    if (!existingDir) {
      // 插入高项论文科目
      const insertDir = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
      const dirResult = insertDir.run('高项论文', 0);
      dirId = Number(dirResult.lastInsertRowid);
      console.log('Created directory: 高项论文, id:', dirId);
    } else {
      dirId = (existingDir as any).id;
    }

    // 检查 article 表是否已有论文（只检查高项论文科目下的文章）
    const checkArticle = db.prepare("SELECT COUNT(*) as count FROM articles WHERE directory_id = ?");
    const articleCount = (checkArticle.get(dirId) as any).count;

    // 检查是否包含用户自定义论文（id > 24 的是用户通过脚本录入的）
    const checkCustomArticle = db.prepare("SELECT COUNT(*) as count FROM articles WHERE directory_id = ? AND id > 24");
    const customArticleCount = (checkCustomArticle.get(dirId) as any).count;

    if (articleCount === 0 || customArticleCount === 0) {
      // 插入高项论文到 article 表
      const insertArticle = db.prepare(`
        INSERT INTO articles (directory_id, title, content, correct_answer, explanation, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const papers = [
        {
          title: '论信息系统项目的范围管理',
          content: `摘要
2023年3月至2023年12月，我作为项目经理参与了某市智慧交通综合管理平台的建设工作，该项目总投资860万元，工期10个月。该项目旨在构建一个集交通监控、信号控制、应急指挥、数据分析于一体的综合管理平台，以提升城市交通管理水平。本文以该项目为例，论述信息系统项目的范围管理，包括规划范围管理、收集需求、定义范围、创建WBS、确认范围和控制范围六个过程。

正文
一、规划范围管理
在项目启动阶段，我组织项目团队和相关干系人召开了范围规划会议。我们参考了公司以往类似项目的范围管理计划模板，结合本项目的特点，制定了详细的范围管理计划。该计划明确了范围定义的方法、WBS的分解层级、范围确认的流程以及范围变更的控制程序。同时，我们确定了使用需求跟踪矩阵来管理需求，确保每个需求都能追溯到其来源和实现状态。

二、收集需求
为了全面收集项目需求，我采用了多种方法。首先，通过访谈和问卷调查的方式，与交通局各业务部门进行了深入沟通，了解他们的业务痛点和期望。其次，组织了多次需求研讨会，邀请业务专家和技术专家共同参与，对关键业务流程进行了详细梳理。此外，我们还对现有系统进行了详细分析，识别出需要保留和改进的功能。最终，我们收集并记录了超过300项功能需求和非功能需求，形成了完整的需求文件。

三、定义范围
基于收集到的需求，我组织团队编制了详细的项目范围说明书。范围说明书明确了项目的目标、可交付成果、验收标准以及项目的边界。我们特别强调了项目的 exclusions，即明确哪些内容不在本项目范围内，如硬件设备的采购安装由甲方另行负责。同时，我们将需求文件中的需求与范围说明书进行了映射，确保所有需求都被包含在范围内。

四、创建WBS
为了将项目范围分解为可管理的工作包，我带领团队采用自上而下的方法创建了WBS。我们将项目分解为5个主要阶段：需求分析、系统设计、系统开发、系统测试和系统部署。每个阶段进一步分解为具体的工作包，最终形成了4层WBS结构，包含超过80个工作包。每个工作包都明确了负责人、工期和成本预算，为后续的进度和成本管理奠定了基础。

五、确认范围
在项目的各个阶段里程碑，我组织了范围确认活动。我们邀请甲方代表和业务用户参与评审，通过演示和检查的方式，验证已完成的可交付成果是否符合范围说明书的要求。对于发现的问题，我们及时记录并安排整改。通过这种定期的范围确认，我们确保了项目始终沿着正确的方向推进，避免了后期大规模的返工。

六、控制范围
在项目执行过程中，我严格执行范围变更控制程序。所有变更请求都必须通过正式的变更控制流程，由变更控制委员会进行评审。我们建立了变更影响分析机制，评估每个变更对进度、成本和质量的影响。对于批准的变更，我们及时更新范围说明书、WBS和需求跟踪矩阵。通过严格的范围控制，我们有效避免了范围蔓延，确保了项目按时按质完成。

结语
通过有效的范围管理，该项目于2023年12月顺利交付，获得了甲方的高度评价。项目最终的功能覆盖率达到了98%，用户满意度达到了95%以上。这次项目实践让我深刻认识到，范围管理是项目成功的基础，只有明确范围、控制范围，才能确保项目目标的实现。`,
          correct_answer: '范围管理包括规划范围管理、收集需求、定义范围、创建WBS、确认范围和控制范围六个过程',
          explanation: '信息系统项目管理师论文写作要点：需要结合实际项目，详细论述范围管理的六个过程组'
        },
        {
          title: '论信息系统项目的风险管理',
          content: `摘要
2022年6月至2023年3月，我作为项目经理参与了某省医疗保障信息平台的建设工作，该项目总投资1200万元，工期9个月。该项目旨在构建一个覆盖全省的医疗保障信息平台，实现医保业务的线上办理和数据的实时共享。本文以该项目为例，论述信息系统项目的风险管理，包括规划风险管理、识别风险、实施定性风险分析、实施定量风险分析、规划风险应对和实施风险应对六个过程。

正文
一、规划风险管理
在项目启动阶段，我组织项目团队制定了风险管理计划。考虑到医疗行业的特殊性，我们特别关注了数据安全、系统稳定性和合规性等方面的风险。风险管理计划明确了风险管理的组织架构、风险分类标准、风险概率和影响评估矩阵，以及风险应对的策略框架。我们决定采用风险登记册来跟踪和管理所有已识别的风险。

二、识别风险
我采用了多种技术来识别项目风险。通过头脑风暴会议，团队成员从各自的专业角度提出了潜在风险。通过文档审查，我们分析了类似项目的历史风险数据。通过SWOT分析，我们识别了项目的优势、劣势、机会和威胁。最终，我们识别出了超过50项风险，包括技术风险、管理风险、外部风险和合规风险等类别。

三、实施定性风险分析
对于识别出的风险，我组织团队进行了定性分析。我们使用概率-影响矩阵对每个风险进行了评估，确定了风险的发生概率和对项目目标的影响程度。根据评估结果，我们将风险分为高、中、低三个优先级。对于高风险项，我们给予了特别的关注，并制定了详细的应对计划。

四、实施定量风险分析
对于关键的高风险项，我们进一步进行了定量分析。使用蒙特卡洛模拟技术，我们对项目工期和成本进行了模拟分析，评估了风险对项目整体目标的影响。分析结果显示，在现有风险条件下，项目有85%的概率在预算内完成，有90%的概率按期交付。这些量化结果为项目决策提供了重要依据。

五、规划风险应对
针对不同优先级的风险，我们制定了相应的应对策略。对于技术风险，我们采用了原型开发和渐进明细的策略，通过早期验证降低技术不确定性。对于人员风险，我们建立了知识共享机制和备份人员计划。对于外部依赖风险，我们与供应商签订了严格的SLA协议。所有应对措施都记录在风险登记册中，并明确了责任人。

六、实施风险应对
在项目执行过程中，我定期组织风险审查会议，跟踪风险的状态和应对措施的执行情况。对于新出现的风险，我们及时识别并纳入管理。对于已发生的风险，我们启动应急计划，将风险影响控制在最小范围内。通过持续的风险监控和应对，我们成功避免了多次潜在的项目危机。

结语
通过系统的风险管理，该项目于2023年3月顺利上线运行，系统稳定性达到了99.9%，数据安全零事故。这次项目实践让我深刻认识到，风险管理不是一次性的活动，而是贯穿项目全生命周期的持续过程。只有主动识别、科学分析和有效应对风险，才能确保项目的成功交付。`,
          correct_answer: '风险管理包括规划风险管理、识别风险、定性分析、定量分析、规划应对和实施应对六个过程',
          explanation: '信息系统项目管理师论文写作要点：需要结合实际项目，详细论述风险管理的六个过程组'
        },
        {
          title: '论信息系统项目的质量管理',
          content: `摘要
2021年5月至2022年2月，我作为项目经理参与了某银行核心系统升级改造项目的建设工作，该项目总投资2000万元，工期10个月。该项目旨在对银行核心系统进行技术架构升级，提升系统的处理能力和安全性。本文以该项目为例，论述信息系统项目的质量管理，包括规划质量管理、管理质量和控制质量三个过程。

正文
一、规划质量管理
在项目启动阶段，我组织项目团队和相关干系人制定了质量管理计划。考虑到银行系统对安全性和稳定性的高要求，我们制定了严格的质量标准。我们参考了ISO 9001质量管理体系和CMMI能力成熟度模型，结合银行业的监管要求，建立了项目的质量指标体系。质量指标包括功能正确率、代码缺陷密度、系统响应时间、安全漏洞数量等关键指标。

二、管理质量
为了确保项目过程的质量，我实施了全面的质量保证活动。我们建立了代码审查制度，所有代码在提交前必须经过至少两名资深开发人员的审查。我们引入了持续集成和持续部署（CI/CD）流程，每次代码提交都会自动触发构建和单元测试。我们定期组织质量审计，检查项目过程是否符合既定的质量标准和流程规范。通过这些质量保证活动，我们将代码缺陷率控制在每千行代码0.5个以下。

三、控制质量
在项目各阶段，我严格执行质量控制活动。在需求阶段，我们组织了多轮需求评审，确保需求的完整性和一致性。在设计阶段，我们进行了详细的设计评审，包括架构评审、数据库设计和接口设计评审。在开发阶段，我们执行了单元测试、集成测试和系统测试，测试覆盖率达到了85%以上。在验收阶段，我们组织了用户验收测试（UAT），确保系统满足业务需求。

结语
通过严格的质量管理，该项目于2022年2月成功上线，系统性能提升了3倍，安全漏洞零发现，用户满意度达到了98%。这次项目实践让我深刻认识到，质量是项目的生命线，只有将质量管理贯穿于项目的全过程，才能交付高质量的系统。`,
          correct_answer: '质量管理包括规划质量管理、管理质量和控制质量三个过程',
          explanation: '信息系统项目管理师论文写作要点：需要结合实际项目，详细论述质量管理的三个过程组'
        },
        {
          title: '论信息系统项目的整体管理',
          content: `摘要
2023年1月至2023年10月，我作为项目经理参与了某大型制造企业ERP系统实施项目的建设工作，该项目总投资1500万元，工期10个月。该项目旨在通过ERP系统的实施，整合企业的人、财、物、产、供、销等资源，提升企业管理效率。本文以该项目为例，论述信息系统项目的整体管理，包括制定项目章程、制定项目管理计划、指导与管理项目工作、管理项目知识、监控项目工作、实施整体变更控制和结束项目或阶段七个过程。

正文
一、制定项目章程
在项目启动阶段，我协助项目发起人和甲方领导制定了项目章程。项目章程明确了项目的目标、范围、主要干系人、项目经理的权限和项目的总体要求。通过项目章程的制定，我们为项目确立了正式的合法地位，为后续的项目管理工作奠定了基础。

二、制定项目管理计划
我组织项目团队编制了 comprehensive 的项目管理计划。该计划整合了范围管理计划、进度管理计划、成本管理计划、质量管理计划、资源管理计划、沟通管理计划、风险管理计划和采购管理计划等各个子计划。项目管理计划经过甲方评审确认后，成为项目执行的基准。

三、指导与管理项目工作
在项目执行阶段，我按照项目管理计划指导团队开展工作。我建立了每日站会、周例会和月度汇报的沟通机制，确保项目信息的及时传递。我协调各方资源，解决项目执行过程中的问题和冲突。通过有效的执行管理，我们确保了项目按计划有序推进。

四、管理项目知识
我重视项目知识的管理和积累。我们建立了项目知识库，记录项目过程中的经验教训、最佳实践和技术方案。我们定期组织经验分享会，促进团队成员之间的知识交流。通过知识管理，我们提升了团队的整体能力，为后续项目提供了宝贵的参考。

五、监控项目工作
我建立了完善的项目监控体系。通过挣值分析（EVM）技术，我们定期监控项目的进度和成本绩效。通过质量审计和风险审查，我们监控项目的质量和风险状态。当发现偏差时，我们及时分析原因并采取纠正措施。

六、实施整体变更控制
我严格执行整体变更控制程序。所有变更请求都必须经过正式的变更控制流程，评估其对项目各方面的影响。我们建立了变更控制委员会（CCB），负责审批重大变更。通过严格的变更控制，我们有效避免了范围蔓延，确保了项目目标的实现。

七、结束项目或阶段
在项目收尾阶段，我组织了系统的项目验收和移交工作。我们整理了项目文档，进行了经验教训总结，释放了项目资源。通过规范的收尾管理，我们确保了项目的顺利结束和知识的有效传承。

结语
通过系统的整体管理，该项目于2023年10月成功交付，系统运行稳定，企业管理效率提升了40%。这次项目实践让我深刻认识到，整体管理是项目成功的关键，只有统筹协调各个知识领域，才能实现项目的整体最优。`,
          correct_answer: '整体管理包括制定章程、制定计划、指导执行、管理知识、监控工作、变更控制和结束项目七个过程',
          explanation: '信息系统项目管理师论文写作要点：需要结合实际项目，详细论述整体管理的七个过程组'
        },
        {
          title: '论信息系统项目的沟通管理',
          content: `摘要
2022年8月至2023年5月，我作为项目经理参与了某高校智慧校园平台的建设工作，该项目总投资980万元，工期10个月。该项目涉及教务处、学生处、财务处、后勤处等多个部门，干系人众多且需求复杂。本文以该项目为例，论述信息系统项目的沟通管理，包括规划沟通管理、管理沟通和监督沟通三个过程。

正文
一、规划沟通管理
在项目启动阶段，我首先对项目干系人进行了全面识别和分析。我们识别出了超过30个关键干系人，包括校领导、各部门负责人、一线业务人员和最终用户。针对不同干系人的特点和需求，我制定了差异化的沟通策略。对于校领导，我们采用月度汇报的方式，重点汇报项目里程碑和关键风险。对于业务部门，我们采用周例会的方式，及时沟通需求变更和项目进展。对于技术团队，我们采用每日站会和即时通讯工具，确保技术问题的快速响应。

二、管理沟通
在项目执行过程中，我严格执行沟通管理计划。我们建立了多层次的沟通渠道：正式会议包括项目启动会、周例会、月度汇报会和里程碑评审会；非正式沟通包括即时通讯群组、邮件列表和一对一交流。我们建立了项目信息共享平台，所有项目文档、会议纪要和决策记录都在平台上公开共享。对于重要的决策和变更，我们采用书面形式进行确认，确保信息的准确传递。

三、监督沟通
我定期评估沟通的效果，并根据实际情况调整沟通策略。通过干系人满意度调查，我们了解到部分业务人员对需求变更的响应速度不满意。针对这一问题，我们优化了需求变更的沟通流程，建立了快速响应机制。通过沟通效果的持续改进，我们提升了干系人的参与度和满意度，为项目的顺利推进创造了良好的环境。

结语
通过有效的沟通管理，该项目于2023年5月顺利交付，用户满意度达到了96%，需求变更响应时间缩短了50%。这次项目实践让我深刻认识到，在信息系统项目中，沟通管理至关重要。只有建立有效的沟通机制，确保信息的及时、准确传递，才能协调各方力量，推动项目成功。`,
          correct_answer: '沟通管理包括规划沟通管理、管理沟通和监督沟通三个过程',
          explanation: '信息系统项目管理师论文写作要点：需要结合实际项目，详细论述沟通管理的三个过程组'
        }
      ];

      papers.forEach((paper, index) => {
        insertArticle.run(
          dirId,
          paper.title,
          paper.content,
          paper.correct_answer,
          paper.explanation,
          index
        );
      });

      console.log(`Inserted ${papers.length} articles into directory ${dirId}`);
    } else {
      console.log(`Directory ${dirId} already has ${articleCount} articles, skipping seed`);
    }
  } catch (err) {
    console.error('Seed default data error:', err);
  }

  // 初始化考研政治科目
  try {
    const checkKaoyan = db.prepare("SELECT id FROM directories WHERE name = '考研政治'");
    const existingKaoyan = checkKaoyan.get();

    let kaoyanDirId: number;
    if (!existingKaoyan) {
      const insertKaoyan = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
      const kaoyanResult = insertKaoyan.run('考研政治', 1);
      kaoyanDirId = Number(kaoyanResult.lastInsertRowid);
      console.log('Created directory: 考研政治, id:', kaoyanDirId);
    } else {
      kaoyanDirId = (existingKaoyan as any).id;
      console.log('Directory 考研政治 already exists, id:', kaoyanDirId);
    }
  } catch (err) {
    console.error('Seed 考研政治 data error:', err);
  }

  // 初始化考研英语科目
  try {
    const checkEnglish = db.prepare("SELECT id FROM directories WHERE name = '考研英语'");
    const existingEnglish = checkEnglish.get();

    let englishDirId: number;
    if (!existingEnglish) {
      const insertEnglish = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
      const englishResult = insertEnglish.run('考研英语', 2);
      englishDirId = Number(englishResult.lastInsertRowid);
      console.log('Created directory: 考研英语, id:', englishDirId);
    } else {
      englishDirId = (existingEnglish as any).id;
      console.log('Directory 考研英语 already exists, id:', englishDirId);
    }
  } catch (err) {
    console.error('Seed 考研英语 data error:', err);
  }
}

// IPC ����
function setupIpc() {
  // ��ȡĿ¼�б�
  ipcMain.handle('db:getDirectories', () => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM directories ORDER BY sort_order, id');
      return stmt.all();
    } catch (err) {
      console.error('getDirectories error:', err);
      return [];
    }
  });

  // ��ȡĳĿ¼�µ���Ŀ��??
  ipcMain.handle('db:getQuestions', (_event, directoryId: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM questions WHERE directory_id = ? ORDER BY sort_order, id');
      return stmt.all(directoryId);
    } catch (err) {
      console.error('getQuestions error:', err);
      return [];
    }
  });

  // 模糊查询题目（按标题关键词）
  ipcMain.handle('db:searchQuestions', (_event, directoryId: number, keyword: string) => {
    if (!db) return [];
    try {
      const stmt = db.prepare(`
        SELECT * FROM questions 
        WHERE directory_id = ? AND title LIKE ? 
        ORDER BY sort_order, id
      `);
      return stmt.all(directoryId, `%${keyword}%`);
    } catch (err) {
      console.error('searchQuestions error:', err);
      return [];
    }
  });

  // ��ȡĳĿ¼�µ����±� article
  ipcMain.handle('db:getArticles', (_event, directoryId: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM articles WHERE directory_id = ? ORDER BY id');
      return stmt.all(directoryId);
    } catch (err) {
      console.error('getArticles error:', err);
      return [];
    }
  });

  // ��ȡ������Ŀ
  ipcMain.handle('db:getQuestion', (_event, id: number) => {
    if (!db) return null;
    try {
      const stmt = db.prepare('SELECT * FROM questions WHERE id = ?');
      return stmt.get(id);
    } catch (err) {
      console.error('getQuestion error:', err);
      return null;
    }
  });

  // ɾ����Ŀ
  ipcMain.handle('db:deleteQuestion', (_event, id: number) => {
    if (!db) return false;
    try {
      // 先删除关联的同类题（子题）
      const deleteSimilar = db.prepare('DELETE FROM questions WHERE pid = ?');
      deleteSimilar.run(id);
      // 再删除题目本身
      const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteQuestion error:', err);
      return false;
    }
  });

  // ɾ������
  ipcMain.handle('db:deleteArticle', (_event, id: number) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('DELETE FROM articles WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteArticle error:', err);
      return false;
    }
  });

  // ����Ŀ¼��������ԣ�
  ipcMain.handle('db:addDirectory', (_event, name: string, parentId: number | null = null) => {
    if (!db) return null;
    try {
      const stmt = db.prepare('INSERT INTO directories (name, parent_id) VALUES (?, ?)');
      const result = stmt.run(name, parentId);
      return { id: result.lastInsertRowid, name, parent_id: parentId };
    } catch (err) {
      console.error('addDirectory error:', err);
      return null;
    }
  });

  // 删除目录
  ipcMain.handle('db:deleteDirectory', (_event, id: number) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('DELETE FROM directories WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteDirectory error:', err);
      return false;
    }
  });

  // 获取英语阅读材料列表
  ipcMain.handle('english:getReadings', (_event, dirId: number) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const materialsStmt = db.prepare('SELECT * FROM english_materials WHERE directory_id = ? ORDER BY id');
      const materials = materialsStmt.all(dirId) as any[];

      const questionsStmt = db.prepare('SELECT * FROM english_questions WHERE material_id = ? ORDER BY question_number');
      for (const material of materials) {
        material.questions = questionsStmt.all(material.id);
      }

      return { success: true, materials };
    } catch (err: any) {
      console.error('getEnglishReadings error:', err);
      return { success: false, error: err.message };
    }
  });

  // 添加英语阅读材料
  ipcMain.handle('english:addReading', (_event, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const insertMaterial = db.prepare(`
        INSERT INTO english_materials (directory_id, title, content)
        VALUES (?, ?, ?)
      `);
      const materialResult = insertMaterial.run(data.directory_id, data.title || '', data.content);
      const materialId = Number(materialResult.lastInsertRowid);

      const insertQuestion = db.prepare(`
        INSERT INTO english_questions (material_id, question_number, title, option_a, option_b, option_c, option_d, correct_answer, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const q of data.questions) {
        insertQuestion.run(
          materialId,
          q.question_number,
          q.title,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_answer,
          q.explanation || ''
        );
      }

      return { success: true, materialId };
    } catch (err: any) {
      console.error('addEnglishReading error:', err);
      return { success: false, error: err.message };
    }
  });

  // 获取考研英语单词图片列表
  ipcMain.handle('word:getImages', () => {
    try {
      const wordDir = 'D:\\考研\\英语单词';
      if (!fs.existsSync(wordDir)) {
        return { success: false, error: '单词目录不存在: ' + wordDir };
      }
      const files = fs.readdirSync(wordDir);
      const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file));

      // 读取图片并转换为 base64
      const images = imageFiles.map(file => {
        const filePath = path.join(wordDir, file);
        const ext = path.extname(file).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.bmp') mimeType = 'image/bmp';
        else if (ext === '.webp') mimeType = 'image/webp';

        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
      });

      return { success: true, images };
    } catch (err: any) {
      console.error('getWordImages error:', err);
      return { success: false, error: err.message };
    }
  });

  // ������Ŀ��������ԣ�
  ipcMain.handle('db:addQuestion', (_event, question: any) => {
    if (!db) return null;
    try {
      const stmt = db.prepare(`
        INSERT INTO questions (directory_id, pid, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, ai_explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        question.directory_id,
        question.pid || null,
        question.question_type,
        question.title,
        question.option_a || null,
        question.option_b || null,
        question.option_c || null,
        question.option_d || null,
        question.option_e || null,
        question.correct_answer,
        question.explanation || null,
        question.ai_explanation || null
      );
      return { id: result.lastInsertRowid, ...question };
    } catch (err) {
      console.error('addQuestion error:', err);
      return null;
    }
  });

  // 获取某题目的同类题
  ipcMain.handle('db:getSimilarQuestions', (_event, pid: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM questions WHERE pid = ? ORDER BY sort_order, id');
      return stmt.all(pid);
    } catch (err) {
      console.error('getSimilarQuestions error:', err);
      return [];
    }
  });

  // 批量添加同类题
  ipcMain.handle('db:addSimilarQuestions', (_event, questions: any[]) => {
    if (!db) return [];
    try {
      const insert = db.prepare(`
        INSERT INTO questions (directory_id, pid, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const results: any[] = [];
      for (const q of questions) {
        const result = insert.run(
          q.directory_id,
          q.pid,
          q.question_type,
          q.title,
          q.option_a || null,
          q.option_b || null,
          q.option_c || null,
          q.option_d || null,
          q.option_e || null,
          q.correct_answer,
          q.explanation || null
        );
        results.push({ id: result.lastInsertRowid, ...q });
      }
      return results;
    } catch (err) {
      console.error('addSimilarQuestions error:', err);
      return [];
    }
  });

  // 更新题目 AI 解析
  ipcMain.handle('db:updateAIExplanation', (_event, id: number, aiExplanation: string) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('UPDATE questions SET ai_explanation = ? WHERE id = ?');
      const result = stmt.run(aiExplanation, id);
      return result.changes > 0;
    } catch (err) {
      console.error('updateAIExplanation error:', err);
      return false;
    }
  });

  // 更新题目内容（标题、选项、答案、解析等）
  ipcMain.handle('db:updateQuestion', (_event, id: number, data: any) => {
    if (!db) return false;
    try {
      const fields: string[] = [];
      const values: any[] = [];
      
      if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
      if (data.option_a !== undefined) { fields.push('option_a = ?'); values.push(data.option_a); }
      if (data.option_b !== undefined) { fields.push('option_b = ?'); values.push(data.option_b); }
      if (data.option_c !== undefined) { fields.push('option_c = ?'); values.push(data.option_c); }
      if (data.option_d !== undefined) { fields.push('option_d = ?'); values.push(data.option_d); }
      if (data.option_e !== undefined) { fields.push('option_e = ?'); values.push(data.option_e); }
      if (data.correct_answer !== undefined) { fields.push('correct_answer = ?'); values.push(data.correct_answer); }
      if (data.explanation !== undefined) { fields.push('explanation = ?'); values.push(data.explanation); }
      if (data.question_type !== undefined) { fields.push('question_type = ?'); values.push(data.question_type); }
      
      if (fields.length === 0) return false;
      
      values.push(id);
      const sql = `UPDATE questions SET ${fields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(sql);
      const result = stmt.run(...values);
      return result.changes > 0;
    } catch (err) {
      console.error('updateQuestion error:', err);
      return false;
    }
  });

  // ��ȡĳĿ¼�µ���������
  ipcMain.handle('db:getCaseMaterials', (_event, directoryId: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM case_materials WHERE directory_id = ? ORDER BY sort_order, id');
      return stmt.all(directoryId);
    } catch (err) {
      console.error('getCaseMaterials error:', err);
      return [];
    }
  });

  // ��ȡĳ��������µ�С��
  ipcMain.handle('db:getCaseQuestions', (_event, materialId: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM case_questions WHERE material_id = ? ORDER BY question_number, id');
      return stmt.all(materialId);
    } catch (err) {
      console.error('getCaseQuestions error:', err);
      return [];
    }
  });

  // 模糊查询案例材料（按标题关键词）
  ipcMain.handle('db:searchCaseMaterials', (_event, directoryId: number, keyword: string) => {
    if (!db) return [];
    try {
      const stmt = db.prepare(`
        SELECT * FROM case_materials
        WHERE directory_id = ? AND title LIKE ?
        ORDER BY sort_order, id
      `);
      return stmt.all(directoryId, `%${keyword}%`);
    } catch (err) {
      console.error('searchCaseMaterials error:', err);
      return [];
    }
  });

  // �����������
  ipcMain.handle('db:addCaseMaterial', (_event, material: any) => {
    if (!db) return null;
    try {
      const stmt = db.prepare(`
        INSERT INTO case_materials (directory_id, title, content, sort_order)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(
        material.directory_id,
        material.title,
        material.content,
        material.sort_order || 0
      );
      return { id: result.lastInsertRowid, ...material };
    } catch (err) {
      console.error('addCaseMaterial error:', err);
      return null;
    }
  });

  // ��������С��
  ipcMain.handle('db:addCaseQuestion', (_event, question: any) => {
    if (!db) return null;
    try {
      const stmt = db.prepare(`
        INSERT INTO case_questions (material_id, pid, question_number, title, answer, ai_explanation, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        question.material_id,
        question.pid || null,
        question.question_number,
        question.title,
        question.answer || null,
        question.ai_explanation || null,
        question.sort_order || 0
      );
      return { id: result.lastInsertRowid, ...question };
    } catch (err) {
      console.error('addCaseQuestion error:', err);
      return null;
    }
  });

  // 新增案例材料及小题（解析格式内容）
  ipcMain.handle('db:addCaseMaterialWithQuestions', (_event, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const directoryId = data.directory_id as number;
      const title = data.title as string;
      let content = data.content as string;

      // 解析内容：提取【材料】...【/材料】和【小题】...【/小题】
      let materialContent = '';
      const questions: Array<{ title: string; answer: string }> = [];

      // 提取材料内容
      const materialMatch = content.match(/【材料】(.*?)【\/材料】/s);
      if (materialMatch) {
        materialContent = materialMatch[1].trim();
        // 移除材料部分，保留小题部分
        content = content.replace(/【材料】.*?【\/材料】/s, '');
      } else {
        // 如果没有材料标签，将整个内容作为材料
        materialContent = content.trim();
      }

      // 提取小题
      const questionRegex = /【小题】(.*?)【\/小题】/gs;
      let match;
      while ((match = questionRegex.exec(content)) !== null) {
        const questionBlock = match[1];
        const titleMatch = questionBlock.match(/【问题】(.*?)【\/问题】/s);
        const answerMatch = questionBlock.match(/【答案】(.*?)【\/答案】/s);
        if (titleMatch && answerMatch) {
          questions.push({
            title: titleMatch[1].trim(),
            answer: answerMatch[1].trim(),
          });
        }
      }

      // 如果没有解析到小题，但内容中有问题和答案标签，尝试直接解析
      if (questions.length === 0) {
        const titleMatch = content.match(/【问题】(.*?)【\/问题】/s);
        const answerMatch = content.match(/【答案】(.*?)【\/答案】/s);
        if (titleMatch && answerMatch) {
          questions.push({
            title: titleMatch[1].trim(),
            answer: answerMatch[1].trim(),
          });
        }
      }

      // 开始事务
      db.exec('BEGIN TRANSACTION');

      try {
        // 1. 保存案例材料
        const materialStmt = db.prepare(`
          INSERT INTO case_materials (directory_id, title, content, sort_order)
          VALUES (?, ?, ?, ?)
        `);
        const materialResult = materialStmt.run(directoryId, title, materialContent, 0);
        const materialId = materialResult.lastInsertRowid as number;

        // 2. 保存小题
        if (questions.length > 0) {
          const questionStmt = db.prepare(`
            INSERT INTO case_questions (material_id, question_number, title, answer, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `);
          for (let i = 0; i < questions.length; i++) {
            questionStmt.run(materialId, i + 1, questions[i].title, questions[i].answer, i);
          }
        }

        db.exec('COMMIT');
        return { success: true, materialId };
      } catch (err: any) {
        db.exec('ROLLBACK');
        throw err;
      }
    } catch (err: any) {
      console.error('addCaseMaterialWithQuestions error:', err);
      return { success: false, error: err.message || '保存失败' };
    }
  });

  // ɾ����������
  ipcMain.handle('db:deleteCaseMaterial', (_event, id: number) => {
    if (!db) return false;
    try {
      // 先删除关联的小题（包括子小题）
      const deleteQuestions = db.prepare('DELETE FROM case_questions WHERE material_id = ?');
      deleteQuestions.run(id);

      // 再删除案例材料
      const stmt = db.prepare('DELETE FROM case_materials WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteCaseMaterial error:', err);
      return false;
    }
  });

  // 删除案例小题
  ipcMain.handle('db:deleteCaseQuestion', (_event, id: number) => {
    if (!db) return false;
    try {
      // 先删除关联的子小题
      const deleteChildren = db.prepare('DELETE FROM case_questions WHERE pid = ?');
      deleteChildren.run(id);
      // 再删除小题本身
      const stmt = db.prepare('DELETE FROM case_questions WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteCaseQuestion error:', err);
      return false;
    }
  });

  // 更新案例材料内容
  ipcMain.handle('db:updateCaseMaterial', (_event, id: number, content: string) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('UPDATE case_materials SET content = ? WHERE id = ?');
      const result = stmt.run(content, id);
      return result.changes > 0;
    } catch (err) {
      console.error('updateCaseMaterial error:', err);
      return false;
    }
  });

  // 更新案例小题内容
  ipcMain.handle('db:updateCaseQuestion', (_event, id: number, title: string, answer?: string) => {
    if (!db) return false;
    try {
      if (answer !== undefined) {
        const stmt = db.prepare('UPDATE case_questions SET title = ?, answer = ? WHERE id = ?');
        const result = stmt.run(title, answer, id);
        return result.changes > 0;
      } else {
        const stmt = db.prepare('UPDATE case_questions SET title = ? WHERE id = ?');
        const result = stmt.run(title, id);
        return result.changes > 0;
      }
    } catch (err) {
      console.error('updateCaseQuestion error:', err);
      return false;
    }
  });

// 更新文章内容
ipcMain.handle('db:updateArticle', (_event, id: number, content: string, title?: string) => {
  if (!db) return false;
  try {
    if (title !== undefined) {
      const stmt = db.prepare('UPDATE articles SET content = ?, title = ? WHERE id = ?');
      const result = stmt.run(content, title, id);
      return result.changes > 0;
    } else {
      const stmt = db.prepare('UPDATE articles SET content = ? WHERE id = ?');
      const result = stmt.run(content, id);
      return result.changes > 0;
    }
  } catch (err) {
    console.error('updateArticle error:', err);
    return false;
  }
});

// 新增文章
ipcMain.handle('db:addArticle', (_event, article: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO articles (directory_id, title, content)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      article.directory_id,
      article.title,
      article.content
    );
    return { id: result.lastInsertRowid, ...article };
  } catch (err) {
    console.error('addArticle error:', err);
    return null;
  }
});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '..', '..', 'favicon.ico'),
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  clearLog();
  log('=== App started ===');
  log(`App path: ${app.getAppPath()}`);
  log(`userData: ${app.getPath('userData')}`);
  initDatabase();
  setupIpc();
  setupDeepSeekIpc(() => mainWindow);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 全屏切换
ipcMain.handle('window:toggleFullscreen', () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    return !isFullScreen;
  }
  return false;
});

// 获取全屏状态
ipcMain.handle('window:isFullScreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// AI 对话上下文存储（按题目ID存储对话历史）
const aiChatContexts = new Map<number, Array<{role: string; content: string}>>();

// AI 讲解：流式调用 API，支持多轮对话，带厂商兜底
ipcMain.handle('ai:explainQuestion', async (_event, questionData: any) => {
  const questionId = questionData.questionId as number;
  const isFollowUp = questionData.isFollowUp as boolean;
  const userMessage = questionData.userMessage as string || '';
  const providerOrder = (questionData.providerOrder as string[]) || ['modelspace', 'deepseek'];

  // 获取或初始化对话上下文
  let messages: Array<{role: string; content: string}> = [];
  if (isFollowUp && aiChatContexts.has(questionId)) {
    messages = [...aiChatContexts.get(questionId)!];
  }

  // 如果是首次讲解，构建初始题目信息
  if (!isFollowUp) {
    const prompt = PROMPTS.explainQuestion(
      questionData.title,
      questionData.correctAnswer,
      questionData.explanation,
      questionData.options
    );
    messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  } else {
    // 追问模式：添加用户新问题
    messages.push({ role: 'user', content: userMessage });
  }

  const result = await callAIWithFallback(
    providerOrder,
    async (provider) => {
      log(`[AI] 开始调用厂商: ${provider}`);
      // 支持 DeepSeek 本地版
      if (provider === 'deepseekLocal') {
        const dsClient = getDeepSeekClient();
        if (!dsClient) {
          throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
        }
        log(`[AI] 使用 DeepSeek 本地版客户端`);

        // 转换消息格式为 DeepSeekMessage
        const dsMessages = messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

        let assistantContent = '';
        for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
          if (chunk.type === 'text' && chunk.content) {
            assistantContent += chunk.content;
            if (mainWindow) {
              mainWindow.webContents.send('ai:streamChunk', chunk.content);
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content || 'DeepSeek 聊天失败');
          }
        }

        // 保存对话上下文
        messages.push({ role: 'assistant', content: assistantContent });
        aiChatContexts.set(questionId, messages);

        if (mainWindow) {
          mainWindow.webContents.send('ai:streamDone');
        }

        log(`[AI] DeepSeek 本地版调用成功`);
        return assistantContent;
      }

      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);
      log(`[AI] 使用模型: ${model}`);

      const stream = await client.chat.completions.create({
        model,
        messages: messages as any,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      });

      let assistantContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content && mainWindow) {
          assistantContent += content;
          mainWindow.webContents.send('ai:streamChunk', content);
        }
      }

      // 保存对话上下文
      messages.push({ role: 'assistant', content: assistantContent });
      aiChatContexts.set(questionId, messages);

      if (mainWindow) {
        mainWindow.webContents.send('ai:streamDone');
      }

      log(`[AI]  ${provider} 调用成功`);
      return assistantContent;
    },
    (provider) => {
      log(`[AI Fallback] 切换到: ${provider}`);
      if (mainWindow) {
        mainWindow.webContents.send('ai:providerSwitch', provider);
      }
    }
  );

  if (!result.success) {
    console.error('AI explain error:', result.error);
    if (mainWindow) {
      mainWindow.webContents.send('ai:streamError', result.error);
    }
    return { success: false, error: result.error };
  }

  return { success: true };
});

// AI 生成同类题，带厂商兜底
ipcMain.handle('ai:generateSimilarQuestions', async (_event, questionData: any) => {
  const providerOrder = (questionData.providerOrder as string[]) || ['modelspace', 'deepseek'];

  const prompt = PROMPTS.generateSimilar(questionData);

  const result = await callAIWithFallback(providerOrder, async (provider) => {
    log(`[AI GenerateSimilar] 使用厂商: ${provider}`);
    let content = '';

    // 支持 DeepSeek 本地版
    if (provider === 'deepseekLocal') {
      const dsClient = getDeepSeekClient();
      if (!dsClient) {
        throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
      }

      const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `${prompt.system}\n\n${prompt.user}` }
      ];

      let thinking = '';
      for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
        if (chunk.type === 'text' && chunk.content) {
          content += chunk.content;
        } else if (chunk.type === 'thinking' && chunk.content) {
          thinking += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || 'DeepSeek 聊天失败');
        }
      }
      log(`[AI GenerateSimilar] DeepSeek 本地版返回内容长度: ${content.length}`);
    } else {
      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 4096,
      });

      content = response.choices[0]?.message?.content || '';
      log(`[AI GenerateSimilar] ${provider} 返回内容长度: ${content.length}`);
    }

    // 提取JSON部分
    log(`[AI GenerateSimilar] 原始内容前200字符: ${content.substring(0, 200)}`);
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log(`[AI GenerateSimilar] 未找到JSON数组，内容: ${content.substring(0, 500)}`);
      throw new Error('AI返回格式不正确，未找到JSON数组');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      log(`[AI GenerateSimilar] JSON解析成功，题目数量: ${Array.isArray(parsed) ? parsed.length : '非数组'}`);
      if (!Array.isArray(parsed)) {
        throw new Error('AI返回的JSON不是数组');
      }
      return parsed;
    } catch (e: any) {
      log(`[AI GenerateSimilar] JSON解析失败: ${e.message}`);
      throw new Error(`JSON解析失败: ${e.message}`);
    }
  });

  if (!result.success) {
    console.error('AI generate similar questions error:', result.error);
    return { success: false, error: result.error };
  }

  return { success: true, questions: result.data };
});

// AI 根据主题生成同类题（技能模式）
ipcMain.handle('ai:generateSimilarQuestionsByTopic', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['modelspace', 'deepseek'];
  const topic = data.topic as string;

  if (!topic) {
    return { success: false, error: '主题不能为空' };
  }

  const prompt = PROMPTS.generateSimilarByTopic(topic);

  const result = await callAIWithFallback(providerOrder, async (provider) => {
    log(`[AI GenerateSimilarByTopic] 使用厂商: ${provider}`);
    let content = '';

    // 支持 DeepSeek 本地版
    if (provider === 'deepseekLocal') {
      const dsClient = getDeepSeekClient();
      if (!dsClient) {
        throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
      }

      const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `${prompt.system}\n\n${prompt.user}` }
      ];

      let thinking = '';
      for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
        if (chunk.type === 'text' && chunk.content) {
          content += chunk.content;
        } else if (chunk.type === 'thinking' && chunk.content) {
          thinking += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || 'DeepSeek 聊天失败');
        }
      }
      log(`[AI GenerateSimilarByTopic] DeepSeek 本地版返回内容长度: ${content.length}`);
    } else {
      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 4096,
      });

      content = response.choices[0]?.message?.content || '';
      log(`[AI GenerateSimilarByTopic] ${provider} 返回内容长度: ${content.length}`);
    }

    // 提取JSON部分
    log(`[AI GenerateSimilarByTopic] 原始内容前200字符: ${content.substring(0, 200)}`);
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log(`[AI GenerateSimilarByTopic] 未找到JSON数组，内容: ${content.substring(0, 500)}`);
      throw new Error('AI返回格式不正确，未找到JSON数组');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      log(`[AI GenerateSimilarByTopic] JSON解析成功，题目数量: ${Array.isArray(parsed) ? parsed.length : '非数组'}`);
      if (!Array.isArray(parsed)) {
        throw new Error('AI返回的JSON不是数组');
      }
      return parsed;
    } catch (e: any) {
      log(`[AI GenerateSimilarByTopic] JSON解析失败: ${e.message}`);
      throw new Error(`JSON解析失败: ${e.message}`);
    }
  });

  if (!result.success) {
    console.error('AI generate similar questions by topic error:', result.error);
    return { success: false, error: result.error };
  }

  return { success: true, questions: result.data };
});

// AI 案例题小题讲解
ipcMain.handle('ai:explainCaseQuestion', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['modelspace', 'deepseek'];
  const isFollowUp = data.isFollowUp as boolean;
  const userMessage = data.userMessage as string || '';

  // 案例题讲解上下文存储（按 materialId_questionNumber 存储）
  const contextKey = `${data.materialTitle}_${data.questionNumber}`;

  // 获取或初始化对话上下文
  let messages: Array<{role: string; content: string}> = [];
  if (isFollowUp && caseChatContexts.has(contextKey)) {
    messages = [...caseChatContexts.get(contextKey)!];
  }

  // 如果是首次讲解，构建初始题目信息
  if (!isFollowUp) {
    const prompt = PROMPTS.explainCaseQuestion(
      data.materialTitle,
      data.materialContent,
      data.questionNumber,
      data.questionTitle,
      data.answer
    );
    messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  } else {
    // 追问模式：添加用户新问题
    messages.push({ role: 'user', content: userMessage });
  }

  const result = await callAIWithFallback(
    providerOrder,
    async (provider) => {
      log(`[AI] 开始调用厂商: ${provider}`);
      // 支持 DeepSeek 本地版
      if (provider === 'deepseekLocal') {
        const dsClient = getDeepSeekClient();
        if (!dsClient) {
          throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
        }
        log(`[AI] 使用 DeepSeek 本地版客户端`);

        // 转换消息格式为 DeepSeekMessage
        const dsMessages = messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

        let assistantContent = '';
        for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
          if (chunk.type === 'text' && chunk.content) {
            assistantContent += chunk.content;
            if (mainWindow) {
              mainWindow.webContents.send('ai:streamChunk', chunk.content);
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content || 'DeepSeek 聊天失败');
          }
        }

        // 保存对话上下文
        messages.push({ role: 'assistant', content: assistantContent });
        caseChatContexts.set(contextKey, messages);

        if (mainWindow) {
          mainWindow.webContents.send('ai:streamDone');
        }

        log(`[AI] DeepSeek 本地版调用成功`);
        return assistantContent;
      }

      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);
      log(`[AI] 使用模型: ${model}`);

      const stream = await client.chat.completions.create({
        model,
        messages: messages as any,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      });

      let assistantContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content && mainWindow) {
          assistantContent += content;
          mainWindow.webContents.send('ai:streamChunk', content);
        }
      }

      // 保存对话上下文
      messages.push({ role: 'assistant', content: assistantContent });
      caseChatContexts.set(contextKey, messages);

      if (mainWindow) {
        mainWindow.webContents.send('ai:streamDone');
      }

      log(`[AI] 厂商 ${provider} 调用成功`);
      return assistantContent;
    },
    (provider) => {
      log(`[AI Fallback] 切换到厂商: ${provider}`);
      if (mainWindow) {
        mainWindow.webContents.send('ai:providerSwitch', provider);
      }
    }
  );

  if (!result.success) {
    console.error('AI explain case question error:', result.error);
    if (mainWindow) {
      mainWindow.webContents.send('ai:streamError', result.error);
    }
    return { success: false, error: result.error };
  }

  return { success: true };
});

// 案例题 AI 讲解上下文存储
const caseChatContexts = new Map<string, Array<{role: string; content: string}>>();

// API 设置已改为前端本地存储，IPC 接口保留空实现以兼容旧代码
ipcMain.handle('db:getApiSettings', () => {
  return {};
});

ipcMain.handle('db:saveApiSettings', () => {
  return true;
});

// AI 提取段落关键词
ipcMain.handle('ai:extractKeywords', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['deepseekLocal', 'modelspace', 'deepseek'];
  const paragraph = data.paragraph as string;

  if (!paragraph || !paragraph.trim()) {
    return { success: false, error: '段落内容不能为空' };
  }

  const prompt = PROMPTS.extractKeywords(paragraph);

  const result = await callAIWithFallback(providerOrder, async (provider) => {
    log(`[AI ExtractKeywords] 使用厂商: ${provider}`);

    // 支持 DeepSeek 本地版
    if (provider === 'deepseekLocal') {
      const dsClient = getDeepSeekClient();
      if (!dsClient) {
        throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
      }

      const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `${prompt.system}\n\n${prompt.user}` }
      ];

      let content = '';
      for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
        if (chunk.type === 'text' && chunk.content) {
          content += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || 'DeepSeek 聊天失败');
        }
      }
      return content.trim();
    }

    const client = getOpenAIClient(provider);
    const model = getCurrentModel(provider);

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      stream: false,
      temperature: 0.5,
      max_tokens: 256,
    });

    return (response.choices[0]?.message?.content || '').trim();
  });

  if (!result.success) {
    console.error('AI extract keywords error:', result.error);
    return { success: false, error: result.error };
  }

  return { success: true, keywords: result.data };
});

// DeepSeek 本地版 Token 测试
ipcMain.handle('deepseekLocal:testToken', async (_event, token: string) => {
  try {
    // 使用 DeepSeekClient 直接测试 token
    const testClient = new DeepSeekClient({ token });
    const isValid = await testClient.checkTokenStatus();
    if (isValid) {
      // 测试成功，初始化客户端并保存 token
      initDeepSeekClient(token);
      setDeepSeekLocalToken(token);
      return { success: true };
    }
    return { success: false, error: 'Token 无效或已过期' };
  } catch (err: any) {
    console.error('DeepSeek 本地版测试失败:', err);
    return { success: false, error: err.message || '连接失败' };
  }
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
    db = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

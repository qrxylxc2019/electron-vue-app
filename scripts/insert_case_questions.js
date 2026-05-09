const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('Database path:', dbPath);

// 连接数据库
const db = new Database(dbPath);

// 确保表存在
db.exec(`
  CREATE TABLE IF NOT EXISTS directories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS case_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    directory_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS case_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    answer TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// 查找或创建"高项案例"科目
let dirStmt = db.prepare("SELECT id FROM directories WHERE name = '高项案例'");
let dirRow = dirStmt.get();

let dirId;
if (!dirRow) {
  const insertDir = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
  const result = insertDir.run('高项案例', 0);
  dirId = Number(result.lastInsertRowid);
  console.log('创建科目：高项案例，id:', dirId);
} else {
  dirId = dirRow.id;
  console.log('找到已有科目：高项案例，id:', dirId);
}

// 案例题数据
const cases = [
  {
    title: '案例一：项目范围管理',
    content: `某市智慧交通综合管理平台项目，总投资860万元，工期10个月。项目旨在构建一个集交通监控、信号控制、应急指挥、数据分析于一体的综合管理平台。

项目启动后，项目经理组织团队制定了范围管理计划，并采用自上而下方法创建了WBS。项目执行过程中，客户多次提出新需求，部分需求未经变更控制流程就直接实施。项目结束时，实际功能比原计划增加了30%，工期延误了2个月，成本超支15%。

经复盘发现：
1. 初期需求收集不够充分，遗漏了部分业务部门的需求；
2. WBS分解层级过粗，部分工作包责任人不明确；
3. 变更控制流程形同虚设，项目经理为迎合客户经常绕过CCB；
4. 范围确认仅在项目结束时进行，中间里程碑未组织验收。`,
    questions: [
      {
        question_number: 1,
        title: '请指出该项目在范围管理方面存在哪些问题？',
        answer: '1. 需求收集不充分，遗漏业务部门需求；\n2. WBS分解层级过粗，责任人不明确；\n3. 变更控制流程未严格执行，绕过CCB；\n4. 范围确认仅在项目结束时进行，缺少中间里程碑验收；\n5. 未有效识别和管理范围蔓延；\n6. 范围基准未得到有效维护。'
      },
      {
        question_number: 2,
        title: '针对上述问题，项目经理应该采取哪些改进措施？',
        answer: '1. 完善需求收集过程，采用访谈、问卷、研讨会等多种方法；\n2. 细化WBS分解，明确每个工作包的负责人和验收标准；\n3. 严格执行变更控制流程，所有变更必须经过CCB审批；\n4. 建立定期范围确认机制，在每个里程碑组织验收；\n5. 建立需求跟踪矩阵，确保需求可追溯；\n6. 加强干系人沟通，管理客户期望。'
      }
    ]
  },
  {
    title: '案例二：项目风险管理',
    content: `某省医疗保障信息平台建设项目，总投资1200万元，工期9个月。项目涉及多个子系统开发和数据迁移，技术复杂度高。

项目初期，项目经理组织团队识别了50多项风险，并制定了风险登记册。但在项目执行过程中，以下问题频繁发生：

1. 第三方接口提供商延期交付，导致集成测试推迟3周；
2. 核心开发人员突然离职，知识转移不充分；
3. 数据迁移过程中发现历史数据质量极差，清洗工作量远超预期；
4. 新颁布的医保政策要求系统功能调整，但项目已接近尾声。

项目经理采取的措施包括：紧急招聘替代人员、加班赶工、压缩测试时间等。`,
    questions: [
      {
        question_number: 1,
        title: '请分析该项目风险管理存在的问题。',
        answer: '1. 风险识别后未持续跟踪和更新，风险登记册流于形式；\n2. 未对关键风险制定有效的应对策略（如人员备份计划）；\n3. 未对供应商风险进行有效监控和管理；\n4. 风险应对措施多为被动应急，缺乏前瞻性；\n5. 未建立风险预警机制；\n6. 政策变化风险未纳入考虑范围。'
      },
      {
        question_number: 2,
        title: '针对核心人员离职风险，项目经理应该提前采取哪些预防措施？',
        answer: '1. 建立知识共享机制，定期进行代码审查和技术分享；\n2. 实施交叉培训，确保关键技能有备份人员掌握；\n3. 建立完善的文档体系，包括设计文档、操作手册等；\n4. 与核心人员签订长期服务协议；\n5. 建立人才储备池，提前培养替补人员；\n6. 采用结对编程等方式促进知识传递。'
      }
    ]
  },
  {
    title: '案例三：项目进度管理',
    content: `某银行核心系统升级改造项目，总投资2000万元，工期10个月。项目采用瀑布模型，分为需求分析、系统设计、编码开发、系统测试、上线部署五个阶段。

项目计划制定时，各阶段时间安排如下：
- 需求分析：2个月
- 系统设计：1.5个月
- 编码开发：4个月
- 系统测试：2个月
- 上线部署：0.5个月

实际执行中：
1. 需求分析阶段因业务部门配合问题延误了1个月；
2. 为追赶进度，项目经理将设计和编码阶段并行开展；
3. 测试阶段发现大量缺陷，修复工作导致测试延期；
4. 上线前发现性能不达标，被迫回退重新优化。`,
    questions: [
      {
        question_number: 1,
        title: '请指出该项目进度管理中的主要问题。',
        answer: '1. 进度计划制定过于理想化，未考虑缓冲时间；\n2. 需求分析延误后未及时调整整体计划；\n3. 为赶进度将设计和编码并行，导致设计缺陷带入编码；\n4. 测试时间被压缩，缺陷发现晚，修复成本高；\n5. 未进行充分的性能测试就准备上线；\n6. 缺少有效的进度监控和预警机制。'
      },
      {
        question_number: 2,
        title: '如果你是项目经理，在需求分析延误后应该如何调整进度计划？',
        answer: '1. 重新评估剩余工作量和资源需求；\n2. 与干系人沟通，申请合理的工期延长；\n3. 分析是否可以采用快速跟进或赶工策略；\n4. 优先保证关键路径上的活动；\n5. 增加资源投入（如增加测试人员）；\n6. 考虑范围裁剪，将非核心功能延后实施；\n7. 加强进度监控，建立每日/每周跟踪机制。'
      }
    ]
  }
];

// 插入案例数据
const insertMaterial = db.prepare(`
  INSERT INTO case_materials (directory_id, title, content, sort_order)
  VALUES (?, ?, ?, ?)
`);

const insertQuestion = db.prepare(`
  INSERT INTO case_questions (material_id, question_number, title, answer, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);

let totalMaterials = 0;
let totalQuestions = 0;

for (let i = 0; i < cases.length; i++) {
  const caseData = cases[i];

  // 插入材料
  const matResult = insertMaterial.run(dirId, caseData.title, caseData.content, i);
  const materialId = Number(matResult.lastInsertRowid);
  totalMaterials++;
  console.log(`插入案例材料: ${caseData.title}, id: ${materialId}`);

  // 插入小题
  for (let j = 0; j < caseData.questions.length; j++) {
    const q = caseData.questions[j];
    insertQuestion.run(materialId, q.question_number, q.title, q.answer, j);
    totalQuestions++;
  }
}

console.log(`\n完成！共插入 ${totalMaterials} 个案例材料，${totalQuestions} 道小题到"高项案例"科目下`);

db.close();

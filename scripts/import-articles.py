import sqlite3
import os
import glob

db_path = os.path.join(os.path.dirname(__file__), '..', 'out', 'data', 'qingrui.db')

if not os.path.exists(db_path):
    print(f'数据库不存在: {db_path}')
    print('请先运行应用生成数据库')
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. 创建 article 表（如果不存在）
cursor.execute('''
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
''')
print('article 表创建/检查完成')

# 2. 检查并创建 "高项论文" 科目
cursor.execute("SELECT id FROM directories WHERE name = '高项论文'")
row = cursor.fetchone()

if row:
    dir_id = row[0]
    print(f'"高项论文" 科目已存在, id={dir_id}')
else:
    cursor.execute("INSERT INTO directories (name, sort_order) VALUES (?, ?)", ('高项论文', 0))
    dir_id = cursor.lastrowid
    print(f'"高项论文" 科目已创建, id={dir_id}')

# 3. 读取 scripts/papers 目录下的 txt 文件
papers_dir = os.path.join(os.path.dirname(__file__), 'papers')
txt_files = sorted(glob.glob(os.path.join(papers_dir, '*.txt')))

if not txt_files:
    print(f'未找到 txt 文件, 请先将论文文件放入 {papers_dir} 目录')
    print('正在创建示例论文文件...')
    os.makedirs(papers_dir, exist_ok=True)
    
    # 创建示例论文
    sample_papers = [
        ('论信息系统项目的范围管理.txt', '''摘要
2023年3月至2023年12月，我作为项目经理参与了某市智慧交通综合管理平台的建设工作，该项目总投资860万元，工期10个月。本文以该项目为例，论述信息系统项目的范围管理，包括规划范围管理、收集需求、定义范围、创建WBS、确认范围和控制范围六个过程。

正文
一、规划范围管理
在项目启动阶段，我组织项目团队和相关干系人召开了范围规划会议。我们参考了公司以往类似项目的范围管理计划模板，结合本项目的特点，制定了详细的范围管理计划。

二、收集需求
为了全面收集项目需求，我采用了多种方法。首先，通过访谈和问卷调查的方式，与交通局各业务部门进行了深入沟通，了解他们的业务痛点和期望。

三、定义范围
基于收集到的需求，我组织团队编制了详细的项目范围说明书。范围说明书明确了项目的目标、可交付成果、验收标准以及项目的边界。

四、创建WBS
为了将项目范围分解为可管理的工作包，我带领团队采用自上而下的方法创建了WBS。我们将项目分解为5个主要阶段：需求分析、系统设计、系统开发、系统测试和系统部署。

五、确认范围
在项目的各个阶段里程碑，我组织了范围确认活动。我们邀请甲方代表和业务用户参与评审，通过演示和检查的方式，验证已完成的可交付成果是否符合范围说明书的要求。

六、控制范围
在项目执行过程中，我严格执行范围变更控制程序。所有变更请求都必须通过正式的变更控制流程，由变更控制委员会进行评审。

结语
通过有效的范围管理，该项目于2023年12月顺利交付，获得了甲方的高度评价。项目最终的功能覆盖率达到了98%，用户满意度达到了95%以上。'''),
        ('论信息系统项目的风险管理.txt', '''摘要
2022年6月至2023年3月，我作为项目经理参与了某省医疗保障信息平台的建设工作，该项目总投资1200万元，工期9个月。本文以该项目为例，论述信息系统项目的风险管理，包括规划风险管理、识别风险、实施定性风险分析、实施定量风险分析、规划风险应对和实施风险应对六个过程。

正文
一、规划风险管理
在项目启动阶段，我组织项目团队制定了风险管理计划。考虑到医疗行业的特殊性，我们特别关注了数据安全、系统稳定性和合规性等方面的风险。

二、识别风险
我采用了多种技术来识别项目风险。通过头脑风暴会议，团队成员从各自的专业角度提出了潜在风险。通过文档审查，我们分析了类似项目的历史风险数据。

三、实施定性风险分析
对于识别出的风险，我组织团队进行了定性分析。我们使用概率-影响矩阵对每个风险进行了评估，确定了风险的发生概率和对项目目标的影响程度。

四、实施定量风险分析
对于关键的高风险项，我们进一步进行了定量分析。使用蒙特卡洛模拟技术，我们对项目工期和成本进行了模拟分析。

五、规划风险应对
针对不同优先级的风险，我们制定了相应的应对策略。对于技术风险，我们采用了原型开发和渐进明细的策略。

六、实施风险应对
在项目执行过程中，我定期组织风险审查会议，跟踪风险的状态和应对措施的执行情况。

结语
通过系统的风险管理，该项目于2023年3月顺利上线运行，系统稳定性达到了99.9%，数据安全零事故。'''),
        ('论信息系统项目的质量管理.txt', '''摘要
2021年5月至2022年2月，我作为项目经理参与了某银行核心系统升级改造项目的建设工作，该项目总投资2000万元，工期10个月。本文以该项目为例，论述信息系统项目的质量管理，包括规划质量管理、管理质量和控制质量三个过程。

正文
一、规划质量管理
在项目启动阶段，我组织项目团队和相关干系人制定了质量管理计划。考虑到银行系统对安全性和稳定性的高要求，我们制定了严格的质量标准。

二、管理质量
为了确保项目过程的质量，我实施了全面的质量保证活动。我们建立了代码审查制度，所有代码在提交前必须经过至少两名资深开发人员的审查。

三、控制质量
在项目各阶段，我严格执行质量控制活动。在需求阶段，我们组织了多轮需求评审，确保需求的完整性和一致性。

结语
通过严格的质量管理，该项目于2022年2月成功上线，系统性能提升了3倍，安全漏洞零发现，用户满意度达到了98%。'''),
        ('论信息系统项目的整体管理.txt', '''摘要
2023年1月至2023年10月，我作为项目经理参与了某大型制造企业ERP系统实施项目的建设工作，该项目总投资1500万元，工期10个月。本文以该项目为例，论述信息系统项目的整体管理，包括制定项目章程、制定项目管理计划、指导与管理项目工作、管理项目知识、监控项目工作、实施整体变更控制和结束项目或阶段七个过程。

正文
一、制定项目章程
在项目启动阶段，我协助项目发起人和甲方领导制定了项目章程。项目章程明确了项目的目标、范围、主要干系人、项目经理的权限和项目的总体要求。

二、制定项目管理计划
我组织项目团队编制了 comprehensive 的项目管理计划。该计划整合了范围管理计划、进度管理计划、成本管理计划、质量管理计划等各个子计划。

三、指导与管理项目工作
在项目执行阶段，我按照项目管理计划指导团队开展工作。我建立了每日站会、周例会和月度汇报的沟通机制。

四、管理项目知识
我重视项目知识的管理和积累。我们建立了项目知识库，记录项目过程中的经验教训、最佳实践和技术方案。

五、监控项目工作
我建立了完善的项目监控体系。通过挣值分析（EVM）技术，我们定期监控项目的进度和成本绩效。

六、实施整体变更控制
我严格执行整体变更控制程序。所有变更请求都必须经过正式的变更控制流程，评估其对项目各方面的影响。

七、结束项目或阶段
在项目收尾阶段，我组织了系统的项目验收和移交工作。我们整理了项目文档，进行了经验教训总结。

结语
通过系统的整体管理，该项目于2023年10月成功交付，系统运行稳定，企业管理效率提升了40%。'''),
        ('论信息系统项目的沟通管理.txt', '''摘要
2022年8月至2023年5月，我作为项目经理参与了某高校智慧校园平台的建设工作，该项目总投资980万元，工期10个月。本文以该项目为例，论述信息系统项目的沟通管理，包括规划沟通管理、管理沟通和监督沟通三个过程。

正文
一、规划沟通管理
在项目启动阶段，我首先对项目干系人进行了全面识别和分析。我们识别出了超过30个关键干系人，包括校领导、各部门负责人、一线业务人员和最终用户。

二、管理沟通
在项目执行过程中，我严格执行沟通管理计划。我们建立了多层次的沟通渠道：正式会议包括项目启动会、周例会、月度汇报会和里程碑评审会。

三、监督沟通
我定期评估沟通的效果，并根据实际情况调整沟通策略。通过干系人满意度调查，我们了解到部分业务人员对需求变更的响应速度不满意。

结语
通过有效的沟通管理，该项目于2023年5月顺利交付，用户满意度达到了96%，需求变更响应时间缩短了50%。''')
    ]
    
    for filename, content in sample_papers:
        filepath = os.path.join(papers_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'已创建示例论文: {filename}')
    
    # 重新读取
    txt_files = sorted(glob.glob(os.path.join(papers_dir, '*.txt')))

# 4. 清空该科目下已有的文章（避免重复）
cursor.execute("DELETE FROM articles WHERE directory_id = ?", (dir_id,))
print(f'已清空科目 id={dir_id} 下的旧文章')

# 5. 导入 txt 文件到 article 表
imported_count = 0
for i, txt_file in enumerate(txt_files):
    filename = os.path.basename(txt_file)
    title = filename.replace('.txt', '')
    
    with open(txt_file, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    if not content:
        print(f'跳过空文件: {filename}')
        continue
    
    # 从内容中提取摘要作为 correct_answer
    lines = content.split('\n')
    correct_answer = ''
    for line in lines:
        if line.strip() and not line.startswith('摘要') and not line.startswith('正文') and not line.startswith('结语'):
            correct_answer = line.strip()
            break
    
    cursor.execute('''
        INSERT INTO articles (directory_id, title, content, correct_answer, explanation, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (dir_id, title, content, correct_answer, '高项论文记忆题', i))
    
    imported_count += 1
    print(f'已导入: {title}')

conn.commit()
conn.close()

print(f'\n导入完成! 共导入 {imported_count} 篇文章到 "高项论文" 科目')
print(f'数据库路径: {db_path}')

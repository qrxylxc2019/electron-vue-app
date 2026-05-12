const Database = require('better-sqlite3');
const db = new Database('d:/python脚本/平板做题软件/electron-vue-app/out/data/qingrui.db');

// 1. 插入案例材料
const materialStmt = db.prepare('INSERT INTO case_materials (directory_id, title, content, sort_order) VALUES (?, ?, ?, ?)');
const materialResult = materialStmt.run(3, '试题2 - 信息系统运行维护项目', `A公司承接了某信息系统运行维护项目，项目内容包括对客户数据中心的信息系统进行每周7天、每天24小时值班、监控、巡检及故障处理等。

为满足客户要求，项目经理张伟制定了详细的运维值班计划，要求项目团队严格按照计划执行。国庆节前，张伟通知小李国庆期间值班，并表示年轻人应该多承担值班工作，如果不服从工作安排，会影响年终考评结果。

某天凌晨2点，客户核心业务发生中断。张伟第一时间赶到现场，发现问题复杂，立即电话联系各领域技术人员。得知张伟已在现场后，大家也立刻赶往现场。张伟凭借自己多年运维经验，快速制定了一套解决方案。相关人员一致认可并马上着手实施，迅速恢复了业务。为此，客户高层向A公司发送了书面感谢信，对整个运维团队提出了表扬。

为了进一步激励团队，张伟制定了如下激励措施：

措施1：为参与项目的员工购买了附加商业保险。
措施2：工程师非工作时间值班，可以领取额外值班补贴和午餐补贴。
措施3：每季度评选出2位"季度服务之星"，颁发荣誉证书，并请获奖人员在部门季度会议上进行经验分享。
措施4：每月开展一次团建活动，如户外活动、拓展训练等。`, 0);
const materialId = materialResult.lastInsertRowid;
console.log('Inserted material id:', materialId);

// 2. 插入案例小题
const questionStmt = db.prepare('INSERT INTO case_questions (material_id, question_number, title, answer, sort_order) VALUES (?, ?, ?, ?, ?)');

// 问题1
const q1Result = questionStmt.run(materialId, 1, `【问题1】（8分）

项目经理具备5种基本的权力。请结合案例，补充完成下表。

| 项目经理的权力 | 张伟行使权力的具体活动 |
| --- | --- |
| 职务权力 | 制定运维值班计划，要求项目团队严格按照计划执行 |
| （1） | （2） |
| （3） | （4） |
| （5） | （6） |
| （7） | （8） |`, `| 项目经理的权力 | 张伟行使权力的具体活动 |
| --- | --- |
| 职务权力 | 制定运维值班计划，要求项目团队严格按照计划执行 |
| 惩罚权力 | 如果不服从工作安排，会影响年终考评结果 |
| 专家权力 | 张伟凭借自己多年运维经验，快速制定了一套解决方案 |
| 奖励权力 | （案例中未明确体现，可空） |
| 合法权力 | （通常与职务权力重叠） |`, 0);
console.log('Inserted question 1 id:', q1Result.lastInsertRowid);

// 问题2
const q2Result = questionStmt.run(materialId, 2, `【问题2】（6分）

请指出张伟提出的4项激励措施，分别针对马斯洛需要层次理论中的哪个层次。

措施1：（ ）
措施2：（ ）
措施3：（ ）
措施4：（ ）`, `措施1：（安全需要）
措施2：（生理需要）
措施3：（尊重需要）
措施4：（社交需要）`, 1);
console.log('Inserted question 2 id:', q2Result.lastInsertRowid);

// 问题3
const q3Result = questionStmt.run(materialId, 3, `【问题3】（4分）

判断下列选项的正误（正确的填写"√"，错误的填写"×"）。

（1）经理带领团队管理项目的过程中，具有领导者和管理者的双重身份，案例中张伟制定了详细的运维值班计划是在执行领导职能。（ ）
（2）张伟制定的运维值班计划需要在项目初期制定，项目后期进展过程中可以根据情况修改。（ ）
（3）张伟通知小李国庆期间值班，并表示年轻人应该多承担值班工作，如果不服从工作安排会影响年终考评结果，这种做法符合Y理论对人性的判断。（ ）
（4）张伟制定一系列激励措施是在建设团队管理过程的活动。（ ）`, `（1）× （计划是管理职能）
（2）√
（3）× （符合X理论）
（4）√`, 2);
console.log('Inserted question 3 id:', q3Result.lastInsertRowid);

db.close();
console.log('Done!');

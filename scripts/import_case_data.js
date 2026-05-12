const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('Database path:', dbPath);

// 初始化数据库连接
const db = new Database(dbPath);

// 确保表存在
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

// 读取题目整理.md
const mdContent = fs.readFileSync(path.join(__dirname, '图片', '题目整理.md'), 'utf-8');

// 解析markdown内容
function parseMarkdown(content) {
  const lines = content.split('\n');
  
  // 提取考点名称
  let examPoint = '';
  const titleMatch = content.match(/^#\s*(.+)$/m);
  if (titleMatch) {
    examPoint = titleMatch[1].trim();
  }
  
  // 提取案例材料（从"## 试题 1"到第一个"---"之前）
  let materialContent = '';
  let inMaterial = false;
  
  // 提取各个问题
  const questions = [];
  let currentQuestion = null;
  let inQuestion = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 开始案例材料
    if (line.match(/^##\s*试题\s*\d+/)) {
      inMaterial = true;
      continue;
    }
    
    // 遇到分隔线，材料结束
    if (inMaterial && line.trim() === '---') {
      inMaterial = false;
      continue;
    }
    
    // 收集材料内容
    if (inMaterial) {
      materialContent += line + '\n';
    }
    
    // 匹配问题标题
    const questionMatch = line.match(/^\*\*【问题\s*(\d+)】\s*（(\d+)\s*分）\*\*/);
    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        number: parseInt(questionMatch[1]),
        score: parseInt(questionMatch[2]),
        title: '',
        hasImage: false,
        imagePath: ''
      };
      inQuestion = true;
      continue;
    }
    
    // 匹配没有分数的问题（如问题4）
    const questionMatchNoScore = line.match(/^\*\*【问题\s*(\d+)】\*\*/);
    if (questionMatchNoScore) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        number: parseInt(questionMatchNoScore[1]),
        score: null,
        title: '',
        hasImage: false,
        imagePath: ''
      };
      inQuestion = true;
      continue;
    }
    
    // 遇到下一个分隔线或新问题时，当前问题结束
    if (inQuestion && line.trim() === '---') {
      inQuestion = false;
      continue;
    }
    
    // 收集问题内容
    if (inQuestion && currentQuestion) {
      // 检查是否包含图片
      const imgMatch = line.match(/<img\s+src="\.\/([^"]+)"\s*\/?>/);
      if (imgMatch) {
        currentQuestion.hasImage = true;
        // 将图片路径转换为正确的public路径
        // 原路径 ./1.png -> /case_images/case_1_q4.png
        const originalImgName = imgMatch[1];
        // 根据问题编号映射到正确的图片名
        let newImgName = '';
        if (currentQuestion.number === 4) {
          // 问题4可能有多个图片
          newImgName = 'case_1_q4.png';
        }
        // 替换图片路径
        const newLine = line.replace(
          /src="\.\/[^"]+"/,
          `src="/case_images/${newImgName}"`
        );
        currentQuestion.title += newLine + '\n';
      } else {
        currentQuestion.title += line + '\n';
      }
    }
  }
  
  // 添加最后一个问题
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  // 清理材料内容（去除首尾空行）
  materialContent = materialContent.trim();
  
  // 清理问题标题
  questions.forEach(q => {
    q.title = q.title.trim();
  });
  
  return {
    examPoint,
    materialContent,
    questions
  };
}

// 解析数据
const parsedData = parseMarkdown(mdContent);
console.log('考点:', parsedData.examPoint);
console.log('材料长度:', parsedData.materialContent.length);
console.log('问题数量:', parsedData.questions.length);

// 检查图片文件
const caseImagesDir = path.join(__dirname, '..', 'src', 'renderer', 'public', 'case_images');
const imageFiles = fs.readdirSync(caseImagesDir);
console.log('case_images目录下的文件:', imageFiles);

// 开始导入数据
try {
  // 1. 查找或创建"高项案例"目录
  let checkDir = db.prepare("SELECT id FROM directories WHERE name = '高项案例'");
  let existingDir = checkDir.get();
  
  let dirId;
  if (!existingDir) {
    const insertDir = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
    const dirResult = insertDir.run('高项案例', 0);
    dirId = Number(dirResult.lastInsertRowid);
    console.log('Created directory: 高项案例, id:', dirId);
  } else {
    dirId = existingDir.id;
    console.log('Found existing directory: 高项案例, id:', dirId);
  }
  
  // 2. 插入案例材料
  const insertMaterial = db.prepare(`
    INSERT INTO case_materials (directory_id, title, content, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  
  const materialResult = insertMaterial.run(
    dirId,
    parsedData.examPoint + ' - 试题1',
    parsedData.materialContent,
    0
  );
  const materialId = Number(materialResult.lastInsertRowid);
  console.log('Created case material, id:', materialId);
  
  // 3. 插入各个问题
  const insertQuestion = db.prepare(`
    INSERT INTO case_questions (material_id, question_number, title, answer, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // 定义答案（目前需要手动设置，后续可以从文件读取）
  const answers = {
    1: `存在的问题：
1. 没有制定资源管理计划，缺乏对资源的整体规划
2. 组建团队时遇到困难，各部门不愿意出借骨干，说明缺乏组织级资源协调机制
3. 团队成员是兼职参与，无法保证投入时间和精力
4. 没有明确角色和职责，导致产品类问题互相推诿
5. 缺乏资源获取渠道，服务器等设备资源无法保障
6. 没有考虑团队成员的激励措施，工作属于KPI外内容
7. 缺乏团队建设活动，团队凝聚力不足
8. 没有进行有效的冲突管理`,
    2: `建设项目团队的工具和技术：
1. 集中办公（Colocation）
2. 虚拟团队
3. 沟通技术
4. 人际关系与团队技能（冲突管理、影响力、激励、谈判、团队建设）
5. 认可与奖励
6. 培训
7. 个人和团队评估
8. 会议`,
    3: `（1）×  （2）×  （3）√  （4）×  （5）√`,
    4: `根据图片内容作答（图片题）`
  };
  
  parsedData.questions.forEach(q => {
    const answer = answers[q.number] || '';
    const result = insertQuestion.run(
      materialId,
      q.number,
      q.title,
      answer,
      q.number
    );
    console.log(`Created question ${q.number}, id:`, Number(result.lastInsertRowid));
  });
  
  console.log('\n导入完成！');
  console.log(`- 目录: 高项案例 (id=${dirId})`);
  console.log(`- 案例材料: ${parsedData.examPoint} (id=${materialId})`);
  console.log(`- 小题数量: ${parsedData.questions.length}`);
  
} catch (err) {
  console.error('导入失败:', err);
} finally {
  db.close();
}

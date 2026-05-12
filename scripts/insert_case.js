const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'out', 'win-unpacked', 'resources', 'data', 'qingrui.db');
const db = new Database(dbPath);

// 读取 markdown 文件
const mdPath = path.join(__dirname, 'deepseek_markdown_20260512_78f873.md');
const mdContent = fs.readFileSync(mdPath, 'utf-8');

// 获取或创建高项案例目录
let dirRow = db.prepare("SELECT id FROM directories WHERE name = '高项案例'").get();
let dirId;
if (!dirRow) {
  const result = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)").run('高项案例', 0);
  dirId = Number(result.lastInsertRowid);
  console.log('Created directory 高项案例, id:', dirId);
} else {
  dirId = dirRow.id;
  console.log('Found directory 高项案例, id:', dirId);
}

// 解析 markdown 内容
// 这个文件没有明确的案例材料，只有4个问题
// 我们把整个内容作为案例材料，4个问题作为小题

const materialTitle = '项目资源管理案例';
const materialContent = mdContent.trim();

// 插入案例材料
const insertMaterial = db.prepare(`
  INSERT INTO case_materials (directory_id, title, content, sort_order)
  VALUES (?, ?, ?, ?)
`);
const materialResult = insertMaterial.run(dirId, materialTitle, materialContent, 0);
const materialId = Number(materialResult.lastInsertRowid);
console.log('Inserted case material, id:', materialId);

// 提取各个问题作为小题
const questions = [];

// 问题1: 资源管理中存在的问题 (10分)
const q1Match = mdContent.match(/## 【问题1】.*?\n([\s\S]*?)(?=## 【问题2】|$)/);
if (q1Match) {
  questions.push({
    number: 1,
    title: '【问题1】（10分）\n此项目资源管理中存在的问题：',
    answer: q1Match[1].trim()
  });
}

// 问题2: 建设项目团队的工具和技术 (5分)
const q2Match = mdContent.match(/## 【问题2】.*?\n([\s\S]*?)(?=## 【问题3】|$)/);
if (q2Match) {
  questions.push({
    number: 2,
    title: '【问题2】（5分）\n在项目进行期间可以通过以下工具和技术来建设项目团队：',
    answer: q2Match[1].trim()
  });
}

// 问题3: 判断正误 (5分)
const q3Match = mdContent.match(/## 【问题3】.*?\n([\s\S]*?)(?=## 【问题4】|$)/);
if (q3Match) {
  questions.push({
    number: 3,
    title: '【问题3】（5分）\n判断下列描述的正误：',
    answer: q3Match[1].trim()
  });
}

// 问题4: 补充表格
const q4Match = mdContent.match(/## 【问题4】([\s\S]*)/);
if (q4Match) {
  questions.push({
    number: 4,
    title: '【问题4】\n根据表格内容补充"指标及检查方法"：',
    answer: q4Match[1].trim()
  });
}

// 插入小题
const insertQuestion = db.prepare(`
  INSERT INTO case_questions (material_id, question_number, title, answer, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);

for (const q of questions) {
  const result = insertQuestion.run(materialId, q.number, q.title, q.answer, q.number);
  console.log('Inserted question', q.number, 'id:', Number(result.lastInsertRowid));
}

console.log('Done! Inserted', questions.length, 'questions.');
db.close();

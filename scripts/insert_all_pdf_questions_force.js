const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('Database path:', dbPath);

// 连接数据库
const db = new Database(dbPath);

// 读取解析好的题目
const questionsPath = path.join(__dirname, '题目', 'all_questions.json');
const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

console.log(`读取到 ${questions.length} 道题目`);

// 查找高项科目
let dirStmt = db.prepare("SELECT id FROM directories WHERE name = '高项'");
let dirRow = dirStmt.get();

if (!dirRow) {
  console.log('未找到"高项"科目');
  db.close();
  process.exit(1);
}

const directoryId = dirRow.id;
console.log('找到"高项"科目，id:', directoryId);

// 先清空高项科目下的所有选择题（保留论文和案例）
console.log('清空高项科目下的现有选择题...');
let deleteStmt = db.prepare("DELETE FROM questions WHERE directory_id = ? AND question_type = 'single'");
let deleteResult = deleteStmt.run(directoryId);
console.log(`已删除 ${deleteResult.changes} 道旧题目`);

// 插入题目
let insertStmt = db.prepare(`
  INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, correct_answer, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let successCount = 0;

for (const q of questions) {
  try {
    insertStmt.run(
      directoryId,
      'single',
      q.question,
      q.options.A,
      q.options.B,
      q.options.C,
      q.options.D,
      q.answer,
      q.explanation
    );
    successCount++;
  } catch (err) {
    console.error(`插入题目失败 (${q.source} 题号${q.number}):`, err.message);
  }
}

console.log(`成功插入 ${successCount} 道题目到"高项"科目下`);

// 统计高项科目下的题目数量
let countStmt = db.prepare("SELECT COUNT(*) as count FROM questions WHERE directory_id = ?");
let countRow = countStmt.get(directoryId);
console.log(`"高项"科目现有 ${countRow.count} 道题目`);

db.close();

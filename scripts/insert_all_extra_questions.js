const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// 读取所有可解析的题目文件
const files = [
  { path: path.join(__dirname, '题目', 'huanqiu_1_questions.json'), name: '环球网校密训卷-1' },
  { path: path.join(__dirname, '题目', 'dongfang_questions.json'), name: '东方瑞通模拟卷' }
];

let dirStmt = db.prepare("SELECT id FROM directories WHERE name = '高项'");
let dirRow = dirStmt.get();

if (!dirRow) {
  console.log('未找到"高项"科目');
  db.close();
  process.exit(1);
}

const directoryId = dirRow.id;
console.log('找到"高项"科目，id:', directoryId);

let insertStmt = db.prepare(`
  INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, correct_answer, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let totalSuccess = 0;
let totalSkip = 0;

for (const file of files) {
  if (!fs.existsSync(file.path)) {
    console.log(`文件不存在: ${file.path}`);
    continue;
  }
  
  const questions = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
  console.log(`\n处理 ${file.name}: ${questions.length} 道题目`);
  
  let successCount = 0;
  let skipCount = 0;
  
  for (const q of questions) {
    try {
      // 检查是否已存在相同题干的题目
      let checkStmt = db.prepare("SELECT id FROM questions WHERE directory_id = ? AND title = ?");
      let existing = checkStmt.get(directoryId, q.question);
      if (existing) {
        skipCount++;
        continue;
      }

      insertStmt.run(
        directoryId,
        'single',
        q.question,
        q.options.A,
        q.options.B,
        q.options.C,
        q.options.D,
        q.answer,
        q.explanation || ''
      );
      successCount++;
    } catch (err) {
      console.error(`插入题号 ${q.number} 失败:`, err.message);
    }
  }
  
  console.log(`  成功插入 ${successCount} 道，跳过重复 ${skipCount} 道`);
  totalSuccess += successCount;
  totalSkip += skipCount;
}

console.log(`\n总计: 成功插入 ${totalSuccess} 道，跳过重复 ${totalSkip} 道`);

let countStmt = db.prepare("SELECT COUNT(*) as count FROM questions WHERE directory_id = ?");
let countRow = countStmt.get(directoryId);
console.log(`"高项"科目现有 ${countRow.count} 道题目`);

db.close();

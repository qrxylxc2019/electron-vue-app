const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('Database path:', dbPath);

// 读取题目文件
const filePath = path.join(__dirname, 'deepseek_text_20260508_4c2dc3.txt');
const content = fs.readFileSync(filePath, 'utf8');

// 解析题目
function parseQuestions(text) {
  const questions = [];
  // 按 =========== 分割
  const blocks = text.split(/={3,}/).filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 5) continue;

    // 查找题干行（包含"题干："）
    let titleLine = lines.find(l => l.startsWith('题干：'));
    if (!titleLine) continue;
    const title = titleLine.replace('题干：', '').trim();

    // 查找选项
    const options = {};
    const optionKeys = ['A', 'B', 'C', 'D', 'E'];
    for (const key of optionKeys) {
      const optLine = lines.find(l => l.startsWith(key + '.'));
      if (optLine) {
        options[key] = optLine.substring(2).trim();
      }
    }

    // 查找答案
    let answerLine = lines.find(l => l.startsWith('答案：'));
    if (!answerLine) continue;
    const correctAnswer = answerLine.replace('答案：', '').trim();

    // 查找解析
    let explanationLine = lines.find(l => l.startsWith('解析：'));
    const explanation = explanationLine ? explanationLine.replace('解析：', '').trim() : '';

    // 判断题型
    let questionType = 'single';
    if (correctAnswer.length > 1 && /[A-E,]+/.test(correctAnswer)) {
      questionType = 'multiple';
    } else if (correctAnswer === '正确' || correctAnswer === '错误') {
      questionType = 'judge';
    }

    questions.push({
      title,
      option_a: options['A'] || null,
      option_b: options['B'] || null,
      option_c: options['C'] || null,
      option_d: options['D'] || null,
      option_e: options['E'] || null,
      correct_answer: correctAnswer,
      explanation,
      question_type: questionType
    });
  }

  return questions;
}

const questions = parseQuestions(content);
console.log(`解析到 ${questions.length} 道题目`);

// 连接数据库
const db = new Database(dbPath);

// 查找或创建"高项"科目
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
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    directory_id INTEGER NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('single', 'multiple', 'judge', 'write')),
    title TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    option_e TEXT,
    correct_answer TEXT,
    explanation TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (directory_id) REFERENCES directories(id)
  )
`);

let dirStmt = db.prepare("SELECT id FROM directories WHERE name = '高项'");
let dirRow = dirStmt.get();

let dirId;
if (!dirRow) {
  const insertDir = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
  const result = insertDir.run('高项', 0);
  dirId = Number(result.lastInsertRowid);
  console.log('创建科目：高项，id:', dirId);
} else {
  dirId = dirRow.id;
  console.log('找到已有科目：高项，id:', dirId);
}

// 插入题目
const insertQuestion = db.prepare(`
  INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let successCount = 0;
const insertMany = db.transaction((qs) => {
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    try {
      insertQuestion.run(
        dirId,
        q.question_type,
        q.title,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.option_e,
        q.correct_answer,
        q.explanation,
        i
      );
      successCount++;
    } catch (err) {
      console.error(`插入第 ${i + 1} 题失败:`, err.message);
      console.error('题目:', q.title.substring(0, 50));
    }
  }
});

insertMany(questions);
console.log(`成功插入 ${successCount} 道题目到"高项"科目下`);

db.close();

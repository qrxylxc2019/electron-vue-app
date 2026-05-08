const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// 清空数据
db.exec('DELETE FROM questions');
db.exec('DELETE FROM directories');
console.log('已清空所有数据');

// 新增"高项"科目
const insertDir = db.prepare('INSERT INTO directories (name, parent_id, sort_order) VALUES (?, ?, ?)');
const dirResult = insertDir.run('高项', null, 0);
const directoryId = dirResult.lastInsertRowid;
console.log('新增科目: 高项, ID:', directoryId);

// 生成200道题目（单选+多选）
const insertQuestion = db.prepare(`
  INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const questions = [];

// 单选题（120道）
for (let i = 1; i <= 120; i++) {
  const correctIndex = Math.floor(Math.random() * 4); // 0-3
  const correctAnswer = String.fromCharCode(65 + correctIndex); // A, B, C, D
  
  questions.push({
    directory_id: directoryId,
    question_type: 'single',
    title: `单选题第${i}题：这是关于高项知识点的测试题目，请选择正确的答案。`,
    option_a: '选项A的内容',
    option_b: '选项B的内容',
    option_c: '选项C的内容',
    option_d: '选项D的内容',
    option_e: null,
    correct_answer: correctAnswer,
    explanation: `正确答案是${correctAnswer}。这是一道单选题的解析说明。`,
    sort_order: i
  });
}

// 多选题（80道）
for (let i = 1; i <= 80; i++) {
  // 随机生成2-3个正确答案
  const numCorrect = Math.floor(Math.random() * 2) + 2; // 2或3个
  const indices = [0, 1, 2, 3];
  // 打乱顺序
  for (let j = indices.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [indices[j], indices[k]] = [indices[k], indices[j]];
  }
  const correctIndices = indices.slice(0, numCorrect).sort();
  const correctAnswer = correctIndices.map(idx => String.fromCharCode(65 + idx)).join(',');
  
  questions.push({
    directory_id: directoryId,
    question_type: 'multiple',
    title: `多选题第${i}题：这是关于高项知识点的测试题目，请选择所有正确的答案（多选）。`,
    option_a: '选项A的内容',
    option_b: '选项B的内容',
    option_c: '选项C的内容',
    option_d: '选项D的内容',
    option_e: i % 3 === 0 ? '选项E的内容' : null, // 部分题目有E选项
    correct_answer: correctAnswer,
    explanation: `正确答案是${correctAnswer}。这是一道多选题的解析说明，需要选择所有正确选项。`,
    sort_order: 120 + i
  });
}

// 批量插入
const insertMany = db.transaction((qs) => {
  for (const q of qs) {
    insertQuestion.run(
      q.directory_id,
      q.question_type,
      q.title,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.option_e,
      q.correct_answer,
      q.explanation,
      q.sort_order
    );
  }
});

insertMany(questions);
console.log(`已插入 ${questions.length} 道题目（单选120道，多选80道）`);

// 验证
db.close();
console.log('数据库初始化完成！');

const fs = require('fs');
const Database = require('better-sqlite3');

const filePath = 'scripts/题目/deepseek_text_20260510_61a2e8.txt';
const dbPath = 'out/data/qingrui.db';
const directoryId = 1; // 高项科目ID

// 读取文件内容
const content = fs.readFileSync(filePath, 'utf-8');

// 按 =========== 分割题目
const questionBlocks = content.split(/===========+/).filter(block => block.trim());

const db = new Database(dbPath);

// 准备插入语句
const insertStmt = db.prepare(`
  INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let successCount = 0;
let failCount = 0;

for (const block of questionBlocks) {
  try {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);

    let title = '';
    let options = {};
    let correctAnswer = '';
    let explanation = '';
    let currentField = '';

    for (const line of lines) {
      // 跳过题号行（如：第1题）
      if (/^第\d+题$/.test(line)) continue;

      if (line.startsWith('题干：')) {
        title = line.replace('题干：', '').trim();
        currentField = 'title';
      } else if (/^[A-E]\./.test(line)) {
        const key = line[0];
        const value = line.substring(2).trim();
        options[key] = value;
        currentField = 'option';
      } else if (line.startsWith('答案：')) {
        correctAnswer = line.replace('答案：', '').trim();
        currentField = 'answer';
      } else if (line.startsWith('解析：')) {
        explanation = line.replace('解析：', '').trim();
        currentField = 'explanation';
      } else {
        // 多行内容追加
        if (currentField === 'explanation') {
          explanation += '\n' + line;
        }
      }
    }

    // 判断题目类型
    let questionType = 'single';
    if (correctAnswer.includes(',')) {
      questionType = 'multiple';
    } else if (correctAnswer === '正确' || correctAnswer === '错误') {
      questionType = 'judge';
    }

    // 插入选项
    const optionA = options['A'] || null;
    const optionB = options['B'] || null;
    const optionC = options['C'] || null;
    const optionD = options['D'] || null;
    const optionE = options['E'] || null;

    insertStmt.run(
      directoryId,
      questionType,
      title,
      optionA,
      optionB,
      optionC,
      optionD,
      optionE,
      correctAnswer,
      explanation
    );

    successCount++;
    console.log(`✓ 第 ${successCount} 题导入成功`);
  } catch (err) {
    failCount++;
    console.error(`✗ 题目导入失败:`, err.message);
    console.error('  内容:', block.substring(0, 100));
  }
}

db.close();

console.log(`\n导入完成！成功: ${successCount} 题，失败: ${failCount} 题`);

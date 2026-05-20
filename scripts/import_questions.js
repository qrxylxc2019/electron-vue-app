const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 数据库路径 (与主进程一致)
const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
const txtPath = path.join(__dirname, '选择题.txt');

// 连接数据库
const db = new sqlite3.Database(dbPath);

// 获取或创建"高项"科目
db.run("INSERT OR IGNORE INTO directories (name, sort_order) VALUES ('高项', 1)", function(err) {
  if (err) {
    console.error('插入目录失败:', err);
    db.close();
    return;
  }

  db.get("SELECT id FROM directories WHERE name = '高项'", (err, dirRow) => {
    if (err || !dirRow) {
      console.error('获取目录失败:', err);
      db.close();
      return;
    }

    const directoryId = dirRow.id;
    console.log('高项科目 directory_id:', directoryId);

    // 读取txt文件
    const content = fs.readFileSync(txtPath, 'utf-8');

    // 按分隔符分割题目
    const questionBlocks = content.split(/={3,}/).map(b => b.trim()).filter(b => b.length > 0);

    console.log(`共解析到 ${questionBlocks.length} 道题目`);

    // 解析每道题
    const questions = [];
    for (let i = 0; i < questionBlocks.length; i++) {
      const block = questionBlocks[i];
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length < 3) {
        console.log(`第 ${i + 1} 块内容不足，跳过:`, lines.slice(0, 3));
        continue;
      }

      // 第一行是题目
      const title = lines[0];

      // 解析选项
      const options = {};
      let answer = '';
      let explanation = '';
      let optionLines = [];
      let inExplanation = false;

      for (let j = 1; j < lines.length; j++) {
        const line = lines[j];

        if (line.startsWith('答案：')) {
          answer = line.replace('答案：', '').trim();
          continue;
        }

        if (line.startsWith('解析：')) {
          inExplanation = true;
          explanation = line.replace('解析：', '').trim();
          continue;
        }

        if (inExplanation) {
          explanation += '\n' + line;
          continue;
        }

        // 选项行
        if (/^[A-E]、/.test(line)) {
          optionLines.push(line);
        }
      }

      // 提取选项内容
      optionLines.forEach(optLine => {
        const match = optLine.match(/^([A-E])、(.+)$/);
        if (match) {
          options[match[1]] = match[2];
        }
      });

      // 判断题型
      let questionType = 'single';
      if (answer.length > 1 && /^[A-E]+$/.test(answer)) {
        questionType = 'multiple';
      }

      questions.push({
        directory_id: directoryId,
        question_type: questionType,
        title,
        option_a: options['A'] || null,
        option_b: options['B'] || null,
        option_c: options['C'] || null,
        option_d: options['D'] || null,
        option_e: options['E'] || null,
        correct_answer: answer,
        explanation: explanation || null,
        sort_order: i
      });
    }

    console.log(`成功解析 ${questions.length} 道有效题目`);

    // 开始事务导入
    db.run('BEGIN TRANSACTION');

    const insertSql = `
      INSERT INTO questions (
        directory_id, pid, question_type, title,
        option_a, option_b, option_c, option_d, option_e,
        correct_answer, explanation, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let successCount = 0;
    let processedCount = 0;

    const insertNext = () => {
      if (processedCount >= questions.length) {
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('提交事务失败:', err);
            db.run('ROLLBACK');
          } else {
            console.log(`\n导入完成！成功 ${successCount}/${questions.length} 道题目`);
          }
          db.close();
        });
        return;
      }

      const q = questions[processedCount];
      processedCount++;

      db.run(insertSql, [
        q.directory_id,
        null,
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
      ], function(err) {
        if (err) {
          console.error(`插入失败 [${processedCount}]: ${q.title.substring(0, 30)}...`, err.message);
        } else {
          successCount++;
        }
        insertNext();
      });
    };

    insertNext();
  });
});

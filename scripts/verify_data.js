const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
const db = new Database(dbPath);

console.log('=== 验证数据库数据 ===\n');

// 1. 查看目录
console.log('1. directories 表:');
const dirs = db.prepare('SELECT * FROM directories').all();
dirs.forEach(d => console.log(`  id=${d.id}, name=${d.name}`));

// 2. 查看案例材料
console.log('\n2. case_materials 表 (material_id=11):');
const materials = db.prepare('SELECT * FROM case_materials WHERE id = 11').all();
materials.forEach(m => {
  console.log(`  id=${m.id}, directory_id=${m.directory_id}`);
  console.log(`  title=${m.title}`);
  console.log(`  content前100字=${m.content.substring(0, 100)}...`);
});

// 3. 查看小题
console.log('\n3. case_questions 表 (material_id=11):');
const questions = db.prepare('SELECT id, material_id, question_number, title, answer FROM case_questions WHERE material_id = 11 ORDER BY question_number').all();
questions.forEach(q => {
  console.log(`\n  问题${q.question_number} (id=${q.id}):`);
  console.log(`  title=${q.title.substring(0, 80)}...`);
  console.log(`  answer=${q.answer ? q.answer.substring(0, 80) + '...' : 'NULL'}`);
});

// 4. 检查图片路径
console.log('\n4. 检查图片路径:');
const q4 = db.prepare('SELECT title FROM case_questions WHERE material_id = 11 AND question_number = 4').get();
if (q4) {
  const imgMatch = q4.title.match(/src="([^"]+)"/);
  if (imgMatch) {
    console.log(`  问题4图片路径: ${imgMatch[1]}`);
  } else {
    console.log('  问题4中没有找到图片路径');
  }
}

db.close();

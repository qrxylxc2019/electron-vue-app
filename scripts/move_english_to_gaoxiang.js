const path = require('path');
const Database = require('better-sqlite3');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('Database path:', dbPath);

// 连接数据库
const db = new Database(dbPath);

// 查找高项英语科目
let englishDirStmt = db.prepare("SELECT id FROM directories WHERE name = '高项英语'");
let englishDirRow = englishDirStmt.get();

if (!englishDirRow) {
  console.log('未找到"高项英语"科目');
  db.close();
  process.exit(1);
}

const englishDirId = englishDirRow.id;
console.log('找到"高项英语"科目，id:', englishDirId);

// 查找高项科目
let gaoxiangDirStmt = db.prepare("SELECT id FROM directories WHERE name = '高项'");
let gaoxiangDirRow = gaoxiangDirStmt.get();

if (!gaoxiangDirRow) {
  console.log('未找到"高项"科目');
  db.close();
  process.exit(1);
}

const gaoxiangDirId = gaoxiangDirRow.id;
console.log('找到"高项"科目，id:', gaoxiangDirId);

// 获取高项英语下的所有题目
let questionsStmt = db.prepare("SELECT * FROM questions WHERE directory_id = ?");
let questions = questionsStmt.all(englishDirId);

console.log(`找到 ${questions.length} 道"高项英语"题目需要移动`);

// 更新题目目录ID
let updateStmt = db.prepare("UPDATE questions SET directory_id = ? WHERE directory_id = ?");
let result = updateStmt.run(gaoxiangDirId, englishDirId);

console.log(`成功移动 ${result.changes} 道题目到"高项"科目`);

// 删除高项英语科目
let deleteDirStmt = db.prepare("DELETE FROM directories WHERE id = ?");
let deleteResult = deleteDirStmt.run(englishDirId);

if (deleteResult.changes > 0) {
  console.log('成功删除"高项英语"科目');
} else {
  console.log('删除"高项英语"科目失败');
}

// 统计高项科目下的题目数量
let countStmt = db.prepare("SELECT COUNT(*) as count FROM questions WHERE directory_id = ?");
let countRow = countStmt.get(gaoxiangDirId);
console.log(`"高项"科目现有 ${countRow.count} 道题目`);

db.close();

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('DB Path:', dbPath);

const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', JSON.stringify(tables, null, 2));

for (const t of tables) {
  const info = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(`\nTable: ${t.name}`);
  console.log(JSON.stringify(info, null, 2));
}

// 查看 directories 表中的数据
console.log('\n--- Directories ---');
const dirs = db.prepare('SELECT * FROM directories').all();
console.log(JSON.stringify(dirs, null, 2));

db.close();

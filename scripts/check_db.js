const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
const db = new Database(dbPath);

const r = db.prepare('SELECT COUNT(*) as c FROM questions WHERE directory_id = 1').get();
console.log('当前高项题目数:', r.c);

// 查看最近插入的5道题
const recent = db.prepare('SELECT id, title FROM questions WHERE directory_id = 1 ORDER BY id DESC LIMIT 5').all();
console.log('\n最近5道题:');
recent.forEach(q => console.log(`  ${q.id}: ${q.title.substring(0, 60)}...`));

db.close();

const fs = require('fs');
const path = require('path');

const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');
console.log('DB Path:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('打开数据库失败:', err.message);
    process.exit(1);
  }
  console.log('数据库已连接');
});

// 获取所有txt文件
const scriptsDir = __dirname;
const files = fs.readdirSync(scriptsDir)
  .filter(f => f.endsWith('.txt'))
  .map(f => path.join(scriptsDir, f));

console.log('找到文件:', files.length);

// 查找高项论文目录ID
db.get("SELECT id FROM directories WHERE name = '高项论文'", (err, row) => {
  if (err) {
    console.error('查询目录失败:', err);
    db.close();
    return;
  }
  if (!row) {
    console.log('高项论文目录不存在');
    db.close();
    return;
  }

  const dirId = row.id;
  console.log('高项论文目录ID:', dirId);

  // 准备插入语句（只插入实际存在的字段: directory_id, title, content）
  const insertStmt = db.prepare(
    'INSERT INTO articles (directory_id, title, content) VALUES (?, ?, ?)'
  );

  let inserted = 0;
  let skipped = 0;
  let pending = files.length;

  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const title = lines[0].trim() || path.basename(filePath, '.txt');
    const fileName = path.basename(filePath);

    // 检查是否已存在（按标题匹配）
    db.get('SELECT id FROM articles WHERE directory_id = ? AND title = ?', [dirId, title], (err, existing) => {
      if (err) {
        console.error('检查重复失败:', err);
        pending--;
        if (pending === 0) finish();
        return;
      }

      if (existing) {
        console.log('跳过（已存在）:', fileName, '->', title);
        skipped++;
        pending--;
        if (pending === 0) finish();
        return;
      }

      insertStmt.run(dirId, title, content, function(err) {
        if (err) {
          console.error('插入失败:', fileName, err.message);
        } else {
          console.log('插入成功:', fileName, '->', title, 'ID:', this.lastID);
          inserted++;
        }
        pending--;
        if (pending === 0) finish();
      });
    });
  });

  function finish() {
    insertStmt.finalize();
    console.log(`\n完成: 插入 ${inserted} 条, 跳过 ${skipped} 条`);
    db.close();
  }
});

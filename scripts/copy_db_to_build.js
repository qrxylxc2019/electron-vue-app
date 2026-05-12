const fs = require('fs');
const path = require('path');

// 源数据库路径（开发环境的数据库，包含所有用户录入的数据）
const sourceDb = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');

// 目标路径：打包后的资源目录
const targetDb = path.join(__dirname, '..', 'out', 'win-unpacked', 'resources', 'data', 'qingrui.db');

console.log('Source DB:', sourceDb);
console.log('Target DB:', targetDb);

if (!fs.existsSync(sourceDb)) {
  console.error('Source database not found:', sourceDb);
  process.exit(1);
}

// 复制数据库文件
fs.copyFileSync(sourceDb, targetDb);
console.log('Database copied to build resources successfully!');

// 验证
const stats = fs.statSync(targetDb);
console.log('Target DB size:', stats.size, 'bytes');

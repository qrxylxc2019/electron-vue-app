const fs = require('fs');
const path = require('path');

// 源数据库路径（开发环境的数据库，包含所有用户录入的数据）
const sourceDb = path.join(__dirname, '..', 'out', 'data', 'qingrui.db');

// 目标路径：用户数据目录
const { app } = require('electron');
// 由于需要在主进程中运行，这里我们直接计算用户数据目录
const os = require('os');
const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', '做题软件');
const targetDir = path.join(userDataPath, 'data');
const targetDb = path.join(targetDir, 'qingrui.db');

console.log('Source DB:', sourceDb);
console.log('Target DB:', targetDb);

if (!fs.existsSync(sourceDb)) {
  console.error('Source database not found:', sourceDb);
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('Created target directory:', targetDir);
}

// 复制数据库文件
fs.copyFileSync(sourceDb, targetDb);
console.log('Database copied successfully!');

// 验证
const stats = fs.statSync(targetDb);
console.log('Target DB size:', stats.size, 'bytes');

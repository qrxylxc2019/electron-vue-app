// 初始化数据库脚本 - 用于创建示例数据
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'out', 'data');
const dbPath = path.join(dataDir, 'qingrui.db');

// 确保目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory:', dataDir);
}

// 删除旧数据库（如果存在）
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed old database');
}

const db = new Database(dbPath);

// 创建目录表
db.exec(`
  CREATE TABLE IF NOT EXISTS directories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES directories(id)
  )
`);

// 创建题目表
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    directory_id INTEGER NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('choice', 'judge')),
    title TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    option_e TEXT,
    correct_answer TEXT,
    explanation TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (directory_id) REFERENCES directories(id)
  )
`);

console.log('Tables created successfully');

// 添加示例目录
const insertDir = db.prepare('INSERT INTO directories (name, sort_order) VALUES (?, ?)');

const mathDir = insertDir.run('数学', 1);
const englishDir = insertDir.run('英语', 2);
const physicsDir = insertDir.run('物理', 3);

console.log('Directories added');

// 添加示例题目 - 数学选择题
const insertQuestion = db.prepare(`
  INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, correct_answer, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 数学选择题
insertQuestion.run(
  mathDir.lastInsertRowid,
  'choice',
  '1 + 1 = ?',
  '0',
  '1',
  '2',
  '3',
  'C',
  '1加1等于2，这是基础的加法运算。'
);

insertQuestion.run(
  mathDir.lastInsertRowid,
  'choice',
  '下列哪个是质数？',
  '4',
  '6',
  '9',
  '11',
  'D',
  '质数是只能被1和自身整除的大于1的自然数。'
);

insertQuestion.run(
  mathDir.lastInsertRowid,
  'choice',
  '直角三角形中，一个锐角是30°，另一个锐角是？',
  '30°',
  '45°',
  '60°',
  '90°',
  'C',
  '直角三角形两锐角之和为90°。'
);

// 数学判断题
insertQuestion.run(
  mathDir.lastInsertRowid,
  'judge',
  '直角等于90度',
  '正确',
  '错误',
  null,
  null,
  '正确',
  '直角的定义就是90度的角。'
);

// 英语选择题
insertQuestion.run(
  englishDir.lastInsertRowid,
  'choice',
  '"Hello"是什么意思？',
  '再见',
  '你好',
  '谢谢',
  '对不起',
  'B',
  'Hello是常用的问候语。'
);

insertQuestion.run(
  englishDir.lastInsertRowid,
  'choice',
  '下列哪个是水果？',
  'apple',
  'carrot',
  'potato',
  'cabbage',
  'A',
  'apple是苹果，属于水果。'
);

// 英语判断题
insertQuestion.run(
  englishDir.lastInsertRowid,
  'judge',
  '"Good morning"是晚上好的意思',
  null,
  null,
  null,
  null,
  '错误',
  'Good morning是早上好，不是晚上好。'
);

// 物理选择题
insertQuestion.run(
  physicsDir.lastInsertRowid,
  'choice',
  '光在真空中的速度约为？',
  '3×10⁵ m/s',
  '3×10⁸ m/s',
  '3×10⁶ m/s',
  '3×10⁷ m/s',
  'B',
  '光速约为3×10⁸米/秒。'
);

insertQuestion.run(
  physicsDir.lastInsertRowid,
  'judge',
  '水在100°C时沸腾',
  null,
  null,
  null,
  null,
  '正确',
  '在标准大气压下，水的沸点是100°C。'
);

console.log('Sample questions added');
console.log('Database initialized at:', dbPath);

db.close();

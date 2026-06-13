import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import { OpenAI } from 'openai';
import fs from 'fs';
import { getOpenAIClient, getCurrentModel, PROMPTS, callAIWithFallback, setDeepSeekLocalToken } from './apikey';
import { setupDeepSeekIpc, initDeepSeekClient, getDeepSeekClient } from './deepseek';
import { DeepSeekClient } from './deepseek/client';

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

// 日志文件路径
const logFile = path.join(app.getPath('userData'), 'app.log');

function log(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {
    console.error('Write log failed:', e);
  }
  console.log(message);
}

// 清空日志（每次启动时）
function clearLog() {
  try {
    fs.writeFileSync(logFile, '');
  } catch (e) {
    console.error('Clear log failed:', e);
  }
}

// 获取数据库路径
function getDbPath(): string {
  const isDev = !app.isPackaged;
  log(`getDbPath: isDev=${isDev}`);
  log(`getDbPath: __dirname=${__dirname}`);
  log(`getDbPath: app.getAppPath()=${app.getAppPath()}`);

  // 统一使用项目目录下的数据库，开发和生产环境都用同一个
  const projectRoot = isDev
    ? path.join(__dirname, '..', '..')
    : path.join(process.resourcesPath, '..', '..', '..');
  const dbDir = path.join(projectRoot, 'out', 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    log(`Created dbDir: ${dbDir}`);
  }
  const dbPath = path.join(dbDir, 'qingrui.db');
  log(`Unified dbPath: ${dbPath}`);
  return dbPath;
}

// 从打包资源中复制初始数据库（仅在数据库不存在时复制）
function copyDbFromResources() {
  const isDev = !app.isPackaged;
  log(`copyDbFromResources: isDev=${isDev}`);

  // 如果数据库已存在，跳过复制
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    log('Database already exists, skipping copy');
    return;
  }

  // 开发环境不需要复制
  if (isDev) {
    log('Dev mode: no database to copy');
    return;
  }

  // 打包环境：从 resources 复制初始数据库
  try {
    const resourceDbPath = path.join(process.resourcesPath, 'data', 'qingrui.db');
    log(`Resource DB path: ${resourceDbPath}`);
    log(`Resource DB exists: ${fs.existsSync(resourceDbPath)}`);

    if (fs.existsSync(resourceDbPath)) {
      fs.copyFileSync(resourceDbPath, dbPath);
      log('Database copied from resources');
    } else {
      log('Resource database not found, will create new database');
    }
  } catch (err: any) {
    log(`Copy database error: ${err.message}`);
  }
}

// 初始化数据库
function initDatabase() {
  log('=== initDatabase start ===');
  // 先尝试从资源目录复制数据库
  copyDbFromResources();

  const dbPath = getDbPath();
  log(`Final Database path: ${dbPath}`);
  log(`Database file exists: ${fs.existsSync(dbPath)}`);

  try {
    db = new Database(dbPath);
    log('Database opened successfully');

    // 创建目录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        template TEXT DEFAULT NULL,
        parent_id INTEGER DEFAULT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES directories(id)
      )
    `);

    // 兼容旧数据库：如果 directories 表没有 template 列，则添加
    try {
      const columns = db.prepare("PRAGMA table_info(directories)").all() as any[];
      const hasTemplate = columns.some((col: any) => col.name === 'template');
      if (!hasTemplate) {
        db.exec('ALTER TABLE directories ADD COLUMN template TEXT DEFAULT NULL');
        log('Added template column to directories table');
      }
    } catch (err) {
      log('Check template column error: ' + err);
    }

    // 兼容旧数据库：如果 questions 表没有 knowledge_id 列，则添加
    try {
      const qColumns = db.prepare("PRAGMA table_info(questions)").all() as any[];
      const hasKnowledgeId = qColumns.some((col: any) => col.name === 'knowledge_id');
      if (!hasKnowledgeId) {
        db.exec('ALTER TABLE questions ADD COLUMN knowledge_id INTEGER DEFAULT NULL');
        log('Added knowledge_id column to questions table');
      }
    } catch (err) {
      log('Check knowledge_id column error: ' + err);
    }

    // ������Ŀ??
    db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        pid INTEGER DEFAULT NULL,
        knowledge_id INTEGER DEFAULT NULL,
        question_type TEXT NOT NULL CHECK(question_type IN ('single', 'multiple', 'judge', 'write')),
        title TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        option_e TEXT,
        correct_answer TEXT,
        explanation TEXT,
        ai_explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id),
        FOREIGN KEY (pid) REFERENCES questions(id),
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_points(id)
      )
    `);

    // �������±� article ��ר�����洢��������
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        correct_answer TEXT,
        explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id)
      )
    `);

    // 自媒体运营表 - 选题
    db.exec(`
      CREATE TABLE IF NOT EXISTS sm_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'AI编程',
        keywords TEXT,
        trend_score INTEGER DEFAULT 50,
        selling_point TEXT,
        target_audience TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 自媒体运营表 - 文案
    db.exec(`
      CREATE TABLE IF NOT EXISTS sm_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        word_count INTEGER DEFAULT 0,
        platform TEXT DEFAULT 'xiaohongshu',
        platform_versions TEXT,
        status TEXT DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        parent_id INTEGER DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES sm_topics(id),
        FOREIGN KEY (parent_id) REFERENCES sm_articles(id)
      )
    `);

    // 自媒体运营表 - 图片
    db.exec(`
      CREATE TABLE IF NOT EXISTS sm_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        prompt TEXT,
        image_path TEXT,
        image_type TEXT DEFAULT 'cover',
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES sm_articles(id)
      )
    `);

    // 自媒体运营表 - 发布记录
    db.exec(`
      CREATE TABLE IF NOT EXISTS sm_publish_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        scheduled_at TIMESTAMP,
        published_at TIMESTAMP,
        platform_post_id TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES sm_articles(id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS commerce (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT,
        url TEXT,
        desc TEXT,
        status TEXT DEFAULT '未开始',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 密码表
    db.exec(`
      CREATE TABLE IF NOT EXISTS password (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        account TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 提示词表
    db.exec(`
      CREATE TABLE IF NOT EXISTS prompt (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        type INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 英语阅读材料表
    db.exec(`
      CREATE TABLE IF NOT EXISTS english_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id)
      )
    `);

    // 英语阅读题目表
    db.exec(`
      CREATE TABLE IF NOT EXISTS english_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        question_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_answer TEXT,
        explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES english_materials(id) ON DELETE CASCADE
      )
    `);

    // 英语翻译材料表
    db.exec(`
      CREATE TABLE IF NOT EXISTS english_translate (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        answer TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id)
      )
    `);

    // 完型填空材料表
    db.exec(`
      CREATE TABLE IF NOT EXISTS cloze_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id)
      )
    `);

    // 完型填空题目表
    db.exec(`
      CREATE TABLE IF NOT EXISTS cloze_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        question_number INTEGER NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_answer TEXT,
        explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES cloze_materials(id) ON DELETE CASCADE
      )
    `);

    // 案例材料表
    db.exec(`
      CREATE TABLE IF NOT EXISTS case_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id)
      )
    `);

    // 案例小题表
    db.exec(`
      CREATE TABLE IF NOT EXISTS case_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        pid INTEGER DEFAULT NULL,
        question_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        answer TEXT,
        ai_explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES case_materials(id) ON DELETE CASCADE,
        FOREIGN KEY (pid) REFERENCES case_questions(id)
      )
    `);

    // 知识点表（多层级树状结构，关联科目）
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (directory_id) REFERENCES directories(id),
        FOREIGN KEY (parent_id) REFERENCES knowledge_points(id)
      )
    `);

    // plan 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan TEXT,
        date TEXT,
        status TEXT,
        plantype TEXT,
        type TEXT,
        subjectid INTEGER,
        subjecttreeid INTEGER,
        preplanid INTEGER,
        planfinishtime TEXT,
        finishtime TEXT,
        top INTEGER DEFAULT 0,
        todayPlan INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // marquee 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS marquee (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_enabled INTEGER DEFAULT 1,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 征稿表
    db.exec(`
      CREATE TABLE IF NOT EXISTS solicit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        time TEXT,
        url TEXT,
        type TEXT DEFAULT '1',
        status TEXT DEFAULT '1'
      )
    `);
    console.log('solicit table ensured');

    // 收藏表
    db.exec(`
      CREATE TABLE IF NOT EXISTS collect (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        url TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('collect table ensured');

    // 项目表
    db.exec(`
      CREATE TABLE IF NOT EXISTS project (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('project table ensured');

    // 年度月计划表
    db.exec(`
      CREATE TABLE IF NOT EXISTS monthplan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        status INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('monthplan table ensured');

    // claude 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS claude (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        token TEXT,
        remark TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('claude table ensured');

    // token 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS token (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        desc TEXT,
        token TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('token table ensured');

    // xinxi 表（学习信息爬虫数据）
    db.exec(`
      CREATE TABLE IF NOT EXISTS xinxi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        publish_time INTEGER,
        mp_name TEXT,
        url TEXT,
        article_id TEXT,
        mp_id TEXT,
        pic_url TEXT,
        description TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('xinxi table ensured');

    // wxaccount 表（微信公众号订阅）
    db.exec(`
      CREATE TABLE IF NOT EXISTS wxaccount (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mp_name TEXT NOT NULL,
        mp_id TEXT NOT NULL UNIQUE,
        mp_cover TEXT,
        mp_intro TEXT,
        faker_id TEXT,
        status INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('wxaccount table ensured');

    // API 设置已改为前端本地存储 + 后端硬编码，无需数据库表

    console.log('Database initialized successfully');

    // 初始化默认数据：高项论文章节和论文题目
    seedDefaultData();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// API 设置已改为前端本地存储 + 后端硬编码，无需数据库相关函数

// 初始化默认数据
function seedDefaultData() {
  if (!db) return;

  // 初始化考研政治科目
  try {
    const checkKaoyan = db.prepare("SELECT id FROM directories WHERE name = '考研政治'");
    const existingKaoyan = checkKaoyan.get();

    let kaoyanDirId: number;
    if (!existingKaoyan) {
      const insertKaoyan = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
      const kaoyanResult = insertKaoyan.run('考研政治', 1);
      kaoyanDirId = Number(kaoyanResult.lastInsertRowid);
      console.log('Created directory: 考研政治, id:', kaoyanDirId);
    } else {
      kaoyanDirId = (existingKaoyan as any).id;
      console.log('Directory 考研政治 already exists, id:', kaoyanDirId);
    }
  } catch (err) {
    console.error('Seed 考研政治 data error:', err);
  }

  // 初始化完型填空科目
  try {
    const checkCloze = db.prepare("SELECT id FROM directories WHERE name = '完型填空'");
    const existingCloze = checkCloze.get();

    let clozeDirId: number;
    if (!existingCloze) {
      const insertCloze = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
      const clozeResult = insertCloze.run('完型填空', 3);
      clozeDirId = Number(clozeResult.lastInsertRowid);
      console.log('Created directory: 完型填空, id:', clozeDirId);
    } else {
      clozeDirId = (existingCloze as any).id;
      console.log('Directory 完型填空 already exists, id:', clozeDirId);
    }
  } catch (err) {
    console.error('Seed 完型填空 data error:', err);
  }

  // 初始化考研英语科目
  try {
    const checkEnglish = db.prepare("SELECT id FROM directories WHERE name = '考研英语'");
    const existingEnglish = checkEnglish.get();

    let englishDirId: number;
    if (!existingEnglish) {
      const insertEnglish = db.prepare("INSERT INTO directories (name, sort_order) VALUES (?, ?)");
      const englishResult = insertEnglish.run('考研英语', 2);
      englishDirId = Number(englishResult.lastInsertRowid);
      console.log('Created directory: 考研英语, id:', englishDirId);
    } else {
      englishDirId = (existingEnglish as any).id;
      console.log('Directory 考研英语 already exists, id:', englishDirId);
    }
  } catch (err) {
    console.error('Seed 考研英语 data error:', err);
  }

  // 初始化考研数学知识点
  try {
    const checkMath = db.prepare("SELECT id FROM directories WHERE name = '数学'");
    const existingMath = checkMath.get();
    if (existingMath) {
      const mathDirId = (existingMath as any).id;
      const checkKP = db.prepare("SELECT id FROM knowledge_points WHERE directory_id = ?");
      const existingKP = checkKP.get(mathDirId);
      if (!existingKP) {
        const insertKP = db.prepare("INSERT INTO knowledge_points (directory_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)");
        // 高等数学
        const gaoshu = insertKP.run(mathDirId, null, '高等数学', 1);
        const gaoshuId = Number(gaoshu.lastInsertRowid);
        // 线性代数
        const xiandai = insertKP.run(mathDirId, null, '线性代数', 2);
        const xiandaiId = Number(xiandai.lastInsertRowid);
        // 概率统计
        const gailv = insertKP.run(mathDirId, null, '概率论与数理统计', 3);
        const gailvId = Number(gailv.lastInsertRowid);

        // === 高等数学子节点 ===
        const gs1 = insertKP.run(mathDirId, gaoshuId, '函数、极限与连续', 1);
        const gs1Id = Number(gs1.lastInsertRowid);
        insertKP.run(mathDirId, gs1Id, '函数的概念与性质', 1);
        insertKP.run(mathDirId, gs1Id, '极限的概念与性质', 2);
        insertKP.run(mathDirId, gs1Id, '极限的运算法则', 3);
        insertKP.run(mathDirId, gs1Id, '极限存在的准则', 4);
        insertKP.run(mathDirId, gs1Id, '无穷小与无穷大', 5);
        insertKP.run(mathDirId, gs1Id, '连续与间断', 6);

        const gs2 = insertKP.run(mathDirId, gaoshuId, '一元函数微分学', 2);
        const gs2Id = Number(gs2.lastInsertRowid);
        insertKP.run(mathDirId, gs2Id, '导数的概念', 1);
        insertKP.run(mathDirId, gs2Id, '导数的运算法则', 2);
        insertKP.run(mathDirId, gs2Id, '微分', 3);
        insertKP.run(mathDirId, gs2Id, '微分中值定理', 4);
        insertKP.run(mathDirId, gs2Id, '洛必达法则', 5);
        insertKP.run(mathDirId, gs2Id, '泰勒公式', 6);
        insertKP.run(mathDirId, gs2Id, '函数的单调性与极值', 7);
        insertKP.run(mathDirId, gs2Id, '曲线的凹凸性与拐点', 8);
        insertKP.run(mathDirId, gs2Id, '渐近线与曲率', 9);

        const gs3 = insertKP.run(mathDirId, gaoshuId, '一元函数积分学', 3);
        const gs3Id = Number(gs3.lastInsertRowid);
        insertKP.run(mathDirId, gs3Id, '不定积分的概念与性质', 1);
        insertKP.run(mathDirId, gs3Id, '换元积分法', 2);
        insertKP.run(mathDirId, gs3Id, '分部积分法', 3);
        insertKP.run(mathDirId, gs3Id, '有理函数积分', 4);
        insertKP.run(mathDirId, gs3Id, '定积分的概念与性质', 5);
        insertKP.run(mathDirId, gs3Id, '微积分基本定理', 6);
        insertKP.run(mathDirId, gs3Id, '定积分的应用', 7);
        insertKP.run(mathDirId, gs3Id, '反常积分', 8);

        const gs4 = insertKP.run(mathDirId, gaoshuId, '多元函数微分学', 4);
        const gs4Id = Number(gs4.lastInsertRowid);
        insertKP.run(mathDirId, gs4Id, '多元函数的概念', 1);
        insertKP.run(mathDirId, gs4Id, '偏导数与全微分', 2);
        insertKP.run(mathDirId, gs4Id, '多元复合函数求导', 3);
        insertKP.run(mathDirId, gs4Id, '隐函数求导', 4);
        insertKP.run(mathDirId, gs4Id, '多元函数的极值', 5);
        insertKP.run(mathDirId, gs4Id, '方向导数与梯度', 6);

        const gs5 = insertKP.run(mathDirId, gaoshuId, '多元函数积分学', 5);
        const gs5Id = Number(gs5.lastInsertRowid);
        insertKP.run(mathDirId, gs5Id, '二重积分', 1);
        insertKP.run(mathDirId, gs5Id, '三重积分', 2);
        insertKP.run(mathDirId, gs5Id, '曲线积分', 3);
        insertKP.run(mathDirId, gs5Id, '曲面积分', 4);
        insertKP.run(mathDirId, gs5Id, '格林公式', 5);
        insertKP.run(mathDirId, gs5Id, '高斯公式与斯托克斯公式', 6);

        const gs6 = insertKP.run(mathDirId, gaoshuId, '常微分方程', 6);
        const gs6Id = Number(gs6.lastInsertRowid);
        insertKP.run(mathDirId, gs6Id, '一阶微分方程', 1);
        insertKP.run(mathDirId, gs6Id, '可降阶的高阶方程', 2);
        insertKP.run(mathDirId, gs6Id, '高阶线性微分方程', 3);
        insertKP.run(mathDirId, gs6Id, '常系数线性微分方程', 4);

        const gs7 = insertKP.run(mathDirId, gaoshuId, '无穷级数', 7);
        const gs7Id = Number(gs7.lastInsertRowid);
        insertKP.run(mathDirId, gs7Id, '常数项级数', 1);
        insertKP.run(mathDirId, gs7Id, '幂级数', 2);
        insertKP.run(mathDirId, gs7Id, '傅里叶级数', 3);

        // === 线性代数子节点 ===
        const xd1 = insertKP.run(mathDirId, xiandaiId, '行列式', 1);
        const xd1Id = Number(xd1.lastInsertRowid);
        insertKP.run(mathDirId, xd1Id, '行列式的概念与性质', 1);
        insertKP.run(mathDirId, xd1Id, '行列式的展开定理', 2);
        insertKP.run(mathDirId, xd1Id, '行列式的计算', 3);

        const xd2 = insertKP.run(mathDirId, xiandaiId, '矩阵', 2);
        const xd2Id = Number(xd2.lastInsertRowid);
        insertKP.run(mathDirId, xd2Id, '矩阵的运算', 1);
        insertKP.run(mathDirId, xd2Id, '逆矩阵', 2);
        insertKP.run(mathDirId, xd2Id, '初等变换与初等矩阵', 3);
        insertKP.run(mathDirId, xd2Id, '矩阵的秩', 4);
        insertKP.run(mathDirId, xd2Id, '分块矩阵', 5);

        const xd3 = insertKP.run(mathDirId, xiandaiId, '向量', 3);
        const xd3Id = Number(xd3.lastInsertRowid);
        insertKP.run(mathDirId, xd3Id, '向量的概念与运算', 1);
        insertKP.run(mathDirId, xd3Id, '向量组的线性相关性', 2);
        insertKP.run(mathDirId, xd3Id, '向量组的秩', 3);
        insertKP.run(mathDirId, xd3Id, '向量空间', 4);

        const xd4 = insertKP.run(mathDirId, xiandaiId, '线性方程组', 4);
        const xd4Id = Number(xd4.lastInsertRowid);
        insertKP.run(mathDirId, xd4Id, '齐次线性方程组', 1);
        insertKP.run(mathDirId, xd4Id, '非齐次线性方程组', 2);

        const xd5 = insertKP.run(mathDirId, xiandaiId, '特征值与特征向量', 5);
        const xd5Id = Number(xd5.lastInsertRowid);
        insertKP.run(mathDirId, xd5Id, '特征值与特征向量的概念', 1);
        insertKP.run(mathDirId, xd5Id, '相似矩阵', 2);
        insertKP.run(mathDirId, xd5Id, '实对称矩阵的对角化', 3);

        const xd6 = insertKP.run(mathDirId, xiandaiId, '二次型', 6);
        const xd6Id = Number(xd6.lastInsertRowid);
        insertKP.run(mathDirId, xd6Id, '二次型及其矩阵表示', 1);
        insertKP.run(mathDirId, xd6Id, '化二次型为标准形', 2);
        insertKP.run(mathDirId, xd6Id, '正定二次型', 3);

        // === 概率论子节点 ===
        const gl1 = insertKP.run(mathDirId, gailvId, '随机事件与概率', 1);
        const gl1Id = Number(gl1.lastInsertRowid);
        insertKP.run(mathDirId, gl1Id, '随机事件', 1);
        insertKP.run(mathDirId, gl1Id, '概率的定义与性质', 2);
        insertKP.run(mathDirId, gl1Id, '条件概率与独立性', 3);
        insertKP.run(mathDirId, gl1Id, '全概率公式与贝叶斯公式', 4);

        const gl2 = insertKP.run(mathDirId, gailvId, '随机变量及其分布', 2);
        const gl2Id = Number(gl2.lastInsertRowid);
        insertKP.run(mathDirId, gl2Id, '离散型随机变量', 1);
        insertKP.run(mathDirId, gl2Id, '连续型随机变量', 2);
        insertKP.run(mathDirId, gl2Id, '常见分布', 3);

        const gl3 = insertKP.run(mathDirId, gailvId, '多维随机变量', 3);
        const gl3Id = Number(gl3.lastInsertRowid);
        insertKP.run(mathDirId, gl3Id, '二维离散型随机变量', 1);
        insertKP.run(mathDirId, gl3Id, '二维连续型随机变量', 2);
        insertKP.run(mathDirId, gl3Id, '随机变量的独立性', 3);

        const gl4 = insertKP.run(mathDirId, gailvId, '随机变量的数字特征', 4);
        const gl4Id = Number(gl4.lastInsertRowid);
        insertKP.run(mathDirId, gl4Id, '数学期望', 1);
        insertKP.run(mathDirId, gl4Id, '方差', 2);
        insertKP.run(mathDirId, gl4Id, '协方差与相关系数', 3);

        const gl5 = insertKP.run(mathDirId, gailvId, '大数定律与中心极限定理', 5);
        const gl5Id = Number(gl5.lastInsertRowid);
        insertKP.run(mathDirId, gl5Id, '大数定律', 1);
        insertKP.run(mathDirId, gl5Id, '中心极限定理', 2);

        const gl6 = insertKP.run(mathDirId, gailvId, '数理统计的基本概念', 6);
        const gl6Id = Number(gl6.lastInsertRowid);
        insertKP.run(mathDirId, gl6Id, '总体与样本', 1);
        insertKP.run(mathDirId, gl6Id, '统计量与抽样分布', 2);

        const gl7 = insertKP.run(mathDirId, gailvId, '参数估计', 7);
        const gl7Id = Number(gl7.lastInsertRowid);
        insertKP.run(mathDirId, gl7Id, '点估计', 1);
        insertKP.run(mathDirId, gl7Id, '估计量的评选标准', 2);
        insertKP.run(mathDirId, gl7Id, '区间估计', 3);

        const gl8 = insertKP.run(mathDirId, gailvId, '假设检验', 8);
        const gl8Id = Number(gl8.lastInsertRowid);
        insertKP.run(mathDirId, gl8Id, '假设检验的基本概念', 1);
        insertKP.run(mathDirId, gl8Id, '正态总体参数的假设检验', 2);

        console.log('Seeded knowledge points for 数学');
      }
    }
  } catch (err) {
    console.error('Seed 数学 knowledge points error:', err);
  }
}

// IPC ����
function setupIpc() {
  // ��ȡĿ¼�б�
  ipcMain.handle('db:getDirectories', () => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM directories ORDER BY sort_order, id');
      return stmt.all();
    } catch (err) {
      console.error('getDirectories error:', err);
      return [];
    }
  });

// ��ȡĳĿ¼�µ���Ŀ��??
ipcMain.handle('db:getQuestions', (_event, directoryId: number) => {
if (!db) return [];
try {
const stmt = db.prepare('SELECT * FROM questions WHERE directory_id = ? ORDER BY sort_order, id');
return stmt.all(directoryId);
} catch (err) {
console.error('getQuestions error:', err);
return [];
}
});

// 获取某知识点下的题目
ipcMain.handle('db:getQuestionsByKnowledge', (_event, knowledgeId: number) => {
if (!db) return [];
try {
const stmt = db.prepare('SELECT * FROM questions WHERE knowledge_id = ? ORDER BY sort_order, id');
return stmt.all(knowledgeId);
} catch (err) {
console.error('getQuestionsByKnowledge error:', err);
return [];
}
});

  // 模糊查询题目（按标题关键词）
  ipcMain.handle('db:searchQuestions', (_event, directoryId: number, keyword: string) => {
    if (!db) return [];
    try {
      const stmt = db.prepare(`
        SELECT * FROM questions 
        WHERE directory_id = ? AND title LIKE ? 
        ORDER BY sort_order, id
      `);
      return stmt.all(directoryId, `%${keyword}%`);
    } catch (err) {
      console.error('searchQuestions error:', err);
      return [];
    }
  });

  // ��ȡĳĿ¼�µ����±� article
  ipcMain.handle('db:getArticles', (_event, directoryId: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM articles WHERE directory_id = ? ORDER BY id');
      return stmt.all(directoryId);
    } catch (err) {
      console.error('getArticles error:', err);
      return [];
    }
  });

  // ��ȡ������Ŀ
  ipcMain.handle('db:getQuestion', (_event, id: number) => {
    if (!db) return null;
    try {
      const stmt = db.prepare('SELECT * FROM questions WHERE id = ?');
      return stmt.get(id);
    } catch (err) {
      console.error('getQuestion error:', err);
      return null;
    }
  });

  // ɾ����Ŀ
  ipcMain.handle('db:deleteQuestion', (_event, id: number) => {
    if (!db) return false;
    try {
      // 先删除关联的同类题（子题）
      const deleteSimilar = db.prepare('DELETE FROM questions WHERE pid = ?');
      deleteSimilar.run(id);
      // 再删除题目本身
      const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteQuestion error:', err);
      return false;
    }
  });

  // ɾ������
  ipcMain.handle('db:deleteArticle', (_event, id: number) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('DELETE FROM articles WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteArticle error:', err);
      return false;
    }
  });

  // ����Ŀ¼��������ԣ�
ipcMain.handle('db:addDirectory', (_event, name: string, template: string | null = null, parentId: number | null = null) => {
if (!db) return null;
try {
const stmt = db.prepare('INSERT INTO directories (name, template, parent_id) VALUES (?, ?, ?)');
const result = stmt.run(name, template, parentId);
return { id: result.lastInsertRowid, name, template, parent_id: parentId };
} catch (err) {
console.error('addDirectory error:', err);
return null;
}
});

  // 删除目录
  ipcMain.handle('db:deleteDirectory', (_event, id: number) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('DELETE FROM directories WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteDirectory error:', err);
      return false;
    }
  });

  // 获取英语阅读材料列表
  ipcMain.handle('english:getReadings', (_event, dirId: number) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const materialsStmt = db.prepare('SELECT * FROM english_materials WHERE directory_id = ? ORDER BY id');
      const materials = materialsStmt.all(dirId) as any[];

      const questionsStmt = db.prepare('SELECT * FROM english_questions WHERE material_id = ? ORDER BY question_number');
      for (const material of materials) {
        material.questions = questionsStmt.all(material.id);
      }

      return { success: true, materials };
    } catch (err: any) {
      console.error('getEnglishReadings error:', err);
      return { success: false, error: err.message };
    }
  });

  // 添加英语阅读材料
  ipcMain.handle('english:addReading', (_event, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const insertMaterial = db.prepare(`
        INSERT INTO english_materials (directory_id, title, content)
        VALUES (?, ?, ?)
      `);
      const materialResult = insertMaterial.run(data.directory_id, data.title || '', data.content);
      const materialId = Number(materialResult.lastInsertRowid);

      const insertQuestion = db.prepare(`
        INSERT INTO english_questions (material_id, question_number, title, option_a, option_b, option_c, option_d, correct_answer, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const q of data.questions) {
        insertQuestion.run(
          materialId,
          q.question_number,
          q.title,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_answer,
          q.explanation || ''
        );
      }

      return { success: true, materialId };
    } catch (err: any) {
      console.error('addEnglishReading error:', err);
      return { success: false, error: err.message };
    }
  });

  // 英语阅读：更新材料
  ipcMain.handle('english:updateReading', (_event, id: number, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const stmt = db.prepare('UPDATE english_materials SET content = ? WHERE id = ?');
      stmt.run(data.content || '', id);
      return { success: true };
    } catch (err: any) {
      console.error('updateEnglishReading error:', err);
      return { success: false, error: err.message };
    }
  });

  // 英语阅读：删除材料（级联删除小题）
  ipcMain.handle('english:deleteReading', (_event: any, id: number) => {
    console.log('[main] english:deleteReading called, id=', id);
    if (!db) {
      console.error('[main] db not initialized');
      return { success: false, error: '数据库未初始化' };
    }
    try {
      const stmt = db.prepare('DELETE FROM english_materials WHERE id = ?');
      const result = stmt.run(id);
      console.log('[main] deleteEnglishReading result:', result);
      return { success: true };
    } catch (err: any) {
      console.error('[main] deleteEnglishReading error:', err);
      return { success: false, error: err.message };
    }
  });

  // ========== 完型填空 IPC ==========

  // 获取完型填空材料列表
  ipcMain.handle('cloze:getMaterials', (_event, dirId: number) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const materialsStmt = db.prepare('SELECT * FROM cloze_materials WHERE directory_id = ? ORDER BY id');
      const materials = materialsStmt.all(dirId) as any[];

      const questionsStmt = db.prepare('SELECT * FROM cloze_questions WHERE material_id = ? ORDER BY question_number');
      for (const material of materials) {
        material.questions = questionsStmt.all(material.id);
      }

      return { success: true, materials };
    } catch (err: any) {
      console.error('cloze:getMaterials error:', err);
      return { success: false, error: err.message };
    }
  });

  // 添加完型填空材料
  ipcMain.handle('cloze:addMaterial', (_event, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const insertMaterial = db.prepare(`
        INSERT INTO cloze_materials (directory_id, title, content)
        VALUES (?, ?, ?)
      `);
      const materialResult = insertMaterial.run(data.directory_id, data.title || '', data.content);
      const materialId = Number(materialResult.lastInsertRowid);

      const insertQuestion = db.prepare(`
        INSERT INTO cloze_questions (material_id, question_number, option_a, option_b, option_c, option_d, correct_answer, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const q of data.questions) {
        insertQuestion.run(
          materialId,
          q.question_number,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_answer,
          q.explanation || ''
        );
      }

      return { success: true, materialId };
    } catch (err: any) {
      console.error('cloze:addMaterial error:', err);
      return { success: false, error: err.message };
    }
  });

  // 完型填空：更新材料
  ipcMain.handle('cloze:updateMaterial', (_event, id: number, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const stmt = db.prepare('UPDATE cloze_materials SET content = ? WHERE id = ?');
      stmt.run(data.content || '', id);
      return { success: true };
    } catch (err: any) {
      console.error('cloze:updateMaterial error:', err);
      return { success: false, error: err.message };
    }
  });

  // 完型填空：删除材料（级联删除小题）
  ipcMain.handle('cloze:deleteMaterial', (_event, id: number) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const stmt = db.prepare('DELETE FROM cloze_materials WHERE id = ?');
      const result = stmt.run(id);
      return { success: true };
    } catch (err: any) {
      console.error('cloze:deleteMaterial error:', err);
      return { success: false, error: err.message };
    }
  });

  // 完型填空：更新小题
  ipcMain.handle('cloze:updateQuestion', (_event, id: number, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.option_a !== undefined) { fields.push('option_a = ?'); values.push(data.option_a); }
      if (data.option_b !== undefined) { fields.push('option_b = ?'); values.push(data.option_b); }
      if (data.option_c !== undefined) { fields.push('option_c = ?'); values.push(data.option_c); }
      if (data.option_d !== undefined) { fields.push('option_d = ?'); values.push(data.option_d); }
      if (data.correct_answer !== undefined) { fields.push('correct_answer = ?'); values.push(data.correct_answer); }
      if (data.explanation !== undefined) { fields.push('explanation = ?'); values.push(data.explanation); }
      if (fields.length === 0) return { success: true };
      values.push(id);
      const stmt = db.prepare(`UPDATE cloze_questions SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
      return { success: true };
    } catch (err: any) {
      console.error('cloze:updateQuestion error:', err);
      return { success: false, error: err.message };
    }
  });

  // 完型填空：删除小题
  ipcMain.handle('cloze:deleteQuestion', (_event, id: number) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const stmt = db.prepare('DELETE FROM cloze_questions WHERE id = ?');
      const result = stmt.run(id);
      return { success: true };
    } catch (err: any) {
      console.error('cloze:deleteQuestion error:', err);
      return { success: false, error: err.message };
    }
  });

  // ========== 英语翻译 IPC ==========

  // 获取英语翻译列表
  ipcMain.handle('translate:getList', (_event, dirId: number) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const stmt = db.prepare('SELECT * FROM english_translate WHERE directory_id = ? ORDER BY id');
      const list = stmt.all(dirId) as any[];
      return { success: true, list };
    } catch (err: any) {
      console.error('translate:getList error:', err);
      return { success: false, error: err.message };
    }
  });

  // 添加英语翻译
  ipcMain.handle('translate:add', (_event, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const stmt = db.prepare('INSERT INTO english_translate (directory_id, content, answer) VALUES (?, ?, ?)');
      const result = stmt.run(data.directory_id, data.content, data.answer);
      return { success: true, id: result.lastInsertRowid };
    } catch (err: any) {
      console.error('translate:add error:', err);
      return { success: false, error: err.message };
    }
  });

  // 更新英语翻译
  ipcMain.handle('translate:update', (_event, id: number, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const stmt = db.prepare('UPDATE english_translate SET content = ?, answer = ? WHERE id = ?');
      stmt.run(data.content, data.answer, id);
      return { success: true };
    } catch (err: any) {
      console.error('translate:update error:', err);
      return { success: false, error: err.message };
    }
  });

  // 删除英语翻译
  ipcMain.handle('translate:delete', (_event, id: number) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const stmt = db.prepare('DELETE FROM english_translate WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (err: any) {
      console.error('translate:delete error:', err);
      return { success: false, error: err.message };
    }
  });

  // 英语阅读：更新小题
  ipcMain.handle('english:updateQuestion', (_event, id: number, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
      if (data.option_a !== undefined) { fields.push('option_a = ?'); values.push(data.option_a); }
      if (data.option_b !== undefined) { fields.push('option_b = ?'); values.push(data.option_b); }
      if (data.option_c !== undefined) { fields.push('option_c = ?'); values.push(data.option_c); }
      if (data.option_d !== undefined) { fields.push('option_d = ?'); values.push(data.option_d); }
      if (data.correct_answer !== undefined) { fields.push('correct_answer = ?'); values.push(data.correct_answer); }
      if (data.explanation !== undefined) { fields.push('explanation = ?'); values.push(data.explanation); }
      if (fields.length === 0) return { success: true };
      values.push(id);
      const stmt = db.prepare(`UPDATE english_questions SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
      return { success: true };
    } catch (err: any) {
      console.error('updateEnglishQuestion error:', err);
      return { success: false, error: err.message };
    }
  });

  // 英语阅读：删除小题
  ipcMain.handle('english:deleteQuestion', (_event, id: number) => {
    console.log('[main] english:deleteQuestion called, id=', id);
    if (!db) {
      console.error('[main] db not initialized');
      return { success: false, error: '数据库未初始化' };
    }
    try {
      const stmt = db.prepare('DELETE FROM english_questions WHERE id = ?');
      const result = stmt.run(id);
      console.log('[main] deleteEnglishQuestion result:', result);
      return { success: true };
    } catch (err: any) {
      console.error('[main] deleteEnglishQuestion error:', err);
      return { success: false, error: err.message };
    }
  });

  // 获取考研英语单词图片列表
  ipcMain.handle('word:getImages', () => {
    try {
      const wordDir = 'D:\\考研\\英语单词';
      if (!fs.existsSync(wordDir)) {
        return { success: false, error: '单词目录不存在: ' + wordDir };
      }
      const files = fs.readdirSync(wordDir);
      const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file));

      // 读取图片并转换为 base64
      const images = imageFiles.map(file => {
        const filePath = path.join(wordDir, file);
        const ext = path.extname(file).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.bmp') mimeType = 'image/bmp';
        else if (ext === '.webp') mimeType = 'image/webp';

        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
      });

      return { success: true, images };
    } catch (err: any) {
      console.error('getWordImages error:', err);
      return { success: false, error: err.message };
    }
  });

  // ������Ŀ��������ԣ�
  ipcMain.handle('db:addQuestion', (_event, question: any) => {
    if (!db) return null;
    try {
      const stmt = db.prepare(`
        INSERT INTO questions (directory_id, pid, knowledge_id, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, ai_explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        question.directory_id,
        question.pid || null,
        question.knowledge_id || null,
        question.question_type,
        question.title,
        question.option_a || null,
        question.option_b || null,
        question.option_c || null,
        question.option_d || null,
        question.option_e || null,
        question.correct_answer,
        question.explanation || null,
        question.ai_explanation || null
      );
      return { id: result.lastInsertRowid, ...question };
    } catch (err) {
      console.error('addQuestion error:', err);
      return null;
    }
  });

  // 获取某题目的同类题
  ipcMain.handle('db:getSimilarQuestions', (_event, pid: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM questions WHERE pid = ? ORDER BY sort_order, id');
      return stmt.all(pid);
    } catch (err) {
      console.error('getSimilarQuestions error:', err);
      return [];
    }
  });

  // 批量添加同类题
  ipcMain.handle('db:addSimilarQuestions', (_event, questions: any[]) => {
    if (!db) return [];
    try {
      const insert = db.prepare(`
        INSERT INTO questions (directory_id, pid, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const results: any[] = [];
      for (const q of questions) {
        const result = insert.run(
          q.directory_id,
          q.pid,
          q.question_type,
          q.title,
          q.option_a || null,
          q.option_b || null,
          q.option_c || null,
          q.option_d || null,
          q.option_e || null,
          q.correct_answer,
          q.explanation || null
        );
        results.push({ id: result.lastInsertRowid, ...q });
      }
      return results;
    } catch (err) {
      console.error('addSimilarQuestions error:', err);
      return [];
    }
  });

  // 更新题目 AI 解析
  ipcMain.handle('db:updateAIExplanation', (_event, id: number, aiExplanation: string) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('UPDATE questions SET ai_explanation = ? WHERE id = ?');
      const result = stmt.run(aiExplanation, id);
      return result.changes > 0;
    } catch (err) {
      console.error('updateAIExplanation error:', err);
      return false;
    }
  });

  // 更新题目内容（标题、选项、答案、解析等）
  ipcMain.handle('db:updateQuestion', (_event, id: number, data: any) => {
    if (!db) return false;
    try {
      const fields: string[] = [];
      const values: any[] = [];
      
      if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
      if (data.option_a !== undefined) { fields.push('option_a = ?'); values.push(data.option_a); }
      if (data.option_b !== undefined) { fields.push('option_b = ?'); values.push(data.option_b); }
      if (data.option_c !== undefined) { fields.push('option_c = ?'); values.push(data.option_c); }
      if (data.option_d !== undefined) { fields.push('option_d = ?'); values.push(data.option_d); }
      if (data.option_e !== undefined) { fields.push('option_e = ?'); values.push(data.option_e); }
      if (data.correct_answer !== undefined) { fields.push('correct_answer = ?'); values.push(data.correct_answer); }
      if (data.explanation !== undefined) { fields.push('explanation = ?'); values.push(data.explanation); }
      if (data.question_type !== undefined) { fields.push('question_type = ?'); values.push(data.question_type); }
      if (data.knowledge_id !== undefined) { fields.push('knowledge_id = ?'); values.push(data.knowledge_id); }
      
      if (fields.length === 0) return false;
      
      values.push(id);
      const sql = `UPDATE questions SET ${fields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(sql);
      const result = stmt.run(...values);
      return result.changes > 0;
    } catch (err) {
      console.error('updateQuestion error:', err);
      return false;
    }
  });

  // ��ȡĳĿ¼�µ���������
  ipcMain.handle('db:getCaseMaterials', (_event, directoryId: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM case_materials WHERE directory_id = ? ORDER BY sort_order, id');
      return stmt.all(directoryId);
    } catch (err) {
      console.error('getCaseMaterials error:', err);
      return [];
    }
  });

  // ��ȡĳ��������µ�С��
  ipcMain.handle('db:getCaseQuestions', (_event, materialId: number) => {
    if (!db) return [];
    try {
      const stmt = db.prepare('SELECT * FROM case_questions WHERE material_id = ? ORDER BY question_number, id');
      return stmt.all(materialId);
    } catch (err) {
      console.error('getCaseQuestions error:', err);
      return [];
    }
  });

  // 模糊查询案例材料（按标题关键词）
  ipcMain.handle('db:searchCaseMaterials', (_event, directoryId: number, keyword: string) => {
    if (!db) return [];
    try {
      const stmt = db.prepare(`
        SELECT * FROM case_materials
        WHERE directory_id = ? AND title LIKE ?
        ORDER BY sort_order, id
      `);
      return stmt.all(directoryId, `%${keyword}%`);
    } catch (err) {
      console.error('searchCaseMaterials error:', err);
      return [];
    }
  });

  // �����������
  ipcMain.handle('db:addCaseMaterial', (_event, material: any) => {
    if (!db) return null;
    try {
      const stmt = db.prepare(`
        INSERT INTO case_materials (directory_id, title, content, sort_order)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(
        material.directory_id,
        material.title,
        material.content,
        material.sort_order || 0
      );
      return { id: result.lastInsertRowid, ...material };
    } catch (err) {
      console.error('addCaseMaterial error:', err);
      return null;
    }
  });

  // ��������С��
  ipcMain.handle('db:addCaseQuestion', (_event, question: any) => {
    if (!db) return null;
    try {
      const stmt = db.prepare(`
        INSERT INTO case_questions (material_id, pid, question_number, title, answer, ai_explanation, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        question.material_id,
        question.pid || null,
        question.question_number,
        question.title,
        question.answer || null,
        question.ai_explanation || null,
        question.sort_order || 0
      );
      return { id: result.lastInsertRowid, ...question };
    } catch (err) {
      console.error('addCaseQuestion error:', err);
      return null;
    }
  });

  // 新增案例材料及小题（解析格式内容）
  ipcMain.handle('db:addCaseMaterialWithQuestions', (_event, data: any) => {
    if (!db) return { success: false, error: '数据库未初始化' };
    try {
      const directoryId = data.directory_id as number;
      const title = data.title as string;
      let content = data.content as string;

      // 解析内容：提取【材料】...【/材料】和【小题】...【/小题】
      let materialContent = '';
      const questions: Array<{ title: string; answer: string }> = [];

      // 提取材料内容
      const materialMatch = content.match(/【材料】(.*?)【\/材料】/s);
      if (materialMatch) {
        materialContent = materialMatch[1].trim();
        // 移除材料部分，保留小题部分
        content = content.replace(/【材料】.*?【\/材料】/s, '');
      } else {
        // 如果没有材料标签，将整个内容作为材料
        materialContent = content.trim();
      }

      // 提取小题
      const questionRegex = /【小题】(.*?)【\/小题】/gs;
      let match;
      while ((match = questionRegex.exec(content)) !== null) {
        const questionBlock = match[1];
        const titleMatch = questionBlock.match(/【问题】(.*?)【\/问题】/s);
        const answerMatch = questionBlock.match(/【答案】(.*?)【\/答案】/s);
        if (titleMatch && answerMatch) {
          questions.push({
            title: titleMatch[1].trim(),
            answer: answerMatch[1].trim(),
          });
        }
      }

      // 如果没有解析到小题，但内容中有问题和答案标签，尝试直接解析
      if (questions.length === 0) {
        const titleMatch = content.match(/【问题】(.*?)【\/问题】/s);
        const answerMatch = content.match(/【答案】(.*?)【\/答案】/s);
        if (titleMatch && answerMatch) {
          questions.push({
            title: titleMatch[1].trim(),
            answer: answerMatch[1].trim(),
          });
        }
      }

      // 开始事务
      db.exec('BEGIN TRANSACTION');

      try {
        // 1. 保存案例材料
        const materialStmt = db.prepare(`
          INSERT INTO case_materials (directory_id, title, content, sort_order)
          VALUES (?, ?, ?, ?)
        `);
        const materialResult = materialStmt.run(directoryId, title, materialContent, 0);
        const materialId = materialResult.lastInsertRowid as number;

        // 2. 保存小题
        if (questions.length > 0) {
          const questionStmt = db.prepare(`
            INSERT INTO case_questions (material_id, question_number, title, answer, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `);
          for (let i = 0; i < questions.length; i++) {
            questionStmt.run(materialId, i + 1, questions[i].title, questions[i].answer, i);
          }
        }

        db.exec('COMMIT');
        return { success: true, materialId };
      } catch (err: any) {
        db.exec('ROLLBACK');
        throw err;
      }
    } catch (err: any) {
      console.error('addCaseMaterialWithQuestions error:', err);
      return { success: false, error: err.message || '保存失败' };
    }
  });

  // ɾ����������
  ipcMain.handle('db:deleteCaseMaterial', (_event, id: number) => {
    if (!db) return false;
    try {
      // 先删除关联的小题（包括子小题）
      const deleteQuestions = db.prepare('DELETE FROM case_questions WHERE material_id = ?');
      deleteQuestions.run(id);

      // 再删除案例材料
      const stmt = db.prepare('DELETE FROM case_materials WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteCaseMaterial error:', err);
      return false;
    }
  });

  // 删除案例小题
  ipcMain.handle('db:deleteCaseQuestion', (_event, id: number) => {
    if (!db) return false;
    try {
      // 先删除关联的子小题
      const deleteChildren = db.prepare('DELETE FROM case_questions WHERE pid = ?');
      deleteChildren.run(id);
      // 再删除小题本身
      const stmt = db.prepare('DELETE FROM case_questions WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      console.error('deleteCaseQuestion error:', err);
      return false;
    }
  });

  // 更新案例材料内容
  ipcMain.handle('db:updateCaseMaterial', (_event, id: number, content: string) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('UPDATE case_materials SET content = ? WHERE id = ?');
      const result = stmt.run(content, id);
      return result.changes > 0;
    } catch (err) {
      console.error('updateCaseMaterial error:', err);
      return false;
    }
  });

  // 更新案例小题内容
  ipcMain.handle('db:updateCaseQuestion', (_event, id: number, title: string, answer?: string) => {
    if (!db) return false;
    try {
      if (answer !== undefined) {
        const stmt = db.prepare('UPDATE case_questions SET title = ?, answer = ? WHERE id = ?');
        const result = stmt.run(title, answer, id);
        return result.changes > 0;
      } else {
        const stmt = db.prepare('UPDATE case_questions SET title = ? WHERE id = ?');
        const result = stmt.run(title, id);
        return result.changes > 0;
      }
    } catch (err) {
      console.error('updateCaseQuestion error:', err);
      return false;
    }
  });

// 更新文章内容
ipcMain.handle('db:updateArticle', (_event, id: number, content: string, title?: string) => {
  if (!db) return false;
  try {
    if (title !== undefined) {
      const stmt = db.prepare('UPDATE articles SET content = ?, title = ? WHERE id = ?');
      const result = stmt.run(content, title, id);
      return result.changes > 0;
    } else {
      const stmt = db.prepare('UPDATE articles SET content = ? WHERE id = ?');
      const result = stmt.run(content, id);
      return result.changes > 0;
    }
  } catch (err) {
    console.error('updateArticle error:', err);
    return false;
  }
});

// 新增文章
ipcMain.handle('db:addArticle', (_event, article: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO articles (directory_id, title, content)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      article.directory_id,
      article.title,
      article.content
    );
    return { id: result.lastInsertRowid, ...article };
  } catch (err) {
    console.error('addArticle error:', err);
    return null;
  }
});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '..', '..', 'favicon.ico'),
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  // 禁用 Alt 键显示菜单栏
  mainWindow.setMenuBarVisibility(false);
  // 移除所有菜单（包括 Alt 键触发的菜单）
  Menu.setApplicationMenu(null);

  // 默认最大化窗口
  mainWindow.maximize();

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  clearLog();
  log('=== App started ===');
  log(`App path: ${app.getAppPath()}`);
  log(`userData: ${app.getPath('userData')}`);
  initDatabase();
  setupIpc();
  setupDeepSeekIpc(() => mainWindow);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 全屏切换
ipcMain.handle('window:toggleFullscreen', () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    return !isFullScreen;
  }
  return false;
});

// 获取全屏状态
ipcMain.handle('window:isFullScreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// AI 对话上下文存储（按题目ID存储对话历史）
const aiChatContexts = new Map<number, Array<{role: string; content: string}>>();

// AI 讲解：流式调用 API，支持多轮对话，带厂商兜底
ipcMain.handle('ai:explainQuestion', async (_event, questionData: any) => {
  const questionId = questionData.questionId as number;
  const isFollowUp = questionData.isFollowUp as boolean;
  const userMessage = questionData.userMessage as string || '';
  const providerOrder = (questionData.providerOrder as string[]) || ['modelspace', 'deepseek'];

  // 获取或初始化对话上下文
  let messages: Array<{role: string; content: string}> = [];
  if (isFollowUp && aiChatContexts.has(questionId)) {
    messages = [...aiChatContexts.get(questionId)!];
  }

  // 如果是首次讲解，构建初始题目信息
  if (!isFollowUp) {
    const prompt = PROMPTS.explainQuestion(
      questionData.title,
      questionData.correctAnswer,
      questionData.explanation,
      questionData.options
    );
    messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  } else {
    // 追问模式：添加用户新问题
    messages.push({ role: 'user', content: userMessage });
  }

  const result = await callAIWithFallback(
    providerOrder,
    async (provider) => {
      log(`[AI] 开始调用厂商: ${provider}`);
      // 支持 DeepSeek 本地版
      if (provider === 'deepseekLocal') {
        const dsClient = getDeepSeekClient();
        if (!dsClient) {
          throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
        }
        log(`[AI] 使用 DeepSeek 本地版客户端`);

        // 转换消息格式为 DeepSeekMessage
        const dsMessages = messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

        let assistantContent = '';
        for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
          if (chunk.type === 'text' && chunk.content) {
            assistantContent += chunk.content;
            if (mainWindow) {
              mainWindow.webContents.send('ai:streamChunk', chunk.content);
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content || 'DeepSeek 聊天失败');
          }
        }

        // 保存对话上下文
        messages.push({ role: 'assistant', content: assistantContent });
        aiChatContexts.set(questionId, messages);

        if (mainWindow) {
          mainWindow.webContents.send('ai:streamDone');
        }

        log(`[AI] DeepSeek 本地版调用成功`);
        return assistantContent;
      }

      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);
      log(`[AI] 使用模型: ${model}`);

      const stream = await client.chat.completions.create({
        model,
        messages: messages as any,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      });

      let assistantContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content && mainWindow) {
          assistantContent += content;
          mainWindow.webContents.send('ai:streamChunk', content);
        }
      }

      // 保存对话上下文
      messages.push({ role: 'assistant', content: assistantContent });
      aiChatContexts.set(questionId, messages);

      if (mainWindow) {
        mainWindow.webContents.send('ai:streamDone');
      }

      log(`[AI]  ${provider} 调用成功`);
      return assistantContent;
    },
    (provider) => {
      log(`[AI Fallback] 切换到: ${provider}`);
      if (mainWindow) {
        mainWindow.webContents.send('ai:providerSwitch', provider);
      }
    }
  );

  if (!result.success) {
    console.error('AI explain error:', result.error);
    if (mainWindow) {
      mainWindow.webContents.send('ai:streamError', result.error);
    }
    return { success: false, error: result.error };
  }

  return { success: true };
});

// AI 生成同类题，带厂商兜底
ipcMain.handle('ai:generateSimilarQuestions', async (_event, questionData: any) => {
  const providerOrder = (questionData.providerOrder as string[]) || ['modelspace', 'deepseek'];

  const prompt = PROMPTS.generateSimilar(questionData);

  const result = await callAIWithFallback(providerOrder, async (provider) => {
    log(`[AI GenerateSimilar] 使用厂商: ${provider}`);
    let content = '';

    // 支持 DeepSeek 本地版
    if (provider === 'deepseekLocal') {
      const dsClient = getDeepSeekClient();
      if (!dsClient) {
        throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
      }

      const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `${prompt.system}\n\n${prompt.user}` }
      ];

      let thinking = '';
      for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
        if (chunk.type === 'text' && chunk.content) {
          content += chunk.content;
        } else if (chunk.type === 'thinking' && chunk.content) {
          thinking += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || 'DeepSeek 聊天失败');
        }
      }
      log(`[AI GenerateSimilar] DeepSeek 本地版返回内容长度: ${content.length}`);
    } else {
      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 4096,
      });

      content = response.choices[0]?.message?.content || '';
      log(`[AI GenerateSimilar] ${provider} 返回内容长度: ${content.length}`);
    }

    // 提取JSON部分
    log(`[AI GenerateSimilar] 原始内容前200字符: ${content.substring(0, 200)}`);
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log(`[AI GenerateSimilar] 未找到JSON数组，内容: ${content.substring(0, 500)}`);
      throw new Error('AI返回格式不正确，未找到JSON数组');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      log(`[AI GenerateSimilar] JSON解析成功，题目数量: ${Array.isArray(parsed) ? parsed.length : '非数组'}`);
      if (!Array.isArray(parsed)) {
        throw new Error('AI返回的JSON不是数组');
      }
      return parsed;
    } catch (e: any) {
      log(`[AI GenerateSimilar] JSON解析失败: ${e.message}`);
      throw new Error(`JSON解析失败: ${e.message}`);
    }
  });

  if (!result.success) {
    console.error('AI generate similar questions error:', result.error);
    return { success: false, error: result.error };
  }

  return { success: true, questions: result.data };
});

// AI 根据主题生成同类题（技能模式）
ipcMain.handle('ai:generateSimilarQuestionsByTopic', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['modelspace', 'deepseek'];
  const topic = data.topic as string;

  if (!topic) {
    return { success: false, error: '主题不能为空' };
  }

  const prompt = PROMPTS.generateSimilarByTopic(topic);

  const result = await callAIWithFallback(providerOrder, async (provider) => {
    log(`[AI GenerateSimilarByTopic] 使用厂商: ${provider}`);
    let content = '';

    // 支持 DeepSeek 本地版
    if (provider === 'deepseekLocal') {
      const dsClient = getDeepSeekClient();
      if (!dsClient) {
        throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
      }

      const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `${prompt.system}\n\n${prompt.user}` }
      ];

      let thinking = '';
      for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
        if (chunk.type === 'text' && chunk.content) {
          content += chunk.content;
        } else if (chunk.type === 'thinking' && chunk.content) {
          thinking += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || 'DeepSeek 聊天失败');
        }
      }
      log(`[AI GenerateSimilarByTopic] DeepSeek 本地版返回内容长度: ${content.length}`);
    } else {
      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 4096,
      });

      content = response.choices[0]?.message?.content || '';
      log(`[AI GenerateSimilarByTopic] ${provider} 返回内容长度: ${content.length}`);
    }

    // 提取JSON部分
    log(`[AI GenerateSimilarByTopic] 原始内容前200字符: ${content.substring(0, 200)}`);
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log(`[AI GenerateSimilarByTopic] 未找到JSON数组，内容: ${content.substring(0, 500)}`);
      throw new Error('AI返回格式不正确，未找到JSON数组');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      log(`[AI GenerateSimilarByTopic] JSON解析成功，题目数量: ${Array.isArray(parsed) ? parsed.length : '非数组'}`);
      if (!Array.isArray(parsed)) {
        throw new Error('AI返回的JSON不是数组');
      }
      return parsed;
    } catch (e: any) {
      log(`[AI GenerateSimilarByTopic] JSON解析失败: ${e.message}`);
      throw new Error(`JSON解析失败: ${e.message}`);
    }
  });

  if (!result.success) {
    console.error('AI generate similar questions by topic error:', result.error);
    return { success: false, error: result.error };
  }

  return { success: true, questions: result.data };
});

// AI 案例题小题讲解
ipcMain.handle('ai:explainCaseQuestion', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['modelspace', 'deepseek'];
  const isFollowUp = data.isFollowUp as boolean;
  const userMessage = data.userMessage as string || '';

  // 案例题讲解上下文存储（按 materialId_questionNumber 存储）
  const contextKey = `${data.materialTitle}_${data.questionNumber}`;

  // 获取或初始化对话上下文
  let messages: Array<{role: string; content: string}> = [];
  if (isFollowUp && caseChatContexts.has(contextKey)) {
    messages = [...caseChatContexts.get(contextKey)!];
  }

  // 如果是首次讲解，构建初始题目信息
  if (!isFollowUp) {
    const prompt = PROMPTS.explainCaseQuestion(
      data.materialTitle,
      data.materialContent,
      data.questionNumber,
      data.questionTitle,
      data.answer
    );
    messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  } else {
    // 追问模式：添加用户新问题
    messages.push({ role: 'user', content: userMessage });
  }

  const result = await callAIWithFallback(
    providerOrder,
    async (provider) => {
      log(`[AI] 开始调用厂商: ${provider}`);
      // 支持 DeepSeek 本地版
      if (provider === 'deepseekLocal') {
        const dsClient = getDeepSeekClient();
        if (!dsClient) {
          throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
        }
        log(`[AI] 使用 DeepSeek 本地版客户端`);

        // 转换消息格式为 DeepSeekMessage
        const dsMessages = messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

        let assistantContent = '';
        for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
          if (chunk.type === 'text' && chunk.content) {
            assistantContent += chunk.content;
            if (mainWindow) {
              mainWindow.webContents.send('ai:streamChunk', chunk.content);
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content || 'DeepSeek 聊天失败');
          }
        }

        // 保存对话上下文
        messages.push({ role: 'assistant', content: assistantContent });
        caseChatContexts.set(contextKey, messages);

        if (mainWindow) {
          mainWindow.webContents.send('ai:streamDone');
        }

        log(`[AI] DeepSeek 本地版调用成功`);
        return assistantContent;
      }

      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);
      log(`[AI] 使用模型: ${model}`);

      const stream = await client.chat.completions.create({
        model,
        messages: messages as any,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      });

      let assistantContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content && mainWindow) {
          assistantContent += content;
          mainWindow.webContents.send('ai:streamChunk', content);
        }
      }

      // 保存对话上下文
      messages.push({ role: 'assistant', content: assistantContent });
      caseChatContexts.set(contextKey, messages);

      if (mainWindow) {
        mainWindow.webContents.send('ai:streamDone');
      }

      log(`[AI] 厂商 ${provider} 调用成功`);
      return assistantContent;
    },
    (provider) => {
      log(`[AI Fallback] 切换到厂商: ${provider}`);
      if (mainWindow) {
        mainWindow.webContents.send('ai:providerSwitch', provider);
      }
    }
  );

  if (!result.success) {
    console.error('AI explain case question error:', result.error);
    if (mainWindow) {
      mainWindow.webContents.send('ai:streamError', result.error);
    }
    return { success: false, error: result.error };
  }

  return { success: true };
});

// 案例题 AI 讲解上下文存储
const caseChatContexts = new Map<string, Array<{role: string; content: string}>>();

// 英语阅读 AI 讲解上下文存储
const englishChatContexts = new Map<string, Array<{role: string; content: string}>>();

// 英语阅读：AI 讲解
ipcMain.handle('english:explainQuestion', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['modelspace', 'deepseek'];
  const isFollowUp = data.isFollowUp as boolean;
  const userMessage = data.userMessage as string || '';
  const contextKey = data._overrideContextKey || `${data.materialTitle}_${data.questionNumber}`;

  let messages: Array<{role: string; content: string}> = [];
  if (isFollowUp && englishChatContexts.has(contextKey)) {
    messages = [...englishChatContexts.get(contextKey)!];
  }

  if (data._overrideMessages && Array.isArray(data._overrideMessages)) {
    // 使用前端传入的自定义消息（如选中文本翻译解析）
    messages = [...data._overrideMessages];
  } else if (!isFollowUp) {
    const prompt = PROMPTS.explainEnglishQuestion(
      data.materialTitle,
      data.materialContent,
      data.questionNumber,
      data.questionTitle,
      data.options,
      data.answer
    );
    messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  const result = await callAIWithFallback(
    providerOrder,
    async (provider) => {
      log(`[AI] 开始调用厂商: ${provider}`);
      if (provider === 'deepseekLocal') {
        const dsClient = getDeepSeekClient();
        if (!dsClient) {
          throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
        }
        log(`[AI] 使用 DeepSeek 本地版客户端`);
        const dsMessages = messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));
        let assistantContent = '';
        for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
          if (chunk.type === 'text' && chunk.content) {
            assistantContent += chunk.content;
            if (mainWindow) {
              mainWindow.webContents.send('ai:streamChunk', chunk.content);
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content || 'DeepSeek 聊天失败');
          }
        }
        messages.push({ role: 'assistant', content: assistantContent });
        englishChatContexts.set(contextKey, messages);
        if (mainWindow) {
          mainWindow.webContents.send('ai:streamDone');
        }
        return assistantContent;
      }

      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);
      const stream = await client.chat.completions.create({
        model,
        messages: messages as any,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      });

      let assistantContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          assistantContent += content;
          if (mainWindow) {
            mainWindow.webContents.send('ai:streamChunk', content);
          }
        }
      }

      messages.push({ role: 'assistant', content: assistantContent });
      englishChatContexts.set(contextKey, messages);

      if (mainWindow) {
        mainWindow.webContents.send('ai:streamDone');
      }
      return assistantContent;
    }
  );

  if (!result.success) {
    if (mainWindow) {
      mainWindow.webContents.send('ai:streamError', result.error);
    }
    return { success: false, error: result.error };
  }

  return { success: true };
});

// ========== plan 表 IPC ==========
ipcMain.handle('plan:getAll', () => {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM plan ORDER BY top DESC, id DESC');
    return stmt.all();
  } catch (err) {
    console.error('plan:getAll error:', err);
    return [];
  }
});

ipcMain.handle('plan:getById', (_event, id: number) => {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM plan WHERE id = ?');
    return stmt.get(id);
  } catch (err) {
    console.error('plan:getById error:', err);
    return null;
  }
});

ipcMain.handle('plan:add', (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO plan (plan, date, status, plantype, type, subjectid, subjecttreeid, preplanid, planfinishtime, finishtime, top, todayPlan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.plan ?? null,
      data.date ?? null,
      data.status ?? null,
      data.plantype ?? null,
      data.type ?? null,
      data.subjectid ?? null,
      data.subjecttreeid ?? null,
      data.preplanid ?? null,
      data.planfinishtime ?? null,
      data.finishtime ?? null,
      data.top ?? 0,
      data.todayPlan ?? 0
    );
    return { id: result.lastInsertRowid, ...data };
  } catch (err) {
    console.error('plan:add error:', err);
    return null;
  }
});

ipcMain.handle('plan:update', (_event, id: number, data: any) => {
  if (!db) return false;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.plan !== undefined) { fields.push('plan = ?'); values.push(data.plan); }
    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.plantype !== undefined) { fields.push('plantype = ?'); values.push(data.plantype); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.subjectid !== undefined) { fields.push('subjectid = ?'); values.push(data.subjectid); }
    if (data.subjecttreeid !== undefined) { fields.push('subjecttreeid = ?'); values.push(data.subjecttreeid); }
    if (data.preplanid !== undefined) { fields.push('preplanid = ?'); values.push(data.preplanid); }
    if (data.planfinishtime !== undefined) { fields.push('planfinishtime = ?'); values.push(data.planfinishtime); }
    if (data.finishtime !== undefined) { fields.push('finishtime = ?'); values.push(data.finishtime); }
    if (data.top !== undefined) { fields.push('top = ?'); values.push(data.top); }
    if (data.todayPlan !== undefined) { fields.push('todayPlan = ?'); values.push(data.todayPlan); }
    if (fields.length === 0) return false;
    values.push(id);
    const stmt = db.prepare(`UPDATE plan SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (err) {
    console.error('plan:update error:', err);
    return false;
  }
});

ipcMain.handle('plan:getSubPlans', (_event, parentId: number) => {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM plan WHERE preplanid = ? ORDER BY id DESC');
    return stmt.all(parentId);
  } catch (err) {
    console.error('plan:getSubPlans error:', err);
    return [];
  }
});

ipcMain.handle('plan:delete', (_event, id: number) => {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM plan WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err) {
    console.error('plan:delete error:', err);
    return false;
  }
});

// ========== marquee 表 IPC ==========
ipcMain.handle('marquee:getAll', () => {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM marquee WHERE is_enabled = 1 ORDER BY sort_order, id');
    return stmt.all();
  } catch (err) {
    console.error('marquee:getAll error:', err);
    return [];
  }
});

ipcMain.handle('marquee:add', (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO marquee (text, sort_order, is_enabled)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.text, data.sort_order ?? 0, data.is_enabled ?? 1);
    return { id: result.lastInsertRowid, ...data };
  } catch (err) {
    console.error('marquee:add error:', err);
    return null;
  }
});

ipcMain.handle('marquee:update', (_event, id: number, data: any) => {
  if (!db) return false;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.text !== undefined) { fields.push('text = ?'); values.push(data.text); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (data.is_enabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.is_enabled); }
    if (fields.length === 0) return false;
    values.push(id);
    const stmt = db.prepare(`UPDATE marquee SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (err) {
    console.error('marquee:update error:', err);
    return false;
  }
});

ipcMain.handle('marquee:delete', (_event, id: number) => {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM marquee WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err) {
    console.error('marquee:delete error:', err);
    return false;
  }
});

// API 设置已改为前端本地存储，IPC 接口保留空实现以兼容旧代码
ipcMain.handle('db:getApiSettings', () => {
  return {};
});

ipcMain.handle('db:saveApiSettings', () => {
  return true;
});

// ========== 密码 (password) IPC ==========

ipcMain.handle('password:getList', (_event, params: any) => {
  if (!db) return { success: false, list: [], total: 0 };
  try {
    const { page = 1, pageNum = 10, conditions = {} } = params;
    const offset = (page - 1) * pageNum;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    if (conditions.url) {
      whereClause += ' AND url LIKE ?';
      queryParams.push(`%${conditions.url}%`);
    }
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM password ${whereClause}`);
    const countResult = countStmt.get(...queryParams) as { total: number };
    const total = countResult?.total || 0;
    const stmt = db.prepare(`SELECT * FROM password ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`);
    const list = stmt.all(...queryParams, pageNum, offset);
    return { success: true, list, total };
  } catch (err) {
    console.error('password:getList error:', err);
    return { success: false, list: [], total: 0, error: String(err) };
  }
});

ipcMain.handle('password:add', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('INSERT INTO password (url, account, password) VALUES (?, ?, ?)');
    const result = stmt.run(data.url, data.account, data.password);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error('password:add error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('password:update', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('UPDATE password SET url = ?, account = ?, password = ? WHERE id = ?');
    stmt.run(data.url, data.account, data.password, data.id);
    return { success: true };
  } catch (err) {
    console.error('password:update error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('password:delete', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('DELETE FROM password WHERE id = ?');
    stmt.run(id);
    return { success: true };
  } catch (err) {
    console.error('password:delete error:', err);
    return { success: false, error: String(err) };
  }
});

// ========== 提示词 (prompt) IPC ==========

ipcMain.handle('prompt:getList', (_event, params: any) => {
  if (!db) return { success: false, list: [], total: 0 };
  try {
    const { page = 1, pageNum = 10, conditions = {} } = params;
    const offset = (page - 1) * pageNum;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    if (conditions.title) {
      whereClause += ' AND title LIKE ?';
      queryParams.push(`%${conditions.title}%`);
    }
    if (conditions.content) {
      whereClause += ' OR content LIKE ?';
      queryParams.push(`%${conditions.content}%`);
    }
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM prompt ${whereClause}`);
    const countResult = countStmt.get(...queryParams) as { total: number };
    const total = countResult?.total || 0;
    const stmt = db.prepare(`SELECT * FROM prompt ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`);
    const list = stmt.all(...queryParams, pageNum, offset);
    return { success: true, list, total };
  } catch (err) {
    console.error('prompt:getList error:', err);
    return { success: false, list: [], total: 0, error: String(err) };
  }
});

ipcMain.handle('prompt:getDetail', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('SELECT * FROM prompt WHERE id = ?');
    const data = stmt.get(id);
    return { success: true, data };
  } catch (err) {
    console.error('prompt:getDetail error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('prompt:add', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('INSERT INTO prompt (title, content, type) VALUES (?, ?, ?)');
    const result = stmt.run(data.title, data.content, data.type || 1);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error('prompt:add error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('prompt:update', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('UPDATE prompt SET title = ?, content = ?, type = ? WHERE id = ?');
    stmt.run(data.title, data.content, data.type || 1, data.id);
    return { success: true };
  } catch (err) {
    console.error('prompt:update error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('prompt:delete', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('DELETE FROM prompt WHERE id = ?');
    stmt.run(id);
    return { success: true };
  } catch (err) {
    console.error('prompt:delete error:', err);
    return { success: false, error: String(err) };
  }
});

// ========== 副业项目 (commerce) IPC ==========

ipcMain.handle('commerce:getList', (_event, params: any) => {
  if (!db) return { success: false, list: [], total: 0 };
  try {
    const { page = 1, pageNum = 20, conditions = {} } = params;
    const offset = (page - 1) * pageNum;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    if (conditions.name) {
      whereClause += ' AND name LIKE ?';
      queryParams.push(`%${conditions.name}%`);
    }
    if (conditions.content) {
      whereClause += ' AND content LIKE ?';
      queryParams.push(`%${conditions.content}%`);
    }
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM commerce ${whereClause}`);
    const countResult = countStmt.get(...queryParams) as { total: number };
    const total = countResult?.total || 0;
    const stmt = db.prepare(`SELECT * FROM commerce ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`);
    const list = stmt.all(...queryParams, pageNum, offset);
    return { success: true, list, total };
  } catch (err) {
    console.error('commerce:getList error:', err);
    return { success: false, list: [], total: 0, error: String(err) };
  }
});

ipcMain.handle('commerce:getDetail', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('SELECT * FROM commerce WHERE id = ?');
    const data = stmt.get(id);
    return { success: true, data };
  } catch (err) {
    console.error('commerce:getDetail error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('commerce:add', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('INSERT INTO commerce (name, content, url, desc, status) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(data.name, data.content, data.url, data.desc, data.status);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error('commerce:add error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('commerce:update', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('UPDATE commerce SET name = ?, content = ?, url = ?, desc = ?, status = ? WHERE id = ?');
    stmt.run(data.name, data.content, data.url, data.desc, data.status, data.id);
    return { success: true };
  } catch (err) {
    console.error('commerce:update error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('commerce:delete', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('DELETE FROM commerce WHERE id = ?');
    stmt.run(id);
    return { success: true };
  } catch (err) {
    console.error('commerce:delete error:', err);
    return { success: false, error: String(err) };
  }
});

// ========== 项目 (project) IPC ==========

ipcMain.handle('project:get', (_event, params: any) => {
  if (!db) return { list: [], pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 } };
  try {
    const { page = 1, pageNum = 20, conditions = {}, orderBy } = params;
    const whereClauses: string[] = [];
    const values: any[] = [];

    if (conditions.project) {
      whereClauses.push('project LIKE ?');
      values.push(`%${conditions.project}%`);
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count total
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM project ${whereStr}`);
    const { total } = countStmt.get(...values) as any;

    // Order by
    let orderStr = 'ORDER BY id DESC';
    if (orderBy && orderBy.column) {
      const dir = orderBy.type === 'ASC' ? 'ASC' : 'DESC';
      orderStr = `ORDER BY ${orderBy.column} ${dir}`;
    }

    // Pagination
    const offset = (page - 1) * pageNum;
    const dataStmt = db.prepare(`SELECT * FROM project ${whereStr} ${orderStr} LIMIT ? OFFSET ?`);
    const list = dataStmt.all(...values, pageNum, offset);

    return {
      list,
      pagination: {
        total,
        current: page,
        pageNum,
        totalPages: Math.ceil(total / pageNum),
      },
    };
  } catch (err: any) {
    console.error('project:get error:', err);
    return { list: [], pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 } };
  }
});

ipcMain.handle('project:add', (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO project (project, content)
      VALUES (?, ?)
    `);
    const result = stmt.run(
      data.project || '',
      data.content || ''
    );
    return { id: result.lastInsertRowid, ...data };
  } catch (err: any) {
    console.error('project:add error:', err);
    return null;
  }
});

ipcMain.handle('project:update', (_event, id: number, data: any) => {
  if (!db) return false;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.project !== undefined) { fields.push('project = ?'); values.push(data.project); }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
    if (fields.length === 0) return false;
    values.push(id);
    const stmt = db.prepare(`UPDATE project SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (err: any) {
    console.error('project:update error:', err);
    return false;
  }
});

ipcMain.handle('project:delete', (_event, id: number) => {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM project WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err: any) {
    console.error('project:delete error:', err);
    return false;
  }
});

// ========== 年度月计划 (monthplan) IPC ==========

ipcMain.handle('monthplan:getByYear', (_event, year: number) => {
  if (!db) return { success: false, error: '数据库未初始化' };
  try {
    const stmt = db.prepare('SELECT * FROM monthplan WHERE CAST(year AS INTEGER) = CAST(? AS INTEGER) ORDER BY month, id');
    const list = stmt.all(year) as any[];
    return { success: true, list };
  } catch (err: any) {
    console.error('monthplan:getByYear error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('monthplan:add', (_event, data: any) => {
  if (!db) return { success: false, error: '数据库未初始化' };
  try {
    const stmt = db.prepare(`
      INSERT INTO monthplan (plan, month, year, status)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.plan,
      data.month,
      data.year,
      data.status ?? 0
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (err: any) {
    console.error('monthplan:add error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('monthplan:update', (_event, id: number, data: any) => {
  if (!db) return { success: false, error: '数据库未初始化' };
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.plan !== undefined) { fields.push('plan = ?'); values.push(data.plan); }
    if (data.month !== undefined) { fields.push('month = ?'); values.push(data.month); }
    if (data.year !== undefined) { fields.push('year = ?'); values.push(data.year); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (fields.length === 0) return { success: true };
    values.push(id);
    const stmt = db.prepare(`UPDATE monthplan SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return { success: true };
  } catch (err: any) {
    console.error('monthplan:update error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('monthplan:delete', (_event, id: number) => {
  if (!db) return { success: false, error: '数据库未初始化' };
  try {
    const stmt = db.prepare('DELETE FROM monthplan WHERE id = ?');
    stmt.run(id);
    return { success: true };
  } catch (err: any) {
    console.error('monthplan:delete error:', err);
    return { success: false, error: err.message };
  }
});

// ========== 征稿 (solicit) IPC ==========

ipcMain.handle('solicit:get', (_event, params: any) => {
  if (!db) return { list: [], total: 0 };
  try {
    const { page = 1, pageNum = 20, conditions = {}, orderBy } = params;
    const whereClauses: string[] = [];
    const values: any[] = [];

    if (conditions.type) {
      whereClauses.push('type = ?');
      values.push(conditions.type);
    }
    if (conditions.content) {
      whereClauses.push('content LIKE ?');
      values.push(`%${conditions.content}%`);
    }
    if (conditions.status) {
      whereClauses.push('status = ?');
      values.push(conditions.status);
    }
    if (conditions.startTime) {
      whereClauses.push('time >= ?');
      values.push(conditions.startTime);
    }
    if (conditions.endTime) {
      whereClauses.push('time <= ?');
      values.push(conditions.endTime);
    }
    if (conditions.expired === '1') {
      whereClauses.push("(time < date('now') OR time = '')");
    } else if (conditions.expired === '0') {
      whereClauses.push("time >= date('now')");
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count total
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM solicit ${whereStr}`);
    const { total } = countStmt.get(...values) as any;

    // Order by
    let orderStr = 'ORDER BY id DESC';
    if (orderBy && orderBy.column) {
      const dir = orderBy.type === 'ASC' ? 'ASC' : 'DESC';
      orderStr = `ORDER BY ${orderBy.column} ${dir}`;
    }

    // Pagination
    const offset = (page - 1) * pageNum;
    const dataStmt = db.prepare(`SELECT * FROM solicit ${whereStr} ${orderStr} LIMIT ? OFFSET ?`);
    const list = dataStmt.all(...values, pageNum, offset);

    return {
      list,
      pagination: {
        total,
        current: page,
        pageNum,
        totalPages: Math.ceil(total / pageNum),
      },
    };
  } catch (err: any) {
    console.error('solicit:get error:', err);
    return { list: [], total: 0 };
  }
});

ipcMain.handle('solicit:add', (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO solicit (content, time, url, type, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.content || '',
      data.time || '',
      data.url || '',
      data.type || '1',
      data.status || '3'
    );
    return { id: result.lastInsertRowid, ...data };
  } catch (err: any) {
    console.error('solicit:add error:', err);
    return null;
  }
});

ipcMain.handle('solicit:update', (_event, id: number, data: any) => {
  if (!db) return false;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
    if (data.time !== undefined) { fields.push('time = ?'); values.push(data.time); }
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (fields.length === 0) return false;
    values.push(id);
    const stmt = db.prepare(`UPDATE solicit SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (err: any) {
    console.error('solicit:update error:', err);
    return false;
  }
});

ipcMain.handle('solicit:delete', (_event, id: number) => {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM solicit WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err: any) {
    console.error('solicit:delete error:', err);
    return false;
  }
});

// ========== 收藏 (collect) IPC ==========

ipcMain.handle('collect:get', (_event, params: any) => {
  if (!db) return { list: [], pagination: { total: 0, current: 1, pageNum: 10, totalPages: 0 } };
  try {
    const { page = 1, pageNum = 50, conditions = {} } = params;
    const whereClauses: string[] = [];
    const values: any[] = [];

    if (conditions.title) {
      whereClauses.push('title LIKE ?');
      values.push(`%${conditions.title}%`);
    }
    if (conditions.url) {
      whereClauses.push('url LIKE ?');
      values.push(`%${conditions.url}%`);
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count total
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM collect ${whereStr}`);
    const { total } = countStmt.get(...values) as any;

    // Pagination
    const offset = (page - 1) * pageNum;
    const dataStmt = db.prepare(`SELECT * FROM collect ${whereStr} ORDER BY id DESC LIMIT ? OFFSET ?`);
    const list = dataStmt.all(...values, pageNum, offset);

    return {
      list,
      pagination: {
        total,
        current: page,
        pageNum,
        totalPages: Math.ceil(total / pageNum),
      },
    };
  } catch (err: any) {
    console.error('collect:get error:', err);
    return { list: [], pagination: { total: 0, current: 1, pageNum: 10, totalPages: 0 } };
  }
});

ipcMain.handle('collect:add', (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO collect (title, url, content)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      data.title || '',
      data.url || '',
      data.content || ''
    );
    return { id: result.lastInsertRowid, ...data };
  } catch (err: any) {
    console.error('collect:add error:', err);
    return null;
  }
});

ipcMain.handle('collect:delete', (_event, id: number) => {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM collect WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err: any) {
    console.error('collect:delete error:', err);
    return false;
  }
});

// 收藏：根据 URL 获取标题（通过 HTTP 请求抓取网页标题）
ipcMain.handle('collect:fetchUrlTitle', async (_event, url: string) => {
  try {
    const https = await import('https');
    const http = await import('http');
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => {
          const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) {
            resolve({ code: 200, result: { title: titleMatch[1].trim() } });
          } else {
            resolve({ code: 404, result: { title: '' } });
          }
        });
      });
      req.on('error', (err: any) => {
        console.error('fetchUrlTitle error:', err);
        resolve({ code: 500, result: { title: '' } });
      });
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ code: 500, result: { title: '' } });
      });
    });
  } catch (err: any) {
    console.error('collect:fetchUrlTitle error:', err);
    return { code: 500, result: { title: '' } };
  }
});

// 征稿 AI 解析：让大模型分析 URL 提取内容和截止时间
ipcMain.handle('solicit:aiParse', async (_event, url: string) => {
  const providerOrder = ['deepseekLocal', 'modelspace', 'deepseek'];

  const prompt = PROMPTS.solicitParse(url);

  const result = await callAIWithFallback(
    providerOrder,
    async (provider) => {
      log(`[AI SolicitParse] 使用厂商: ${provider}`);

      // 支持 DeepSeek 本地版
      if (provider === 'deepseekLocal') {
        const dsClient = getDeepSeekClient();
        if (!dsClient) {
          throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
        }

        const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
          { role: 'user', content: `${prompt.system}\n\n${prompt.user}` }
        ];

        let content = '';
        for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
          if (chunk.type === 'text' && chunk.content) {
            content += chunk.content;
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content || 'DeepSeek 聊天失败');
          }
        }
        return content.trim();
      }

      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        stream: false,
        temperature: 0.3,
        max_tokens: 1024,
      });

      return (response.choices[0]?.message?.content || '').trim();
    }
  );

  if (!result.success) {
    console.error('solicit:aiParse error:', result.error);
    return { success: false, error: result.error };
  }

  // 解析 AI 返回的 JSON
  try {
    const jsonMatch = result.data.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'AI 返回格式不正确，未找到 JSON' };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, data: { content: parsed.content || '', time: parsed.time || '' } };
  } catch (e: any) {
    return { success: false, error: `JSON 解析失败: ${e.message}` };
  }
});

// AI 提取段落关键词
ipcMain.handle('ai:extractKeywords', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['deepseekLocal', 'modelspace', 'deepseek'];
  const paragraph = data.paragraph as string;

  if (!paragraph || !paragraph.trim()) {
    return { success: false, error: '段落内容不能为空' };
  }

  const prompt = PROMPTS.extractKeywords(paragraph);

  const result = await callAIWithFallback(providerOrder, async (provider) => {
    log(`[AI ExtractKeywords] 使用厂商: ${provider}`);

    // 支持 DeepSeek 本地版
    if (provider === 'deepseekLocal') {
      const dsClient = getDeepSeekClient();
      if (!dsClient) {
        throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
      }

      const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `${prompt.system}\n\n${prompt.user}` }
      ];

      let content = '';
      for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
        if (chunk.type === 'text' && chunk.content) {
          content += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || 'DeepSeek 聊天失败');
        }
      }
      return content.trim();
    }

    const client = getOpenAIClient(provider);
    const model = getCurrentModel(provider);

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      stream: false,
      temperature: 0.5,
      max_tokens: 256,
    });

    return (response.choices[0]?.message?.content || '').trim();
  });

  if (!result.success) {
    console.error('AI extract keywords error:', result.error);
    return { success: false, error: result.error };
  }

  return { success: true, keywords: result.data };
});

// DeepSeek 本地版 Token 测试
ipcMain.handle('deepseekLocal:testToken', async (_event, token: string) => {
  try {
    // 使用 DeepSeekClient 直接测试 token
    const testClient = new DeepSeekClient({ token });
    const isValid = await testClient.checkTokenStatus();
    if (isValid) {
      // 测试成功，初始化客户端并保存 token
      initDeepSeekClient(token);
      setDeepSeekLocalToken(token);
      return { success: true };
    }
    return { success: false, error: 'Token 无效或已过期' };
  } catch (err: any) {
    console.error('DeepSeek 本地版测试失败:', err);
    return { success: false, error: err.message || '连接失败' };
  }
});

// ========== 笔记 (note) IPC ==========

ipcMain.handle('note:get', (_event, params: any) => {
  if (!db) return { list: [], pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 } };
  try {
    const { page = 1, pageNum = 20, conditions = {}, orderBy } = params;
    const whereClauses: string[] = [];
    const values: any[] = [];

    if (conditions.title) {
      whereClauses.push('title LIKE ?');
      values.push(`%${conditions.title}%`);
    }
    if (conditions.content) {
      whereClauses.push('note LIKE ?');
      values.push(`%${conditions.content}%`);
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count total
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM note ${whereStr}`);
    const { total } = countStmt.get(...values) as any;

    // Order by
    let orderStr = 'ORDER BY id DESC';
    if (orderBy && orderBy.column) {
      const dir = orderBy.type === 'ASC' ? 'ASC' : 'DESC';
      orderStr = `ORDER BY ${orderBy.column} ${dir}`;
    }

    // Pagination
    const offset = (page - 1) * pageNum;
    const dataStmt = db.prepare(`SELECT * FROM note ${whereStr} ${orderStr} LIMIT ? OFFSET ?`);
    const list = dataStmt.all(...values, pageNum, offset);

    return {
      list,
      pagination: {
        total,
        current: page,
        pageNum,
        totalPages: Math.ceil(total / pageNum),
      },
    };
  } catch (err: any) {
    console.error('note:get error:', err);
    return { list: [], pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 } };
  }
});

ipcMain.handle('note:getById', (_event, id: number) => {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM note WHERE id = ?');
    return stmt.get(id);
  } catch (err: any) {
    console.error('note:getById error:', err);
    return null;
  }
});

ipcMain.handle('note:add', (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO note (title, note, type)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      data.title || '',
      data.content || '',
      data.type || '学习笔记'
    );
    return { id: result.lastInsertRowid, ...data };
  } catch (err: any) {
    console.error('note:add error:', err);
    return null;
  }
});

ipcMain.handle('note:update', (_event, id: number, data: any) => {
  if (!db) return false;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { fields.push('note = ?'); values.push(data.content); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (fields.length === 0) return false;
    values.push(id);
    const stmt = db.prepare(`UPDATE note SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (err: any) {
    console.error('note:update error:', err);
    return false;
  }
});

ipcMain.handle('note:delete', (_event, id: number) => {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM note WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err: any) {
    console.error('note:delete error:', err);
    return false;
  }
});

// ========== Claude IPC ==========

ipcMain.handle('claude:get', (_event, params: any) => {
  if (!db) return { list: [], pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 } };
  try {
    const { page = 1, pageNum = 20, conditions = {}, orderBy } = params;
    const whereClauses: string[] = [];
    const values: any[] = [];

    if (conditions.url) {
      whereClauses.push('url LIKE ?');
      values.push(`%${conditions.url}%`);
    }
    if (conditions.token) {
      whereClauses.push('token LIKE ?');
      values.push(`%${conditions.token}%`);
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM claude ${whereStr}`);
    const { total } = countStmt.get(...values) as any;

    let orderStr = 'ORDER BY id DESC';
    if (orderBy && orderBy.column) {
      const dir = orderBy.type === 'ASC' ? 'ASC' : 'DESC';
      orderStr = `ORDER BY ${orderBy.column} ${dir}`;
    }

    const offset = (page - 1) * pageNum;
    const dataStmt = db.prepare(`SELECT * FROM claude ${whereStr} ${orderStr} LIMIT ? OFFSET ?`);
    const list = dataStmt.all(...values, pageNum, offset);

    return {
      list,
      pagination: {
        total,
        current: page,
        pageNum,
        totalPages: Math.ceil(total / pageNum),
      },
    };
  } catch (err: any) {
    console.error('claude:get error:', err);
    return { list: [], pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 } };
  }
});

ipcMain.handle('claude:add', (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO claude (url, token, remark)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      data.url || '',
      data.token || '',
      data.remark || ''
    );
    return { id: result.lastInsertRowid, ...data };
  } catch (err: any) {
    console.error('claude:add error:', err);
    return null;
  }
});

ipcMain.handle('claude:update', (_event, id: number, data: any) => {
  if (!db) return false;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
    if (data.token !== undefined) { fields.push('token = ?'); values.push(data.token); }
    if (data.remark !== undefined) { fields.push('remark = ?'); values.push(data.remark); }
    if (fields.length === 0) return false;
    values.push(id);
    const stmt = db.prepare(`UPDATE claude SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (err: any) {
    console.error('claude:update error:', err);
    return false;
  }
});

ipcMain.handle('claude:delete', (_event, id: number) => {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM claude WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err: any) {
    console.error('claude:delete error:', err);
    return false;
  }
});

ipcMain.handle('claude:switch', (_event, data: any) => {
  try {
    // 将配置保存到本地存储或返回成功
    return { success: true };
  } catch (err: any) {
    console.error('claude:switch error:', err);
    return { success: false, error: err.message };
  }
});

// ========== Token IPC ==========

ipcMain.handle('token:get', (_event, params: any) => {
  if (!db) return { list: [], pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 } };
  try {
    const { page = 1, pageNum = 20, conditions = {}, orderBy } = params;
    const whereClauses: string[] = [];
    const values: any[] = [];

    if (conditions.url) {
      whereClauses.push('url LIKE ?');
      values.push(`%${conditions.url}%`);
    }
    if (conditions.desc) {
      whereClauses.push('desc LIKE ?');
      values.push(`%${conditions.desc}%`);
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM token ${whereStr}`);
    const { total } = countStmt.get(...values) as any;

    let orderStr = 'ORDER BY id DESC';
    if (orderBy && orderBy.column) {
      const dir = orderBy.type === 'ASC' ? 'ASC' : 'DESC';
      orderStr = `ORDER BY ${orderBy.column} ${dir}`;
    }

    const offset = (page - 1) * pageNum;
    const dataStmt = db.prepare(`SELECT * FROM token ${whereStr} ${orderStr} LIMIT ? OFFSET ?`);
    const list = dataStmt.all(...values, pageNum, offset);

    return {
      list,
      pagination: {
        total,
        current: page,
        pageNum,
        totalPages: Math.ceil(total / pageNum),
      },
    };
  } catch (err: any) {
    console.error('token:get error:', err);
    return { list: [], pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 } };
  }
});

ipcMain.handle('token:add', (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO token (url, desc, token)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      data.url || '',
      data.desc || '',
      data.token || ''
    );
    return { id: result.lastInsertRowid, ...data };
  } catch (err: any) {
    console.error('token:add error:', err);
    return null;
  }
});

ipcMain.handle('token:update', (_event, id: number, data: any) => {
  if (!db) return false;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
    if (data.desc !== undefined) { fields.push('desc = ?'); values.push(data.desc); }
    if (data.token !== undefined) { fields.push('token = ?'); values.push(data.token); }
    if (fields.length === 0) return false;
    values.push(id);
    const stmt = db.prepare(`UPDATE token SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (err: any) {
    console.error('token:update error:', err);
    return false;
  }
});

ipcMain.handle('token:delete', (_event, id: number) => {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM token WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err: any) {
    console.error('token:delete error:', err);
    return false;
  }
});

// 书法图片 - 遍历本地目录
const HANDWRITING_DIR = 'D:\\\\书法图片';

ipcMain.handle('handwriting:get', async (_event, params: any) => {
  try {
    const { page = 1, pageNum = 20, keyword = '' } = params || {};

    if (!fs.existsSync(HANDWRITING_DIR)) {
      return { code: 200, result: { list: [], pagination: { total: 0, page, pageNum } } };
    }

    // 读取目录下所有图片文件
    const files = fs.readdirSync(HANDWRITING_DIR);
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    let images = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExts.includes(ext);
      })
      .map((file, index) => {
        const filePath = path.join(HANDWRITING_DIR, file);
        const stats = fs.statSync(filePath);
        // 读取文件为 base64
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(file).toLowerCase().replace('.', '');
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        const base64 = `data:image/${mimeType};base64,${buffer.toString('base64')}`;
        return {
          id: index + 1,
          name: path.basename(file, path.extname(file)),
          url: base64,
          size: stats.size,
        };
      });

    // 关键词过滤
    if (keyword) {
      images = images.filter((img) => img.name.includes(keyword));
    }

    const total = images.length;

    // 分页
    const start = (page - 1) * pageNum;
    const end = start + pageNum;
    const list = images.slice(start, end);

    return { code: 200, result: { list, pagination: { total, page, pageNum } } };
  } catch (err: any) {
    console.error('handwriting:get error:', err);
    return { code: 500, message: err.message };
  }
});

ipcMain.handle('handwriting:delete', async (_event, name: string) => {
  try {
    const filePath = path.join(HANDWRITING_DIR, name + '.png');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { code: 200 };
    }
    // 尝试查找其他扩展名
    const exts = ['.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    for (const ext of exts) {
      const p = path.join(HANDWRITING_DIR, name + ext);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        return { code: 200 };
      }
    }
    return { code: 404, message: '文件不存在' };
  } catch (err: any) {
    console.error('handwriting:delete error:', err);
    return { code: 500, message: err.message };
  }
});

// ==================== xinxi 学习信息 ====================
import { spawn } from 'child_process';

let crawlerStatus = {
  running: false,
  progress: 0,
  message: '',
  total_count: 0
};

// 启动爬虫（调用 Python 脚本）
ipcMain.handle('xinxi:startCrawler', async () => {
  if (crawlerStatus.running) {
    return { code: 200, message: '爬虫任务正在运行中', result: crawlerStatus };
  }

  crawlerStatus = { running: true, progress: 0, message: '开始爬取数据...', total_count: 0 };

  // 使用 app.getAppPath() 获取项目根目录，在开发和打包环境都适用
  const appPath = app.getAppPath();
  const isDev = !app.isPackaged;
  let scriptPath: string;
  
  if (isDev) {
    // 开发环境：脚本在 src/main/xinxi/ 下
    scriptPath = path.join(appPath, 'src', 'main', 'xinxi', 'xuexi_crawler.py');
  } else {
    // 生产环境：脚本在 resources/app.asar 外，或打包到 resources/ 下
    scriptPath = path.join(process.resourcesPath, 'app', 'src', 'main', 'xinxi', 'xuexi_crawler.py');
    // 如果上面的路径不存在，尝试另一个可能的路径
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(process.resourcesPath, 'src', 'main', 'xinxi', 'xuexi_crawler.py');
    }
  }

  log(`Crawler script path: ${scriptPath}`);
  log(`Script exists: ${fs.existsSync(scriptPath)}`);

  // 如果脚本不存在，返回错误
  if (!fs.existsSync(scriptPath)) {
    crawlerStatus.running = false;
    return { code: 500, message: '爬虫脚本不存在: ' + scriptPath };
  }

  // 获取数据库路径并传递给 Python 脚本
  const dbPath = getDbPath();
  const env = { ...process.env, ELECTRON_DB_PATH: dbPath };

  // 启动 Python 爬虫进程
  const pythonProcess = spawn('python', [scriptPath], {
    cwd: path.dirname(scriptPath),
    env
  });

  let output = '';
  pythonProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    console.log('Crawler stdout:', text);

    // 尝试解析进度信息
    const progressMatch = text.match(/进度:(\d+)/);
    if (progressMatch) {
      crawlerStatus.progress = parseInt(progressMatch[1]);
    }
    const countMatch = text.match(/共获取 (\d+) 条/);
    if (countMatch) {
      crawlerStatus.total_count = parseInt(countMatch[1]);
    }
    const msgMatch = text.match(/消息:(.+)/);
    if (msgMatch) {
      crawlerStatus.message = msgMatch[1].trim();
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.error('Crawler stderr:', text);
    // 将 stderr 的关键信息也更新到状态消息中
    if (text.includes('Error') || text.includes('error') || text.includes('出错')) {
      crawlerStatus.message = text.trim().substring(0, 200);
    }
  });

  pythonProcess.on('close', (code) => {
    crawlerStatus.running = false;
    crawlerStatus.progress = 100;
    crawlerStatus.message = `爬取完成，共获取 ${crawlerStatus.total_count} 条数据`;
    console.log(`Crawler process exited with code ${code}`);
  });

  pythonProcess.on('error', (err) => {
    crawlerStatus.running = false;
    crawlerStatus.message = `启动爬虫失败: ${err.message}`;
    console.error('Crawler process error:', err);
  });

  return { code: 200, message: '爬虫任务已启动', result: crawlerStatus };
});

// 获取爬虫状态
ipcMain.handle('xinxi:getStatus', async () => {
  return { code: 200, result: crawlerStatus };
});

// 查询 xinxi 表数据
ipcMain.handle('xinxi:getList', async (_event, params: any) => {
  if (!db) return { code: 500, message: '数据库未初始化' };
  try {
    const { page = 1, pageNum = 20, keyword = '' } = params || {};
    const offset = (page - 1) * pageNum;

    let whereClause = '1=1';
    const queryParams: any[] = [];

    if (keyword) {
      whereClause += ' AND (title LIKE ? OR mp_name LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM xinxi WHERE ${whereClause}`);
    const countResult = countStmt.get(...queryParams) as { total: number };
    const total = countResult?.total || 0;

    const listStmt = db.prepare(`
      SELECT * FROM xinxi
      WHERE ${whereClause}
      ORDER BY publish_time DESC
      LIMIT ? OFFSET ?
    `);
    const list = listStmt.all(...queryParams, pageNum, offset);

    return { code: 200, result: { list, pagination: { total, page, pageNum } } };
  } catch (err: any) {
    console.error('xinxi:getList error:', err);
    return { code: 500, message: err.message };
  }
});

// 清空 xinxi 表
ipcMain.handle('xinxi:clear', async () => {
  if (!db) return { code: 500, message: '数据库未初始化' };
  try {
    db.exec('DELETE FROM xinxi');
    db.exec("DELETE FROM sqlite_sequence WHERE name='xinxi'");
    return { code: 200, message: '数据表已清空' };
  } catch (err: any) {
    console.error('xinxi:clear error:', err);
    return { code: 500, message: err.message };
  }
});

// 添加单条 xinxi 数据（爬虫脚本调用）
ipcMain.handle('xinxi:add', async (_event, data: any) => {
  if (!db) return { code: 500, message: '数据库未初始化' };
  try {
    const stmt = db.prepare(`
      INSERT INTO xinxi (title, publish_time, mp_name, url, article_id, mp_id, pic_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.title || '',
      data.publish_time || null,
      data.mp_name || '',
      data.url || '',
      data.article_id || null,
      data.mp_id || null,
      data.pic_url || null,
      data.description || null
    );
    crawlerStatus.total_count += 1;
    return { code: 200, result: { id: result.lastInsertRowid } };
  } catch (err: any) {
    console.error('xinxi:add error:', err);
    return { code: 500, message: err.message };
  }
});

// 删除单条 xinxi 数据
ipcMain.handle('xinxi:delete', async (_event, id: number) => {
  if (!db) return { code: 500, message: '数据库未初始化' };
  try {
    const stmt = db.prepare('DELETE FROM xinxi WHERE id = ?');
    const result = stmt.run(id);
    return { code: 200, result: { changes: result.changes } };
  } catch (err: any) {
    console.error('xinxi:delete error:', err);
    return { code: 500, message: err.message };
  }
});

// ==================== wxaccount 微信公众号订阅 ====================

// 查询订阅列表
ipcMain.handle('wxaccount:get', async (_event, params: any) => {
  if (!db) return { code: 500, message: '数据库未初始化' };
  try {
    const { page = 1, pageNum = 10, keyword = '' } = params || {};
    const offset = (page - 1) * pageNum;

    let whereClause = '1=1';
    const queryParams: any[] = [];

    if (keyword) {
      whereClause += ' AND (mp_name LIKE ? OR mp_id LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM wxaccount WHERE ${whereClause}`);
    const countResult = countStmt.get(...queryParams) as { total: number };
    const total = countResult?.total || 0;

    const listStmt = db.prepare(`
      SELECT * FROM wxaccount
      WHERE ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    const list = listStmt.all(...queryParams, pageNum, offset);

    return { code: 200, result: { list, pagination: { total, page, pageNum } } };
  } catch (err: any) {
    console.error('wxaccount:get error:', err);
    return { code: 500, message: err.message };
  }
});

// 添加订阅
ipcMain.handle('wxaccount:add', async (_event, data: any) => {
  if (!db) return { code: 500, message: '数据库未初始化' };
  try {
    const stmt = db.prepare(`
      INSERT INTO wxaccount (mp_name, mp_id, mp_cover, mp_intro, faker_id, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.mp_name || '',
      data.mp_id || '',
      data.mp_cover || null,
      data.mp_intro || null,
      data.faker_id || null,
      data.status || 1
    );
    return { code: 200, result: { id: result.lastInsertRowid } };
  } catch (err: any) {
    console.error('wxaccount:add error:', err);
    return { code: 500, message: err.message };
  }
});

// 更新订阅
ipcMain.handle('wxaccount:update', async (_event, id: number, data: any) => {
  if (!db) return { code: 500, message: '数据库未初始化' };
  try {
    const stmt = db.prepare(`
      UPDATE wxaccount SET
        mp_name = ?,
        mp_id = ?,
        mp_cover = ?,
        mp_intro = ?,
        faker_id = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = stmt.run(
      data.mp_name || '',
      data.mp_id || '',
      data.mp_cover || null,
      data.mp_intro || null,
      data.faker_id || null,
      data.status || 1,
      id
    );
    return { code: 200, result: { changes: result.changes } };
  } catch (err: any) {
    console.error('wxaccount:update error:', err);
    return { code: 500, message: err.message };
  }
});

// 删除订阅
ipcMain.handle('wxaccount:delete', async (_event, id: number) => {
  if (!db) return { code: 500, message: '数据库未初始化' };
  try {
    const stmt = db.prepare('DELETE FROM wxaccount WHERE id = ?');
    const result = stmt.run(id);
    return { code: 200, result: { changes: result.changes } };
  } catch (err: any) {
    console.error('wxaccount:delete error:', err);
    return { code: 500, message: err.message };
  }
});

// 获取知识点列表（按科目）
ipcMain.handle('kp:getByDirectory', (_event, directoryId: number) => {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM knowledge_points WHERE directory_id = ? ORDER BY sort_order, id');
    return stmt.all(directoryId);
  } catch (err) {
    console.error('kp:getByDirectory error:', err);
    return [];
  }
});

// 根据ID获取单个知识点
ipcMain.handle('kp:getById', (_event, id: number) => {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM knowledge_points WHERE id = ?');
    return stmt.get(id) || null;
  } catch (err) {
    console.error('kp:getById error:', err);
    return null;
  }
});

// 添加知识点
ipcMain.handle('kp:add', (_event, data: { directory_id: number; parent_id?: number | null; name: string; sort_order?: number }) => {
  if (!db) return null;
  try {
    const stmt = db.prepare('INSERT INTO knowledge_points (directory_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)');
    const result = stmt.run(data.directory_id, data.parent_id || null, data.name, data.sort_order || 0);
    return { id: Number(result.lastInsertRowid), ...data };
  } catch (err) {
    console.error('kp:add error:', err);
    return null;
  }
});

// 删除知识点（同时删除下级知识点和关联题目）
ipcMain.handle('kp:delete', (_event, id: number) => {
  if (!db) return false;
  const dbInstance = db;
  try {
    // 递归获取所有下级知识点ID
    const getAllChildrenIds = (parentId: number): number[] => {
      const stmt = dbInstance.prepare('SELECT id FROM knowledge_points WHERE parent_id = ?');
      const children = stmt.all(parentId) as any[];
      let ids = children.map(c => c.id);
      for (const child of children) {
        ids = ids.concat(getAllChildrenIds(child.id));
      }
      return ids;
    };

    const allIds = [id, ...getAllChildrenIds(id)];

    // 删除关联题目
    const deleteQuestions = dbInstance.prepare('DELETE FROM questions WHERE knowledge_id = ?');
    for (const kpId of allIds) {
      deleteQuestions.run(kpId);
    }

    // 删除知识点（从叶子节点开始删，避免外键约束问题）
    const deleteKP = dbInstance.prepare('DELETE FROM knowledge_points WHERE id = ?');
    for (let i = allIds.length - 1; i >= 0; i--) {
      deleteKP.run(allIds[i]);
    }

    return true;
  } catch (err) {
    console.error('kp:delete error:', err);
    return false;
  }
});

// AI根据知识点生成题目
ipcMain.handle('ai:generateQuestionsByKnowledge', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['modelspace', 'deepseek'];
  const knowledgeName = data.knowledgeName as string;
  const count = data.count || 5;

  if (!knowledgeName) {
    return { success: false, error: '知识点名称不能为空' };
  }

  const systemPrompt = `你是一位考研数学出题专家。请根据给定的知识点，生成${count}道考研数学题目。
要求：
1. 题目必须严格围绕给定知识点
2. 包含单选题和多选题（question_type为"single"或"multiple"）
3. 题目难度适中，符合考研数学要求
4. 如有数学公式，使用LaTeX语法，行内公式用$...$，独立公式用$$...$$
5. 必须返回JSON数组格式，每个元素包含以下字段：
   - question_type: "single"或"multiple"
   - title: 题干内容
   - option_a: 选项A内容
   - option_b: 选项B内容
   - option_c: 选项C内容
   - option_d: 选项D内容
   - option_e: 选项E内容（如有）
   - correct_answer: 正确答案（多选用逗号分隔，如"A,C"）
   - explanation: 解析内容
6. 只返回JSON数组，不要返回其他内容`;

  const userPrompt = `请根据知识点"${knowledgeName}"生成${count}道考研数学题目。`;

  const result = await callAIWithFallback(providerOrder, async (provider) => {
    log(`[AI GenerateByKnowledge] 使用厂商: ${provider}, 知识点: ${knowledgeName}`);
    let content = '';

    if (provider === 'deepseekLocal') {
      const dsClient = getDeepSeekClient();
      if (!dsClient) {
        throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
      }

      const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
      ];

      for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
        if (chunk.type === 'text' && chunk.content) {
          content += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || 'DeepSeek 聊天失败');
        }
      }
    } else {
      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 4096,
      });

      content = response.choices[0]?.message?.content || '';
    }

    // 提取JSON部分
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('AI返回格式不正确，未找到JSON数组');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        throw new Error('AI返回的JSON不是数组');
      }
      return parsed;
    } catch (e: any) {
      throw new Error(`JSON解析失败: ${e.message}`);
    }
  });

  if (!result.success) {
    console.error('AI generate questions by knowledge error:', result.error);
    return { success: false, error: result.error };
  }

  return { success: true, questions: result.data };
});

// AI分类题目到知识点
ipcMain.handle('ai:classifyQuestion', async (_event, data: any) => {
  const providerOrder = (data.providerOrder as string[]) || ['modelspace', 'deepseek'];
  const questionTitle = data.questionTitle as string;
  const knowledgePoints = data.knowledgePoints as Array<{ id: number; name: string }>;

  if (!questionTitle || !knowledgePoints || knowledgePoints.length === 0) {
    return { success: false, error: '题目内容或知识点列表不能为空' };
  }

  const knowledgeListText = knowledgePoints.map(kp => `ID: ${kp.id}, 名称: ${kp.name}`).join('\n');

  const systemPrompt = `你是一位考研数学分类专家。请根据给定的题目内容，判断该题目最属于哪个知识点。

要求：
1. 仔细分析题目内容，判断其考查的核心知识点
2. 从给定的知识点列表中选择最匹配的一个
3. 必须返回JSON格式，包含以下字段：
   - knowledge_id: 匹配的知识点的ID（数字）
   - knowledge_name: 匹配的知识点的名称
   - confidence: 匹配置信度（0-1之间的小数）
   - reason: 分类理由（简要说明为什么属于这个知识点）
4. 只返回JSON对象，不要返回其他内容`;

  const userPrompt = `题目内容：
${questionTitle}

可选知识点列表：
${knowledgeListText}

请判断该题目最属于哪个知识点，返回JSON格式。`;

  const result = await callAIWithFallback(providerOrder, async (provider) => {
    log(`[AI Classify] 使用厂商: ${provider}`);
    let content = '';

    if (provider === 'deepseekLocal') {
      const dsClient = getDeepSeekClient();
      if (!dsClient) {
        throw new Error('DeepSeek 本地版客户端未初始化，请先设置 Token');
      }

      const dsMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
      ];

      for await (const chunk of dsClient.chatStream(dsMessages, 'deepseek-chat')) {
        if (chunk.type === 'text' && chunk.content) {
          content += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || 'DeepSeek 聊天失败');
        }
      }
    } else {
      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        temperature: 0.3,
        max_tokens: 1024,
      });

      content = response.choices[0]?.message?.content || '';
    }

    // 提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI返回格式不正确，未找到JSON对象');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.knowledge_id !== 'number') {
        throw new Error('AI返回的JSON中knowledge_id不是数字');
      }
      return parsed;
    } catch (e: any) {
      throw new Error(`JSON解析失败: ${e.message}`);
    }
  });

  if (!result.success) {
    console.error('AI classify question error:', result.error);
    return { success: false, error: result.error };
  }

  return { success: true, result: result.data };
});

// ========== 自媒体运营 (self-media) IPC ==========

// 选题管理
ipcMain.handle('sm:getTopics', (_event, params: any = {}) => {
  if (!db) return { success: false, list: [], total: 0 };
  try {
    const { page = 1, pageSize = 10, status, keyword } = params;
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    
    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }
    if (keyword) {
      whereClause += ' AND (title LIKE ? OR keywords LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM sm_topics ${whereClause}`);
    const countResult = countStmt.get(...queryParams) as { total: number };
    const total = countResult?.total || 0;
    
    const stmt = db.prepare(`SELECT * FROM sm_topics ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`);
    const list = stmt.all(...queryParams, pageSize, offset);
    
    return { success: true, list, total };
  } catch (err) {
    console.error('sm:getTopics error:', err);
    return { success: false, list: [], total: 0, error: String(err) };
  }
});

ipcMain.handle('sm:addTopic', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare(`
      INSERT INTO sm_topics (title, category, keywords, trend_score, selling_point, target_audience, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.title,
      data.category || 'AI编程',
      data.keywords ? JSON.stringify(data.keywords) : null,
      data.trend_score || 50,
      data.selling_point || null,
      data.target_audience || null,
      data.status || 'pending'
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error('sm:addTopic error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:updateTopic', (_event, id: number, data: any) => {
  if (!db) return { success: false };
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.keywords !== undefined) { fields.push('keywords = ?'); values.push(JSON.stringify(data.keywords)); }
    if (data.trend_score !== undefined) { fields.push('trend_score = ?'); values.push(data.trend_score); }
    if (data.selling_point !== undefined) { fields.push('selling_point = ?'); values.push(data.selling_point); }
    if (data.target_audience !== undefined) { fields.push('target_audience = ?'); values.push(data.target_audience); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE sm_topics SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return { success: true };
  } catch (err) {
    console.error('sm:updateTopic error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:deleteTopic', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    // 先删除关联的文案和图片
    db.prepare('DELETE FROM sm_images WHERE article_id IN (SELECT id FROM sm_articles WHERE topic_id = ?)').run(id);
    db.prepare('DELETE FROM sm_publish_records WHERE article_id IN (SELECT id FROM sm_articles WHERE topic_id = ?)').run(id);
    db.prepare('DELETE FROM sm_articles WHERE topic_id = ?').run(id);
    db.prepare('DELETE FROM sm_topics WHERE id = ?').run(id);
    return { success: true };
  } catch (err) {
    console.error('sm:deleteTopic error:', err);
    return { success: false, error: String(err) };
  }
});

// 文案管理
ipcMain.handle('sm:getArticles', (_event, params: any = {}) => {
  if (!db) return { success: false, list: [], total: 0 };
  try {
    const { page = 1, pageSize = 10, topic_id, status, keyword } = params;
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    
    if (topic_id) {
      whereClause += ' AND topic_id = ?';
      queryParams.push(topic_id);
    }
    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }
    if (keyword) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM sm_articles ${whereClause}`);
    const countResult = countStmt.get(...queryParams) as { total: number };
    const total = countResult?.total || 0;
    
    const stmt = db.prepare(`SELECT * FROM sm_articles ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`);
    const list = stmt.all(...queryParams, pageSize, offset);
    
    return { success: true, list, total };
  } catch (err) {
    console.error('sm:getArticles error:', err);
    return { success: false, list: [], total: 0, error: String(err) };
  }
});

ipcMain.handle('sm:getArticleById', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare('SELECT * FROM sm_articles WHERE id = ?');
    const article = stmt.get(id);
    return { success: true, data: article };
  } catch (err) {
    console.error('sm:getArticleById error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:addArticle', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare(`
      INSERT INTO sm_articles (topic_id, title, content, summary, word_count, platform_versions, status, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.topic_id || null,
      data.title,
      data.content,
      data.summary || null,
      data.word_count || 0,
      data.platform_versions ? JSON.stringify(data.platform_versions) : null,
      data.status || 'draft',
      1
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error('sm:addArticle error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:updateArticle', (_event, id: number, data: any) => {
  if (!db) return { success: false };
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
    if (data.summary !== undefined) { fields.push('summary = ?'); values.push(data.summary); }
    if (data.word_count !== undefined) { fields.push('word_count = ?'); values.push(data.word_count); }
    if (data.platform_versions !== undefined) { fields.push('platform_versions = ?'); values.push(JSON.stringify(data.platform_versions)); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.version !== undefined) { fields.push('version = ?'); values.push(data.version); }
    if (data.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(data.parent_id); }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE sm_articles SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return { success: true };
  } catch (err) {
    console.error('sm:updateArticle error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:deleteArticle', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    db.prepare('DELETE FROM sm_images WHERE article_id = ?').run(id);
    db.prepare('DELETE FROM sm_publish_records WHERE article_id = ?').run(id);
    db.prepare('DELETE FROM sm_articles WHERE id = ?').run(id);
    return { success: true };
  } catch (err) {
    console.error('sm:deleteArticle error:', err);
    return { success: false, error: String(err) };
  }
});

// 图片管理
ipcMain.handle('sm:getImages', (_event, articleId: number) => {
  if (!db) return { success: false, list: [] };
  try {
    const stmt = db.prepare('SELECT * FROM sm_images WHERE article_id = ? ORDER BY id');
    const list = stmt.all(articleId);
    return { success: true, list };
  } catch (err) {
    console.error('sm:getImages error:', err);
    return { success: false, list: [], error: String(err) };
  }
});

ipcMain.handle('sm:addImage', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare(`
      INSERT INTO sm_images (article_id, prompt, image_path, image_type, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.article_id,
      data.prompt || null,
      data.image_path || null,
      data.image_type || 'cover',
      data.status || 'pending'
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error('sm:addImage error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:deleteImage', (_event, id: number) => {
  if (!db) return { success: false };
  try {
    db.prepare('DELETE FROM sm_images WHERE id = ?').run(id);
    return { success: true };
  } catch (err) {
    console.error('sm:deleteImage error:', err);
    return { success: false, error: String(err) };
  }
});

// 发布记录
ipcMain.handle('sm:getPublishRecords', (_event, params: any = {}) => {
  if (!db) return { success: false, list: [], total: 0 };
  try {
    const { page = 1, pageSize = 10, article_id, platform } = params;
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    
    if (article_id) {
      whereClause += ' AND article_id = ?';
      queryParams.push(article_id);
    }
    if (platform) {
      whereClause += ' AND platform = ?';
      queryParams.push(platform);
    }
    
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM sm_publish_records ${whereClause}`);
    const countResult = countStmt.get(...queryParams) as { total: number };
    const total = countResult?.total || 0;
    
    const stmt = db.prepare(`SELECT * FROM sm_publish_records ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`);
    const list = stmt.all(...queryParams, pageSize, offset);
    
    return { success: true, list, total };
  } catch (err) {
    console.error('sm:getPublishRecords error:', err);
    return { success: false, list: [], total: 0, error: String(err) };
  }
});

ipcMain.handle('sm:addPublishRecord', (_event, data: any) => {
  if (!db) return { success: false };
  try {
    const stmt = db.prepare(`
      INSERT INTO sm_publish_records (article_id, platform, status, scheduled_at, platform_post_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.article_id,
      data.platform,
      data.status || 'scheduled',
      data.scheduled_at || null,
      data.platform_post_id || null
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error('sm:addPublishRecord error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:updatePublishRecord', (_event, id: number, data: any) => {
  if (!db) return { success: false };
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.published_at !== undefined) { fields.push('published_at = ?'); values.push(data.published_at); }
    if (data.platform_post_id !== undefined) { fields.push('platform_post_id = ?'); values.push(data.platform_post_id); }
    if (data.error_message !== undefined) { fields.push('error_message = ?'); values.push(data.error_message); }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE sm_publish_records SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return { success: true };
  } catch (err) {
    console.error('sm:updatePublishRecord error:', err);
    return { success: false, error: String(err) };
  }
});

// AI 生成接口
ipcMain.handle('sm:generateTopics', async (_event, category: string, count: number = 5) => {
  try {
    const { generateTopics } = await import('./llm');
    const topics = await generateTopics(category, count);
    return { success: true, data: topics };
  } catch (err) {
    console.error('sm:generateTopics error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:writeArticle', async (_event, topic: string, platform: string, wordCount: number = 1000) => {
  try {
    const { writeArticle } = await import('./llm');
    const article = await writeArticle(topic, platform, wordCount);
    return { success: true, data: article };
  } catch (err) {
    console.error('sm:writeArticle error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:rewriteArticle', async (_event, article: string, feedback: string) => {
  try {
    const { rewriteArticle } = await import('./llm');
    const result = await rewriteArticle(article, feedback);
    return { success: true, data: result };
  } catch (err) {
    console.error('sm:rewriteArticle error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:generateImagePrompt', async (_event, summary: string, imageType: string) => {
  try {
    const { generateImagePrompt } = await import('./llm');
    const prompt = await generateImagePrompt(summary, imageType);
    return { success: true, data: prompt };
  } catch (err) {
    console.error('sm:generateImagePrompt error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:extractKeyPoints', async (_event, article: string) => {
  try {
    const { extractKeyPoints } = await import('./llm');
    const points = await extractKeyPoints(article);
    return { success: true, data: points };
  } catch (err) {
    console.error('sm:extractKeyPoints error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('sm:optimizeForPlatform', async (_event, article: string, platform: string) => {
  try {
    const { optimizeForPlatform } = await import('./llm');
    const result = await optimizeForPlatform(article, platform);
    return { success: true, data: result };
  } catch (err) {
    console.error('sm:optimizeForPlatform error:', err);
    return { success: false, error: String(err) };
  }
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
    db = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

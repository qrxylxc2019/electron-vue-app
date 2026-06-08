import { app, BrowserWindow, ipcMain } from 'electron';
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
        parent_id INTEGER DEFAULT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES directories(id)
      )
    `);

    // ������Ŀ??
    db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        pid INTEGER DEFAULT NULL,
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
        FOREIGN KEY (pid) REFERENCES questions(id)
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
  ipcMain.handle('db:addDirectory', (_event, name: string, parentId: number | null = null) => {
    if (!db) return null;
    try {
      const stmt = db.prepare('INSERT INTO directories (name, parent_id) VALUES (?, ?)');
      const result = stmt.run(name, parentId);
      return { id: result.lastInsertRowid, name, parent_id: parentId };
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
        INSERT INTO questions (directory_id, pid, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, ai_explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        question.directory_id,
        question.pid || null,
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
    const stmt = db.prepare('SELECT * FROM monthplan WHERE year = ? ORDER BY month, id');
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

app.on('window-all-closed', () => {
  if (db) {
    db.close();
    db = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

// 获取数据库路�?
function getDbPath(): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    // 使用 __dirname 的上两级目录（dist/main -> 项目根目录）
    return path.join(__dirname, '..', '..', 'out', 'data', 'qingrui.db');
  }
  // 打包后使�?extraResources 中的数据
  return path.join(process.resourcesPath, 'data', 'qingrui.db');
}

// 初始化数据库
function initDatabase() {
  const dbPath = getDbPath();
  console.log('Database path:', dbPath);

  try {
    db = new Database(dbPath);

    // 创建目录�?
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

    // 创建题目�?
    db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_id INTEGER NOT NULL,
        question_type TEXT NOT NULL CHECK(question_type IN ('single', 'multiple', 'judge')),
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

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// IPC 处理
function setupIpc() {
  // 获取目录列表
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

  // 获取某目录下的题目列�?
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

  // 获取单个题目
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

  // 添加目录（方便测试）
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

  // 添加题目（方便测试）
  ipcMain.handle('db:addQuestion', (_event, question: any) => {
    if (!db) return null;
    try {
      const stmt = db.prepare(`
        INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        question.directory_id,
        question.question_type,
        question.title,
        question.option_a || null,
        question.option_b || null,
        question.option_c || null,
        question.option_d || null,
        question.option_e || null,
        question.correct_answer,
        question.explanation || null
      );
      return { id: result.lastInsertRowid, ...question };
    } catch (err) {
      console.error('addQuestion error:', err);
      return null;
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '..', '..', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
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
  initDatabase();
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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

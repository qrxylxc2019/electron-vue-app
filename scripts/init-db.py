import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'out', 'data', 'qingrui.db')
os.makedirs(os.path.dirname(db_path), exist_ok=True)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 创建目录表
cursor.execute('''
    CREATE TABLE IF NOT EXISTS directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES directories(id)
    )
''')

# 创建题目表
cursor.execute('''
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
''')

conn.commit()
conn.close()
print('数据库表创建成功！')

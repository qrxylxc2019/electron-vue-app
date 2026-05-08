import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'out', 'data', 'qingrui.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 由于 SQLite 不支持直接修改 CHECK 约束，需要重建表
# 1. 创建新表
cursor.execute('''
    CREATE TABLE questions_new (
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

# 2. 复制数据（旧数据清空后没有数据需要复制）
# cursor.execute('INSERT INTO questions_new SELECT * FROM questions')

# 3. 删除旧表
cursor.execute('DROP TABLE questions')

# 4. 重命名新表
cursor.execute('ALTER TABLE questions_new RENAME TO questions')

conn.commit()
print('数据库表结构已更新，支持 single、multiple、judge 类型')

conn.close()

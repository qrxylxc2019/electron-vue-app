import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'out', 'data', 'qingrui.db')
print(f'数据库路径: {db_path}')
print(f'数据库存在: {os.path.exists(db_path)}')

if not os.path.exists(db_path):
    print('数据库不存在!')
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 检查 directories 表
cursor.execute("SELECT id, name FROM directories")
dirs = cursor.fetchall()
print(f'\n目录表: {dirs}')

# 检查 articles 表
cursor.execute("SELECT COUNT(*) FROM articles")
count = cursor.fetchone()[0]
print(f'\narticles 表数量: {count}')

cursor.execute("SELECT id, directory_id, title FROM articles")
articles = cursor.fetchall()
print(f'articles 内容: {articles}')

# 检查 questions 表
cursor.execute("SELECT COUNT(*) FROM questions")
q_count = cursor.fetchone()[0]
print(f'\nquestions 表数量: {q_count}')

conn.close()

import sqlite3
import os

# 数据库路径
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'out', 'data', 'qingrui.db')
print(f'数据库路径: {db_path}')

if not os.path.exists(db_path):
    print(f'数据库文件不存在: {db_path}')
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 检查是否已有考研英语科目
cursor.execute("SELECT id FROM directories WHERE name = '考研英语'")
row = cursor.fetchone()

if row:
    print(f'考研英语科目已存在，ID: {row[0]}')
else:
    # 插入考研英语科目
    cursor.execute("INSERT INTO directories (name, sort_order) VALUES (?, ?)", ('考研英语', 2))
    conn.commit()
    new_id = cursor.lastrowid
    print(f'成功创建考研英语科目，ID: {new_id}')

# 验证所有科目
print('\n当前所有科目:')
cursor.execute("SELECT id, name, sort_order FROM directories ORDER BY sort_order, id")
for row in cursor.fetchall():
    print(f'  ID: {row[0]}, 名称: {row[1]}, 排序: {row[2]}')

conn.close()
print('\n完成!')

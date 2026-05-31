import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'out', 'data', 'qingrui.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 查询考研政治科目下的题目
cursor.execute("SELECT id, title, correct_answer FROM questions WHERE directory_id = (SELECT id FROM directories WHERE name = '考研政治') ORDER BY sort_order")
rows = cursor.fetchall()

print(f'考研政治科目共有 {len(rows)} 道题目:\n')
for row in rows:
    print(f'ID: {row[0]}')
    print(f'题目: {row[1]}')
    print(f'答案: {row[2]}')
    print('-' * 50)

conn.close()

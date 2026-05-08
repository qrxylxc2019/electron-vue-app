import sqlite3
import os
import re

db_path = os.path.join(os.path.dirname(__file__), '..', 'out', 'data', 'qingrui.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 清空现有数据
cursor.execute('DELETE FROM questions')
cursor.execute('DELETE FROM directories')
conn.commit()
print('已清空所有数据')

# 新增"高项"科目
cursor.execute('INSERT INTO directories (name, parent_id, sort_order) VALUES (?, ?, ?)', ('高项', None, 0))
directory_id = cursor.lastrowid
print(f'新增科目: 高项, ID: {directory_id}')

# 读取题目文件
questions_file = os.path.join(os.path.dirname(__file__), 'questions-data.txt')
with open(questions_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 解析题目
questions = []
pattern = r'\[(单选题|多选题)\]\n(.*?)\nA\.\s*(.*?)\nB\.\s*(.*?)\nC\.\s*(.*?)\nD\.\s*(.*?)\n(?:E\.\s*(.*?)\n)?答案:\s*([A-Z,]+)\n解析:\s*(.*?)\n---'
matches = re.findall(pattern, content, re.DOTALL)

for i, match in enumerate(matches, 1):
    q_type, title, opt_a, opt_b, opt_c, opt_d, opt_e, answer, explanation = match
    
    question_type = 'single' if q_type == '单选题' else 'multiple'
    
    questions.append({
        'directory_id': directory_id,
        'question_type': question_type,
        'title': title.strip(),
        'option_a': opt_a.strip(),
        'option_b': opt_b.strip(),
        'option_c': opt_c.strip(),
        'option_d': opt_d.strip(),
        'option_e': opt_e.strip() if opt_e else None,
        'correct_answer': answer.strip(),
        'explanation': explanation.strip(),
        'sort_order': i
    })

# 批量插入
insert_sql = '''
    INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
'''

for q in questions:
    cursor.execute(insert_sql, (
        q['directory_id'], q['question_type'], q['title'], q['option_a'], q['option_b'],
        q['option_c'], q['option_d'], q['option_e'], q['correct_answer'], q['explanation'], q['sort_order']
    ))

conn.commit()
print(f'已插入 {len(questions)} 道题目')

# 统计
cursor.execute('SELECT COUNT(*) FROM questions WHERE question_type = ?', ('single',))
single_count = cursor.fetchone()[0]
cursor.execute('SELECT COUNT(*) FROM questions WHERE question_type = ?', ('multiple',))
multiple_count = cursor.fetchone()[0]
print(f'单选题: {single_count} 道，多选题: {multiple_count} 道')

conn.close()
print('导入完成！')

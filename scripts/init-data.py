import sqlite3
import os
import random

db_path = os.path.join(os.path.dirname(__file__), '..', 'out', 'data', 'qingrui.db')
print(f'Database path: {db_path}')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 清空数据
cursor.execute('DELETE FROM questions')
cursor.execute('DELETE FROM directories')
conn.commit()
print('已清空所有数据')

# 新增"高项"科目
cursor.execute('INSERT INTO directories (name, parent_id, sort_order) VALUES (?, ?, ?)', ('高项', None, 0))
directory_id = cursor.lastrowid
print(f'新增科目: 高项, ID: {directory_id}')

# 生成200道题目（单选120道 + 多选80道）
questions = []

# 单选题（120道）
for i in range(1, 121):
    correct_index = random.randint(0, 3)  # 0-3
    correct_answer = chr(65 + correct_index)  # A, B, C, D
    
    questions.append({
        'directory_id': directory_id,
        'question_type': 'single',
        'title': f'单选题第{i}题：这是关于高项知识点的测试题目，请选择正确的答案。',
        'option_a': '选项A的内容',
        'option_b': '选项B的内容',
        'option_c': '选项C的内容',
        'option_d': '选项D的内容',
        'option_e': None,
        'correct_answer': correct_answer,
        'explanation': f'正确答案是{correct_answer}。这是一道单选题的解析说明。',
        'sort_order': i
    })

# 多选题（80道）
for i in range(1, 81):
    # 随机生成2-3个正确答案
    num_correct = random.randint(2, 3)
    indices = [0, 1, 2, 3]
    random.shuffle(indices)
    correct_indices = sorted(indices[:num_correct])
    correct_answer = ','.join(chr(65 + idx) for idx in correct_indices)
    
    questions.append({
        'directory_id': directory_id,
        'question_type': 'multiple',
        'title': f'多选题第{i}题：这是关于高项知识点的测试题目，请选择所有正确的答案（多选）。',
        'option_a': '选项A的内容',
        'option_b': '选项B的内容',
        'option_c': '选项C的内容',
        'option_d': '选项D的内容',
        'option_e': '选项E的内容' if i % 3 == 0 else None,
        'correct_answer': correct_answer,
        'explanation': f'正确答案是{correct_answer}。这是一道多选题的解析说明，需要选择所有正确选项。',
        'sort_order': 120 + i
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
print(f'已插入 {len(questions)} 道题目（单选120道，多选80道）')

# 验证
cursor.execute('SELECT COUNT(*) FROM questions WHERE question_type = ?', ('single',))
single_count = cursor.fetchone()[0]
cursor.execute('SELECT COUNT(*) FROM questions WHERE question_type = ?', ('multiple',))
multiple_count = cursor.fetchone()[0]
print(f'验证：单选题 {single_count} 道，多选题 {multiple_count} 道')

conn.close()
print('数据库初始化完成！')

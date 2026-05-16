import re
import sqlite3
import os

# 读取题目文件
txt_path = os.path.join(os.path.dirname(__file__), 'deepseek_txt_20260515_5e596c.txt')
with open(txt_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 解析题目
questions = []
# 按【第x题】分割
pattern = r'【第(\d+)题】\s*\n(.*?)(?=【第\d+题】|\Z)'
matches = re.findall(pattern, content, re.DOTALL)

for num_str, block in matches:
    num = int(num_str)
    lines = block.strip().split('\n')
    if not lines:
        continue

    # 第一行是题目内容
    title = lines[0].strip()

    # 找选项 A B C D E
    options = {'A': None, 'B': None, 'C': None, 'D': None, 'E': None}
    answer = None

    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        # 匹配选项行，如 "A. xxx" 或 "A xxx"
        opt_match = re.match(r'^([A-E])[\.．、\s]+(.+)$', line)
        if opt_match:
            opt_key = opt_match.group(1)
            opt_val = opt_match.group(2).strip()
            options[opt_key] = opt_val
        # 匹配答案行
        ans_match = re.search(r'参考答案[：:]\s*([A-E]+)', line)
        if ans_match:
            answer = ans_match.group(1)

    # 判断题型：单选或多选
    if answer and len(answer) > 1:
        qtype = 'multiple'
    else:
        qtype = 'single'

    questions.append({
        'num': num,
        'title': title,
        'type': qtype,
        'option_a': options['A'],
        'option_b': options['B'],
        'option_c': options['C'],
        'option_d': options['D'],
        'option_e': options['E'],
        'answer': answer,
    })

print(f"解析到 {len(questions)} 道题目")
for q in questions[:3]:
    print(f"  第{q['num']}题: {q['title'][:30]}... 答案:{q['answer']} 类型:{q['type']}")

# 插入数据库
db_path = os.path.join(os.path.dirname(__file__), '..', 'out', 'data', 'qingrui.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

directory_id = 1  # 高项

insert_sql = """
INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

inserted = 0
for q in questions:
    cursor.execute(insert_sql, (
        directory_id,
        q['type'],
        q['title'],
        q['option_a'],
        q['option_b'],
        q['option_c'],
        q['option_d'],
        q['option_e'],
        q['answer'],
        q['num']
    ))
    inserted += 1

conn.commit()
conn.close()

print(f"成功插入 {inserted} 道题目到 高项 (directory_id={directory_id})")

import sqlite3
import os

# 数据库路径
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'out', 'data', 'qingrui.db')
print(f'数据库路径: {db_path}')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 查询考研政治科目ID
cursor.execute("SELECT id FROM directories WHERE name = '考研政治'")
row = cursor.fetchone()

if not row:
    print('考研政治科目不存在，请先启动应用初始化数据库')
    conn.close()
    exit(1)

dir_id = row[0]
print(f'考研政治科目 ID: {dir_id}')

# 准备插入的题目数据
questions = [
    {
        'title': '马克思主义理论从狭义上说是（ ）',
        'question_type': 'single',
        'option_a': '无产阶级争取自身解放和整个人类解放的学说体系',
        'option_b': '关于无产阶级斗争的性质、目的和解放条件的学说',
        'option_c': '马克思和恩格斯创立的基本理论、基本观点和学说的体系',
        'option_d': '关于资本主义转化为社会主义以及社会主义和共产主义发展的普遍规律的学说',
        'option_e': None,
        'correct_answer': 'C',
        'explanation': '狭义上的马克思主义是指由马克思、恩格斯创立的关于无产阶级和人类解放的基本理论、基本观点和学说的体系。A、B、D选项虽然描述了马克思主义的部分内容或广义理解，但狭义上特指马克思和恩格斯的学说本身。'
    },
    {
        'title': '马克思主义生命力的根源在于（ ）',
        'question_type': 'single',
        'option_a': '它吸收和改造了人类一切优秀思想文化成果',
        'option_b': '它是完备而严密的科学理论体系',
        'option_c': '它是以实践为基础的科学性和革命性的统一',
        'option_d': '它是无产阶级争取解放的学说',
        'option_e': None,
        'correct_answer': 'C',
        'explanation': '马克思主义之所以具有强大的生命力，最根本的原因在于它是以实践为基础的科学性和革命性的统一。科学性是革命性的前提，革命性是科学性的必然要求，二者在实践基础上统一，使马克思主义能够不断发展和指导现实。'
    },
    {
        'title': '在马克思主义的组成部分中，构成整个马克思主义理论的基础，并提供科学世界观和方法论的是（ ）',
        'question_type': 'single',
        'option_a': '马克思主义哲学',
        'option_b': '马克思主义政治经济学',
        'option_c': '科学社会主义',
        'option_d': '马克思主义阶级斗争学说',
        'option_e': None,
        'correct_answer': 'A',
        'explanation': '马克思主义哲学是马克思主义全部学说的理论基础和世界观、方法论的根基。政治经济学是马克思主义理论最深刻、最全面的证明，科学社会主义是马克思主义理论体系的核心和归宿。哲学为其他部分提供了基本立场、观点和方法。'
    },
    {
        'title': '马克思主义首要的和基本的观点是（ ）',
        'question_type': 'single',
        'option_a': '阶级观点',
        'option_b': '群众观点',
        'option_c': '实践观点',
        'option_d': '发展观点',
        'option_e': None,
        'correct_answer': 'C',
        'explanation': '实践观点是马克思主义首要的和基本的观点。马克思在《关于费尔巴哈的提纲》中明确提出实践是检验真理的标准，并贯穿于辩证唯物主义和历史唯物主义之中。实践是认识的来源、动力、目的和检验标准，也是改造世界的根本途径。'
    },
    {
        'title': '马克思主义认为，人类社会发展的根本动力是（ ）',
        'question_type': 'single',
        'option_a': '社会基本矛盾',
        'option_b': '阶级斗争',
        'option_c': '科学技术进步',
        'option_d': '人民群众创造历史',
        'option_e': None,
        'correct_answer': 'A',
        'explanation': '社会基本矛盾即生产力与生产关系、经济基础与上层建筑之间的矛盾，是社会发展的根本动力。阶级斗争是阶级社会发展的直接动力，科技是重要推动力，人民群众是决定力量，但根本动力仍源于社会基本矛盾的运动。'
    }
]

# 插入题目
insert_sql = '''
    INSERT INTO questions (directory_id, question_type, title, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
'''

inserted_count = 0
for i, q in enumerate(questions):
    try:
        cursor.execute(insert_sql, (
            dir_id,
            q['question_type'],
            q['title'],
            q['option_a'],
            q['option_b'],
            q['option_c'],
            q['option_d'],
            q['option_e'],
            q['correct_answer'],
            q['explanation'],
            i
        ))
        inserted_count += 1
        print(f'已插入题目 {i+1}: {q["title"][:30]}...')
    except Exception as e:
        print(f'插入题目 {i+1} 失败: {e}')

conn.commit()
conn.close()

print(f'\n成功插入 {inserted_count} 道题目到 考研政治 科目')

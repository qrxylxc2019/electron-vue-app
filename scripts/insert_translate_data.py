import sqlite3
import os

# 数据库路径（根据实际项目结构调整）
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(project_root, 'out', 'data', 'qingrui.db')

print(f'使用数据库: {DB_PATH}')

# 题目数据
data = [
    {
        "content": "It was only after I started to write my first book that I discovered the pleasure of research — the pleasure of finding out things that no one else knew, of watching a story emerge from a mass of unrelated facts.",
        "answer": "直到我开始写第一本书，我才发现研究的乐趣——那种发现无人知晓的事情、看着一个故事从一堆不相关的事实中浮现出来的乐趣。"
    },
    {
        "content": "But the medical establishment is pressed to come up with a response, and individual doctors are looking for ways to apply the new findings to their own practices.",
        "answer": "但医学界被迫要拿出应对之策，而各个医生也在寻找方法将这些新发现应用到自己的诊疗实践中。"
    },
    {
        "content": "The journal Science is adding an extra round of statistical checks to its peer-review process, editor-in-chief Marcia McNutt announced today.",
        "answer": "《科学》杂志主编玛西娅·麦克纳特今天宣布，该杂志将在其同行评审流程中增加一轮额外的统计检查。"
    },
    {
        "content": "If we are serious about ensuring that our science is both meaningful and reproducible, we must ensure that our institutions are incentivizing the right sorts of things, said B. F. Skinner, a psychologist at the University of Minnesota.",
        "answer": "明尼苏达大学的心理学家B.F.斯金纳说，如果我们真的想确保我们的科学既有意义又可重复，就必须确保我们的机构在激励正确的事情。"
    },
    {
        "content": "But it is a real possibility that we might get the chance to see the Northern Lights, which would be an unforgettable experience.",
        "answer": "但我们确实有可能有机会看到北极光，那将是一次难忘的经历。"
    },
]

def main():
    if not os.path.exists(DB_PATH):
        print(f'错误: 数据库文件不存在: {DB_PATH}')
        print('请确认数据库路径正确，或先运行应用生成数据库。')
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 先检查表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='english_translate'")
    if not cursor.fetchone():
        print('错误: english_translate 表不存在，请先运行应用初始化数据库。')
        conn.close()
        return

    # 查找或创建 "英语翻译" 目录
    cursor.execute("SELECT id FROM directories WHERE name = ?", ('英语翻译',))
    row = cursor.fetchone()

    if row:
        dir_id = row[0]
        print(f'找到已有目录 "英语翻译", id={dir_id}')
    else:
        cursor.execute(
            "INSERT INTO directories (name, parent_id, sort_order) VALUES (?, NULL, 0)",
            ('英语翻译',)
        )
        dir_id = cursor.lastrowid
        print(f'创建新目录 "英语翻译", id={dir_id}')

    # 清空该目录下已有数据（可选，如需保留请注释掉）
    cursor.execute("DELETE FROM english_translate WHERE directory_id = ?", (dir_id,))
    deleted = cursor.rowcount
    if deleted > 0:
        print(f'清除了该目录下 {deleted} 条旧数据')

    # 插入数据
    inserted = 0
    for item in data:
        cursor.execute(
            "INSERT INTO english_translate (directory_id, content, answer) VALUES (?, ?, ?)",
            (dir_id, item['content'], item['answer'])
        )
        inserted += 1

    conn.commit()
    conn.close()

    print(f'成功插入 {inserted} 条翻译题目到 "英语翻译" 目录！')

if __name__ == '__main__':
    main()

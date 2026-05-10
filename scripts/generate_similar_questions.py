import json
import random

# 基于已有题目生成同类题
# 从已解析的题目中提取知识点，生成变体题目

output_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\similar_questions.json"

# 读取已有的题目作为基础
with open(r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\all_questions.json", "r", encoding="utf-8") as f:
    base_questions = json.load(f)

print(f"基础题库有 {len(base_questions)} 道题目")

# 定义一些常见的软考高项知识点和对应的题目模板
templates = [
    {
        "question": "在信息系统项目中，{topic}的主要目标是{goal}。",
        "options": [
            "确保项目按时完成",
            "确保项目符合质量标准",
            "确保项目成本可控",
            "确保项目范围明确"
        ],
        "answer": "B",
        "explanation": "{topic}是项目管理的重要组成部分，其核心目标是{goal}。"
    },
    {
        "question": "下列关于{topic}的描述，不正确的是（）。",
        "options": [
            "{topic}是项目管理的核心过程之一",
            "{topic}需要在项目全生命周期中持续进行",
            "{topic}只需要在项目启动阶段完成",
            "{topic}对项目成功至关重要"
        ],
        "answer": "C",
        "explanation": "{topic}是一个持续的过程，需要在项目全生命周期中不断进行，而不是只在启动阶段完成。"
    },
    {
        "question": "在{topic}过程中，项目经理需要重点关注（）。",
        "options": [
            "技术实现细节",
            "团队协作与沟通",
            "个人工作绩效",
            "办公环境优化"
        ],
        "answer": "B",
        "explanation": "在{topic}过程中，团队协作与沟通是项目经理需要重点关注的方面。"
    },
    {
        "question": "{topic}的输出不包括（）。",
        "options": [
            "项目管理计划更新",
            "项目文件更新",
            "组织过程资产更新",
            "项目章程"
        ],
        "answer": "D",
        "explanation": "项目章程是项目启动阶段的输出，不是{topic}的输出。"
    },
    {
        "question": "下列哪项不是{topic}的工具与技术（）。",
        "options": [
            "专家判断",
            "数据分析",
            "会议",
            "代码审查"
        ],
        "answer": "D",
        "explanation": "代码审查是软件开发过程中的技术活动，不是{topic}的管理工具与技术。"
    }
]

# 软考高项常见知识点
topics = [
    "项目整合管理", "项目范围管理", "项目进度管理", "项目成本管理",
    "项目质量管理", "项目资源管理", "项目沟通管理", "项目风险管理",
    "项目采购管理", "项目干系人管理", "项目变更管理", "配置管理",
    "信息系统安全管理", "信息系统工程", "软件工程", "数据工程",
    "云计算", "大数据", "人工智能", "物联网", "区块链",
    "数字化转型", "IT治理", "IT审计", "项目管理办公室(PMO)"
]

goals = [
    "确保项目各要素协调统一",
    "明确项目边界和可交付成果",
    "确保项目按时完成",
    "确保项目在预算内完成",
    "确保项目满足质量要求",
    "合理分配和使用项目资源",
    "确保信息及时准确传递",
    "识别和应对项目风险",
    "确保外部资源有效获取",
    "管理干系人期望和参与"
]

# 生成100道同类题
similar_questions = []
used_combinations = set()

q_num = 1
while len(similar_questions) < 100:
    # 随机选择模板和知识点
    template = random.choice(templates)
    topic = random.choice(topics)
    goal = random.choice(goals)
    
    # 确保不重复
    combo = (template["question"], topic)
    if combo in used_combinations:
        continue
    used_combinations.add(combo)
    
    # 生成题目
    question_text = template["question"].format(topic=topic, goal=goal)
    explanation = template["explanation"].format(topic=topic, goal=goal)
    
    # 随机打乱选项顺序（保持正确答案）
    options = template["options"].copy()
    correct_answer = template["answer"]
    
    # 记录正确答案的文本
    correct_text = options[ord(correct_answer) - ord('A')]
    
    # 打乱选项
    random.shuffle(options)
    
    # 找到新的正确答案字母
    new_answer = chr(options.index(correct_text) + ord('A'))
    
    similar_questions.append({
        "number": q_num,
        "question": question_text,
        "options": {
            "A": options[0],
            "B": options[1],
            "C": options[2],
            "D": options[3]
        },
        "answer": new_answer,
        "explanation": explanation
    })
    
    q_num += 1

print(f"\n成功生成 {len(similar_questions)} 道同类题")

# 打印前5道
for q in similar_questions[:5]:
    print(f"\n题号 {q['number']}: {q['question']}")
    print(f"  A. {q['options']['A']}")
    print(f"  B. {q['options']['B']}")
    print(f"  C. {q['options']['C']}")
    print(f"  D. {q['options']['D']}")
    print(f"  答案: {q['answer']}")

# 保存
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(similar_questions, f, ensure_ascii=False, indent=2)

print(f"\n同类题已保存到: {output_path}")

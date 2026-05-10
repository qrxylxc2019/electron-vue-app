import fitz
import re
import json

pdf_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\2025年环球网校-软考高级-模考密训卷-1（解析版）.pdf"

doc = fitz.open(pdf_path)
page_count = len(doc)
all_text = ""
for page in doc:
    all_text += page.get_text() + "\n"
doc.close()

print(f"PDF页数: {page_count}, 文本长度: {len(all_text)}")

# 保存文本查看
with open(r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\huanqiu_1_text.txt", "w", encoding="utf-8") as f:
    f.write(all_text)

# 解析题目 - 环球网校格式
# 格式: 数字.题干\nA.选项\nB.选项\nC.选项\nD.选项\n参考答案：X\n题目解析：解析内容

questions = []

# 使用逐行解析
lines = all_text.split('\n')

i = 0
while i < len(lines):
    line = lines[i].strip()
    
    # 匹配题号行: "1.题干内容" 或 "1.题干内容()。"
    q_match = re.match(r'^(\d+)[\.、]\s*(.+)', line)
    
    if q_match:
        q_num = int(q_match.group(1))
        question_text = q_match.group(2).strip()
        
        # 收集题干（可能跨多行，直到选项A）
        i += 1
        while i < len(lines):
            next_line = lines[i].strip()
            # 如果遇到选项A，停止收集题干
            if re.match(r'^A\s*[\.．]', next_line):
                break
            # 如果遇到新的题号，停止
            if re.match(r'^\d+[\.、]', next_line):
                break
            # 如果遇到参考答案，停止
            if '参考答案' in next_line:
                break
            if next_line:
                question_text += next_line
            i += 1
        
        # 现在i指向选项A或已经越界
        if i >= len(lines):
            break
            
        # 检查是否是选项A
        opt_a_match = re.match(r'^A\s*[\.．]\s*(.+)', lines[i].strip())
        if not opt_a_match:
            continue
            
        option_a = opt_a_match.group(1).strip()
        
        # 读取选项B
        i += 1
        if i >= len(lines):
            continue
        opt_b_match = re.match(r'^B\s*[\.．]\s*(.+)', lines[i].strip())
        if not opt_b_match:
            continue
        option_b = opt_b_match.group(1).strip()
        
        # 读取选项C
        i += 1
        if i >= len(lines):
            continue
        opt_c_match = re.match(r'^C\s*[\.．]\s*(.+)', lines[i].strip())
        if not opt_c_match:
            continue
        option_c = opt_c_match.group(1).strip()
        
        # 读取选项D
        i += 1
        if i >= len(lines):
            continue
        opt_d_match = re.match(r'^D\s*[\.．]\s*(.+)', lines[i].strip())
        if not opt_d_match:
            continue
        option_d = opt_d_match.group(1).strip()
        
        # 读取参考答案
        i += 1
        answer = None
        while i < len(lines):
            if '参考答案' in lines[i]:
                ans_match = re.search(r'参考答案[：:]\s*([A-D])', lines[i])
                if ans_match:
                    answer = ans_match.group(1)
                break
            i += 1
        
        if not answer:
            continue
        
        # 读取解析
        i += 1
        explanation = ""
        if i < len(lines) and '题目解析' in lines[i]:
            exp_match = re.match(r'题目解析[：:]\s*(.*)', lines[i])
            if exp_match:
                explanation = exp_match.group(1).strip()
            i += 1
            # 继续读取解析内容（可能跨多行）
            while i < len(lines):
                next_line = lines[i].strip()
                # 如果遇到新题号，停止
                if re.match(r'^\d+[\.、]', next_line):
                    break
                # 如果遇到页眉，停止
                if '环球网校' in next_line and '密训卷' in next_line:
                    break
                if next_line:
                    explanation += next_line
                i += 1
        
        # 清理题干
        question_text = re.sub(r'\s+', ' ', question_text).strip()
        # 移除题干末尾的括号
        question_text = re.sub(r'[（(]\s*[)）]\s*$', '', question_text).strip()
        
        if not question_text or len(question_text) < 3:
            continue
        
        questions.append({
            'number': q_num,
            'question': question_text,
            'options': {
                'A': option_a,
                'B': option_b,
                'C': option_c,
                'D': option_d
            },
            'answer': answer,
            'explanation': explanation
        })
    else:
        i += 1

print(f"\n成功解析出 {len(questions)} 道选择题")

# 打印前5道
for q in questions[:5]:
    print(f"\n题号 {q['number']}: {q['question'][:60]}...")
    print(f"  A. {q['options']['A']}")
    print(f"  B. {q['options']['B']}")
    print(f"  C. {q['options']['C']}")
    print(f"  D. {q['options']['D']}")
    print(f"  答案: {q['answer']}")

# 保存
output_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\huanqiu_1_questions.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"\n题目已保存到: {output_path}")

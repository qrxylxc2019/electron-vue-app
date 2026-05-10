import fitz
import re
import json

pdf_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\2025年东方瑞通-软考高项-考前模拟卷（解析版）.pdf"

doc = fitz.open(pdf_path)
page_count = len(doc)
all_text = ""
for page in doc:
    all_text += page.get_text() + "\n"
doc.close()

print(f"PDF页数: {page_count}, 文本长度: {len(all_text)}")

# 保存文本查看
with open(r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\dongfang_text.txt", "w", encoding="utf-8") as f:
    f.write(all_text)

# 东方瑞通格式解析
# 格式多样：
# "1.题干\nA、选项1B、选项2C、选项3D、选项4\n参考答案：X\n解析：..."
# "2、题干()。\nA、选项\nB、选项\n参考答案：X\n解析：..."
# "3.题干\nA.选项 B.选项 C.选项 D.选项\n答案：X\n解析：..."

questions = []
lines = all_text.split('\n')

i = 0
while i < len(lines):
    line = lines[i].strip()
    
    # 匹配题号行
    q_match = re.match(r'^(\d+)[\.、]\s*(.*)', line)
    if not q_match:
        i += 1
        continue
    
    q_num = int(q_match.group(1))
    question_text = q_match.group(2).strip()
    
    # 收集题干（可能跨行）
    i += 1
    while i < len(lines):
        next_line = lines[i].strip()
        # 如果遇到选项开头，停止
        if re.match(r'^[A-D][\.．、]\s*', next_line):
            break
        # 如果遇到新题号，停止
        if re.match(r'^\d+[\.、]', next_line):
            break
        # 如果遇到参考答案，停止
        if re.search(r'参考答案?[：:]', next_line):
            break
        if next_line:
            question_text += next_line
        i += 1
    
    # 解析选项 - 东方瑞通的选项可能在同一行
    options = {}
    
    # 检查当前行是否是选项
    if i < len(lines):
        opt_line = lines[i].strip()
        # 尝试匹配 "A、xxxB、xxxC、xxxD、xxx" 格式
        combined_match = re.match(r'^A[、\.．]\s*(.+?)B[、\.．]\s*(.+?)C[、\.．]\s*(.+?)D[、\.．]\s*(.+)$', opt_line)
        if combined_match:
            options['A'] = combined_match.group(1).strip()
            options['B'] = combined_match.group(2).strip()
            options['C'] = combined_match.group(3).strip()
            options['D'] = combined_match.group(4).strip()
            i += 1
        else:
            # 逐行读取选项
            for opt_letter in ['A', 'B', 'C', 'D']:
                if i >= len(lines):
                    break
                opt_match = re.match(rf'^[{opt_letter}][、\.．]\s*(.*)', lines[i].strip())
                if opt_match:
                    options[opt_letter] = opt_match.group(1).strip()
                    i += 1
    
    if len(options) < 4:
        i += 1
        continue
    
    # 读取参考答案
    answer = None
    while i < len(lines):
        line_text = lines[i].strip()
        if re.search(r'参考答案?[：:]\s*([A-D])', line_text):
            ans_match = re.search(r'参考答案?[：:]\s*([A-D])', line_text)
            answer = ans_match.group(1)
            i += 1
            break
        # 如果当前行不是答案行但包含答案格式
        if '答案' in line_text and not line_text.startswith('解析'):
            ans_match = re.search(r'[：:]\s*([A-D])', line_text)
            if ans_match:
                answer = ans_match.group(1)
                i += 1
                break
        i += 1
        # 防止无限循环
        if i > len(lines) - 1:
            break
    
    if not answer:
        continue
    
    # 读取解析
    explanation = ""
    while i < len(lines):
        line_text = lines[i].strip()
        # 如果遇到新题号，停止
        if re.match(r'^\d+[\.、]', line_text):
            break
        # 如果遇到页眉
        if '东方瑞通' in line_text and '模拟卷' in line_text:
            break
        # 如果遇到"关键技术"表格等，停止
        if '关键技术' in line_text or '要点' in line_text:
            break
        if '解析' in line_text or '本题考查' in line_text or '必须会' in line_text:
            exp_match = re.match(r'解析[：:]\s*(.*)', line_text)
            if exp_match:
                explanation = exp_match.group(1).strip()
            else:
                explanation = line_text
            i += 1
            # 继续读取解析内容
            while i < len(lines):
                next_line = lines[i].strip()
                if re.match(r'^\d+[\.、]', next_line):
                    break
                if '东方瑞通' in next_line and '模拟卷' in next_line:
                    break
                if next_line and not next_line.startswith('关键技术') and not next_line.startswith('要点'):
                    explanation += next_line
                i += 1
            break
        i += 1
    
    # 清理题干
    question_text = re.sub(r'\s+', ' ', question_text).strip()
    question_text = re.sub(r'[（(]\s*[)）]\s*$', '', question_text).strip()
    
    if not question_text or len(question_text) < 3:
        continue
    
    questions.append({
        'number': q_num,
        'question': question_text,
        'options': options,
        'answer': answer,
        'explanation': explanation
    })

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
output_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\dongfang_questions.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"\n题目已保存到: {output_path}")

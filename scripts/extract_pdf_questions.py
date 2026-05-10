import fitz  # PyMuPDF
import re
import os
import json

pdf_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\2025高项模拟试卷一（含章节点答案解析）.pdf"

doc = fitz.open(pdf_path)
page_count = len(doc)

all_text = ""
for page_num in range(page_count):
    page = doc[page_num]
    all_text += page.get_text() + "\n"

doc.close()

print("=" * 80)
print("PDF总页数:", page_count)
print("提取文本长度:", len(all_text))
print("=" * 80)

# 清理文本：移除页眉页脚等干扰内容
cleaned_text = re.sub(r'2025 年5 月信息系统项目管理师模考卷一仅供内部学员使用禁止传阅\s*\d+', '', all_text)
cleaned_text = re.sub(r'仅供内部学员使用\s*禁\s*阅\s*止传阅', '', cleaned_text)
cleaned_text = re.sub(r'仅供内部学员使用 禁止传阅', '', cleaned_text)
cleaned_text = re.sub(r'仅供内', '', cleaned_text)
cleaned_text = re.sub(r'仅供', '', cleaned_text)
cleaned_text = re.sub(r'部学员使用 禁止传阅', '', cleaned_text)

# 保存清理后的文本
with open(r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\pdf_cleaned_text.txt", "w", encoding="utf-8") as f:
    f.write(cleaned_text)

print("清理后文本已保存到 pdf_cleaned_text.txt")

# 解析选择题 - 使用更精确的正则匹配
questions = []

# 按 "●" 分割成题目块
blocks = re.split(r'(?=●)', cleaned_text)

print(f"按 ● 分割出 {len(blocks)} 个块")

for block in blocks:
    if '【参考答案' not in block:
        continue
    
    # 提取题号
    q_num_match = re.search(r'（(\d+)）', block)
    if not q_num_match:
        continue
    q_num = int(q_num_match.group(1))
    
    # 提取答案
    answer_match = re.search(r'【参考答案】?\s*([A-D])', block)
    if not answer_match:
        continue
    answer = answer_match.group(1)
    
    # 提取解析 - 从【解析】到下一个章：或 ● 或结束
    explanation = ""
    exp_match = re.search(r'【解析】\s*(.*?)(?=章：|●|$)', block, re.DOTALL)
    if exp_match:
        explanation = exp_match.group(1).strip()
        # 清理解析中的多余空格
        explanation = re.sub(r'\s+', ' ', explanation)
    
    # 提取选项 - 使用正则匹配 A. B. C. D.
    options = {}
    
    # 找到选项区域（题号后到参考答案前）
    opt_area = block.split('【参考答案')[0]
    
    # 匹配每个选项
    for letter in ['A', 'B', 'C', 'D']:
        # 支持 A. xxx 或 A．xxx 格式，选项内容可以跨行
        pattern = rf'{letter}\s*[\.．]\s*([^\n]+(?:\n(?![A-D]\s*[\.．])[^\n]+)*)'
        match = re.search(pattern, opt_area)
        if match:
            opt_text = match.group(1).strip()
            # 清理选项文本
            opt_text = re.sub(r'\s+', ' ', opt_text)
            options[letter] = opt_text
    
    if len(options) < 4:
        continue
    
    # 提取题干 - 在 ● 之后，选项A之前
    # 找到 ● 后面的内容
    content = block.split('●', 1)[-1] if '●' in block else block
    
    # 找到选项A的位置
    opt_a_pos = len(content)
    for pattern in [r'A\s*\.\s*', r'A\s*．\s*']:
        match = re.search(pattern, content)
        if match:
            pos = match.start()
            if pos < opt_a_pos:
                opt_a_pos = pos
    
    if opt_a_pos == len(content):
        continue
    
    # 提取题干文本
    question_text = content[:opt_a_pos].strip()
    
    # 移除题号
    question_text = re.sub(r'（\d+）', '', question_text).strip()
    
    # 清理题干中的多余空格和换行
    question_text = re.sub(r'\s+', ' ', question_text)
    
    # 移除可能混入的选项内容
    # 如果题干以 A. B. C. D. 开头的内容结尾，需要截断
    for letter in ['A', 'B', 'C', 'D']:
        idx = question_text.rfind(f' {letter}.')
        if idx == -1:
            idx = question_text.rfind(f'{letter}.')
        if idx > len(question_text) * 0.5:  # 只在后半部分查找
            question_text = question_text[:idx].strip()
    
    if not question_text or len(question_text) < 5:
        continue
    
    questions.append({
        'number': q_num,
        'question': question_text,
        'options': options,
        'answer': answer,
        'explanation': explanation
    })

# 按题号排序并去重
seen = set()
unique_questions = []
for q in sorted(questions, key=lambda x: x['number']):
    if q['number'] not in seen:
        seen.add(q['number'])
        unique_questions.append(q)

questions = unique_questions

print(f"\n成功解析出 {len(questions)} 道选择题")

# 打印前几道题看看
for q in questions[:5]:
    print(f"\n{'='*60}")
    print(f"题号: {q['number']}")
    print(f"题干: {q['question'][:120]}...")
    print(f"选项A: {q['options']['A']}")
    print(f"选项B: {q['options']['B']}")
    print(f"选项C: {q['options']['C']}")
    print(f"选项D: {q['options']['D']}")
    print(f"答案: {q['answer']}")
    print(f"解析: {q['explanation'][:80]}...")

# 保存为JSON
with open(r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\questions.json", "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"\n题目已保存到 questions.json")

import fitz  # PyMuPDF
import re
import os
import json

pdf_dir = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目"

# 获取所有PDF文件
pdf_files = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]
pdf_files.sort()

print(f"找到 {len(pdf_files)} 个PDF文件:")
for f in pdf_files:
    print(f"  - {f}")
print()

all_questions = []

for pdf_file in pdf_files:
    pdf_path = os.path.join(pdf_dir, pdf_file)
    print(f"\n{'='*60}")
    print(f"正在处理: {pdf_file}")
    print(f"{'='*60}")
    
    try:
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        
        all_text = ""
        for page_num in range(page_count):
            page = doc[page_num]
            all_text += page.get_text() + "\n"
        
        doc.close()
        
        print(f"PDF页数: {page_count}, 文本长度: {len(all_text)}")
        
        # 如果文本长度太短，可能是扫描版PDF，需要OCR
        if len(all_text) < 100:
            print(f"警告: {pdf_file} 提取的文本太少({len(all_text)}字符)，可能是扫描版PDF，跳过")
            continue
        
        # 清理文本
        cleaned_text = all_text
        # 移除常见页眉页脚
        cleaned_text = re.sub(r'2025\s*年\s*\d*\s*月\s*信息系统项目管理师.*?禁止传阅\s*\d+', '', cleaned_text)
        cleaned_text = re.sub(r'仅供内部学员使用\s*禁\s*阅\s*止传阅', '', cleaned_text)
        cleaned_text = re.sub(r'仅供内部学员使用\s*禁止传阅', '', cleaned_text)
        cleaned_text = re.sub(r'仅供内', '', cleaned_text)
        cleaned_text = re.sub(r'仅供', '', cleaned_text)
        cleaned_text = re.sub(r'部学员使用\s*禁止传阅', '', cleaned_text)
        cleaned_text = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned_text)
        
        # 判断PDF格式类型
        # 类型1: 有●标记，【参考答案】格式 (如模拟试卷一/二)
        # 类型2: 无●标记，"参考答案："格式，题号直接是 "1." (如环球网校)
        
        questions = []
        
        if '●' in cleaned_text and '【参考答案】' in cleaned_text:
            # 类型1: 按 "●" 分割
            blocks = re.split(r'(?=●)', cleaned_text)
            
            for block in blocks:
                if '【参考答案' not in block:
                    continue
                
                q_num_match = re.search(r'（(\d+)）', block)
                if not q_num_match:
                    continue
                q_num = int(q_num_match.group(1))
                
                answer_match = re.search(r'【参考答案】?\s*([A-D])', block)
                if not answer_match:
                    continue
                answer = answer_match.group(1)
                
                explanation = ""
                exp_match = re.search(r'【解析】\s*(.*?)(?=章：|●|$)', block, re.DOTALL)
                if exp_match:
                    explanation = exp_match.group(1).strip()
                    explanation = re.sub(r'\s+', ' ', explanation)
                
                options = {}
                opt_area = block.split('【参考答案')[0]
                
                for letter in ['A', 'B', 'C', 'D']:
                    pattern = rf'{letter}\s*[\.．]\s*([^\n]+(?:\n(?![A-D]\s*[\.．])[^\n]+)*)'
                    match = re.search(pattern, opt_area)
                    if match:
                        opt_text = match.group(1).strip()
                        opt_text = re.sub(r'\s+', ' ', opt_text)
                        options[letter] = opt_text
                
                if len(options) < 4:
                    continue
                
                content = block.split('●', 1)[-1] if '●' in block else block
                
                opt_a_pos = len(content)
                for pattern in [r'A\s*\.\s*', r'A\s*．\s*']:
                    match = re.search(pattern, content)
                    if match:
                        pos = match.start()
                        if pos < opt_a_pos:
                            opt_a_pos = pos
                
                if opt_a_pos == len(content):
                    continue
                
                question_text = content[:opt_a_pos].strip()
                question_text = re.sub(r'（\d+）', '', question_text).strip()
                question_text = re.sub(r'\s+', ' ', question_text)
                
                for letter in ['A', 'B', 'C', 'D']:
                    idx = question_text.rfind(f' {letter}.')
                    if idx == -1:
                        idx = question_text.rfind(f'{letter}.')
                    if idx > len(question_text) * 0.5:
                        question_text = question_text[:idx].strip()
                
                if not question_text or len(question_text) < 5:
                    continue
                
                questions.append({
                    'number': q_num,
                    'question': question_text,
                    'options': options,
                    'answer': answer,
                    'explanation': explanation,
                    'source': pdf_file
                })
        
        else:
            # 类型2: 环球网校格式
            # 格式: "1.题干内容\nA.选项1\nB.选项2\nC.选项3\nD.选项4\n参考答案：X\n题目解析：解析内容"
            # 或者 "1.题干内容()。\nA.选项1\nB.选项2\n..."
            
            # 按题号分割，匹配 "数字." 或 "数字、" 开头
            # 使用更灵活的方式匹配
            question_pattern = re.compile(
                r'(?:^|\n)\s*(\d+)[\.、]\s*(.*?)'  # 题号和题干
                r'(?:\n|\r)A\s*[\.．]\s*([^\n]+)'  # 选项A
                r'(?:\n|\r)B\s*[\.．]\s*([^\n]+)'  # 选项B
                r'(?:\n|\r)C\s*[\.．]\s*([^\n]+)'  # 选项C
                r'(?:\n|\r)D\s*[\.．]\s*([^\n]+)'  # 选项D
                r'(?:\n|\r)(?:参考答案|答案)[：:]\s*([A-D])'  # 答案
                r'(?:\n|\r)(?:(?:题目解析|解析)[：:]\s*(.*?))?(?=\n\s*\d+[\.、]|$)',  # 解析
                re.DOTALL
            )
            
            matches = list(question_pattern.finditer(cleaned_text))
            print(f"  匹配到 {len(matches)} 个题目模式")
            
            for match in matches:
                q_num = int(match.group(1))
                question_text = match.group(2).strip()
                
                # 清理题干
                question_text = re.sub(r'\s+', ' ', question_text)
                # 移除题干末尾的括号
                question_text = re.sub(r'[（(]\s*[)）]\s*$', '', question_text).strip()
                
                options = {
                    'A': match.group(3).strip(),
                    'B': match.group(4).strip(),
                    'C': match.group(5).strip(),
                    'D': match.group(6).strip()
                }
                
                answer = match.group(7)
                
                explanation = ""
                if match.group(8):
                    explanation = match.group(8).strip()
                    explanation = re.sub(r'\s+', ' ', explanation)
                
                if not question_text or len(question_text) < 3:
                    continue
                
                questions.append({
                    'number': q_num,
                    'question': question_text,
                    'options': options,
                    'answer': answer,
                    'explanation': explanation,
                    'source': pdf_file
                })
        
        # 去重
        seen = set()
        unique_questions = []
        for q in sorted(questions, key=lambda x: x['number']):
            if q['number'] not in seen:
                seen.add(q['number'])
                unique_questions.append(q)
        
        questions = unique_questions
        print(f"成功解析出 {len(questions)} 道选择题")
        
        if len(questions) > 0:
            print(f"  样例 - 题号{questions[0]['number']}: {questions[0]['question'][:50]}...")
        
        all_questions.extend(questions)
        
    except Exception as e:
        print(f"处理 {pdf_file} 时出错: {e}")
        import traceback
        traceback.print_exc()

print(f"\n{'='*60}")
print(f"总计解析出 {len(all_questions)} 道选择题")
print(f"{'='*60}")

# 保存为JSON
output_path = os.path.join(pdf_dir, "all_questions.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(all_questions, f, ensure_ascii=False, indent=2)

print(f"\n所有题目已保存到: {output_path}")

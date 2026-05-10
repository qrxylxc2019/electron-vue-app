import fitz
from PIL import Image
import pytesseract
import io
import re
import json

pdf_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\04.2025年5月高项选择题（第一批）-答案版.pdf"

print("正在使用OCR识别PDF中的文字...")
print("注意：OCR识别可能需要较长时间，请耐心等待...")

doc = fitz.open(pdf_path)
all_text = ""

for page_num in range(len(doc)):
    page = doc[page_num]
    # 将页面渲染为图片
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2倍缩放提高OCR精度
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    
    # OCR识别中文
    text = pytesseract.image_to_string(img, lang='chi_sim+eng')
    all_text += text + "\n"
    
    print(f"  已识别第 {page_num + 1}/{len(doc)} 页")

doc.close()

print(f"\nOCR完成，总文本长度: {len(all_text)}")

# 保存OCR文本
with open(r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\04_ocr_text.txt", "w", encoding="utf-8") as f:
    f.write(all_text)
print("OCR文本已保存到 04_ocr_text.txt")

# 解析题目
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
    
    # 收集题干
    i += 1
    while i < len(lines):
        next_line = lines[i].strip()
        if re.match(r'^[A-D][\.．、]\s*', next_line):
            break
        if re.match(r'^\d+[\.、]', next_line):
            break
        if '答案' in next_line or '解析' in next_line:
            break
        if next_line:
            question_text += next_line
        i += 1
    
    # 读取选项
    options = {}
    for opt_letter in ['A', 'B', 'C', 'D']:
        if i >= len(lines):
            break
        opt_match = re.match(rf'^[{opt_letter}][\.．、]\s*(.*)', lines[i].strip())
        if opt_match:
            options[opt_letter] = opt_match.group(1).strip()
            i += 1
    
    if len(options) < 4:
        i += 1
        continue
    
    # 读取答案
    answer = None
    while i < len(lines):
        line_text = lines[i].strip()
        ans_match = re.search(r'答案[：:]\s*([A-D])', line_text)
        if ans_match:
            answer = ans_match.group(1)
            i += 1
            break
        i += 1
    
    if not answer:
        continue
    
    # 清理题干
    question_text = re.sub(r'\s+', ' ', question_text).strip()
    
    if not question_text or len(question_text) < 3:
        continue
    
    questions.append({
        'number': q_num,
        'question': question_text,
        'options': options,
        'answer': answer,
        'explanation': ''
    })

print(f"\n成功解析出 {len(questions)} 道选择题")

# 保存
output_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\04_questions.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"题目已保存到: {output_path}")

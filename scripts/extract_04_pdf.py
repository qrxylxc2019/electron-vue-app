import fitz
import re
import json

pdf_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\04.2025年5月高项选择题（第一批）-答案版.pdf"

doc = fitz.open(pdf_path)
page_count = len(doc)
all_text = ""
for page in doc:
    all_text += page.get_text() + "\n"
doc.close()

print(f"PDF页数: {page_count}, 文本长度: {len(all_text)}")

# 如果文本为空，可能是扫描版PDF
if len(all_text.strip()) == 0:
    print("该PDF没有提取到文本，可能是扫描版PDF（图片格式），无法直接提取文字")
    print("需要使用OCR技术识别图片中的文字")
    
    # 尝试提取图片并保存
    print("\n尝试提取PDF中的图片...")
    doc = fitz.open(pdf_path)
    img_count = 0
    for page_num in range(len(doc)):
        page = doc[page_num]
        images = page.get_images()
        if images:
            print(f"  第{page_num+1}页有 {len(images)} 张图片")
            img_count += len(images)
    doc.close()
    print(f"总共 {img_count} 张图片")
else:
    # 保存文本查看
    with open(r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\04_text.txt", "w", encoding="utf-8") as f:
        f.write(all_text)
    print("文本已保存到 04_text.txt")
    print(f"前500字符:\n{all_text[:500]}")

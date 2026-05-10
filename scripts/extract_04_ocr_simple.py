import fitz
from PIL import Image
import io
import re
import json

pdf_path = r"D:\python脚本\平板做题软件\electron-vue-app\scripts\题目\04.2025年5月高项选择题（第一批）-答案版.pdf"

print("正在提取PDF图片...")

doc = fitz.open(pdf_path)

# 提取所有图片
all_images = []
for page_num in range(len(doc)):
    page = doc[page_num]
    images = page.get_images(full=True)
    for img_index, img in enumerate(images, start=1):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        
        # 保存图片
        img_path = f"D:\\python脚本\\平板做题软件\\electron-vue-app\\scripts\\题目\\04_page{page_num+1}_img{img_index}.{image_ext}"
        with open(img_path, "wb") as f:
            f.write(image_bytes)
        all_images.append(img_path)
        print(f"  保存图片: {img_path}")

doc.close()
print(f"\n共提取 {len(all_images)} 张图片")
print("由于OCR需要安装tesseract，请手动查看图片并录入题目")

"""
PDF 文本提取脚本
用法: python pdf_extractor.py <pdf_path>
输出: 提取的文本内容（UTF-8）
"""
import sys
import PyPDF2

# 强制 UTF-8 输出（避免 Windows 控制台 GBK 编码错误）
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def extract_text(pdf_path: str) -> str:
    """从 PDF 文件中提取文本"""
    text_parts = []
    
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        
        for page_num, page in enumerate(reader.pages, 1):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(f"--- 第 {page_num} 页 ---\n{page_text}")
    
    return "\n\n".join(text_parts)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python pdf_extractor.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    try:
        text = extract_text(pdf_path)
        # 使用 utf-8 编码写入 stdout
        sys.stdout.buffer.write(text.encode('utf-8'))
    except Exception as e:
        print(f"PDF 解析错误: {e}", file=sys.stderr)
        sys.exit(1)

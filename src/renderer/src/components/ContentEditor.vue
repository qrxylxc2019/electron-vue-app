<template>
  <div class="content-container" :style="containerStyle" :class="{ 'deleted-state': isDeleted }">
    <!-- 显示区域 -->
    <div id="display-area" ref="displayArea" :style="displayAreaStyle">
    </div>
  </div>
</template>

<script>
export default {
  name: 'ContentEditor',
  props: {
    contentHtml: {
      type: String,
      default: ''
    },
    border: {
      type: Boolean,
      default: true
    },
    padding: {
      type: Number,
      default: 15
    },
    editable: {
      type: Boolean,
      default: true
    },
    fontSize: {
      type: Number,
      default: 16
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      contentInput: ''
    }
  },
  computed: {
    containerStyle() {
      return {
        border: this.border ? '1px solid #ddd' : 'none',
        padding: `${this.padding}px`,
        opacity: this.isDeleted ? 0.5 : 1,
        pointerEvents: this.isDeleted ? 'none' : 'auto'
      }
    },
    displayAreaStyle() {
      return {
        fontSize: `${this.fontSize}px`
      }
    }
  },
  watch: {
    contentHtml: {
      immediate: true,
      handler(newValue) {
        if (newValue) {
          this.$nextTick(() => {
            // 确保 HTML 内容中的换行符被正确处理
            let processedContent = newValue;
            // 处理粗体文本 **text**
            processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            if (!processedContent.includes('<br>') && !processedContent.includes('</p><p>')) {
              processedContent = processedContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
              
            }
            this.$refs.displayArea.innerHTML = processedContent;
            this.renderMathJax();
          });
        }
      }
    }
  },
  mounted() {
    // 页面加载完成后确保 MathJax 渲染
    this.$nextTick(() => {
      if (this.contentHtml) {
        // 确保 HTML 内容中的换行符被正确处理
        let processedContent = this.contentHtml;
        // 处理粗体文本 **text**
        processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        if (!processedContent.includes('<br>') && !processedContent.includes('</p><p>')) {
          processedContent = processedContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
        }
        this.$refs.displayArea.innerHTML = processedContent;
      }
      this.renderMathJax();
    });
  },
  methods: {
    renderMathJax() {
      if (window.MathJax) {
        window.MathJax.typesetPromise([this.$refs.displayArea]).then(() => {
          console.log('MathJax 渲染完成');
        }).catch((err) => {
          console.error('MathJax 渲染出错:', err);
        });
      } else {
        console.error('MathJax 未加载');
      }
    },
    updateContent() {
      if (this.contentInput.trim() === '') {
        alert('请输入内容！');
        return;
      }
      
      // 简单的 Markdown 解析
      let content = this.contentInput
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 粗体
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // 斜体
        .replace(/###\s*(.*?)$/gm, '<h3>$1</h3>') // 三级标题
        .replace(/##\s*(.*?)$/gm, '<h2>$1</h2>') // 二级标题
        .replace(/\n\n/g, '</p><p>') // 段落分割
        .replace(/\n/g, '<br>') // 单个换行转为 HTML 换行
        .replace(/^\s*\d+\.\s/gm, '</p><ol><li>') // 有序列表开始
        .replace(/\n\s*\d+\.\s/g, '</li><li>') // 有序列表项
        .replace(/<\/li>(?!<li>)/g, '</li></ol><p>'); // 有序列表结束
      
      // 添加段落标签
      if (!content.startsWith('<h') && !content.startsWith('<p>')) {
        content = '<p>' + content;
      }
      if (!content.endsWith('</p>') && !content.endsWith('</h3>') && !content.endsWith('</h2>')) {
        content = content + '</p>';
      }
      
      this.$refs.displayArea.innerHTML = content;
      
      // 重新渲染 MathJax
      this.renderMathJax();
    }
  }
}
</script>

<style scoped>
.content-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  margin: 0 auto;
  transition: all 0.3s ease;
  width: 100%;
}

/* 删除状态样式 */
.content-container.deleted-state {
  background-color: #f5f5f5;
  color: #999;
  text-decoration: line-through;
  opacity: 0.6;
  pointer-events: none;
  cursor: not-allowed;
}

h1 {
  color: #2c3e50;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 30px;
}

h2 {
  color: #34495e;
  margin-top: 30px;
  margin-bottom: 15px;
}

h3 {
  color: #7f8c8d;
  margin-top: 25px;
  margin-bottom: 10px;
}

p {
  margin: 15px 0;
  color: #2c3e50;
}

strong {
  color: #c0392b;
  font-weight: 600;
}

/* 题目区域样式 */
.problem-section {
  background: #f1f8ff;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #0366d6;
  margin: 20px 0;
}

/* 提示区域样式 */
.hint-section {
  background: #fff3cd;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
  margin: 20px 0;
}

.hint-section ol {
  margin: 10px 0;
  padding-left: 20px;
}

.hint-section li {
  margin: 8px 0;
  color: #856404;
}

/* 按钮样式 */
.update-btn {
  background: linear-gradient(45deg, #3498db, #2980b9);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
  transition: all 0.3s ease;
}

.update-btn:hover {
  background: linear-gradient(45deg, #2980b9, #1f618d);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* 输入区域样式 */
.input-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #ecf0f1;
}

textarea {
  width: 100%;
  min-height: 200px;
  padding: 15px;
  border: 2px solid #bdc3c7;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: #3498db;
}

.label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #2c3e50;
}

/* 使MathJax样式生效 */
:deep(.MathJax) {
  font-size: 1.1em !important;
}

:deep(.MathJax_Display) {
  margin: 20px 0 !important;
  text-align: center;
}

/* 确保换行和段落间距正确  white-space: pre-line; */
#display-area {
}

#display-area br {
  display: block;
  margin: 0.5em 0;
  content: "";
}

:deep(#display-area) img {
  width: 100%;
}
</style>

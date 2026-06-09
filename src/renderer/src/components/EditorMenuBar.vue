<template>
  <div class="editor-menu-bar" v-if="editor">
    <button
      @click="editor.chain().focus().toggleBold().run()"
      :class="{ 'is-active': editor.isActive('bold') }"
      title="加粗"
    >
      <strong>B</strong>
    </button>
    <button
      @click="editor.chain().focus().toggleItalic().run()"
      :class="{ 'is-active': editor.isActive('italic') }"
      title="斜体"
    >
      <em>I</em>
    </button>
    <button
      @click="editor.chain().focus().toggleUnderline().run()"
      :class="{ 'is-active': editor.isActive('underline') }"
      title="下划线"
    >
      <u>U</u>
    </button>
    <button
      @click="editor.chain().focus().toggleStrike().run()"
      :class="{ 'is-active': editor.isActive('strike') }"
      title="删除线"
    >
      <s>S</s>
    </button>
    <span class="divider"></span>
    <button
      @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
      title="标题1"
    >
      H1
    </button>
    <button
      @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
      title="标题2"
    >
      H2
    </button>
    <button
      @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
      title="标题3"
    >
      H3
    </button>
    <span class="divider"></span>
    <button
      @click="editor.chain().focus().toggleBulletList().run()"
      :class="{ 'is-active': editor.isActive('bulletList') }"
      title="无序列表"
    >
      • 列表
    </button>
    <button
      @click="editor.chain().focus().toggleOrderedList().run()"
      :class="{ 'is-active': editor.isActive('orderedList') }"
      title="有序列表"
    >
      1. 列表
    </button>
    <span class="divider"></span>
    <button
      @click="editor.chain().focus().undo().run()"
      :disabled="!editor.can().undo()"
      title="撤销"
    >
      撤销
    </button>
    <button
      @click="editor.chain().focus().redo().run()"
      :disabled="!editor.can().redo()"
      title="重做"
    >
      重做
    </button>
    <span class="divider"></span>
    <button @click="addImage" title="插入图片">
      图片
    </button>
    <button @click="addIframe" title="插入视频">
      视频
    </button>
    <input 
      type="file" 
      ref="imageInput" 
      @change="handleImageUpload" 
      accept="image/*" 
      style="display: none;"
    />
  </div>
</template>

<script>
export default {
  name: 'EditorMenuBar',
  props: {
    editor: {
      type: Object,
      required: true
    }
  },
  methods: {
    addImage() {
      this.$refs.imageInput.click();
    },
    handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.editor.chain().focus().setImage({ src: reader.result }).run();
        // Reset the input so the same file can be selected again
        this.$refs.imageInput.value = '';
      };
      reader.readAsDataURL(file);
    },
    addIframe() {
      const url = prompt('请输入视频链接 (YouTube, Bilibili等)');
      
      if (url) {
        // Simple validation
        if (url.includes('youtube.com') || url.includes('youtu.be') || 
            url.includes('bilibili.com') || url.includes('vimeo.com')) {
          this.editor.commands.insertContent({
            type: 'iframe',
            attrs: {
              src: url,
              frameborder: 0,
              allowfullscreen: true
            }
          });
        } else {
          alert('请输入有效的视频链接');
        }
      }
    }
  }
};
</script>

<style>
.editor-menu-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 5px;
  border-bottom: 1px solid #ccc;
  background-color: #f5f5f5;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.editor-menu-bar button {
  margin-right: 5px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 2px 8px;
  font-size: 14px;
  cursor: pointer;
  height: 30px;
  min-width: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.editor-menu-bar button:hover {
  background-color: #f0f0f0;
}

.editor-menu-bar button.is-active {
  background-color: #e6f7ff;
  border-color: #91d5ff;
  color: #1890ff;
}

.editor-menu-bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  width: 1px;
  height: 20px;
  background-color: #ddd;
  margin: 0 5px;
}
</style> 
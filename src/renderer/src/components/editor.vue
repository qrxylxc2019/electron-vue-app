<template>
  <div class="rich-editor-container" :style="{ height: editorHeight, display: 'flex', flexDirection: 'column' }">
    <editor-menu-bar v-if="showMenu && editable" :editor="editor" />
    <editor-content 
      :editor="editor" 
      class="editor-content"
      :class="{ 'font-size-override': fontSize }"
      :style="{
        backgroundColor: backgroundColor,
        width: editorWidth,
        flex: '1',
        fontSize: computedFontSize + ' !important',
        color: color || fontColor,
        border: border ? '1px solid #ccc' : 'none',
        lineHeight: '1',
        borderRadius: computedBorderRadius,
        padding: computedPadding,
      }"
    />
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import EditorMenuBar from './EditorMenuBar.vue'
import { Node } from '@tiptap/core'

// Create a custom extension for iframe support
const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      frameborder: {
        default: 0,
      },
      allowfullscreen: {
        default: true,
      },
      width: {
        default: '100%',
      },
      height: {
        default: '500px',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', HTMLAttributes]
  },
})

export default {
  name: "RichEditor",
  components: {
    EditorContent,
    EditorMenuBar
  },
  props: {
    contentHtml: {
      type: String,
      default: "",
    },
    contentText: {
      type: String,
      default: "",
    },
    modelValue: {
      type: String,
      default: "",
    },
    width: {
      type: [String, Number],
      default: "100%",
    },
    height: {
      type: [String, Number],
      default: "auto",
    },
    fontSize: {
      type: [String, Number],
      default: "20px",
    },
    fontColor: {
      type: String,
      default: "#000",
    },
    color: {
      type: String,
      default: "",
    },
    border: {
      type: Boolean,
      default: false,
    },
    backgroundColor: {
      type: String,
      default: "#fff",
    },
    borderRadius: {
      type: [String, Number],
      default: "4px",
    },
    padding: {
      type: [String, Number],
      default: "15px",
    },
    editable: {
      type: Boolean,
      default: true,
    },
    showMenu: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: "Write something…",
    }
  },

  data() {
    return {
      editor: null,
    };
  },
  
  computed: {
    editorWidth() {
      if (typeof this.width === "number") {
        return `${this.width}px`;
      }
      return this.width;
    },
    editorHeight() {
      if (!this.height) {
        return "auto";
      }
      if (typeof this.height === "number") {
        return `${this.height}px`;
      }
      return this.height;
    },
    computedFontSize() {
      if (typeof this.fontSize === "number") {
        return `${this.fontSize}px`;
      }
      return this.fontSize;
    },
    computedBorderRadius() {
      if (typeof this.borderRadius === "number") {
        return `${this.borderRadius}px`;
      }
      return this.borderRadius;
    },
    computedPadding() {
      if (typeof this.padding === "number") {
        return `${this.padding}px`;
      }
      return this.padding;
    },
  },
  
  mounted() {
    this.initEditor();
  },
  
  beforeUnmount() {
    this.editor?.destroy();
  },
  
  methods: {
    initEditor() {
      this.editor = new Editor({
        extensions: [
          StarterKit,
          Underline,
          Iframe,
          Image.configure({
            inline: true,
            allowBase64: true,
          }),
          Link.configure({
            openOnClick: true,
          }),
          Placeholder.configure({
            placeholder: this.placeholder,
          }),
        ],
        content: this.contentHtml || this.modelValue,
        editable: this.editable,
        onUpdate: ({ editor }) => {
          const html = editor.getHTML();
          const text = editor.getText();
          this.$emit('update:contentHtml', html);
          this.$emit('update:contentText', text);
          this.$emit('update:modelValue', html);
        },
        onTransaction: () => {
          // Force re-render to update view
          this.$forceUpdate();
        },
        editorProps: {
          handlePaste: (view, event) => {
            // Check for iframe content in clipboard
            const htmlContent = event.clipboardData.getData('text/html');
            const plainText = event.clipboardData.getData('text/plain');
            
            // Handle iframe paste
            if ((htmlContent && htmlContent.includes('<iframe')) || 
                (plainText && plainText.includes('<iframe'))) {
              event.preventDefault();
              
              // Extract iframe HTML
              const content = htmlContent || plainText;
              const parser = new DOMParser();
              const doc = parser.parseFromString(content, 'text/html');
              const iframes = doc.querySelectorAll('iframe');
              
              if (iframes.length > 0) {
                const iframe = iframes[0];
                const src = iframe.getAttribute('src');
                
                if (src) {
                  // Insert iframe at current position
                  this.editor.commands.insertContent({
                    type: 'iframe',
                    attrs: {
                      src,
                      frameborder: 0,
                      allowfullscreen: true
                    }
                  });
                  return true;
                }
              }
            }
            
            // Handle image paste from clipboard
            const items = (event.clipboardData || window.clipboardData).items;
            
            for (const item of items) {
              if (item.type.indexOf('image') !== -1) {
                event.preventDefault();
                const file = item.getAsFile();
                this.handleImagePaste(file);
                return true;
              }
            }
            
            // Handle plain text - always process to preserve newlines
            if (plainText) {
              event.preventDefault();
              // 转义HTML特殊字符
              let processed = plainText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              
              // 将换行符转换为段落
              const lines = processed.split(/\r\n|\r|\n/);
              const htmlContent = lines.map(line => `<p>${line || '<br>'}</p>`).join('');
              
              this.editor.commands.insertContent(htmlContent);
              return true;
            }
            
            return false; // Let Tiptap handle other paste events
          },
        },
      });
    },
    
    getContent() {
      return this.editor?.getHTML() || '';
    },
    
    getText() {
      return this.editor?.getText() || '';
    },
    
    html(content) {
      if (content !== undefined && this.editor) {
        this.editor.commands.setContent(content);
      }
      return this.editor?.getHTML() || '';
    },
    
    focus() {
      this.editor?.commands.focus();
    },

    insertContent(content) {
      if (this.editor) {
        this.editor.commands.focus('end');
        this.editor.commands.insertContent(content);
      }
    },

    setContent(content) {
      if (this.editor) {
        this.editor.commands.setContent(content || '');
      }
    },
    
    blur() {
      this.editor?.commands.blur();
    },
    
    // Handle image paste
    handleImagePaste(file) {
      if (!file || !this.editor) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.editor.commands.setImage({ src: e.target.result });
      };
      reader.readAsDataURL(file);
    },
  },
  
  watch: {
    contentHtml: {
      handler(val) {
        if (this.editor && val !== this.editor.getHTML()) {
          this.editor.commands.setContent(val || '', false);
        }
      },
    },
    contentText: {
      handler(val) {
        if (this.editor && val !== this.editor.getText()) {
          this.editor.commands.setContent(val || '', false);
        }
      },
    },
    modelValue: {
      handler(val) {
        if (this.editor && val !== this.editor.getHTML()) {
          this.editor.commands.setContent(val || '', false);
        }
      },
    },
    editable: {
      handler(val) {
        if (this.editor) {
          this.editor.setEditable(val);
        }
      },
    },
  },
};
</script>

<style>
.rich-editor-container {
  border-radius: 5px;
}

.editor-content {
  outline: none;
  overflow-y: auto;
  max-width: 100%;
  word-wrap: break-word;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 美化滚动条 */
.editor-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.editor-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.ProseMirror {
  min-height: 100%;
  height: 100%;
  outline: none;
  font-size: inherit;
  padding:0!important;
}

.ProseMirror img {
  max-width: 100% !important;
  height: auto !important;
  display: block;
}

.ProseMirror iframe {
  max-width: 100% !important;
  width: 100% !important;
  height: 500px !important;
}

.ProseMirror p {
  margin: 0;
}

.ProseMirror:focus {
  outline: none;
}

.font-size-override .ProseMirror {
  font-size: inherit !important;
}

.font-size-override .ProseMirror * {
  font-size: inherit !important;
}
</style>

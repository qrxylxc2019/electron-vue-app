<template>
  <div class="article-container">
    <el-page-header @back="goBack" :content="directoryName" />
    <div class="article-content" v-if="articles.length > 0 && currentArticle">
      <div class="top-toolbar">
        <div class="toolbar-actions">
          <el-button class="add-article-btn" type="primary" size="small" @click="openAddArticleDialog">
            <el-icon><Plus /></el-icon> 新增论文
          </el-button>
        </div>
        <div class="progress-bar">
          <span class="progress-text">文章 {{ currentIndex + 1 }} / {{ articles.length }}</span>
          <el-progress :percentage="progressPercent" :show-text="false" />
        </div>
      </div>
      <div class="article-main">
        <div class="article-list-panel">
          <el-card class="article-list-card">
            <template #header>
              <div class="article-list-header">
                <span>文章列表</span>
                <el-tag type="info">{{ allArticles.length }} 篇</el-tag>
              </div>
            </template>
            <div class="article-list">
              <div
                v-for="article in allArticles"
                :key="article.id"
                class="article-list-item"
                :class="{ 'active': currentArticle?.id === article.id }"
                @click="jumpToArticleById(article.id)"
              >
                <span v-if="!isEditingArticleTitle(article.id)" class="article-title">{{ article.title || '无标题' }}</span>
                <el-input
                  v-else
                  :ref="el => setArticleTitleInputRef(el, article.id)"
                  v-model="editingArticleTitles[article.id]"
                  size="small"
                  class="article-title-input"
                  @blur="saveArticleTitle(article.id)"
                  @keydown.enter="saveArticleTitle(article.id)"
                />
                <el-button
                  v-if="!isEditingArticleTitle(article.id)"
                  class="edit-title-btn"
                  size="small"
                  text
                  @click.stop="startEditArticleTitle(article.id, article.title)"
                >
                  <el-icon :size="14"><EditPen /></el-icon>
                </el-button>
                <el-button
                  v-else
                  class="save-title-btn"
                  size="small"
                  type="primary"
                  text
                  @click.stop="saveArticleTitle(article.id)"
                >
                  <el-icon :size="14"><CircleCheck /></el-icon>
                </el-button>
              </div>
            </div>
          </el-card>
        </div>
        <div class="article-left">
          <el-card class="question-card">
            <template #header>
              <div class="question-header">
                <div class="header-left">
                  <el-tag type="info">文章题</el-tag>
                </div>
                <div class="header-actions">
                  <el-button class="copy-btn" size="small" @click="copyArticleContent" :title="copySuccess ? '已复制' : '复制文章'">
                    <el-icon :size="18">
                      <Check v-if="copySuccess" style="color: #67c23a;" />
                      <DocumentCopy v-else />
                    </el-icon>
                  </el-button>
                </div>
              </div>
            </template>
            <div class="question-title markdown-body" v-html="renderMarkdown(currentArticle.title)"></div>
            <div class="write-content">
              <div v-for="(paragraph, index) in writeParagraphs" :key="index" class="paragraph-block">
                <div class="paragraph-row">
                  <div class="paragraph-item" :class="{ 'hidden': hiddenParagraphs.has(index) }">
                    <div v-if="!isEditingParagraph(index)">
                      <p class="paragraph-text markdown-body" v-html="renderMarkdown(paragraph)"></p>
                    </div>
                    <div
                      v-else
                      :ref="el => setParagraphEditorRef(el, index)"
                      class="paragraph-editor"
                      contenteditable="true"
                      v-html="getParagraphEditHtml(index)"
                      @paste="handleParagraphPaste($event, index)"
                    ></div>
                  </div>
                  <div class="paragraph-actions">
                    <el-button v-if="!isEditingParagraph(index)" class="edit-btn" size="small" @click="startEditParagraph(index)" title="编辑段落">
                      <el-icon :size="16"><EditPen /></el-icon>
                    </el-button>
                    <el-button v-if="isEditingParagraph(index)" class="save-btn" size="small" type="primary" @click="saveParagraph(index)" title="保存段落">
                      <el-icon :size="16"><CircleCheck /></el-icon>
                    </el-button>
                    <el-button class="toggle-btn" size="small" @click="toggleParagraph(index)">
                      {{ hiddenParagraphs.has(index) ? '显示' : '隐藏' }}
                    </el-button>
                  </div>
                </div>
                <div v-if="showHandwrite" class="handwrite-area">
                  <el-input v-model="handwriteInputs[index]" type="textarea" :rows="6" :placeholder="`第 ${index + 1} 段手写内容...`" class="handwrite-input" />
                  <div class="handwrite-actions">
                    <el-button class="clear-handwrite-btn" size="small" text @click="handwriteInputs[index] = ''">
                      <el-icon><Delete /></el-icon> 清空
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
        <div class="article-right">
          <div class="right-actions">
            <el-button class="delete-question-btn" @click="deleteCurrentArticle">
              <el-icon><Delete /></el-icon> 删除文章
            </el-button>
            <el-button class="add-article-btn" type="primary" @click="openAddArticleDialog">
              <el-icon><Plus /></el-icon> 新增论文
            </el-button>
            <el-button class="full-article-mode-btn" @click="fullArticleDrawerVisible = true">
              <el-icon><Document /></el-icon> 整篇模式
            </el-button>
            <el-button class="handwrite-btn" :class="{ 'active': showHandwrite }" @click="toggleHandwrite">
              <el-icon><EditPen /></el-icon> {{ showHandwrite ? '隐藏手写' : '显示手写' }}
            </el-button>
            <el-button class="ai-explain-btn" @click="openAIChatDrawer">
              <el-icon><Cpu /></el-icon> AI讲解
            </el-button>
            <el-button class="next-question-btn" @click="nextArticle">
              下一篇 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无文章" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { marked } from 'marked';
import type { Article } from '../types';
import { Cpu, Delete, ArrowRight, Loading, CircleCheck, CircleClose, Close, Promotion, EditPen, DocumentCopy, Check, Document, Plus } from '@element-plus/icons-vue';

const props = defineProps<{ directoryId: string }>();
const router = useRouter();
const route = useRoute();

const directoryName = ref('');
const articles = ref<Article[]>([]);
const allArticles = ref<Article[]>([]);
const currentIndex = ref(0);
const hiddenParagraphs = ref<Set<number>>(new Set());
const fullArticleDrawerVisible = ref(false);
const showHandwrite = ref(true);
const handwriteInputs = ref<Record<number | string, string>>({});
const copySuccess = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

const currentArticle = computed(() => articles.value[currentIndex.value] || null);
const progressPercent = computed(() => {
  if (articles.value.length === 0) return 0;
  return ((currentIndex.value + 1) / articles.value.length) * 100;
});

const writeParagraphs = computed<string[]>(() => {
  if (!currentArticle.value) return [];
  const content = currentArticle.value.content || currentArticle.value.title || '';
  if (!content.trim()) return [];
  if (/<(div|p)\b/i.test(content)) {
    const paragraphs: string[] = [];
    const divParts = content.split(/<div\b[^>]*>/i);
    for (const part of divParts) {
      const cleanPart = part.replace(/<\/div>/gi, '').trim();
      if (cleanPart) paragraphs.push(cleanPart);
    }
    if (paragraphs.length === 0) {
      const pParts = content.split(/<p\b[^>]*>/i);
      for (const part of pParts) {
        const cleanPart = part.replace(/<\/p>/gi, '').trim();
        if (cleanPart) paragraphs.push(cleanPart);
      }
    }
    if (paragraphs.length > 0) return paragraphs;
  }
  return content.split(/\n+/).filter(p => p.trim());
});

const renderMarkdown = (content: string) => {
  return marked.parse((content || '').trim(), { async: false }) as string;
};

const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const loadData = async () => {
  try {
    const dirId = parseInt(props.directoryId);
    const dirs = await window.electronAPI.getDirectories();
    const dir = dirs.find(d => d.id === dirId);
    if (dir) directoryName.value = dir.name;
    let arts = await window.electronAPI.getArticles(dirId);
    if (arts.length === 0) {
      ElMessage.warning('该科目暂无文章');
      return;
    }
    allArticles.value = [...arts];
    const mode = route.query.mode as string;
    const count = parseInt(route.query.count as string) || arts.length;
    const repeat = parseInt(route.query.repeat as string) || 1;
    arts = shuffleArray([...arts]);
    if (mode === 'random' && count < arts.length) arts = arts.slice(0, count);
    if (repeat > 1) {
      const base = [...arts];
      const repeated: Article[] = [];
      for (let i = 0; i < repeat; i++) repeated.push(...shuffleArray([...base]));
      arts = repeated;
    }
    articles.value = arts;
    resetState();
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
  }
};

const resetState = () => {
  handwriteInputs.value = {};
  showHandwrite.value = true;
  editingParagraphIndex.value = null;
  paragraphEditorRefs.value = {};
};

const goBack = () => router.push({ name: 'Home' });

const deleteCurrentArticle = async () => {
  if (!currentArticle.value) return;
  try {
    await ElMessageBox.confirm('确定要删除当前文章吗？此操作不可恢复。', '删除确认', {
      confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning',
    });
  } catch { return; }
  try {
    const id = currentArticle.value.id;
    const success = await window.electronAPI.deleteArticle(id);
    if (success) {
      ElMessage.success('文章已删除');
      articles.value = articles.value.filter(a => a.id !== id);
      allArticles.value = allArticles.value.filter(a => a.id !== id);
      if (articles.value.length === 0) {
        ElMessage.info('该科目下已无任何文章');
        router.push({ name: 'Home' });
        return;
      }
      if (currentIndex.value >= articles.value.length) currentIndex.value = articles.value.length - 1;
      resetState();
    } else { ElMessage.error('删除失败'); }
  } catch (error) { ElMessage.error('删除失败'); console.error(error); }
};

const nextArticle = () => {
  if (currentIndex.value < articles.value.length - 1) {
    currentIndex.value++;
    resetState();
  } else {
    ElMessage.success('本轮文章已完成，即将重新开始');
    loadData();
  }
};

const copyArticleContent = async () => {
  if (!currentArticle.value) return;
  const text = currentArticle.value.content || currentArticle.value.title || '';
  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => copySuccess.value = false, 2000);
    ElMessage.success('文章已复制到剪贴板');
  } catch (e) { ElMessage.error('复制失败'); }
};

const toggleHandwrite = () => { showHandwrite.value = !showHandwrite.value; };

// 段落编辑
const editingParagraphIndex = ref<number | null>(null);
const paragraphEditorRefs = ref<Record<number, HTMLDivElement>>({});
const paragraphEditContents = ref<Record<number, string>>({});

const isEditingParagraph = (index: number) => editingParagraphIndex.value === index;
const setParagraphEditorRef = (el: HTMLDivElement | null, index: number) => { if (el) paragraphEditorRefs.value[index] = el; };
const getParagraphEditHtml = (index: number) => paragraphEditContents.value[index] !== undefined ? paragraphEditContents.value[index] : (writeParagraphs.value[index] || '');

const startEditParagraph = (index: number) => {
  paragraphEditContents.value[index] = writeParagraphs.value[index] || '';
  editingParagraphIndex.value = index;
  nextTick(() => {
    const editor = paragraphEditorRefs.value[index];
    if (editor) {
      editor.focus();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    }
  });
};

const saveParagraph = async (index: number) => {
  const editor = paragraphEditorRefs.value[index];
  if (!editor) return;
  const newContent = editor.innerHTML;
  const oldParagraphs = writeParagraphs.value;
  if (oldParagraphs[index] === newContent) { editingParagraphIndex.value = null; return; }
  oldParagraphs[index] = newContent;
  const newFullContent = oldParagraphs.join('\n');
  try {
    if (currentArticle.value) {
      const success = await window.electronAPI.updateArticle(currentArticle.value.id, newFullContent);
      if (success) {
        currentArticle.value.content = newFullContent;
        const artInList = articles.value.find(a => a.id === currentArticle.value!.id);
        if (artInList) artInList.content = newFullContent;
        const artInAll = allArticles.value.find(a => a.id === currentArticle.value!.id);
        if (artInAll) artInAll.content = newFullContent;
        ElMessage.success('段落已保存');
      } else { ElMessage.error('保存失败'); }
    }
  } catch (error) { ElMessage.error('保存失败'); console.error(error); }
  editingParagraphIndex.value = null;
};

const handleParagraphPaste = (event: ClipboardEvent, index: number) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) { document.execCommand('insertHTML', false, `<img src="${base64}" style="max-width:100%;" />`); }
      };
      reader.readAsDataURL(blob);
    }
  }
};

const toggleParagraph = (index: number) => {
  if (hiddenParagraphs.value.has(index)) hiddenParagraphs.value.delete(index);
  else hiddenParagraphs.value.add(index);
};

// 文章标题编辑
const editingArticleTitleId = ref<number | null>(null);
const editingArticleTitles = ref<Record<number, string>>({});
const articleTitleInputRefs = ref<Record<number, any>>({});

const isEditingArticleTitle = (id: number) => editingArticleTitleId.value === id;
const setArticleTitleInputRef = (el: any, id: number) => { if (el) articleTitleInputRefs.value[id] = el; };

const startEditArticleTitle = (id: number, title: string) => {
  editingArticleTitleId.value = id;
  editingArticleTitles.value[id] = title || '';
  nextTick(() => {
    const inputRef = articleTitleInputRefs.value[id];
    if (inputRef && inputRef.focus) inputRef.focus();
  });
};

const saveArticleTitle = async (id: number) => {
  const newTitle = editingArticleTitles.value[id];
  if (newTitle === undefined) return;
  const article = allArticles.value.find(a => a.id === id);
  if (!article) return;
  if (article.title === newTitle) { editingArticleTitleId.value = null; return; }
  try {
    const success = await window.electronAPI.updateArticle(id, article.content, newTitle);
    if (success) {
      article.title = newTitle;
      const articleInList = articles.value.find(a => a.id === id);
      if (articleInList) articleInList.title = newTitle;
      if (currentArticle.value && currentArticle.value.id === id) currentArticle.value.title = newTitle;
      editingArticleTitleId.value = null;
      ElMessage.success('标题已保存');
    } else { ElMessage.error('保存失败'); }
  } catch (error) { ElMessage.error('保存失败'); console.error(error); }
};

const jumpToArticleById = (id: number) => {
  const idx = articles.value.findIndex(a => a.id === id);
  if (idx !== -1) { currentIndex.value = idx; resetState(); }
  else {
    const article = allArticles.value.find(a => a.id === id);
    if (article) { articles.value.splice(currentIndex.value + 1, 0, article); currentIndex.value++; resetState(); }
  }
};

// 新增论文弹窗
const addArticleDialogVisible = ref(false);
const newArticleTitle = ref('');
const newArticleContent = ref('');
const addArticleEditorRef = ref<HTMLDivElement | null>(null);

const openAddArticleDialog = () => {
  addArticleDialogVisible.value = true;
  newArticleTitle.value = '';
  newArticleContent.value = '';
};

const handleAddArticlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64 && addArticleEditorRef.value) {
          document.execCommand('insertHTML', false, `<img src="${base64}" style="max-width:100%;" />`);
        }
      };
      reader.readAsDataURL(blob);
    }
  }
};

const saveNewArticle = async () => {
  if (!newArticleTitle.value.trim()) { ElMessage.warning('请输入论文标题'); return; }
  const editorContent = addArticleEditorRef.value?.innerHTML || '';
  if (!editorContent.trim()) { ElMessage.warning('请输入论文内容'); return; }
  try {
    const dirId = parseInt(props.directoryId);
    const result = await window.electronAPI.addArticle({
      directory_id: dirId, title: newArticleTitle.value.trim(), content: editorContent,
    });
    if (!result) { ElMessage.error('保存失败'); return; }
    ElMessage.success('论文保存成功');
    addArticleDialogVisible.value = false;
    await loadData();
    const newIndex = articles.value.findIndex(a => a.id === result.id);
    if (newIndex >= 0) currentIndex.value = newIndex;
  } catch (error) { ElMessage.error('保存失败'); console.error(error); }
};

onMounted(() => loadData());
</script>

<style scoped>
.article-container {
  padding: 20px 2vw;
  width: 100%;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-page-header__content) {
  font-size: 26px;
  font-weight: 500;
  color: #1a1a1a;
}

:deep(.el-page-header__left) {
  font-size: 18px;
}

.article-content {
  margin-top: 28px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  min-width: 0;
}

.progress-text {
  display: block;
  margin-bottom: 12px;
  color: #6b6560;
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-progress-bar__outer) {
  background-color: #e8e4df;
  border-radius: 4px;
  height: 8px !important;
}

:deep(.el-progress-bar__inner) {
  background-color: #c4a882;
  border-radius: 4px;
}

.article-main {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 20px;
}

.article-list-panel {
  width: 280px;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  -ms-overflow-style: auto;
}

.article-list-panel::-webkit-scrollbar {
  width: 6px;
}

.article-list-panel::-webkit-scrollbar-thumb {
  background-color: #c4a882;
  border-radius: 3px;
}

.article-list-card {
  border-radius: 16px;
  border: 1px solid #e8e4df;
  background: #fff;
  box-shadow: none;
}

.article-list-card :deep(.el-card__header) {
  border-bottom: 1px solid #f0ece7;
  padding: 16px 20px;
}

.article-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
}

.article-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  color: #4a4540;
}

.article-list-item:hover {
  background: #f5f3f0;
}

.article-list-item.active {
  background: #f0ece7;
  color: #1a1a1a;
  font-weight: 600;
}

.article-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-title-input {
  flex: 1;
}

.article-title-input :deep(.el-input__inner) {
  font-size: 14px;
  padding: 4px 8px;
}

.edit-title-btn,
.save-title-btn {
  flex-shrink: 0;
  padding: 4px 8px;
  min-height: 28px;
}

.article-left {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.article-left::-webkit-scrollbar {
  display: none;
}

.article-right {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.right-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.question-card {
  margin-bottom: 24px;
  border-radius: 20px;
  border: 1px solid #e8e4df;
  background: #fff;
  box-shadow: none;
  height: 100%;
}

.question-card :deep(.el-card__header) {
  border-bottom: 1px solid #f0ece7;
  padding: 20px 24px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.copy-btn {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #9a9590;
  font-size: 18px;
}

.copy-btn:hover {
  color: #1a1a1a;
  background: #f5f3f0;
}

.question-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 28px;
  line-height: 1.6;
}

.write-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paragraph-block {
  display: flex;
  flex-direction: column;
}

.paragraph-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.paragraph-item {
  flex: 1;
  padding: 10px 15px;
  border: 1.5px solid #e8e4df;
  border-radius: 14px;
  background: #fff;
  transition: all 0.25s ease;
  min-height: 64px;
}

.paragraph-item.hidden {
  background-color: #f5f3f0;
  border-color: #e8e4df;
}

.paragraph-item.hidden .paragraph-text {
  opacity: 0;
  filter: blur(8px);
  user-select: none;
}

.paragraph-text {
  margin: 0;
  font-size: 22px;
  color: #1a1a1a;
  line-height: 1.8;
  transition: all 0.25s ease;
}

.paragraph-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  align-self: center;
}

.toggle-btn,
.edit-btn,
.save-btn {
  min-height: 40px;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
  margin-left: 0;
}

.paragraph-editor {
  flex: 1;
  padding: 16px;
  border: 2px solid #c4a882;
  border-radius: 14px;
  background: #fff;
  min-height: 120px;
  outline: none;
  font-size: 22px;
  line-height: 1.8;
  color: #1a1a1a;
}

.paragraph-editor img {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

.handwrite-area {
  margin-top: 12px;
  width: 100%;
}

.handwrite-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 16px;
  font-size: 18px;
  line-height: 1.8;
  background: #fdfbf8;
  border: 1.5px solid #e8e4df;
  resize: vertical;
}

.clear-handwrite-btn {
  margin-top: 12px;
  color: #fff;
  background-color: #F56C6C;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 52px;
  margin-left: 0;
}

.clear-handwrite-btn:hover {
  background-color: #f78989;
}

.handwrite-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.delete-question-btn {
  background-color: #F56C6C;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 18px 20px;
  font-size: 16px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
  margin-left: 0;
}

.delete-question-btn:hover {
  background-color: #f78989;
}

.add-article-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
  width: 100%;
  margin-left: 0;
}

.add-article-btn:hover {
  background-color: #8b9a6d;
}

.full-article-mode-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
  width: 100%;
  margin-left: 0;
}

.full-article-mode-btn:hover {
  background-color: #8b9a6d;
}

.handwrite-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 18px 20px;
  font-size: 16px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
  width: 100%;
  margin-left: 0;
}

.handwrite-btn:hover {
  background-color: #8b9a6d;
}

.ai-explain-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  transition: all 0.2s ease;
  min-height: 52px;
  height: auto;
  margin-left: 0;
}

.ai-explain-btn:hover {
  background-color: #8b9a6d;
}

.next-question-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
  margin-left: 0;
}

.next-question-btn:hover:not(:disabled) {
  background-color: #8b9a6d;
}

/* Markdown */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin-top: 16px;
  margin-bottom: 10px;
  color: #1a1a1a;
  font-weight: 600;
}

.markdown-body :deep(p) {
  margin-bottom: 10px;
}

.markdown-body :deep(strong) {
  color: #1a1a1a;
  font-weight: 600;
}

.markdown-body :deep(code) {
  background: #f0ece7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
}

.markdown-body :deep(pre) {
  background: #f5f3f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-bottom: 12px;
  padding-left: 24px;
}

.markdown-body :deep(li) {
  margin-bottom: 6px;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #c4a882;
  padding-left: 16px;
  margin-left: 0;
  color: #6b6560;
  font-style: italic;
}
</style>

<template>
  <div class="quiz-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="quiz-content" v-if="dataLoaded">
      <!-- 有文章时显示内容 -->
      <template v-if="articles.length > 0 && currentArticle">
      <!-- 题目进度 -->
      <div class="progress-bar">
        <span class="progress-text">题目 {{ currentIndex + 1 }} / {{ articles.length }}</span>
        <el-progress :percentage="progressPercent" :show-text="false" />
      </div>

      <!-- 左右布局主体 -->
      <div class="quiz-main">
        <!-- 左侧显示所有文章列表 -->
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
                v-for="(article) in allArticles"
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

        <!-- 左侧：文章内容 -->
        <div class="quiz-left">
          <el-card class="question-card">
            <template #header>
              <div class="question-header">
                <div class="header-left">
                  <el-tag type="info">文章题</el-tag>
                </div>
                <div class="header-actions">
                  <el-button
                    class="copy-btn"
                    size="small"
                    @click="copyArticleContent"
                    :title="copySuccess ? '已复制' : '复制内容'"
                  >
                    <el-icon :size="18">
                      <Check v-if="copySuccess" style="color: #67c23a;" />
                      <DocumentCopy v-else />
                    </el-icon>
                  </el-button>
                </div>
              </div>
            </template>

            <!-- 文章标题 -->
            <div class="article-display-title">{{ currentArticle.title }}</div>

            <!-- 文章内容：不分段，一整段显示，带编辑和隐藏按钮 -->
            <div class="article-content-row">
              <div class="article-content-wrapper" :class="{ 'hidden': contentHidden }">
                <!-- 显示模式 -->
                <div v-if="!isEditingContent" class="article-single-content markdown-body" v-html="renderMarkdown(currentArticle.content)"></div>
                <!-- 编辑模式 -->
                <div
                  v-else
                  ref="contentEditorRef"
                  class="article-content-editor"
                  contenteditable="true"
                  v-html="contentEditHtml"
                  @paste="handleContentPaste"
                ></div>
              </div>
              <div class="content-actions">
                <el-button
                  v-if="!isEditingContent"
                  class="edit-btn"
                  size="small"
                  @click="startEditContent"
                  title="编辑内容"
                >
                  <el-icon :size="16"><EditPen /></el-icon>
                </el-button>
                <el-button
                  v-if="isEditingContent"
                  class="save-btn"
                  size="small"
                  type="primary"
                  @click="saveContent"
                  title="保存内容"
                >
                  <el-icon :size="16"><CircleCheck /></el-icon>
                </el-button>
                <el-button
                  class="toggle-btn"
                  size="small"
                  @click="toggleContentHidden"
                >
                  {{ contentHidden ? '显示' : '隐藏' }}
                </el-button>
              </div>
            </div>

            <!-- 手写输入区 -->
            <div v-if="showHandwrite" class="handwrite-area">
              <el-input
                v-model="handwriteInput"
                type="textarea"
                :rows="8"
                placeholder="在此输入手写内容..."
                class="handwrite-input"
              />
              <div class="handwrite-actions">
                <el-button
                  class="clear-handwrite-btn"
                  size="small"
                  text
                  @click="handwriteInput = ''"
                >
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：操作按钮 -->
        <div class="quiz-right">
          <div class="right-actions">
            <el-button class="delete-question-btn" @click="deleteCurrentArticle">
              <el-icon><Delete /></el-icon> 删除题目
            </el-button>
            <el-button class="add-article-btn" type="primary" @click="openAddArticleDialog">
              <el-icon><Plus /></el-icon> 新增文章
            </el-button>
            <el-button class="handwrite-btn" :class="{ 'active': showHandwrite }" @click="toggleHandwrite">
              <el-icon><EditPen /></el-icon>
              {{ showHandwrite ? '隐藏手写' : '显示手写' }}
            </el-button>
            <el-button class="ai-explain-btn" @click="openAIChatDrawer">
              <el-icon><Cpu /></el-icon> AI讲解
            </el-button>
            <el-button class="next-question-btn" @click="nextArticle">
              下一题 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      </template>

      <!-- 无文章时显示空状态和新增按钮 -->
      <div v-else class="empty-with-actions">
        <el-empty description="暂无文章">
          <template #default>
            <el-button class="add-article-btn-empty" type="primary" @click="openAddArticleDialog">
              <el-icon><Plus /></el-icon> 新增文章
            </el-button>
          </template>
        </el-empty>
      </div>
    </div>

    <!-- 当完全无数据时的备用显示 -->
    <div v-else class="empty-with-actions">
      <el-empty description="暂无文章">
        <template #default>
          <el-button class="add-article-btn-empty" type="primary" @click="openAddArticleDialog">
            <el-icon><Plus /></el-icon> 新增文章
          </el-button>
        </template>
      </el-empty>
    </div>

    <!-- AI 讲解抽屉 -->
    <div class="ai-drawer-overlay" :class="{ 'show': aiDrawerVisible }" @click="closeAIChatDrawer">
      <div class="ai-drawer" :class="{ 'show': aiDrawerVisible }" @click.stop>
        <div class="drawer-header">
          <h2>AI讲解</h2>
          <el-icon class="drawer-close" @click="closeAIChatDrawer"><Close /></el-icon>
        </div>
        <div class="drawer-content ai-chat-content" ref="aiChatContentRef" @scroll="handleAIChatScroll">
          <div class="chat-messages" ref="aiChatMessagesRef">
            <div v-for="(msg, index) in aiChatMessages" :key="index" class="chat-message" :class="msg.role">
              <div class="message-bubble">
                <div v-if="msg.provider" class="message-provider">{{ msg.provider }}</div>
                <div v-if="msg.role === 'user'" class="user-message-text">{{ msg.content }}</div>
                <div v-else class="ai-markdown" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <div v-if="aiLoading" class="chat-message assistant">
              <div class="message-bubble loading-bubble">
                <el-icon class="is-loading"><Loading /></el-icon>
              </div>
            </div>
            <div v-if="aiError" class="chat-message assistant">
              <div class="message-bubble error-bubble">
                <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit;">{{ aiError }}</pre>
              </div>
            </div>
          </div>
        </div>
        <div class="ai-chat-input-area">
          <div class="input-box">
            <el-input v-model="aiUserInput" type="textarea" :rows="2" placeholder="对这篇文章还有疑问？继续向 AI 提问..."
              class="ai-chat-input" @keydown.enter.prevent="sendAIChatMessage" />
            <div class="input-toolbar-bottom">
              <div></div>
              <el-button class="ai-send-icon-btn" :disabled="!aiUserInput.trim() || aiLoading" @click="sendAIChatMessage">
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增文章弹窗 -->
    <el-dialog v-model="addArticleDialogVisible" title="新增文章" width="900px" :close-on-click-modal="true" destroy-on-close class="add-article-dialog">
      <div class="add-article-form">
        <div class="form-item">
          <label>文章标题：</label>
          <el-input v-model="newArticleTitle" placeholder="请输入文章标题" />
        </div>
        <div class="form-item">
          <label>文章内容：</label>
          <div ref="addArticleEditorRef" class="article-editor" contenteditable="true" v-html="newArticleContent" @paste="handleAddArticlePaste"></div>
        </div>
      </div>
      <template #footer>
        <el-button @click="addArticleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNewArticle">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { marked } from 'marked';
import type { Article } from '../types';
import {
  Cpu, Delete, ArrowRight, Loading, CircleCheck, Close, Promotion,
  EditPen, DocumentCopy, Check, Plus
} from '@element-plus/icons-vue';

const API_ORDER_KEY = 'apiProviderOrder';
function getProviderOrder(): string[] {
  try {
    const stored = localStorage.getItem(API_ORDER_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error('读取厂商排序失败:', e); }
  return ['deepseekLocal', 'modelspace', 'deepseek'];
}

const props = defineProps<{ directoryId: string }>();
const router = useRouter();
const route = useRoute();

const directoryName = ref('');
const articles = ref<Article[]>([]);
const allArticles = ref<Article[]>([]);
const currentIndex = ref(0);
const showHandwrite = ref(true);
const handwriteInput = ref('');
const dataLoaded = ref(false);

const copySuccess = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

const editingArticleTitleId = ref<number | null>(null);
const editingArticleTitles = ref<Record<number, string>>({});
const articleTitleInputRefs = ref<Record<number, any>>({});

const addArticleDialogVisible = ref(false);
const newArticleTitle = ref('');
const newArticleContent = ref('');
const addArticleEditorRef = ref<HTMLDivElement | null>(null);

// 文章内容编辑状态
const isEditingContent = ref(false);
const contentEditorRef = ref<HTMLDivElement | null>(null);
const contentEditHtml = ref('');
const contentHidden = ref(false);

const aiDrawerVisible = ref(false);
const aiLoading = ref(false);
const aiError = ref('');
const aiChatMessages = ref<Array<{role: 'user' | 'assistant'; content: string; provider?: string}>>([]);
const aiUserInput = ref('');
const aiChatContentRef = ref<HTMLDivElement | null>(null);
let aiUnsubscribers: (() => void)[] = [];

const isUserScrolling = ref(false);
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

const currentArticle = computed(() => articles.value[currentIndex.value] || null);
const progressPercent = computed(() => {
  if (articles.value.length === 0) return 0;
  return ((currentIndex.value + 1) / articles.value.length) * 100;
});

const renderMarkdown = (content: string) => {
  return marked.parse((content || '').trim(), { async: false }) as string;
};

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const resetState = () => {
  currentIndex.value = 0;
  handwriteInput.value = '';
  showHandwrite.value = true;
};

const goBack = () => { router.push({ name: 'Home' }); };
const toggleHandwrite = () => { showHandwrite.value = !showHandwrite.value; };

const loadData = async () => {
  try {
    const dirId = parseInt(props.directoryId);
    const dirs = await window.electronAPI.getDirectories();
    const dir = dirs.find(d => d.id === dirId);
    if (dir) directoryName.value = dir.name;

    let arts = await window.electronAPI.getArticles(dirId);
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
    dataLoaded.value = true;
  } catch (error) { ElMessage.error('加载文章失败'); console.error(error); dataLoaded.value = true; }
};

const copyArticleContent = async () => {
  if (!currentArticle.value) return;
  try {
    await navigator.clipboard.writeText(currentArticle.value.title + '\n\n' + currentArticle.value.content);
    copySuccess.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copySuccess.value = false; }, 2000);
    ElMessage.success('内容已复制到剪贴板');
  } catch (e) { ElMessage.error('复制失败'); }
};

const deleteCurrentArticle = async () => {
  if (!currentArticle.value) return;
  try {
    await ElMessageBox.confirm('确定要删除当前文章吗？此操作不可恢复。', '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' });
  } catch { return; }
  try {
    const id = currentArticle.value.id;
    const success = await window.electronAPI.deleteArticle(id);
    if (success) {
      ElMessage.success('文章已删除');
      articles.value = articles.value.filter(a => a.id !== id);
      allArticles.value = allArticles.value.filter(a => a.id !== id);
      if (articles.value.length === 0) { ElMessage.info('该科目下已无任何文章'); router.push({ name: 'Home' }); return; }
      if (currentIndex.value >= articles.value.length) currentIndex.value = articles.value.length - 1;
      handwriteInput.value = '';
    } else { ElMessage.error('删除失败'); }
  } catch (error) { ElMessage.error('删除失败'); console.error(error); }
};

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
  if (!newArticleTitle.value.trim()) { ElMessage.warning('请输入文章标题'); return; }
  const editorContent = addArticleEditorRef.value?.innerHTML || '';
  if (!editorContent.trim()) { ElMessage.warning('请输入文章内容'); return; }
  try {
    const dirId = parseInt(props.directoryId);
    const result = await window.electronAPI.addArticle({
      directory_id: dirId, title: newArticleTitle.value.trim(), content: editorContent,
    });
    if (!result) { ElMessage.error('保存失败'); return; }
    ElMessage.success('文章保存成功');
    addArticleDialogVisible.value = false;
    await loadData();
    const newIndex = articles.value.findIndex(a => a.id === result.id);
    if (newIndex >= 0) currentIndex.value = newIndex;
  } catch (error) { ElMessage.error('保存失败'); console.error(error); }
};

const nextArticle = () => {
  if (currentIndex.value < articles.value.length - 1) {
    currentIndex.value++;
    handwriteInput.value = '';
  } else { ElMessage.success('本轮文章已完成，即将重新开始'); loadData(); }
};

const jumpToArticleById = (id: number) => {
  const idx = articles.value.findIndex(a => a.id === id);
  if (idx !== -1) { currentIndex.value = idx; handwriteInput.value = ''; }
  else {
    const article = allArticles.value.find(a => a.id === id);
    if (article) { articles.value.splice(currentIndex.value + 1, 0, article); currentIndex.value++; handwriteInput.value = ''; }
  }
};

const isEditingArticleTitle = (id: number) => editingArticleTitleId.value === id;
const setArticleTitleInputRef = (el: any, id: number) => { if (el) articleTitleInputRefs.value[id] = el; };

const startEditArticleTitle = (id: number, title: string) => {
  editingArticleTitleId.value = id;
  editingArticleTitles.value[id] = title || '';
  nextTick(() => { const inputRef = articleTitleInputRefs.value[id]; if (inputRef && inputRef.focus) inputRef.focus(); });
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

// 文章内容编辑相关方法
const startEditContent = () => {
  if (!currentArticle.value) return;
  const content = currentArticle.value.content;
  // 如果内容已经是 HTML，直接返回
  if (/<(div|p|br|img|span|strong|em|u|ol|ul|li|h[1-6])\b/i.test(content)) {
    contentEditHtml.value = content;
  } else {
    // 将纯文本中的换行转为 <br>，保留已有的 <img> 标签
    const parts = content.split(/(<img\s+[^>]+>)/gi);
    const htmlParts = parts.map((part: string) => {
      if (/^<img\s/i.test(part)) return part;
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    });
    contentEditHtml.value = htmlParts.join('');
  }
  isEditingContent.value = true;
};

const handleContentPaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          document.execCommand('insertHTML', false, `<img src="${base64}" style="max-width:100%;" />`);
        }
      };
      reader.readAsDataURL(blob);
    }
  }
};

const saveContent = async () => {
  if (!currentArticle.value || !contentEditorRef.value) return;
  const editor = contentEditorRef.value;
  let html = editor.innerHTML;
  // 统一转为纯文本保存：将 <br> 转回换行符
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
  html = html.replace(/<p>/gi, '\n').replace(/<\/p>/gi, '');
  // 保留 <img> 标签，清理其他标签
  html = html.replace(/<(?!img\s|\/img)[^>]+>/gi, '');
  // 解码 HTML 实体
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  let newContent = textarea.value;
  // 清理多余换行
  newContent = newContent.replace(/\n{3,}/g, '\n\n').trim();

  try {
    const success = await window.electronAPI.updateArticle(currentArticle.value.id, newContent);
    if (success) {
      currentArticle.value.content = newContent;
      const articleInAll = allArticles.value.find(a => a.id === currentArticle.value!.id);
      if (articleInAll) articleInAll.content = newContent;
      const articleInList = articles.value.find(a => a.id === currentArticle.value!.id);
      if (articleInList) articleInList.content = newContent;
      isEditingContent.value = false;
      ElMessage.success('内容已保存');
    } else {
      ElMessage.error('保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败');
    console.error(error);
  }
};

const toggleContentHidden = () => {
  contentHidden.value = !contentHidden.value;
};

watch(currentArticle, () => {
  handwriteInput.value = '';
  showHandwrite.value = true;
  isEditingContent.value = false;
  contentHidden.value = false;
  aiDrawerVisible.value = false;
  aiLoading.value = false;
  aiError.value = '';
  aiChatMessages.value = [];
  aiUserInput.value = '';
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];
});

const isAtBottom = () => {
  if (!aiChatContentRef.value) return true;
  const el = aiChatContentRef.value;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
};

const handleAIChatScroll = () => {
  if (!aiChatContentRef.value) return;
  isUserScrolling.value = true;
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => { if (isAtBottom()) isUserScrolling.value = false; }, 150);
};

const scrollToBottom = async () => {
  await nextTick();
  if (aiChatContentRef.value && !isUserScrolling.value) {
    aiChatContentRef.value.scrollTop = aiChatContentRef.value.scrollHeight;
  }
};

const buildArticleDisplayText = (): string => {
  if (!currentArticle.value) return '';
  return currentArticle.value.title + '\n\n' + currentArticle.value.content;
};

const openAIChatDrawer = async () => {
  if (!currentArticle.value) return;
  aiDrawerVisible.value = true;
  if (aiChatMessages.value.length > 0) { scrollToBottom(); return; }
  aiChatMessages.value.push({ role: 'user', content: buildArticleDisplayText() });
  scrollToBottom();
  await callAIExplain(false);
};

const closeAIChatDrawer = () => { aiDrawerVisible.value = false; };

const sendAIChatMessage = async () => {
  if (!aiUserInput.value.trim() || aiLoading.value) return;
  const userMessage = aiUserInput.value.trim();
  aiUserInput.value = '';
  if (!currentArticle.value) return;
  aiChatMessages.value.push({ role: 'user', content: userMessage });
  isUserScrolling.value = false;
  scrollToBottom();
  await callAIExplain(true, userMessage);
};

const callAIExplain = async (isFollowUp = false, userMessage = '') => {
  if (!currentArticle.value) return;
  aiLoading.value = true;
  aiError.value = '';
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];

  let assistantContent = '';
  let currentProvider = '';

  const unsubProviderSwitch = window.electronAPI.onAIProviderSwitch((provider: string) => {
    currentProvider = provider === 'modelspace' ? 'ModelSpace' : provider === 'deepseek' ? 'DeepSeek' : provider;
    const lastMsg = aiChatMessages.value[aiChatMessages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') lastMsg.provider = currentProvider;
  });
  aiUnsubscribers.push(unsubProviderSwitch);

  const unsubChunk = window.electronAPI.onAIStreamChunk((content: string) => {
    assistantContent += content;
    const lastMsg = aiChatMessages.value[aiChatMessages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = assistantContent;
      if (currentProvider && !lastMsg.provider) lastMsg.provider = currentProvider;
    } else {
      aiChatMessages.value.push({ role: 'assistant', content: assistantContent, provider: currentProvider || undefined });
    }
    scrollToBottom();
  });
  aiUnsubscribers.push(unsubChunk);

  const unsubDone = window.electronAPI.onAIStreamDone(() => { aiLoading.value = false; });
  aiUnsubscribers.push(unsubDone);

  const unsubError = window.electronAPI.onAIStreamError((error: string) => { aiLoading.value = false; aiError.value = error; });
  aiUnsubscribers.push(unsubError);

  try {
    const providerOrder = getProviderOrder();
    const result = await window.electronAPI.explainQuestion({
      title: currentArticle.value.title,
      options: currentArticle.value.content,
      correctAnswer: '',
      explanation: currentArticle.value.explanation || '',
      questionId: currentArticle.value.id,
      isFollowUp,
      userMessage,
      providerOrder,
    });
    if (!result.success && result.error) { aiLoading.value = false; aiError.value = result.error; }
  } catch (err: any) { aiLoading.value = false; aiError.value = err.message || '调用失败'; }
};

onUnmounted(() => { aiUnsubscribers.forEach(fn => fn()); });
onMounted(() => { loadData(); });
</script>

<style scoped>
.quiz-container {
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

:deep(.el-page-header__left),
:deep(.el-page-header__back),
:deep(.el-page-header__title) {
  font-size: 18px;
}

.quiz-content {
  margin-top: 28px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.progress-bar {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.quiz-main {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 20px;
}

.quiz-left {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.quiz-left::-webkit-scrollbar {
  display: none;
}

.quiz-right {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 文章列表 */
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

.right-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
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

.question-card {
  margin-bottom: 24px;
  border-radius: 20px;
  border: 1px solid #e8e4df;
  background: #fff;
  box-shadow: none;
  height: 100%;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #f0ece7;
  padding: 20px 24px;
}

:deep(.el-tag) {
  font-size: 15px;
  padding: 6px 14px;
  border-radius: 8px;
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

/* 文章标题和内容样式 */
.article-display-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 28px;
  line-height: 1.6;
}

.article-single-content {
  font-size: 22px;
  line-height: 1.8;
  color: #1a1a1a;
  margin-bottom: 28px;
}

/* 文章内容编辑和隐藏样式 */
.article-content-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.article-content-wrapper {
  flex: 1;
  min-width: 0;
}

.article-content-wrapper.hidden .article-single-content {
  display: none;
}

.article-content-editor {
  flex: 1;
  min-height: 200px;
  padding: 16px;
  font-size: 22px;
  line-height: 1.8;
  color: #1a1a1a;
  background: #fdfbf8;
  border: 1.5px solid #e8e4df;
  border-radius: 12px;
  outline: none;
  overflow-y: auto;
}

.article-content-editor:focus {
  border-color: #a89f91;
}

.content-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  align-self: center;
  padding-top: 4px;
}

.content-actions .toggle-btn {
  min-height: 40px;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
  margin-left: 0;
}

.content-actions .edit-btn,
.content-actions .save-btn {
  min-height: 40px;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
}

/* 手写输入区域 */
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

/* 右侧按钮样式 */
.next-question-btn {
  background-color: #8b9a6d;
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

.next-question-btn:hover:not(:disabled) {
  background-color: #8b9a6d;
}

.next-question-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
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

.handwrite-btn.active {
  background-color: #8b9a6d;
}

.ai-explain-btn {
  background-color: #1a1a1a;
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

.ai-explain-btn:hover {
  background-color: #333;
}

.add-article-btn {
  border-radius: 12px;
  padding: 18px 20px;
  font-size: 16px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
  width: 100%;
  margin-left: 0;
}

/* 空状态新增按钮 */
.empty-with-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.add-article-btn-empty {
  margin-top: 20px;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  height: auto;
  min-height: 52px;
}

/* AI 抽屉样式 */
.ai-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 1000;
  pointer-events: none;
  transition: background 0.3s ease;
}

.ai-drawer-overlay.show {
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.ai-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 600px;
  height: 100%;
  background: #fff;
  z-index: 1001;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
}

.ai-drawer.show {
  transform: translateX(0);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e4df;
  flex-shrink: 0;
}

.drawer-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.drawer-close {
  font-size: 20px;
  color: #9a9590;
  cursor: pointer;
  transition: color 0.2s;
}

.drawer-close:hover {
  color: #1a1a1a;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* AI 聊天内容样式 */
.ai-chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f8f7f5;
  scrollbar-width: thin;
  scrollbar-color: #c4c4c4 transparent;
}

.ai-chat-content::-webkit-scrollbar {
  width: 6px;
}

.ai-chat-content::-webkit-scrollbar-track {
  background: transparent;
}

.ai-chat-content::-webkit-scrollbar-thumb {
  background: #c4c4c4;
  border-radius: 3px;
}

.ai-chat-content::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.chat-message {
  display: flex;
  align-items: flex-start;
}

.chat-message.user {
  justify-content: flex-end;
}

.chat-message.assistant {
  justify-content: flex-start;
}

.message-bubble {
  padding: 5px 0px;
  border-radius: 1px;
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
}

.chat-message.user .message-bubble {
  background: #f0f0f0;
  padding: 18px 19px;
  border-radius: 12px;
  max-width: 80%;
}

.loading-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b6560;
}

.message-provider {
  font-size: 12px;
  color: #9a9590;
  margin-bottom: 6px;
  padding: 2px 8px;
  background: #f5f3f0;
  border-radius: 4px;
  display: inline-block;
}

.error-bubble {
  color: #F56C6C;
  background: #fef0f0;
}

.ai-chat-input-area {
  padding: 16px 0px;
  border-top: 1px solid #e8e4df;
  background: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.input-box {
  background: #f5f3f0;
  border-radius: 16px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-chat-input :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none;
  resize: none;
  padding: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #1a1a1a;
}

.ai-chat-input :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

.ai-chat-input :deep(.el-textarea__inner::placeholder) {
  color: #9a9590;
}

.input-toolbar-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.ai-send-icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  background: #1a1a1a;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-send-icon-btn:hover {
  background: #333;
}

.ai-send-icon-btn.is-disabled {
  background: #ccc;
  opacity: 0.6;
}

.ai-send-icon-btn .el-icon {
  font-size: 16px;
}

/* 新增文章弹窗样式 */
.add-article-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

.add-article-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.add-article-form .form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-article-form label {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.article-editor {
  min-height: 300px;
  padding: 16px;
  border: 1.5px solid #e8e4df;
  border-radius: 12px;
  background: #fff;
  font-size: 16px;
  line-height: 1.8;
  outline: none;
  overflow-y: auto;
}

.article-editor:focus {
  border-color: #c4a882;
}

.article-editor img {
  max-width: 100%;
  border-radius: 8px;
}

/* Markdown 样式 */
.ai-markdown {
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
}

.user-message-text {
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-markdown :deep(h1),
.ai-markdown :deep(h2),
.ai-markdown :deep(h3),
.ai-markdown :deep(h4) {
  margin-top: 16px;
  margin-bottom: 10px;
  color: #1a1a1a;
  font-weight: 600;
}

.ai-markdown :deep(strong) {
  color: #1a1a1a;
  font-weight: 600;
}

.ai-markdown :deep(code) {
  background: #f0ece7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.ai-markdown :deep(pre) {
  background: #f5f3f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.ai-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
}

.ai-markdown :deep(ul),
.ai-markdown :deep(ol) {
  padding-left: 24px;
  margin-bottom: 12px;
}

.ai-markdown :deep(li) {
  margin-bottom: 6px;
}

.ai-markdown :deep(blockquote) {
  border-left: 4px solid #c4a882;
  padding-left: 16px;
  margin: 12px 0;
  color: #6b6560;
}

.ai-markdown :deep(a) {
  color: #c4a882;
  text-decoration: none;
}

.ai-markdown :deep(a:hover) {
  text-decoration: underline;
}

.ai-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.ai-markdown :deep(th),
.ai-markdown :deep(td) {
  border: 1px solid #e8e4df;
  padding: 8px 12px;
  text-align: left;
}

.ai-markdown :deep(th) {
  background: #f5f3f0;
  font-weight: 600;
}
</style>


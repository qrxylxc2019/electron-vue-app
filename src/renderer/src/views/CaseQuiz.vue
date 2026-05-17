<template>
  <div class="case-quiz-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="case-content" v-if="currentMaterial">
      <!-- 案例进度 -->
      <div class="progress-bar">
        <span class="progress-text">案例 {{ currentMaterialIndex + 1 }} / {{ materials.length }}</span>
        <el-progress :percentage="materialProgressPercent" :show-text="false" />
      </div>

      <!-- 三栏布局主体 -->
      <div class="case-main-wrapper">
        <!-- 左侧：材料内容 -->
        <div class="case-left">
          <el-card class="material-card">
            <template #header>
              <div class="material-header">
                <el-tag type="info">案例材料</el-tag>
                <div class="header-actions">
                  <span class="material-title">{{ currentMaterial.title }}</span>
                  <el-button
                    v-if="!isEditingMaterial"
                    class="edit-btn"
                    size="small"
                    @click="startEditMaterial"
                    title="编辑材料"
                  >
                    <el-icon :size="18"><Edit /></el-icon>
                  </el-button>
                  <el-button
                    v-if="isEditingMaterial"
                    class="save-btn"
                    size="small"
                    type="primary"
                    @click="saveMaterialContent"
                    title="保存"
                  >
                    <el-icon :size="18"><CircleCheck /></el-icon>
                  </el-button>
                  <el-button
                    class="copy-btn"
                    size="small"
                    @click="copyCaseContent"
                    :title="copySuccess ? '已复制' : '复制材料与题目'"
                  >
                    <el-icon :size="18">
                      <Check v-if="copySuccess" style="color: #67c23a;" />
                      <DocumentCopy v-else />
                    </el-icon>
                  </el-button>
                </div>
              </div>
            </template>
            <div
              v-if="!isEditingMaterial"
              class="material-content markdown-body"
              v-html="renderMarkdown(currentMaterial.content)"
            ></div>
            <div
              v-else
              ref="materialEditorRef"
              class="material-editor"
              contenteditable="true"
              v-html="editingMaterialContent"
              @paste="handleEditorPaste"
            ></div>
          </el-card>
        </div>

        <!-- 中间：所有小题内容 -->
        <div class="case-center">
          <div v-if="caseQuestions.length > 0" class="all-questions-display">
            <el-card
              v-for="(q, idx) in caseQuestions"
              :key="q.id"
              class="question-card"
            >
              <template #header>
                <div class="question-header">
                  <el-tag type="warning">第 {{ q.question_number }} 小题</el-tag>
                </div>
              </template>

              <!-- 小题题目显示/编辑 -->
              <div v-if="!isEditingQuestionTitle(q.id)" class="question-title markdown-body" v-html="renderMarkdown(q.title)"></div>
              <div
                v-else
                :ref="el => setQuestionEditorRef(el, q.id)"
                class="question-editor"
                contenteditable="true"
                v-html="getQuestionEditHtml(q.title)"
                @paste="handleQuestionPaste($event, q.id)"
              ></div>

              <!-- 题目编辑按钮 -->
              <div class="question-edit-actions">
                <el-button
                  v-if="!isEditingQuestionTitle(q.id)"
                  class="edit-question-btn"
                  size="small"
                  text
                  @click="startEditQuestionTitle(q.id, q.title)"
                >
                  <el-icon :size="14"><EditPen /></el-icon>
                </el-button>
                <el-button
                  v-else
                  class="save-question-btn"
                  size="small"
                  type="primary"
                  text
                  @click="saveQuestionTitle(q.id)"
                >
                  <el-icon :size="14"><CircleCheck /></el-icon>
                </el-button>
              </div>

              <!-- 手写输入区域 -->
              <div v-if="showHandwrite" class="handwrite-area">
                <el-input
                  v-model="handwriteInputs[idx]"
                  type="textarea"
                  :rows="6"
                  :placeholder="`第 ${q.question_number} 小题手写作答...`"
                  class="handwrite-input"
                  resize="none"
                />
                
              </div>

              <!-- AI 讲解和答案按钮 -->
              <div class="action-buttons">
                <el-button
                  class="ai-explain-btn"
                  @click="openAIChatDrawerForQuestion(q)"
                >
                  <el-icon><Cpu /></el-icon>
                  AI讲解
                </el-button>
                <el-button
                  class="toggle-answer-btn"
                  @click="toggleAnswer(idx)"
                >
                  <el-icon><View v-if="!showAnswers[idx]" /><Hide v-else /></el-icon>
                  {{ showAnswers[idx] ? '隐藏答案' : '显示答案' }}
                </el-button>
                <el-button
                  class="clear-handwrite-btn"
                  size="small"
                  text
                  @click="handwriteInputs[idx] = ''"
                >
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
              </div>

              <!-- 答案区域 -->
              <div v-if="showAnswers[idx] && q.answer" class="answer-content">
                <el-divider />
                <div class="answer-label">参考答案：</div>
                <div
                  v-if="!isEditingQuestionAnswer(q.id)"
                  class="answer-text markdown-body"
                  v-html="renderMarkdown(q.answer)"
                ></div>
                <div
                  v-else
                  :ref="el => setAnswerEditorRef(el, q.id)"
                  class="answer-editor"
                  contenteditable="true"
                  v-html="getAnswerEditHtml(q.answer)"
                  @paste="handleAnswerPaste($event, q.id)"
                ></div>
                <div class="answer-edit-actions">
                  <el-button
                    v-if="!isEditingQuestionAnswer(q.id)"
                    class="edit-answer-btn"
                    size="small"
                    text
                    @click="startEditQuestionAnswer(q.id, q.answer)"
                  >
                    <el-icon :size="14"><EditPen /></el-icon>
                    编辑答案
                  </el-button>
                  <el-button
                    v-else
                    class="save-answer-btn"
                    size="small"
                    type="primary"
                    text
                    @click="saveQuestionAnswer(q.id)"
                  >
                    <el-icon :size="14"><CircleCheck /></el-icon>
                    保存答案
                  </el-button>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 无小题提示 -->
          <el-empty v-else description="该案例暂无小题" />
        </div>

        <!-- 右侧：大题操作按钮 -->
        <div class="case-right">
          <div class="right-actions">
            <el-button
              class="delete-material-btn"
              @click="deleteCurrentMaterial"
            >
              <el-icon><Delete /></el-icon> 删除案例
            </el-button>
            <el-button
              class="handwrite-btn"
              @click="showHandwrite = !showHandwrite"
            >
              <el-icon><EditPen /></el-icon>
              {{ showHandwrite ? '隐藏手写' : '显示手写' }}
            </el-button>
            <el-button
              class="next-material-btn"
              @click="nextMaterial"
            >
              {{ currentMaterialIndex === materials.length - 1 ? '重新开始' : '下一大题' }} <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无案例题目" />

    <!-- AI 讲解抽屉 -->
    <div
      class="ai-drawer-overlay"
      :class="{ 'show': aiDrawerVisible }"
      @click="closeAIChatDrawer"
    >
      <div
        class="ai-drawer"
        :class="{ 'show': aiDrawerVisible }"
        @click.stop
      >
        <div class="drawer-header">
          <h2>AI讲解</h2>
          <el-icon class="drawer-close" @click="closeAIChatDrawer"><Close /></el-icon>
        </div>
        <div class="drawer-content ai-chat-content" ref="aiChatContentRef">
          <!-- 对话列表 -->
          <div class="chat-messages" ref="aiChatMessagesRef">
            <div
              v-for="(msg, index) in aiChatMessages"
              :key="index"
              class="chat-message"
              :class="msg.role"
            >
              <div class="message-bubble">
                <div v-if="msg.provider" class="message-provider">{{ msg.provider }}</div>
                <!-- 用户消息保留换行格式，AI消息使用Markdown渲染 -->
                <div v-if="msg.role === 'user'" class="user-message-text">{{ msg.content }}</div>
                <div v-else class="ai-markdown" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <!-- 正在输入中 -->
            <div v-if="aiLoading" class="chat-message assistant">
              <div class="message-bubble loading-bubble">
                <el-icon class="is-loading"><Loading /></el-icon>
              </div>
            </div>
            <!-- 错误提示 -->
            <div v-if="aiError" class="chat-message assistant">
              <div class="message-bubble error-bubble">
                <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit;">{{ aiError }}</pre>
              </div>
            </div>
          </div>
        </div>
        <!-- 底部输入框 -->
        <div class="ai-chat-input-area">
          <div class="input-box">
            <el-input
              v-model="aiUserInput"
              type="textarea"
              :rows="2"
              placeholder="对这道题还有疑问？继续向 AI 提问..."
              class="ai-chat-input"
              @keydown.enter.prevent="sendAIChatMessage"
            />
            <div class="input-toolbar-bottom">
              <el-button
                class="ai-send-icon-btn"
                :loading="aiLoading"
                :disabled="!aiUserInput.trim()"
                @click="sendAIChatMessage"
              >
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { CaseMaterial, CaseQuestion } from '../types';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { marked } from 'marked';
import { EditPen, DocumentCopy, Check, Cpu, Close, Loading, Promotion, View, Hide, Delete, ArrowRight, Edit, CircleCheck } from '@element-plus/icons-vue';

const props = defineProps<{
  directoryId: string;
}>();

const router = useRouter();
const route = useRoute();
const directoryName = ref('');
const materials = ref<CaseMaterial[]>([]);
const caseQuestionsMap = ref<Record<number, CaseQuestion[]>>({});

// 当前案例索引
const currentMaterialIndex = ref(0);
// 是否显示答案（按小题索引存储）
const showAnswers = ref<Record<number, boolean>>({});
// 手写输入相关状态（默认显示，按小题索引存储）
const showHandwrite = ref(true);
const handwriteInputs = ref<Record<number, string>>({});

// 复制按钮状态
const copySuccess = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

// 材料编辑状态
const isEditingMaterial = ref(false);
const materialEditorRef = ref<HTMLDivElement | null>(null);
const editingMaterialContent = ref('');

// 小题编辑状态
const editingQuestionTitleId = ref<number | null>(null);
const editingQuestionAnswerId = ref<number | null>(null);
const questionEditorRefs = ref<Record<number, HTMLDivElement>>({});
const answerEditorRefs = ref<Record<number, HTMLDivElement>>({});

// AI 讲解相关状态
const aiDrawerVisible = ref(false);
const aiLoading = ref(false);
const aiError = ref('');
const aiProviderName = ref('');
const aiChatMessages = ref<Array<{role: 'user' | 'assistant'; content: string; provider?: string}>>([]);
const aiUserInput = ref('');
const aiChatContentRef = ref<HTMLDivElement | null>(null);
const aiChatMessagesRef = ref<HTMLDivElement | null>(null);
let aiUnsubscribers: (() => void)[] = [];

// 案例题 AI 讲解上下文（按 materialId_questionNumber 存储）
const caseAIContexts = ref<Record<string, Array<{role: string; content: string}>>>({});

// 当前 AI 讲解的小题
const currentAIQuestion = ref<CaseQuestion | null>(null);

// 当前案例材料
const currentMaterial = computed(() => {
  return materials.value[currentMaterialIndex.value] || null;
});

// 当前案例的所有小题
const caseQuestions = computed(() => {
  if (!currentMaterial.value) return [];
  return caseQuestionsMap.value[currentMaterial.value.id] || [];
});

// 案例进度百分比
const materialProgressPercent = computed(() => {
  if (materials.value.length === 0) return 0;
  return ((currentMaterialIndex.value + 1) / materials.value.length) * 100;
});

// Markdown 渲染
const renderMarkdown = (content: string) => {
  return marked.parse(content || '', { async: false }) as string;
};

// 复制案例材料与题目到剪贴板
const copyCaseContent = async () => {
  if (!currentMaterial.value) return;

  let text = `【案例材料】\n${currentMaterial.value.title}\n\n${currentMaterial.value.content}`;

  // 添加所有小题
  const questions = caseQuestions.value;
  if (questions.length > 0) {
    text += '\n\n【题目】';
    questions.forEach((q, index) => {
      text += `\n\n第 ${q.question_number} 小题：\n${q.title}`;
      if (q.answer) {
        text += `\n【参考答案】\n${q.answer}`;
      }
    });
  }

  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
    ElMessage.success('材料与题目已复制剪贴板');
  } catch (e) {
    console.error('复制失败:', e);
    ElMessage.error('复制失败');
  }
};

// 数组随机打乱
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 加载数据
const loadData = async () => {
  try {
    const dirId = parseInt(props.directoryId);
    const dirs = await window.electronAPI.getDirectories();
    const dir = dirs.find(d => d.id === dirId);
    if (dir) {
      directoryName.value = dir.name;
    }

    // 加载案例材料
    let mats = await window.electronAPI.getCaseMaterials(dirId);
    if (mats.length === 0) {
      ElMessage.warning('该科目暂无案例');
      return;
    }

    // 处理出题设置参数
    const mode = route.query.mode as string;
    const count = parseInt(route.query.count as string) || mats.length;
    const repeat = parseInt(route.query.repeat as string) || 1;

    // 先随机打乱
    mats = shuffleArray([...mats]);

    if (mode === 'random' && count < mats.length) {
      mats = mats.slice(0, count);
    }

    if (repeat > 1) {
      const baseMaterials = [...mats];
      const repeated: CaseMaterial[] = [];
      for (let i = 0; i < repeat; i++) {
        repeated.push(...shuffleArray([...baseMaterials]));
      }
      mats = repeated;
    }

    materials.value = mats;

    // 加载每个材料的小题
    caseQuestionsMap.value = {};
    for (const mat of mats) {
      const questions = await window.electronAPI.getCaseQuestions(mat.id);
      caseQuestionsMap.value[mat.id] = questions;
    }

    // 重置状态
    currentMaterialIndex.value = 0;
    showAnswers.value = {};
    showHandwrite.value = true;
    handwriteInputs.value = {};
  } catch (error) {
    ElMessage.error('加载案例失败');
    console.error(error);
  }
};

// 返回首页
const goBack = () => {
  router.push({ name: 'Home' });
};

// 切换指定小题的答案显示
const toggleAnswer = (index: number) => {
  showAnswers.value[index] = !showAnswers.value[index];
};

// 开始编辑材料
const startEditMaterial = () => {
  if (!currentMaterial.value) return;
  // 将当前材料内容转为 HTML：保留已有的 <img> 标签，其他文本转义后换行转 <br>
  const content = currentMaterial.value.content;
  // 先拆分出 <img ...> 标签和普通文本
  const parts = content.split(/(<img\s+[^>]+>)/gi);
  const htmlParts = parts.map((part) => {
    if (/^<img\s/i.test(part)) {
      // 保留 img 标签原样
      return part;
    }
    // 普通文本：转义 HTML 特殊字符，换行转 <br>
    return part
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  });
  editingMaterialContent.value = htmlParts.join('');
  isEditingMaterial.value = true;
};

// 处理编辑器粘贴事件（图片转 base64）
const handleEditorPaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  let hasImage = false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      hasImage = true;
      e.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64 && materialEditorRef.value) {
          const imgHtml = `<img src="${base64}" style="max-width:100%;" />`;
          document.execCommand('insertHTML', false, imgHtml);
        }
      };
      reader.readAsDataURL(blob);
    }
  }
};

// 提取编辑器中的 base64 图片并保存
const saveMaterialContent = async () => {
  if (!currentMaterial.value || !materialEditorRef.value) return;

  const editor = materialEditorRef.value;
  // 将 <br> 转回换行符，用于存储
  let html = editor.innerHTML;

  // 将 <br>, <br/> 转为 \n
  html = html.replace(/<br\s*\/?>/gi, '\n');
  // 将 <div>...<\/div> 转为 \n...（处理粘贴的富文本）
  html = html.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
  // 将 <p>...<\/p> 转为 \n...
  html = html.replace(/<p>/gi, '\n').replace(/<\/p>/gi, '');
  // 清理其他标签但保留 img
  html = html.replace(/<(?!img\s|\/img)[^>]+>/gi, '');
  // 解码 HTML 实体
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  let content = textarea.value;
  // 清理多余的换行
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  try {
    const success = await window.electronAPI.updateCaseMaterial(currentMaterial.value.id, content);
    if (success) {
      // 更新本地数据
      currentMaterial.value.content = content;
      isEditingMaterial.value = false;
      ElMessage.success('材料已保存');
    } else {
      ElMessage.error('保存失败');
    }
  } catch (error) {
    console.error('保存材料失败:', error);
    ElMessage.error('保存失败');
  }
};

// 下一大题
const nextMaterial = () => {
  if (currentMaterialIndex.value < materials.value.length - 1) {
    currentMaterialIndex.value++;
    showAnswers.value = {};
    showHandwrite.value = true;
    handwriteInputs.value = {};
    // 退出小题编辑模式
    editingQuestionTitleId.value = null;
    editingQuestionAnswerId.value = null;
  } else {
    ElMessage.success('本次题目已完成，即将重新开始');
    loadData();
  }
};

// 删除当前案例
const deleteCurrentMaterial = async () => {
  if (!currentMaterial.value) return;

  try {
    const id = currentMaterial.value.id;
    const success = await window.electronAPI.deleteCaseMaterial(id);

    if (success) {
      ElMessage.success('案例已删除');

      // 从本地数组中移除
      materials.value = materials.value.filter(m => m.id !== id);
      // 删除对应的小题缓存
      delete caseQuestionsMap.value[id];

      // 如果删除后没有案例了，返回上一页
      if (materials.value.length === 0) {
        ElMessage.info('该科目下已无任何案例');
        router.push({ name: 'Home' });
        return;
      }

      // 调整当前索引
      if (currentMaterialIndex.value >= materials.value.length) {
        currentMaterialIndex.value = materials.value.length - 1;
      }
      showAnswers.value = {};
      handwriteInputs.value = {};
    } else {
      ElMessage.error('删除失败');
    }
  } catch (error) {
    ElMessage.error('删除失败');
    console.error(error);
  }
};

onMounted(() => {
  loadData();
});

// 监听当前材料变化，清空 AI 状态和编辑状态
watch(currentMaterial, () => {
  aiDrawerVisible.value = false;
  aiLoading.value = false;
  aiError.value = '';
  aiProviderName.value = '';
  aiChatMessages.value = [];
  aiUserInput.value = '';
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];
  // 切换材料时退出编辑模式
  isEditingMaterial.value = false;
  editingMaterialContent.value = '';
  // 切换材料时退出小题编辑模式
  editingQuestionTitleId.value = null;
  editingQuestionAnswerId.value = null;
});

// 滚动到底部
const scrollToBottom = () => {
  setTimeout(() => {
    if (aiChatContentRef.value) {
      aiChatContentRef.value.scrollTop = aiChatContentRef.value.scrollHeight;
    }
  }, 50);
};


// 小题题目编辑相关方法
const isEditingQuestionTitle = (id: number) => {
  return editingQuestionTitleId.value === id;
};

const isEditingQuestionAnswer = (id: number) => {
  return editingQuestionAnswerId.value === id;
};

const setQuestionEditorRef = (el: any, id: number) => {
  if (el) {
    questionEditorRefs.value[id] = el;
  }
};

const setAnswerEditorRef = (el: any, id: number) => {
  if (el) {
    answerEditorRefs.value[id] = el;
  }
};

const getQuestionEditHtml = (title: string) => {
  if (!title) return '';
  const parts = title.split(/(<img\s+[^>]+>)/gi);
  const htmlParts = parts.map((part) => {
    if (/^<img\s/i.test(part)) {
      return part;
    }
    return part
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  });
  return htmlParts.join('');
};

const getAnswerEditHtml = (answer: string | null) => {
  if (!answer) return '';
  const parts = answer.split(/(<img\s+[^>]+>)/gi);
  const htmlParts = parts.map((part) => {
    if (/^<img\s/i.test(part)) {
      return part;
    }
    return part
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  });
  return htmlParts.join('');
};

const startEditQuestionTitle = (id: number, title: string) => {
  editingQuestionTitleId.value = id;
};

const startEditQuestionAnswer = (id: number, answer: string | null) => {
  editingQuestionAnswerId.value = id;
};

const handleQuestionPaste = (e: ClipboardEvent, id: number) => {
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
          const imgHtml = `<img src="${base64}" style="max-width:100%;" />`;
          document.execCommand('insertHTML', false, imgHtml);
        }
      };
      reader.readAsDataURL(blob);
    }
  }
};

const handleAnswerPaste = (e: ClipboardEvent, id: number) => {
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
          const imgHtml = `<img src="${base64}" style="max-width:100%;" />`;
          document.execCommand('insertHTML', false, imgHtml);
        }
      };
      reader.readAsDataURL(blob);
    }
  }
};

const saveQuestionTitle = async (id: number) => {
  const editor = questionEditorRefs.value[id];
  if (!editor) return;

  let html = editor.innerHTML;
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
  html = html.replace(/<p>/gi, '\n').replace(/<\/p>/gi, '');
  html = html.replace(/<(?!img\s|\/img)[^>]+>/gi, '');
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  let newTitle = textarea.value;
  newTitle = newTitle.replace(/\n{3,}/g, '\n\n').trim();

  // 查找小题
  const question = caseQuestions.value.find(q => q.id === id);
  if (!question) return;

  try {
    const success = await window.electronAPI.updateCaseQuestion(id, newTitle, question.answer || undefined);
    if (success) {
      question.title = newTitle;
      editingQuestionTitleId.value = null;
      ElMessage.success('题目已保存');
    } else {
      ElMessage.error('保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败');
    console.error(error);
  }
};

const saveQuestionAnswer = async (id: number) => {
  const editor = answerEditorRefs.value[id];
  if (!editor) return;

  let html = editor.innerHTML;
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
  html = html.replace(/<p>/gi, '\n').replace(/<\/p>/gi, '');
  html = html.replace(/<(?!img\s|\/img)[^>]+>/gi, '');
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  let newAnswer = textarea.value;
  newAnswer = newAnswer.replace(/\n{3,}/g, '\n\n').trim();

  // 查找小题
  const question = caseQuestions.value.find(q => q.id === id);
  if (!question) return;

  try {
    const success = await window.electronAPI.updateCaseQuestion(id, question.title, newAnswer);
    if (success) {
      question.answer = newAnswer;
      editingQuestionAnswerId.value = null;
      ElMessage.success('答案已保存');
    } else {
      ElMessage.error('保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败');
    console.error(error);
  }
};

// 打开 AI 讲解抽屉（针对指定小题）
const openAIChatDrawerForQuestion = async (q: CaseQuestion) => {
  if (!currentMaterial.value) return;
  aiDrawerVisible.value = true;

  const key = `${currentMaterial.value.id}_${q.question_number}`;

  // 如果已经有对话记录，恢复并滚动到底部
  if (caseAIContexts.value[key] && caseAIContexts.value[key].length > 0) {
    aiChatMessages.value = caseAIContexts.value[key].map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));
    scrollToBottom();
    return;
  }

  // 首次打开：先显示题目作为用户消息，再调用 AI
  let text = `【案例材料】\n${currentMaterial.value.title}\n\n${currentMaterial.value.content}`;
  text += `\n\n【第 ${q.question_number} 小题】\n${q.title}`;

  aiChatMessages.value.push({
    role: 'user',
    content: text
  });
  scrollToBottom();

  await callCaseAIExplain(false, '', q);
};

// 关闭 AI 讲解抽屉
const closeAIChatDrawer = () => {
  aiDrawerVisible.value = false;
};

// 发送 AI 对话消息（追问）
const sendAIChatMessage = async () => {
  if (!aiUserInput.value.trim() || aiLoading.value) return;

  const userMessage = aiUserInput.value.trim();
  aiUserInput.value = '';

  // 添加用户消息到对话列表
  aiChatMessages.value.push({
    role: 'user',
    content: userMessage
  });
  scrollToBottom();

  await callCaseAIExplain(true, userMessage);
};

// 调用 AI 讲解（支持首次和追问）
const callCaseAIExplain = async (isFollowUp = false, userMessage = '', question?: CaseQuestion) => {
  if (!currentMaterial.value) return;
  const q = question || currentAIQuestion.value;
  if (!q) return;

  aiLoading.value = true;
  aiError.value = '';
  aiProviderName.value = '';

  // 清理之前的监听器
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];

  let assistantContent = '';
  let currentProvider = '';

  // 设置厂商切换监听
  const unsubProviderSwitch = window.electronAPI.onAIProviderSwitch((provider: string) => {
    currentProvider = provider === 'modelspace' ? 'ModelSpace' : provider === 'deepseek' ? 'DeepSeek' : provider;
    aiProviderName.value = currentProvider;
    const lastMsg = aiChatMessages.value[aiChatMessages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.provider = currentProvider;
    }
  });
  aiUnsubscribers.push(unsubProviderSwitch);

  // 设置流式监听
  const unsubChunk = window.electronAPI.onAIStreamChunk((content: string) => {
    assistantContent += content;
    const lastMsg = aiChatMessages.value[aiChatMessages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = assistantContent;
      if (currentProvider && !lastMsg.provider) {
        lastMsg.provider = currentProvider;
      }
    } else {
      aiChatMessages.value.push({
        role: 'assistant',
        content: assistantContent,
        provider: currentProvider || undefined
      });
    }
    scrollToBottom();
  });
  aiUnsubscribers.push(unsubChunk);

  const unsubDone = window.electronAPI.onAIStreamDone(() => {
    aiLoading.value = false;
    aiProviderName.value = '';
    // 保存对话上下文
    const key = `${currentMaterial.value!.id}_${q.question_number}`;
    caseAIContexts.value[key] = aiChatMessages.value.map(m => ({
      role: m.role,
      content: m.content
    }));
  });
  aiUnsubscribers.push(unsubDone);

  const unsubError = window.electronAPI.onAIStreamError((error: string) => {
    aiLoading.value = false;
    aiProviderName.value = '';
    aiError.value = error;
  });
  aiUnsubscribers.push(unsubError);

  try {
    const providerOrder = getProviderOrder();
    currentProvider = providerOrder[0] === 'modelspace' ? 'ModelSpace' : providerOrder[0] === 'deepseek' ? 'DeepSeek' : providerOrder[0];
    aiProviderName.value = currentProvider;

    const result = await window.electronAPI.explainCaseQuestion({
      materialTitle: currentMaterial.value.title,
      materialContent: currentMaterial.value.content,
      questionNumber: q.question_number,
      questionTitle: q.title,
      answer: q.answer || '',
      isFollowUp,
      userMessage,
      providerOrder,
    });

    if (!result.success && result.error) {
      aiLoading.value = false;
      aiProviderName.value = '';
      aiError.value = result.error;
    }
  } catch (err: any) {
    aiLoading.value = false;
    aiProviderName.value = '';
    aiError.value = err.message || '调用失败';
  }
};

// 获取厂商优先级
const getProviderOrder = (): string[] => {
  try {
    const stored = localStorage.getItem('apiProviderOrder');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return ['deepseekLocal', 'modelspace', 'deepseek'];
};
</script>

<style scoped>
.case-quiz-container {
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

:deep(.el-page-header__back) {
  font-size: 18px;
}

:deep(.el-page-header__title) {
  font-size: 18px;
}

.case-content {
  margin-top: 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.progress-bar {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.progress-text {
  display: block;
  margin-bottom: 8px;
  color: #6b6560;
  font-size: 14px;
  font-weight: 500;
}

:deep(.el-progress-bar__outer) {
  background-color: #e8e4df;
  border-radius: 4px;
  height: 6px !important;
}

:deep(.el-progress-bar__inner) {
  background-color: #c4a882;
  border-radius: 4px;
}

.case-main-wrapper {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 20px;
}

.case-left {
  width: 38%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  -ms-overflow-style: auto;
}

.case-left::-webkit-scrollbar {
  width: 6px;
}

.case-left::-webkit-scrollbar-thumb {
  background-color: #c4a882;
  border-radius: 3px;
}

.case-center {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.case-center::-webkit-scrollbar {
  display: none;
}

.case-right {
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

.delete-material-btn {
  background-color: #F56C6C;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 18px 20px;
  font-size: 16px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
  width: 100%;
}

.delete-material-btn:hover {
  background-color: #f78989;
}

.next-material-btn {
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

.next-material-btn:hover:not(:disabled) {
  background-color: #333;
}

.next-material-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.material-section {
  flex-shrink: 0;
}

.material-card {
  border-radius: 16px;
  border: 1px solid #e8e4df;
  background: #fff;
  box-shadow: none;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #f0ece7;
  padding: 16px 20px;
}

.material-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
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

.edit-btn {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #9a9590;
  font-size: 18px;
}

.edit-btn:hover {
  color: #409eff;
  background: #f5f3f0;
}

.save-btn {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #409eff;
  font-size: 18px;
}

.save-btn:hover {
  color: #67c23a;
  background: #f5f3f0;
}

.material-editor {
  font-size: 22px;
  color: #4a4540;
  line-height: 1.8;
  padding: 8px 0;
  min-height: 200px;
  border: 2px solid #c4a882;
  border-radius: 12px;
  padding: 16px;
  background: #fdfbf8;
  outline: none;
}

.material-editor:focus {
  border-color: #a08060;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2);
}

.material-editor img {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

.material-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.material-content {
  font-size: 22px;
  color: #4a4540;
  line-height: 1.8;
  padding: 8px 0;
}

/* Markdown 样式 */
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

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
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

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e8e4df;
  margin: 20px 0;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e8e4df;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f5f3f0;
  font-weight: 600;
}

.question-section {
  flex-shrink: 0;
}

.question-card {
  border-radius: 16px;
  border: 1px solid #e8e4df;
  background: #fff;
  box-shadow: none;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-count {
  color: #9a9590;
  font-size: 14px;
}

.question-title {
  font-size: 22px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 20px;
  line-height: 1.6;
}

.answer-section {
  margin-top: 8px;
}

.toggle-answer-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 18px 24px;
  font-size: 18px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
}

.toggle-answer-btn:hover {
  background-color: #333;
}

.answer-content {
  margin-top: 16px;
}

.answer-label {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.answer-text {
  font-size: 20px;
  color: #4a4540;
  line-height: 1.8;
  white-space: pre-wrap;
  background: #f5f7f0;
  padding: 16px;
  border-radius: 10px;
}

.question-edit-actions,
.answer-edit-actions {
  margin: 8px 0;
  display: flex;
  gap: 8px;
}

.question-editor,
.answer-editor {
  padding: 16px;
  border: 2px solid #c4a882;
  border-radius: 14px;
  background: #fff;
  min-height: 80px;
  outline: none;
  font-size: 18px;
  line-height: 1.6;
  color: #1a1a1a;
}

.question-editor img,
.answer-editor img {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

.edit-question-btn,
.save-question-btn,
.edit-answer-btn,
.save-answer-btn {
  padding: 6px 12px;
  min-height: 32px;
}

.handwrite-area {
  margin: 16px 0;
}

.handwrite-input :deep(.el-textarea__inner) {
  font-size: 20px;
  line-height: 1.8;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid #c4a882;
  background: #fdfbf8;
  color: #1a1a1a;
}

.handwrite-input :deep(.el-textarea__inner:focus) {
  border-color: #a08060;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2);
}

.clear-handwrite-btn {
  color: #fff;
  background-color: #F56C6C;
  border: none;
  border-radius: 12px;
  padding: 18px 24px;
  font-size: 18px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
}

.clear-handwrite-btn:hover {
  background-color: #f78989;
}

.all-questions-display {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.all-questions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 0;
  flex-shrink: 0;
}

.question-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.question-item:hover {
  transform: translateY(-2px);
}

:deep(.el-tag) {
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 8px;
}

/* AI 讲解按钮 */
.action-buttons {
  display: flex;
  gap: 12px;
  margin: 16px 0;
}

.ai-explain-btn {
  background-color: #4a7c59;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
}

.ai-explain-btn:hover {
  background-color: #3d6b4a;
}

/* AI 讲解抽屉样式 */
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
  width: 90%;
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
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e4df;
  flex-shrink: 0;
}

.drawer-header h2 {
  margin: 0;
  font-size: 18px;
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
  padding: 20px;
  display: flex;
  flex-direction: column;
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

.chat-message.assistant .message-bubble {
  max-width: 100%;
}

.message-provider {
  font-size: 12px;
  color: #9a9590;
  margin-bottom: 4px;
}

.user-message-text {
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-markdown {
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
}

.loading-bubble {
  padding: 12px 16px;
}

.error-bubble {
  background: #fef0f0;
  color: #f56c6c;
  padding: 12px 16px;
  border-radius: 8px;
}

/* 输入框区域 */
.ai-chat-input-area {
  padding: 16px 20px;
  border-top: 1px solid #e8e4df;
  background: #fff;
  flex-shrink: 0;
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
  justify-content: flex-end;
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
</style>

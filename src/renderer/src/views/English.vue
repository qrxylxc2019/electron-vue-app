<template>
  <div class="english-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="english-content" v-if="currentMaterial">
      <!-- 案例进度 -->
      <div class="progress-bar">
        <span class="progress-text">阅读 {{ currentMaterialIndex + 1 }} / {{ materials.length }}</span>
        <el-progress :percentage="materialProgressPercent" :show-text="false" />
      </div>

      <!-- 三栏布局主体 -->
      <div class="english-main-wrapper">
        <!-- 左侧：阅读材料 -->
        <div class="english-left">
          <el-card class="material-card">
            <template #header>
              <div class="material-header">
                <el-tag type="info">阅读材料</el-tag>
                <div class="header-actions">
                  <span class="material-title">{{ currentMaterial.title || '阅读理解' }}</span>
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
                    @click="copyMaterialContent"
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
              ref="materialContentEditorRef"
              class="material-editor"
              contenteditable="true"
              v-html="editingMaterialContent"
              @paste="handleEditorPaste"
            ></div>
          </el-card>
        </div>

        <!-- 中间：所有小题内容 -->
        <div class="english-center" ref="englishCenterRef">
          <div v-if="currentQuestions.length > 0" class="all-questions-display">
            <el-card
              v-for="(q, idx) in currentQuestions"
              :key="q.id"
              class="question-card"
            >
              <template #header>
                <div class="question-header">
                  <el-tag type="warning">第 {{ q.question_number }} 题</el-tag>
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

              <!-- 选项 -->
              <div class="options-list">
                <div
                  v-for="(option, optIdx) in [q.option_a, q.option_b, q.option_c, q.option_d]"
                  :key="optIdx"
                  class="option-item"
                  :class="{
                    'selected': selectedAnswers[q.id] === optIdx,
                    'correct': showAnswers[q.id] && optIdx === getCorrectIndex(q.correct_answer),
                    'wrong': showAnswers[q.id] && selectedAnswers[q.id] === optIdx && optIdx !== getCorrectIndex(q.correct_answer)
                  }"
                  @click="selectAnswer(q.id, optIdx, q.correct_answer)"
                >
                  <span class="option-label">{{ ['A', 'B', 'C', 'D'][optIdx] }}.</span>
                  <span class="option-text">{{ option }}</span>
                </div>
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
                  class="delete-question-btn"
                  @click="confirmDeleteQuestion(q)"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>

              <!-- 答案区域 -->
              <div v-if="showAnswers[q.id]" class="answer-content">
                <el-divider />
                <div class="answer-label">正确答案：{{ q.correct_answer }}</div>
                <div
                  v-if="!isEditingQuestionExplanation(q.id)"
                  class="answer-text markdown-body"
                  v-html="renderMarkdown(q.explanation || '暂无解析')"
                ></div>
                <div
                  v-else
                  :ref="el => setExplanationEditorRef(el, q.id)"
                  class="answer-editor"
                  contenteditable="true"
                  v-html="getExplanationEditHtml(q.explanation || '')"
                  @paste="handleExplanationPaste($event, q.id)"
                ></div>
                <div class="answer-edit-actions">
                  <el-button
                    v-if="!isEditingQuestionExplanation(q.id)"
                    class="edit-answer-btn"
                    size="small"
                    text
                    @click="startEditQuestionExplanation(q.id, q.explanation || '')"
                  >
                    <el-icon :size="14"><EditPen /></el-icon>
                    编辑解析
                  </el-button>
                  <el-button
                    v-else
                    class="save-answer-btn"
                    size="small"
                    type="primary"
                    text
                    @click="saveQuestionExplanation(q.id)"
                  >
                    <el-icon :size="14"><CircleCheck /></el-icon>
                    保存解析
                  </el-button>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 无小题提示 -->
          <el-empty v-else description="该阅读材料暂无小题" />
        </div>

        <!-- 右侧：大题操作按钮 -->
        <div class="english-right">
          <div class="right-actions">
            <el-button
              class="add-material-btn"
              type="primary"
              @click="openAddMaterialDialog"
            >
              <el-icon><Plus /></el-icon> 新增题目
            </el-button>
            <el-button
              class="delete-material-btn"
              @click="deleteCurrentMaterial"
            >
              <el-icon><Delete /></el-icon> 删除阅读
            </el-button>
            <el-button
              class="next-material-btn"
              @click="nextMaterial"
            >
              {{ currentMaterialIndex === materials.length - 1 ? '重新开始' : '下一篇' }} <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无阅读材料" />

    <!-- 新增题目弹窗 -->
    <el-dialog
      v-model="addMaterialDialogVisible"
      title="新增英语阅读题"
      width="1100px"
      :close-on-click-modal="true"
      destroy-on-close
      class="add-material-dialog"
    >
      <div class="add-material-form">
        <div class="form-item editor-row">
          <div class="editor-left">
            <el-input
              v-model="newMaterialContent"
              type="textarea"
              :rows="24"
              class="batch-import-textarea"
              placeholder="请按格式粘贴内容..."
            />
          </div>
          <div class="editor-right">
            <div class="format-tip-card">
              <div class="format-content">
                <pre>【材料】
阅读材料内容...
【/材料】

【题目1】
题干：...
选项A：...
选项B：...
选项C：...
选项D：...
答案：A
解析：...
【/题目1】

====================

【材料】
阅读材料内容...
【/材料】

【题目1】
题干：...
选项A：...
选项B：...
选项C：...
选项D：...
答案：A
解析：...
【/题目1】</pre>
              </div>
              <el-button
                class="copy-format-btn"
                type="primary"
                size="small"
                @click="copyFormatTemplate"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制格式
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="addMaterialDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNewMaterial">保存</el-button>
      </template>
    </el-dialog>

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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { marked } from 'marked';
import {
  ArrowRight, Plus, Document, EditPen, DocumentCopy, Check,
  Cpu, Close, Loading, Promotion, View, Hide, Delete, Edit, CircleCheck
} from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();
const directoryId = computed(() => parseInt(route.params.directoryId as string));
const directoryName = ref('考研英语');

// 阅读材料列表
const materials = ref<any[]>([]);
const currentMaterialIndex = ref(0);
const currentMaterial = computed(() => materials.value[currentMaterialIndex.value] || null);

// 当前材料的题目
const currentQuestions = computed(() => {
  if (!currentMaterial.value) return [];
  return currentMaterial.value.questions || [];
});

// 进度
const materialProgressPercent = computed(() => {
  if (materials.value.length === 0) return 0;
  return Math.round(((currentMaterialIndex.value + 1) / materials.value.length) * 100);
});

// 答题状态
const selectedAnswers = ref<Record<number, number>>({});
const showAnswers = ref<Record<number, boolean>>({});

// 复制按钮状态
const copySuccess = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

// 材料编辑状态
const isEditingMaterial = ref(false);
const materialContentEditorRef = ref<HTMLDivElement | null>(null);
const editingMaterialContent = ref('');

// 小题编辑状态
const editingQuestionTitleId = ref<number | null>(null);
const editingQuestionExplanationId = ref<number | null>(null);
const questionEditorRefs = ref<Record<number, HTMLDivElement>>({});
const explanationEditorRefs = ref<Record<number, HTMLDivElement>>({});

// AI 讲解相关状态
const aiDrawerVisible = ref(false);
const aiLoading = ref(false);
const aiError = ref('');
const aiChatMessages = ref<Array<{role: 'user' | 'assistant'; content: string; provider?: string}>>([]);
const aiUserInput = ref('');
const aiChatContentRef = ref<HTMLDivElement | null>(null);
let aiUnsubscribers: (() => void)[] = [];
const englishAIContexts = ref<Record<string, Array<{role: string; content: string}>>>({});
const currentAIQuestion = ref<any | null>(null);

// 新增题目弹窗状态
const addMaterialDialogVisible = ref(false);
const newMaterialTitle = ref('');
const newMaterialContent = ref('');
const addMaterialEditorRef = ref<HTMLDivElement | null>(null);

// 获取正确答案索引
const getCorrectIndex = (answer: string) => {
  return ['A', 'B', 'C', 'D'].indexOf(answer);
};

// 选择答案（立即判断对错）
const selectAnswer = (questionId: number, optionIdx: number, correctAnswer: string) => {
  if (showAnswers.value[questionId]) return;
  selectedAnswers.value[questionId] = optionIdx;
  showAnswers.value[questionId] = true;

  const correctIdx = getCorrectIndex(correctAnswer);
  if (optionIdx === correctIdx) {
    ElMessage.success('回答正确！');
  } else {
    ElMessage.error('回答错误');
  }
};

// 下一篇材料
const nextMaterial = () => {
  if (materials.value.length === 0) return;
  currentMaterialIndex.value = (currentMaterialIndex.value + 1) % materials.value.length;
  selectedAnswers.value = {};
  showAnswers.value = {};
};

// Markdown 渲染
const renderMarkdown = (content: string) => {
  return marked.parse(content || '', { async: false }) as string;
};

// 复制阅读材料与题目到剪贴板
const copyMaterialContent = async () => {
  if (!currentMaterial.value) return;
  let text = `【阅读材料】\n${currentMaterial.value.title}\n\n${currentMaterial.value.content}`;
  const questions = currentQuestions.value;
  if (questions.length > 0) {
    text += '\n\n【题目】';
    questions.forEach((q: any) => {
      text += `\n\n第 ${q.question_number} 题：\n${q.title}`;
      text += `\nA. ${q.option_a}\nB. ${q.option_b}\nC. ${q.option_c}\nD. ${q.option_d}`;
      text += `\n【正确答案】${q.correct_answer}`;
      if (q.explanation) text += `\n【解析】\n${q.explanation}`;
    });
  }
  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copySuccess.value = false; }, 2000);
    ElMessage.success('材料与题目已复制剪贴板');
  } catch (e) {
    ElMessage.error('复制失败');
  }
};

// 加载数据
const loadData = async () => {
  try {
    const result = await window.electronAPI.getEnglishReadings(directoryId.value);
    if (result.success && result.materials) {
      materials.value = result.materials;
      currentMaterialIndex.value = 0;
      selectedAnswers.value = {};
      showAnswers.value = {};
    }
  } catch (error) {
    ElMessage.error('加载阅读材料失败');
  }
};

// 返回首页
const goBack = () => {
  router.push({ name: 'Home' });
};

// 开始编辑材料
const startEditMaterial = () => {
  if (!currentMaterial.value) return;
  const content = currentMaterial.value.content;
  const parts = content.split(/(<img\s+[^>]+>)/gi);
  const htmlParts = parts.map((part: string) => {
    if (/^<img\s/i.test(part)) return part;
    return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  });
  editingMaterialContent.value = htmlParts.join('');
  isEditingMaterial.value = true;
};

// 处理编辑器粘贴事件（图片转 base64）
const handleEditorPaste = (e: ClipboardEvent) => {
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
        if (base64 && materialContentEditorRef.value) {
          document.execCommand('insertHTML', false, `<img src="${base64}" style="max-width:100%;" />`);
        }
      };
      reader.readAsDataURL(blob);
    }
  }
};

// 保存材料内容
const saveMaterialContent = async () => {
  if (!currentMaterial.value || !materialContentEditorRef.value) return;
  const editor = materialContentEditorRef.value;
  let html = editor.innerHTML;
  html = html.replace(/<br\s*\/?>/gi, '\n').replace(/<div>/gi, '\n').replace(/<\/div>/gi, '')
    .replace(/<p>/gi, '\n').replace(/<\/p>/gi, '').replace(/<(?!img\s|\/img)[^>]+>/gi, '');
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  let content = textarea.value.replace(/\n{3,}/g, '\n\n').trim();

  try {
    const result = await window.electronAPI.updateEnglishReading(currentMaterial.value.id, {
      title: currentMaterial.value.title, content
    });
    if (result.success) {
      currentMaterial.value.content = content;
      isEditingMaterial.value = false;
      ElMessage.success('材料已保存');
    } else {
      ElMessage.error(result.error || '保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

// 删除当前阅读材料
const deleteCurrentMaterial = async () => {
  if (!currentMaterial.value) return;
  try {
    await ElMessageBox.confirm('确定要删除这篇阅读材料吗？删除后不可恢复！', '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' });
    const id = currentMaterial.value.id;
    console.log('[English] 删除材料, id=', id);
    const result = await window.electronAPI.deleteEnglishReading(id);
    console.log('[English] 删除材料结果:', result);
    if (result.success) {
      ElMessage.success('阅读材料已删除');
      materials.value = materials.value.filter(m => m.id !== id);
      if (materials.value.length === 0) { ElMessage.info('该科目下已无任何阅读材料'); return; }
      if (currentMaterialIndex.value >= materials.value.length) {
        currentMaterialIndex.value = materials.value.length - 1;
      }
      selectedAnswers.value = {}; showAnswers.value = {};
    } else {
      ElMessage.error(result.error || '删除失败');
    }
  } catch (error: any) {
    console.error('[English] 删除材料异常:', error);
    if (error !== 'cancel') ElMessage.error('删除失败: ' + (error?.message || error));
  }
};

// 删除小题
const confirmDeleteQuestion = async (q: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这道小题吗？删除后不可恢复！', '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' });
    console.log('[English] 删除小题, id=', q.id);
    const result = await window.electronAPI.deleteEnglishQuestion(q.id);
    console.log('[English] 删除小题结果:', result);
    if (result.success) {
      ElMessage.success('小题已删除');
      if (currentMaterial.value && currentMaterial.value.questions) {
        currentMaterial.value.questions = currentMaterial.value.questions.filter(
          (item: any) => item.id !== q.id
        );
      }
      selectedAnswers.value = {}; showAnswers.value = {};
    } else {
      ElMessage.error(result.error || '删除失败');
    }
  } catch (error: any) {
    console.error('[English] 删除小题异常:', error);
    if (error !== 'cancel') ElMessage.error('删除失败: ' + (error?.message || error));
  }
};

// 打开新增题目弹窗
const openAddMaterialDialog = () => {
  addMaterialDialogVisible.value = true;
  newMaterialContent.value = '';
};

// 复制格式模板
const copyFormatTemplate = async () => {
  const template = `【材料】
阅读材料内容...
【/材料】

【题目1】
题干：...
选项A：...
选项B：...
选项C：...
选项D：...
答案：A
解析：...
【/题目1】

====================

【材料】
阅读材料内容...
【/材料】

【题目1】
题干：...
选项A：...
选项B：...
选项C：...
选项D：...
答案：A
解析：...
【/题目1】`;
  try {
    await navigator.clipboard.writeText(template);
    ElMessage.success('格式已复制到剪贴板');
  } catch (e) {
    ElMessage.error('复制失败');
  }
};

// 解析单个材料块
const parseMaterialBlock = (text: string) => {
  const materialMatch = text.match(/【材料】\s*([\s\S]*?)\s*【\/材料】/);
  if (!materialMatch) return null;

  const content = materialMatch[1].trim();
  const questions: any[] = [];
  const questionRegex = /【题目(\d+)】\s*([\s\S]*?)\s*【\/题目\1】/g;
  let match;
  while ((match = questionRegex.exec(text)) !== null) {
    const questionText = match[2];
    const titleMatch = questionText.match(/题干：(.*)/);
    const optionAMatch = questionText.match(/选项A：(.*)/);
    const optionBMatch = questionText.match(/选项B：(.*)/);
    const optionCMatch = questionText.match(/选项C：(.*)/);
    const optionDMatch = questionText.match(/选项D：(.*)/);
    const answerMatch = questionText.match(/答案：(.*)/);
    const explanationMatch = questionText.match(/解析：([\s\S]*?)(?=【|$)/);

    if (titleMatch && answerMatch) {
      questions.push({
        question_number: parseInt(match[1]),
        title: titleMatch[1].trim(),
        option_a: optionAMatch?.[1].trim() || '',
        option_b: optionBMatch?.[1].trim() || '',
        option_c: optionCMatch?.[1].trim() || '',
        option_d: optionDMatch?.[1].trim() || '',
        correct_answer: answerMatch[1].trim(),
        explanation: explanationMatch?.[1].trim() || ''
      });
    }
  }

  return { content, questions };
};

// 保存新题目（支持多材料块）
const saveNewMaterial = async () => {
  const text = newMaterialContent.value.trim();
  if (!text) {
    ElMessage.warning('请输入阅读内容');
    return;
  }

  // 按 ==================== 分割多个材料块
  const blocks = text.split(/={3,}/).map(b => b.trim()).filter(b => b);
  if (blocks.length === 0) {
    ElMessage.warning('未找到有效内容');
    return;
  }

  let totalQuestions = 0;
  let lastMaterialId: number | null = null;

  try {
    for (const block of blocks) {
      const parsed = parseMaterialBlock(block);
      if (!parsed) {
        ElMessage.warning('部分格式不正确，已跳过');
        continue;
      }

      const data = JSON.parse(JSON.stringify({
        directory_id: directoryId.value,
        title: '',
        content: parsed.content,
        questions: parsed.questions
      }));

      const result = await window.electronAPI.addEnglishReading(data);
      if (result.success) {
        totalQuestions += parsed.questions.length;
        if (result.materialId) lastMaterialId = result.materialId;
      }
    }

    ElMessage.success(`成功保存 ${blocks.length} 篇阅读，共 ${totalQuestions} 道题目`);
    addMaterialDialogVisible.value = false;
    newMaterialContent.value = '';
    await loadData();

    if (lastMaterialId) {
      const idx = materials.value.findIndex(m => m.id === lastMaterialId);
      if (idx >= 0) currentMaterialIndex.value = idx;
    }
  } catch (error) {
    ElMessage.error('保存失败');
    console.error(error);
  }
};

// 小题题目编辑相关方法
const isEditingQuestionTitle = (id: number) => editingQuestionTitleId.value === id;
const isEditingQuestionExplanation = (id: number) => editingQuestionExplanationId.value === id;

const setQuestionEditorRef = (el: any, id: number) => { if (el) questionEditorRefs.value[id] = el; };
const setExplanationEditorRef = (el: any, id: number) => { if (el) explanationEditorRefs.value[id] = el; };

const getQuestionEditHtml = (title: string) => {
  if (!title) return '';
  const parts = title.split(/(<img\s+[^>]+>)/gi);
  return parts.map((part) => {
    if (/^<img\s/i.test(part)) return part;
    return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }).join('');
};

const getExplanationEditHtml = (explanation: string) => {
  if (!explanation) return '';
  const parts = explanation.split(/(<img\s+[^>]+>)/gi);
  return parts.map((part) => {
    if (/^<img\s/i.test(part)) return part;
    return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }).join('');
};

const startEditQuestionTitle = (id: number, title: string) => { editingQuestionTitleId.value = id; };
const startEditQuestionExplanation = (id: number, explanation: string) => { editingQuestionExplanationId.value = id; };

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
        if (base64) document.execCommand('insertHTML', false, `<img src="${base64}" style="max-width:100%;" />`);
      };
      reader.readAsDataURL(blob);
    }
  }
};

const handleExplanationPaste = (e: ClipboardEvent, id: number) => {
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
        if (base64) document.execCommand('insertHTML', false, `<img src="${base64}" style="max-width:100%;" />`);
      };
      reader.readAsDataURL(blob);
    }
  }
};

const saveQuestionTitle = async (id: number) => {
  const editor = questionEditorRefs.value[id];
  if (!editor) return;
  let html = editor.innerHTML;
  html = html.replace(/<br\s*\/?>/gi, '\n').replace(/<div>/gi, '\n').replace(/<\/div>/gi, '')
    .replace(/<p>/gi, '\n').replace(/<\/p>/gi, '').replace(/<(?!img\s|\/img)[^>]+>/gi, '');
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  let newTitle = textarea.value.replace(/\n{3,}/g, '\n\n').trim();

  const question = currentQuestions.value.find((q: any) => q.id === id);
  if (!question) return;

  try {
    const result = await window.electronAPI.updateEnglishQuestion(id, {
      title: newTitle, explanation: question.explanation
    });
    if (result.success) {
      question.title = newTitle;
      editingQuestionTitleId.value = null;
      ElMessage.success('题目已保存');
    } else {
      ElMessage.error(result.error || '保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

const saveQuestionExplanation = async (id: number) => {
  const editor = explanationEditorRefs.value[id];
  if (!editor) return;
  let html = editor.innerHTML;
  html = html.replace(/<br\s*\/?>/gi, '\n').replace(/<div>/gi, '\n').replace(/<\/div>/gi, '')
    .replace(/<p>/gi, '\n').replace(/<\/p>/gi, '').replace(/<(?!img\s|\/img)[^>]+>/gi, '');
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  let newExplanation = textarea.value.replace(/\n{3,}/g, '\n\n').trim();

  const question = currentQuestions.value.find((q: any) => q.id === id);
  if (!question) return;

  try {
    const result = await window.electronAPI.updateEnglishQuestion(id, {
      title: question.title, explanation: newExplanation
    });
    if (result.success) {
      question.explanation = newExplanation;
      editingQuestionExplanationId.value = null;
      ElMessage.success('解析已保存');
    } else {
      ElMessage.error(result.error || '保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

// 打开 AI 讲解抽屉
const openAIChatDrawerForQuestion = async (q: any) => {
  if (!currentMaterial.value) return;
  aiDrawerVisible.value = true;
  currentAIQuestion.value = q;

  const key = `${currentMaterial.value.id}_${q.question_number}`;
  if (englishAIContexts.value[key] && englishAIContexts.value[key].length > 0) {
    aiChatMessages.value = englishAIContexts.value[key].map(m => ({
      role: m.role as 'user' | 'assistant', content: m.content
    }));
    scrollToBottom();
    return;
  }

  let text = `【阅读材料】\n${currentMaterial.value.title}\n\n${currentMaterial.value.content}`;
  text += `\n\n【第 ${q.question_number} 题】\n${q.title}`;
  text += `\nA. ${q.option_a}\nB. ${q.option_b}\nC. ${q.option_c}\nD. ${q.option_d}`;

  aiChatMessages.value.push({ role: 'user', content: text });
  scrollToBottom();

  await callEnglishAIExplain(false, '', q);
};

// 关闭 AI 讲解抽屉
const closeAIChatDrawer = () => { aiDrawerVisible.value = false; };

// 发送 AI 对话消息（追问）
const sendAIChatMessage = async () => {
  if (!aiUserInput.value.trim() || aiLoading.value) return;
  const userMessage = aiUserInput.value.trim();
  aiUserInput.value = '';
  aiChatMessages.value.push({ role: 'user', content: userMessage });
  scrollToBottom();
  await callEnglishAIExplain(true, userMessage);
};

// 滚动到底部
const scrollToBottom = () => {
  setTimeout(() => {
    if (aiChatContentRef.value) {
      aiChatContentRef.value.scrollTop = aiChatContentRef.value.scrollHeight;
    }
  }, 50);
};

// 调用 AI 讲解
const callEnglishAIExplain = async (isFollowUp = false, userMessage = '', question?: any) => {
  if (!currentMaterial.value) return;
  const q = question || currentAIQuestion.value;
  if (!q) return;

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

  const unsubDone = window.electronAPI.onAIStreamDone(() => {
    aiLoading.value = false;
    const key = `${currentMaterial.value!.id}_${q.question_number}`;
    englishAIContexts.value[key] = aiChatMessages.value.map(m => ({ role: m.role, content: m.content }));
  });
  aiUnsubscribers.push(unsubDone);

  const unsubError = window.electronAPI.onAIStreamError((error: string) => {
    aiLoading.value = false;
    aiError.value = error;
  });
  aiUnsubscribers.push(unsubError);

  try {
    const providerOrder = getProviderOrder();
    const result = await window.electronAPI.explainEnglishQuestion({
      materialTitle: currentMaterial.value.title,
      materialContent: currentMaterial.value.content,
      questionNumber: q.question_number,
      questionTitle: q.title,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctAnswer: q.correct_answer,
      explanation: q.explanation || '',
      isFollowUp,
      userMessage,
      providerOrder,
    });

    if (!result.success && result.error) {
      aiLoading.value = false;
      aiError.value = result.error;
    }
  } catch (err: any) {
    aiLoading.value = false;
    aiError.value = err.message || '调用失败';
  }
};

// 获取厂商优先级
const getProviderOrder = (): string[] => {
  try {
    const stored = localStorage.getItem('apiProviderOrder');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return ['deepseekLocal', 'modelspace', 'deepseek'];
};

// 监听当前材料变化，清空 AI 状态和编辑状态
watch(currentMaterial, () => {
  aiDrawerVisible.value = false;
  aiLoading.value = false;
  aiError.value = '';
  aiChatMessages.value = [];
  aiUserInput.value = '';
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];
  isEditingMaterial.value = false;
  editingMaterialContent.value = '';
  editingQuestionTitleId.value = null;
  editingQuestionExplanationId.value = null;
});

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.english-container {
  padding: 20px 2vw;
  width: 100%;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #faf8f5;
}

.english-content {
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

.english-main-wrapper {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 20px;
}

.english-left {
  width: 38%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.english-left::-webkit-scrollbar {
  display: none;
}

.english-center {
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

.english-center::-webkit-scrollbar {
  display: none;
}

.english-right {
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

.question-title {
  font-size: 22px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 20px;
  line-height: 1.6;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid #e8e4df;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #fff;
}

.option-item:hover {
  border-color: #c4a882;
  background-color: #fdfbf8;
}

.option-item.selected {
  border-color: #c4a882;
  background-color: #fdfbf8;
}

.option-item.correct {
  border-color: #67c23a;
  background-color: #f0f9eb;
}

.option-item.wrong {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.option-label {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  min-width: 30px;
}

.option-text {
  font-size: 18px;
  color: #333;
  flex: 1;
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

/* AI 讲解和答案按钮 */
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

.delete-question-btn {
  background-color: #F56C6C;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 8px 16px;
  font-size: 14px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 40px;
}

.delete-question-btn:hover {
  background-color: #f78989;
}

.all-questions-display {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.add-material-btn {
  background: #67c23a;
  border-color: #67c23a;
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

.add-material-btn:hover {
  background: #85ce61;
  border-color: #85ce61;
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
  margin-left:0;
}

.delete-material-btn:hover {
  background-color: #f78989;
}

.import-btn {
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

.import-btn:hover {
  background-color: #8b9a6d;
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  background: #f8f7f5;
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
  padding: 16px 0px;
  border-top: 1px solid #e8e4df;
  background: #fff;
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

/* 新增题目弹窗样式 */
.add-material-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

.add-material-form .form-item {
  margin-bottom: 20px;
}

.add-material-form .form-item label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.editor-row {
  display: flex;
  gap: 20px;
  align-items: stretch;
}

.editor-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.editor-right {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.format-tip-card {
  background: #f8f7f5;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 480px;
  max-height: 520px;
}

.format-tip-card h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #1a1a1a;
  flex-shrink: 0;
}

.format-content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  min-height: 0;
}

.format-content pre {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: #555;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e8e4df;
  white-space: pre-wrap;
  word-break: break-word;
}

.copy-format-btn {
  width: 100%;
  flex-shrink: 0;
  height: 48px;
  font-size: 16px;
  border-radius: 12px;
}

.add-material-editor {
  min-height: 480px;
  max-height: 520px;
  overflow-y: auto;
}

.add-material-dialog {
  border-radius: 16px;
  overflow: hidden;
  padding: 0!important;
  background: #faf9f7;
}

.add-material-dialog .el-dialog__header {
  background: #faf9f7;
  border-bottom: 1px solid #e8e4df;
  padding: 20px 24px;
  margin-right: 0;
}

.add-material-dialog .el-dialog__title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.add-material-dialog .el-dialog__footer {
  background: #faf9f7;
  border-top: 1px solid #e8e4df;
  padding: 16px 24px;
}

.add-material-dialog .el-dialog__footer .el-button {
  min-height: 44px;
  padding: 12px 24px;
  font-size: 15px;
  border-radius: 10px;
}

.add-material-dialog .el-dialog__footer .el-button--primary {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.add-material-dialog .el-dialog__footer .el-button--primary:hover {
  background: #333;
  border-color: #333;
}

.add-material-form {
  padding: 20px 24px;
}

.add-material-form .form-item label {
  display: block;
  font-weight: 600;
  margin-bottom: 10px;
  color: #1a1a1a;
  font-size: 15px;
}

.add-material-form .el-input__wrapper {
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  box-shadow: none;
  padding: 8px 16px;
  transition: all 0.2s ease;
}

.add-material-form .el-input__wrapper:hover {
  border-color: #c4a882;
}

.add-material-form .el-input__wrapper.is-focus {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2);
}

.add-material-form .el-input__inner {
  height: 44px;
  font-size: 16px;
  color: #1a1a1a;
}

.add-material-form .el-input__inner::placeholder {
  color: #9a9590;
}
</style>

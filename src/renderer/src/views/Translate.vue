<template>
  <div class="translate-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="translate-content" v-if="currentItem">
      <!-- 顶部工具栏：进度 + 操作按钮 -->
      <div class="top-toolbar">
        <div class="toolbar-actions">
          <el-button
            class="add-btn"
            type="primary"
            size="small"
            @click="openAddDialog"
          >
            <el-icon><Plus /></el-icon> 新增题目
          </el-button>
          <el-button
            class="delete-btn"
            size="small"
            @click="deleteCurrentItem"
          >
            <el-icon><Delete /></el-icon> 删除题目
          </el-button>
          <el-button
            class="next-btn"
            size="small"
            @click="nextItem"
          >
            {{ currentIndex === items.length - 1 ? '重新开始' : '下一题' }} <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <div class="progress-bar">
          <span class="progress-text">题目 {{ currentIndex + 1 }} / {{ items.length }}</span>
          <el-progress :percentage="progressPercent" :show-text="false" />
        </div>
      </div>

      <!-- 两栏布局主体：材料与答题区各50% -->
      <div class="translate-main-wrapper">
        <!-- 左侧：英文材料 -->
        <div class="translate-left">
          <el-card class="material-card">
            <template #header>
              <div class="material-header">
                <el-tag type="info">翻译材料</el-tag>
                <div class="header-actions">
                  <el-button
                    class="copy-btn"
                    size="small"
                    @click="copyMaterial"
                    :title="copySuccess ? '已复制' : '复制材料'"
                  >
                    <el-icon :size="18">
                      <Check v-if="copySuccess" style="color: #67c23a;" />
                      <DocumentCopy v-else />
                    </el-icon>
                  </el-button>
                </div>
              </div>
            </template>
            <div class="material-content">{{ currentItem.content }}</div>
          </el-card>
        </div>

        <!-- 右侧：输入与解析 -->
        <div class="translate-right">
          <el-card class="answer-card">
            <template #header>
              <div class="answer-header">
                <el-tag type="warning">你的翻译</el-tag>
              </div>
            </template>

            <!-- 输入区域 -->
            <div class="input-section">
              <el-input
                v-model="userAnswer"
                type="textarea"
                :rows="6"
                placeholder="请在此处输入你的中文翻译..."
                :disabled="showResult"
              />
              <div class="input-actions">
                <el-button
                  type="primary"
                  :disabled="!userAnswer.trim() || showResult"
                  @click="submitAnswer"
                >
                  提交翻译
                </el-button>
                <el-button
                  v-if="showResult"
                  @click="resetAnswer"
                >
                  重新作答
                </el-button>
              </div>
            </div>

            <!-- 结果显示区域 -->
            <div v-if="showResult" class="result-section">
              <el-divider />

              <!-- 标准答案 -->
              <div class="result-block">
                <div class="result-label">标准答案</div>
                <div class="result-text correct">{{ currentItem.answer }}</div>
              </div>

              <!-- 用户答案对比 -->
              <div class="result-block">
                <div class="result-label">你的答案</div>
                <div class="result-text" :class="{ 'wrong': !isCorrect }">{{ userAnswer }}</div>
              </div>

              <!-- AI 解析按钮 -->
              <div class="ai-actions">
                <el-button class="ai-explain-btn" @click="openAIChat">
                  <el-icon><Cpu /></el-icon> AI 解析
                </el-button>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <el-empty description="暂无翻译题目">
        <el-button type="primary" @click="openAddDialog">新增题目</el-button>
      </el-empty>
    </div>

    <!-- 新增题目对话框 -->
    <el-dialog v-model="showAddDialog" title="新增翻译题目" width="600px">
      <el-form :model="newItem" label-width="80px">
        <el-form-item label="英文材料">
          <el-input
            v-model="newItem.content"
            type="textarea"
            :rows="4"
            placeholder="请输入英文材料..."
          />
        </el-form-item>
        <el-form-item label="中文答案">
          <el-input
            v-model="newItem.answer"
            type="textarea"
            :rows="4"
            placeholder="请输入中文翻译答案..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addItem">确定</el-button>
      </template>
    </el-dialog>

    <!-- AI 解析悬浮窗 -->
    <div
      v-if="aiChatVisible"
      class="ai-chat-popup"
      :style="{ left: aiChatPos.x + 'px', top: aiChatPos.y + 'px' }"
    >
      <div class="ai-chat-header" @mousedown="startDrag">
        <span class="ai-chat-title">AI 翻译解析</span>
        <el-button class="ai-chat-close" text size="small" @click="aiChatVisible = false">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="ai-chat-body" ref="aiChatBodyRef">
        <div
          v-for="(msg, idx) in aiMessages"
          :key="idx"
          class="ai-message"
          :class="msg.role"
        >
          <div class="ai-message-content markdown-body" v-html="renderMarkdown(msg.content)"></div>
        </div>
        <div v-if="aiLoading" class="ai-message assistant">
          <div class="ai-message-content">
            <el-icon class="ai-loading"><Loading /></el-icon> 思考中...
          </div>
        </div>
      </div>
      <div class="ai-chat-footer">
        <el-input
          v-model="aiInput"
          size="small"
          placeholder="继续提问..."
          @keyup.enter="sendAIFollowUp"
        />
        <el-button size="small" type="primary" @click="sendAIFollowUp">发送</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { marked } from 'marked';
import {
  ArrowRight, Plus, DocumentCopy, Check, Delete, Cpu, Close, Loading
} from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();
const directoryId = computed(() => parseInt(route.params.directoryId as string));
const directoryName = ref('英语翻译');

// 题目列表
const items = ref<any[]>([]);
const currentIndex = ref(0);
const currentItem = computed(() => items.value[currentIndex.value] || null);

// 进度
const progressPercent = computed(() => {
  if (items.value.length === 0) return 0;
  return Math.round(((currentIndex.value + 1) / items.value.length) * 100);
});

// 答题状态
const userAnswer = ref('');
const showResult = ref(false);
const isCorrect = ref(false);

// 复制按钮状态
const copySuccess = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

// 新增对话框
const showAddDialog = ref(false);
const newItem = ref({ content: '', answer: '' });

// AI 解析悬浮窗
const aiChatVisible = ref(false);
const aiChatPos = ref({ x: 0, y: 0 });
const aiChatBodyRef = ref<HTMLDivElement | null>(null);
const aiMessages = ref<{ role: string; content: string }[]>([]);
const aiLoading = ref(false);
const aiInput = ref('');

// Markdown 渲染
const renderMarkdown = (content: string) => {
  return marked.parse(content || '', { async: false }) as string;
};

// 加载数据
const loadData = async () => {
  try {
    const result = await window.electronAPI.getTranslateList(directoryId.value);
    if (result.success && result.list) {
      let list = result.list;

      // 处理出题设置参数
      const mode = route.query.mode as string;
      const count = parseInt(route.query.count as string) || list.length;
      const repeat = parseInt(route.query.repeat as string) || 1;

      // 先随机打乱
      list = shuffleArray([...list]);

      if (mode === 'random' && count < list.length) {
        list = list.slice(0, count);
      }

      if (repeat > 1) {
        const baseList = [...list];
        const repeated: any[] = [];
        for (let i = 0; i < repeat; i++) {
          repeated.push(...shuffleArray([...baseList]));
        }
        list = repeated;
      }

      items.value = list;
      currentIndex.value = 0;
      resetAnswer();
    }
  } catch (error) {
    ElMessage.error('加载翻译题目失败');
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

// 提交翻译
const submitAnswer = () => {
  if (!userAnswer.value.trim()) return;
  showResult.value = true;
  // 简单判断：去除空格和标点后的相似度（这里只做展示，实际可以更复杂）
  const normalize = (s: string) => s.replace(/[\s，。？！,.?!]/g, '');
  isCorrect.value = normalize(userAnswer.value) === normalize(currentItem.value?.answer || '');
};

// 重新作答
const resetAnswer = () => {
  userAnswer.value = '';
  showResult.value = false;
  isCorrect.value = false;
};

// 下一题
const nextItem = () => {
  if (items.value.length === 0) return;
  currentIndex.value = (currentIndex.value + 1) % items.value.length;
  resetAnswer();
};

// 复制材料
const copyMaterial = async () => {
  if (!currentItem.value) return;
  try {
    await navigator.clipboard.writeText(currentItem.value.content);
    copySuccess.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copySuccess.value = false; }, 2000);
    ElMessage.success('材料已复制');
  } catch (e) {
    ElMessage.error('复制失败');
  }
};

// 打开新增对话框
const openAddDialog = () => {
  newItem.value = { content: '', answer: '' };
  showAddDialog.value = true;
};

// 新增题目
const addItem = async () => {
  if (!newItem.value.content.trim() || !newItem.value.answer.trim()) {
    ElMessage.warning('请填写完整内容');
    return;
  }
  try {
    const result = await window.electronAPI.addTranslate({
      directory_id: directoryId.value,
      content: newItem.value.content,
      answer: newItem.value.answer
    });
    if (result.success) {
      ElMessage.success('新增成功');
      showAddDialog.value = false;
      loadData();
    } else {
      ElMessage.error(result.error || '新增失败');
    }
  } catch (error) {
    ElMessage.error('新增失败');
  }
};

// 删除当前题目
const deleteCurrentItem = async () => {
  if (!currentItem.value) return;
  try {
    await ElMessageBox.confirm('确定要删除这道题目吗？', '删除确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' });
    const result = await window.electronAPI.deleteTranslate(currentItem.value.id);
    if (result.success) {
      ElMessage.success('已删除');
      items.value = items.value.filter(i => i.id !== currentItem.value!.id);
      if (items.value.length === 0) return;
      if (currentIndex.value >= items.value.length) {
        currentIndex.value = items.value.length - 1;
      }
      resetAnswer();
    } else {
      ElMessage.error(result.error || '删除失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败');
  }
};

// 返回首页
const goBack = () => {
  router.push({ name: 'Home' });
};

// ========== AI 解析悬浮窗 ==========

const openAIChat = () => {
  aiMessages.value = [];
  aiInput.value = '';
  aiChatVisible.value = true;

  // 定位到右侧区域居中
  const rightPanel = document.querySelector('.translate-right');
  if (rightPanel) {
    const rect = rightPanel.getBoundingClientRect();
    const popupWidth = 420;
    const popupHeight = 500;
    aiChatPos.value = {
      x: rect.left + (rect.width - popupWidth) / 2,
      y: rect.top + (rect.height - popupHeight) / 2
    };
  } else {
    aiChatPos.value = { x: window.innerWidth - 460, y: 120 };
  }

  // 自动发送解析请求
  const content = currentItem.value?.content || '';
  const answer = currentItem.value?.answer || '';
  const userAns = userAnswer.value || '';
  const systemPrompt = '你是一位资深英语翻译老师。请对用户提供的英文句子进行详细翻译解析，包括：1）句子结构分析；2）重点词汇/短语讲解；3）完整中文翻译。如果用户提供了自己的翻译，请对比标准答案给出评价和改进建议。';
  const userPrompt = `【英文原文】\n${content}\n\n【标准答案】\n${answer}\n\n【用户翻译】\n${userAns || '（用户未提供）'}`;

  aiMessages.value.push({ role: 'user', content: userPrompt });
  aiLoading.value = true;
  scrollToBottom();

  window.electronAPI.explainQuestion({
    question: content,
    options: [],
    correctAnswer: answer,
    explanation: '',
    _overrideMessages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });
};

const sendAIFollowUp = () => {
  if (!aiInput.value.trim() || aiLoading.value) return;
  const text = aiInput.value.trim();
  aiInput.value = '';
  aiMessages.value.push({ role: 'user', content: text });
  aiLoading.value = true;
  scrollToBottom();

  window.electronAPI.explainQuestion({
    question: currentItem.value?.content || '',
    options: [],
    correctAnswer: currentItem.value?.answer || '',
    explanation: '',
    _overrideMessages: [
      { role: 'system', content: '你是一位资深英语翻译老师，继续回答用户的问题。' },
      ...aiMessages.value.map(m => ({ role: m.role, content: m.content }))
    ]
  });
};

// 流式输出监听
let removeChunkListener: (() => void) | null = null;
let removeDoneListener: (() => void) | null = null;
let removeErrorListener: (() => void) | null = null;

const setupAIListeners = () => {
  if (removeChunkListener) removeChunkListener();
  if (removeDoneListener) removeDoneListener();
  if (removeErrorListener) removeErrorListener();

  removeChunkListener = window.electronAPI.onAIStreamChunk((content: string) => {
    const lastMsg = aiMessages.value[aiMessages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content += content;
    } else {
      aiMessages.value.push({ role: 'assistant', content });
    }
    scrollToBottom();
  });

  removeDoneListener = window.electronAPI.onAIStreamDone(() => {
    aiLoading.value = false;
  });

  removeErrorListener = window.electronAPI.onAIStreamError((error: string) => {
    aiLoading.value = false;
    ElMessage.error('AI 解析失败: ' + error);
  });
};

const scrollToBottom = () => {
  nextTick(() => {
    if (aiChatBodyRef.value) {
      aiChatBodyRef.value.scrollTop = aiChatBodyRef.value.scrollHeight;
    }
  });
};

// 拖拽
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

const startDrag = (e: MouseEvent) => {
  isDragging = true;
  dragOffset.x = e.clientX - aiChatPos.value.x;
  dragOffset.y = e.clientY - aiChatPos.value.y;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging) return;
  aiChatPos.value = {
    x: e.clientX - dragOffset.x,
    y: e.clientY - dragOffset.y
  };
};

const stopDrag = () => {
  isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 初始化
setupAIListeners();
loadData();
</script>

<style scoped>
.translate-container {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
}

.translate-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 16px;
}

/* 顶部工具栏 */
.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 0 4px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  max-width: 300px;
}

.progress-text {
  font-size: 14px;
  color: #8c8279;
  margin-bottom: 4px;
  display: block;
}

/* 两栏主体 */
.translate-main-wrapper {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
}

.translate-left,
.translate-right {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.translate-left::-webkit-scrollbar,
.translate-right::-webkit-scrollbar {
  display: none;
}

/* 卡片样式 */
.material-card,
.answer-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: none;
}

.material-header,
.answer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.material-content {
  font-size: 18px;
  line-height: 1.8;
  color: #2c2c2c;
  white-space: pre-wrap;
}

/* 输入区域 */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-actions {
  display: flex;
  gap: 10px;
}

/* 结果区域 */
.result-section {
  margin-top: 8px;
}

.result-block {
  margin-bottom: 16px;
}

.result-label {
  font-size: 14px;
  font-weight: 600;
  color: #8c8279;
  margin-bottom: 6px;
}

.result-text {
  font-size: 16px;
  line-height: 1.7;
  padding: 12px;
  border-radius: 8px;
  background-color: #f5f3f0;
  white-space: pre-wrap;
}

.result-text.correct {
  background-color: #f0f9eb;
  color: #2c2c2c;
}

.result-text.wrong {
  background-color: #fef0f0;
  color: #2c2c2c;
}

.ai-actions {
  margin-top: 12px;
}

.ai-explain-btn {
  background-color: #c4a882;
  border-color: #c4a882;
  color: #fff;
}

.ai-explain-btn:hover {
  background-color: #b89a76;
  border-color: #b89a76;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* AI 悬浮窗 */
.ai-chat-popup {
  position: fixed;
  width: 420px;
  height: 500px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 3000;
  overflow: hidden;
}

.ai-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f5f3f0;
  cursor: move;
  user-select: none;
}

.ai-chat-title {
  font-weight: 600;
  font-size: 14px;
  color: #5a4a3a;
}

.ai-chat-close {
  padding: 4px;
}

.ai-chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scrollbar-width: none;
}

.ai-chat-body::-webkit-scrollbar {
  display: none;
}

.ai-message {
  margin-bottom: 10px;
}

.ai-message-content {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
}

.ai-message.user .ai-message-content {
  background: #f0f0f0;
  color: #333;
}

.ai-message.assistant .ai-message-content {
  background: #f5f3f0;
  color: #2c2c2c;
}

.ai-loading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ai-chat-footer {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid #eee;
}

.ai-chat-footer .el-input {
  flex: 1;
}
</style>

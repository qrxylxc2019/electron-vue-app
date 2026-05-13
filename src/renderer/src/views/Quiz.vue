﻿<template>
  <div class="quiz-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="quiz-content" v-if="(questions.length > 0 || articles.length > 0) && currentQuestion">
      <!-- 题目进度 -->
      <div class="progress-bar">
        <span class="progress-text">题目 {{ currentIndex + 1 }} / {{ questions.length }}</span>
        <el-progress :percentage="progressPercent" :show-text="false" />
      </div>

      <!-- 左右布局主体 -->
      <div class="quiz-main">
        <!-- 左侧：题目内容 -->
        <div class="quiz-left">
          <el-card class="question-card">
            <template #header>
              <div class="question-header">
                <el-tag :type="questionTypeTag.type">
                  {{ questionTypeTag.text }}
                </el-tag>
                <div class="header-actions">
                  <el-button
                    class="copy-btn"
                    size="small"
                    @click="copyQuestionContent"
                    :title="copySuccess ? '已复制' : '复制题目'"
                  >
                    <el-icon :size="18">
                      <Check v-if="copySuccess" style="color: #67c23a;" />
                      <DocumentCopy v-else />
                    </el-icon>
                  </el-button>
                  <!-- 答对/答错结果 -->
                  <div v-if="showAnswer" class="answer-status">
                    <el-icon :class="isCorrect ? 'correct-icon' : 'wrong-icon'">
                      <CircleCheck v-if="isCorrect" />
                      <CircleClose v-else />
                    </el-icon>
                    <span :class="isCorrect ? 'correct-text' : 'wrong-text'">
                      {{ isCorrect ? '答对了！' : '答错了！' }}
                    </span>
                    <span class="correct-answer">正确答案：{{ currentQuestion.correct_answer }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div class="question-title markdown-body" v-html="renderMarkdown(currentQuestion.title)"></div>

            <!-- 选择题选项 -->
            <div v-if="currentQuestion.question_type === 'single' || currentQuestion.question_type === 'multiple'" class="options-list">
              <div
                v-for="option in optionsList"
                :key="option.key"
                class="option-row"
                :class="{ 
                  'selected': currentQuestion.question_type === 'multiple' ? selectedAnswers.has(option.key) : selectedAnswer === option.key, 
                  'deleted': option.deleted,
                  'correct': showAnswer && isCorrectOption(option.key),
                  'wrong': showAnswer && isWrongOption(option.key)
                }"
              >
                <div
                  class="delete-btn"
                  @click.stop="toggleDelete(option.key)"
                >
                  <el-icon><Delete /></el-icon>
                </div>
                <div
                  class="option-item"
                  @click="selectOption(option.key)"
                >
                  <span class="option-key">{{ option.key }}.</span>
                  <span class="option-text markdown-body" :class="{ 'strikethrough': option.deleted }" v-html="renderMarkdown(option.text || '')"></span>
                  <!-- 答案对错的图标显示 -->
                  <el-icon v-if="showAnswer && isCorrectOption(option.key)" class="result-icon correct-icon"><CircleCheck /></el-icon>
                  <el-icon v-if="showAnswer && isWrongOption(option.key)" class="result-icon wrong-icon"><CircleClose /></el-icon>
                </div>
              </div>
              <!-- 多选题确认按钮 -->
              <el-button
                v-if="currentQuestion.question_type === 'multiple' && !showAnswer"
                class="confirm-btn"
                @click="confirmMultipleAnswer"
              >
                确认答案
              </el-button>
            </div>

            <!-- 文章题：按段落显示，带隐藏/显示按钮 -->
            <div v-else-if="currentQuestion.question_type === 'write'" class="write-content">
              <div
                v-for="(paragraph, index) in writeParagraphs"
                :key="index"
                class="paragraph-block"
              >
                <div class="paragraph-row">
                  <div
                    class="paragraph-item"
                    :class="{ 'hidden': hiddenParagraphs.has(index) }"
                  >
                    <p class="paragraph-text markdown-body" v-html="renderMarkdown(paragraph)"></p>
                  </div>
                  <el-button
                    class="toggle-btn"
                    @click="toggleParagraph(index)"
                  >
                    {{ hiddenParagraphs.has(index) ? '显示' : '隐藏' }}
                  </el-button>
                </div>
                    <!-- 高项论文手写输入区 -->
                <div v-if="showHandwrite && directoryName === '高项论文'" class="handwrite-area">
                  <el-input
                    v-model="handwriteInputs[index]"
                    type="textarea"
                    :rows="6"
                    :placeholder="`第 ${index + 1} 段手写内容...`"
                    class="handwrite-input"
                  />
                </div>
              </div>
            </div>

            <!-- 判断题选项 -->
            <div v-else class="options-list judge-options">
              <div
                v-for="option in judgeOptions"
                :key="option.key"
                class="option-row"
                :class="{ 'selected': selectedAnswer === option.key, 'deleted': option.deleted }"
              >
                <div
                  class="delete-btn"
                  @click.stop="toggleDelete(option.key)"
                >
                  <el-icon><Delete /></el-icon>
                </div>
                <div
                  class="option-item"
                  @click="selectOption(option.key)"
                >
                  <span class="option-text" :class="{ 'strikethrough': option.deleted }">
                    {{ option.text }}
                  </span>
                </div>
              </div>
            </div>

            <!-- AI 讲解按钮和同类题按钮 -->
            <div class="ai-explain-section">
              <el-button
                class="ai-explain-btn"
                @click="openAIChatDrawer"
              >
                <el-icon><Cpu /></el-icon>
                AI讲解
              </el-button>
              <el-button
                class="similar-btn"
                @click="openSimilarDrawer"
              >
                <el-icon><Collection /></el-icon>
                同类题
                <el-tag v-if="similarCount > 0" type="danger" size="small" class="similar-count">{{ similarCount }}</el-tag>
              </el-button>
            </div>

            <!-- 答案显示 -->
            <div v-if="showAnswer" class="answer-result">
              <el-divider />
              <div v-if="currentQuestion.explanation" class="explanation-line markdown-body" v-html="renderMarkdown('**解析：**' + currentQuestion.explanation)"></div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：操作按钮 -->
        <div class="quiz-right">
          <div class="right-actions">
            
            <el-button
              class="delete-question-btn"
              @click="deleteCurrentQuestion"
            >
              <el-icon><Delete /></el-icon> 删除题目
            </el-button>
            <el-button
              v-if="directoryName === '高项论文'"
              class="handwrite-btn"
              :class="{ 'active': showHandwrite }"
              @click="toggleHandwrite"
            >
              <el-icon><EditPen /></el-icon>
              {{ showHandwrite ? '隐藏手写' : '显示手写' }}
            </el-button>
            <el-button
              class="next-question-btn"
              @click="nextQuestion"
            >
              下一题 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else :description="isArticleMode ? '暂无文章' : '暂无题目'" />

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
                <div class="ai-markdown" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <!-- 正在输入中 v-if="aiLoading"-->
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
            <!-- AI 回答完毕后的同类题区域 -->
            <div v-if="!aiLoading && aiChatMessages.length > 0 && aiChatMessages[aiChatMessages.length - 1].role === 'assistant'" class="chat-message assistant">
              <div class="message-bubble similar-bubble">
                <!-- 同类题按钮始终显示 -->
                <el-button
                  class="generate-similar-btn"
                  :loading="aiSimilarLoading"
                  @click="generateAISimilarQuestions"
                >
                  <el-icon><Collection /></el-icon>
                  {{ aiSimilarQuestions.length > 0 ? '再生成5道同类题' : '生成同类题（20道）' }}
                </el-button>
                <!-- 同类题卡片 -->
                <div v-if="aiSimilarQuestions.length > 0" class="ai-similar-card">
                  <div class="ai-similar-main">
                    <div class="ai-similar-header">
                      <el-tag :type="aiSimilarCurrentTag.type">{{ aiSimilarCurrentTag.text }}</el-tag>
                      <span class="ai-similar-progress">{{ aiSimilarCurrentIndex + 1 }} / {{ aiSimilarQuestions.length }}</span>
                    </div>
                    <div class="ai-similar-title markdown-body" v-html="renderMarkdown(aiCurrentSimilarQuestion?.title || '')"></div>
                    <div class="ai-similar-options">
                      <div
                        v-for="option in aiSimilarOptionsList"
                        :key="option.key"
                        class="ai-similar-option"
                        :class="{
                          'selected': aiSelectedSimilarAnswer === option.key,
                          'deleted': option.deleted,
                          'correct': aiShowSimilarAnswer && aiIsSimilarCorrectOption(option.key),
                          'wrong': aiShowSimilarAnswer && aiIsSimilarWrongOption(option.key)
                        }"
                      >
                        <div class="delete-btn" :class="{ 'is-deleted': option.deleted }" @click.stop="aiToggleDeleteOption(option.key)">
                          <el-icon><Delete /></el-icon>
                        </div>
                        <div class="option-content" @click="aiSelectSimilarOption(option.key)">
                          <span class="option-key">{{ option.key }}.</span>
                          <span class="option-text">{{ option.text }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="aiShowSimilarAnswer" class="ai-similar-answer">
                      <el-divider />
                      <div class="answer-label">正确答案：{{ aiCurrentSimilarQuestion?.correct_answer }}</div>
                      <div class="answer-explanation markdown-body" v-html="renderMarkdown(aiCurrentSimilarQuestion?.explanation || '')"></div>
                    </div>
                  </div>
                  <div class="ai-similar-actions">
                    <el-button
                      class="nav-btn delete-question-btn"
                      @click="aiDeleteCurrentQuestion"
                    >
                      <el-icon><Delete /></el-icon>
                      删除本题
                    </el-button>
                    <el-button
                      class="nav-btn next-btn"
                      @click="aiNextSimilarQuestion"
                    >
                      {{ aiSimilarCurrentIndex >= aiSimilarQuestions.length - 1 ? '再来一组' : '下一题' }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 底部输入框 -->
        <div class="ai-chat-input-area">
          <el-input
            v-model="aiUserInput"
            type="textarea"
            :rows="2"
            placeholder="对这道题还有疑问？继续向 AI 提问..."
            class="ai-chat-input"
            @keydown.enter.prevent="sendAIChatMessage"
          />
          <el-button
            class="ai-send-btn"
            :loading="aiLoading"
            :disabled="!aiUserInput.trim()"
            @click="sendAIChatMessage"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>

    <!-- 同类题抽屉 -->
    <div
      class="similar-drawer-overlay"
      :class="{ 'show': drawerVisible }"
      @click="closeDrawer"
    >
      <div
        class="similar-drawer"
        :class="{ 'show': drawerVisible }"
        @click.stop
      >
        <div class="drawer-header">
          <h2>同类题练习</h2>
          <el-icon class="drawer-close" @click="closeDrawer"><Close /></el-icon>
        </div>
        <div class="drawer-content">
          <div v-if="similarQuestions.length > 0 && currentSimilarQuestion" class="similar-quiz">
            <!-- 进度 -->
            <div class="similar-progress">
              <span>题目 {{ currentSimilarIndex + 1 }} / {{ similarQuestions.length }}</span>
              <el-progress :percentage="similarProgressPercent" :show-text="false" />
            </div>
            <!-- 题目内容 -->
            <div class="similar-quiz-main">
              <el-card class="similar-question-card">
                <template #header>
                  <div class="question-header">
                    <el-tag :type="similarQuestionTypeTag.type">{{ similarQuestionTypeTag.text }}</el-tag>
                  </div>
                </template>
                <div class="question-title markdown-body" v-html="renderMarkdown(currentSimilarQuestion.title)"></div>
                <!-- 选项 -->
                <div class="options-list">
                  <div
                    v-for="option in similarOptionsList"
                    :key="option.key"
                    class="option-row"
                    :class="{
                      'selected': selectedSimilarAnswer === option.key,
                      'deleted': option.deleted,
                      'correct': showSimilarAnswer && isSimilarCorrectOption(option.key),
                      'wrong': showSimilarAnswer && isSimilarWrongOption(option.key)
                    }"
                  >
                    <div class="delete-btn" :class="{ 'is-deleted': option.deleted }" @click.stop="toggleSimilarDeleteOption(option.key)">
                      <el-icon><Delete /></el-icon>
                    </div>
                    <div class="option-item" @click="selectSimilarOption(option.key)">
                      <span class="option-key">{{ option.key }}.</span>
                      <span class="option-text markdown-body" v-html="renderMarkdown(option.text || '')"></span>
                      <el-icon v-if="showSimilarAnswer && isSimilarCorrectOption(option.key)" class="result-icon correct-icon"><CircleCheck /></el-icon>
                      <el-icon v-if="showSimilarAnswer && isSimilarWrongOption(option.key)" class="result-icon wrong-icon"><CircleClose /></el-icon>
                    </div>
                  </div>
                </div>
                <!-- 答案显示 -->
                <div v-if="showSimilarAnswer" class="answer-result">
                  <el-divider />
                  <div class="explanation-line">
                    <strong>正确答案：</strong>{{ currentSimilarQuestion.correct_answer }}
                  </div>
                  <div v-if="currentSimilarQuestion.explanation" class="explanation-line markdown-body" v-html="renderMarkdown('**解析：**' + currentSimilarQuestion.explanation)"></div>
                </div>
              </el-card>
              <!-- 操作按钮 -->
              <div class="similar-actions">
                <el-button class="delete-question-btn" @click="deleteSimilarQuestion">
                  <el-icon><Delete /></el-icon> 删除题目
                </el-button>
                <el-button class="next-question-btn" @click="nextSimilarQuestion">
                  {{ currentSimilarIndex >= similarQuestions.length - 1 ? '再来一组' : '下一题' }}
                </el-button>
              </div>
            </div>
          </div>
          <div v-else-if="similarLoading" class="similar-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>AI 正在生成同类题...</span>
          </div>
          <div v-else class="similar-empty">
            <el-empty description="暂无同类题">
              <template #default>
                <el-button
                  class="generate-similar-btn"
                  :loading="similarLoading"
                  @click="generateSimilarInDrawer"
                >
                  <el-icon><Collection /></el-icon>
                  生成同类题（20道）
                </el-button>
              </template>
            </el-empty>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { marked } from 'marked';
import type { Question, Article, QuestionType, OptionWithState } from '../types';
import { Cpu, Collection, Delete, ArrowRight, Loading, Warning, CircleCheck, CircleClose, Close, Promotion, EditPen, DocumentCopy, Check } from '@element-plus/icons-vue';

const API_ORDER_KEY = 'apiProviderOrder';

// 获取本地缓存的厂商排序
function getProviderOrder(): string[] {
  try {
    const stored = localStorage.getItem(API_ORDER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取厂商排序失败:', e);
  }
  return ['modelspace', 'deepseek'];
}

const props = defineProps<{
  directoryId: string;
}>();

const router = useRouter();
const route = useRoute();
const directoryName = ref('');
const isArticleMode = ref(false);
const questions = ref<Question[]>([]);
const articles = ref<Article[]>([]);
const currentIndex = ref(0);
const selectedAnswer = ref<string>('');
const selectedAnswers = ref<Set<string>>(new Set()); // 多选题选中的答案
const showAnswer = ref(false);
const deletedOptions = ref<Set<string>>(new Set());

// 文章题段落隐藏状态
const hiddenParagraphs = ref<Set<number>>(new Set());

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

// 复制按钮状态
const copySuccess = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

// AI 生成同类题状态
const aiSimilarQuestions = ref<Question[]>([]);
const aiSimilarLoading = ref(false);
const aiSimilarCurrentIndex = ref(0);
const aiSelectedSimilarAnswer = ref('');
const aiShowSimilarAnswer = ref(false);
const aiSimilarDeletedOptions = ref<Set<string>>(new Set());

// 手写输入相关状态
const showHandwrite = ref(false);
const handwriteInputs = ref<Record<number, string>>({});

// 滚动到对话底部
const scrollToBottom = async () => {
  await nextTick();
  if (aiChatContentRef.value) {
    aiChatContentRef.value.scrollTop = aiChatContentRef.value.scrollHeight;
  }
};

// Markdown 渲染
const renderMarkdown = (content: string) => {
  return marked.parse(content || '', { async: false }) as string;
};

// 当前题目/文章
const currentQuestion = computed(() => {
  if (isArticleMode.value) {
    // 文章模式：将 Article 转换为 Question 格式
    const article = articles.value[currentIndex.value];
    if (!article) return null;
    return {
      id: article.id,
      directory_id: article.directory_id,
      question_type: 'write' as QuestionType,
      title: article.title,
      option_a: article.content,
      option_b: null,
      option_c: null,
      option_d: null,
      option_e: null,
      correct_answer: article.correct_answer,
      explanation: article.explanation,
      sort_order: article.sort_order,
      created_at: article.created_at,
    } as Question;
  }
  return questions.value[currentIndex.value] || null;
});

// 进度百分比
const progressPercent = computed(() => {
  const total = isArticleMode.value ? articles.value.length : questions.value.length;
  if (total === 0) return 0;
  return ((currentIndex.value + 1) / total) * 100;
});

// 是否答对
const isCorrect = computed(() => {
  if (!currentQuestion.value) return false;
  if (currentQuestion.value.question_type === 'multiple') {
    // 多选题：比较选中的答案和正确答案（排序后比较）
    const correct = currentQuestion.value.correct_answer.split(',').sort().join(',');
    const selected = Array.from(selectedAnswers.value).sort().join(',');
    return correct === selected;
  }
  return selectedAnswer.value === currentQuestion.value.correct_answer;
});

// 题目类型标签
const questionTypeTag = computed(() => {
  if (!currentQuestion.value) return { text: '', type: 'info' };
  switch (currentQuestion.value.question_type) {
    case 'single': return { text: '单选题', type: 'primary' };
    case 'multiple': return { text: '多选题', type: 'warning' };
    case 'judge': return { text: '判断题', type: 'success' };
    case 'write': return { text: '文章题', type: 'info' };
    default: return { text: '选择题', type: 'primary' };
  }
});

// 选择题选项列表
const optionsList = computed<OptionWithState[]>(() => {
  if (!currentQuestion.value || (currentQuestion.value.question_type !== 'single' && currentQuestion.value.question_type !== 'multiple')) return [];
  const q = currentQuestion.value;
  return [
    { key: 'A', text: q.option_a, deleted: deletedOptions.value.has('A') },
    { key: 'B', text: q.option_b, deleted: deletedOptions.value.has('B') },
    { key: 'C', text: q.option_c, deleted: deletedOptions.value.has('C') },
    { key: 'D', text: q.option_d, deleted: deletedOptions.value.has('D') },
    { key: 'E', text: q.option_e, deleted: deletedOptions.value.has('E') },
  ].filter(o => o.text !== null && o.text !== undefined);
});

// 判断题选项（可删除）
const judgeOptions = computed<OptionWithState[]>(() => {
  return [
    { key: '正确', text: '正确', deleted: deletedOptions.value.has('正确') },
    { key: '错误', text: '错误', deleted: deletedOptions.value.has('错误') },
  ];
});

// 文章题段落列表（按换行符分段）
const writeParagraphs = computed<string[]>(() => {
  if (!currentQuestion.value || currentQuestion.value.question_type !== 'write') return [];
  // 按 option_a 存储文章内容，按换行分段
  const content = currentQuestion.value.option_a || currentQuestion.value.title || '';
  return content.split(/\n+/).filter(p => p.trim());
});

// 加载数据
const loadData = async () => {
  try {
    const dirId = parseInt(props.directoryId);
    const dirs = await window.electronAPI.getDirectories();
    const dir = dirs.find(d => d.id === dirId);
    if (dir) {
      directoryName.value = dir.name;
    }

    // 判断是否是文章模式（高项论文）
    isArticleMode.value = route.query.isArticle === '1' || dir?.name === '高项论文';

    if (isArticleMode.value) {
      // 文章模式：从 article 表加载
      let arts = await window.electronAPI.getArticles(dirId);
      if (arts.length === 0) {
        ElMessage.warning('该科目暂无文章');
        return;
      }
      // 处理出题设置参数
      const mode = route.query.mode as string;
      const count = parseInt(route.query.count as string) || arts.length;
      const repeat = parseInt(route.query.repeat as string) || 1;
      
      // 先随机打乱
      arts = shuffleArray([...arts]);
      
      if (mode === 'random' && count < arts.length) {
        arts = arts.slice(0, count);
      }
      
      if (repeat > 1) {
        const baseArticles = [...arts];
        const repeated: Article[] = [];
        for (let i = 0; i < repeat; i++) {
          repeated.push(...shuffleArray([...baseArticles]));
        }
        arts = repeated;
      }
      
      articles.value = arts;
      questions.value = []; // 清空题目
    } else {
      // 普通模式：从 questions 表加载
      let qs = await window.electronAPI.getQuestions(dirId);
      
      // 处理出题设置参数
      const mode = route.query.mode as string;
      const count = parseInt(route.query.count as string) || qs.length;
      const repeat = parseInt(route.query.repeat as string) || 1;
      
      // 先随机打乱
      qs = shuffleArray([...qs]);
      
      if (mode === 'random' && count < qs.length) {
        // 随机抽取指定数量的题目
        qs = qs.slice(0, count);
      }
      
      if (repeat > 1) {
        // 重复出题：将抽出的题目重复指定次数
        const baseQuestions = [...qs];
        const repeated: Question[] = [];
        for (let i = 0; i < repeat; i++) {
          // 每次重复都重新打乱顺序
          repeated.push(...shuffleArray([...baseQuestions]));
        }
        qs = repeated;
      }
      
      questions.value = qs;
      articles.value = []; // 清空文章
    }
    
    resetState();
  } catch (error) {
    ElMessage.error('加载题目失败');
    console.error(error);
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

// 重置状态
const resetState = () => {
  currentIndex.value = 0;
  selectedAnswer.value = '';
  showAnswer.value = false;
  deletedOptions.value.clear();
};

// 返回首页
const goBack = () => {
  router.push({ name: 'Home' });
};

// 选择选项
const selectOption = (key: string) => {
  // 如果已删除，不能选择
  if (deletedOptions.value.has(key)) return;
  
  if (currentQuestion.value?.question_type === 'multiple') {
    // 多选题：切换选中状态
    if (selectedAnswers.value.has(key)) {
      selectedAnswers.value.delete(key);
    } else {
      selectedAnswers.value.add(key);
    }
    // 多选题不立即判断，需要点击确认按钮
  } else {
    // 单选题/判断题：即选即判断
    selectedAnswer.value = key;
    showAnswer.value = true;
  }
};

// 确认多选题答案
const confirmMultipleAnswer = () => {
  if (selectedAnswers.value.size === 0) {
    ElMessage.warning('请至少选择一个答案');
    return;
  }
  showAnswer.value = true;
};

// 删除当前题目
const deleteCurrentQuestion = async () => {
  if (!currentQuestion.value) return;

  const isArticle = isArticleMode.value;
  const itemName = isArticle ? '文章' : '题目';

  try {
    const id = currentQuestion.value.id;
    let success: boolean;

    if (isArticle) {
      success = await window.electronAPI.deleteArticle(id);
    } else {
      success = await window.electronAPI.deleteQuestion(id);
    }

    if (success) {
      ElMessage.success(`${itemName}已删除`);

      // 从本地数组中移除所有相同id的题目（处理重复出题的情况）
      if (isArticle) {
        articles.value = articles.value.filter(a => a.id !== id);
      } else {
        questions.value = questions.value.filter(q => q.id !== id);
      }

      // 如果删除后没有题目了，返回上一页
      const remaining = isArticle ? articles.value.length : questions.value.length;
      if (remaining === 0) {
        ElMessage.info('该科目下已无任何题目');
        router.push({ name: 'Home' });
        return;
      }

      // 调整当前索引
      if (currentIndex.value >= remaining) {
        currentIndex.value = remaining - 1;
      }
      resetQuestionState();
    } else {
      ElMessage.error('删除失败');
    }
  } catch (error) {
    ElMessage.error('删除失败');
    console.error(error);
  }
};

// 判断选项是否是正确答案
const isCorrectOption = (key: string) => {
  if (!currentQuestion.value || !showAnswer.value) return false;
  const correctAnswers = currentQuestion.value.correct_answer.split(',');
  return correctAnswers.includes(key);
};

// 判断选项是否是用户选错的答案
const isWrongOption = (key: string) => {
  if (!currentQuestion.value || !showAnswer.value) return false;
  const correctAnswers = currentQuestion.value.correct_answer.split(',');
  
  if (currentQuestion.value.question_type === 'multiple') {
    // 多选题：用户选了但不是正确答案，或正确答案用户没选（不标记未选的正确答案为错）
    return selectedAnswers.value.has(key) && !correctAnswers.includes(key);
  } else {
    // 单选题：用户选的答案且不是正确答案
    return selectedAnswer.value === key && !correctAnswers.includes(key);
  }
};

// 切换删除状态
const toggleDelete = (key: string) => {
  if (deletedOptions.value.has(key)) {
    deletedOptions.value.delete(key);
    // 如果当前选中的是这个选项，取消选择
    if (selectedAnswer.value === key) {
      selectedAnswer.value = '';
    }
  } else {
    deletedOptions.value.add(key);
    // 如果当前选中的是这个选项，取消选择
    if (selectedAnswer.value === key) {
      selectedAnswer.value = '';
    }
  }
};

// 切换文章段落隐藏/显示
const toggleParagraph = (index: number) => {
  if (hiddenParagraphs.value.has(index)) {
    hiddenParagraphs.value.delete(index);
  } else {
    hiddenParagraphs.value.add(index);
  }
};

// 切换手写输入显示/隐藏
const toggleHandwrite = () => {
  showHandwrite.value = !showHandwrite.value;
};

// 获取手写输入内容
const getHandwriteInput = (index: number) => {
  return handwriteInputs.value[index] || '';
};

// 更新手写输入内容
const updateHandwriteInput = (index: number, value: string) => {
  handwriteInputs.value[index] = value;
};



// 上一题
const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetQuestionState();
  }
};

// 下一题
const nextQuestion = () => {
  const total = isArticleMode.value ? articles.value.length : questions.value.length;
  if (currentIndex.value < total - 1) {
    currentIndex.value++;
    resetQuestionState();
  } else {
    // 已经是最后一题，重新加载题目（按照配置重新随机获取）
    ElMessage.success('本轮题目已完成，即将重新开始');
    loadData();
  }
};

// 重置题目状态（换题时保留删除的选项）
const resetQuestionState = () => {
  selectedAnswer.value = '';
  selectedAnswers.value.clear();
  showAnswer.value = false;
  // 清空高项论文手写输入
  handwriteInputs.value = {};
};

// 监听题目变化，清空删除状态和 AI 状态
watch(currentQuestion, () => {
  deletedOptions.value.clear();
  hiddenParagraphs.value.clear();
  selectedAnswer.value = '';
  selectedAnswers.value.clear();
  showAnswer.value = false;
  // 清空高项论文手写输入
  handwriteInputs.value = {};
  // 关闭 AI 抽屉并重置状态
  aiDrawerVisible.value = false;
  aiLoading.value = false;
  aiError.value = '';
  aiProviderName.value = '';
  aiChatMessages.value = [];
  aiUserInput.value = '';
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];
});

// 构建题目展示文本
const buildQuestionDisplayText = (): string => {
  if (!currentQuestion.value) return '';
  let text = currentQuestion.value.title;

  if (currentQuestion.value.question_type === 'single' || currentQuestion.value.question_type === 'multiple') {
    const options = optionsList.value
      .filter(o => !o.deleted)
      .map(o => `${o.key}. ${o.text}`)
      .join('\n');
    if (options) {
      text += '\n\n' + options;
    }
  } else if (currentQuestion.value.question_type === 'judge') {
    text += '\n\n正确\n错误';
  }

  return text;
};

// 打开 AI 讲解抽屉
const openAIChatDrawer = async () => {
  if (!currentQuestion.value) return;
  aiDrawerVisible.value = true;

  // 如果已经有对话记录，滚动到底部
  if (aiChatMessages.value.length > 0) {
    scrollToBottom();
    return;
  }

  // 如果数据库中有缓存的 AI 解析，先显示题目再显示缓存内容
  if (currentQuestion.value.ai_explanation) {
    aiChatMessages.value.push({
      role: 'user',
      content: buildQuestionDisplayText()
    });
    aiChatMessages.value.push({
      role: 'assistant',
      content: currentQuestion.value.ai_explanation
    });
    scrollToBottom();
    return;
  }

  // 首次打开：先显示题目作为用户消息，再调用 AI
  aiChatMessages.value.push({
    role: 'user',
    content: buildQuestionDisplayText()
  });
  scrollToBottom();

  await callAIExplain(false);
};

// 关闭 AI 讲解抽屉
const closeAIChatDrawer = () => {
  aiDrawerVisible.value = false;
};

// 发送 AI 对话消息（追问）
const sendAIChatMessage = async () => {
  if (!currentQuestion.value || !aiUserInput.value.trim() || aiLoading.value) return;

  const userMessage = aiUserInput.value.trim();
  aiUserInput.value = '';

  // 添加用户消息到对话列表
  aiChatMessages.value.push({
    role: 'user',
    content: userMessage
  });
  scrollToBottom();

  await callAIExplain(true, userMessage);
};

// 调用 AI 讲解（支持首次和追问）
const callAIExplain = async (isFollowUp = false, userMessage = '') => {
  if (!currentQuestion.value) return;

  aiLoading.value = true;
  aiError.value = '';
  aiProviderName.value = '';

  // 清理之前的监听器
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];

  let assistantContent = '';
  let currentProvider = '';

  // 设置流式监听
  const unsubChunk = window.electronAPI.onAIStreamChunk((content: string) => {
    assistantContent += content;
    // 更新最后一条 assistant 消息，如果没有则添加
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

  const unsubDone = window.electronAPI.onAIStreamDone(async () => {
    aiLoading.value = false;
    aiProviderName.value = '';
    // AI 解析完成后，保存到数据库（只保存首次讲解）
    if (!isFollowUp && currentQuestion.value && assistantContent) {
      try {
        await window.electronAPI.updateAIExplanation(currentQuestion.value.id, assistantContent);
        const q = questions.value.find(q => q.id === currentQuestion.value!.id);
        if (q) q.ai_explanation = assistantContent;
      } catch (e) {
        console.error('保存 AI 解析失败:', e);
      }
    }
  });
  aiUnsubscribers.push(unsubDone);

  const unsubError = window.electronAPI.onAIStreamError((error: string) => {
    aiLoading.value = false;
    aiProviderName.value = '';
    aiError.value = error;
  });
  aiUnsubscribers.push(unsubError);

  // 构建选项文本
  let optionsText = '';
  if (currentQuestion.value.question_type === 'single' || currentQuestion.value.question_type === 'multiple') {
    optionsText = optionsList.value.map(o => `${o.key}. ${o.text}`).join('\n');
  } else if (currentQuestion.value.question_type === 'judge') {
    optionsText = '正确\n错误';
  }

  try {
    const providerOrder = getProviderOrder();
    // 预估当前会使用的厂商（第一个）
    currentProvider = providerOrder[0] === 'modelspace' ? 'ModelSpace' : providerOrder[0] === 'deepseek' ? 'DeepSeek' : providerOrder[0];
    aiProviderName.value = currentProvider;

    const result = await window.electronAPI.explainQuestion({
      title: currentQuestion.value.title,
      options: optionsText,
      correctAnswer: currentQuestion.value.correct_answer,
      explanation: currentQuestion.value.explanation || '',
      questionId: currentQuestion.value.id,
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

// 复制题目内容到剪贴板
const copyQuestionContent = async () => {
  if (!currentQuestion.value) return;

  let text = currentQuestion.value.title;

  // 添加选项
  if (currentQuestion.value.question_type === 'single' || currentQuestion.value.question_type === 'multiple') {
    const options = optionsList.value
      .filter(o => !o.deleted)
      .map(o => `${o.key}. ${o.text}`)
      .join('\n');
    if (options) {
      text += '\n\n' + options;
    }
  } else if (currentQuestion.value.question_type === 'judge') {
    text += '\n\n正确\n错误';
  }

  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
    ElMessage.success('题目已复制到剪贴板');
  } catch (e) {
    console.error('复制失败:', e);
    ElMessage.error('复制失败');
  }
};

// AI 聊天区域生成同类题
const generateAISimilarQuestions = async () => {
  if (!currentQuestion.value) return;

  aiSimilarLoading.value = true;
  try {
    const optionsText = optionsList.value.map(o => `${o.key}. ${o.text}`).join('\n');
    const result = await window.electronAPI.generateSimilarQuestions({
      title: currentQuestion.value.title,
      options: optionsText,
      correctAnswer: currentQuestion.value.correct_answer,
      explanation: currentQuestion.value.explanation || '',
      providerOrder: getProviderOrder(),
    });

    if (result.success && result.questions) {
      // 添加 pid 和 directory_id
      const questionsToAdd = result.questions.map((q: any) => ({
        ...q,
        pid: currentQuestion.value!.id,
        directory_id: currentQuestion.value!.directory_id,
        question_type: currentQuestion.value!.question_type,
      }));

      const saved = await window.electronAPI.addSimilarQuestions(questionsToAdd);
      // 追加到已有数组并重新随机排序
      aiSimilarQuestions.value = shuffleArray([...aiSimilarQuestions.value, ...saved]);
      aiSimilarCurrentIndex.value = 0;
      aiSelectedSimilarAnswer.value = '';
      aiShowSimilarAnswer.value = false;
      aiSimilarDeletedOptions.value.clear();
      ElMessage.success(`已追加 ${saved.length} 道同类题，共 ${aiSimilarQuestions.value.length} 道`);
      scrollToBottom();
    } else {
      ElMessage.error(result.error || '生成同类题失败');
    }
  } catch (err: any) {
    ElMessage.error(err.message || '生成同类题失败');
  } finally {
    aiSimilarLoading.value = false;
  }
};

// 当前 AI 同类题
const aiCurrentSimilarQuestion = computed(() => {
  return aiSimilarQuestions.value[aiSimilarCurrentIndex.value] || null;
});

// AI 同类题类型标签
const aiSimilarCurrentTag = computed(() => {
  if (!aiCurrentSimilarQuestion.value) return { text: '', type: 'info' };
  switch (aiCurrentSimilarQuestion.value.question_type) {
    case 'single': return { text: '单选题', type: 'primary' };
    case 'multiple': return { text: '多选题', type: 'warning' };
    case 'judge': return { text: '判断题', type: 'success' };
    default: return { text: '选择题', type: 'primary' };
  }
});

// AI 同类题选项列表
const aiSimilarOptionsList = computed<OptionWithState[]>(() => {
  if (!aiCurrentSimilarQuestion.value) return [];
  const q = aiCurrentSimilarQuestion.value;
  return [
    { key: 'A', text: q.option_a, deleted: aiSimilarDeletedOptions.value.has('A') },
    { key: 'B', text: q.option_b, deleted: aiSimilarDeletedOptions.value.has('B') },
    { key: 'C', text: q.option_c, deleted: aiSimilarDeletedOptions.value.has('C') },
    { key: 'D', text: q.option_d, deleted: aiSimilarDeletedOptions.value.has('D') },
    { key: 'E', text: q.option_e, deleted: aiSimilarDeletedOptions.value.has('E') },
  ].filter(o => o.text !== null && o.text !== undefined);
});

// 选择 AI 同类题选项
const aiSelectSimilarOption = (key: string) => {
  if (aiShowSimilarAnswer.value) return;
  aiSelectedSimilarAnswer.value = key;
  aiShowSimilarAnswer.value = true;
};

// 判断 AI 同类题选项是否正确
const aiIsSimilarCorrectOption = (key: string) => {
  if (!aiCurrentSimilarQuestion.value || !aiShowSimilarAnswer.value) return false;
  return aiCurrentSimilarQuestion.value.correct_answer === key;
};

// 判断 AI 同类题选项是否错误
const aiIsSimilarWrongOption = (key: string) => {
  if (!aiCurrentSimilarQuestion.value || !aiShowSimilarAnswer.value) return false;
  return aiSelectedSimilarAnswer.value === key && aiCurrentSimilarQuestion.value.correct_answer !== key;
};

// 切换删除 AI 同类题选项
const aiToggleDeleteOption = (key: string) => {
  if (aiSimilarDeletedOptions.value.has(key)) {
    aiSimilarDeletedOptions.value.delete(key);
  } else {
    aiSimilarDeletedOptions.value.add(key);
  }
};

// 删除当前 AI 同类题
const aiDeleteCurrentQuestion = () => {
  if (aiSimilarQuestions.value.length === 0) return;
  aiSimilarQuestions.value.splice(aiSimilarCurrentIndex.value, 1);
  aiSelectedSimilarAnswer.value = '';
  aiShowSimilarAnswer.value = false;
  aiSimilarDeletedOptions.value.clear();
  // 如果删除的是最后一题，索引回退
  if (aiSimilarCurrentIndex.value >= aiSimilarQuestions.value.length && aiSimilarCurrentIndex.value > 0) {
    aiSimilarCurrentIndex.value--;
  }
  if (aiSimilarQuestions.value.length === 0) {
    ElMessage.success('已删除全部同类题');
  } else {
    ElMessage.success('已删除本题');
  }
};

// AI 同类题下一题（循环随机出题）
const aiNextSimilarQuestion = () => {
  if (aiSimilarCurrentIndex.value >= aiSimilarQuestions.value.length - 1) {
    // 最后一题：重新打乱顺序，从头再来一组
    aiSimilarQuestions.value = shuffleArray([...aiSimilarQuestions.value]);
    aiSimilarCurrentIndex.value = 0;
  } else {
    aiSimilarCurrentIndex.value++;
  }
  aiSelectedSimilarAnswer.value = '';
  aiShowSimilarAnswer.value = false;
  aiSimilarDeletedOptions.value.clear();
};

// 同类题相关状态
const drawerVisible = ref(false);
const similarLoading = ref(false);
const similarQuestions = ref<Question[]>([]);
const currentSimilarIndex = ref(0);
const selectedSimilarAnswer = ref('');
const showSimilarAnswer = ref(false);
const similarCount = ref(0);

// 当前同类题
const currentSimilarQuestion = computed(() => {
  return similarQuestions.value[currentSimilarIndex.value] || null;
});

// 同类题进度
const similarProgressPercent = computed(() => {
  if (similarQuestions.value.length === 0) return 0;
  return ((currentSimilarIndex.value + 1) / similarQuestions.value.length) * 100;
});

// 同类题类型标签
const similarQuestionTypeTag = computed(() => {
  if (!currentSimilarQuestion.value) return { text: '', type: 'info' };
  switch (currentSimilarQuestion.value.question_type) {
    case 'single': return { text: '单选题', type: 'primary' };
    case 'multiple': return { text: '多选题', type: 'warning' };
    case 'judge': return { text: '判断题', type: 'success' };
    default: return { text: '选择题', type: 'primary' };
  }
});

// 抽屉内同类题删除的选项状态
const similarDeletedOptions = ref<Set<string>>(new Set());

// 同类题选项列表
const similarOptionsList = computed<OptionWithState[]>(() => {
  if (!currentSimilarQuestion.value) return [];
  const q = currentSimilarQuestion.value;
  return [
    { key: 'A', text: q.option_a, deleted: similarDeletedOptions.value.has('A') },
    { key: 'B', text: q.option_b, deleted: similarDeletedOptions.value.has('B') },
    { key: 'C', text: q.option_c, deleted: similarDeletedOptions.value.has('C') },
    { key: 'D', text: q.option_d, deleted: similarDeletedOptions.value.has('D') },
    { key: 'E', text: q.option_e, deleted: similarDeletedOptions.value.has('E') },
  ].filter(o => o.text !== null && o.text !== undefined);
});

// 切换抽屉内同类题选项删除状态
const toggleSimilarDeleteOption = (key: string) => {
  if (similarDeletedOptions.value.has(key)) {
    similarDeletedOptions.value.delete(key);
  } else {
    similarDeletedOptions.value.add(key);
  }
};

// 加载同类题数量
const loadSimilarCount = async () => {
  if (!currentQuestion.value) return;
  try {
    const similar = await window.electronAPI.getSimilarQuestions(currentQuestion.value.id);
    similarCount.value = similar.length;
  } catch (e) {
    console.error('加载同类题数量失败:', e);
  }
};

// 打开同类题抽屉
const openSimilarDrawer = async () => {
  if (!currentQuestion.value) return;
  drawerVisible.value = true;

  // 先清空重置抽屉显示
  similarQuestions.value = [];
  currentSimilarIndex.value = 0;
  selectedSimilarAnswer.value = '';
  showSimilarAnswer.value = false;
  similarLoading.value = false;

  // 查询是否已有同类题，有则反显
  try {
    const existing = await window.electronAPI.getSimilarQuestions(currentQuestion.value.id);
    if (existing.length > 0) {
      similarQuestions.value = existing;
    }
  } catch (e) {
    console.error('查询同类题失败:', e);
  }
};

// 抽屉内生成同类题
const generateSimilarInDrawer = async () => {
  if (!currentQuestion.value) return;

  similarLoading.value = true;
  try {
    const optionsText = optionsList.value.map(o => `${o.key}. ${o.text}`).join('\n');
    const result = await window.electronAPI.generateSimilarQuestions({
      title: currentQuestion.value.title,
      options: optionsText,
      correctAnswer: currentQuestion.value.correct_answer,
      explanation: currentQuestion.value.explanation || '',
      providerOrder: getProviderOrder(),
    });

    if (result.success && result.questions) {
      // 添加 pid 和 directory_id
      const questionsToAdd = result.questions.map((q: any) => ({
        ...q,
        pid: currentQuestion.value!.id,
        directory_id: currentQuestion.value!.directory_id,
        question_type: currentQuestion.value!.question_type,
      }));

      const saved = await window.electronAPI.addSimilarQuestions(questionsToAdd);
      // 追加到已有数组并重新随机排序
      similarQuestions.value = shuffleArray([...similarQuestions.value, ...saved]);
      currentSimilarIndex.value = 0;
      selectedSimilarAnswer.value = '';
      showSimilarAnswer.value = false;
      similarCount.value = similarQuestions.value.length;
      ElMessage.success(`已追加 ${saved.length} 道同类题，共 ${similarQuestions.value.length} 道`);
    } else {
      ElMessage.error(result.error || '生成同类题失败');
    }
  } catch (err: any) {
    ElMessage.error(err.message || '生成同类题失败');
  } finally {
    similarLoading.value = false;
  }
};

// 关闭抽屉
const closeDrawer = () => {
  drawerVisible.value = false;
};

// 选择同类题选项
const selectSimilarOption = (key: string) => {
  if (showSimilarAnswer.value) return;
  selectedSimilarAnswer.value = key;
  showSimilarAnswer.value = true;
};

// 判断同类题选项是否正确
const isSimilarCorrectOption = (key: string) => {
  if (!currentSimilarQuestion.value || !showSimilarAnswer.value) return false;
  return currentSimilarQuestion.value.correct_answer === key;
};

// 判断同类题选项是否错误
const isSimilarWrongOption = (key: string) => {
  if (!currentSimilarQuestion.value || !showSimilarAnswer.value) return false;
  return selectedSimilarAnswer.value === key && currentSimilarQuestion.value.correct_answer !== key;
};

// 下一道同类题（循环随机）
const nextSimilarQuestion = () => {
  if (currentSimilarIndex.value >= similarQuestions.value.length - 1) {
    // 最后一题：重新打乱顺序，从头再来一组
    similarQuestions.value = shuffleArray([...similarQuestions.value]);
    currentSimilarIndex.value = 0;
  } else {
    currentSimilarIndex.value++;
  }
  selectedSimilarAnswer.value = '';
  showSimilarAnswer.value = false;
  similarDeletedOptions.value.clear();
};

// 删除同类题
const deleteSimilarQuestion = async () => {
  if (!currentSimilarQuestion.value) return;
  try {
    const success = await window.electronAPI.deleteQuestion(currentSimilarQuestion.value.id);
    if (success) {
      ElMessage.success('题目已删除');
      similarQuestions.value = similarQuestions.value.filter(q => q.id !== currentSimilarQuestion.value!.id);
      if (similarQuestions.value.length === 0) {
        similarCount.value = 0;
      } else if (currentSimilarIndex.value >= similarQuestions.value.length) {
        currentSimilarIndex.value = similarQuestions.value.length - 1;
      }
      selectedSimilarAnswer.value = '';
      showSimilarAnswer.value = false;
      similarDeletedOptions.value.clear();
    } else {
      ElMessage.error('删除失败');
    }
  } catch (error) {
    ElMessage.error('删除失败');
    console.error(error);
  }
};

// 监听当前题目变化，加载同类题数量
watch(currentQuestion, () => {
  loadSimilarCount();
});

// 组件卸载时清理监听器
onUnmounted(() => {
  aiUnsubscribers.forEach(fn => fn());
});

onMounted(() => {
  loadData();
});
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

:deep(.el-page-header__left) {
  font-size: 18px;
}

:deep(.el-page-header__back) {
  font-size: 18px;
}

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

.answer-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 500;
}

.answer-status .el-icon {
  font-size: 24px;
}

.correct-text {
  color: #67C23A;
}

.wrong-text {
  color: #F56C6C;
}

.correct-answer {
  color: #6b6560;
  font-size: 16px;
  font-weight: normal;
  margin-left: 8px;
}

.next-question-btn {
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
  margin-left:0;
}

.next-question-btn:hover:not(:disabled) {
  background-color: #333;
  transform: translateY(-1px);
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
  width: 100%;
}

.delete-question-btn:hover {
  background-color: #f78989;
  transform: translateY(-1px);
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
  transform: translateY(-1px);
}

.handwrite-btn.active {
  background-color: #8b9a6d;
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

.case-handwrite {
  margin: 20px 0;
}

.question-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 28px;
  line-height: 1.6;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.option-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.option-row .delete-btn {
  flex-shrink: 0;
  align-self: center;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #F56C6C;
  font-size: 32px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.option-row .delete-btn:hover {
  background-color: #fef0f0;
}

.option-item {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 22px 24px;
  border: 1.5px solid #e8e4df;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  gap: 14px;
  background: #fff;
  min-height: 64px;
}

.option-item:hover:not(.deleted) {
  border-color: #c4a882;
  background-color: #fdfbf8;
}

.option-row.selected .option-item {
  border-color: #8b9a6d;
  background-color: #f5f7f0;
}

.option-row.correct .option-item {
  border-color: #67C23A;
  background-color: #f0f9eb;
}

.option-row.wrong .option-item {
  border-color: #F56C6C;
  background-color: #fef0f0;
}

.option-row.deleted .option-item {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f5f3f0;
}

.result-icon {
  font-size: 24px;
  margin-left: auto;
  flex-shrink: 0;
}

.correct-icon {
  color: #67C23A;
}

.wrong-icon {
  color: #F56C6C;
}


.option-key {
  font-weight: 600;
  color: #1a1a1a;
  flex-shrink: 0;
  font-size: 20px;
}

.option-text {
  flex: 1;
  color: #4a4540;
  font-size: 20px;
}

.strikethrough {
  text-decoration: line-through;
  color: #9a9590;
}

.judge-options .option-text {
  font-size: 20px;
  font-weight: 500;
}

.answer-section {
  margin-top: 24px;
  text-align: center;
}

.answer-result {
  margin-top: 14px;
}

.explanation-line {
  font-size: 22px;
  color: #1a1a1a;
  line-height: 1.8;
  padding: 10px 0;
}

/* Markdown 渲染样式 */
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

.confirm-btn {
  margin-top: 20px;
  width: 100%;
  padding: 18px 20px;
  font-size: 16px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  transition: all 0.2s ease;
  min-height: 56px;
  height: auto;
}

.confirm-btn:hover {
  background: #333;
  transform: translateY(-1px);
}

/* 文章题样式 */
.write-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paragraph-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.paragraph-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.paragraph-item {
  flex: 1;
  padding: 20px 24px;
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

.toggle-btn {
  flex-shrink: 0;
  align-self: center;
  min-height: 56px;
  padding: 16px 20px;
  font-size: 16px;
  border-radius: 12px;
}

/* AI 讲解按钮 */
.ai-explain-section {
  margin-top: 20px;
  display: flex;
  justify-content: flex-start;
  gap: 12px;
}

.ai-explain-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  transition: all 0.2s ease;
  min-height: 52px;
  height: auto;
}

.ai-explain-btn:hover {
  background-color: #333;
  transform: translateY(-1px);
}

/* AI 讲解抽屉 */
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

.ai-chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
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
  padding:18px 19px;
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
  gap: 12px;
  flex-shrink: 0;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.ai-chat-input {
  flex: 1;
}

.ai-chat-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 16px;
  resize: none;
}

.ai-send-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 16px;
  transition: all 0.2s ease;
  min-height: 52px;
  height: auto;
}

.ai-send-btn:hover:not(:disabled) {
  background-color: #333;
  transform: translateY(-1px);
}

.ai-send-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

/* AI 聊天区域同类题样式 */
.similar-bubble {
  width: 100%;
  max-width: 100%;
  padding:10px 0;
  display:flex;
  flex-direction:column;
  gap:5px;
}

.generate-similar-btn {
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 15px;
  width:200px;
}

.generate-similar-btn:hover {
  background: #333;
}

.ai-similar-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.ai-similar-main {
  flex: 1;
  min-width: 0;
}

.ai-similar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ai-similar-progress {
  font-size: 14px;
  color: #9a9590;
}

.ai-similar-title {
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.ai-similar-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.ai-similar-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #f8f7f5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-similar-option:hover {
  background: #f0ece7;
}

.ai-similar-option.selected {
  background: #e8f5e9;
  border: 1.5px solid #c8e6c9;
}

.ai-similar-option.correct {
  background: #e8f5e9;
  border: 1.5px solid #67c23a;
}

.ai-similar-option.wrong {
  background: #fef0f0;
  border: 1.5px solid #f56c6c;
}

.ai-similar-option.deleted {
  opacity: 0.3;
  text-decoration: line-through;
  pointer-events: none;
}

.ai-similar-option .delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: #f56c6c;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 18px;
}

.ai-similar-option .delete-btn.is-deleted {
  color: #c0c4cc;
}

.ai-similar-option .delete-btn:hover {
  color: #ff7875;
}

.ai-similar-option .option-content {
  flex: 1;
  display: flex;
  gap: 8px;
  font-size: 16px;
}

.ai-similar-answer {
  margin-bottom: 16px;
}

.ai-similar-answer .answer-label {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.ai-similar-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.ai-similar-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
}

.ai-similar-actions .nav-btn {
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 17px;
  min-height: 52px;
  height: auto;
  min-width: 120px;
}

.ai-similar-actions .delete-question-btn {
  background: transparent;
  color: #f56c6c;
  border: 1.5px solid #f56c6c;
}

.ai-similar-actions .delete-question-btn:hover {
  background: #fef0f0;
}

.ai-similar-actions .next-btn {
  background: #1a1a1a;
  color: #fff;
  border: none;
  min-width: 120px;
  margin-left:0
}

.ai-similar-actions .next-btn:hover:not(:disabled) {
  background: #333;
}

/* Markdown 渲染样式 */
.ai-markdown {
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
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

.ai-markdown :deep(p) {
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
  margin-bottom: 12px;
  padding-left: 24px;
}

.ai-markdown :deep(li) {
  margin-bottom: 6px;
}

.ai-markdown :deep(blockquote) {
  border-left: 4px solid #c4a882;
  padding-left: 16px;
  margin-left: 0;
  color: #6b6560;
  font-style: italic;
}

.ai-markdown :deep(hr) {
  border: none;
  border-top: 1px solid #e8e4df;
  margin: 20px 0;
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

/* 同类题按钮 */
.similar-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  transition: all 0.2s ease;
  min-height: 52px;
  height: auto;
  position: relative;
}

.similar-btn:hover {
  background-color: #333;
  transform: translateY(-1px);
}

.similar-count {
  margin-left: 8px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

/* 同类题抽屉 */
.similar-drawer-overlay {
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

.similar-drawer-overlay.show {
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.similar-drawer {
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

.similar-drawer.show {
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
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.drawer-close {
  font-size: 24px;
  cursor: pointer;
  color: #6b6560;
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

.similar-quiz {
  max-width: 900px;
  margin: 0 auto;
}

.similar-progress {
  margin-bottom: 20px;
}

.similar-progress span {
  display: block;
  margin-bottom: 12px;
  color: #6b6560;
  font-size: 16px;
  font-weight: 500;
}

.similar-quiz-main {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;
}

.similar-question-card {
  flex: 1;
  min-width: 0;
  border-radius: 20px;
  border: 1px solid #e8e4df;
  background: #fff;
}

.similar-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
  margin-top: 0;
}

.similar-actions .delete-question-btn {
  background: transparent;
  color: #f56c6c;
  border: 1.5px solid #f56c6c;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 17px;
  min-height: 52px;
  height: auto;
  min-width: 120px;
}

.similar-actions .delete-question-btn:hover {
  background: #fef0f0;
}

.similar-actions .next-question-btn {
  background: #1a1a1a;
  color: #fff;
  border: none;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 17px;
  min-height: 52px;
  height: auto;
  min-width: 120px;
}

.similar-actions .next-question-btn:hover {
  background: #333;
}

.similar-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6b6560;
  font-size: 16px;
  padding: 60px 0;
}

.similar-empty {
  padding: 60px 0;
}

/* 抽屉内选项删除按钮 */
.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.option-row .delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: #f56c6c;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 18px;
}

.option-row .delete-btn.is-deleted {
  color: #c0c4cc;
}

.option-row .delete-btn:hover {
  color: #ff7875;
}

.option-row.deleted .option-item {
  opacity: 0.3;
  text-decoration: line-through;
  pointer-events: none;
}

.option-row .option-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #f8f7f5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-row .option-item:hover {
  background: #f0ece7;
}
</style>

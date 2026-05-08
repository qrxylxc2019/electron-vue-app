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
            </template>

            <div class="question-title">{{ currentQuestion.title }}</div>

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
                  <span class="option-text" :class="{ 'strikethrough': option.deleted }">
                    {{ option.text || '无内容' }}
                  </span>
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
                class="paragraph-row"
              >
                <div
                  class="paragraph-item"
                  :class="{ 'hidden': hiddenParagraphs.has(index) }"
                >
                  <p class="paragraph-text">{{ paragraph }}</p>
                </div>
                <el-button
                  class="toggle-btn"
                  @click="toggleParagraph(index)"
                >
                  {{ hiddenParagraphs.has(index) ? '显示' : '隐藏' }}
                </el-button>
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

            <!-- 答案显示 -->
            <div v-if="showAnswer" class="answer-result">
              <el-divider />
              <div v-if="currentQuestion.explanation" class="explanation-line">
                <strong>解析：</strong>{{ currentQuestion.explanation }}
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：下一题按钮 -->
        <div class="quiz-right">
          <el-button
            class="next-question-btn"
            @click="nextQuestion"
            :disabled="currentIndex === (isArticleMode ? articles.length : questions.length) - 1"
          >
            下一题 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <el-empty v-else :description="isArticleMode ? '暂无文章' : '暂无题目'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Question, Article, QuestionType, OptionWithState } from '../types';

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
  }
};

// 重置题目状态（换题时保留删除的选项）
const resetQuestionState = () => {
  selectedAnswer.value = '';
  selectedAnswers.value.clear();
  showAnswer.value = false;
};

// 监听题目变化，清空删除状态
watch(currentQuestion, () => {
  deletedOptions.value.clear();
  hiddenParagraphs.value.clear();
  selectedAnswer.value = '';
  selectedAnswers.value.clear();
  showAnswer.value = false;
});

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.quiz-container {
  padding: 20px 4vw;
  width: 100%;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-page-header__content) {
  font-size: 24px;
  font-weight: 500;
  color: #1a1a1a;
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
}

.next-question-btn:hover:not(:disabled) {
  background-color: #333;
  transform: translateY(-1px);
}

.next-question-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.question-title {
  font-size: 24px;
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
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #F56C6C;
  font-size: 22px;
  border-radius: 50%;
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
  font-size: 17px;
}

.option-text {
  flex: 1;
  color: #4a4540;
  font-size: 17px;
}

.strikethrough {
  text-decoration: line-through;
  color: #9a9590;
}

.judge-options .option-text {
  font-size: 18px;
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
  font-size: 20px;
  color: #1a1a1a;
  line-height: 1.8;
  padding: 10px 0;
}


.confirm-btn {
  margin-top: 20px;
  width: 100%;
  padding: 18px 24px;
  font-size: 18px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  transition: all 0.2s ease;
  min-height: 56px;
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
  font-size: 18px;
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
</style>

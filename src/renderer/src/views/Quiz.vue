<template>
  <div class="quiz-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="quiz-content" v-if="questions.length > 0 && currentQuestion">
      <!-- 左右导航箭头 + 中间内容 -->
      <div class="quiz-main">
        <!-- 左箭头 -->
        <el-button
          class="nav-arrow"
          circle
          size="large"
          @click="prevQuestion"
          :disabled="currentIndex === 0"
        >
          <el-icon><ArrowLeft /></el-icon>
        </el-button>

        <!-- 中间内容 -->
        <div class="quiz-center">
          <!-- 题目进度 -->
          <div class="progress-bar">
            <span class="progress-text">题目 {{ currentIndex + 1 }} / {{ questions.length }}</span>
            <el-progress :percentage="progressPercent" :show-text="false" />
          </div>

          <!-- 题目内容 -->
          <el-card class="question-card">
            <template #header>
              <div class="question-header">
                <el-tag :type="questionTypeTag.type">
                  {{ questionTypeTag.text }}
                </el-tag>
              </div>
            </template>

            <div class="question-title">{{ currentQuestion.title }}</div>

            <!-- 选择题选项 -->
            <div v-if="currentQuestion.question_type === 'single' || currentQuestion.question_type === 'multiple'" class="options-list">
              <div
                v-for="option in optionsList"
                :key="option.key"
                class="option-item"
                :class="{ 
                  'selected': currentQuestion.question_type === 'multiple' ? selectedAnswers.has(option.key) : selectedAnswer === option.key, 
                  'deleted': option.deleted 
                }"
                @click="selectOption(option.key)"
              >
                <el-button
                  type="danger"
                  circle
                  size="small"
                  class="delete-btn"
                  @click.stop="toggleDelete(option.key)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
                <span class="option-key">{{ option.key }}.</span>
                <span class="option-text" :class="{ 'strikethrough': option.deleted }">
                  {{ option.text || '无内容' }}
                </span>
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

            <!-- 判断题选项 -->
            <div v-else class="options-list judge-options">
              <div
                v-for="option in judgeOptions"
                :key="option.key"
                class="option-item"
                :class="{ 'selected': selectedAnswer === option.key, 'deleted': option.deleted }"
                @click="selectOption(option.key)"
              >
                <el-button
                  type="danger"
                  circle
                  size="small"
                  class="delete-btn"
                  @click.stop="toggleDelete(option.key)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
                <span class="option-text" :class="{ 'strikethrough': option.deleted }">
                  {{ option.text }}
                </span>
              </div>
            </div>

            <!-- 答案显示 -->
            <div v-if="showAnswer" class="answer-result">
              <el-divider />
              <div class="result-content">
                <el-result
                  :icon="isCorrect ? 'success' : 'error'"
                  :title="isCorrect ? '答对了！' : '答错了！'"
                  :sub-title="`正确答案：${currentQuestion.correct_answer}`"
                />
                <div v-if="currentQuestion.explanation" class="explanation">
                  <el-alert type="info" :closable="false">
                    <template #title>
                      <strong>解析：</strong>{{ currentQuestion.explanation }}
                    </template>
                  </el-alert>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右箭头 -->
        <el-button
          class="nav-arrow nav-arrow-right next-btn"
          circle
          size="large"
          @click="nextQuestion"
          :disabled="currentIndex === questions.length - 1"
        >
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <el-empty v-else description="暂无题目" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Question, QuestionType, OptionWithState } from '../types';

const props = defineProps<{
  directoryId: string;
}>();

const router = useRouter();
const route = useRoute();
const directoryName = ref('');
const questions = ref<Question[]>([]);
const currentIndex = ref(0);
const selectedAnswer = ref<string>('');
const selectedAnswers = ref<Set<string>>(new Set()); // 多选题选中的答案
const showAnswer = ref(false);
const deletedOptions = ref<Set<string>>(new Set());

// 当前题目
const currentQuestion = computed(() => {
  return questions.value[currentIndex.value] || null;
});

// 进度百分比
const progressPercent = computed(() => {
  if (questions.value.length === 0) return 0;
  return ((currentIndex.value + 1) / questions.value.length) * 100;
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
    default: return { text: '选择题', type: 'primary' };
  }
});

// 选择题选项列表
const optionsList = computed<OptionWithState[]>(() => {
  if (!currentQuestion.value || currentQuestion.value.question_type !== 'single' && question_type !== 'multiple') return [];
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

// 加载数据
const loadData = async () => {
  try {
    const dirId = parseInt(props.directoryId);
    const dirs = await window.electronAPI.getDirectories();
    const dir = dirs.find(d => d.id === dirId);
    if (dir) {
      directoryName.value = dir.name;
    }

    let qs = await window.electronAPI.getQuestions(dirId);
    
    // 处理出题设置参数
    const mode = route.query.mode as string;
    const count = parseInt(route.query.count as string) || qs.length;
    const repeat = parseInt(route.query.repeat as string) || 1;
    
    if (mode === 'random' && count < qs.length) {
      // 随机抽取指定数量的题目
      qs = shuffleArray([...qs]).slice(0, count);
    }
    
    if (repeat > 1) {
      // 重复出题
      const repeated: Question[] = [];
      for (let i = 0; i < repeat; i++) {
        repeated.push(...qs);
      }
      qs = repeated;
    }
    
    questions.value = qs;
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



// 上一题
const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetQuestionState();
  }
};

// 下一题
const nextQuestion = () => {
  if (currentIndex.value < questions.value.length - 1) {
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
}

.quiz-main {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 100%;
}

.quiz-center {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.quiz-center::-webkit-scrollbar {
  display: none;
}

.progress-bar {
  margin-bottom: 28px;
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

.option-item {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  border: 1.5px solid #e8e4df;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  gap: 14px;
  background: #fff;
}

.option-item:hover:not(.deleted) {
  border-color: #c4a882;
  background-color: #fdfbf8;
}

.option-item.selected {
  border-color: #8b9a6d;
  background-color: #f5f7f0;
}

.option-item.deleted {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f5f3f0;
}

.delete-btn {
  flex-shrink: 0;
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

.result-content {
  padding: 14px 0;
}

.explanation {
  margin-top: 14px;
}

.nav-arrow {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  font-size: 24px;
  border: 1.5px solid #e8e4df;
  background: #fff;
  color: #6b6560;
  transition: all 0.2s ease;
}

.nav-arrow:hover:not(:disabled) {
  border-color: #c4a882;
  background: #fdfbf8;
  color: #1a1a1a;
}

.next-btn {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #fff;
}

.next-btn:hover:not(:disabled) {
  background: #333;
  border-color: #333;
  color: #fff;
}

.confirm-btn {
  margin-top: 20px;
  width: 100%;
  padding: 16px 24px;
  font-size: 18px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.confirm-btn:hover {
  background: #333;
  transform: translateY(-1px);
}
</style>

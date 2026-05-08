<template>
  <div class="quiz-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="quiz-content" v-if="questions.length > 0 && currentQuestion">
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
            <span class="option-key">{{ option.key }}.</span>
            <span class="option-text" :class="{ 'strikethrough': option.deleted }">
              {{ option.text || '无内容' }}
            </span>
          </div>
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

      <!-- 导航按钮 -->
      <div class="nav-buttons">
        <el-button @click="prevQuestion" :disabled="currentIndex === 0">
          上一题
        </el-button>
        <el-button type="primary" @click="nextQuestion" :disabled="currentIndex === questions.length - 1">
          下一题
        </el-button>
      </div>
    </div>

    <el-empty v-else description="暂无题目" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Question, QuestionType, OptionWithState } from '../types';

const props = defineProps<{
  directoryId: string;
}>();

const router = useRouter();
const directoryName = ref('');
const questions = ref<Question[]>([]);
const currentIndex = ref(0);
const selectedAnswer = ref<string>('');
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

    const qs = await window.electronAPI.getQuestions(dirId);
    questions.value = qs;
    resetState();
  } catch (error) {
    ElMessage.error('加载题目失败');
    console.error(error);
  }
};

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
  selectedAnswer.value = key;
  // 即选即判断
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
  showAnswer.value = false;
};

// 监听题目变化，清空删除状态
watch(currentQuestion, () => {
  deletedOptions.value.clear();
  selectedAnswer.value = '';
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
}

.quiz-content {
  margin-top: 20px;
}

.progress-bar {
  margin-bottom: 20px;
}

.progress-text {
  display: block;
  margin-bottom: 8px;
  color: #606266;
  font-size: 14px;
}

.question-card {
  margin-bottom: 20px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 20px;
  line-height: 1.6;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 10px;
}

.option-item:hover:not(.deleted) {
  border-color: #409EFF;
  background-color: #ecf5ff;
}

.option-item.selected {
  border-color: #67C23A;
  background-color: #f0f9eb;
}

.option-item.deleted {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f5f7fa;
}

.delete-btn {
  flex-shrink: 0;
}

.option-key {
  font-weight: bold;
  color: #303133;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  color: #606266;
}

.strikethrough {
  text-decoration: line-through;
  color: #909399;
}

.judge-options .option-text {
  font-size: 16px;
  font-weight: 500;
}

.answer-section {
  margin-top: 20px;
  text-align: center;
}

.answer-result {
  margin-top: 10px;
}

.result-content {
  padding: 10px 0;
}

.explanation {
  margin-top: 10px;
}

.nav-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}
</style>

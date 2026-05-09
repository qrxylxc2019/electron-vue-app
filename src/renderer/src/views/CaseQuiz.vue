<template>
  <div class="case-quiz-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="case-content" v-if="currentMaterial">
      <!-- 案例进度 -->
      <div class="progress-bar">
        <span class="progress-text">案例 {{ currentMaterialIndex + 1 }} / {{ materials.length }}</span>
        <el-progress :percentage="materialProgressPercent" :show-text="false" />
      </div>

      <!-- 左右布局主体 -->
      <div class="case-main-wrapper">
        <!-- 左侧：上下布局的内容区 -->
        <div class="case-main">
          <!-- 上面：材料内容 -->
          <div class="material-section">
            <el-card class="material-card">
              <template #header>
                <div class="material-header">
                  <el-tag type="info">案例材料</el-tag>
                  <span class="material-title">{{ currentMaterial.title }}</span>
                </div>
              </template>
              <div class="material-content">{{ currentMaterial.content }}</div>
            </el-card>
          </div>

          <!-- 下面：小题内容 -->
          <div class="question-section" v-if="currentCaseQuestion">
            <el-card class="question-card">
              <template #header>
                <div class="question-header">
                  <el-tag type="warning">第 {{ currentCaseQuestion.question_number }} 小题</el-tag>
                  <span class="question-count">{{ currentQuestionIndex + 1 }} / {{ caseQuestions.length }}</span>
                </div>
              </template>

              <div class="question-title">{{ currentCaseQuestion.title }}</div>

              <!-- 答案区域 -->
              <div class="answer-section">
                <el-button
                  class="toggle-answer-btn"
                  @click="showAnswer = !showAnswer"
                >
                  <el-icon><View v-if="!showAnswer" /><Hide v-else /></el-icon>
                  {{ showAnswer ? '隐藏答案' : '显示答案' }}
                </el-button>

                <div v-if="showAnswer && currentCaseQuestion.answer" class="answer-content">
                  <el-divider />
                  <div class="answer-label">参考答案：</div>
                  <div class="answer-text">{{ currentCaseQuestion.answer }}</div>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 无小题提示 -->
          <el-empty v-else description="该案例暂无小题" />

          <!-- 底部小题导航 -->
          <div class="bottom-nav">
            <el-button
              class="nav-btn prev-btn"
              @click="prevQuestion"
              :disabled="currentQuestionIndex === 0"
            >
              <el-icon><ArrowLeft /></el-icon> 上一题
            </el-button>

            <el-button
              class="nav-btn next-btn"
              @click="nextQuestion"
              :disabled="isLastQuestion"
            >
              下一题 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
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
              class="next-material-btn"
              @click="nextMaterial"
              :disabled="currentMaterialIndex === materials.length - 1"
            >
              下一大题 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无案例题目" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { CaseMaterial, CaseQuestion } from '../types';

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
// 当前小题索引
const currentQuestionIndex = ref(0);
// 是否显示答案
const showAnswer = ref(false);

// 当前案例材料
const currentMaterial = computed(() => {
  return materials.value[currentMaterialIndex.value] || null;
});

// 当前案例的所有小题
const caseQuestions = computed(() => {
  if (!currentMaterial.value) return [];
  return caseQuestionsMap.value[currentMaterial.value.id] || [];
});

// 当前小题
const currentCaseQuestion = computed(() => {
  return caseQuestions.value[currentQuestionIndex.value] || null;
});

// 案例进度百分比
const materialProgressPercent = computed(() => {
  if (materials.value.length === 0) return 0;
  return ((currentMaterialIndex.value + 1) / materials.value.length) * 100;
});

// 是否是当前案例的最后一个小题
const isLastQuestion = computed(() => {
  if (caseQuestions.value.length === 0) return true;
  return currentQuestionIndex.value === caseQuestions.value.length - 1;
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

    // 加载案例材料
    const mats = await window.electronAPI.getCaseMaterials(dirId);
    if (mats.length === 0) {
      ElMessage.warning('该科目暂无案例');
      return;
    }
    materials.value = mats;

    // 加载每个材料的小题
    for (const mat of mats) {
      const questions = await window.electronAPI.getCaseQuestions(mat.id);
      caseQuestionsMap.value[mat.id] = questions;
    }

    // 重置状态
    currentMaterialIndex.value = 0;
    currentQuestionIndex.value = 0;
    showAnswer.value = false;
  } catch (error) {
    ElMessage.error('加载案例失败');
    console.error(error);
  }
};

// 返回首页
const goBack = () => {
  router.push({ name: 'Home' });
};

// 上一题（仅在同案例的小题间切换，不跨案例）
const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    // 同一案例的上一小题
    currentQuestionIndex.value--;
    showAnswer.value = false;
  }
};

// 下一题（仅在同案例的小题间切换，不跨案例）
const nextQuestion = () => {
  if (currentQuestionIndex.value < caseQuestions.value.length - 1) {
    // 同一案例的下一小题
    currentQuestionIndex.value++;
    showAnswer.value = false;
  }
};

// 下一大题
const nextMaterial = () => {
  if (currentMaterialIndex.value < materials.value.length - 1) {
    currentMaterialIndex.value++;
    currentQuestionIndex.value = 0;
    showAnswer.value = false;
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
      currentQuestionIndex.value = 0;
      showAnswer.value = false;
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
</script>

<style scoped>
.case-quiz-container {
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

.case-main {
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

.case-main::-webkit-scrollbar {
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
  transform: translateY(-1px);
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
  transform: translateY(-1px);
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
  gap: 12px;
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
  white-space: pre-wrap;
  padding: 8px 0;
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

.bottom-nav {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 16px 0;
  flex-shrink: 0;
}

.nav-btn {
  border-radius: 12px;
  padding: 18px 36px;
  font-size: 18px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
}

.prev-btn {
  background-color: transparent;
  color: #1a1a1a;
  border: 1.5px solid #e8e4df;
}

.prev-btn:hover:not(:disabled) {
  border-color: #c4a882;
  background-color: #fdfbf8;
}

.next-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
}

.next-btn:hover:not(:disabled) {
  background-color: #333;
  transform: translateY(-1px);
}

.nav-btn:disabled {
  background-color: #c0c4cc;
  border-color: #c0c4cc;
  color: #fff;
  cursor: not-allowed;
}

:deep(.el-tag) {
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 8px;
}
</style>

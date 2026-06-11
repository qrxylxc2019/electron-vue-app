<template>
  <div class="english-word-container">
    <div class="header">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h2 class="title">英语单词 {{ currentRange }}</h2>
      <div class="header-actions">
        <el-button class="mode-btn" @click="toggleMode">
          {{ showMeaning ? '隐藏释义' : '显示释义' }}
        </el-button>
      </div>
    </div>

    <div class="word-grid">
      <div
        v-for="(word, index) in currentWords"
        :key="index"
        class="word-card"
        :class="{ 'show-meaning': showMeaning }"
      >
        <div class="word-text">{{ word.word }}</div>
        <div class="word-phonetic">{{ word.phonetic }}</div>
        <div class="word-meaning">{{ word.meaning }}</div>
      </div>
    </div>

    <div class="pagination-bar">
      <el-button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="prevPage"
      >
        <el-icon><ArrowLeft /></el-icon> 上一页
      </el-button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <el-button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="nextPage"
      >
        下一页 <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const router = useRouter()

// 模拟英语单词数据（考研核心词汇）
const allWords = ref([
  { word: 'abandon', phonetic: '/əˈbændən/', meaning: 'v. 放弃，抛弃' },
  { word: 'ability', phonetic: '/əˈbɪləti/', meaning: 'n. 能力，才能' },
  { word: 'absolute', phonetic: '/ˈæbsəluːt/', meaning: 'adj. 绝对的，完全的' },
  { word: 'absorb', phonetic: '/əbˈsɔːrb/', meaning: 'v. 吸收，吸引' },
  { word: 'abstract', phonetic: '/ˈæbstrækt/', meaning: 'adj. 抽象的 n. 摘要' },
  { word: 'abundant', phonetic: '/əˈbʌndənt/', meaning: 'adj. 丰富的，充裕的' },
  { word: 'academic', phonetic: '/ˌækəˈdemɪk/', meaning: 'adj. 学术的，学院的' },
  { word: 'accelerate', phonetic: '/əkˈseləreɪt/', meaning: 'v. 加速，促进' },
  { word: 'access', phonetic: '/ˈækses/', meaning: 'n. 进入，通道 v. 存取' },
  { word: 'accommodate', phonetic: '/əˈkɒmədeɪt/', meaning: 'v. 容纳，适应' },
])

const WORDS_PER_PAGE = 200
const currentPage = ref(1)
const showMeaning = ref(false)

const totalPages = computed(() => Math.ceil(allWords.value.length / WORDS_PER_PAGE))

const currentWords = computed(() => {
  const start = (currentPage.value - 1) * WORDS_PER_PAGE
  const end = start + WORDS_PER_PAGE
  return allWords.value.slice(start, end)
})

const currentRange = computed(() => {
  const start = (currentPage.value - 1) * WORDS_PER_PAGE + 1
  const end = Math.min(currentPage.value * WORDS_PER_PAGE, allWords.value.length)
  return `(${start}-${end})`
})

const goBack = () => {
  router.push('/')
}

const toggleMode = () => {
  showMeaning.value = !showMeaning.value
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}
</script>

<style scoped>
.english-word-container {
  padding: 20px;
  background-color: #faf8f5;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #3d3d3a;
  margin: 0;
}

.back-btn,
.mode-btn {
  background-color: #f5f0e8;
  border-color: #e8e4df;
  color: #3d3d3a;
  border-radius: 10px;
}

.back-btn:hover,
.mode-btn:hover {
  background-color: #efe9de;
  border-color: #cc785c;
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.word-card {
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.word-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #cc785c;
}

.word-text {
  font-size: 18px;
  font-weight: 600;
  color: #3d3d3a;
  margin-bottom: 4px;
}

.word-phonetic {
  font-size: 13px;
  color: #8e8b82;
  margin-bottom: 8px;
}

.word-meaning {
  font-size: 14px;
  color: #6c6a64;
  line-height: 1.4;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.word-card.show-meaning .word-meaning {
  opacity: 1;
}

.pagination-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8e4df;
}

.page-btn {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  color: #fff;
  border-radius: 10px;
}

.page-btn:hover:not(:disabled) {
  background-color: #7a895c;
  border-color: #7a895c;
}

.page-btn:disabled {
  background-color: #c0c4cc;
  border-color: #c0c4cc;
}

.page-info {
  font-size: 16px;
  color: #3d3d3a;
  font-weight: 500;
}
</style>

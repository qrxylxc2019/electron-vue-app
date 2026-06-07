<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2025-07-09 08:15:30
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2025-07-09 08:15:30
 * @FilePath: \学瑞软件\frontend\src\views\EnglishOral\EnglishOral.vue
 * @Description: 英语口语练习组件
-->
<template>
  <div class="english-oral-container">
    <h1>英语口语练习</h1>
    <div class="content-area">
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>口语练习主题</span>
            <el-button class="button" text>刷新</el-button>
          </div>
        </template>
        <div class="topic-content">
          <p>{{ currentTopic }}</p>
          <div class="action-buttons">
            <el-button type="primary" @click="startPractice">开始练习</el-button>
            <el-button @click="getNewTopic">换一个话题</el-button>
          </div>
        </div>
      </el-card>

      <el-card class="box-card" v-if="isPracticing">
        <template #header>
          <div class="card-header">
            <span>录音区域</span>
            <el-button class="button" text @click="stopPractice">结束练习</el-button>
          </div>
        </template>
        <div class="record-area">
          <div class="timer">{{ formatTime(recordingTime) }}</div>
          <div class="record-controls">
            <el-button type="danger" :icon="isRecording ? 'el-icon-video-pause' : 'el-icon-video-play'" 
              @click="toggleRecording">
              {{ isRecording ? '暂停录音' : '开始录音' }}
            </el-button>
            <el-button type="success" :disabled="!hasRecording" @click="playRecording">播放录音</el-button>
            <el-button type="info" :disabled="!hasRecording" @click="saveRecording">保存录音</el-button>
          </div>
        </div>
      </el-card>

      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>历史录音</span>
          </div>
        </template>
        <div class="history-list">
          <el-empty v-if="recordingHistory.length === 0" description="暂无录音历史"></el-empty>
          <el-table v-else :data="recordingHistory" style="width: 100%">
            <el-table-column prop="date" label="日期" width="180"></el-table-column>
            <el-table-column prop="topic" label="话题"></el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="scope">
                <el-button size="small" @click="playHistoryRecording(scope.row)">播放</el-button>
                <el-button size="small" type="danger" @click="deleteRecording(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// 示例话题列表
const topics = [
  "描述你最喜欢的旅行目的地",
  "谈谈你的职业规划",
  "你如何看待人工智能的发展",
  "介绍你的家乡",
  "谈谈你最喜欢的电影或书籍",
  "如何保持健康的生活方式",
  "分享一个你克服困难的故事"
];

const currentTopic = ref(topics[0]);
const isPracticing = ref(false);
const isRecording = ref(false);
const recordingTime = ref(0);
const hasRecording = ref(false);
const recordingHistory = ref([]);
let timerInterval = null;

// 获取新话题
const getNewTopic = () => {
  const randomIndex = Math.floor(Math.random() * topics.length);
  currentTopic.value = topics[randomIndex];
};

// 开始练习
const startPractice = () => {
  isPracticing.value = true;
};

// 结束练习
const stopPractice = () => {
  if (isRecording.value) {
    toggleRecording();
  }
  isPracticing.value = false;
  recordingTime.value = 0;
};

// 切换录音状态
const toggleRecording = () => {
  isRecording.value = !isRecording.value;
  
  if (isRecording.value) {
    // 开始录音逻辑
    startTimer();
    // 这里应该添加实际的录音API调用
    console.log('开始录音');
  } else {
    // 停止录音逻辑
    stopTimer();
    hasRecording.value = true;
    // 这里应该添加实际的停止录音API调用
    console.log('停止录音');
  }
};

// 播放录音
const playRecording = () => {
  // 播放录音逻辑
  console.log('播放录音');
};

// 保存录音
const saveRecording = () => {
  // 保存录音逻辑
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  
  recordingHistory.value.unshift({
    date: dateStr,
    topic: currentTopic.value,
    audioUrl: '#' // 这里应该是实际的音频URL
  });
  
  hasRecording.value = false;
  console.log('保存录音');
};

// 播放历史录音
const playHistoryRecording = (recording) => {
  console.log('播放历史录音', recording);
  // 实际的播放逻辑
};

// 删除录音
const deleteRecording = (index) => {
  recordingHistory.value.splice(index, 1);
};

// 格式化时间
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 计时器
const startTimer = () => {
  timerInterval = setInterval(() => {
    recordingTime.value++;
  }, 1000);
};

const stopTimer = () => {
  clearInterval(timerInterval);
};

// 组件挂载时
onMounted(() => {
  getNewTopic();
  // 可以从本地存储加载历史录音
});

// 组件卸载时
onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<style scoped>
.english-oral-container {
  padding: 20px;
  margin: 0 auto;
  background-color: #faf8f5;
  min-height: 100vh;
  color: #1a1a1a;
  padding:20px;
}

h1 {
  color: #8b9a6d;
  text-align: center;
  margin-bottom: 30px;
}

.content-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.box-card {
  margin-bottom: 20px;
  --el-card-bg-color: #fff;
  --el-card-border-color: #e8e4df;
  border-radius: 12px;
}

:deep(.el-card__header) {
  background-color: #f5f3f0;
  border-bottom: 1px solid #e8e4df;
  color: #1a1a1a;
  font-weight: 600;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topic-content {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 20px;
  color: #1a1a1a;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.record-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.timer {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #8b9a6d;
}

.record-controls {
  display: flex;
  gap: 15px;
}

.history-list {
  min-height: 200px;
}

/* Element Plus 按钮主题覆盖 - 参照 Note.vue Commerce 风格 */
:deep(.el-button--primary) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  border-radius: 10px;
}

:deep(.el-button--primary:hover) {
  background-color: #7a895c;
  border-color: #7a895c;
}

:deep(.el-button--danger) {
  background-color: #e8686a;
  border-color: #e8686a;
  border-radius: 10px;
}

:deep(.el-button--danger:hover) {
  background-color: #d8585a;
  border-color: #d8585a;
}

:deep(.el-button--success) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  border-radius: 10px;
}

:deep(.el-button--success:hover) {
  background-color: #7a895c;
  border-color: #7a895c;
}

:deep(.el-button--info) {
  background-color: #9a9590;
  border-color: #9a9590;
  border-radius: 10px;
}

:deep(.el-button--info:hover) {
  background-color: #8a8580;
  border-color: #8a8580;
}

:deep(.el-button--default) {
  background-color: #f5f3f0;
  border-color: #e8e4df;
  color: #6b6560;
  border-radius: 10px;
}

:deep(.el-button--default:hover) {
  background-color: #e8e4df;
  border-color: #d8d4cf;
  color: #5b5650;
}

:deep(.el-button.is-text) {
  color: #8b9a6d;
}

:deep(.el-button.is-text:hover) {
  color: #7a895c;
  background-color: rgba(139, 154, 109, 0.1);
}

/* 输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

/* Tag 样式 */
:deep(.el-tag) {
  border-radius: 8px;
}
</style> 
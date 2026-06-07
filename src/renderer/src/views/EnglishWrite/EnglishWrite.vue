<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2025-07-09 08:15:30
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2025-07-09 08:15:30
 * @FilePath: \学瑞软件\frontend\src\views\EnglishWrite\EnglishWrite.vue
 * @Description: 英语写作练习组件
-->
<template>
  <div class="english-write-container">
    <h1>英语写作练习</h1>
    
    <div class="content-area">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="box-card">
            <template #header>
              <div class="card-header">
                <span>写作主题</span>
                <el-button class="button" text @click="getNewTopic">换一个话题</el-button>
              </div>
            </template>
            <div class="topic-content">
              <h3>{{ currentTopic.title }}</h3>
              <p>{{ currentTopic.description }}</p>
              <div class="topic-info">
                <el-tag>{{ currentTopic.type }}</el-tag>
                <el-tag type="success">建议字数: {{ currentTopic.wordCount }}</el-tag>
                <el-tag type="warning">难度: {{ currentTopic.difficulty }}</el-tag>
              </div>
            </div>
          </el-card>
          
          <el-card class="box-card mt-20">
            <template #header>
              <div class="card-header">
                <span>写作区域</span>
                <div>
                  <el-button type="primary" @click="saveEssay">保存</el-button>
                  <el-button @click="clearEssay">清空</el-button>
                </div>
              </div>
            </template>
            <div class="essay-area">
              <el-input
                v-model="essayContent"
                type="textarea"
                :rows="15"
                placeholder="在此处开始你的写作..."
                @input="updateWordCount"
              ></el-input>
              <div class="word-count">
                <span :class="{ 'text-danger': isOverWordLimit }">当前字数: {{ wordCount }}</span>
                <span v-if="currentTopic.wordCount"> / 建议字数: {{ currentTopic.wordCount }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card class="box-card">
            <template #header>
              <div class="card-header">
                <span>AI 写作助手</span>
                <el-button class="button" text @click="getAIFeedback">获取反馈</el-button>
              </div>
            </template>
            <div class="ai-feedback" v-loading="isLoading">
              <template v-if="aiFeedback">
                <div class="feedback-section">
                  <h4>整体评价</h4>
                  <p>{{ aiFeedback.overview }}</p>
                </div>
                
                <div class="feedback-section">
                  <h4>语法与拼写</h4>
                  <ul>
                    <li v-for="(item, index) in aiFeedback.grammar" :key="'grammar-'+index">
                      {{ item }}
                    </li>
                  </ul>
                </div>
                
                <div class="feedback-section">
                  <h4>结构与逻辑</h4>
                  <p>{{ aiFeedback.structure }}</p>
                </div>
                
                <div class="feedback-section">
                  <h4>词汇建议</h4>
                  <ul>
                    <li v-for="(item, index) in aiFeedback.vocabulary" :key="'vocab-'+index">
                      <strong>{{ item.original }}</strong> → <span class="suggestion">{{ item.suggestion }}</span>
                    </li>
                  </ul>
                </div>
                
                <div class="feedback-section">
                  <h4>改进建议</h4>
                  <p>{{ aiFeedback.improvements }}</p>
                </div>
                
                <div class="score-section">
                  <h4>得分评估</h4>
                  <el-progress :percentage="aiFeedback.score" :format="formatScore" :stroke-width="18"></el-progress>
                </div>
              </template>
              
              <el-empty v-else description="点击按钮获取AI评价"></el-empty>
            </div>
          </el-card>
          
          <el-card class="box-card mt-20">
            <template #header>
              <div class="card-header">
                <span>历史作文</span>
              </div>
            </template>
            <div class="history-list">
              <el-empty v-if="essayHistory.length === 0" description="暂无历史作文"></el-empty>
              <el-table v-else :data="essayHistory" style="width: 100%">
                <el-table-column prop="date" label="日期" width="120"></el-table-column>
                <el-table-column prop="title" label="主题"></el-table-column>
                <el-table-column prop="wordCount" label="字数" width="80"></el-table-column>
                <el-table-column prop="score" label="评分" width="80">
                  <template #default="scope">
                    {{ scope.row.score || '未评分' }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150">
                  <template #default="scope">
                    <el-button size="small" @click="loadEssay(scope.row)">加载</el-button>
                    <el-button size="small" type="danger" @click="deleteEssay(scope.$index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

// 写作主题列表
const topicList = [
  {
    title: "The Importance of Education",
    description: "Discuss the role of education in modern society and its impact on personal development.",
    type: "议论文",
    wordCount: 300,
    difficulty: "中等"
  },
  {
    title: "Technology and Society",
    description: "How has technology changed the way we live and communicate? Discuss the benefits and drawbacks.",
    type: "议论文",
    wordCount: 350,
    difficulty: "中等"
  },
  {
    title: "Environmental Protection",
    description: "What are the major environmental challenges facing our planet today? What can individuals do to help?",
    type: "议论文",
    wordCount: 400,
    difficulty: "中高级"
  },
  {
    title: "My Favorite Holiday",
    description: "Describe your favorite holiday experience. What made it special and memorable?",
    type: "记叙文",
    wordCount: 250,
    difficulty: "初级"
  },
  {
    title: "Social Media Influence",
    description: "How does social media influence young people's behavior and thinking? Is this influence positive or negative?",
    type: "议论文",
    wordCount: 400,
    difficulty: "中高级"
  }
];

// 响应式数据
const currentTopic = ref(topicList[0]);
const essayContent = ref('');
const wordCount = ref(0);
const isLoading = ref(false);
const aiFeedback = ref(null);
const essayHistory = ref([]);

// 计算属性
const isOverWordLimit = computed(() => {
  if (!currentTopic.value.wordCount) return false;
  return wordCount.value > currentTopic.value.wordCount * 1.2;
});

// 获取新话题
const getNewTopic = () => {
  const randomIndex = Math.floor(Math.random() * topicList.length);
  currentTopic.value = topicList[randomIndex];
};

// 更新字数统计
const updateWordCount = () => {
  const text = essayContent.value.trim();
  if (!text) {
    wordCount.value = 0;
    return;
  }
  
  // 简单的英文单词计数方法
  const words = text.split(/\s+/);
  wordCount.value = words.filter(word => word.length > 0).length;
};

// 清空作文内容
const clearEssay = () => {
  essayContent.value = '';
  wordCount.value = 0;
  aiFeedback.value = null;
};

// 保存作文
const saveEssay = () => {
  if (!essayContent.value.trim()) {
    ElMessage.warning('作文内容不能为空');
    return;
  }
  
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  
  essayHistory.value.unshift({
    id: Date.now(),
    date: dateStr,
    title: currentTopic.value.title,
    content: essayContent.value,
    wordCount: wordCount.value,
    score: aiFeedback.value ? aiFeedback.value.score : null,
    topicData: currentTopic.value
  });
  
  ElMessage.success('作文已保存');
  
  // 这里可以添加实际的保存逻辑，如保存到本地存储或发送到服务器
};

// 加载历史作文
const loadEssay = (essay) => {
  essayContent.value = essay.content;
  currentTopic.value = essay.topicData;
  updateWordCount();
  
  if (essay.score) {
    aiFeedback.value = {
      score: essay.score,
      // 其他反馈信息可以从服务器获取或本地存储中恢复
      overview: '这是您之前保存的作文，AI评分已恢复。',
      grammar: [],
      structure: '结构已评估',
      vocabulary: [],
      improvements: '请点击"获取反馈"以获取新的详细评价。'
    };
  } else {
    aiFeedback.value = null;
  }
  
  ElMessage.success('作文已加载');
};

// 删除历史作文
const deleteEssay = (index) => {
  essayHistory.value.splice(index, 1);
  ElMessage.success('作文已删除');
};

// 获取AI反馈
const getAIFeedback = () => {
  if (!essayContent.value.trim()) {
    ElMessage.warning('请先编写作文内容');
    return;
  }
  
  isLoading.value = true;
  
  // 模拟API调用
  setTimeout(() => {
    // 这里应该是实际的AI评估API调用
    aiFeedback.value = {
      overview: '这是一篇结构清晰的文章，主题明确，论点有力。有一些语法错误和词汇使用不当的地方需要改进。',
      grammar: [
        '第2段第3句中，应使用过去时态而非现在时态。',
        '第3段中有几处冠词使用错误。',
        '注意连接词的使用，某些地方过于重复。'
      ],
      structure: '文章结构良好，有明确的开头、主体和结尾。建议在段落之间添加更多的过渡句，使文章更加连贯。',
      vocabulary: [
        { original: 'very good', suggestion: 'excellent' },
        { original: 'a lot of', suggestion: 'numerous' },
        { original: 'bad', suggestion: 'detrimental' }
      ],
      improvements: '建议扩展结论部分，总结主要观点并提供更深入的见解。可以考虑增加一些具体的例子来支持你的论点。',
      score: 75
    };
    
    isLoading.value = false;
  }, 1500);
};

// 格式化分数显示
const formatScore = (percentage) => {
  return `${percentage}分`;
};

// 组件挂载时
onMounted(() => {
  getNewTopic();
  // 可以从本地存储加载历史作文
});
</script>

<style scoped>
.english-write-container {
  background-color: #faf8f5;
  height: 100%;
  color: #1a1a1a;
  padding:20px;
}

h1 {
  color: #8b9a6d;
  text-align: center;
  margin-bottom: 30px;
}

.content-area {
  margin-bottom: 30px;
}

.box-card {
  margin-bottom: 20px;
  height: 100%;
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

.mt-20 {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topic-content {
  margin-bottom: 20px;
}

.topic-content h3 {
  margin-bottom: 15px;
  color: #1a1a1a;
}

.topic-content p {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 20px;
  color: #6b6560;
}

.topic-info {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.essay-area {
  margin-bottom: 20px;
}

.word-count {
  margin-top: 10px;
  text-align: right;
  color: #6b6560;
  font-size: 14px;
}

.text-danger {
  color: #e8686a;
}

.ai-feedback {
  min-height: 300px;
}

.feedback-section {
  margin-bottom: 20px;
}

.feedback-section h4 {
  margin-bottom: 10px;
  color: #1a1a1a;
  font-weight: bold;
}

.feedback-section ul {
  padding-left: 20px;
  margin-bottom: 10px;
}

.feedback-section li {
  margin-bottom: 5px;
  color: #1a1a1a;
}

.suggestion {
  color: #8b9a6d;
  font-weight: bold;
}

.score-section {
  margin-top: 30px;
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
:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
}

:deep(.el-textarea__inner) {
  color: #1a1a1a;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
  border-color: #c4a882 !important;
}

/* Tag 样式 */
:deep(.el-tag) {
  border-radius: 8px;
}
</style> 
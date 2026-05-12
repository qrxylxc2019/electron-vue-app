﻿﻿﻿﻿﻿<template>
  <div class="directory-list">
    <div class="header">
      <h1>选择科目</h1>
      <div class="header-actions">
        <el-button class="settings-btn" @click="openGlobalQuizSettings">
          <el-icon><Setting /></el-icon>出题设置
        </el-button>
        <el-button class="fullscreen-btn" @click="toggleFullscreen">
          <el-icon><FullScreen /></el-icon>
          {{ isFullscreen ? '取消全屏' : '全屏' }}
        </el-button>
        <el-button style="display:none" class="add-btn" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>新增科目
        </el-button>
      </div>
    </div>
    <div class="directory-grid">
      <div
        v-for="dir in directories"
        :key="dir.id"
        class="directory-card"
        @click="enterQuiz(dir.id)"
      >
        <div class="card-content">
          <el-icon size="56" color="#c4a882"><Folder /></el-icon>
          <span class="directory-name">{{ dir.name }}</span>
          <span class="directory-count">
            {{ dir.name === '高项论文' ? getArticleCount(dir.id) : dir.name === '高项案例' ? getCaseCount(dir.id) : getQuestionCount(dir.id) }} 题
          </span>
        </div>
      </div>
    </div>
    <el-empty v-if="directories.length === 0" description="暂无科目，请添加数据" />

    <!-- 新增科目对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="新增科目"
      width="400px"
      class="warm-dialog"
    >
      <el-form :model="newDirectory" label-width="80px">
        <el-form-item label="科目名称">
          <el-input v-model="newDirectory.name" placeholder="请输入科目名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button class="add-btn" @click="addDirectory">确定</el-button>
      </template>
    </el-dialog>

    <!-- 出题设置对话框 -->
    <el-dialog
      v-model="showSettingsDialog"
      title="出题设置"
      width="500px"
      class="warm-dialog"
    >
      <el-form :model="quizSettings" label-width="120px">
        <el-form-item label="出题模式">
          <el-radio-group v-model="quizSettings.mode">
            <el-radio label="all">全部题目</el-radio>
            <el-radio label="random">随机出题</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出题数量" v-if="quizSettings.mode === 'random'">
          <el-input-number v-model="quizSettings.count" :min="1" :max="200" :step="1" />
        </el-form-item>
        <el-form-item label="重复次数">
          <el-input-number v-model="quizSettings.repeat" :min="1" :max="10" :step="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button class="add-btn" @click="saveQuizSettings">保存设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Directory, Article } from '../types';

const router = useRouter();
const directories = ref<Directory[]>([]);
const questionCounts = ref<Record<number, number>>({});
const articleCounts = ref<Record<number, number>>({});
const caseCounts = ref<Record<number, number>>({});
const showAddDialog = ref(false);
const newDirectory = ref({ name: '' });
const isFullscreen = ref(false);
const showSettingsDialog = ref(false);
const selectedDirId = ref<number>(0);
const SETTINGS_KEY = 'quizSettings';

const quizSettings = ref({
  mode: 'all',
  count: 20,
  repeat: 5
});

// 从缓存加载设置
const loadSettingsFromStorage = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      quizSettings.value.mode = parsed.mode ?? 'all';
      quizSettings.value.count = parsed.count ?? 20;
      quizSettings.value.repeat = parsed.repeat ?? 5;
    }
  } catch (e) {
    console.error('加载设置失败:', e);
  }
};

// 保存设置到缓存
const saveSettingsToStorage = () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(quizSettings.value));
  } catch (e) {
    console.error('保存设置失败:', e);
  }
};

// 切换全屏
const toggleFullscreen = async () => {
  try {
    const result = await window.electronAPI.toggleFullscreen();
    isFullscreen.value = result;
  } catch (error) {
    console.error('切换全屏失败:', error);
  }
};

// 检查全屏状态
const checkFullscreen = async () => {
  try {
    isFullscreen.value = await window.electronAPI.isFullScreen();
  } catch (error) {
    console.error('获取全屏状态失败:', error);
  }
};

const loadDirectories = async () => {
  try {
    const dirs = await window.electronAPI.getDirectories();
    directories.value = dirs;

    // 获取每个目录的题目数量
    for (const dir of dirs) {
      if (dir.name === '高项论文') {
        const articles = await window.electronAPI.getArticles(dir.id);
        articleCounts.value[dir.id] = articles.length;
      } else if (dir.name === '高项案例') {
        const materials = await window.electronAPI.getCaseMaterials(dir.id);
        caseCounts.value[dir.id] = materials.length;
      } else {
        const questions = await window.electronAPI.getQuestions(dir.id);
        questionCounts.value[dir.id] = questions.length;
      }
    }
  } catch (error) {
    ElMessage.error('加载目录失败');
    console.error(error);
  }
};

const getQuestionCount = (dirId: number) => {
  return questionCounts.value[dirId] || 0;
};

const getArticleCount = (dirId: number) => {
  return articleCounts.value[dirId] || 0;
};

const getCaseCount = (dirId: number) => {
  return caseCounts.value[dirId] || 0;
};


const enterQuiz = (directoryId: number) => {
  const dir = directories.value.find(d => d.id === directoryId);
  const isArticleDir = dir?.name === '高项论文';
  const isCaseDir = dir?.name === '高项案例';
  const count = isArticleDir ? getArticleCount(directoryId) : getQuestionCount(directoryId);

  if (count === 0 && !isCaseDir) {
    ElMessage.warning('该科目暂无题目');
    return;
  }

  // 高项案例进入案例题页面
  if (isCaseDir) {
    router.push({
      name: 'CaseQuiz',
      params: { directoryId: directoryId.toString() },
      query: {
        mode: quizSettings.value.mode,
        count: quizSettings.value.count.toString(),
        repeat: quizSettings.value.repeat.toString()
      }
    });
    return;
  }

  router.push({
    name: 'Quiz',
    params: { directoryId: directoryId.toString() },
    query: {
      mode: quizSettings.value.mode,
      count: quizSettings.value.count.toString(),
      repeat: quizSettings.value.repeat.toString(),
      isArticle: isArticleDir ? '1' : '0'
    }
  });
};

// 打开全局出题设置（不绑定具体科目）
const openGlobalQuizSettings = () => {
  showSettingsDialog.value = true;
};

// 保存设置
const saveQuizSettings = () => {
  saveSettingsToStorage();
  showSettingsDialog.value = false;
  ElMessage.success('设置已保存');
};

const addDirectory = async () => {
  if (!newDirectory.value.name.trim()) {
    ElMessage.warning('请输入科目名称');
    return;
  }
  try {
    const result = await window.electronAPI.addDirectory(newDirectory.value.name.trim());
    if (result) {
      ElMessage.success('添加成功');
      showAddDialog.value = false;
      newDirectory.value.name = '';
      await loadDirectories();
    } else {
      ElMessage.error('添加失败');
    }
  } catch (error) {
    ElMessage.error('添加失败');
    console.error(error);
  }
};

onMounted(() => {
  loadDirectories();
  checkFullscreen();
  loadSettingsFromStorage();
});
</script>

<style scoped>
.directory-list {
  padding: 40px 2vw;
  width: 100%;
  margin: 0 auto;
  max-width: 1200px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

h1 {
  color: #1a1a1a;
  margin: 0;
  font-size: 36px;
  font-weight: 500;
  letter-spacing: -0.5px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.fullscreen-btn {
  background-color: transparent;
  color: #1a1a1a;
  border: 1.5px solid #e8e4df;
  border-radius: 12px;
  padding: 22px 32px;
  font-size: 18px;
  transition: all 0.2s ease;
  min-height: 56px;
}

.fullscreen-btn:hover {
  border-color: #c4a882;
  background-color: #fdfbf8;
}

.add-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 22px 36px;
  font-size: 18px;
  transition: all 0.2s ease;
  min-height: 56px;
}

.add-btn:hover {
  background-color: #333;
  transform: translateY(-1px);
}

.directory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 32px;
}

.directory-card {
  transition: all 0.3s ease;
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 24px;
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.directory-card:hover {
  transform: translateY(-4px);
  border-color: #c4a882;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 14px;
  margin-top: 28px;
  width: 100%;
  justify-content: center;
}

.header-actions .settings-btn {
  background-color: transparent;
  color: #1a1a1a;
  border: 1.5px solid #e8e4df;
  border-radius: 12px;
  padding: 22px 32px;
  font-size: 18px;
  transition: all 0.2s ease;
  min-height: 56px;
}

.header-actions .settings-btn:hover {
  border-color: #c4a882;
  background-color: #fdfbf8;
}

.directory-name {
  font-size: 20px;
  font-weight: 500;
  color: #1a1a1a;
}

.directory-count {
  font-size: 15px;
  color: #9a9590;
}

.similar-badge {
  font-size: 13px;
  color: #fff;
  background: #c4a882;
  padding: 4px 12px;
  border-radius: 12px;
  margin-top: 4px;
}
</style>

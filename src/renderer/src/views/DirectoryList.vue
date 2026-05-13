﻿<template>
  <div class="directory-list">
    <div class="header">
      <h1>选择科目</h1>
      <div class="header-actions">
        <el-button class="settings-btn" @click="openGlobalQuizSettings">
          <el-icon><Setting /></el-icon>设置
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

    <!-- 设置对话框 -->
    <el-dialog
      v-model="showSettingsDialog"
      title="设置"
      width="700px"
      class="warm-dialog settings-dialog"
    >
      <div class="settings-layout">
        <!-- 左侧菜单 -->
        <div class="settings-menu">
          <div
            class="menu-item"
            :class="{ active: activeSettingsTab === 'mode' }"
            @click="activeSettingsTab = 'mode'"
          >
            <el-icon><Document /></el-icon>
            <span>模式</span>
          </div>
          <div
            class="menu-item"
            :class="{ active: activeSettingsTab === 'api' }"
            @click="activeSettingsTab = 'api'"
          >
            <el-icon><Connection /></el-icon>
            <span>API设置</span>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="settings-content">
          <!-- 模式设置 -->
          <div v-if="activeSettingsTab === 'mode'" class="settings-panel">
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
          </div>

          <!-- API设置 -->
          <div v-if="activeSettingsTab === 'api'" class="settings-panel">
            <div class="api-sort-hint">拖拽调整调用优先级</div>
            <div class="api-provider-list">
              <div
                v-for="(provider, index) in apiProviderOrder"
                :key="provider.key"
                class="api-provider-item"
                draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragover.prevent
                @drop="handleDrop($event, index)"
              >
                <span class="provider-rank">{{ index + 1 }}</span>
                <span class="provider-name">{{ provider.name }}</span>
                <el-icon class="drag-icon"><Rank /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button class="add-btn" @click="saveSettings">保存设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Directory, Article } from '../types';
import { Rank } from '@element-plus/icons-vue';

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

const API_PROVIDERS = [
  { key: 'modelspace', name: 'ModelSpace' },
  { key: 'deepseek', name: 'DeepSeek' },
];

const apiProviderOrder = ref([...API_PROVIDERS]);

const activeSettingsTab = ref('mode');

// 从缓存加载出题设置
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

const API_ORDER_KEY = 'apiProviderOrder';

// 从本地缓存加载 API 厂商排序
const loadApiSettings = () => {
  try {
    const stored = localStorage.getItem(API_ORDER_KEY);
    if (stored) {
      const order = JSON.parse(stored) as string[];
      // 根据缓存的 key 顺序重新排列
      const sorted = order
        .map((key) => API_PROVIDERS.find((p) => p.key === key))
        .filter(Boolean) as typeof API_PROVIDERS;
      // 补充可能新增的厂商
      const remaining = API_PROVIDERS.filter((p) => !order.includes(p.key));
      apiProviderOrder.value = [...sorted, ...remaining];
    }
  } catch (e) {
    console.error('加载API设置失败:', e);
  }
};

// 保存设置到缓存
const saveSettingsToStorage = () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(quizSettings.value));
    localStorage.setItem(API_ORDER_KEY, JSON.stringify(apiProviderOrder.value.map((p) => p.key)));
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
const saveSettings = () => {
  saveSettingsToStorage();
  showSettingsDialog.value = false;
  ElMessage.success('设置已保存');
};

// 拖拽排序
let dragIndex = -1;

const handleDragStart = (e: DragEvent, index: number) => {
  dragIndex = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
  }
};

const handleDrop = (_e: DragEvent, dropIndex: number) => {
  if (dragIndex === -1 || dragIndex === dropIndex) return;
  const list = [...apiProviderOrder.value];
  const [removed] = list.splice(dragIndex, 1);
  list.splice(dropIndex, 0, removed);
  apiProviderOrder.value = list;
  dragIndex = -1;
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
  loadApiSettings();
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

/* 设置对话框样式 */
:deep(.settings-dialog .el-dialog__body) {
  padding: 0;
}

.settings-layout {
  display: flex;
  min-height: 300px;
}

.settings-menu {
  width: 140px;
  background: #f5f3f0;
  border-right: 1px solid #e8e4df;
  padding: 16px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b6560;
  font-size: 14px;
}

.menu-item:hover {
  background: #e8e4df;
  color: #1a1a1a;
}

.menu-item.active {
  background: #fff;
  color: #1a1a1a;
  border-right: 3px solid #c4a882;
}

.menu-item .el-icon {
  font-size: 16px;
}

.settings-content {
  flex: 1;
  padding: 24px;
}

.settings-panel {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* API 厂商排序样式 */
.api-sort-hint {
  font-size: 13px;
  color: #9a9590;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f5f3f0;
  border-radius: 8px;
}

.api-provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-provider-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1.5px solid #e8e4df;
  border-radius: 10px;
  cursor: move;
  transition: all 0.2s ease;
}

.api-provider-item:hover {
  border-color: #c4a882;
  background: #fdfbf8;
}

.provider-rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c4a882;
  color: #fff;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
}

.provider-name {
  flex: 1;
  font-size: 15px;
  color: #1a1a1a;
  font-weight: 500;
}

.drag-icon {
  color: #c4a882;
  font-size: 18px;
}
</style>

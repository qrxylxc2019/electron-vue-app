﻿<template>
  <div class="directory-list">
    <div class="header">
      <h1>选择科目</h1>
      <div class="header-actions">
        <el-button class="settings-btn" @click="openGlobalQuizSettings">
          <el-icon><Setting /></el-icon>设置
        </el-button>
        <el-button class="ds-test-btn" style="display:none" @click="showDSTestDialog = true">
          <el-icon><ChatDotRound /></el-icon>DeepSeek测试
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
            <!-- DeepSeek 本地版 Token 设置 -->
            <div class="deepseek-local-section">
              <div class="section-title">DeepSeek 本地版设置</div>
              <el-input
                v-model="deepseekLocalToken"
                placeholder="请输入 DeepSeek 本地版 Token"
                show-password
                class="deepseek-token-input"
              >
                <template #append>
                  <el-button @click="testDeepseekLocalToken" :loading="deepseekLocalTesting">测试连接</el-button>
                </template>
              </el-input>
              <el-tag v-if="deepseekLocalStatus === 'success'" type="success">连接成功</el-tag>
              <el-tag v-if="deepseekLocalStatus === 'error'" type="danger">连接失败</el-tag>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button class="add-btn" @click="saveSettings">保存设置</el-button>
      </template>
    </el-dialog>

    <!-- DeepSeek 测试对话框 -->
    <el-dialog
      v-model="showDSTestDialog"
      title="DeepSeek 逆向 API 测试"
      width="700px"
      class="warm-dialog ds-test-dialog"
      :close-on-click-modal="false"
    >
      <div class="ds-test-content">
        <!-- Token 设置 -->
        <div class="ds-token-section">
          <el-input
            v-model="dsToken"
            placeholder="请输入 DeepSeek Token (Bearer 后面的内容)"
            show-password
            class="ds-token-input"
          >
            <template #append>
              <el-button @click="initDSToken" :loading="dsInitLoading">初始化</el-button>
            </template>
          </el-input>
          <el-tag v-if="dsTokenValid === true" type="success">Token 有效</el-tag>
          <el-tag v-if="dsTokenValid === false" type="danger">Token 无效</el-tag>
        </div>

        <!-- 模型选择 -->
        <div class="ds-model-section">
          <el-radio-group v-model="dsModel">
            <el-radio-button label="deepseek-chat">普通对话</el-radio-button>
            <el-radio-button label="deepseek-reasoner">深度思考</el-radio-button>
            <el-radio-button label="deepseek-chat-search">联网搜索</el-radio-button>
            <el-radio-button label="deepseek-reasoner-search">思考+搜索</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 对话历史 -->
        <div class="ds-chat-history" ref="chatHistoryRef">
          <div
            v-for="(msg, index) in dsMessages"
            :key="index"
            :class="['ds-message', msg.role === 'user' ? 'ds-user' : 'ds-assistant']"
          >
            <div class="ds-message-role">{{ msg.role === 'user' ? '用户' : 'DeepSeek' }}</div>
            <div class="ds-message-content">{{ msg.content }}</div>
          </div>
          <div v-if="dsLoading" class="ds-message ds-assistant">
            <div class="ds-message-role">DeepSeek</div>
            <div class="ds-message-content">
              <el-icon class="is-loading"><Loading /></el-icon> 思考中...
            </div>
          </div>
        </div>

        <!-- 输入框 -->
        <div class="ds-input-section">
          <el-input
            v-model="dsInput"
            type="textarea"
            :rows="2"
            placeholder="输入消息，按 Enter 发送，Shift+Enter 换行"
            @keydown.enter.prevent="handleDSSend"
            :disabled="dsLoading"
          />
          <el-button
            type="primary"
            class="ds-send-btn"
            @click="handleDSSend"
            :loading="dsLoading"
            :disabled="!dsInput.trim()"
          >
            发送
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Directory, Article } from '../types';
import { Rank, ChatDotRound, Loading } from '@element-plus/icons-vue';

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
  { key: 'deepseekLocal', name: 'DeepSeek本地版' },
];

const apiProviderOrder = ref([...API_PROVIDERS]);

const activeSettingsTab = ref('mode');

// DeepSeek 本地版设置
const deepseekLocalToken = ref('');
const deepseekLocalTesting = ref(false);
const deepseekLocalStatus = ref<'idle' | 'success' | 'error'>('idle');
const DEEPSEEK_LOCAL_TOKEN_KEY = 'deepseekLocalToken';

// DeepSeek 测试相关
const showDSTestDialog = ref(false);
const dsToken = ref('');
const dsTokenValid = ref<boolean | null>(null);
const dsInitLoading = ref(false);
const dsModel = ref('deepseek-chat');
const dsInput = ref('');
const dsLoading = ref(false);
const dsMessages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
const chatHistoryRef = ref<HTMLElement | null>(null);
const DS_SESSION_KEY = 'ds-test-session';
const DS_TOKEN_KEY = 'ds-token';

// 自动滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (chatHistoryRef.value) {
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
  }
};

watch(dsMessages, scrollToBottom, { deep: true });

// 初始化 Token
const initDSToken = async () => {
  if (!dsToken.value.trim()) {
    ElMessage.warning('请输入 Token');
    return;
  }
  dsInitLoading.value = true;
  try {
    // 保存 token
    localStorage.setItem(DS_TOKEN_KEY, dsToken.value.trim());
    // 初始化客户端
    const initResult = await window.electronAPI.dsInitToken(dsToken.value.trim());
    if (!initResult.success) {
      ElMessage.error(initResult.error || '初始化失败');
      dsTokenValid.value = false;
      return;
    }
    // 检查 token 有效性
    const checkResult = await window.electronAPI.dsCheckToken(dsToken.value.trim());
    dsTokenValid.value = checkResult.valid || false;
    if (checkResult.valid) {
      ElMessage.success('Token 有效，已初始化');
    } else {
      ElMessage.warning('Token 可能无效');
    }
  } catch (error: any) {
    ElMessage.error('初始化失败: ' + error.message);
    dsTokenValid.value = false;
  } finally {
    dsInitLoading.value = false;
  }
};

// 发送消息
const handleDSSend = async () => {
  const text = dsInput.value.trim();
  if (!text || dsLoading.value) return;

  // 如果没有初始化过 token，尝试从本地读取
  if (dsTokenValid.value !== true) {
    const savedToken = localStorage.getItem(DS_TOKEN_KEY);
    if (savedToken) {
      dsToken.value = savedToken;
      await initDSToken();
      if (dsTokenValid.value !== true) {
        ElMessage.warning('Token 无效，请先初始化');
        return;
      }
    } else {
      ElMessage.warning('请先输入并初始化 Token');
      return;
    }
  }

  // 添加用户消息
  dsMessages.value.push({ role: 'user', content: text });
  dsInput.value = '';
  dsLoading.value = true;

  // 注册流式监听
  let currentContent = '';
  const removeChunkListener = window.electronAPI.onDSStreamChunk((data) => {
    if (data.sessionKey !== DS_SESSION_KEY) return;
    currentContent += data.content;
    // 更新最后一条 assistant 消息
    const lastMsg = dsMessages.value[dsMessages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = currentContent;
    } else {
      dsMessages.value.push({ role: 'assistant', content: currentContent });
    }
  });

  const removeDoneListener = window.electronAPI.onDSStreamDone((data) => {
    if (data.sessionKey !== DS_SESSION_KEY) return;
    dsLoading.value = false;
    removeChunkListener();
    removeDoneListener();
    removeErrorListener();
  });

  const removeErrorListener = window.electronAPI.onDSStreamError((data) => {
    if (data.sessionKey !== DS_SESSION_KEY) return;
    dsLoading.value = false;
    ElMessage.error('对话错误: ' + data.error);
    removeChunkListener();
    removeDoneListener();
    removeErrorListener();
  });

  try {
    // 先添加一个空的 assistant 消息占位
    dsMessages.value.push({ role: 'assistant', content: '' });

    const result = await window.electronAPI.dsChatStream({
      sessionKey: DS_SESSION_KEY,
      messages: [{ role: 'user', content: text }],
      model: dsModel.value,
      token: dsToken.value,
    });

    if (!result.success) {
      dsLoading.value = false;
      // 移除空消息
      if (dsMessages.value[dsMessages.value.length - 1]?.role === 'assistant' && dsMessages.value[dsMessages.value.length - 1]?.content === '') {
        dsMessages.value.pop();
      }
      ElMessage.error(result.error || '对话失败');
      removeChunkListener();
      removeDoneListener();
      removeErrorListener();
    }
  } catch (error: any) {
    dsLoading.value = false;
    if (dsMessages.value[dsMessages.value.length - 1]?.role === 'assistant' && dsMessages.value[dsMessages.value.length - 1]?.content === '') {
      dsMessages.value.pop();
    }
    ElMessage.error('对话异常: ' + error.message);
    removeChunkListener();
    removeDoneListener();
    removeErrorListener();
  }
};

// 加载保存的 token
const loadSavedToken = () => {
  const saved = localStorage.getItem(DS_TOKEN_KEY);
  if (saved) {
    dsToken.value = saved;
  }
  // 加载 DeepSeek 本地版 Token
  const localSaved = localStorage.getItem(DEEPSEEK_LOCAL_TOKEN_KEY);
  if (localSaved) {
    deepseekLocalToken.value = localSaved;
  }
};

// 测试 DeepSeek 本地版 Token
const testDeepseekLocalToken = async () => {
  if (!deepseekLocalToken.value.trim()) {
    ElMessage.warning('请输入 Token');
    return;
  }
  deepseekLocalTesting.value = true;
  deepseekLocalStatus.value = 'idle';
  try {
    const result = await window.electronAPI.testDeepseekLocalToken(deepseekLocalToken.value.trim());
    if (result.success) {
      deepseekLocalStatus.value = 'success';
      ElMessage.success('连接成功');
      // 保存到本地缓存
      localStorage.setItem(DEEPSEEK_LOCAL_TOKEN_KEY, deepseekLocalToken.value.trim());
    } else {
      deepseekLocalStatus.value = 'error';
      ElMessage.error(result.error || '连接失败');
    }
  } catch (e: any) {
    deepseekLocalStatus.value = 'error';
    ElMessage.error(e.message || '连接失败');
  } finally {
    deepseekLocalTesting.value = false;
  }
};

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
  loadSavedToken();
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

.ds-test-btn {
  background-color: #4a7c59;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 22px 32px;
  font-size: 18px;
  transition: all 0.2s ease;
  min-height: 56px;
}

.ds-test-btn:hover {
  background-color: #3d6b4a;
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

/* DeepSeek 本地版设置样式 */
.deepseek-local-section {
  margin-top: 24px;
  padding: 20px;
  background: #faf9f7;
  border-radius: 12px;
  border: 1px solid #e8e4df;
}

.deepseek-local-section .section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.deepseek-local-section .section-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #4a7c59;
  border-radius: 2px;
}

.deepseek-token-input {
  width: 100%;
}

.deepseek-token-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #e8e4df inset;
  border-radius: 8px;
}

.deepseek-token-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset;
}

.deepseek-token-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4a7c59 inset;
}

.deepseek-token-input :deep(.el-input-group__append) {
  background: #4a7c59;
  border-color: #4a7c59;
  color: #fff;
  padding: 0 16px;
}

.deepseek-token-input :deep(.el-input-group__append .el-button) {
  color: #fff;
  font-weight: 500;
}

.deepseek-token-input :deep(.el-input-group__append:hover) {
  background: #3d6b4a;
  border-color: #3d6b4a;
}

.deepseek-local-section .el-tag {
  margin-top: 12px;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
}

/* DeepSeek 测试对话框样式 */
:deep(.ds-test-dialog .el-dialog__body) {
  padding: 20px;
}

.ds-test-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ds-token-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ds-token-input {
  flex: 1;
}

.ds-model-section {
  display: flex;
  justify-content: center;
}

.ds-chat-history {
  min-height: 300px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  padding: 16px;
  background: #faf9f7;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ds-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 85%;
}

.ds-user {
  align-self: flex-end;
}

.ds-assistant {
  align-self: flex-start;
}

.ds-message-role {
  font-size: 12px;
  color: #9a9590;
  font-weight: 500;
}

.ds-user .ds-message-role {
  text-align: right;
}

.ds-message-content {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.ds-user .ds-message-content {
  background: #4a7c59;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.ds-assistant .ds-message-content {
  background: #fff;
  color: #1a1a1a;
  border: 1px solid #e8e4df;
  border-bottom-left-radius: 4px;
}

.ds-input-section {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.ds-input-section .el-textarea {
  flex: 1;
}

.ds-send-btn {
  min-height: 56px;
  padding: 0 24px;
  border-radius: 12px;
  background: #4a7c59;
  border-color: #4a7c59;
}

.ds-send-btn:hover {
  background: #3d6b4a;
  border-color: #3d6b4a;
}
</style>

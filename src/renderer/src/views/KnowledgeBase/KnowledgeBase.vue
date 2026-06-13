<template>
  <div class="knowledge-base-container">
    <!-- 左侧：知识库文件列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>知识库</h3>
        <el-button text :icon="Refresh" @click="loadFiles" :loading="loadingFiles">
          刷新
        </el-button>
      </div>
      <div class="file-list" v-loading="loadingFiles">
        <div
          v-for="file in fileList"
          :key="file.path"
          :class="['file-item', selectedFiles.includes(file.path) ? 'selected' : '']"
          @click="toggleFile(file.path)"
        >
          <el-icon><Document /></el-icon>
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
        </div>
        <el-empty v-if="fileList.length === 0 && !loadingFiles" description="暂无知识库文件" />
      </div>
      <div class="sidebar-footer">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">添加文件</el-button>
      </div>
    </div>

    <!-- 右侧：Agent 对话区域 -->
    <div class="chat-area">
      <div class="chat-header">
        <div class="header-title">
          <el-icon><Search /></el-icon>
          <span>知识库 Agent 搜索</span>
        </div>
        <div class="header-actions">
          <el-tag v-if="selectedFiles.length > 0" type="info">
            已选 {{ selectedFiles.length }} 个文件
          </el-tag>
          <el-button text :icon="Delete" @click="clearMessages">清空对话</el-button>
        </div>
      </div>

      <!-- 消息展示区域 -->
      <div class="messages-area" ref="messagesRef">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message-item', msg.type]"
        >
          <!-- 用户消息 -->
          <template v-if="msg.type === 'user'">
            <div class="user-bubble">
              <div class="bubble-content">{{ msg.content }}</div>
            </div>
          </template>

          <!-- Agent 思考过程 -->
          <template v-else-if="msg.type === 'thought'">
            <div class="thought-block">
              <div class="thought-header" @click="msg.collapsed = !msg.collapsed">
                <el-icon v-if="msg.loading"><Loading /></el-icon>
                <el-icon v-else><Timer /></el-icon>
                <span class="thought-title">{{ msg.title }}</span>
                <span class="thought-time">{{ msg.duration }}s</span>
                <el-icon class="collapse-icon" :class="{ collapsed: msg.collapsed }">
                  <ArrowDown />
                </el-icon>
              </div>
              <div class="thought-body" v-show="!msg.collapsed">
                <pre>{{ msg.content }}</pre>
              </div>
            </div>
          </template>

          <!-- 知识库检索结果 -->
          <template v-else-if="msg.type === 'retrieve'">
            <div class="retrieve-block">
              <div class="retrieve-header">
                <el-icon><Search /></el-icon>
                <span class="retrieve-label">知识库检索</span>
                <span class="retrieve-query">{{ msg.query }}</span>
              </div>
              <div class="retrieve-results" v-if="msg.results?.length">
                <div
                  v-for="(result, i) in msg.results"
                  :key="i"
                  class="result-item"
                  @click="result.expanded = !result.expanded"
                >
                  <div class="result-header">
                    <span class="result-file">{{ result.file }}</span>
                    <span class="result-score">相关度: {{ (result.score * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="result-content" v-show="result.expanded">
                    <pre>{{ result.content }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 文件操作 -->
          <template v-else-if="msg.type === 'file'">
            <div class="file-operation">
              <div class="file-header">
                <el-icon><Document /></el-icon>
                <span class="file-action-label">{{ msg.action }}</span>
                <span class="file-path">{{ msg.path }}</span>
              </div>
            </div>
          </template>

          <!-- AI 回答 -->
          <template v-else-if="msg.type === 'answer'">
            <div class="answer-block">
              <div class="answer-content" v-html="renderMarkdown(msg.content)"></div>
            </div>
          </template>
        </div>

        <!-- 加载中 -->
        <div v-if="isLoading" class="loading-indicator">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>Agent 正在检索知识库...</span>
        </div>
      </div>

      <!-- 底部输入 -->
      <div class="input-area">
        <div class="input-wrapper">
          <el-input
            v-model="userInput"
            type="textarea"
            :rows="3"
            placeholder="输入问题，Agent 会在知识库中检索并回答..."
            resize="none"
            @keydown.enter="handleEnter"
          />
          <div class="input-actions">
            <span class="hint">Enter 发送，Alt + Enter 换行</span>
            <button
              v-if="!isLoading"
              class="send-btn"
              @click="handleSend"
            >
              <el-icon><Promotion /></el-icon>
              <span>发送</span>
            </button>
            <button
              v-else
              class="send-btn loading-btn"
              @click="handleStop"
            >
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>暂停</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加文件对话框 -->
    <el-dialog v-model="addDialogVisible" title="添加知识库文件" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="文件路径">
          <el-input v-model="addForm.path" placeholder="D:\\knowledge\\xxx.txt" />
        </el-form-item>
        <el-form-item label="或粘贴">
          <el-input
            v-model="addForm.content"
            type="textarea"
            :rows="6"
            placeholder="直接粘贴文本内容..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addFile" :loading="addingFile">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import {
  Search,
  Document,
  Loading,
  Timer,
  ArrowDown,
  Promotion,
  Delete,
  Refresh,
  Plus,
} from '@element-plus/icons-vue'
import { marked } from 'marked'

interface RetrieveResult {
  file: string
  content: string
  score: number
  expanded?: boolean
}

interface Message {
  type: 'user' | 'thought' | 'retrieve' | 'file' | 'answer'
  content?: string
  title?: string
  duration?: number
  loading?: boolean
  collapsed?: boolean
  query?: string
  results?: RetrieveResult[]
  action?: string
  path?: string
}

const userInput = ref('')
const isLoading = ref(false)
const messages = ref<Message[]>([])
const messagesRef = ref<HTMLDivElement>()
const fileList = ref<any[]>([])
const selectedFiles = ref<string[]>([])
const loadingFiles = ref(false)
const addDialogVisible = ref(false)
const addingFile = ref(false)
const addForm = ref({ path: '', content: '' })
const abortController = ref<AbortController | null>(null)

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const renderMarkdown = (text: string) => {
  return marked.parse(text || '', { async: false })
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const toggleFile = (path: string) => {
  const idx = selectedFiles.value.indexOf(path)
  if (idx >= 0) {
    selectedFiles.value.splice(idx, 1)
  } else {
    selectedFiles.value.push(path)
  }
}

const clearMessages = () => {
  messages.value = []
}

const openAddDialog = () => {
  addForm.value = { path: '', content: '' }
  addDialogVisible.value = true
}

// 加载知识库文件列表
const loadFiles = async () => {
  loadingFiles.value = true
  try {
    const result = await (window as any).electronAPI.kbGetFiles()
    if (result?.success) {
      fileList.value = result.data || []
    }
  } catch (e) {
    console.error('加载文件失败:', e)
  } finally {
    loadingFiles.value = false
  }
}

// 添加文件
const addFile = async () => {
  addingFile.value = true
  try {
    const result = await (window as any).electronAPI.kbAddFile({
      path: addForm.value.path,
      content: addForm.value.content,
    })
    if (result?.success) {
      addDialogVisible.value = false
      loadFiles()
    }
  } catch (e) {
    console.error('添加文件失败:', e)
  } finally {
    addingFile.value = false
  }
}

// 发送问题
const handleSend = async () => {
  const prompt = userInput.value.trim()
  if (!prompt || isLoading.value) return
  userInput.value = ''

  messages.value.push({ type: 'user', content: prompt })
  await scrollToBottom()

  isLoading.value = true
  abortController.value = new AbortController()

  try {
    // 调用 Agent 知识库搜索
    const result = await (window as any).electronAPI.kbAgentSearch({
      query: prompt,
      files: selectedFiles.value.length > 0 ? selectedFiles.value : undefined,
    })

    if (result?.success && result.data) {
      const data = result.data

      // 思考过程
      if (data.thought) {
        messages.value.push({
          type: 'thought',
          title: 'Agent 思考',
          content: data.thought,
          duration: data.duration || 0,
          loading: false,
          collapsed: true,
        })
      }

      // 检索结果
      if (data.retrieval?.results?.length) {
        messages.value.push({
          type: 'retrieve',
          query: data.retrieval.query,
          results: data.retrieval.results.map((r: any) => ({
            ...r,
            expanded: false,
          })),
        })
      }

      // 最终回答
      if (data.answer) {
        messages.value.push({
          type: 'answer',
          content: data.answer,
        })
      }
    } else {
      messages.value.push({
        type: 'answer',
        content: '❌ 搜索失败：' + (result?.error || '未知错误'),
      })
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      messages.value.push({
        type: 'answer',
        content: '❌ 搜索出错：' + e.message,
      })
    }
  } finally {
    isLoading.value = false
    abortController.value = null
    await scrollToBottom()
  }
}

const handleStop = () => {
  if (abortController.value) {
    abortController.value.abort()
  }
  isLoading.value = false
}

const handleEnter = (e: KeyboardEvent) => {
  if (e.altKey) {
    userInput.value += '\n'
    e.preventDefault()
  } else {
    e.preventDefault()
    if (isLoading.value) {
      handleStop()
    } else {
      handleSend()
    }
  }
}

onMounted(() => {
  loadFiles()
})
</script>

<style scoped>
.knowledge-base-container {
  display: flex;
  height: 100vh;
  background: #faf8f5;
  color: #1a1a1a;
}

/* 左侧边栏 */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #e5e0d8;
  background: #f3f0ea;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e0d8;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-gutter: stable;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.file-item:hover {
  background: #e5e0d8;
}

.file-item.selected {
  background: #d97757;
  color: #fff;
}

.file-item.selected .file-size {
  color: rgba(255, 255, 255, 0.7);
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #e5e0d8;
}

/* 右侧聊天区域 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e0d8;
  background: #f3f0ea;
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
}

.header-title .el-icon {
  color: #d97757;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 消息区域 */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scrollbar-gutter: stable;
}

/* 用户气泡 */
.user-bubble {
  display: flex;
  justify-content: flex-end;
}

.bubble-content {
  background: #d97757;
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px 12px 2px 12px;
  max-width: 80%;
  font-size: 14px;
  line-height: 1.6;
}

/* 思考块 */
.thought-block {
  background: #f3f0ea;
  border: 1px solid #e5e0d8;
  border-radius: 8px;
  overflow: hidden;
}

.thought-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #888;
  user-select: none;
}

.thought-header:hover {
  background: #ece8e0;
}

.thought-title {
  flex: 1;
  color: #555;
}

.thought-time {
  color: #999;
}

.collapse-icon {
  transition: transform 0.2s;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.thought-body {
  padding: 0 14px 14px;
}

.thought-body pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 检索结果 */
.retrieve-block {
  background: #f3f0ea;
  border: 1px solid #e5e0d8;
  border-radius: 8px;
  overflow: hidden;
}

.retrieve-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid #e5e0d8;
}

.retrieve-label {
  color: #d97757;
  font-weight: 600;
}

.retrieve-query {
  color: #666;
  font-style: italic;
}

.retrieve-results {
  padding: 8px 0;
}

.result-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: #ece8e0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.result-file {
  color: #8b6914;
  font-weight: 500;
}

.result-score {
  color: #999;
  font-size: 12px;
}

.result-content {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
}

.result-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #555;
  font-family: 'Consolas', monospace;
}

/* 文件操作 */
.file-operation {
  background: #f3f0ea;
  border: 1px solid #e5e0d8;
  border-radius: 8px;
  overflow: hidden;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
}

.file-action-label {
  color: #d97757;
  font-weight: 600;
}

.file-path {
  color: #666;
  font-family: 'Consolas', monospace;
}

/* 回答块 */
.answer-block {
  display: flex;
}

.answer-content {
  background: #fff;
  border: 1px solid #e5e0d8;
  padding: 14px 18px;
  border-radius: 12px 12px 12px 2px;
  max-width: 85%;
  font-size: 14px;
  line-height: 1.7;
}

.answer-content :deep(h1),
.answer-content :deep(h2),
.answer-content :deep(h3) {
  margin-top: 12px;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.answer-content :deep(p) {
  margin: 8px 0;
}

.answer-content :deep(code) {
  background: #f3f0ea;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
}

.answer-content :deep(pre) {
  background: #f3f0ea;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}

.answer-content :deep(pre code) {
  background: none;
  padding: 0;
}

/* 加载指示器 */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: #888;
  font-size: 13px;
}

.is-loading {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 输入区域 */
.input-area {
  flex-shrink: 0;
  padding: 12px 20px 20px;
  border-top: 1px solid #e5e0d8;
  background: #f3f0ea;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-wrapper :deep(.el-textarea__inner) {
  background: #fff;
  border-color: #d5d0c8;
  color: #1a1a1a;
  font-size: 14px;
  resize: none;
}

.input-wrapper :deep(.el-textarea__inner:focus) {
  border-color: #d97757;
}

.input-wrapper :deep(.el-textarea__inner::placeholder) {
  color: #999;
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hint {
  font-size: 12px;
  color: #999;
}

.send-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: #d97757;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn:hover {
  background: #c26a4d;
}

.send-btn:active {
  transform: scale(0.96);
}

.loading-btn {
  background: #c0392b;
}

.loading-btn:hover {
  background: #a93226;
}

.send-btn .el-icon {
  font-size: 16px;
}

.send-btn .is-loading {
  animation: rotating 1s linear infinite;
}

/* 滚动条优化 */
.messages-area::-webkit-scrollbar,
.file-list::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb,
.file-list::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}

.messages-area:hover::-webkit-scrollbar-thumb,
.file-list:hover::-webkit-scrollbar-thumb {
  background: #d5d0c8;
}

.messages-area:hover::-webkit-scrollbar-thumb:hover,
.file-list:hover::-webkit-scrollbar-thumb:hover {
  background: #c0bbb3;
}
</style>

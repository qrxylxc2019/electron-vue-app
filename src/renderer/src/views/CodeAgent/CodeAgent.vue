<template>
  <div class="code-agent-container">
    <!-- 顶部标题 -->
    <div class="header-bar">
      <div class="header-title">
        <el-icon><MagicStick /></el-icon>
        <span>Code Agent</span>
      </div>
      <div class="header-actions">
        <el-button :icon="Delete" text @click="clearMessages">清空</el-button>
      </div>
    </div>

    <!-- 消息/执行过程展示区域 -->
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

        <!-- AI 思考过程 -->
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

        <!-- 文件操作（读/写/更新） -->
        <template v-else-if="msg.type === 'file'">
          <div class="file-operation">
            <div class="file-header">
              <el-icon :size="16">
                <Document v-if="msg.action === 'read'" />
                <EditPen v-else-if="msg.action === 'write'" />
                <RefreshRight v-else-if="msg.action === 'update'" />
              </el-icon>
              <span class="file-action-label">{{ getActionLabel(msg.action) }}</span>
              <span class="file-path">{{ msg.path }}</span>
              <span v-if="msg.lines" class="file-lines">{{ msg.lines }}</span>
            </div>
            <div class="file-diff" v-if="msg.diff">
              <div
                v-for="(line, i) in msg.diff"
                :key="i"
                :class="['diff-line', line.type]"
              >
                <span class="line-num">{{ line.num }}</span>
                <span class="line-content">{{ line.content }}</span>
              </div>
            </div>
            <div class="file-content" v-else-if="msg.content">
              <pre><code>{{ msg.content }}</code></pre>
            </div>
          </div>
        </template>

        <!-- 命令执行 -->
        <template v-else-if="msg.type === 'command'">
          <div class="command-block">
            <div class="command-header">
              <el-icon><Monitor /></el-icon>
              <span class="command-text">$ {{ msg.command }}</span>
            </div>
            <div class="command-output" v-if="msg.output">
              <pre>{{ msg.output }}</pre>
            </div>
          </div>
        </template>

        <!-- 最终结果/回复 -->
        <template v-else-if="msg.type === 'result'">
          <div class="result-block">
            <div class="result-content">{{ msg.content }}</div>
          </div>
        </template>
      </div>

      <!-- 加载中指示器 -->
      <div v-if="isLoading" class="loading-indicator">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>Agent 正在思考...</span>
      </div>
    </div>

    <!-- 底部输入区域 -->
    <div class="input-area">
      <div class="input-wrapper">
        <el-input
          v-model="userInput"
          type="textarea"
          :rows="3"
          placeholder="输入提示词，让 Agent 帮你写代码、改文件、执行命令..."
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
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import {
  MagicStick,
  Delete,
  Loading,
  Timer,
  ArrowDown,
  Document,
  EditPen,
  RefreshRight,
  Monitor,
  Promotion,
  VideoPause,
} from '@element-plus/icons-vue'

interface DiffLine {
  num: string
  content: string
  type: 'added' | 'removed' | 'context'
}

interface Message {
  type: 'user' | 'thought' | 'file' | 'command' | 'result'
  content?: string
  title?: string
  duration?: number
  loading?: boolean
  collapsed?: boolean
  action?: 'read' | 'write' | 'update'
  path?: string
  lines?: string
  diff?: DiffLine[]
  command?: string
  output?: string
}

const userInput = ref('')
const isLoading = ref(false)
const messages = ref<Message[]>([])
const messagesRef = ref<HTMLDivElement>()
const abortController = ref<AbortController | null>(null)

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const getActionLabel = (action?: string) => {
  const map: Record<string, string> = {
    read: 'Read',
    write: 'Write',
    update: 'Update',
  }
  return map[action || ''] || action
}

const clearMessages = () => {
  messages.value = []
}

// ========== 假数据模拟 ==========

const mockExecution = async (prompt: string, signal?: AbortSignal) => {
  isLoading.value = true

  // 1. 用户消息
  messages.value.push({ type: 'user', content: prompt })
  await scrollToBottom()

  // 2. 思考过程
  const thoughtMsg: Message = {
    type: 'thought',
    title: 'Thought for 0s',
    content: '',
    duration: 0,
    loading: true,
    collapsed: false,
  }
  messages.value.push(thoughtMsg)
  await scrollToBottom()

  // 模拟思考时间
  let elapsed = 0
  const thoughtInterval = setInterval(() => {
    elapsed += 1
    thoughtMsg.duration = elapsed
    thoughtMsg.title = `Thought for ${elapsed}s`
  }, 1000)

  // 逐步输出思考内容
  const thoughtSteps = [
    '分析用户请求：需要为编程菜单新增 Agent 二级菜单页面',
    '1. 检查现有路由结构，确认编程一级菜单为 /code',
    '2. 规划新增 /codeagent 路由，指向 CodeAgent.vue 组件',
    '3. 需要创建新的 Vue 单文件组件，包含：',
    '   - 顶部标题栏',
    '   - 消息展示区域（支持 thought/file/command/result 类型）',
    '   - 底部输入框（Ctrl+Enter 发送）',
    '4. 参考 Claude Code 的 UI 风格：深色主题、绿色 diff 高亮',
    '5. 决定使用假数据先完成 UI 交互，后续对接真实 API',
  ]

  for (const step of thoughtSteps) {
    if (signal?.aborted) { clearInterval(thoughtInterval); return }
    await new Promise((r) => setTimeout(r, 600))
    if (signal?.aborted) { clearInterval(thoughtInterval); return }
    thoughtMsg.content += step + '\n'
    await scrollToBottom()
  }

  clearInterval(thoughtInterval)
  thoughtMsg.loading = false
  thoughtMsg.duration = elapsed
  thoughtMsg.title = `Thought for ${elapsed}s (ctrl+o to expand)`
  thoughtMsg.collapsed = true
  await scrollToBottom()

  // 3. 文件操作 - 读取路由
  if (signal?.aborted) return
  await new Promise((r) => setTimeout(r, 400))
  if (signal?.aborted) return
  messages.value.push({
    type: 'file',
    action: 'read',
    path: 'src\\renderer\\src\\router\\index.ts',
    content: `import { createRouter, createWebHashHistory } from 'vue-router';
import DirectoryList from '../views/Learn/DirectoryList.vue';
// ... 其他 import
import Prompt from '../views/Prompt/Prompt.vue';

const routes = [
  // ... 现有路由
  { path: '/prompt', name: 'Prompt', component: Prompt },
];`,
  })
  await scrollToBottom()

  // 4. 文件操作 - 写入新组件
  if (signal?.aborted) return
  await new Promise((r) => setTimeout(r, 500))
  if (signal?.aborted) return
  messages.value.push({
    type: 'file',
    action: 'write',
    path: 'src\\renderer\\src\\views\\CodeAgent\\CodeAgent.vue',
    lines: '+ 1,071 lines',
    content: `<template>
  <div class="code-agent-container">
    <!-- 完整组件代码已写入 -->
  </div>
</template>
<script setup lang="ts">
  // ... 组件逻辑
<\/script>`,
  })
  await scrollToBottom()

  // 5. 文件操作 - 更新路由
  if (signal?.aborted) return
  await new Promise((r) => setTimeout(r, 600))
  if (signal?.aborted) return
  messages.value.push({
    type: 'file',
    action: 'update',
    path: 'src\\renderer\\src\\router\\index.ts',
    lines: '+ 2 lines',
    diff: [
      { num: ' 24|', content: "import SelfMedia from '../views/SelfMedia/SelfMedia.vue';", type: 'context' },
      { num: ' 25|', content: "import Password from '../views/Password/Password.vue';", type: 'context' },
      { num: ' 26|', content: "import Prompt from '../views/Prompt/Prompt.vue';", type: 'context' },
      { num: '   |', content: "+ import CodeAgent from '../views/CodeAgent/CodeAgent.vue';", type: 'added' },
      { num: ' 27|', content: '', type: 'context' },
      { num: ' 53|', content: "  { path: '/prompt', name: 'Prompt', component: Prompt },", type: 'context' },
      { num: '   |', content: "+  { path: '/codeagent', name: 'CodeAgent', component: CodeAgent },", type: 'added' },
      { num: ' 54|', content: '];', type: 'context' },
    ],
  })
  await scrollToBottom()

  // 6. 命令执行
  if (signal?.aborted) return
  await new Promise((r) => setTimeout(r, 400))
  if (signal?.aborted) return
  messages.value.push({
    type: 'command',
    command: 'npm run dev',
    output: `> electron-vue-app@1.0.0 dev
> vite

  VITE v5.x.x  ready in 312 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose

  Electron 启动成功`,
  })
  await scrollToBottom()

  // 7. 最终结果
  if (signal?.aborted) return
  await new Promise((r) => setTimeout(r, 300))
  if (signal?.aborted) return
  messages.value.push({
    type: 'result',
    content: '✅ 已完成！Code Agent 页面已创建并添加到路由中。你可以在「编程」→「Agent」菜单中访问。当前使用假数据模拟了完整的执行流程，包括思考过程、文件读写、代码 diff 和命令执行输出。',
  })
  await scrollToBottom()

  isLoading.value = false
}

const handleSend = () => {
  const prompt = userInput.value.trim()
  if (!prompt || isLoading.value) return
  userInput.value = ''
  abortController.value = new AbortController()
  mockExecution(prompt, abortController.value.signal)
}

const handleStop = () => {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  isLoading.value = false
}

const handleEnter = (e: KeyboardEvent) => {
  if (e.altKey) {
    // Alt + Enter 换行
    userInput.value += '\n'
    e.preventDefault()
  } else {
    // Enter 发送
    e.preventDefault()
    if (isLoading.value) {
      handleStop()
    } else {
      handleSend()
    }
  }
}
</script>

<style scoped>
.code-agent-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf8f5;
  color: #1a1a1a;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

/* 顶部标题栏 */
.header-bar {
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
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.header-title .el-icon {
  color: #d97757;
  font-size: 22px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions :deep(.el-button) {
  color: #666;
}
.header-actions :deep(.el-button:hover) {
  color: #1a1a1a;
  background: #e5e0d8;
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

/* 用户消息 */
.user-bubble {
  display: flex;
  justify-content: flex-end;
}

.bubble-content {
  background: #e8a87c;
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
  border-bottom: 1px solid #e5e0d8;
}

.file-action-label {
  color: #d97757;
  font-weight: 600;
}

.file-path {
  color: #8b6914;
  font-family: 'Consolas', monospace;
}

.file-lines {
  color: #999;
  margin-left: auto;
}

.file-diff {
  padding: 10px 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.diff-line {
  display: flex;
  padding: 1px 14px;
}

.diff-line.added {
  background: #f5e6d3;
}

.diff-line.removed {
  background: #ffe0e0;
}

.diff-line.context {
  color: #888;
}

.line-num {
  width: 40px;
  color: #999;
  text-align: right;
  margin-right: 12px;
  flex-shrink: 0;
}

.line-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-line.added .line-content {
  color: #b87333;
}

.diff-line.removed .line-content {
  color: #c0392b;
}

.file-content {
  padding: 14px;
}

.file-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.file-content code {
  font-family: inherit;
}

/* 命令块 */
.command-block {
  background: #f3f0ea;
  border: 1px solid #e5e0d8;
  border-radius: 8px;
  overflow: hidden;
}

.command-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid #e5e0d8;
  color: #666;
}

.command-text {
  font-family: 'Consolas', monospace;
  color: #8b6914;
}

.command-output {
  padding: 14px;
}

.command-output pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 结果块 */
.result-block {
  display: flex;
}

.result-content {
  background: #f3f0ea;
  color: #333;
  padding: 12px 16px;
  border-radius: 12px 12px 12px 2px;
  max-width: 85%;
  font-size: 14px;
  line-height: 1.6;
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

.input-actions :deep(.el-button) {
  background: #d97757;
  border-color: #d97757;
  color: #fff;
}

.input-actions :deep(.el-button:hover) {
  background: #c26a4d;
  border-color: #c26a4d;
}

/* 滚动条优化 */
.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb {
  background: #d5d0c8;
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: #c0bbb3;
}
</style>

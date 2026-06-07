<template>
  <div class="english-container">
    <div class="header">
      <div class="header-actions">
        <el-button type="primary" @click="fetchChinaDailyList">
          <el-icon><Refresh /></el-icon>
          刷新列表
        </el-button>
      </div>
    </div>

    <!-- 文章列表 -->
    <el-table
      :data="chinadailyList"
      v-loading="chinadailyLoading"
      stripe
      style="width: 100%;height:619px"
    >
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column label="标题" min-width="300">
        <template #default="{ row }">
          <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" @click="openDetailDialog(row)">
            <div v-if="row.image" style="width: 50px; height: 50px; flex-shrink: 0;">
              <el-image
                :src="row.image"
                style="width: 100%; height: 100%; border-radius: 4px;"
                fit="cover"
              />
            </div>
            <span style="flex: 1;">{{ row.title }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="链接" min-width="200">
        <template #default="{ row }">
          <el-link type="primary" @click="copyToClipboard(row.link)" :underline="false">
            {{ row.link }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="time" label="发布时间" width="200" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" @click="openDetailDialog(row)">
            查看
          </el-button>
          <el-button type="danger" @click="deleteArticle(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination" v-if="total > 0">
      <el-pagination
        background
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="文章详情"
      width="90%"
      :close-on-click-modal="false"
      destroy-on-close
      top="5vh"
    >
      <div class="detail-content">
        <!-- 左侧：文章内容 -->
        <div class="article-section" @mouseup="handleTextSelection">
          <div v-if="articleDetail.title" class="article-detail">
            <h1 class="article-title">{{ articleDetail.title }}</h1>
            <div v-if="articleDetail.publish_info" class="article-info">{{ articleDetail.publish_info }}</div>
            <div class="article-content">{{ articleDetail.content }}</div>
          </div>
          <el-empty v-else description="暂无内容" />
        </div>

        <!-- 右侧：AI Chat -->
        <div class="chat-section">
          <div class="chat-header">
            <span>AI 助手</span>
            <el-button type="primary" size="small" @click="createNewChat">新会话</el-button>
          </div>

          <div class="chat-messages" ref="chatScrollRef">
            <div v-for="(msg, index) in askMessages" :key="index" class="message-item" :class="msg.role">
              <div class="message-content">
                <div v-if="msg.role === 'user'" class="user-message">{{ msg.content }}</div>
                <div v-else class="assistant-message" v-html="msg.content"></div>
              </div>
            </div>
          </div>

          <!-- 引用内容显示 -->
          <div v-if="quotedContent" class="quoted-section">
            <div class="quoted-header">
              <span>引用内容 (第 {{ quotedContent.startLine }}-{{ quotedContent.endLine }} 行)</span>
              <el-icon @click="clearQuote" style="cursor: pointer;"><Close /></el-icon>
            </div>
            <div class="quoted-text">{{ quotedContent.text }}</div>
          </div>

          <div class="chat-input">
            <el-input
              v-model="askInput"
              type="textarea"
              :rows="3"
              placeholder="输入问题，或选中左侧文本后按 Ctrl+L 引用..."
              class="ask-input"
              @keydown.enter.ctrl="handleAsk"
            />
            <div class="input-actions">
              <el-button type="primary" @click="handleAsk" :loading="askLoading">
                发送 (Ctrl+Enter)
              </el-button>
              <el-button v-if="askLoading" @click="stopAsk">停止</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Close } from '@element-plus/icons-vue'
import request from '@/utils/request'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt()

// 类型定义
type AskMessage = {
  role: 'user' | 'assistant'
  content: string
}

type QuotedContent = {
  text: string
  html: string
  startLine: number
  endLine: number
}

// 数据
const chinadailyList = ref([])
const chinadailyLoading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const detailDialogVisible = ref(false)
const articleDetail = ref({
  title: '',
  subtitle: '',
  publish_info: '',
  content: '',
  url: ''
})

// AI Chat 相关
const askMessages = ref<AskMessage[]>([{ role: 'assistant', content: '你好，我可以帮你分析这篇文章' }])
const askInput = ref('')
const askLoading = ref(false)
const askScrollRef = ref<HTMLElement | null>(null)
const quotedContent = ref<QuotedContent | null>(null)
let currentAskController: AbortController | null = null

// 获取 China Daily 新闻列表
const fetchChinaDailyList = async () => {
  chinadailyLoading.value = true
  try {
    const res = await request.get('http://localhost:8000/api/english/chinadaily/get')
    if (res.code === 200) {
      chinadailyList.value = res.data || []
      total.value = res.data?.length || 0
    } else {
      ElMessage.error(res.message || '获取新闻列表失败')
    }
  } catch (error) {
    console.error('获取China Daily新闻失败:', error)
    ElMessage.error('获取新闻列表失败')
  } finally {
    chinadailyLoading.value = false
  }
}

// 打开详情弹窗
const openDetailDialog = async (row) => {
  detailDialogVisible.value = true

  // 重置 AI 会话
  askMessages.value = [{ role: 'assistant', content: '你好，我可以帮你分析这篇文章' }]
  quotedContent.value = null

  if (row.link) {
    try {
      const urlParts = row.link.split('/a/')
      if (urlParts.length > 1) {
        const articleId = urlParts[1].replace('.html', '')
        const res = await request.get(`http://localhost:8000/api/english/chinadaily/detail?id=${articleId}`)

        if (res.code === 200) {
          articleDetail.value = res.data
        } else {
          ElMessage.error(res.message || '获取文章详情失败')
        }
      }
    } catch (error) {
      console.error('获取文章详情失败:', error)
      ElMessage.error('获取文章详情失败')
    }
  }
}

// 删除文章
const deleteArticle = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇文章吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await request.post('http://localhost:8000/api/english/chinadaily/delete', { id: row.id })
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchChinaDailyList()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
    console.error(error)
  }
}

// 处理文本选择
const handleTextSelection = () => {
  const selection = window.getSelection()
  const selectedText = selection?.toString().trim()

  if (selectedText && selectedText.length > 0) {
    // 计算行号（简化版本）
    const startLine = 1
    const endLine = 1

    quotedContent.value = {
      text: selectedText,
      html: '',
      startLine,
      endLine
    }
  }
}

// Ctrl+L 快捷键处理
const handleCtrlL = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'l') {
    if (!detailDialogVisible.value) return
    e.preventDefault()

    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()

    if (!selectedText) return

    quotedContent.value = {
      text: selectedText,
      html: '',
      startLine: 1,
      endLine: 1
    }

    nextTick(() => {
      const textarea = document.querySelector('.ask-input .el-textarea__inner') as HTMLTextAreaElement
      textarea?.focus()
    })
  }
}

// 清除引用
const clearQuote = () => {
  quotedContent.value = null
}

// 创建新会话
const createNewChat = () => {
  askMessages.value = [{ role: 'assistant', content: '你好，我可以帮你分析这篇文章' }]
  quotedContent.value = null
  askInput.value = ''
}

// 获取 ds token
const getDsToken = async () => {
  try {
    const res = await request.post('http://localhost:8000/api/token/getCookieByUrl', { url: 'ds' })
    if (res.code === 200 && res.data && res.data.cookie) {
      return res.data.cookie
    }
    return ''
  } catch (error) {
    console.error('获取 ds token 失败:', error)
    return ''
  }
}

// 发送消息
const handleAsk = async () => {
  if (!askInput.value.trim() && !quotedContent.value) {
    ElMessage.warning('请输入问题或选择文本')
    return
  }

  let userMessage = askInput.value.trim()

  // 如果有引用内容，添加到消息中
  if (quotedContent.value) {
    userMessage = `引用内容：\n${quotedContent.value.text}\n\n问题：${userMessage || '请分析这段内容'}`
  }

  askMessages.value.push({
    role: 'user',
    content: userMessage
  })

  askInput.value = ''
  quotedContent.value = null
  askLoading.value = true

  // 添加一个空的助手消息用于流式更新
  const assistantMessageIndex = askMessages.value.length
  askMessages.value.push({
    role: 'assistant',
    content: ''
  })

  try {
    const { fetchEventSource } = await import('@microsoft/fetch-event-source')
    currentAskController = new AbortController()

    // 获取 ds token
    const dsToken = await getDsToken()
    if (!dsToken) {
      ElMessage.error('未配置 DeepSeek Token')
      askLoading.value = false
      return
    }

    // 构建完整的 prompt，包含历史对话
    let fullPrompt = ''
    for (let i = 0; i < askMessages.value.length - 1; i++) {
      const msg = askMessages.value[i]
      if (msg.role === 'user') {
        fullPrompt += `用户: ${msg.content}\n\n`
      } else if (msg.role === 'assistant') {
        fullPrompt += `助手: ${msg.content}\n\n`
      }
    }

    await fetchEventSource('http://localhost:8000/api/ds/aichat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ prompt: fullPrompt, token: dsToken }),
      signal: currentAskController.signal,
      onopen: async (response) => {
        if (response.ok) {
          return
        }
        throw new Error('请求失败')
      },
      onmessage: (event) => {
        if (event.data === '[DONE]') {
          return
        }

        try {
          const data = JSON.parse(event.data)
          if (data.content) {
            askMessages.value[assistantMessageIndex].content += data.content

            // 自动滚动到底部
            nextTick(() => {
              if (askScrollRef.value) {
                askScrollRef.value.scrollTop = askScrollRef.value.scrollHeight
              }
            })
          }
        } catch (e) {
          console.error('解析失败:', e)
        }
      },
      onerror: (error) => {
        console.error('SSE 错误:', error)
        throw error
      },
      onclose: () => {
        // 转换 Markdown 为 HTML
        askMessages.value[assistantMessageIndex].content = md.render(askMessages.value[assistantMessageIndex].content)
      }
    })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      ElMessage.info('已停止生成')
      // 转换已生成的内容为 HTML
      if (askMessages.value[assistantMessageIndex].content) {
        askMessages.value[assistantMessageIndex].content = md.render(askMessages.value[assistantMessageIndex].content)
      }
    } else {
      console.error('AI 请求失败:', error)
      ElMessage.error('AI 请求失败')
      askMessages.value.pop()
    }
  } finally {
    askLoading.value = false
    currentAskController = null
  }
}

// 停止生成
const stopAsk = () => {
  if (currentAskController) {
    currentAskController.abort()
    currentAskController = null
  }
}

// 分页
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchChinaDailyList()
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchChinaDailyList()
}

onMounted(() => {
  fetchChinaDailyList()
  window.addEventListener('keydown', handleCtrlL)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleCtrlL)
})
</script>

<style scoped>
.english-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

/* 表格字体大小 */
:deep(.el-table) {
  font-size: 18px;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-border-color: #e8e4df;
}
:deep(.el-table .el-table__header th) {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}
:deep(.el-table .cell) {
  font-size: 18px;
  color: #1a1a1a;
}
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: #faf8f5;
}

/* 详情弹窗样式 */
.detail-content {
  display: flex;
  gap: 20px;
  height: 85vh;
}

.article-section {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  border-right: 1px solid #e8e4df;
  user-select: text;
  background: #fff;
}

.article-detail {
  width: 100%;
}

.article-title {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 20px;
  line-height: 1.5;
  color: #1a1a1a;
}

.article-info {
  font-size: 18px;
  color: #6b6560;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e8e4df;
}

.article-content {
  font-size: 24px;
  line-height: 2;
  color: #1a1a1a;
  white-space: pre-wrap;
}

/* AI Chat 样式 */
.chat-section {
  flex: 0 0 500px;
  display: flex;
  flex-direction: column;
  background: #faf8f5;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e4df;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f5f3f0;
  border-bottom: 1px solid #e8e4df;
  font-weight: 600;
  font-size: 18px;
  color: #1a1a1a;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.message-item {
  margin-bottom: 15px;
}

.message-content {
  max-width: 85%;
}

.message-item.user {
  display: flex;
  justify-content: flex-end;
}

.message-item.user .message-content {
  margin-left: auto;
}

.user-message {
  background: #8b9a6d;
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  word-wrap: break-word;
  font-size: 18px;
  line-height: 1.6;
}

.assistant-message {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  word-wrap: break-word;
  line-height: 1.8;
  font-size: 18px;
  color: #1a1a1a;
}

.assistant-message :deep(p) {
  margin: 10px 0;
  font-size: 18px;
}

.assistant-message :deep(code) {
  background: #f5f3f0;
  padding: 3px 8px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 16px;
}

.assistant-message :deep(pre) {
  background: #f5f3f0;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 16px;
}

.quoted-section {
  padding: 12px 15px;
  background: #faf8f5;
  border-top: 1px solid #e8e4df;
}

.quoted-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 16px;
  color: #6b6560;
}

.quoted-text {
  background: #f5f3f0;
  padding: 10px;
  border-radius: 4px;
  font-size: 18px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.6;
  color: #1a1a1a;
}

.chat-input {
  padding: 15px;
  background: #f5f3f0;
  border-top: 1px solid #e8e4df;
}

.ask-input {
  margin-bottom: 10px;
}

.ask-input :deep(.el-textarea__inner) {
  font-size: 18px;
  line-height: 1.6;
}

.input-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.input-actions :deep(.el-button) {
  font-size: 16px;
}

/* 滚动条样式 */
.article-section::-webkit-scrollbar,
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.article-section::-webkit-scrollbar-track,
.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.article-section::-webkit-scrollbar-thumb,
.chat-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.article-section::-webkit-scrollbar-thumb:hover,
.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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

:deep(.el-button--primary.is-link) {
  background-color: transparent;
  border-color: transparent;
  color: #8b9a6d;
}

:deep(.el-button--primary.is-link:hover) {
  color: #7a895c;
  background-color: rgba(139, 154, 109, 0.1);
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

:deep(.el-button--danger.is-link) {
  background-color: transparent;
  border-color: transparent;
  color: #e8686a;
}

:deep(.el-button--danger.is-link:hover) {
  color: #d8585a;
  background-color: rgba(232, 104, 106, 0.1);
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

:deep(.el-link.el-link--primary) {
  color: #8b9a6d;
}

:deep(.el-link.el-link--primary:hover) {
  color: #7a895c;
}

/* 分页按钮样式 */
:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next) {
  background-color: #1a1a1a;
  color: white;
  border-radius: 8px;
  padding: 0 15px;
  height: 32px;
  line-height: 32px;
  margin: 0 5px;
}

:deep(.el-pagination button:disabled) {
  background-color: #c0c4cc;
  color: white;
}

/* 输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-textarea__inner) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
  color: #1a1a1a;
}

:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
  border-color: #c4a882 !important;
}

/* 弹窗样式 */
:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #e8e4df;
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: #1a1a1a;
  font-weight: 600;
}

:deep(.el-dialog__body) {
  background-color: #faf8f5;
}
</style>

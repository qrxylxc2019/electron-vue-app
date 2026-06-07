<template>
  <div class="weixin-container">
    <div class="task-layout">
      <!-- 左侧：任务列表 -->
      <div class="task-left">
        <div class="header">
          <div class="header-actions">
            <el-button type="primary" @click="executeAll" :loading="executingAll" :disabled="executingAll">
              <el-icon><VideoPlay /></el-icon>
              一键执行
            </el-button>
            <el-button type="success" @click="showAddTask = true">
              <el-icon><Plus /></el-icon>
              添加任务
            </el-button>
            <el-button type="warning" @click="stopAll" :disabled="!executingAll">
              <el-icon><VideoPause /></el-icon>
              停止全部
            </el-button>
          </div>
        </div>

        <el-table
          :data="taskList"
          stripe
          style="width: 100%"
          height="calc(100vh - 160px)"
          @row-click="handleRowClick"
          highlight-current-row
        >
          <el-table-column type="index" label="序号" width="100" />
          <el-table-column prop="name" label="任务名称" min-width="180" show-overflow-tooltip />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" effect="dark" size="large">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="160">
            <template #default="{ row }">
              <el-progress
                :percentage="row.progress"
                :status="progressStatus(row.status)"
                :stroke-width="10"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" @click.stop="executeSingle(row)" :disabled="row.status === 'running'">
                执行
              </el-button>
              <el-button type="info" @click.stop="viewDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 右侧：执行状态日志 -->
      <div class="task-right">
        <div class="log-header">
          <span class="log-title">执行状态</span>
          <el-button type="danger" text size="small" @click="clearLogs">清空日志</el-button>
        </div>
        <div class="log-list" ref="logListRef">
          <div v-for="(log, index) in executionLogs" :key="index" class="log-item" :class="log.type">
            <span class="log-time">{{ log.time }}</span>
            <el-tag :type="logTagType(log.type)" size="small" style="margin: 0 8px;">{{ log.label }}</el-tag>
            <span class="log-msg">{{ log.message }}</span>
          </div>
          <el-empty v-if="executionLogs.length === 0" description="暂无执行记录" :image-size="80" />
        </div>
      </div>
    </div>

    <!-- 任务详情弹窗 -->
    <el-dialog v-model="showDetail" title="任务详情" width="650px">
      <template v-if="currentTask">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="任务名称">{{ currentTask.name }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ currentTask.description }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(currentTask.status)" effect="dark">{{ statusText(currentTask.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="进度">
            <el-progress :percentage="currentTask.progress" :status="progressStatus(currentTask.status)" />
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentTask.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="最后执行">{{ currentTask.lastRun || '未执行' }}</el-descriptions-item>
        </el-descriptions>
        <div class="detail-logs" v-if="currentTask.logs && currentTask.logs.length">
          <h4 style="margin: 16px 0 8px;">执行日志</h4>
          <div class="detail-log-list">
            <div v-for="(l, i) in currentTask.logs" :key="i" class="log-item" :class="l.type">
              <span class="log-time">{{ l.time }}</span>
              <span class="log-msg">{{ l.message }}</span>
            </div>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 添加任务弹窗 -->
    <el-dialog v-model="showAddTask" title="添加任务" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="任务名称" required>
          <el-input v-model="addForm.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="addForm.description" type="textarea" :rows="3" placeholder="请输入任务描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTask = false">取消</el-button>
        <el-button type="primary" @click="handleAddTask">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, VideoPause, Plus } from '@element-plus/icons-vue'

const logListRef = ref(null)
const showDetail = ref(false)
const currentTask = ref(null)
const executingAll = ref(false)
let stopFlag = false

const showAddTask = ref(false)
const addForm = ref({ name: '', description: '' })

// 假数据
const taskList = ref([
  { id: 1, name: 'ai写作', description: '从目标网站采集最新数据并存储', status: 'pending', progress: 0, createdAt: '2026-03-14 08:00', lastRun: '', logs: [] },
  { id: 2, name: '淘宝虚拟资料', description: '清洗并格式化采集到的原始数据', status: 'pending', progress: 0, createdAt: '2026-03-14 08:05', lastRun: '', logs: [] },
  { id: 3, name: 'AI分析任务', description: '使用AI模型对数据进行分析处理', status: 'pending', progress: 0, createdAt: '2026-03-14 08:10', lastRun: '', logs: [] },
])

const executionLogs = ref([])

// 工具方法
const now = () => new Date().toLocaleTimeString('zh-CN', { hour12: false })

const statusText = (s) => ({ pending: '待执行', running: '执行中', success: '成功', error: '失败' }[s] || s)
const statusTagType = (s) => ({ pending: 'info', running: 'warning', success: 'success', error: 'danger' }[s] || 'info')
const progressStatus = (s) => ({ success: 'success', error: 'exception' }[s] || '')
const logTagType = (t) => ({ info: 'info', success: 'success', error: 'danger', running: 'warning' }[t] || 'info')

const addLog = (type, label, message) => {
  executionLogs.value.push({ time: now(), type, label, message })
  nextTick(() => {
    if (logListRef.value) logListRef.value.scrollTop = logListRef.value.scrollHeight
  })
}

const clearLogs = () => { executionLogs.value = [] }

// 模拟单个任务执行
const runTask = (task) => {
  return new Promise((resolve) => {
    task.status = 'running'
    task.progress = 0
    task.logs = []
    const startTime = now()
    task.logs.push({ time: startTime, type: 'info', message: '任务开始执行...' })
    addLog('running', task.name, '开始执行')

    let p = 0
    const timer = setInterval(() => {
      if (stopFlag) {
        clearInterval(timer)
        task.status = 'pending'
        task.progress = 0
        task.logs.push({ time: now(), type: 'info', message: '任务已停止' })
        addLog('info', task.name, '已停止')
        resolve('stopped')
        return
      }
      p += Math.floor(Math.random() * 20) + 10
      if (p >= 100) {
        p = 100
        clearInterval(timer)
        // 模拟90%成功率
        const isSuccess = Math.random() > 0.1
        task.progress = 100
        task.status = isSuccess ? 'success' : 'error'
        task.lastRun = now()
        const msg = isSuccess ? '执行成功' : '执行失败：连接超时'
        task.logs.push({ time: now(), type: isSuccess ? 'success' : 'error', message: msg })
        addLog(isSuccess ? 'success' : 'error', task.name, msg)
        resolve(isSuccess ? 'success' : 'error')
      } else {
        task.progress = p
        task.logs.push({ time: now(), type: 'info', message: `执行中... ${p}%` })
      }
    }, 500)
  })
}

// 执行单个任务
const executeSingle = async (task) => {
  stopFlag = false
  await runTask(task)
}

// 一键并发执行全部
const executeAll = async () => {
  stopFlag = false
  executingAll.value = true
  addLog('info', '系统', '开始并发执行全部任务')

  // 所有任务同时启动
  const promises = taskList.value.map(task => runTask(task))
  await Promise.allSettled(promises)

  executingAll.value = false
  if (stopFlag) {
    addLog('info', '系统', '全部任务已停止')
  } else {
    addLog('success', '系统', '全部任务执行完毕')
    ElMessage.success('全部任务执行完毕')
  }
}

// 停止全部
const stopAll = () => {
  stopFlag = true
  executingAll.value = false
}

// 查看详情
const viewDetail = (row) => {
  currentTask.value = row
  showDetail.value = true
}

const handleRowClick = (row) => {
  currentTask.value = row
}

// 添加任务
const handleAddTask = () => {
  if (!addForm.value.name) {
    ElMessage.warning('请输入任务名称')
    return
  }
  const newId = taskList.value.length ? Math.max(...taskList.value.map(t => t.id)) + 1 : 1
  taskList.value.push({
    id: newId,
    name: addForm.value.name,
    description: addForm.value.description || '',
    status: 'pending',
    progress: 0,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    lastRun: '',
    logs: []
  })
  ElMessage.success('任务添加成功')
  addForm.value = { name: '', description: '' }
  showAddTask.value = false
}
</script>

<style scoped>
.weixin-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

.task-layout {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.task-left {
  flex: 1.6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-left: 2px dashed #dcdfe6;
  padding-left: 20px;
  overflow: hidden;
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

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.log-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.log-list::-webkit-scrollbar {
  display: none;
}

.log-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 6px;
  font-size: 14px;
  background: #f5f7fa;
  transition: background 0.2s;
}

.log-item.success { background: #f0f9eb; }
.log-item.error { background: #fef0f0; }
.log-item.running { background: #fdf6ec; }

.log-time {
  color: #909399;
  font-size: 12px;
  white-space: nowrap;
  margin-right: 6px;
}

.log-msg {
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-log-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

/* Commerce 风格表格 */
:deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
  font-size: 16px;
  background-color: #fff;
  border-radius: 12px;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

:deep(.el-table__body) {
  background-color: #fff;
}

:deep(.el-table .el-table__header th) {
  font-size: 16px;
  font-weight: 600;
  color: #6b6560;
  background-color: #f5f3f0 !important;
  padding: 12px 16px;
}

:deep(.el-table .cell) {
  font-size: 16px;
  color: #1a1a1a;
  line-height: 1.5;
}

:deep(.el-table__row) {
  background-color: #fff;
  height: 50px !important;
  line-height: 50px !important;
}

:deep(.el-table__row:hover) {
  background-color: #faf8f5 !important;
}

:deep(.el-table__cell) {
  padding: 8px 16px !important;
}

:deep(.el-tag) {
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  padding: 4px 10px;
}

/* 主要按钮样式 - 深绿色 */
:deep(.el-button--primary) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  border-radius: 10px;
}

:deep(.el-button--primary:hover) {
  background-color: #7a895c;
  border-color: #7a895c;
}

/* 成功按钮样式 */
:deep(.el-button--success) {
  background-color: #5db872;
  border-color: #5db872;
  border-radius: 10px;
}

:deep(.el-button--success:hover) {
  background-color: #4ca861;
  border-color: #4ca861;
}

/* 警告按钮样式 */
:deep(.el-button--warning) {
  background-color: #c4a882;
  border-color: #c4a882;
  border-radius: 10px;
  color: #fff;
}

:deep(.el-button--warning:hover) {
  background-color: #b59872;
  border-color: #b59872;
  color: #fff;
}

/* 信息按钮样式 */
:deep(.el-button--info) {
  background-color: #9a9590;
  border-color: #9a9590;
  border-radius: 10px;
}

:deep(.el-button--info:hover) {
  background-color: #8a8580;
  border-color: #8a8580;
}

/* 危险按钮样式 */
:deep(.el-button--danger) {
  background-color: #e8686a;
  border-color: #e8686a;
  border-radius: 10px;
}

:deep(.el-button--danger:hover) {
  background-color: #d8585a;
  border-color: #d8585a;
}

/* 搜索输入框样式 */
:deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border-radius: 10px;
  box-shadow: none !important;
  border: 1px solid #e8e4df !important;
}

:deep(.el-input__wrapper:hover) {
  border-color: #c4a882 !important;
  box-shadow: none !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882 !important;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

/* 隐藏所有滚动条但保留滚动功能 */
:deep(.el-table__body-wrapper) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
:deep(.el-table__body-wrapper)::-webkit-scrollbar {
  display: none;
}
.detail-log-list {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.detail-log-list::-webkit-scrollbar {
  display: none;
}
</style>

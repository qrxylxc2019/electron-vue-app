<template>
  <div class="topic-list">
    <!-- 搜索和操作栏 -->
    <div class="toolbar">
      <el-input
        v-model="searchText"
        placeholder="搜索选题..."
        class="search-input"
        size="large"
        clearable
        @input="searchData"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select
        v-model="statusFilter"
        placeholder="状态筛选"
        clearable
        size="large"
        class="status-filter"
        @change="searchData"
      >
        <el-option label="全部" value="" />
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>

      <el-button size="large" @click="handleAITopics">
        <span style="margin-right: 6px;">✨</span>AI 生成选题
      </el-button>

      <el-button type="primary" size="large" @click="showAddDrawer">
        <el-icon style="margin-right: 6px;"><Plus /></el-icon>新建
      </el-button>
    </div>

    <!-- 选题卡片网格 -->
    <div v-loading="loading" class="topic-grid">
      <div v-if="list.length === 0 && !loading" class="empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
        <div style="font-size: 18px; color: #9a9590;">暂无选题，点击"AI 生成选题"开始创作</div>
      </div>

      <div v-for="item in list" :key="item.id" class="topic-card">
        <div class="card-header">
          <div class="card-title">{{ item.title }}</div>
          <el-tag :type="getStatusType(item.status)" size="small">
            {{ getStatusLabel(item.status) }}
          </el-tag>
        </div>

        <div class="card-meta">
          <div class="meta-item">
            <span class="meta-label">分类</span>
            <span class="meta-value">{{ item.category || 'AI编程' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">热度</span>
            <div class="trend-bar">
              <div class="trend-fill" :style="{ width: (item.trend_score || 50) + '%' }"></div>
            </div>
            <span class="meta-value">{{ item.trend_score || 50 }}</span>
          </div>
        </div>

        <div v-if="item.selling_point" class="card-desc">
          <span class="desc-label">卖点：</span>{{ item.selling_point }}
        </div>

        <div v-if="item.target_audience" class="card-desc">
          <span class="desc-label">受众：</span>{{ item.target_audience }}
        </div>

        <div v-if="item.keywords" class="card-tags">
          <el-tag
            v-for="kw in parseKeywords(item.keywords)"
            :key="kw"
            size="small"
            type="info"
            class="keyword-tag"
          >
            {{ kw }}
          </el-tag>
        </div>

        <div class="card-actions">
          <el-button size="small" @click="handleEdit(item)">
            <el-icon style="margin-right: 4px;"><Edit /></el-icon>编辑
          </el-button>
          <el-button size="small" type="primary" @click="$emit('select-topic', item)">
            <span style="margin-right: 4px;">🚀</span>选入创作
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(item)">
            <el-icon style="margin-right: 4px;"><Delete /></el-icon>删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        background
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 48]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- AI 生成选题对话框 -->
    <el-dialog
      v-model="aiDialogVisible"
      title="AI 生成选题"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px" size="large">
        <el-form-item label="主题方向">
          <el-input
            v-model="aiTopicDirection"
            placeholder="如：AI编程入门、Python实战、技术趋势..."
            :disabled="aiGenerating"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="aiCategory" style="width: 100%;" :disabled="aiGenerating">
            <el-option label="AI编程" value="AI编程" />
            <el-option label="Python" value="Python" />
            <el-option label="技术趋势" value="技术趋势" />
            <el-option label="职场成长" value="职场成长" />
            <el-option label="副业赚钱" value="副业赚钱" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- AI 生成结果 -->
      <div v-if="aiResults.length > 0" class="ai-results">
        <div class="ai-results-header">
          <span>✨ AI 生成了 {{ aiResults.length }} 个选题</span>
          <el-button size="small" type="primary" @click="saveAllAITopics">
            全部保存
          </el-button>
        </div>
        <div v-for="(topic, index) in aiResults" :key="index" class="ai-result-item">
          <div class="ai-result-title">{{ topic.title }}</div>
          <div class="ai-result-meta">
            <span v-if="topic.sellingPoint">💡 {{ topic.sellingPoint }}</span>
            <span v-if="topic.targetAudience">🎯 {{ topic.targetAudience }}</span>
            <span v-if="topic.trendScore">🔥 {{ topic.trendScore }}分</span>
          </div>
          <el-button
            size="small"
            :type="topic._saved ? 'success' : 'default'"
            :disabled="topic._saved"
            @click="saveSingleAITopic(topic)"
          >
            {{ topic._saved ? '已保存' : '保存' }}
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="aiDialogVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :loading="aiGenerating"
          @click="generateAITopics"
        >
          {{ aiGenerating ? 'AI 思考中...' : '开始生成' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑选题' : '新建选题'"
      direction="rtl"
      size="50%"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="请输入选题标题" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%;">
            <el-option label="AI编程" value="AI编程" />
            <el-option label="Python" value="Python" />
            <el-option label="技术趋势" value="技术趋势" />
            <el-option label="职场成长" value="职场成长" />
            <el-option label="副业赚钱" value="副业赚钱" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="卖点">
          <el-input v-model="form.selling_point" placeholder="这个选题的吸引力在哪里？" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="目标受众">
          <el-input v-model="form.target_audience" placeholder="目标读者群体" />
        </el-form-item>
        <el-form-item label="热度评分">
          <el-slider v-model="form.trend_score" :min="0" :max="100" show-input />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="keywordsInput" placeholder="多个关键词用逗号分隔" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%;">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="drawerVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'

defineEmits<{
  (e: 'select-topic', topic: TopicItem): void
}>()

interface TopicItem {
  id?: number
  title: string
  category: string
  keywords: string
  trend_score: number
  selling_point: string
  target_audience: string
  status: string
  created_at?: string
  updated_at?: string
}

interface AITopicResult {
  title: string
  sellingPoint?: string
  targetAudience?: string
  trendScore?: number
  keywords?: string[]
  _saved?: boolean
}

const list = ref<TopicItem[]>([])
const searchText = ref('')
const statusFilter = ref('')
const loading = ref(false)

const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)

// 抽屉
const drawerVisible = ref(false)
const isEdit = ref(false)
const form = ref<TopicItem>({
  id: undefined, title: '', category: 'AI编程', keywords: '',
  trend_score: 50, selling_point: '', target_audience: '', status: 'pending'
})
const keywordsInput = ref('')

// AI 生成
const aiDialogVisible = ref(false)
const aiTopicDirection = ref('')
const aiCategory = ref('AI编程')
const aiGenerating = ref(false)
const aiResults = ref<AITopicResult[]>([])

let searchTimeout: number | null = null

const getStatusType = (status: string) => {
  switch (status) {
    case 'approved': return 'success'
    case 'rejected': return 'danger'
    default: return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return '已通过'
    case 'rejected': return '已拒绝'
    default: return '待审核'
  }
}

const parseKeywords = (keywords: string): string[] => {
  if (!keywords) return []
  try {
    const parsed = JSON.parse(keywords)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
  }
}

// 获取列表
const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: { column: 'id', type: 'desc' }
    }
    if (searchText.value) {
      params.conditions.keyword = searchText.value
    }
    if (statusFilter.value) {
      params.conditions.status = statusFilter.value
    }
    const res = await (window as any).electronAPI.getSMTopics(params)
    if (res && res.success !== false) {
      list.value = res.list || []
      total.value = res.total || 0
    } else {
      list.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取选题失败:', error)
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const searchData = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchData()
  }, 300)
}

const handleSizeChange = (val: number) => { pageSize.value = val; currentPage.value = 1; fetchData() }
const handlePageChange = (val: number) => { currentPage.value = val; fetchData() }

// 新建
const showAddDrawer = () => {
  isEdit.value = false
  form.value = { id: undefined, title: '', category: 'AI编程', keywords: '', trend_score: 50, selling_point: '', target_audience: '', status: 'pending' }
  keywordsInput.value = ''
  drawerVisible.value = true
}

// 编辑
const handleEdit = (row: TopicItem) => {
  isEdit.value = true
  form.value = { ...row }
  const kws = parseKeywords(row.keywords)
  keywordsInput.value = kws.join('、')
  drawerVisible.value = true
}

// 提交
const handleSubmit = async () => {
  if (!form.value.title) { ElMessage.warning('请输入标题'); return }
  try {
    form.value.keywords = JSON.stringify(keywordsInput.value.split(/[、，,]/).map(k => k.trim()).filter(Boolean))
    if (isEdit.value && form.value.id) {
      const { id, created_at, updated_at, ...data } = form.value
      await (window as any).electronAPI.updateSMTopic(id, data)
      ElMessage.success('更新成功')
    } else {
      const { id, created_at, updated_at, ...data } = form.value
      await (window as any).electronAPI.addSMTopic(data)
      ElMessage.success('创建成功')
    }
    drawerVisible.value = false
    fetchData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

// 删除
const handleDelete = async (row: TopicItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除选题"${row.title}"吗？此操作将同时删除关联的文章和图片，不可恢复。`, '警告', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await (window as any).electronAPI.deleteSMTopic(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') { console.error('删除失败:', error); ElMessage.error('删除失败') }
  }
}

const resetForm = () => {
  form.value = { id: undefined, title: '', category: 'AI编程', keywords: '', trend_score: 50, selling_point: '', target_audience: '', status: 'pending' }
  keywordsInput.value = ''
}

// AI 生成选题
const handleAITopics = () => {
  aiTopicDirection.value = ''
  aiResults.value = []
  aiDialogVisible.value = true
}

const generateAITopics = async () => {
  if (!aiTopicDirection.value) { ElMessage.warning('请输入主题方向'); return }
  aiGenerating.value = true
  aiResults.value = []
  try {
    const result = await (window as any).electronAPI.generateSMTopics(aiCategory.value, 5)
    if (typeof result === 'string') {
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        aiResults.value = JSON.parse(jsonMatch[0]).map((t: any) => ({ ...t, _saved: false }))
      }
    } else if (Array.isArray(result)) {
      aiResults.value = result.map((t: any) => ({ ...t, _saved: false }))
    }
    if (aiResults.value.length === 0) {
      ElMessage.warning('未能生成选题，请重试')
    }
  } catch (error) {
    console.error('AI 生成选题失败:', error)
    ElMessage.error('AI 生成选题失败')
  } finally {
    aiGenerating.value = false
  }
}

const saveSingleAITopic = async (topic: AITopicResult) => {
  try {
    const data = {
      title: topic.title,
      category: aiCategory.value,
      keywords: JSON.stringify(topic.keywords || []),
      trend_score: topic.trendScore || 50,
      selling_point: topic.sellingPoint || '',
      target_audience: topic.targetAudience || '',
      status: 'pending'
    }
    await (window as any).electronAPI.addSMTopic(data)
    topic._saved = true
    ElMessage.success(`"${topic.title}" 已保存`)
    fetchData()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const saveAllAITopics = async () => {
  for (const topic of aiResults.value) {
    if (!topic._saved) {
      await saveSingleAITopic(topic)
    }
  }
}

onMounted(() => { fetchData() })
</script>

<style scoped>
.topic-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input { width: 280px; }
.status-filter { width: 140px; }

.search-input :deep(.el-input__wrapper),
.status-filter :deep(.el-select__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
}

.topic-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  align-content: start;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.topic-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e8e4df;
  transition: all 0.3s;
}

.topic-card:hover {
  border-color: #c4a882;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
  flex: 1;
  margin-right: 8px;
}

.card-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.meta-label { color: #9a9590; }
.meta-value { color: #6b6560; font-weight: 500; }

.trend-bar {
  width: 60px;
  height: 6px;
  background: #f0ece8;
  border-radius: 3px;
  overflow: hidden;
}

.trend-fill {
  height: 100%;
  background: linear-gradient(90deg, #c4a882, #8b9a6d);
  border-radius: 3px;
  transition: width 0.3s;
}

.card-desc {
  font-size: 13px;
  color: #6b6560;
  line-height: 1.6;
  margin-bottom: 6px;
}

.desc-label { color: #9a9590; }

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
}

.keyword-tag {
  background-color: #f5f3f0 !important;
  border-color: #e8e4df !important;
  color: #6b6560 !important;
  border-radius: 6px;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0ece8;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}

/* AI 生成结果 */
.ai-results { margin-top: 16px; }

.ai-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 500;
}

.ai-result-item {
  padding: 12px;
  background: #faf8f5;
  border-radius: 10px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-result-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.ai-result-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #6b6560;
  flex-wrap: wrap;
}
</style>

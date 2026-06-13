<template>
  <div class="publish-panel">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-number">{{ stats.topics }}</div>
        <div class="stat-label">选题</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📄</div>
        <div class="stat-number">{{ stats.articles }}</div>
        <div class="stat-label">文章</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎨</div>
        <div class="stat-number">{{ stats.images }}</div>
        <div class="stat-label">配图</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📤</div>
        <div class="stat-number">{{ stats.published }}</div>
        <div class="stat-label">已发布</div>
      </div>
    </div>

    <!-- 发布操作区 -->
    <div class="publish-section">
      <h3>📤 发布管理</h3>

      <!-- 平台优化 -->
      <div class="platform-optimize">
        <div class="platform-optimize-header">
          <h4>🔄 平台适配优化</h4>
          <p class="section-desc">选择已审批文章，AI 自动适配不同平台风格</p>
        </div>

        <div class="platform-optimize-form">
          <el-select v-model="optimizeArticleId" placeholder="选择文章" size="large" style="width: 260px;">
            <el-option
              v-for="article in approvedArticles"
              :key="article.id"
              :label="article.title"
              :value="article.id"
            />
          </el-select>

          <el-select v-model="optimizePlatform" placeholder="目标平台" size="large" style="width: 160px;">
            <el-option label="小红书" value="小红书" />
            <el-option label="微信公众号" value="微信公众号" />
            <el-option label="抖音" value="抖音" />
            <el-option label="知乎" value="知乎" />
            <el-option label="B站" value="B站" />
          </el-select>

          <el-button
            type="primary"
            size="large"
            :loading="optimizing"
            @click="handleOptimize"
          >
            {{ optimizing ? 'AI 优化中...' : '✨ AI 优化' }}
          </el-button>
        </div>

        <!-- 优化结果 -->
        <div v-if="optimizedContent" class="optimized-result">
          <div class="optimized-header">
            <span>📋 优化结果 ({{ optimizePlatform }})</span>
            <div>
              <el-button size="small" @click="copyOptimized">📋 复制</el-button>
              <el-button size="small" type="primary" @click="saveOptimizedVersion">💾 保存版本</el-button>
            </div>
          </div>
          <div class="optimized-preview">{{ optimizedContent }}</div>
        </div>
      </div>

      <!-- 发布记录 -->
      <div class="publish-records">
        <div class="records-header">
          <h4>📋 发布记录</h4>
          <el-button type="primary" size="small" @click="showPublishDialog = true">
            + 新建发布
          </el-button>
        </div>

        <el-table
          :data="publishRecords"
          v-loading="loadingRecords"
          stripe
          style="width: 100%"
          max-height="300"
        >
          <el-table-column label="文章" min-width="150" show-overflow-tooltip>
            <template #default="scope">
              {{ getArticleTitle(scope.row.article_id) }}
            </template>
          </el-table-column>
          <el-table-column prop="platform" label="平台" width="120" />
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getPublishStatusType(scope.row.status)" size="small">
                {{ getPublishStatusLabel(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="scheduled_at" label="计划时间" width="160" />
          <el-table-column prop="published_at" label="发布时间" width="160" />
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button size="small" type="text" @click="updatePublishStatus(scope.row, 'published')" v-if="scope.row.status !== 'published'">
                标记已发布
              </el-button>
              <el-button size="small" type="text" style="color: #e8686a;" @click="updatePublishStatus(scope.row, 'failed')" v-if="scope.row.status !== 'failed'">
                标记失败
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 新建发布对话框 -->
    <el-dialog v-model="showPublishDialog" title="新建发布计划" width="500px">
      <el-form label-width="80px" size="large">
        <el-form-item label="文章">
          <el-select v-model="publishForm.article_id" placeholder="选择文章" style="width: 100%;">
            <el-option
              v-for="article in approvedArticles"
              :key="article.id"
              :label="article.title"
              :value="article.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="平台">
          <el-select v-model="publishForm.platform" placeholder="选择平台" style="width: 100%;">
            <el-option label="小红书" value="小红书" />
            <el-option label="微信公众号" value="微信公众号" />
            <el-option label="抖音" value="抖音" />
            <el-option label="知乎" value="知乎" />
            <el-option label="B站" value="B站" />
            <el-option label="微博" value="微博" />
          </el-select>
        </el-form-item>
        <el-form-item label="发布时间">
          <el-date-picker
            v-model="publishForm.scheduled_at"
            type="datetime"
            placeholder="选择发布时间"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPublishDialog = false">取消</el-button>
        <el-button type="primary" @click="createPublishRecord">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

interface ArticleItem {
  id: number
  title: string
  content?: string
  status?: string
}

interface PublishRecord {
  id: number
  article_id: number
  platform: string
  status: string
  scheduled_at: string
  published_at: string
  platform_post_id?: string
  error_message?: string
}

const stats = ref({ topics: 0, articles: 0, images: 0, published: 0 })
const approvedArticles = ref<ArticleItem[]>([])
const allArticles = ref<ArticleItem[]>([])
const publishRecords = ref<PublishRecord[]>([])
const loadingRecords = ref(false)

// 平台优化
const optimizeArticleId = ref<number | null>(null)
const optimizePlatform = ref('小红书')
const optimizing = ref(false)
const optimizedContent = ref('')

// 发布表单
const showPublishDialog = ref(false)
const publishForm = ref({
  article_id: null as number | null,
  platform: '小红书',
  scheduled_at: ''
})

const getPublishStatusType = (status: string) => {
  switch (status) {
    case 'published': return 'success'
    case 'scheduled': return 'warning'
    case 'failed': case 'cancelled': return 'danger'
    default: return 'info'
  }
}

const getPublishStatusLabel = (status: string) => {
  switch (status) {
    case 'published': return '已发布'
    case 'scheduled': return '计划中'
    case 'failed': return '失败'
    case 'cancelled': return '已取消'
    default: return status
  }
}

const getArticleTitle = (articleId: number) => {
  const article = allArticles.value.find(a => a.id === articleId)
  return article?.title || `文章 #${articleId}`
}

// 加载统计数据
const loadStats = async () => {
  try {
    const [topicsRes, articlesRes, recordsRes] = await Promise.all([
      (window as any).electronAPI.getSMTopics({ page: 1, pageNum: 1, conditions: {}, orderBy: { column: 'id', type: 'desc' } }),
      (window as any).electronAPI.getSMArticles({ page: 1, pageNum: 1, conditions: {}, orderBy: { column: 'id', type: 'desc' } }),
      (window as any).electronAPI.getSMPublishRecords({ page: 1, pageNum: 1, conditions: { status: 'published' }, orderBy: { column: 'id', type: 'desc' } })
    ])
    stats.value = {
      topics: topicsRes?.total || 0,
      articles: articlesRes?.total || 0,
      images: 0,
      published: recordsRes?.total || 0
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 加载文章列表
const loadArticles = async () => {
  try {
    const res = await (window as any).electronAPI.getSMArticles({
      page: 1, pageNum: 100, conditions: {},
      orderBy: { column: 'id', type: 'desc' }
    })
    allArticles.value = res?.list || []
    approvedArticles.value = (res?.list || []).filter((a: ArticleItem) => a.status === 'approved')
  } catch (error) {
    console.error('获取文章列表失败:', error)
  }
}

// 加载发布记录
const loadPublishRecords = async () => {
  loadingRecords.value = true
  try {
    const res = await (window as any).electronAPI.getSMPublishRecords({
      page: 1, pageNum: 50, conditions: {},
      orderBy: { column: 'id', type: 'desc' }
    })
    publishRecords.value = res?.list || []
  } catch (error) {
    console.error('获取发布记录失败:', error)
  } finally {
    loadingRecords.value = false
  }
}

// 平台优化
const handleOptimize = async () => {
  if (!optimizeArticleId.value) { ElMessage.warning('请先选择文章'); return }
  optimizing.value = true
  optimizedContent.value = ''
  try {
    const article = allArticles.value.find(a => a.id === optimizeArticleId.value)
    if (!article?.content) { ElMessage.warning('文章内容不存在'); return }
    const result = await (window as any).electronAPI.optimizeSMForPlatform(article.content, optimizePlatform.value)
    optimizedContent.value = result || ''
    if (!optimizedContent.value) { ElMessage.warning('优化结果为空') }
  } catch (error) {
    console.error('平台优化失败:', error)
    ElMessage.error('平台优化失败')
  } finally {
    optimizing.value = false
  }
}

const copyOptimized = () => {
  if (optimizedContent.value) {
    navigator.clipboard.writeText(optimizedContent.value).then(() => {
      ElMessage.success('已复制到剪贴板')
    })
  }
}

const saveOptimizedVersion = async () => {
  if (!optimizeArticleId.value || !optimizedContent.value) return
  try {
    const article = allArticles.value.find(a => a.id === optimizeArticleId.value)
    const wordCount = optimizedContent.value.replace(/<[^>]*>/g, '').length

    // 获取当前文章的 platform_versions
    let platformVersions: Record<string, string> = {}
    if (article) {
      try {
        const fullArticle = await (window as any).electronAPI.getSMArticleById(article.id)
        if (fullArticle?.platform_versions) {
          platformVersions = typeof fullArticle.platform_versions === 'string'
            ? JSON.parse(fullArticle.platform_versions)
            : fullArticle.platform_versions
        }
      } catch {}
    }

    platformVersions[optimizePlatform.value] = optimizedContent.value

    await (window as any).electronAPI.updateSMArticle(optimizeArticleId.value, {
      platform_versions: JSON.stringify(platformVersions)
    })
    ElMessage.success(`已保存 ${optimizePlatform.value} 版本`)
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 创建发布记录
const createPublishRecord = async () => {
  if (!publishForm.value.article_id) { ElMessage.warning('请选择文章'); return }
  try {
    await (window as any).electronAPI.addSMPublishRecord({
      article_id: publishForm.value.article_id,
      platform: publishForm.value.platform,
      status: 'scheduled',
      scheduled_at: publishForm.value.scheduled_at || null
    })
    ElMessage.success('发布计划已创建')
    showPublishDialog.value = false
    loadPublishRecords()
    loadStats()
  } catch (error) {
    ElMessage.error('创建失败')
  }
}

const updatePublishStatus = async (record: PublishRecord, status: string) => {
  try {
    const updateData: any = { status }
    if (status === 'published') {
      updateData.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
    await (window as any).electronAPI.updateSMPublishRecord(record.id, updateData)
    ElMessage.success('状态已更新')
    loadPublishRecords()
    loadStats()
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

onMounted(() => {
  loadStats()
  loadArticles()
  loadPublishRecords()
})
</script>

<style scoped>
.publish-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 1px solid #e8e4df;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: #c4a882;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.stat-icon { font-size: 32px; margin-bottom: 8px; }

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #9a9590;
  margin-top: 4px;
}

/* 发布区域 */
.publish-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
}

.publish-section h3 {
  font-size: 20px;
  color: #1a1a1a;
  margin: 0 0 20px 0;
}

.publish-section h4 {
  font-size: 16px;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.section-desc {
  color: #9a9590;
  font-size: 14px;
  margin: 0 0 16px 0;
}

/* 平台优化 */
.platform-optimize {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0ece8;
}

.platform-optimize-form {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.optimized-result {
  margin-top: 16px;
  padding: 16px;
  background: #faf8f5;
  border-radius: 10px;
}

.optimized-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
}

.optimized-preview {
  font-size: 14px;
  line-height: 1.8;
  color: #1a1a1a;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 发布记录 */
.publish-records {
  margin-top: 8px;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

:deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  font-size: 14px;
  border-radius: 10px;
}
</style>

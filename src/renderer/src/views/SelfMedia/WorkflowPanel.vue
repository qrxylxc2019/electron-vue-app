<template>
  <div class="workflow-panel">
    <!-- 步骤条 -->
    <el-steps :active="currentStep" finish-status="success" align-center class="steps-bar">
      <el-step title="选择主题" description="输入或选择选题" />
      <el-step title="AI 创作" description="生成文章内容" />
      <el-step title="审阅编辑" description="修改与审阅" />
      <el-step title="配图生成" description="提取要点并配图" />
      <el-step title="完成" description="预览与发布" />
    </el-steps>

    <div class="workflow-content">

      <!-- Step 0: 选择主题 -->
      <div v-if="currentStep === 0" class="step-panel">
        <div class="step-section">
          <h3>📝 确定创作主题</h3>
          <p class="section-desc">从选题库选择，或直接输入主题方向</p>

          <div class="topic-options">
            <el-button
              type="primary"
              class="topic-option-btn"
              @click="useTopicFromLibrary"
            >
              <span style="font-size: 20px; display: block; margin-bottom: 4px;">📚</span>
              从选题库选择
            </el-button>
            <el-button
              class="topic-option-btn"
              @click="showManualInput = true"
            >
              <span style="font-size: 20px; display: block; margin-bottom: 4px;">✏️</span>
              手动输入主题
            </el-button>
          </div>

          <!-- 手动输入 -->
          <div v-if="showManualInput" class="manual-input">
            <el-input
              v-model="manualTopic"
              placeholder="输入主题方向，如：AI编程入门避坑指南"
              size="large"
            />
            <el-button type="primary" size="large" @click="confirmManualTopic" style="margin-top: 12px;">
              确定
            </el-button>
          </div>

          <!-- 已选主题显示 -->
          <div v-if="selectedTopic" class="selected-topic">
            <div class="selected-label">当前选题：</div>
            <div class="selected-title">{{ selectedTopic.title }}</div>
            <div class="selected-meta" v-if="selectedTopic.selling_point">
              💡 {{ selectedTopic.selling_point }}
            </div>
            <el-button type="text" @click="clearTopic" style="margin-top: 8px;">重新选择</el-button>
          </div>
        </div>
      </div>

      <!-- Step 1: AI 创作 -->
      <div v-if="currentStep === 1" class="step-panel">
        <div class="step-section">
          <h3>🤖 AI 文章创作</h3>
          <div class="article-config">
            <el-form label-width="80px" size="large">
              <el-form-item label="选题">
                <div class="config-value">{{ selectedTopic?.title || manualTopic }}</div>
              </el-form-item>
              <el-form-item label="平台">
                <el-radio-group v-model="articlePlatform" :disabled="generating">
                  <el-radio-button value="小红书">📱 小红书</el-radio-button>
                  <el-radio-button value="微信公众号">📝 公众号</el-radio-button>
                  <el-radio-button value="抖音">🎬 抖音</el-radio-button>
                  <el-radio-button value="知乎">💡 知乎</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="字数">
                <el-radio-group v-model="articleWordCount" :disabled="generating">
                  <el-radio-button :value="800">800字</el-radio-button>
                  <el-radio-button :value="1000">1000字</el-radio-button>
                  <el-radio-button :value="1200">1200字</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-form>

            <el-button
              type="primary"
              size="large"
              :loading="generating"
              @click="generateArticle"
              class="generate-btn"
            >
              {{ generating ? 'AI 正在创作...' : '✨ 开始生成文章' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- Step 2: 审阅编辑 -->
      <div v-if="currentStep === 2" class="step-panel">
        <div class="step-section">
          <h3>📋 审阅文章</h3>
          <p class="section-desc">可在编辑器中直接修改，或通过反馈让 AI 重写</p>

          <div class="editor-container">
            <RichEditor
              ref="editorRef"
              :contentHtml="articleContent"
              height="400px"
              :fontSize="18"
              :showMenuBar="true"
              placeholder="文章内容..."
            />
          </div>

          <!-- 版本历史 -->
          <div v-if="versionHistory.length > 1" class="version-history">
            <div class="version-header">📜 版本历史 (共 {{ versionHistory.length }} 版)</div>
            <div
              v-for="(ver, idx) in versionHistory"
              :key="idx"
              class="version-item"
              :class="{ 'is-current': idx === versionHistory.length - 1 }"
              @click="previewVersion(idx)"
            >
              <span>版本 {{ idx + 1 }}</span>
              <el-tag v-if="idx === versionHistory.length - 1" size="small" type="success">当前</el-tag>
            </div>
          </div>

          <!-- 审阅操作 -->
          <div class="review-actions">
            <div class="review-buttons">
              <el-button type="primary" size="large" @click="approveArticle">
                ✅ 通过
              </el-button>
              <el-button size="large" type="danger" @click="showRewritePanel = true">
                🔄 拒绝重写
              </el-button>
            </div>

            <div v-if="showRewritePanel" class="rewrite-panel">
              <el-input
                v-model="rewriteFeedback"
                type="textarea"
                :rows="3"
                placeholder="请输入修改意见，如：语气太正式、需要更多案例、加入小红书热门话题..."
              />
              <div style="margin-top: 8px;">
                <el-button
                  type="primary"
                  :loading="generating"
                  @click="rewriteArticle"
                >
                  {{ generating ? 'AI 重写中...' : '🔄 AI 重写' }}
                </el-button>
                <el-button @click="showRewritePanel = false">取消</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: 配图生成 -->
      <div v-if="currentStep === 3" class="step-panel">
        <div class="step-section">
          <h3>🎨 视觉要点 + 配图</h3>
          <p class="section-desc">从文章提取关键画面，生成配图提示词</p>

          <div v-if="keyPoints.length > 0" class="keypoints-list">
            <div v-for="(point, idx) in keyPoints" :key="idx" class="keypoint-item">
              <div class="keypoint-number">{{ idx + 1 }}</div>
              <div class="keypoint-content">
                <div class="keypoint-text">{{ point }}</div>
                <el-input
                  v-model="imagePrompts[idx]"
                  type="textarea"
                  :rows="2"
                  :placeholder="'配图提示词 - ' + point"
                />
              </div>
            </div>
          </div>

          <div v-if="keyPoints.length === 0 && !extracting" class="empty-keypoints">
            <el-button type="primary" size="large" @click="extractVisualPoints">
              ✨ 提取视觉要点
            </el-button>
          </div>

          <div v-if="extracting" class="extracting-state">
            <el-icon class="is-loading" :size="24"><Loading /></el-icon>
            <span>AI 正在分析文章，提取视觉要点...</span>
          </div>

          <div v-if="keyPoints.length > 0 && !extracting" class="keypoints-actions">
            <el-button @click="extractVisualPoints" :loading="extracting">🔄 重新提取</el-button>
            <el-button type="primary" @click="generateImagePrompts" :loading="generatingPrompts">
              {{ generatingPrompts ? '生成提示词中...' : '🎨 生成配图提示词' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- Step 4: 完成 -->
      <div v-if="currentStep === 4" class="step-panel">
        <div class="step-section">
          <h3>🎉 创作完成</h3>

          <div class="completion-summary">
            <div class="summary-item">
              <span class="summary-label">选题：</span>
              <span>{{ selectedTopic?.title || manualTopic }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">平台：</span>
              <span>{{ articlePlatform }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">版本：</span>
              <span>v{{ currentVersion }}</span>
            </div>
            <div class="summary-item" v-if="keyPoints.length > 0">
              <span class="summary-label">配图要点：</span>
              <span>{{ keyPoints.length }} 个</span>
            </div>
          </div>

          <div class="preview-article">
            <h4>📖 文章预览</h4>
            <div class="article-preview" v-html="renderedContent"></div>
          </div>

          <div v-if="savedArticleId" class="completion-actions">
            <el-button type="primary" size="large" @click="$emit('go-publish', savedArticleId)">
              📤 进入发布管理
            </el-button>
            <el-button size="large" @click="resetWorkflow">
              🔄 重新创作
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 选题库对话框 -->
    <el-dialog
      v-model="libraryDialogVisible"
      title="从选题库选择"
      width="600px"
    >
      <el-table
        :data="libraryTopics"
        v-loading="loadingTopics"
        highlight-current-row
        @current-change="handleLibrarySelect"
        style="width: 100%"
        max-height="400"
      >
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column label="热度" width="80">
          <template #default="scope">
            <span style="color: #c4a882;">🔥 {{ scope.row.trend_score || 50 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="selling_point" label="卖点" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="libraryDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!librarySelectedTopic"
          @click="confirmLibraryTopic"
        >
          选择此选题
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import RichEditor from '@/components/editor.vue'
import { marked } from 'marked'

const emit = defineEmits<{
  (e: 'go-publish', articleId: number): void
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
}

// 步骤状态
const currentStep = ref(0)

// Step 0: 选题
const selectedTopic = ref<TopicItem | null>(null)
const manualTopic = ref('')
const showManualInput = ref(false)
const libraryDialogVisible = ref(false)
const libraryTopics = ref<TopicItem[]>([])
const librarySelectedTopic = ref<TopicItem | null>(null)
const loadingTopics = ref(false)

// Step 1: 创作
const articlePlatform = ref('小红书')
const articleWordCount = ref(1000)
const generating = ref(false)

// Step 2: 审阅
const editorRef = ref<InstanceType<typeof any> | null>(null)
const articleContent = ref('')
const showRewritePanel = ref(false)
const rewriteFeedback = ref('')
const versionHistory = ref<string[]>([])
const currentVersion = ref(1)
const savedArticleId = ref<number | null>(null)
const savedTopicId = ref<number | null>(null)

// Step 3: 配图
const keyPoints = ref<string[]>([])
const imagePrompts = ref<string[]>([])
const extracting = ref(false)
const generatingPrompts = ref(false)

// 计算属性
const renderedContent = computed(() => {
  try {
    return marked.parse(articleContent.value, { async: false }) as string
  } catch {
    return articleContent.value
  }
})

// ========== Step 0: 选题 ==========
const useTopicFromLibrary = async () => {
  loadingTopics.value = true
  libraryDialogVisible.value = true
  try {
    const res = await (window as any).electronAPI.getSMTopics({
      page: 1, pageNum: 50, conditions: { status: 'approved' },
      orderBy: { column: 'trend_score', type: 'desc' }
    })
    if (res?.list && res.list.length > 0) {
      libraryTopics.value = res.list || []
    } else {
      // 假数据
      libraryTopics.value = [
        { id: 1, title: 'AI编程入门：零基础30天学会Python', category: 'AI编程', keywords: 'Python,入门', trend_score: 85, selling_point: '零基础友好', target_audience: '编程小白', status: 'approved' },
        { id: 2, title: 'ChatGPT提示词工程实战技巧', category: 'AI编程', keywords: 'ChatGPT', trend_score: 92, selling_point: '效率提升3倍', target_audience: '职场人士', status: 'approved' },
        { id: 3, title: '小红书爆款笔记写作公式', category: '副业赚钱', keywords: '小红书', trend_score: 78, selling_point: '可复制公式', target_audience: '自媒体创作者', status: 'approved' },
      ]
    }
  } catch (error) {
    console.error('获取选题库失败:', error)
    libraryTopics.value = [
      { id: 1, title: 'AI编程入门：零基础30天学会Python', category: 'AI编程', keywords: 'Python,入门', trend_score: 85, selling_point: '零基础友好', target_audience: '编程小白', status: 'approved' },
      { id: 2, title: 'ChatGPT提示词工程实战技巧', category: 'AI编程', keywords: 'ChatGPT', trend_score: 92, selling_point: '效率提升3倍', target_audience: '职场人士', status: 'approved' },
    ]
  } finally {
    loadingTopics.value = false
  }
}

const handleLibrarySelect = (row: TopicItem) => {
  librarySelectedTopic.value = row
}

const confirmLibraryTopic = () => {
  if (librarySelectedTopic.value) {
    selectedTopic.value = { ...librarySelectedTopic.value }
    libraryDialogVisible.value = false
    currentStep.value = 1
  }
}

const confirmManualTopic = () => {
  if (!manualTopic.value.trim()) {
    ElMessage.warning('请输入主题')
    return
  }
  currentStep.value = 1
}

const clearTopic = () => {
  selectedTopic.value = null
  manualTopic.value = ''
  showManualInput.value = false
}

// ========== Step 1: AI 创作 ==========
const generateArticle = async () => {
  const topicTitle = selectedTopic.value?.title || manualTopic.value
  if (!topicTitle) { ElMessage.warning('请先选择选题'); return }

  generating.value = true
  try {
    // 先保存选题到数据库（如果是手动输入）
    if (!selectedTopic.value && manualTopic.value) {
      const topicRes = await (window as any).electronAPI.addSMTopic({
        title: manualTopic.value,
        category: 'AI编程',
        status: 'pending'
      })
      if (topicRes && topicRes.id) {
        savedTopicId.value = topicRes.id
      }
    } else if (selectedTopic.value?.id) {
      savedTopicId.value = selectedTopic.value.id
    }

    // 调用 AI 写文章
    const content = await (window as any).electronAPI.writeSMArticle(
      topicTitle, articlePlatform.value, articleWordCount.value
    )
    articleContent.value = content || ''

    // 保存文章到数据库
    const wordCount = articleContent.value.replace(/<[^>]*>/g, '').length
    const articleRes = await (window as any).electronAPI.addSMArticle({
      topic_id: savedTopicId.value,
      title: topicTitle,
      content: articleContent.value,
      word_count: wordCount,
      platform: articlePlatform.value,
      status: 'draft',
      version: 1
    })
    if (articleRes && articleRes.id) {
      savedArticleId.value = articleRes.id
    }

    versionHistory.value = [articleContent.value]
    currentVersion.value = 1
    currentStep.value = 2
  } catch (error) {
    console.error('AI 生成文章失败:', error)
    ElMessage.error('AI 生成文章失败，请检查 API 配置')
  } finally {
    generating.value = false
  }
}

// ========== Step 2: 审阅 ==========
const approveArticle = async () => {
  if (editorRef.value) {
    articleContent.value = editorRef.value.getContent()
  }
  try {
    if (savedArticleId.value) {
      await (window as any).electronAPI.updateSMArticle(savedArticleId.value, {
        content: articleContent.value,
        status: 'approved'
      })
    }
    currentStep.value = 3
    // 自动提取视觉要点
    extractVisualPoints()
  } catch (error) {
    console.error('更新文章状态失败:', error)
    ElMessage.success('已进入下一步')
    currentStep.value = 3
    extractVisualPoints()
  }
}

const rewriteArticle = async () => {
  if (!rewriteFeedback.value.trim()) {
    ElMessage.warning('请输入修改意见')
    return
  }

  if (editorRef.value) {
    articleContent.value = editorRef.value.getContent()
  }

  generating.value = true
  try {
    const newContent = await (window as any).electronAPI.rewriteSMArticle(
      articleContent.value, rewriteFeedback.value
    )
    if (newContent) {
      articleContent.value = newContent
      currentVersion.value++
      versionHistory.value.push(newContent)

      // 保存新版本文章
      if (savedArticleId.value) {
        const wordCount = articleContent.value.replace(/<[^>]*>/g, '').length
        await (window as any).electronAPI.addSMArticle({
          topic_id: savedTopicId.value,
          title: selectedTopic.value?.title || manualTopic.value,
          content: articleContent.value,
          word_count: wordCount,
          platform: articlePlatform.value,
          status: 'draft',
          version: currentVersion.value,
          parent_id: savedArticleId.value
        })
      }

      ElMessage.success(`重写完成 (v${currentVersion.value})`)
      showRewritePanel.value = false
      rewriteFeedback.value = ''
    }
  } catch (error) {
    console.error('AI 重写失败:', error)
    ElMessage.error('AI 重写失败')
  } finally {
    generating.value = false
  }
}

const previewVersion = (idx: number) => {
  if (versionHistory.value[idx]) {
    articleContent.value = versionHistory.value[idx]
    currentVersion.value = idx + 1
    if (editorRef.value) {
      editorRef.value.setContent(articleContent.value)
    }
  }
}

// ========== Step 3: 配图 ==========
const extractVisualPoints = async () => {
  if (!articleContent.value) return
  extracting.value = true
  try {
    const points = await (window as any).electronAPI.extractSMKeyPoints(articleContent.value)
    if (Array.isArray(points) && points.length > 0) {
      keyPoints.value = points
      imagePrompts.value = new Array(points.length).fill('')
    } else {
      ElMessage.warning('未能提取到视觉要点')
    }
  } catch (error) {
    console.error('提取视觉要点失败:', error)
    ElMessage.error('提取视觉要点失败')
  } finally {
    extracting.value = false
  }
}

const generateImagePrompts = async () => {
  generatingPrompts.value = true
  try {
    for (let i = 0; i < keyPoints.value.length; i++) {
      if (!imagePrompts.value[i]) {
        const prompt = await (window as any).electronAPI.generateSMImagePrompt(
          keyPoints.value[i], '封面配图'
        )
        imagePrompts.value[i] = prompt || ''

        // 保存到图片表
        if (savedArticleId.value) {
          await (window as any).electronAPI.addSMImage({
            article_id: savedArticleId.value,
            prompt: prompt || '',
            image_type: 'cover',
            status: 'pending'
          })
        }
      }
    }
    ElMessage.success('配图提示词生成完成')
    currentStep.value = 4
  } catch (error) {
    console.error('生成配图提示词失败:', error)
    ElMessage.error('生成配图提示词失败')
  } finally {
    generatingPrompts.value = false
  }
}

// ========== Step 4: 完成 ==========
const resetWorkflow = () => {
  currentStep.value = 0
  selectedTopic.value = null
  manualTopic.value = ''
  showManualInput.value = false
  articleContent.value = ''
  articlePlatform.value = '小红书'
  articleWordCount.value = 1000
  versionHistory.value = []
  currentVersion.value = 1
  keyPoints.value = []
  imagePrompts.value = []
  savedArticleId.value = null
  savedTopicId.value = null
  showRewritePanel.value = false
  rewriteFeedback.value = ''
}
</script>

<style scoped>
.workflow-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.steps-bar {
  margin-bottom: 24px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.workflow-content {
  flex: 1;
  overflow-y: auto;
}

.step-panel {
  padding: 0 8px;
}

.step-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
}

.step-section h3 {
  font-size: 20px;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.section-desc {
  color: #9a9590;
  font-size: 14px;
  margin: 0 0 20px 0;
}

/* Step 0: 选题 */
.topic-options {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.topic-option-btn {
  width: 180px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 15px;
}

.manual-input { margin-top: 16px; }

.selected-topic {
  margin-top: 20px;
  padding: 16px;
  background: #faf8f5;
  border-radius: 10px;
  border-left: 4px solid #8b9a6d;
}

.selected-label {
  font-size: 13px;
  color: #9a9590;
  margin-bottom: 4px;
}

.selected-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.selected-meta {
  font-size: 14px;
  color: #6b6560;
  margin-top: 4px;
}

/* Step 1: 创作 */
.article-config {
  max-width: 600px;
}

.config-value {
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
}

.generate-btn {
  margin-top: 16px;
  padding: 12px 32px;
  font-size: 16px;
  border-radius: 10px;
}

/* Step 2: 审阅 */
.editor-container {
  border: 1px solid #e8e4df;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

.version-history {
  margin-bottom: 16px;
}

.version-header {
  font-size: 14px;
  font-weight: 500;
  color: #6b6560;
  margin-bottom: 8px;
}

.version-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  margin-right: 8px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: #f5f3f0;
  transition: all 0.2s;
}

.version-item:hover { background: #e8e4df; }
.version-item.is-current { background: #8b9a6d; color: #fff; }

.review-actions {
  margin-top: 16px;
}

.review-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.rewrite-panel {
  margin-top: 8px;
  padding: 16px;
  background: #faf8f5;
  border-radius: 10px;
}

/* Step 3: 配图 */
.keypoints-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.keypoint-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #faf8f5;
  border-radius: 10px;
}

.keypoint-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #8b9a6d;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.keypoint-content { flex: 1; }

.keypoint-text {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.empty-keypoints {
  text-align: center;
  padding: 32px;
}

.extracting-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: #6b6560;
}

.keypoints-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* Step 4: 完成 */
.completion-summary {
  padding: 16px;
  background: #faf8f5;
  border-radius: 10px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 15px;
}

.summary-label {
  color: #9a9590;
  min-width: 80px;
}

.preview-article {
  margin-bottom: 20px;
}

.preview-article h4 {
  margin: 0 0 12px 0;
  color: #6b6560;
}

.article-preview {
  padding: 20px;
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.8;
  font-size: 15px;
}

.completion-actions {
  display: flex;
  gap: 12px;
}
</style>

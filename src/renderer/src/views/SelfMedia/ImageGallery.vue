<template>
  <div class="image-gallery">
    <div class="gallery-header">
      <h3>🎨 配图管理</h3>
      <el-select v-model="selectedArticleId" placeholder="选择文章查看配图" size="large" @change="loadImages" style="width: 260px;">
        <el-option
          v-for="article in articles"
          :key="article.id"
          :label="article.title"
          :value="article.id"
        />
      </el-select>
    </div>

    <div v-loading="loading" class="gallery-grid">
      <div v-if="images.length === 0 && !loading" class="empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">🖼️</div>
        <div style="font-size: 18px; color: #9a9590;">
          {{ selectedArticleId ? '该文章暂无配图' : '请先选择一篇文章' }}
        </div>
      </div>

      <div v-for="img in images" :key="img.id" class="image-card">
        <div class="image-preview">
          <div v-if="img.image_path" class="image-thumb">
            <img :src="img.image_path" alt="配图" />
          </div>
          <div v-else class="image-placeholder">
            <span style="font-size: 36px;">🎨</span>
            <span style="font-size: 13px; color: #9a9590;">待生成</span>
          </div>
        </div>

        <div class="image-info">
          <div class="info-row">
            <span class="info-label">类型：</span>
            <el-tag size="small">{{ img.image_type || 'cover' }}</el-tag>
          </div>
          <div class="info-row">
            <span class="info-label">状态：</span>
            <el-tag :type="getImageStatusType(img.status)" size="small">
              {{ getImageStatusLabel(img.status) }}
            </el-tag>
          </div>
          <div v-if="img.prompt" class="info-row prompt-row">
            <span class="info-label">提示词：</span>
            <div class="prompt-text">{{ img.prompt }}</div>
          </div>
        </div>

        <div class="image-actions">
          <el-button size="small" @click="copyPrompt(img.prompt)" v-if="img.prompt">
            📋 复制提示词
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(img)">
            <el-icon style="margin-right: 4px;"><Delete /></el-icon>删除
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'

interface ArticleItem {
  id: number
  title: string
}

interface ImageItem {
  id: number
  article_id: number
  prompt: string
  image_path: string
  image_type: string
  status: string
  created_at?: string
}

const articles = ref<ArticleItem[]>([])
const images = ref<ImageItem[]>([])
const selectedArticleId = ref<number | null>(null)
const loading = ref(false)

const getImageStatusType = (status: string) => {
  switch (status) {
    case 'completed': case 'generated': return 'success'
    case 'generating': return 'warning'
    case 'failed': return 'danger'
    default: return 'info'
  }
}

const getImageStatusLabel = (status: string) => {
  switch (status) {
    case 'completed': case 'generated': return '已生成'
    case 'generating': return '生成中'
    case 'failed': return '失败'
    default: return '待生成'
  }
}

const loadArticles = async () => {
  try {
    const res = await (window as any).electronAPI.getSMArticles({
      page: 1, pageNum: 100, conditions: {},
      orderBy: { column: 'id', type: 'desc' }
    })
    if (res?.list && res.list.length > 0) {
      articles.value = res.list || []
    } else {
      // 假数据
      articles.value = [
        { id: 1, title: 'AI编程入门：零基础30天学会Python' },
        { id: 2, title: 'ChatGPT提示词工程实战技巧' },
        { id: 3, title: '小红书爆款笔记写作公式' },
      ]
    }
  } catch (error) {
    console.error('获取文章列表失败:', error)
    articles.value = [
      { id: 1, title: 'AI编程入门：零基础30天学会Python' },
      { id: 2, title: 'ChatGPT提示词工程实战技巧' },
      { id: 3, title: '小红书爆款笔记写作公式' },
    ]
  }
}

const loadImages = async () => {
  if (!selectedArticleId.value) { images.value = []; return }
  loading.value = true
  try {
    const res = await (window as any).electronAPI.getSMImages(selectedArticleId.value)
    const data = Array.isArray(res) ? res : (res?.list || [])
    if (data.length > 0) {
      images.value = data
    } else {
      // 假数据
      images.value = [
        { id: 1, article_id: selectedArticleId.value, prompt: 'A modern workspace with laptop showing Python code, warm lighting, minimalist style, illustration', image_path: '', image_type: 'cover', status: 'pending', created_at: '2025-06-10 10:00' },
        { id: 2, article_id: selectedArticleId.value, prompt: 'Young professional using AI chatbot, futuristic interface, blue and green tones, digital art', image_path: '', image_type: 'cover', status: 'pending', created_at: '2025-06-11 14:30' },
      ]
    }
  } catch (error) {
    console.error('获取图片失败:', error)
    images.value = [
      { id: 1, article_id: selectedArticleId.value, prompt: 'A modern workspace with laptop showing Python code, warm lighting, minimalist style, illustration', image_path: '', image_type: 'cover', status: 'pending', created_at: '2025-06-10 10:00' },
      { id: 2, article_id: selectedArticleId.value, prompt: 'Young professional using AI chatbot, futuristic interface, blue and green tones, digital art', image_path: '', image_type: 'cover', status: 'pending', created_at: '2025-06-11 14:30' },
    ]
  } finally {
    loading.value = false
  }
}

const copyPrompt = (prompt: string) => {
  if (prompt) {
    navigator.clipboard.writeText(prompt).then(() => {
      ElMessage.success('提示词已复制到剪贴板')
    }).catch(() => {
      ElMessage.warning('复制失败，请手动复制')
    })
  }
}

const handleDelete = async (img: ImageItem) => {
  try {
    await ElMessageBox.confirm('确定要删除这张配图吗？', '警告', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await (window as any).electronAPI.deleteSMImage(img.id)
    ElMessage.success('删除成功')
    loadImages()
  } catch (error) {
    if (error !== 'cancel') { ElMessage.error('删除失败') }
  }
}

onMounted(() => { loadArticles() })
</script>

<style scoped>
.image-gallery {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.gallery-header h3 {
  font-size: 18px;
  color: #1a1a1a;
  margin: 0;
}

.gallery-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  align-content: start;
  overflow-y: auto;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.image-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8e4df;
  overflow: hidden;
  transition: all 0.3s;
}

.image-card:hover {
  border-color: #c4a882;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.image-preview {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f3f0;
}

.image-thumb {
  width: 100%;
  height: 100%;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.image-info {
  padding: 12px 16px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
}

.info-label {
  color: #9a9590;
  white-space: nowrap;
}

.prompt-row { flex-direction: column; }

.prompt-text {
  font-size: 13px;
  color: #6b6560;
  line-height: 1.5;
  max-height: 60px;
  overflow-y: auto;
  padding: 4px 0;
}

.image-actions {
  display: flex;
  gap: 8px;
  padding: 8px 16px 12px;
  border-top: 1px solid #f0ece8;
}
</style>

<template>
  <div class="handwriting-container">
    <!-- 顶部搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索图片名称"
        class="search-input"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button :icon="Refresh" circle @click="handleRefresh" />
    </div>

    <!-- 图片网格 -->
    <div class="image-grid" v-loading="loading">
      <div 
        v-for="image in images" 
        :key="image.id" 
        class="image-item"
        @click="previewImage(image)"
      >
        <el-image
          :src="getImageUrl(image.url)"
          fit="cover"
          class="image-pre"
          lazy
        >
          <template #placeholder>
            <div class="image-placeholder">
              <el-icon class="loading-icon"><Loading /></el-icon>
            </div>
          </template>
          <template #error>
            <div class="image-error">
              <el-icon><Picture /></el-icon>
              <span>加载失败</span>
            </div>
          </template>
        </el-image>
        <div class="image-name">{{ image.name }}</div>
        <div class="image-delete" @click.stop="handleDelete(image)">
          <el-icon><Delete /></el-icon>
        </div>
      </div>
      <div v-if="images.length === 0 && !loading" class="no-data">
        <el-empty description="暂无图片" />
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-box">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 图片预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="currentImage?.name"
      width="80%"
      class="preview-dialog"
      destroy-on-close
    >
      <div class="preview-content">
        <el-image
          :src="getImageUrl(currentImage?.url)"
          fit="contain"
          class="preview-image"
        />
      </div>
      <template #footer>
        <el-button @click="prevImage" :disabled="currentIndex <= 0">
          <el-icon><ArrowLeft /></el-icon> 上一张
        </el-button>
        <el-button @click="nextImage" :disabled="currentIndex >= images.length - 1">
          下一张 <el-icon><ArrowRight /></el-icon>
        </el-button>
        <el-button type="primary" @click="handlePrint">
          <el-icon><Printer /></el-icon> 打印
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Picture, Loading, ArrowLeft, ArrowRight, Printer, Delete } from '@element-plus/icons-vue'

const api = (window as any).electronAPI

interface ImageItem {
  id: number
  name: string
  url: string
  size: number
}

// 数据
const images = ref<ImageItem[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 预览相关
const previewVisible = ref(false)
const currentImage = ref<ImageItem | null>(null)
const currentIndex = ref(0)

let searchTimeout: number | null = null

// 获取图片完整URL（现在直接返回 base64 数据）
const getImageUrl = (url: string | undefined) => {
  if (!url) return ''
  return url
}

// 获取图片列表
const fetchImages = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageNum: pageSize.value,
      keyword: searchKeyword.value || undefined
    }

    const res = await api.getHandwritingList(params)

    if (res.code === 200 && res.result) {
      images.value = res.result.list || []
      total.value = res.result.pagination?.total || 0
    } else {
      ElMessage.error(res.message || '获取图片失败')
    }
  } catch (error) {
    console.error('获取图片失败:', error)
    ElMessage.error('获取图片失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchImages()
  }, 500)
}

// 刷新
const handleRefresh = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  fetchImages()
}

// 分页
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchImages()
}

const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchImages()
}

// 预览图片
const previewImage = (image: ImageItem) => {
  currentImage.value = image
  currentIndex.value = images.value.findIndex(img => img.id === image.id)
  previewVisible.value = true
}

// 上一张
const prevImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    currentImage.value = images.value[currentIndex.value]
  }
}

// 下一张
const nextImage = () => {
  if (currentIndex.value < images.value.length - 1) {
    currentIndex.value++
    currentImage.value = images.value[currentIndex.value]
  }
}

// 打印当前图片
const handlePrint = () => {
  if (!currentImage.value) {
    ElMessage.warning('没有图片可打印')
    return
  }
  
  const printContent = `
    <html>
    <head>
      <title>打印图片 - ${currentImage.value.name}</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        img {
          max-width: 100%;
          max-height: 100vh;
        }
        @media print {
          @page { margin: 0.5cm; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <img src="${getImageUrl(currentImage.value.url)}" alt="${currentImage.value.name}" />
    </body>
    </html>
  `
  
  const printWindow = window.open('', '_blank', 'width=1,height=1,left=-1000,top=-1000')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    
    printWindow.onload = function() {
      printWindow.print()
      printWindow.close()
    }
  }
}

// 删除图片
const handleDelete = async (image: ImageItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除图片「${image.name}」吗？此操作将同时删除磁盘文件，不可恢复。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await api.deleteHandwriting(image.name)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchImages()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  fetchImages()
})
</script>

<style scoped>
.handwriting-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: #f5f7fa;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
}

.image-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-auto-rows: 280px;
  gap: 20px;
  overflow-y: auto;
  padding: 10px;
}

.image-item {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 280px;
  position: relative;
}

.image-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

.image-delete:hover {
  background: #f56c6c;
}

.image-item:hover .image-delete {
  opacity: 1;
}


.image-pre {
  width: 100%;
  height: 390px;
}

.image-name {
  padding: 10px;
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.image-placeholder,
.image-error {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
}

.loading-icon {
  font-size: 30px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.image-error {
  gap: 10px;
}

.image-error .el-icon {
  font-size: 40px;
}

.no-data {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.pagination-box {
  padding: 15px 0;
  display: flex;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  margin-top: 20px;
}

/* 预览弹窗 */
.preview-dialog :deep(.el-dialog__body) {
  padding: 0;
  max-height: 75vh;
  overflow-y: auto;
}

.preview-content {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #000;
  min-height: 200px;
}

.preview-image {
  max-width: 100%;
  width: auto;
  height: auto;
}

.preview-image :deep(img) {
  max-width: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

/* 隐藏滚动条 */
.image-grid::-webkit-scrollbar {
  display: none;
}

.image-grid {
  scrollbar-width: none;
}
</style>

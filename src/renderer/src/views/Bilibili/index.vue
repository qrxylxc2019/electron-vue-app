<template>
  <div class="xianyu-container">
    <div class="xianyu-header">
      <el-input
        v-model="searchText"
        placeholder="搜索视频"
        class="search-input"
        size="large"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearchClear"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="success" size="large" @click="handleSearch" :loading="searchLoading">
        搜索
      </el-button>
      <el-button type="primary" size="large" @click="fetchData" :loading="loading">
        刷新数据
      </el-button>
    </div>

    <el-table :data="filteredList" v-loading="loading || searchLoading" stripe style="width: 100%; flex: 1" :height="'calc(100vh - 160px)'">
      <el-table-column type="index" label="序号" width="100" align="center" />
      <el-table-column label="封面" width="120" align="center">
        <template #default="{ row }">
          <img :src="row.pic" :alt="row.title" class="table-img" @click="showImagePreview(row.pic)" />
        </template>
      </el-table-column>
      <el-table-column prop="title" label="视频标题" show-overflow-tooltip />
      <el-table-column prop="author" label="UP主" width="150" align="center" />
      <el-table-column label="播放量" width="120" align="center">
        <template #default="{ row }">
          <span>{{ row.play }}</span>
        </template>
      </el-table-column>
      <el-table-column label="弹幕数" width="200" align="center">
        <template #default="{ row }">
          <span>{{ row.danmaku }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="duration" label="时长" width="100" align="center" />
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" @click="openDetail(row)">详情</el-button>
          <el-button type="warning" @click="collectItem(row)">收藏</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="xianyu-pagination" v-if="list.length > 0">
      <el-button :disabled="page <= 1" @click="prevPage">上一页</el-button>
      <span class="page-info">第 {{ page }} 页</span>
      <el-button @click="nextPage">下一页</el-button>
    </div>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="imagePreviewVisible" width="800px" :show-close="true">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img :src="previewImageUrl" alt="预览图片" style="max-height: 600px; max-width: 100%; object-fit: contain;" />
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

interface BilibiliItem {
  title: string
  author: string
  pic: string
  play: string
  danmaku: string
  duration: string
  arcurl: string
}

const list = ref<BilibiliItem[]>([])
const loading = ref(false)
const searchText = ref('')
const page = ref(1)
const pageSize = ref(30)

const searchLoading = ref(false)
const searchList = ref<BilibiliItem[]>([])
const isSearchMode = ref(false)
const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')

const filteredList = computed(() => {
  return isSearchMode.value ? searchList.value : list.value
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await request.post('http://localhost:8000/api/bilibili/feed', {
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.code === 200) {
      list.value = res.data || []
    } else {
      ElMessage.error(res.message || '获取失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '请求失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  const keyword = searchText.value.trim()
  if (!keyword) {
    isSearchMode.value = false
    searchList.value = []
    return
  }
  isSearchMode.value = true
  searchLoading.value = true
  try {
    const res = await request.post('http://localhost:8000/api/bilibili/search', {
      keyword,
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.code === 200) {
      searchList.value = res.data || []
    } else {
      ElMessage.error(res.message || '搜索失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '搜索请求失败')
  } finally {
    searchLoading.value = false
  }
}

const handleSearchClear = () => {
  isSearchMode.value = false
  searchList.value = []
}

const openDetail = (item: BilibiliItem) => {
  window.open(item.arcurl, '_blank')
}

const collectItem = async (item: BilibiliItem) => {
  try {
    const res = await request.post('http://localhost:8000/api/collect/add', {
      title: item.title,
      url: item.arcurl
    })
    if (res.code === 200) {
      ElMessage.success('收藏成功')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '收藏失败')
  }
}

const prevPage = () => {
  if (page.value > 1) {
    page.value--
    fetchData()
  }
}

const nextPage = () => {
  page.value++
  fetchData()
}

const showImagePreview = (imageUrl: string) => {
  previewImageUrl.value = imageUrl
  imagePreviewVisible.value = true
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.xianyu-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

.xianyu-header {
  display: flex;
  gap: 12px;
  margin-bottom: 15px;
  align-items: center;
}

.search-input {
  max-width: 400px;
}

.table-img {
  width: 80px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.xianyu-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  margin-top: 15px;
}

.page-info {
  font-size: 14px;
  color: #666;
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
</style>

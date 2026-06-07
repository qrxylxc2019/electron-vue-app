<template>
  <div class="xianyu-container">
    <div class="xianyu-header">
      <el-input
        v-model="searchText"
        placeholder="搜索商品"
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
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column label="图片" width="80" align="center">
        <template #default="{ row }">
          <img :src="row.imageUrl" :alt="row.title" class="table-img" @click="showImagePreview(row.imageUrl)" />
        </template>
      </el-table-column>
      <el-table-column prop="title" label="商品标题" show-overflow-tooltip />
      <el-table-column prop="detailUrl" label="链接" width="250" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" @click="copyToClipboard(row.detailUrl)" :underline="false">
            {{ row.detailUrl }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="价格" width="100" align="center">
        <template #default="{ row }">
          <span class="table-price">¥{{ row.price }}</span>
        </template>
      </el-table-column>
      <el-table-column label="原价" width="100" align="center">
        <template #default="{ row }">
          <span v-if="row.oriPrice" class="table-ori-price">¥{{ row.oriPrice }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="wantNum" label="热度" width="100" align="center" />
      <el-table-column label="操作" width="280" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary"  @click="openDetail(row)">详情</el-button>
          <el-button type="warning"  @click="collectItem(row)">收藏</el-button>
          <el-button type="success"  @click="addToVirtual(row)" :loading="row._addingVirtual">虚拟资料</el-button>
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

interface XianyuItem {
  itemId: string
  title: string
  price: string
  oriPrice: string
  city: string
  imageUrl: string
  userNick: string
  wantNum: string
  detailUrl: string
}

const list = ref<XianyuItem[]>([])
const loading = ref(false)
const searchText = ref('')
const page = ref(1)
const pageSize = ref(30)

const searchLoading = ref(false)
const searchList = ref<XianyuItem[]>([])
const isSearchMode = ref(false)
const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')

const filteredList = computed(() => {
  return isSearchMode.value ? searchList.value : list.value
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await request.post('http://localhost:8000/api/xianyu/feed', {
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
    const res = await request.post('http://localhost:8000/api/xianyu/search', {
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

const openDetail = (item: XianyuItem) => {
  window.open(item.detailUrl, '_blank')
}

const collectItem = async (item: XianyuItem) => {
  try {
    const res = await request.post('http://localhost:8000/api/collect/add', {
      title: item.title,
      url: item.detailUrl
    })
    if (res.code === 200) {
      ElMessage.success('收藏成功')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '收藏失败')
  }
}

const addToVirtual = async (item: XianyuItem) => {
  item._addingVirtual = true
  try {
    const res = await request.post('http://localhost:8000/api/virtual/add_from_xianyu', {
      title: item.title,
      buy_url: item.detailUrl,
      price: item.price,
      old_price: item.oriPrice || '',
      desc: '',
      imageUrl: item.imageUrl,
      detailImages: []
    })
    if (res.code === 200) {
      ElMessage.success(`添加成功，已保存${res.data?.saved_pics || 0}张图片`)
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '添加到虚拟资料失败')
  } finally {
    item._addingVirtual = false
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

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
    console.error(error)
  }
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
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.table-price {
  font-weight: bold;
  color: #e8686a;
  font-size: 16px;
}

.table-ori-price {
  font-size: 14px;
  color: #9a9590;
  text-decoration: line-through;
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
  color: #6b6560;
}

/* 表格字体大小 */
:deep(.el-table) {
  font-size: 18px;
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
  background-color: #fff;
  border-radius: 12px;
}
:deep(.el-table__inner-wrapper::before) {
  display: none;
}
:deep(.el-table .el-table__header th) {
  font-size: 18px;
  font-weight: 600;
  color: #6b6560;
  background-color: #f5f3f0 !important;
}
:deep(.el-table .cell) {
  font-size: 18px;
  color: #1a1a1a;
}
:deep(.el-tag) {
  font-size: 16px;
  border-radius: 8px;
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
:deep(.el-button--success) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  border-radius: 10px;
}
:deep(.el-button--success:hover) {
  background-color: #7a895c;
  border-color: #7a895c;
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

/* 输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
}
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

/* 链接样式 */
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
</style>

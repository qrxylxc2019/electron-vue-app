<template>
  <div class="book-video-container">
    <div class="header">
      <el-input
        v-model="searchText"
        placeholder="搜索视频标题或书名"
        class="search-input"
        size="large"
        clearable
        @input="searchBookVideos"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" @click="showAddDrawer">
        <el-icon><Plus /></el-icon>新增视频
      </el-button>
    </div>

    <el-table
      :data="bookVideos"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="title" label="视频标题" min-width="250" show-overflow-tooltip />
      <el-table-column prop="book_name" label="书名" min-width="180" show-overflow-tooltip />
      <el-table-column prop="author" label="作者" width="120" show-overflow-tooltip />
      <el-table-column prop="platform" label="平台" width="100" />
      <el-table-column prop="status" label="状态" width="150">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)">
            {{ getStatusText(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="scope">
          <el-button type="primary" link @click="handleEdit(scope.row)">
            <el-icon><Edit /></el-icon>编辑
          </el-button>
          <el-button type="danger" link @click="handleDelete(scope.row)">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
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

    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑视频' : '新增视频'"
      direction="rtl"
      size="60%"
      @close="resetForm"
    >
      <el-form :model="form" label-width="100px" size="large">
        <el-form-item label="视频标题" required>
          <el-input v-model="form.title" placeholder="请输入视频标题" />
        </el-form-item>
        <el-form-item label="书名">
          <el-input v-model="form.book_name" placeholder="请输入书名" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="form.author" placeholder="请输入作者" />
        </el-form-item>
        <el-form-item label="视频链接">
          <el-input v-model="form.video_url" placeholder="请输入视频链接" />
        </el-form-item>
        <el-form-item label="封面链接">
          <el-input v-model="form.cover_url" placeholder="请输入封面图片链接" />
        </el-form-item>
        <el-form-item label="平台">
          <el-select v-model="form.platform" placeholder="请选择平台" style="width: 100%">
            <el-option label="抖音" value="抖音" />
            <el-option label="快手" value="快手" />
            <el-option label="小红书" value="小红书" />
            <el-option label="B站" value="B站" />
            <el-option label="视频号" value="视频号" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待发布" value="0" />
            <el-option label="已发布" value="1" />
            <el-option label="已下架" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tags" placeholder="请输入标签，用逗号分隔" />
        </el-form-item>
        <el-form-item label="视频描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="5"
            placeholder="请输入视频描述/文案"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="drawerVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import request from '@/utils/request'

// 数据定义
const bookVideos = ref([])
const searchText = ref('')
const loading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = 'calc(100vh - 230px)'

// 抽屉相关
const drawerVisible = ref(false)
const isEdit = ref(false)
const form = ref({
  id: undefined,
  title: '',
  book_name: '',
  author: '',
  video_url: '',
  cover_url: '',
  description: '',
  tags: '',
  platform: '',
  status: '0'
})

let searchTimeout = null

const fetchBookVideos = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: { column: 'id', type: 'desc' }
    }
    if (searchText.value) {
      params.conditions = { title: searchText.value, book_name: searchText.value }
    }
    const res = await request.post('http://localhost:8000/api/bookVideo/get', params)
    if (res.code === 200 && res.result?.list) {
      bookVideos.value = res.result.list
      total.value = res.result.pagination?.total || 0
    } else {
      bookVideos.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取视频数据失败:', error)
    ElMessage({ message: '获取视频数据失败', type: 'warning' })
    bookVideos.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索视频
const searchBookVideos = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchBookVideos()
  }, 300)
}

// 分页
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchBookVideos()
}
const handlePageChange = (val) => {
  currentPage.value = val
  fetchBookVideos()
}

// 状态显示
const getStatusType = (status) => {
  const types = { '0': 'info', '1': 'success', '2': 'danger' }
  return types[status] || 'info'
}
const getStatusText = (status) => {
  const texts = { '0': '待发布', '1': '已发布', '2': '已下架' }
  return texts[status] || '未知'
}

// 新增视频
const showAddDrawer = () => {
  isEdit.value = false
  form.value = {
    id: undefined,
    title: '',
    book_name: '',
    author: '',
    video_url: '',
    cover_url: '',
    description: '',
    tags: '',
    platform: '',
    status: '0'
  }
  drawerVisible.value = true
}

// 编辑视频
const handleEdit = (row) => {
  isEdit.value = true
  form.value = { ...row }
  drawerVisible.value = true
}

// 提交保存
const handleSubmit = async () => {
  if (!form.value.title) {
    ElMessage.warning('请输入视频标题')
    return
  }
  try {
    let res
    if (isEdit.value && form.value.id) {
      res = await request.post('http://localhost:8000/api/bookVideo/update', form.value)
    } else {
      const data = { ...form.value }
      delete data.id
      res = await request.post('http://localhost:8000/api/bookVideo/add', data)
    }
    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      drawerVisible.value = false
      fetchBookVideos()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存视频失败:', error)
    ElMessage.error('保存失败')
  }
}

// 删除视频
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个视频吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await request.post('http://localhost:8000/api/bookVideo/delete', { id: row.id })
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchBookVideos()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除视频失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  form.value = {
    id: undefined,
    title: '',
    book_name: '',
    author: '',
    video_url: '',
    cover_url: '',
    description: '',
    tags: '',
    platform: '',
    status: '0'
  }
}

onMounted(() => {
  fetchBookVideos()
})
</script>

<style scoped>
  /* Claude Design System - Colors */
  :root {
    --claude-primary: #cc785c;
    --claude-primary-active: #a9583e;
    --claude-primary-disabled: #e6dfd8;
    --claude-ink: #141413;
    --claude-body: #3d3d3a;
    --claude-body-strong: #252523;
    --claude-muted: #6c6a64;
    --claude-muted-soft: #8e8b82;
    --claude-hairline: #e6dfd8;
    --claude-hairline-soft: #ebe6df;
    --claude-canvas: #faf9f5;
    --claude-surface-soft: #f5f0e8;
    --claude-surface-card: #efe9de;
    --claude-surface-cream-strong: #e8e0d2;
    --claude-success: #5db872;
    --claude-error: #c64545;
  }

  .book-video-container {
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
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    align-items: center;
    padding: 0 20px;
    height: 60px;
    background: #fff;
    border-radius: 12px;
    border-bottom: 1px solid #e8e4df;
  }

  .header .el-button--primary {
    background-color: #8b9a6d;
    border-color: #8b9a6d;
    color: #fff;
    border-radius: 10px;
    padding: 12px 20px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .header .el-button--primary:hover {
    background-color: #7a895c;
    border-color: #7a895c;
  }

  .search-input {
    width: 300px;
  }

  .header .search-input :deep(.el-input__wrapper) {
    background-color: #f5f3f0;
    border: 1px solid #e8e4df;
    border-radius: 10px;
    box-shadow: none !important;
    transition: all 0.3s;
  }

  .header .search-input :deep(.el-input__wrapper:hover) {
    border-color: #c4a882;
  }

  .header .search-input :deep(.el-input__wrapper.is-focus) {
    border-color: #c4a882;
    box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
  }

  .pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 16px;
    padding: 16px;
    background: #fff;
    border-radius: 12px;
    border-bottom: 1px solid #e8e4df;
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

  /* 状态标签主题色 */
  :deep(.el-tag--success) {
    background-color: #8b9a6d !important;
    border-color: #8b9a6d !important;
    color: #fff !important;
  }

  :deep(.el-tag--info) {
    background-color: #9a9590 !important;
    border-color: #9a9590 !important;
    color: #fff !important;
  }

  :deep(.el-tag--danger) {
    background-color: #e8686a !important;
    border-color: #e8686a !important;
    color: #fff !important;
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

  /* link 类型按钮 */
  :deep(.el-button--primary.is-link) {
    background-color: transparent;
    border-color: transparent;
    color: #8b9a6d;
  }

  :deep(.el-button--primary.is-link:hover) {
    color: #7a895c;
    background-color: rgba(139, 154, 109, 0.1);
  }

  /* 危险/删除按钮样式 */
  :deep(.el-button--danger) {
    background-color: #e8686a;
    border-color: #e8686a;
    border-radius: 10px;
  }

  :deep(.el-button--danger:hover) {
    background-color: #d8585a;
    border-color: #d8585a;
  }

  /* link 类型危险按钮 */
  :deep(.el-button--danger.is-link) {
    background-color: transparent;
    border-color: transparent;
    color: #e8686a;
  }

  :deep(.el-button--danger.is-link:hover) {
    color: #d8585a;
    background-color: rgba(232, 104, 106, 0.1);
  }

  /* 默认按钮样式 */
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

  /* 抽屉样式优化 */
  :deep(.el-drawer) {
    background-color: #faf8f5;
  }

  :deep(.el-drawer__header) {
    padding: 20px 24px;
    border-bottom: 1px solid #e8e4df;
  }

  :deep(.el-drawer__title) {
    color: #6b6560;
    font-weight: 500;
    font-size: 18px;
  }

  /* 表单输入框样式 */
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

  :deep(.el-select .el-input__wrapper) {
    background-color: #f5f3f0;
    border: 1px solid #e8e4df;
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
</style>

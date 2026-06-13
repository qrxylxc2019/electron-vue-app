<template>
  <div class="self-media-container">
    <div class="header">
      <div class="label">自媒体运营</div>
      <el-input
        v-model="searchText"
        placeholder="搜索内容"
        class="search-input"
        size="large"
        clearable
        @input="searchData"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" @click="showAddDrawer">
        <el-icon style="margin-right: 6px;"><Plus /></el-icon>新建
      </el-button>
    </div>

    <el-table
      :data="list"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
      <el-table-column prop="platform" label="平台" width="120" />
      <el-table-column prop="content" label="内容" min-width="250" show-overflow-tooltip>
        <template #default="scope">
          <span>{{ getPreview(scope.row.content) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)">
            {{ scope.row.status || '待发布' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="publishTime" label="发布时间" width="160" />
      <el-table-column label="操作" width="250">
        <template #default="scope">
          <el-button type="primary" @click="handleEdit(scope.row)">
            <el-icon style="margin-right: 4px;"><Edit /></el-icon>编辑
          </el-button>
          <el-button type="danger" @click="handleDelete(scope.row)">
            <el-icon style="margin-right: 4px;"><Delete /></el-icon>删除
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

    <!-- 新增/编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑' : '新建'"
      direction="rtl"
      size="60%"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="平台">
          <el-select v-model="form.platform" placeholder="请选择平台" style="width: 100%;">
            <el-option label="微信公众号" value="微信公众号" />
            <el-option label="小红书" value="小红书" />
            <el-option label="抖音" value="抖音" />
            <el-option label="B站" value="B站" />
            <el-option label="知乎" value="知乎" />
            <el-option label="微博" value="微博" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <div style="width: 100%;">
            <RichEditor
              v-model:contentHtml="form.content"
              height="300px"
              :fontSize="30"
              :showMenuBar="false"
              placeholder="开始编写内容..."
              ref="editorRef"
            />
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%;">
            <el-option label="待发布" value="待发布" />
            <el-option label="已发布" value="已发布" />
            <el-option label="草稿" value="草稿" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="发布时间">
          <el-date-picker
            v-model="form.publishTime"
            type="datetime"
            placeholder="选择发布时间"
            style="width: 100%;"
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

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import RichEditor from '@/components/editor.vue'

interface SelfMediaItem {
  id?: number
  title: string
  platform: string
  content: string
  status: string
  publishTime: string
}

// 数据定义
const list = ref<SelfMediaItem[]>([])
const searchText = ref('')
const editorRef = ref(null)
const loading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = 'calc(100vh - 230px)'

// 抽屉相关
const drawerVisible = ref(false)
const isEdit = ref(false)
const form = ref<SelfMediaItem>({
  id: undefined,
  title: '',
  platform: '',
  content: '',
  status: '待发布',
  publishTime: ''
})

let searchTimeout: number | null = null

// 获取状态标签类型
const getStatusType = (status: string) => {
  switch (status) {
    case '已发布': return 'success'
    case '草稿': return 'warning'
    case '已取消': return 'danger'
    default: return 'info'
  }
}

// 获取列表数据（先使用本地模拟数据，后续可替换为接口调用）
const fetchData = async () => {
  loading.value = true
  try {
    // 模拟数据，后续可替换为 window.electronAPI.getSelfMediaList(params)
    const mockData: SelfMediaItem[] = [
      { id: 1, title: '示例文章1', platform: '微信公众号', content: '这是一篇示例内容...', status: '已发布', publishTime: '2025-06-01 10:00' },
      { id: 2, title: '示例视频脚本', platform: '抖音', content: '短视频脚本内容...', status: '草稿', publishTime: '' },
    ]
    list.value = mockData
    total.value = mockData.length
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage({ message: '获取数据失败', type: 'warning' })
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索
const searchData = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchData()
  }, 300)
}

// 分页
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchData()
}
const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchData()
}

// 新建
const showAddDrawer = () => {
  isEdit.value = false
  form.value = { id: undefined, title: '', platform: '', content: '', status: '待发布', publishTime: '' }
  drawerVisible.value = true
}

// 编辑
const handleEdit = (row: SelfMediaItem) => {
  isEdit.value = true
  form.value = { ...row }
  drawerVisible.value = true
}

// 提交保存
const handleSubmit = async () => {
  if (!form.value.title) {
    ElMessage.warning('请输入标题')
    return
  }
  try {
    if (editorRef.value) {
      form.value.content = editorRef.value.getContent()
    }
    // 后续可替换为 window.electronAPI.addSelfMedia / updateSelfMedia
    ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
    drawerVisible.value = false
    fetchData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

// 删除
const handleDelete = async (row: SelfMediaItem) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    // 后续可替换为 window.electronAPI.deleteSelfMedia(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  form.value = { id: undefined, title: '', platform: '', content: '', status: '待发布', publishTime: '' }
}

// 内容预览
const getPreview = (content: string) => {
  if (!content) return ''
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  const text = tempDiv.textContent || tempDiv.innerText || ''
  return text.length > 50 ? text.substring(0, 50) + '...' : text
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.self-media-container {
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
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 15px;
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #e8e4df;
  border-radius: 12px;
  margin-bottom: 16px;
}

.label {
  font-size: 16px;
  color: #6b6560;
  border-left: 5px solid #8b9a6d;
  padding-left: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.search-input {
  width: 300px;
}

.search-input :deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
  padding: 0 0 0 8px;
  transition: all 0.3s;
}

.search-input :deep(.el-input__wrapper:hover) {
  border-color: #c4a882;
}

.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

.search-input :deep(.el-input__inner) {
  background-color: transparent;
  border: none;
  height: 40px;
  padding: 0 20px;
  transition: all 0.3s;
  outline: none !important;
}

/* 统一按钮样式 - 深绿色主题（排除 text 和 link 按钮） */
:deep(.el-button--primary:not(.el-button--text):not(.is-link)) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  border-radius: 10px;
}

:deep(.el-button--primary:not(.el-button--text):not(.is-link):hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

:deep(.el-button--primary:not(.el-button--text):not(.is-link):active) {
  background-color: #6b7a4d !important;
  border-color: #6b7a4d !important;
}

/* 默认按钮也使用深绿色（排除 text 和 link 按钮） */
:deep(.el-button--default:not(.el-button--text):not(.is-link)) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
  border-radius: 10px;
}

:deep(.el-button--default:not(.el-button--text):not(.is-link):hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

/* 危险按钮保持红色（排除 text 和 link 按钮） */
:deep(.el-button--danger:not(.el-button--text):not(.is-link)) {
  border-radius: 10px;
}

/* 链接按钮 */
:deep(.el-button.is-link) {
  color: #8b9a6d !important;
}

:deep(.el-button.is-link:hover) {
  color: #7a895c !important;
}

/* 文字按钮 */
:deep(.el-button--text) {
  color: #8b9a6d !important;
}

:deep(.el-button--text:hover) {
  color: #7a895c !important;
}

:deep(.el-button--text.el-button--danger) {
  color: #F56C6C !important;
}

:deep(.el-button--text.el-button--danger:hover) {
  color: #f78989 !important;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}

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

/* 自定义表格样式 */
:deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
  font-size: 18px;
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
}

:deep(.el-table__row) {
  height: 50px !important;
  line-height: 50px !important;
  cursor: pointer;
}

:deep(.el-table__cell) {
  padding: 8px 16px !important;
}

:deep(.el-table__header-row) {
  height: 45px !important;
}

:deep(.el-tag) {
  font-size: 14px;
  border-radius: 8px;
}

/* 状态标签主题色 */
:deep(.el-tag--success) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
}

:deep(.el-tag--warning) {
  background-color: #c4a882 !important;
  border-color: #c4a882 !important;
  color: #fff !important;
}

:deep(.el-tag--danger) {
  background-color: #e8686a !important;
  border-color: #e8686a !important;
  color: #fff !important;
}

:deep(.el-tag--info) {
  background-color: #9a9590 !important;
  border-color: #9a9590 !important;
  color: #fff !important;
}

/* 抽屉样式 */
:deep(.el-drawer__header) {
  border-bottom: 1px solid #e8e4df;
  padding-bottom: 16px;
  color: #6b6560;
}

:deep(.el-drawer__body) {
  background-color: #faf8f5;
}

:deep(.el-form-item__label) {
  color: #6b6560;
  font-weight: 500;
}

/* 表单输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

/* 下拉选择框样式 */
:deep(.el-select .el-select__wrapper) {
  border-radius: 10px;
}

:deep(.el-select .el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-select .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

/* 日期选择器样式 */
:deep(.el-date-editor) {
  border-radius: 10px;
}

:deep(.el-date-editor:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

/* 开关样式 */
:deep(.el-switch) {
  --el-switch-on-color: #8b9a6d;
  --el-switch-off-color: #9a9590;
}
</style>

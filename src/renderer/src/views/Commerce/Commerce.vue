<template>
  <div class="commerce-container">
    <div class="header">
      <div class="label">副业项目总数：{{ total }}</div>
      <el-input
        v-model="searchText"
        placeholder="搜索副业项目"
        class="search-input"
        size="large"
        clearable
        @input="searchCommerce"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" @click="showAddDrawer">
        <el-icon style="margin-right: 6px;"><Plus /></el-icon>新建项目
      </el-button>
    </div>

    <el-table
      :data="commerceList"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="name" label="项目名称" min-width="150" show-overflow-tooltip>
        <template #default="scope">
          <span :class="{ 'text-line-through': scope.row.status === '已放弃' }">{{ scope.row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="内容" min-width="250" show-overflow-tooltip>
        <template #default="scope">
          <span :class="{ 'text-line-through': scope.row.status === '已放弃' }">{{ getPreview(scope.row.content) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="url" label="链接" min-width="200" show-overflow-tooltip />
      <el-table-column prop="desc" label="描述" min-width="150" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="150">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)">
            {{ scope.row.status || '未开始' }}
          </el-tag>
        </template>
      </el-table-column>
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
      :title="isEdit ? '编辑项目' : '新建项目'"
      direction="rtl"
      size="60%"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="项目名称">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="内容">
          <div style="width: 100%;">
            <RichEditor
              v-model:contentHtml="form.content"
              height="300px"
              :fontSize="30"
              :showMenuBar="false"
              placeholder="开始编写项目内容..."
              ref="editorRef"
            />
          </div>
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="form.url" placeholder="请输入项目链接" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.desc" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%;">
            <el-option label="未开始" value="未开始" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已放弃" value="已放弃" />
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
import RichEditor from '@/components/editor.vue'

interface Commerce {
  id?: number
  name: string
  content: string
  url: string
  desc: string
  status: string
}

// 数据定义
const commerceList = ref<Commerce[]>([])
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
const form = ref<Commerce>({
  id: undefined,
  name: '',
  content: '',
  url: '',
  desc: '',
  status: '未开始'
})

let searchTimeout: number | null = null

// 获取状态标签类型
const getStatusType = (status: string) => {
  switch (status) {
    case '已完成': return 'success'
    case '进行中': return 'warning'
    case '已放弃': return 'danger'
    default: return 'info'
  }
}

// 获取列表数据
const fetchCommerce = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: { column: "id", type: "desc" },
    }
    if (searchText.value) {
      params.conditions = { name: searchText.value, content: searchText.value }
    }
    const res = await window.electronAPI.getCommerceList(params)
    if (res.success && res.list) {
      commerceList.value = res.list
      total.value = res.total || 0
    } else {
      commerceList.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取副业项目数据失败:', error)
    ElMessage({ message: '获取副业项目数据失败', type: 'warning' })
    commerceList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索
const searchCommerce = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchCommerce()
  }, 300)
}

// 分页
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchCommerce()
}
const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchCommerce()
}

// 新建
const showAddDrawer = () => {
  isEdit.value = false
  form.value = { id: undefined, name: '', content: '', url: '', desc: '', status: '未开始' }
  drawerVisible.value = true
}

// 编辑
const handleEdit = async (row: Commerce) => {
  isEdit.value = true
  try {
    const res = await window.electronAPI.getCommerceDetail(row.id!)
    if (res.success && res.data) {
      form.value = {
        id: res.data.id,
        name: res.data.name || '',
        content: res.data.content || '',
        url: res.data.url || '',
        desc: res.data.desc || '',
        status: res.data.status || '未开始'
      }
    } else {
      form.value = { ...row }
    }
  } catch {
    form.value = { ...row }
  }
  drawerVisible.value = true
}

// 提交保存
const handleSubmit = async () => {
  if (!form.value.name) {
    ElMessage.warning('请输入项目名称')
    return
  }
  try {
    if (editorRef.value) {
      form.value.content = editorRef.value.getContent()
    }
    let res
    if (isEdit.value && form.value.id) {
      res = await window.electronAPI.updateCommerce(form.value)
    } else {
      const data = { ...form.value }
      delete data.id
      res = await window.electronAPI.addCommerce(data)
    }
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      drawerVisible.value = false
      fetchCommerce()
    } else {
      ElMessage.error(res.error || '保存失败')
    }
  } catch (error) {
    console.error('保存副业项目失败:', error)
    ElMessage.error('保存失败')
  }
}

// 删除
const handleDelete = async (row: Commerce) => {
  try {
    await ElMessageBox.confirm('确定要删除这个项目吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await window.electronAPI.deleteCommerce(row.id!)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchCommerce()
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除副业项目失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  form.value = { id: undefined, name: '', content: '', url: '', desc: '', status: '未开始' }
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
  fetchCommerce()
})
</script>

<style scoped>
.commerce-container {
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

.text-line-through {
  text-decoration: line-through;
  color: #9a9590;
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

/* 开关样式 */
:deep(.el-switch) {
  --el-switch-on-color: #8b9a6d;
  --el-switch-off-color: #9a9590;
}
</style>

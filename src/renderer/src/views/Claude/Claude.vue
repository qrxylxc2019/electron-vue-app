<template>
  <div class="claude-container">
    <div class="header">
      <div class="header-actions">
        <el-button type="primary" size="large" @click="showAddModal = true">
          <el-icon><Plus /></el-icon>
          添加 Claude
        </el-button>
        <el-button type="success" size="large" @click="handleQuery">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>
    </div>

    <!-- Claude 列表 -->
    <el-table
      :data="claudeList"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="url" label="URL" min-width="200" show-overflow-tooltip />
      <el-table-column prop="token" label="Token" min-width="300" show-overflow-tooltip />
      <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button type="success" link @click="handleSwitch(row)">
            <el-icon><Switch /></el-icon>切换
          </el-button>
          <el-button type="primary" link @click="copyToken(row.token)">
            <el-icon><CopyDocument /></el-icon>复制
          </el-button>
          <el-button type="warning" link @click="openEditModal(row)">
            <el-icon><Edit /></el-icon>编辑
          </el-button>
          <el-button type="danger" link @click="handleDelete(row.id)">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container" v-if="total > 0">
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

    <!-- 添加 Claude 弹窗 -->
    <el-dialog
      v-model="showAddModal"
      title="添加 Claude"
      width="600px"
    >
      <el-form :model="form" label-width="100px" size="large">
        <el-form-item label="URL" required>
          <el-input v-model="form.url" placeholder="请输入 URL" />
        </el-form-item>
        <el-form-item label="Token" required>
          <el-input v-model="form.token" type="textarea" :rows="4" placeholder="请输入 Token" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="showAddModal = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleAdd" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑 Claude 弹窗 -->
    <el-dialog
      v-model="showEditModal"
      title="编辑 Claude"
      width="600px"
    >
      <el-form :model="editForm" label-width="100px" size="large">
        <el-form-item label="URL" required>
          <el-input v-model="editForm.url" placeholder="请输入 URL" />
        </el-form-item>
        <el-form-item label="Token" required>
          <el-input v-model="editForm.token" type="textarea" :rows="4" placeholder="请输入 Token" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="showEditModal = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleEdit" :loading="editing">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Switch, CopyDocument, Edit, Delete } from '@element-plus/icons-vue'

const api = (window as any).electronAPI

// 数据
const claudeList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const showAddModal = ref(false)
const showEditModal = ref(false)
const loading = ref(false)
const submitting = ref(false)
const editing = ref(false)

const tableHeight = 'calc(100vh - 230px)'

// 表单数据
const form = ref({
  url: '',
  token: '',
  remark: ''
})

const editForm = ref({
  id: '',
  url: '',
  token: '',
  remark: ''
})

// 查询列表
const handleQuery = async () => {
  loading.value = true
  try {
    const res = await api.getClaudeList({
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: {}
    })

    if (res && res.list) {
      claudeList.value = res.list
      total.value = res.pagination.total
    }
  } catch (error) {
    ElMessage.error('查询失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 添加
const handleAdd = async () => {
  if (!form.value.url || !form.value.token) {
    ElMessage.warning('请填写所有必填项')
    return
  }

  submitting.value = true
  try {
    const res = await api.addClaude(form.value)

    if (res) {
      ElMessage.success('添加成功')
      showAddModal.value = false
      resetForm()
      handleQuery()
    }
  } catch (error) {
    ElMessage.error('添加失败')
    console.error(error)
  } finally {
    submitting.value = false
  }
}

// 打开编辑弹窗
const openEditModal = (row) => {
  editForm.value = {
    id: row.id,
    url: row.url,
    token: row.token,
    remark: row.remark || ''
  }
  showEditModal.value = true
}

// 编辑
const handleEdit = async () => {
  if (!editForm.value.url || !editForm.value.token) {
    ElMessage.warning('请填写所有必填项')
    return
  }

  editing.value = true
  try {
    const res = await api.updateClaude(editForm.value.id, editForm.value)

    if (res) {
      ElMessage.success('编辑成功')
      showEditModal.value = false
      handleQuery()
    }
  } catch (error) {
    ElMessage.error('编辑失败')
    console.error(error)
  } finally {
    editing.value = false
  }
}

// 删除
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await api.deleteClaude(id)

    if (res) {
      ElMessage.success('删除成功')
      handleQuery()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }
}

// 切换配置
const handleSwitch = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要切换到此配置吗？\nURL: ${row.url}\nToken: ${row.token.substring(0, 20)}...`,
      '切换确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 切换配置：将当前选中的 claude 配置保存到本地存储
    try {
      const config = { url: row.url, token: row.token }
      await api.switchClaude(config)
      ElMessage.success('切换成功！配置已更新')
    } catch (err: any) {
      ElMessage.error(err.message || '切换失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('切换失败')
      console.error(error)
    }
  }
}

// 复制 Token
const copyToken = async (token) => {
  try {
    await navigator.clipboard.writeText(token)
    ElMessage.success('Token 已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
    console.error(error)
  }
}

// 重置表单
const resetForm = () => {
  form.value = {
    url: '',
    token: '',
    remark: ''
  }
}

// 分页
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  handleQuery()
}

const handlePageChange = (page) => {
  currentPage.value = page
  handleQuery()
}

// 初始化
onMounted(() => {
  handleQuery()
})
</script>

<style scoped>
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

  .claude-container {
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

  .header .el-button--success {
    background-color: #5db872;
    border-color: #5db872;
    color: #fff;
    border-radius: 10px;
    padding: 12px 20px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .header .el-button--success:hover {
    background-color: #4da862;
    border-color: #4da862;
  }

  .header-actions {
    display: flex;
    gap: 10px;
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

  :deep(.el-button--primary) {
    background-color: #8b9a6d;
    border-color: #8b9a6d;
    border-radius: 10px;
  }

  :deep(.el-button--primary:hover) {
    background-color: #7a895c;
    border-color: #7a895c;
  }

  :deep(.el-button--primary.is-link) {
    background-color: transparent;
    border-color: transparent;
    color: #8b9a6d;
  }

  :deep(.el-button--primary.is-link:hover) {
    color: #7a895c;
    background-color: rgba(139, 154, 109, 0.1);
  }

  :deep(.el-button--danger) {
    background-color: #e8686a;
    border-color: #e8686a;
    border-radius: 10px;
  }

  :deep(.el-button--danger:hover) {
    background-color: #d8585a;
    border-color: #d8585a;
  }

  :deep(.el-button--danger.is-link) {
    background-color: transparent;
    border-color: transparent;
    color: #e8686a;
  }

  :deep(.el-button--danger.is-link:hover) {
    color: #d8585a;
    background-color: rgba(232, 104, 106, 0.1);
  }

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

  :deep(.el-button--warning.is-link) {
    background-color: transparent;
    border-color: transparent;
    color: #c4a882;
  }

  :deep(.el-button--warning.is-link:hover) {
    color: #b59872;
    background-color: rgba(196, 168, 130, 0.1);
  }

  :deep(.el-button--success) {
    background-color: #5db872;
    border-color: #5db872;
    border-radius: 10px;
    color: #fff;
  }

  :deep(.el-button--success:hover) {
    background-color: #4da862;
    border-color: #4da862;
    color: #fff;
  }

  :deep(.el-button--success.is-link) {
    background-color: transparent;
    border-color: transparent;
    color: #5db872;
  }

  :deep(.el-button--success.is-link:hover) {
    color: #4da862;
    background-color: rgba(93, 184, 114, 0.1);
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

  :deep(.el-dialog) {
    border-radius: 12px;
  }

  :deep(.el-dialog__header) {
    padding: 20px 24px;
    border-bottom: 1px solid #e8e4df;
  }

  :deep(.el-dialog__title) {
    color: #6b6560;
    font-weight: 500;
    font-size: 18px;
  }

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

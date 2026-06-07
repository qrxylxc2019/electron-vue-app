<template>
  <div class="apikey-container">
    <div class="header">
      <div class="header-actions">
        <el-button type="primary" @click="showAddModal = true">
          <el-icon><Plus /></el-icon>
          添加 API Key
        </el-button>
        <el-button type="success" @click="handleQuery">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>
    </div>

    <!-- API Key 列表 -->
    <el-table
      :data="apiKeys"
      v-loading="loading"
      stripe
      style="width: 100%;height:619px"
    >
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column prop="api" label="API" min-width="150" show-overflow-tooltip />
      <el-table-column prop="project" label="项目" min-width="150" show-overflow-tooltip />
      <el-table-column prop="key" label="Key" min-width="300" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="warning"  @click="openEditModal(row)">
            编辑
          </el-button>
          <el-button type="danger"  @click="handleDelete(row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination" v-if="total > 0">
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

    <!-- 添加 API Key 弹窗 -->
    <el-dialog
      v-model="showAddModal"
      title="添加 API Key"
      width="600px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="API" required>
          <el-input v-model="form.api" placeholder="请输入 API 名称" />
        </el-form-item>
        <el-form-item label="项目" required>
          <el-input v-model="form.project" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="Key" required>
          <el-input v-model="form.key" type="textarea" :rows="3" placeholder="请输入 API Key" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddModal = false">取消</el-button>
        <el-button type="primary" @click="handleAdd" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑 API Key 弹窗 -->
    <el-dialog
      v-model="showEditModal"
      title="编辑 API Key"
      width="600px"
    >
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="API" required>
          <el-input v-model="editForm.api" placeholder="请输入 API 名称" />
        </el-form-item>
        <el-form-item label="项目" required>
          <el-input v-model="editForm.project" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="Key" required>
          <el-input v-model="editForm.key" type="textarea" :rows="3" placeholder="请输入 API Key" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handleEdit" :loading="editing">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

// 数据
const apiKeys = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const showAddModal = ref(false)
const showEditModal = ref(false)
const loading = ref(false)
const submitting = ref(false)
const editing = ref(false)

// 表单数据
const form = ref({
  api: '',
  project: '',
  key: ''
})

const editForm = ref({
  id: '',
  api: '',
  project: '',
  key: ''
})

// 查询列表
const handleQuery = async () => {
  loading.value = true
  try {
    const res = await request.post('http://localhost:8000/api/apikey/get', {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: {}
    })

    if (res.code === 200) {
      apiKeys.value = res.result.list
      total.value = res.result.pagination.total
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
  if (!form.value.api || !form.value.project || !form.value.key) {
    ElMessage.warning('请填写所有必填项')
    return
  }

  submitting.value = true
  try {
    const res = await request.post('http://localhost:8000/api/apikey/add', form.value)

    if (res.code === 200) {
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
    api: row.api,
    project: row.project,
    key: row.key
  }
  showEditModal.value = true
}

// 编辑
const handleEdit = async () => {
  if (!editForm.value.api || !editForm.value.project || !editForm.value.key) {
    ElMessage.warning('请填写所有必填项')
    return
  }

  editing.value = true
  try {
    const res = await request.post('http://localhost:8000/api/apikey/update', editForm.value)

    if (res.code === 200) {
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
    await ElMessageBox.confirm('确定要删除这个 API Key 吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await request.post('http://localhost:8000/api/apikey/delete', { id })

    if (res.code === 200) {
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

// 重置表单
const resetForm = () => {
  form.value = {
    api: '',
    project: '',
    key: ''
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
.apikey-container {
  padding: 50px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  background-image:
    linear-gradient(rgba(220, 220, 220, 0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(220, 220, 220, 0.5) 1px, transparent 1px);
  background-size: 80px 80px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

/* 表格字体大小 */
:deep(.el-table) {
  font-size: 18px;
}
:deep(.el-table .el-table__header th) {
  font-size: 18px;
  font-weight: 600;
}
:deep(.el-table .cell) {
  font-size: 18px;
}
</style>

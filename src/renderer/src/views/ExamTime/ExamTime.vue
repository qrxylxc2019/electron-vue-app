<template>
  <div class="examtime-container">
    <div class="header">
      <el-input
        v-model="searchText"
        placeholder="搜索考试"
        class="search-input"
        size="large"
        clearable
        @input="searchExams"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" @click="showAddDrawer">
        <el-icon><Plus /></el-icon>新建考试
      </el-button>
    </div>

    <el-table
      :data="exams"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
      :default-sort="{ prop: 'exam_time', order: 'ascending' }"
    >
      <el-table-column label="序号" width="100">
        <template #default="scope">
          {{ (currentPage - 1) * pageSize + scope.$index + 1 }}
        </template>
      </el-table-column>
      <el-table-column prop="subject" label="科目" min-width="150" show-overflow-tooltip />
      <el-table-column label="考试时间" width="180" sortable show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.exam_time ? scope.row.exam_time.split(' ')[0] : '' }}
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="300" show-overflow-tooltip />
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

    <!-- 新增/编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑考试' : '新建考试'"
      direction="rtl"
      size="50%"
      @close="resetForm"
    >
      <el-form :model="form" label-width="100px" size="large">
        <el-form-item label="科目">
          <el-input v-model="form.subject" placeholder="请输入科目" />
        </el-form-item>
        <el-form-item label="考试时间">
          <el-date-picker
            v-model="form.exam_time"
            type="date"
            placeholder="选择考试时间"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入备注信息"
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
import request from '@/utils/request'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'

interface ExamTime {
  id?: number
  subject: string
  exam_time: string
  remark: string
}

// 数据定义
const exams = ref<ExamTime[]>([])
const searchText = ref('')
const loading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = '60vh'

// 抽屉相关
const drawerVisible = ref(false)
const isEdit = ref(false)
const form = ref<ExamTime>({
  id: undefined,
  subject: '',
  exam_time: '',
  remark: ''
})

let searchTimeout: number | null = null

// 获取考试数据（按时间升序排列）
const fetchExams = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: { column: 'exam_time', type: 'asc' },
    }
    if (searchText.value) {
      params.conditions = { subject: searchText.value, remark: searchText.value }
      params.fuzzy_fields = ['subject', 'remark']
    }
    const res = await request.post('http://localhost:8000/api/examtime/get', params)
    if (res.code === 200 && res.result?.list) {
      exams.value = res.result.list
      total.value = res.result.pagination?.total || 0
    } else {
      exams.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取考试数据失败:', error)
    ElMessage({ message: '获取考试数据失败', type: 'warning' })
    exams.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索考试
const searchExams = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchExams()
  }, 300)
}

// 分页
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchExams()
}
const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchExams()
}

// 新建考试
const showAddDrawer = () => {
  isEdit.value = false
  form.value = { id: undefined, name: '', subject: '', exam_time: '', location: '', remark: '' }
  drawerVisible.value = true
}

// 编辑考试
const handleEdit = (row: ExamTime) => {
  isEdit.value = true
  form.value = { ...row }
  drawerVisible.value = true
}

// 提交保存
const handleSubmit = async () => {
  if (!form.value.subject) {
    ElMessage.warning('请输入科目')
    return
  }
  if (!form.value.exam_time) {
    ElMessage.warning('请选择考试时间')
    return
  }
  try {
    let res
    if (isEdit.value && form.value.id) {
      res = await request.post('http://localhost:8000/api/examtime/update', form.value)
    } else {
      const addData = { ...form.value }
      delete addData.id
      res = await request.post('http://localhost:8000/api/examtime/add', addData)
    }
    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      drawerVisible.value = false
      fetchExams()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存考试失败:', error)
    ElMessage.error('保存失败')
  }
}

// 删除考试
const handleDelete = async (row: ExamTime) => {
  try {
    await ElMessageBox.confirm('确定要删除这个考试吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await request.post('http://localhost:8000/api/examtime/delete', { id: row.id })
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchExams()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除考试失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  form.value = { id: undefined, name: '', subject: '', exam_time: '', location: '', remark: '' }
}

onMounted(() => {
  fetchExams()
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

  .examtime-container {
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

  .header :deep(.el-input__wrapper) {
    background-color: #f5f3f0;
    border: 1px solid #e8e4df;
    border-radius: 10px;
    box-shadow: none !important;
    transition: all 0.3s;
  }

  .header :deep(.el-input__wrapper:hover) {
    border-color: #c4a882;
  }

  .header :deep(.el-input__wrapper.is-focus) {
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
    margin-bottom: 20px;
    padding: 20px;
    border-bottom: 1px solid #e8e4df;
  }

  :deep(.el-drawer__title) {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
  }

  :deep(.el-drawer__body) {
    padding: 20px;
  }

  :deep(.el-form-item__label) {
    font-size: 16px;
    color: #3d3d3a;
  }

  :deep(.el-input__inner) {
    font-size: 16px;
  }

  :deep(.el-textarea__inner) {
    font-size: 16px;
    border-radius: 10px;
  }
</style>

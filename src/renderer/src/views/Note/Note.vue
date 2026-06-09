<template>
  <div class="note-container">
    <div class="header">
      <el-input
        v-model="searchText"
        placeholder="搜索笔记"
        class="search-input"
        size="large"
        clearable
        :disabled="!isPasswordVerified"
        @input="searchNotes"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" :disabled="!isPasswordVerified" @click="showAddDrawer">
        <el-icon><Plus /></el-icon>新建笔记
      </el-button>
      <el-button 
        @click="togglePrintMode" 
        type="info" 
        size="large" 
        :disabled="!isPasswordVerified || notes.length === 0"
      >
        {{ isPrintMode ? '取消打印' : '打印笔记' }}
      </el-button>
      <el-button 
        v-if="isPrintMode" 
        @click="confirmPrint" 
        type="warning" 
        size="large" 
        :disabled="selectedNotesForPrint.length === 0"
      >
        确认打印 ({{ selectedNotesForPrint.length }})
      </el-button>
    </div>

    <el-table
      :data="notes"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
      @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="isPrintMode" type="selection" width="100" />
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="内容预览" min-width="300" show-overflow-tooltip>
        <template #default="scope">
          {{ getPreview(scope.row.content) }}
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="120">
        <template #default="scope">
          {{ scope.row.type || '学习笔记' }}
        </template>
      </el-table-column>
      <el-table-column prop="create_time" label="新建时间" width="180" show-overflow-tooltip />
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
        :disabled="!isPasswordVerified"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <div v-if="passwordDialogVisible" class="password-overlay">
      <div class="password-box">
        <el-input
          v-model="passwordInput"
          placeholder="请填写"
          size="large"
          clearable
          show-password
          @input="checkPassword"
        >
          <template #prefix>
            <el-icon><Lock /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 新增/编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑笔记' : '新建笔记'"
      direction="rtl"
      size="60%"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入笔记标题" />
        </el-form-item>
        <el-form-item label="类型">
          <el-input v-model="form.type" placeholder="请输入笔记类型" />
        </el-form-item>
        <el-form-item label="内容">
          <div style="width: 100%;">
            <RichEditor 
              v-model:contentHtml="form.note" 
              height="500px" 
              :fontSize="30" 
              :showMenuBar="false"
              placeholder="开始编写笔记内容..."
              ref="editorRef"
            />
          </div>
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
import { Search, Plus, Edit, Delete, Lock } from '@element-plus/icons-vue'
import RichEditor from '@/components/editor.vue'

const api = (window as any).electronAPI

interface Note {
  id?: number
  title: string
  content: string
  category?: string
  tags?: string
  create_time?: string
  update_time?: string
  type?: string
  note?: string
  selectedForPrint?: boolean
}

// 数据定义
const notes = ref<Note[]>([])
const searchText = ref('')
const passwordDialogVisible = ref(true)
const passwordInput = ref('')
const editorRef = ref(null)
const loading = ref(false)
const isPrintMode = ref(false)
const selectedNotesForPrint = ref<Note[]>([])
const isPasswordVerified = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = 'calc(100vh - 230px)'

// 抽屉相关
const drawerVisible = ref(false)
const isEdit = ref(false)
const form = ref<Note>({
  id: undefined,
  title: '',
  content: '',
  note: '',
  type: '学习笔记'
})

let searchTimeout: number | null = null

// 实时校验密码
const checkPassword = () => {
  if (passwordInput.value === '619619') {
    ElMessage({ message: '验证成功', type: 'success' })
    isPasswordVerified.value = true
    passwordDialogVisible.value = false
    fetchNotes()
  }
}

// 验证密码（回车时触发）
const verifyPassword = () => {
  if (passwordInput.value !== '619619') {
    ElMessage({ message: '密码错误', type: 'error' })
    passwordInput.value = ''
  }
}

// 获取笔记数据
const fetchNotes = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: { column: "id", type: "desc" },
    }
    if (searchText.value) {
      params.conditions = { title: searchText.value, content: searchText.value }
    }
    const res = await api.getNoteList(params)
    if (res && res.list) {
      notes.value = res.list
      total.value = res.pagination?.total || 0
    } else {
      notes.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取笔记数据失败:', error)
    ElMessage({ message: '获取笔记数据失败', type: 'warning' })
    notes.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索笔记
const searchNotes = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchNotes()
  }, 300)
}

// 分页
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchNotes()
}
const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchNotes()
}

// 新建笔记
const showAddDrawer = () => {
  isEdit.value = false
  form.value = { id: undefined, title: '', content: '', note: '<p></p>', type: '学习笔记' }
  drawerVisible.value = true
}

// 编辑笔记
const handleEdit = async (row: Note) => {
  isEdit.value = true
  try {
    const res = await api.getNoteById(row.id as number)
    if (res) {
      const data = res
      form.value = {
        id: data.id,
        title: data.title || '',
        content: data.content || '',
        note: data.note || data.content || '',
        type: data.type || '学习笔记'
      }
    } else {
      form.value = { ...row, note: row.note || row.content || '' }
    }
  } catch {
    form.value = { ...row, note: row.note || row.content || '' }
  }
  drawerVisible.value = true
}

// 提交保存
const handleSubmit = async () => {
  if (!form.value.title) {
    ElMessage.warning('请输入笔记标题')
    return
  }
  try {
    if (editorRef.value) {
      form.value.note = editorRef.value.getContent()
    }
    const noteData = {
      title: form.value.title,
      content: form.value.note || form.value.content || '',
      type: form.value.type || '学习笔记',
    }
    let res
    if (isEdit.value && form.value.id) {
      res = await api.updateNote(form.value.id as number, noteData)
    } else {
      res = await api.addNote(noteData)
    }
    if (res) {
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      drawerVisible.value = false
      fetchNotes()
    } else {
      ElMessage.error('保存失败')
    }
  } catch (error) {
    console.error('保存笔记失败:', error)
    ElMessage.error('保存失败')
  }
}

// 删除笔记
const handleDelete = async (row: Note) => {
  try {
    await ElMessageBox.confirm('确定要删除这个笔记吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await api.deleteNote(row.id as number)
    if (res) {
      ElMessage.success('删除成功')
      fetchNotes()
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除笔记失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  form.value = { id: undefined, title: '', content: '', note: '', type: '学习笔记' }
}

// 内容预览
const getPreview = (content: string) => {
  if (!content) return ''
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  const text = tempDiv.textContent || tempDiv.innerText || ''
  return text.length > 80 ? text.substring(0, 80) + '...' : text
}

// 打印相关
const togglePrintMode = () => {
  isPrintMode.value = !isPrintMode.value
  if (!isPrintMode.value) {
    selectedNotesForPrint.value = []
  }
}

const handleSelectionChange = (selection: Note[]) => {
  selectedNotesForPrint.value = selection
}

const confirmPrint = async () => {
  if (selectedNotesForPrint.value.length === 0) {
    ElMessage.warning('请至少选择一个笔记')
    return
  }
  try {
    let printContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>打印笔记</title>
      <style>
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; line-height: 1.8; }
        .note-section { margin-bottom: 30px; page-break-after: always; }
        .note-title { font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #303133; }
        .note-separator { border: none; border-top: 2px dashed #dcdfe6; margin: 30px 0; }
        .note-content { font-size: 16px; color: #606266; }
        .note-content p { margin: 10px 0; }
        @media print { body { padding: 10px; } .note-section:last-child { page-break-after: auto; } }
      </style></head><body>`

    for (let i = 0; i < selectedNotesForPrint.value.length; i++) {
      const note = selectedNotesForPrint.value[i]
      let noteContent = note.note || note.content || ''
      if (!noteContent && note.id) {
        try {
          const res = await api.getNoteById(note.id as number)
          if (res) {
            noteContent = res.note || res.content || ''
          }
        } catch {}
      }
      printContent += `<div class="note-section"><div class="note-title">${note.title || '无标题笔记'}</div><div class="note-content">${noteContent}</div></div>`
      if (i < selectedNotesForPrint.value.length - 1) {
        printContent += '<hr class="note-separator">'
      }
    }
    printContent += '</body></html>'

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.onload = () => { setTimeout(() => { printWindow.print() }, 250) }
      ElMessage.success(`正在打印 ${selectedNotesForPrint.value.length} 个笔记`)
      setTimeout(() => { togglePrintMode() }, 1000)
    } else {
      ElMessage.error('无法打开打印窗口，请检查浏览器弹窗设置')
    }
  } catch (error) {
    console.error('打印失败:', error)
    ElMessage.error('打印失败')
  }
}
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

  .note-container {
    padding: 20px;
    height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: #faf8f5;
    color: #1a1a1a;
    position: relative;
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

  .header .el-button--info {
    background-color: #9a9590;
    border-color: #9a9590;
    color: #fff;
    border-radius: 10px;
    padding: 12px 20px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .header .el-button--info:hover {
    background-color: #8a8580;
    border-color: #8a8580;
  }

  .header .el-button--warning {
    background-color: #c4a882;
    border-color: #c4a882;
    color: #fff;
    border-radius: 10px;
    padding: 12px 20px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .header .el-button--warning:hover {
    background-color: #b59872;
    border-color: #b59872;
  }

  .search-input {
    width: 300px;
  }

  .password-input {
    width: 200px;
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

  /* 信息按钮样式 */
  :deep(.el-button--info) {
    background-color: #9a9590;
    border-color: #9a9590;
    border-radius: 10px;
  }

  :deep(.el-button--info:hover) {
    background-color: #8a8580;
    border-color: #8a8580;
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

  /* 密码验证遮罩 */
  .password-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(250, 248, 245, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .password-box {
    width: 360px;
    padding: 32px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    border: 1px solid #e8e4df;
  }

  .password-title {
    font-size: 20px;
    font-weight: 600;
    color: #3d3d3a;
    text-align: center;
    margin-bottom: 24px;
  }
</style>

<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2024-12-28 00:00:00
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-12-28 00:00:00
 * @FilePath: \eletron\frontend\src\views\Note\Note.vue
 * @Description: 提示词管理组件
-->
<template>
  <div class="prompt-container">
    <div class="header">
      <el-input
        v-model="searchText"
        placeholder="搜索提示词"
        class="search-input"
        size="large"
        clearable
        @input="searchNotes"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" @click="createNewNote">
        <el-icon><Plus /></el-icon>
        新建提示词
      </el-button>
    </div>

    <!-- 提示词列表 -->
    <el-table
      :data="notes"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="title" label="标题" min-width="300" show-overflow-tooltip />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="row.type === 1 ? 'success' : 'warning'">
            {{ row.type === 1 ? '写作' : '题目' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="内容预览" min-width="400" show-overflow-tooltip>
        <template #default="{ row }">
          {{ getPreview(row.content) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="viewNote(row)">
            <el-icon><Edit /></el-icon>查看
          </el-button>
          <el-button type="danger" link @click="deleteNote(row)">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        background
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 编辑/查看弹窗 -->
    <el-dialog
      v-model="showEditModal"
      :title="dialogTitle"
      width="90%"
      :close-on-click-modal="false"
    >
      <div class="dialog-content">
        <div class="title-row">
          <el-input
            v-model="currentNote.title"
            placeholder="提示词标题"
            class="title-input"
            size="large"
          />

          <el-select v-model="currentNote.type" class="type-select" placeholder="请选择类型">
            <el-option :value="1" label="写作" />
            <el-option :value="2" label="题目" />
          </el-select>
        </div>

        <RichEditor
          v-model:contentHtml="currentNote.note"
          height="500px"
          :fontSize="30"
          :showMenuBar="false"
          class="note-rich-editor"
          placeholder="开始编写提示词内容..."
          ref="editorRef"
        />
      </div>
      <template #footer>
        <el-button size="large" @click="showEditModal = false">取消</el-button>
        <el-button size="large" type="primary" @click="saveNote">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import RichEditor from '@/components/editor.vue'

declare const window: any; // 声明 window 类型，用于访问 electronAPI

interface Note {
  id?: number
  title: string
  content: string
  category?: string
  tags?: string
  create_time?: string
  update_time?: string
  image?: string
  type?: number
  isTemp?: boolean
  note?: string
}

// 数据定义
const notes = ref<Note[]>([])
const currentNote = ref<Note>({
  id: undefined,
  title: '',
  content: '',
  note: '',
  type: 1
})
const searchText = ref('')
const editorRef = ref(null)
const showEditModal = ref(false)
const dialogTitle = ref('查看提示词')
const loading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = 'calc(100vh - 230px)'

onMounted(() => {
  fetchNotes()
})

// 从API获取提示词数据
const fetchNotes = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: {
        column: "id",
        type: "desc",
      },
    }

    if (searchText.value) {
      params.conditions = {
        ...params.conditions,
        title: searchText.value,
        content: searchText.value
      }
    }

    const res = await window.electronAPI.getPromptList(params)
    if (res.success && res.list) {
      notes.value = res.list.filter((note: Note) => !note.isTemp)
      total.value = res.total || 0
    } else {
      notes.value = []
      total.value = 0
      ElMessage({
        message: res.error || '获取提示词数据失败',
        type: 'warning'
      })
    }
  } catch (error) {
    console.error('获取提示词数据失败:', error)
    notes.value = []
    total.value = 0
    ElMessage({
      message: '获取提示词数据失败，请检查网络连接',
      type: 'warning'
    })
  } finally {
    loading.value = false
  }
}

// 搜索提示词
let searchTimeout: number | null = null
const searchNotes = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchNotes()
  }, 500)
}

// 查看提示词
const viewNote = async (note: Note) => {
  if (!note.id) return

  try {
    const res = await window.electronAPI.getPromptDetail(note.id)
    if (res.success && res.data) {
      const promptData = res.data

      currentNote.value = {
        id: promptData.id,
        title: promptData.title || '',
        content: promptData.content || '',
        note: promptData.content || '',
        type: promptData.type || 1
      }

      dialogTitle.value = '查看/编辑提示词'
      showEditModal.value = true
    } else {
      ElMessage({
        message: res.error || '获取提示词内容失败',
        type: 'warning'
      })
    }
  } catch (error) {
    console.error('获取提示词内容失败:', error)
    ElMessage({
      message: '获取提示词内容失败，请检查网络连接',
      type: 'warning'
    })
  }
}

// 创建新提示词
const createNewNote = () => {
  currentNote.value = {
    id: undefined,
    title: '新建提示词',
    content: '<p></p>',
    note: '<p></p>',
    type: 1
  }

  dialogTitle.value = '新建提示词'
  showEditModal.value = true
}

// 保存提示词
const saveNote = async () => {
  if (!currentNote.value) return

  try {
    if (editorRef.value) {
      currentNote.value.note = editorRef.value.getContent()
    }

    const noteData = {
      id: currentNote.value.id,
      title: currentNote.value.title || '提示词',
      content: currentNote.value.note || '',
      type: currentNote.value.type || 1,
    }

    let res
    if (noteData.id) {
      res = await window.electronAPI.updatePrompt(noteData)
    } else {
      res = await window.electronAPI.addPrompt(noteData)
    }

    if (res.success) {
      ElMessage({
        message: '保存成功',
        type: 'success'
      })

      showEditModal.value = false
      fetchNotes()
    } else {
      ElMessage({
        message: res.message || '保存失败',
        type: 'error'
      })
    }
  } catch (error) {
    console.error('保存提示词失败:', error)
    ElMessage({
      message: '保存提示词失败，请检查网络连接',
      type: 'error'
    })
  }
}

// 删除提示词
const deleteNote = async (note: Note) => {
  if (!note.id) return

  try {
    const result = await ElMessageBox.confirm('确定要删除这个提示词吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    if (result === 'confirm') {
      const res = await window.electronAPI.deletePrompt(note.id)

      if (res.success) {
        ElMessage({
          message: '删除成功',
          type: 'success'
        })

        fetchNotes()
      } else {
        ElMessage({
          message: res.message || '删除失败',
          type: 'error'
        })
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除提示词失败:', error)
      ElMessage({
        message: '删除提示词失败，请检查网络连接',
        type: 'error'
      })
    }
  }
}

// 获取提示词内容预览
const getPreview = (content: string) => {
  if (!content) return ''

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  const textContent = tempDiv.textContent || tempDiv.innerText || ''

  return textContent.length > 50 ? textContent.substring(0, 50) + '...' : textContent
}

// 处理页码变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchNotes()
}

// 处理每页显示数量变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchNotes()
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

  .prompt-container {
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

  /* 弹窗样式优化 */
  :deep(.el-dialog) {
    border-radius: 12px;
  }

  .dialog-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .title-row {
    display: flex;
    gap: 15px;
    align-items: center;
  }

  .title-input {
    font-size: 24px;
    font-weight: 500;
    flex: 1;
  }

  .type-select {
    width: 120px;
  }

  :deep(.title-input .el-input__wrapper) {
    box-shadow: none !important;
    border-radius: 10px;
    padding: 15px;
    background-color: #f5f3f0;
    border: 1px solid #e8e4df;
  }

  .note-rich-editor {
    border-radius: 8px;
    overflow: hidden;
  }

  :deep(.ProseMirror) {
    min-height: 400px;
    padding: 16px;
    font-size: 16px;
    line-height: 1.6;
  }
</style>

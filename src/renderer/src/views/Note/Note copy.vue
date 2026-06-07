<template>
  <div class="note-container">
    <!-- 左侧笔记列表 -->
    <div class="left-panel">
      <div class="search-box">
        <el-input
          v-model="searchText"
          placeholder="搜索"
          class="search-input"
          clearable
          :disabled="!isPasswordVerified"
          @input="searchNotes"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="notes-list">
        <div
          v-for="(note,index) in notes"
          :key="note.id"
          class="note-item"
          :class="{ 'active': currentNote && currentNote.id === note.id }"
          @click="handleNoteClick(note)"
        >
          <div class="note-item-content">
            <el-checkbox 
              v-if="isPrintMode" 
              v-model="note.selectedForPrint"
              @change="updateSelectedNotes"
              @click.stop
              class="note-checkbox"
            ></el-checkbox>
            <div class="note-image">
              <img :src="getNoteImage(index)" alt="笔记图片" />
            </div>
            <div class="note-info">
              <div class="note-title">{{ note.title || "笔记" + (index + 1) }}</div>
              <div class="note-preview">{{ getPreview(note.content) }}</div>
              <div class="note-type">{{ note.type || '学习笔记' }}</div>
            </div>
          </div>
          <div class="note-corner-icon"></div>
        </div>
        <div v-if="notes.length === 0" class="no-notes">
          <p>暂无笔记</p>
        </div>
      </div>
      <div class="pagination-box">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, prev, pager, next"
          :disabled="!isPasswordVerified"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 右侧笔记编辑区域 -->
    <div class="right-panel">
      <div class="note-toolbar">
        <el-button @click="createNewNote" type="primary" size="large" :disabled="!isPasswordVerified">
          新建笔记
        </el-button>
        <el-button @click="saveNote" type="success" size="large" :disabled="!isPasswordVerified || !currentNote">
          保存笔记
        </el-button>
        <el-button @click="deleteCurrentNote" type="danger" size="large" :disabled="!isPasswordVerified || !currentNote">
          删除笔记
        </el-button>
        <el-button @click="togglePrintMode" type="info" size="large" :disabled="!isPasswordVerified || notes.length === 0">
          {{ isPrintMode ? '取消打印' : '打印笔记' }}
        </el-button>
        <el-button 
          v-if="isPrintMode" 
          @click="confirmPrint" 
          type="warning" 
          size="large" 
          :disabled="!isPasswordVerified || selectedNotesForPrint.length === 0"
        >
          确认打印 ({{ selectedNotesForPrint.length }})
        </el-button>
        <el-button 
          v-if="!isPasswordVerified" 
          @click="showPasswordDialog" 
          type="warning" 
          size="large"
        >
          填写密码
        </el-button>
      </div>

      <div v-if="currentNote" class="note-editor">
        <el-input
          v-model="currentNote.title"
          placeholder="笔记标题"
          class="title-input"
          size="large"
        ></el-input>
        
        <RichEditor 
          v-model:contentHtml="currentNote.note" 
          height="100%" 
          :fontSize="30" 
          :showMenuBar="false"
          class="note-rich-editor"
          placeholder="开始编写笔记内容..."
          ref="editorRef"
        />
      </div>
      
      <div v-else class="empty-state">
        <p>选择一个笔记或创建新笔记</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import request from '@/utils/request'
import { Search, Refresh } from '@element-plus/icons-vue'
import RichEditor from '@/components/editor.vue'

// 导入所有图片
import img1 from '@/assets/images/1.jpg'
import img2 from '@/assets/images/2.jpg'
import img3 from '@/assets/images/3.jpg'
import img4 from '@/assets/images/4.jpg'
import img5 from '@/assets/images/5.jpg'
import img6 from '@/assets/images/6.jpg'
import img7 from '@/assets/images/7.jpg'
import img8 from '@/assets/images/8.jpg'
import img9 from '@/assets/images/9.jpg'
import img10 from '@/assets/images/10.jpg'
import img11 from '@/assets/images/11.jpg'
import img12 from '@/assets/images/12.jpg'
import img13 from '@/assets/images/13.jpg'
import img14 from '@/assets/images/14.jpg'

// 图片数组
const noteImages = [
  img1, img2, img3, img4, img5, img6, img7,
  img8, img9, img10, img11, img12, img13, img14
]

// 获取笔记图片
const getNoteImage = (index: number) => {
  return noteImages[index % 14]
}

interface Note {
  id?: number
  title: string
  content: string  // HTML content
  category?: string
  tags?: string
  create_time?: string
  update_time?: string
  image?: string
  type?: string
  isTemp?: boolean // 新增属性，用于标记临时笔记
  note?: string // 添加 note 字段
  selectedForPrint?: boolean // 添加用于打印选择的标记
}

// 数据定义
const notes = ref<Note[]>([])
const currentNote = ref<Note | null>(null)
const searchText = ref('')
const categories = ref<string[]>(['编程', '考研'])
const editorRef = ref(null)
const isPrintMode = ref(false) // 打印模式
const selectedNotesForPrint = ref<Note[]>([]) // 选中要打印的笔记
const isPasswordVerified = ref(false) // 密码是否验证成功

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 模拟笔记数据（当API调用失败时使用）
const mockNotes: Note[] = []

onMounted(() => {
  // 页面加载时先弹出密码确认窗口
  showPasswordDialog()
})

// 显示密码确认窗口
const showPasswordDialog = () => {
  ElMessageBox.prompt('请输入访问密码', '密码验证', {
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: '取消',
    inputType: 'password',
    inputPlaceholder: '请输入密码',
    closeOnClickModal: true,
    closeOnPressEscape: true,
    showClose: false,
    inputValidator: (value) => {
      if (value === '619619') {
        // 密码正确，关闭弹窗
        ElMessageBox.close()
        ElMessage({
          message: '验证成功',
          type: 'success'
        })
        // 设置密码验证成功
        isPasswordVerified.value = true
        // 密码正确，获取笔记数据
        fetchNotes()
        return true
      }
      return true // 不显示错误提示，等待用户继续输入
    }
  }).catch(() => {
    // 用户点击取消，密码未验证
    isPasswordVerified.value = false
  })
}

    // 从API获取笔记数据
const fetchNotes = async () => {
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
    
    // 如果有搜索文本，添加到条件中
    if (searchText.value) {
      params.conditions = {
        ...params.conditions,
        title: searchText.value,
        content: searchText.value
      }
    }
    
    const res = await request.post('http://localhost:8000/api/note/get', params)
    console.log('res = ', res)
    if (res.code === 200 && res.result && res.result.list) {
      // 使用API返回的数据，过滤掉临时笔记
      notes.value = res.result.list.filter((note: Note) => !note.isTemp)
      // 更新总数（从 pagination 中获取）
      total.value = res.result.pagination?.total || 0
      // 如果有笔记但没有选中的笔记，选择第一个
      if (notes.value.length > 0 && !currentNote.value) {
        // 获取第一个笔记的完整内容
        await fetchNoteContent(notes.value[0])
      }
    } else {
      // 如果API没有返回数据，使用模拟数据
      notes.value = [...mockNotes]
      total.value = mockNotes.length
      ElMessage({
        message: '使用本地笔记数据',
        type: 'info'
      })
      
      
      // 如果有笔记但没有选中的笔记，选择第一个
      if (notes.value.length > 0 && !currentNote.value) {
        currentNote.value = { ...notes.value[0] }
      }
    }
  } catch (error) {
    console.error('获取笔记数据失败:', error)
    // 使用模拟数据作为备用
    notes.value = [...mockNotes]
    total.value = mockNotes.length
    ElMessage({
      message: '获取笔记数据失败，使用本地数据',
      type: 'warning'
    })
    
    
    // 如果有笔记但没有选中的笔记，选择第一个
    if (notes.value.length > 0 && !currentNote.value) {
      currentNote.value = { ...notes.value[0] }
    }
  }
}

// 搜索笔记
const searchNotes = () => {
  // 使用防抖处理，避免频繁请求
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    currentPage.value = 1 // 搜索时重置到第一页
    fetchNotes()
  }, 500)
}

let searchTimeout: number | null = null

// 刷新按钮点击
const handleRefresh = () => {
  searchText.value = ''
  currentPage.value = 1
  currentNote.value = null
  fetchNotes()
}

// 分页大小改变
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchNotes()
}

// 页码改变
const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchNotes()
}

// 选择笔记
const selectNote = (note: Note) => {
  // 显示loading，仅覆盖右侧面板
  const rightPanel = document.querySelector('.right-panel') as HTMLElement
  const loading = ElLoading.service({
    target: rightPanel,
    lock: true,
    text: '正在加载笔记...',
  })

  // 500ms后隐藏loading
  setTimeout(() => {
    loading.close()
  }, 500)

  // 检查是否有未保存的新建笔记
  if (currentNote.value && currentNote.value.isTemp) {
    // 弹窗询问用户是否保存当前笔记
    ElMessageBox.confirm('您有未保存的新建笔记，是否先保存？', '提示', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      type: 'warning'
    }).then(() => {
      // 用户选择保存
      saveNote().then(() => {
        // 保存成功后，加载选中的笔记
        fetchNoteContent(note)
      })
    }).catch(() => {
      // 用户选择不保存，直接加载选中的笔记
      fetchNotes()
      fetchNoteContent(note)
    })
  } else {
    // 没有未保存的新建笔记，直接加载选中的笔记
    fetchNoteContent(note)
  }
}

// 获取笔记内容
const fetchNoteContent = async (note: Note) => {
  if (!note.id) {
    return
  }
  
  try {
    const res = await request.get(`http://localhost:8000/api/note/content?id=${note.id}`)
    if (res.code === 200 && res.data) {
      console.log('获取笔记内容成功:', res.data)
      // 确保note字段存在，如果不存在，使用content字段
      if (!res.data.note && res.data.content) {
        res.data.note = res.data.content
      }
      currentNote.value = res.data
    } else {
      // 如果没有获取到完整内容，使用基本信息
      currentNote.value = { ...note }
      if (!currentNote.value.note && currentNote.value.content) {
        currentNote.value.note = currentNote.value.content
      }
      ElMessage({
        message: '获取笔记内容失败',
        type: 'warning'
      })
    }
  } catch (error) {
    console.log('获取笔记内容:', note)
    console.error('获取笔记内容失败:', error)
    // 如果获取详细内容失败，使用基本信息
    currentNote.value = { ...note }
    if (!currentNote.value.note && currentNote.value.content) {
      currentNote.value.note = currentNote.value.content
    }
    ElMessage({
      message: '获取笔记内容失败，请检查网络连接',
      type: 'warning'
    })
  }
}

// 创建新笔记
const createNewNote = () => {
  // 检查是否已有未保存的临时笔记
  if (currentNote.value && currentNote.value.isTemp) {
    ElMessageBox.confirm('您有未保存的新建笔记，是否先保存？', '提示', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      type: 'warning'
    }).then(() => {
      // 用户选择保存
      saveNote().then(() => {
        // 保存成功后，创建新笔记
        createEmptyNote()
      })
    }).catch(() => {
      // 用户选择不保存，直接创建新笔记
      createEmptyNote()
    })
  } else {
    // 没有未保存的新建笔记，直接创建
    createEmptyNote()
  }
}

// 创建空白笔记
const createEmptyNote = () => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const tempNote = {
    id: -Date.now(), // 使用负数时间戳作为临时ID
    title: '新建笔记',
    content: '<p></p>',
    note: '<p></p>', // 添加 note 字段
    type: '学习笔记',
    category: '编程', // 添加默认分类
    isTemp: true // 标记为临时笔记
  }
  
  // 将临时笔记添加到笔记列表的最前面
  notes.value.unshift(tempNote)
  
  // 设置当前笔记为新创建的临时笔记
  currentNote.value = tempNote
}

// 保存笔记
const saveNote = async () => {
  if (!currentNote.value) return Promise.reject('No current note')
  
  try {
    // 如果编辑器存在，确保获取最新内容
    if (editorRef.value) {
      currentNote.value.note = editorRef.value.getContent();
    }
    
    const noteData = {
      ...currentNote.value,
      content: currentNote.value.note, // 将 note 字段映射到 content 字段
    }

    // 删除临时标记
    if (noteData.isTemp) {
      delete noteData.isTemp
    }
    
    // 如果是临时ID（负数），则删除ID字段，让后端生成新ID
    if (noteData.id && noteData.id < 0) {
      delete noteData.id
    }
    
    console.log(noteData)
    let res
    if (noteData.id) {
      // 更新现有笔记
      res = await request.post('http://localhost:8000/api/note/update', noteData)
    } else {
      // 添加新笔记
      res = await request.post('http://localhost:8000/api/note/add', noteData)
    }
    
    if (res.code === 200) {
      ElMessage({
        message: '保存成功',
        type: 'success'
      })
      
      // 如果是临时笔记，保存成功后移除临时标记
      if (currentNote.value && currentNote.value.isTemp) {
        currentNote.value.isTemp = false
      }
      
      console.log('保存笔记-====',res)
      // 如果是新建的笔记，更新ID（在刷新列表之前）
      if ((!noteData.id || noteData.id < 0) && res.result && currentNote.value) {
        currentNote.value.id = res.result.data?.id || res.result.id
      }
      
      // 刷新笔记列表
      fetchNotes()
      
      return Promise.resolve(res)
    } else {
      ElMessage({
        message: res.message || '保存失败',
        type: 'error'
      })
      return Promise.reject(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存笔记失败:', error)
    ElMessage({
      message: '保存笔记失败，请检查网络连接',
      type: 'error'
    })
    return Promise.reject(error)
  }
}

// 删除当前笔记
const deleteCurrentNote = async () => {
  if (!currentNote.value || !currentNote.value.id) return
  
  try {
    const result = await ElMessageBox.confirm('确定要删除这个笔记吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    if (result === 'confirm') {
      const res = await request.post('http://localhost:8000/api/note/delete', {
        id: currentNote.value.id
      })
      
      if (res.code === 200) {
        ElMessage({
          message: '删除成功',
          type: 'success'
        })
        
        // 清除当前笔记
        currentNote.value = null
        
        // 刷新笔记列表
        fetchNotes()
      } else {
        ElMessage({
          message: res.message || '删除失败',
          type: 'error'
        })
      }
    }
  } catch (error) {
    console.error('删除笔记失败:', error)
    ElMessage({
      message: '删除笔记失败，请检查网络连接',
      type: 'error'
    })
  }
}

// 获取笔记内容预览
const getPreview = (content: string) => {
  if (!content) return ''
  
  // 创建临时元素来解析HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  
  return textContent.length > 50 ? textContent.substring(0, 50) + '...' : textContent
}

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return dateStr
  }
}

// 检查笔记是否有更改
const isNoteChanged = computed(() => {
  if (!currentNote.value || !currentNote.value.id) return false
  
  const originalNote = notes.value.find(note => note.id === currentNote.value?.id)
  if (!originalNote) return true
  
  return (
    originalNote.title !== currentNote.value.title ||
    originalNote.note !== currentNote.value.note
  )
})

// 切换打印模式
const togglePrintMode = () => {
  isPrintMode.value = !isPrintMode.value
  if (!isPrintMode.value) {
    // 退出打印模式时，清除所有选择
    notes.value.forEach(note => {
      note.selectedForPrint = false
    })
    selectedNotesForPrint.value = []
  }
}

// 处理笔记点击
const handleNoteClick = (note: Note) => {
  if (!isPrintMode.value) {
    // 非打印模式，正常选择笔记
    selectNote(note)
  }
  // 打印模式下，点击由复选框处理，不做其他操作
}

// 更新选中的笔记
const updateSelectedNotes = () => {
  selectedNotesForPrint.value = notes.value.filter(note => note.selectedForPrint)
}

// 确认打印
const confirmPrint = async () => {
  if (selectedNotesForPrint.value.length === 0) {
    ElMessage({
      message: '请至少选择一个笔记',
      type: 'warning'
    })
    return
  }
  
  try {
    // 创建打印窗口的HTML内容
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>打印笔记</title>
        <style>
          body {
            font-family: "Microsoft YaHei", Arial, sans-serif;
            padding: 20px;
            line-height: 1.8;
          }
          .note-section {
            margin-bottom: 30px;
            page-break-after: always;
          }
          .note-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #303133;
          }
          .note-separator {
            border: none;
            border-top: 2px dashed #dcdfe6;
            margin: 30px 0;
          }
          .note-content {
            font-size: 16px;
            color: #606266;
          }
          .note-content p {
            margin: 10px 0;
          }
          .note-content h1, .note-content h2, .note-content h3 {
            margin-top: 20px;
            margin-bottom: 10px;
          }
          .note-content ul, .note-content ol {
            margin: 10px 0;
            padding-left: 30px;
          }
          .note-content li {
            margin: 5px 0;
          }
          @media print {
            body {
              padding: 10px;
            }
            .note-section:last-child {
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
    `
    
    // 为每个选中的笔记添加内容
    for (let i = 0; i < selectedNotesForPrint.value.length; i++) {
      const note = selectedNotesForPrint.value[i]
      
      // 如果笔记没有完整内容，先获取
      let noteContent = note.note || note.content || ''
      if (!noteContent && note.id) {
        try {
          const res = await request.get(`http://localhost:8000/api/note/content?id=${note.id}`)
          if (res.code === 200 && res.data) {
            noteContent = res.data.note || res.data.content || ''
          }
        } catch (error) {
          console.error('获取笔记内容失败:', error)
        }
      }
      
      printContent += `
        <div class="note-section">
          <div class="note-title">${note.title || '无标题笔记'}</div>
          <div class="note-content">${noteContent}</div>
        </div>
      `
      
      // 如果不是最后一个笔记，添加分隔线
      if (i < selectedNotesForPrint.value.length - 1) {
        printContent += '<hr class="note-separator">'
      }
    }
    
    printContent += `
      </body>
      </html>
    `
    
    // 创建打印窗口
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      
      // 等待内容加载完成后打印
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
      
      ElMessage({
        message: `正在打印 ${selectedNotesForPrint.value.length} 个笔记`,
        type: 'success'
      })
      
      // 打印后退出打印模式
      setTimeout(() => {
        togglePrintMode()
      }, 1000)
    } else {
      ElMessage({
        message: '无法打开打印窗口，请检查浏览器弹窗设置',
        type: 'error'
      })
    }
  } catch (error) {
    console.error('打印失败:', error)
    ElMessage({
      message: '打印失败',
      type: 'error'
    })
  }
}
</script>

<style scoped>
.note-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.left-panel {
  width: 550px;
  border-right: 1px solid #e0e6ed;
  display: flex;
  flex-direction: column;
  background: white;
}

.search-box {
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  flex: 1;
}

.refresh-btn {
  flex-shrink: 0;
}

:deep(.search-input .el-input__wrapper) {
  background-color: #f5f5f5;
  box-shadow: none !important;
  border-radius: 5px;
}

:deep(.search-input .el-input__inner) {
  background-color: #f5f5f5;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* 隐藏 Chrome, Safari 和 Opera 的滚动条 */
.notes-list::-webkit-scrollbar {
  display: none;
}

.note-item {
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, rgba(236, 245, 255, 0.9), rgba(224, 224, 211, 0.8));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
}

.note-item-content {
  display: flex;
  align-items: stretch;
  gap: 15px;
}

.note-checkbox {
  margin-right: 10px;
  align-self: center;
}

.note-image {
  min-width: 60px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.note-image img {
  width: 100%;
  height: 60px;
  object-fit: cover;
  border-radius: 5px;
}

.note-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0; /* 允许子元素溢出并应用省略号 */
}

.note-item.active {
  background: linear-gradient(135deg, rgba(236, 245, 255, 0.9), rgba(177, 206, 244, 0.8));
}

.note-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-preview {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-type {
  font-size: 14px;
  color: #909399;
}

.note-corner-icon {
  position: absolute;
  bottom: -30px;
  right: -30px;
  width: 100px;
  height: 100px;
  background-image: url('@/assets/png/biji.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  mask-image: linear-gradient(to bottom right, transparent, black);
  -webkit-mask-image: linear-gradient(to bottom right, transparent, black);
}

.right-panel {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.note-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: calc(100vh - 150px);
}

.title-input {
  font-size: 24px;
  font-weight: 500;
}

:deep(.title-input .el-input__wrapper) {
  box-shadow: none !important;
  border-radius: 5px;
  padding:15px;
}

.note-meta-editor {
  display: flex;
  gap: 15px;
}

:deep(.note-meta-editor .el-select .el-input__inner) {
  font-size: 18px;
}

:deep(.el-select-dropdown__item) {
  font-size: 18px;
  padding: 12px 20px;
}

.tags-input {
  flex: 1;
}

.content-textarea {
  flex: 1;
}

.note-rich-editor {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.ProseMirror) {
  min-height: 300px;
  padding: 16px;
  font-size: 16px;
  line-height: 1.6;
}

:deep(.el-textarea__inner) {
  font-size: 16px;
  line-height: 1.6;
  padding: 12px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

:deep(.el-textarea__inner::-webkit-scrollbar) {
  display: none; /* Chrome, Safari, Opera */
}

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #909399;
  font-size: 16px;
}

.no-notes {
  padding: 20px;
  text-align: center;
  color: #909399;
}

.pagination-box {
  padding: 10px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #e0e6ed;
}

:deep(.pagination-box .el-pagination) {
  flex-wrap: wrap;
  justify-content: center;
}

/* 全局滚动条隐藏，使用 :deep 代替 :global */
:deep(html),
:deep(body) {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

:deep(html::-webkit-scrollbar),
:deep(body::-webkit-scrollbar) {
  display: none; /* Chrome, Safari, Opera */
}

/* 密码弹窗输入框样式 */
:deep(.el-message-box__input) {
  padding: 20px 0;
}

:deep(.el-message-box__input .el-input__wrapper) {
  padding: 15px 20px;
}

:deep(.el-message-box__input .el-input__inner) {
  font-size: 24px;
  height: 50px;
  letter-spacing: 8px;
}
</style>

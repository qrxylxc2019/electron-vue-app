<template>
  <div class="files-container">
    <!-- 左侧上传区域 -->
    <div class="upload-section">
      <el-upload
        class="upload-demo"
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :show-file-list="true">
        <el-button  size="large" type="primary">选择文件</el-button>
      </el-upload>
    </div>

    <!-- 右侧表格区域 -->
    <div class="table-section">
        <div class="table-header">
          <div class="search-container">
            <el-input
              v-model="searchQuery"
              placeholder="搜索"
              class="search-input"
              clearable
            ></el-input>
            <el-select
              v-model="selectedTag"
              placeholder="选择标签"
              class="tag-select"
              size="large"
              clearable
              @change="handleTagChange"
            >
              <el-option
                v-for="tag in tagList"
                :key="tag.id"
                :label="tag.tag"
                :value="tag.id"
              />
            </el-select>
            <!-- 添加设置图标 -->
            <el-button
              type="primary"
              size="large"
              @click="showTagDialog = true"
              class="tag-setting-btn"
            >
              <el-icon><Setting /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="content-flex-container">
          <div class="table-container">
            <el-table :data="fileList" style="width: 100%" height="800" @row-click="handlePreview">
                <el-table-column label="文件名" width="450">
                  <template #default="scope">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <img 
                        :src="getFileIcon(scope.row.filename)" 
                        style="width: 24px; height: 24px;"
                        v-if="getFileIcon(scope.row.filename)"
                      />
                      <div>
                        <div>{{ scope.row.filename }}</div>
                        <div style="font-size: 12px; color:rgb(218, 220, 223);">{{ scope.row.filepath }}</div>
                        <div class="tag_select_wrap">
                          <el-select
                            v-model="scope.row.tag_id"
                            placeholder="选择标签"
                            class="tag_select"
                            @change="(value) => handleFileTagChange(scope.row, value)"
                          >
                            <el-option
                              v-for="tag in tagList"
                              :key="tag.id"
                              :label="tag.tag"
                              :value="tag.id"
                            />
                          </el-select>
                        </div>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <!-- 添加操作列 -->
                <el-table-column label="操作" width="150">
                    <template #default="scope">
                        <div class="operation-buttons">
                          <el-tooltip content="打开" placement="top">
                            <el-button
                              type="primary"
                              @click="handleOpen(scope.row)"
                            >
                              <el-icon><Folder /></el-icon>
                            </el-button>
                          </el-tooltip>
                          <el-tooltip content="删除" placement="top">
                            <el-button
                              type="danger"
                              @click="handleDelete(scope.row)"
                              
                            >
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </el-tooltip>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
            <!-- 添加分页组件 -->
            <div class="pagination-container">
                <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="total"
                layout="total, sizes, prev, pager, next"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
                />
            </div>
          </div>
          
          <div class="preview-div"> 
            <div v-if="previewFile" class="preview-content">
              <img 
                v-if="isImageFile(previewFile?.filename)" 
                :src="previewFile?.filepath" 
                style="max-width: 100%; max-height: 100%;"
              />
              <iframe
                v-else-if="isPdfFile(previewFile?.filename)"
                :src="previewFile?.filepath"
                class="pdf-iframe"
                frameborder="0"
              ></iframe>
              <div v-else-if="isWordFile(previewFile?.filename)" 
                  class="word-preview"
                  v-html="previewContent">
              </div>
              <div v-else class="preview-placeholder">
                暂不支持该类型文件的预览
              </div>
            </div>
          </div>
        </div>
    </div>

    <!-- 标签管理弹窗 -->
    <el-dialog
      v-model="showTagDialog"
      title="标签"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="tag-dialog-content">
        <!-- 添加标签区域 -->
        <div class="tag-add-section">
          <el-input
            v-model="newTagName"
            placeholder="填写新标签名称"
            class="tag-input"
            clearable
          ></el-input>
          <el-button
            type="primary"
            size="large"
            @click="handleAddTag"
            :disabled="!newTagName"
          >
            添加标签
          </el-button>
        </div>

        <!-- 标签表格 -->
        <el-table
          :data="tagList"
          style="width: 100%"
          height="300"
          class="tag-table"
        >
          <el-table-column
            prop="tag"
            label="标签名称"
          />
          <el-table-column
            label="操作"
          >
            <template #default="scope">
              <el-button
                @click="handleEditTag(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                @click="handleDeleteTag(scope.row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, watch, getCurrentInstance } from 'vue'
import { ElMessage } from 'element-plus'
import mammoth from 'mammoth'
// 导入文件图标
import docxIcon from '@/assets/png/docx.png'
import htmlIcon from '@/assets/png/html.png'
import txtIcon from '@/assets/png/txt.png'
import xlsIcon from '@/assets/png/xls.png'
import pptIcon from '@/assets/png/ppt.png'
import pdfIcon from '@/assets/png/pdf.png'
import mp4Icon from '@/assets/png/mp4.png'
import jpegIcon from '@/assets/png/jpeg.png'
// 导入Element Plus图标
import { Folder, View, Delete, Setting } from '@element-plus/icons-vue'

export default {
  name: 'Files',
  components: {
    Folder,
    View,
    Delete,
    Setting
  },
  setup() {
    // 获取组件实例
    const { proxy } = getCurrentInstance()

    // 文件图标映射
    const fileIcons = {
      'docx': docxIcon,
      'doc': docxIcon,
      'html': htmlIcon,
      'htm': htmlIcon,
      'txt': txtIcon,
      'xls': xlsIcon,
      'xlsx': xlsIcon,
      'ppt': pptIcon,
      'pptx': pptIcon,
      'pdf': pdfIcon,
      'mp4': mp4Icon,
      'jpg': jpegIcon,
      'jpeg': jpegIcon,
      'png': jpegIcon
    }

    const getFileIcon = (filename) => {
      console.log('icon===========', filename)
      const extension = filename?.split('.').pop().toLowerCase()
      return fileIcons[extension] || ''
    }

    // 文件列表数据
    const fileList = ref([])
    // 当前选择的文件
    const currentFile = ref(null)
    // 分页相关数据
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)
    const searchQuery = ref('')
    const searchTimer = ref(null)

    // 预览相关数据
    const previewDrawer = ref(false)
    const previewFile = ref(null)

    // 判断是否为图片文件
    const isImageFile = (filename) => {
      if (!filename) return false
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
      const extension = filename.split('.').pop().toLowerCase()
      return imageExtensions.includes(extension)
    }

    // 判断是否为Word文件
    const isWordFile = (filename) => {
      if (!filename) return false
      const wordExtensions = ['doc', 'docx']
      const extension = filename.split('.').pop().toLowerCase()
      return wordExtensions.includes(extension)
    }

    // 判断是否为PDF文件
    const isPdfFile = (filename) => {
      if (!filename) return false
      const extension = filename.split('.').pop().toLowerCase()
      return extension === 'pdf'
    }

    // 预览文件内容
    const previewContent = ref('')

    // 获取文件列表
    const getFileList = async () => {
      try {
        const res = await proxy.$axios.post('http://localhost:8000/api/files/get', {
          page: currentPage.value,
          pageNum: pageSize.value,
          conditions: {},
          orderBy: {
            column: "id",
            type: "desc",
          },
        })
        console.log('res======',res)
        // 处理文件路径，提取文件名
        fileList.value = res.data.result.list.map(item => ({
          ...item,
          filename: item.filepath.split('\\').pop() // 从路径中提取文件名
        }))
        console.log('fileList.value',fileList.value)
        


        // 从pagination中获取总数
        total.value = res.data.result.pagination.total
        // 更新当前页码
        currentPage.value = res.data.result.pagination.current
        // 更新每页条数
        pageSize.value = res.data.result.pagination.pageNum
        // 如果有文件列表，默认预览第一条记录
        if (fileList.value.length > 0) {
          handlePreview(fileList.value[0])
        }
      } catch (error) {
        console.log('error =====',error)
        ElMessage.error('获取文件列表异常'+JSON.stringify(error))
      }
    }

    // 处理每页条数变化
    const handleSizeChange = (val) => {
      pageSize.value = val
      currentPage.value = 1 // 切换每页条数时重置为第一页
      getFileList()
    }

    // 处理页码变化
    const handleCurrentChange = (val) => {
      currentPage.value = val
      getFileList()
    }

    // 文件选择改变
    const handleFileChange = (file) => {
      currentFile.value = file
      // 选择文件后直接调用handleAdd
      if (file) {
        handleAdd()
      }
    }

    // 新增文件
    const handleAdd = async () => {
      if (!currentFile.value) {
        ElMessage.warning('请先选择文件')
        return
      }

      console.log('currentFile.value.raw=====',currentFile.value.raw)
      try {
        await proxy.$axios.post('http://localhost:8000/api/files/add', {
          filepath: currentFile.value.raw.path
        })
        ElMessage.success('添加成功')
        getFileList()
        currentFile.value = null
      } catch (error) {
        ElMessage.error('添加异常')
      }
    }

    // 删除文件
    const handleDelete = async (row) => {
      try {
        await proxy.$axios.post('http://localhost:8000/api/files/delete', {
          id: row.id
        })
        ElMessage.success('删除成功')
        getFileList()
      } catch (error) {
        ElMessage.error('删除异常')
      }
    }

    // 处理预览
    const handlePreview = async (row) => {
      previewFile.value = row
      previewDrawer.value = true
      
      if (isWordFile(row.filename)) {
        try {
          // 读取本地文件
          const response = await fetch(row.filepath)
          const arrayBuffer = await response.arrayBuffer()
          
          // 使用mammoth转换Word为HTML
          const result = await mammoth.convertToHtml({ arrayBuffer })
          previewContent.value = result.value
        } catch (error) {
          console.error('预览Word文件异常:', error)
          ElMessage.error('预览Word文件异常')
        }
      }
    }

    // 添加搜索方法
    const performSearch = (query) => {
      if (!query || query.trim() === '') {
        // 如果清空了搜索，重置为初始状态
        currentPage.value = 1
        getFileList()
        return
      }
      
      // 调用API进行搜索
      searchFiles(query)
    }
    
    // 添加搜索API调用方法
    const searchFiles = async (query) => {
      try {
        const res = await proxy.$axios.post('http://localhost:8000/api/files/get', {
          page: currentPage.value,
          pageNum: pageSize.value,
          conditions: {
            filepath: query,
          },
          orderBy: {
            column: "id",
            type: "desc",
          }
        })
        console.log('res======',res)
        if (res.code === 200) {
          fileList.value = res.data.result.list || []
          total.value = res.data.result.pagination?.total || 0
        } else {
          ElMessage.error(res.message || "搜索异常")
        }
      } catch (error) {
        console.error("搜索异常:", error)
        ElMessage.error("搜索异常: " + (error.response?.data?.detail || error.message))
      }
    }

    // 添加搜索查询的监听器
    watch(searchQuery, (newVal) => {
      // 清除之前的定时器
      if (searchTimer.value) {
        clearTimeout(searchTimer.value)
      }
      
      // 使用setTimeout延迟执行搜索，实现debounce
      searchTimer.value = setTimeout(() => {
        performSearch(newVal)
      }, 300) // 300ms延迟
    })

    // 处理打开文件
    const handleOpen = (row) => {
      // 使用electron的shell.showItemInFolder打开文件所在目录
      window.electron.ipcRenderer.send('open-file-location', row.filepath)
    }

    // 标签相关数据
    const selectedTag = ref('')
    const tagList = ref([])
    const showTagDialog = ref(false)
    const newTagName = ref('')

    // 获取标签列表
    const getTagList = async () => {
      try {
        const res = await proxy.$axios.post('http://localhost:8000/api/files/tag/get', {
          page: 1,
          pageNum: 100,
          conditions: {},
          orderBy: {
            column: "id",
            type: "desc",
          },
        })
        tagList.value = res.data.result.list || []
      } catch (error) {
        console.error('获取标签列表异常:', error)
        ElMessage.error('获取标签列表异常')
      }
    }

    // 处理标签选择变化
    const handleTagChange = (tagId) => {
      if (tagId) {
        // 根据标签ID搜索文件
        searchFilesByTag(tagId)
      } else {
        // 清空标签选择，重置为初始文件列表
        getFileList()
      }
    }

    // 根据标签搜索文件
    const searchFilesByTag = async (tagId) => {
      try {
        const res = await proxy.$axios.post('http://localhost:8000/api/files/get', {
          page: currentPage.value,
          pageNum: pageSize.value,
          conditions: {
            tag_id: tagId
          },
          orderBy: {
            column: "id",
            type: "desc",
          }
        })

        console.log('res===================',res)
        // 处理文件路径，提取文件名
        fileList.value = res.data.result.list.map(item => ({
          ...item,
          filename: item.filepath.split('\\').pop() // 从路径中提取文件名
        }))

        total.value = res.data.result.pagination?.total || 0
      } catch (error) {
        console.error('按标签搜索异常:', error)
        ElMessage.error('按标签搜索异常')
      }
    }

    // 处理文件标签选择变化
    const handleFileTagChange = async (row, tagId) => {
      try {
        await proxy.$axios.post('http://localhost:8000/api/files/update', {
          id: row.id,
          tag_id: tagId
        })
        ElMessage.success('文件标签更新成功')
        getFileList() // 刷新文件列表以反映标签变化
      } catch (error) {
        console.error('更新文件标签异常:', error)
        ElMessage.error('更新文件标签异常')
      }
    }

    // 处理添加标签
    const handleAddTag = async () => {
      if (!newTagName.value) {
        ElMessage.warning('标签名称不能为空')
        return
      }
      try {
        await proxy.$axios.post('http://localhost:8000/api/files/tag/add', {
          tag: newTagName.value
        })
        ElMessage.success('标签添加成功')
        getTagList()
        showTagDialog.value = false
        newTagName.value = ''
      } catch (error) {
        ElMessage.error('添加标签异常')
      }
    }

    // 处理编辑标签
    const handleEditTag = async (row) => {
      const newTag = await ElMessage.prompt('请输入新的标签名称', row.tag)
      if (newTag) {
        try {
          await proxy.$axios.post('http://localhost:8000/api/files/tag/update', {
            id: row.id,
            tag: newTag
          })
          ElMessage.success('标签更新成功')
          getTagList()
        } catch (error) {
          ElMessage.error('更新标签异常')
        }
      }
    }

    // 处理删除标签
    const handleDeleteTag = async (row) => {
      try {
        await proxy.$axios.post('http://localhost:8000/api/files/tag/delete', {
          id: row.id
        })
        ElMessage.success('标签删除成功')
        getTagList()
      } catch (error) {
        ElMessage.error('删除标签异常')
      }
    }

    onMounted(() => {
      getFileList()
      getTagList() // 在组件挂载时获取标签列表
    })

    return {
      fileList,
      handleFileChange,
      handleAdd,
      handleDelete,
      currentPage,
      pageSize,
      total,
      handleSizeChange,
      handleCurrentChange,
      searchQuery,
      getFileIcon,
      previewDrawer,
      previewFile,
      handlePreview,
      isImageFile,
      isWordFile,
      previewContent,
      isPdfFile,
      handleOpen,
      selectedTag, // 暴露给模板
      tagList, // 暴露给模板
      handleTagChange, // 暴露给模板
      handleFileTagChange, // 暴露给模板
      showTagDialog, // 暴露给模板
      newTagName, // 暴露给模板
      handleAddTag, // 暴露给模板
      handleEditTag, // 暴露给模板
      handleDeleteTag // 暴露给模板
    }
  }
}
</script>

<style scoped>
.files-container {
  display: flex;
  height: 100vh;
}

.upload-section {
  width: 300px;
  padding: 20px;
  border-right: 1px solid #eee;
  background: linear-gradient(135deg, 
    #ffffff 0%, 
rgb(239, 249, 248) 25%, 
rgb(244, 250, 250) 50%, 
rgb(233, 248, 246) 75%, 
rgb(170, 249, 241) 100%
  ); /* 从左上角白色到右下角蒂芙尼蓝的渐变 */
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

@keyframes gradientBG {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* 上传按钮样式 */
.upload-section :deep(.el-upload) {
  width: 100%;
}

/* 统一按钮宽度样式 */
.upload-section :deep(.el-button) {
  width: 250px; /* 设置固定宽度 */
  height: 50px;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: #40E0D0;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
}

.upload-section :deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  background: #ffffff;
}

/* 文件列表样式 */
.upload-section :deep(.el-upload-list) {
  width: 250px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 10px;
  margin-top: 20px;
  backdrop-filter: blur(5px);
}

.upload-section :deep(.el-upload-list__item) {
  transition: all 0.3s ease;
}

.upload-section :deep(.el-upload-list__item:hover) {
  background: rgba(255, 255, 255, 0.8);
  transform: translateX(5px);
}

.table-section {
  flex:1;
  padding: 20px;
}

/* 添加表头底部边框样式 */
:deep(.el-table__header-wrapper th) {
  background-color: #fff !important; 
  color: #333;
  font-weight: bold;
  border-bottom: 5px solid #fafafa !important; 
  font-size: 20px; /* 表头字体大小 */
}

/* 表格内容字体大小 */
:deep(.el-table__body-wrapper td) {
  font-size: 20px; /* 表格内容字体大小 */
  padding:10px 0

}

/* 添加分页容器样式 */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 添加搜索框相关样式 */
.table-header {
  background-color: #ffffff;
  height: 60px;
  display: flex;
  align-items: center;
}

.search-container {
  width: 100%;
  display: flex;
  align-items: center;
  width: 100%;
  gap: 20px;
}
.search-input{
  width: 200px;
}

.search-input :deep(.el-input__wrapper) {
  background-color: #f5f7fa;
  border: none;
  border-radius: 5px;
  box-shadow: none !important;
  padding: 0;
  transition: all 0.3s;
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: none !important;
}

.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: none !important;
}

.search-input :deep(.el-input__inner) {
  background-color: transparent;
  border: none;
  height: 40px;
  padding: 0 20px;
  transition: all 0.3s;
  outline: none !important;
}

/* 添加左右flex布局容器 */
.content-flex-container {
  display: flex;
  margin-top: 20px;
  height:100%;
}

.table-container {
  overflow: auto;
  border-right:1px solid #eaeaea;
  height:100%;
}

.preview-div {
  flex: 2;
  border-radius: 4px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  margin-top: 0; /* 移除之前的margin-top */
  height: calc(100vh - 200px);
  padding: 0 10px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding:10px;
  border-bottom: 1px solid #eaeaea;
  font-weight: bold;
}

.preview-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.preview-placeholder {
  color: #909399;
  font-size: 16px;
  text-align: center;
}

/* 添加Word预览相关样式 */
.word-preview {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
}

.word-preview :deep(img) {
  max-width: 100%;
  height: auto;
}

.word-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
}

.word-preview :deep(td),
.word-preview :deep(th) {
  border: 1px solid #ddd;
  padding: 8px;
}

.word-preview :deep(p) {
  margin: 10px 0;
  line-height: 1.6;
}

/* 添加PDF预览相关样式 */
.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

/* 操作按钮样式 */
.operation-buttons {
  display: flex;
  gap: 2px;
  justify-content: center;
}

/* 表格行鼠标悬停样式 */
:deep(.el-table__body tr) {
  cursor: pointer;
}

/* 标签选择器样式 */
.tag-select {
  margin-left: 10px;
  width: 200px;
}

.tag-select :deep(.el-input__wrapper) {
  background-color: #f5f7fa;
  border: none;
  border-radius: 5px;
  box-shadow: none !important;
  padding: 0;
  transition: all 0.3s;
}

.tag-select :deep(.el-input__wrapper:hover) {
  box-shadow: none !important;
}

.tag-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: none !important;
}

.tag-select :deep(.el-input__inner) {
  background-color: transparent;
  border: none;
  height: 40px;
  padding: 0 20px;
  transition: all 0.3s;
  outline: none !important;
}

.tag_select{
  width: 150px;
}
:deep(.tag_select .el-select__wrapper) {
  background-color: #E6A23C !important; /* 红色背景 */
  border:none!important;
}
:deep(.tag_select .el-select__wrapper){
  color: white !important;
  box-shadow:none!important;
}
:deep(.tag_select .el-select__selected-item){
  color: white !important;
}
:deep(.tag_select .el-select__caret){
  color: white !important;
}

/* 标签管理弹窗样式 */
.tag-dialog-content {
  padding: 20px;
}

.tag-add-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tag-input :deep(.el-input__wrapper) {
  background-color: #f5f7fa;
  border: none;
  border-radius: 5px;
  box-shadow: none !important;
  padding: 0;
  transition: all 0.3s;
}

.tag-input :deep(.el-input__wrapper:hover) {
  box-shadow: none !important;
}

.tag-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: none !important;
}

.tag-input :deep(.el-input__inner) {
  background-color: transparent;
  border: none;
  height: 40px;
  padding: 0 20px;
  transition: all 0.3s;
  outline: none !important;
}

.tag-table :deep(.el-table__header-wrapper th) {
  background-color: #f5f7fa !important;
  color: #333;
  font-weight: bold;
  border-bottom: 1px solid #eaeaea !important;
  font-size: 16px;
}

.tag-table :deep(.el-table__body-wrapper td) {
  font-size: 16px;
  padding: 8px 0;
}

.tag-table :deep(.el-table__body-wrapper td:hover) {
  background-color: #f5f7fa;
}

.tag-table :deep(.el-table__body-wrapper td:nth-child(1)) {
  font-weight: bold;
}

.tag-table :deep(.el-table__body-wrapper td:nth-child(2)) {
  display: flex;
  gap: 10px;
}

.tag-table :deep(.el-table__body-wrapper td:nth-child(2) .el-button) {
  padding: 5px 10px;
  font-size: 14px;
}
</style> 
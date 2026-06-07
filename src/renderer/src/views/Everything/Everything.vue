<template>
  <div class="everything-container">
    <div class="search-box">
      <el-input
        v-model="searchText"
        placeholder="输入搜索关键词"
        clearable
        size="large"
        @change="handleSearch"
        @keyup.enter="handleSearch"
        class="search-input"
      >
        <template #prefix>
          <el-icon><search /></el-icon>
        </template>
      </el-input>
    </div>

    <div class="results-container">
      <el-table
        :data="searchResults"
        stripe
        height="90vh"
        style="width: 100%;font-size:20px"
        v-loading="loading"
        empty-text="暂无搜索结果"
      >
        <el-table-column prop="index" label="序号" width="80" align="center">
          <template #default="{ row }">
            <span>
              {{ row.index + 1 }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="filename" label="文件名" min-width="200">
          <template #default="{ row }">
            <span class="filename">
              <img :src="getFileIcon(row.filename)" alt="File Icon" class="file-icon">
              {{ row.filename }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="directory" label="目录" min-width="200">
          <template #default="{ row }">
            <span class="directory">{{ row.directory }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              type="primary"
              @click="openFile(row.path)"
            >
              打开
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="stats" v-if="searchResults.length > 0">
      找到 {{ totalResults }} 个结果，显示 {{ searchResults.length }} 个
    </div>
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'

// 导入文件图标
import docxIcon from '@/assets/png/docx.png'
import htmlIcon from '@/assets/png/html.png'
import txtIcon from '@/assets/png/txt.png'
import xlsIcon from '@/assets/png/xls.png'
import pptIcon from '@/assets/png/ppt.png'
import pdfIcon from '@/assets/png/pdf.png'
import mp4Icon from '@/assets/png/mp4.png'
import jpegIcon from '@/assets/png/jpeg.png'

// 防抖搜索，避免频繁调用
let searchTimeout = null

export default {
  name: 'Everything',
  
  data() {
    return {
      searchText: '',
      searchResults: [],
      loading: false,
      totalResults: 0
    }
  },
  
  methods: {
    async handleSearch() {
      if (!this.searchText.trim()) {
        this.searchResults = []
        this.totalResults = 0
        return
      }

      this.loading = true
      try {
        const response = await this.$axios.post(`http://localhost:8000/api/everything/search`, {
          search_string: this.searchText,
          max_results: 100
        })

        console.log('response=============', response)
        const res = response.data
        if (res.code === 200) {
          this.searchResults = res.data.results
          this.totalResults = res.data.total_results
          ElMessage.success(`找到 ${this.totalResults} 个文件`)
        } else {
          ElMessage.error(res.message)
          this.searchResults = []
          this.totalResults = 0
        }
      } catch (error) {
        console.error('搜索失败:', error)
        ElMessage.error('请检查服务是否正常')
        this.searchResults = []
        this.totalResults = 0
      } finally {
        this.loading = false
      }
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    openFile(filePath) {
      // 这里可以添加打开文件的逻辑
      // 例如使用electron的shell.openPath或者调用系统默认程序
      ElMessage.info(`尝试打开文件: ${filePath}`)
      console.log('打开文件:', filePath)
    },

    getFileIcon(filename) {
      const lowerCaseFilename = filename.toLowerCase();
      if (lowerCaseFilename.endsWith('.docx') || lowerCaseFilename.endsWith('.doc')) {
        return docxIcon;
      } else if (lowerCaseFilename.endsWith('.html')) {
        return htmlIcon;
      } else if (lowerCaseFilename.endsWith('.txt')) {
        return txtIcon;
      } else if (lowerCaseFilename.endsWith('.xls') || lowerCaseFilename.endsWith('.xlsx')) {
        return xlsIcon;
      } else if (lowerCaseFilename.endsWith('.ppt') || lowerCaseFilename.endsWith('.pptx')) {
        return pptIcon;
      } else if (lowerCaseFilename.endsWith('.pdf')) {
        return pdfIcon;
      } else if (lowerCaseFilename.endsWith('.mp4')) {
        return mp4Icon;
      } else if (lowerCaseFilename.endsWith('.jpeg') || lowerCaseFilename.endsWith('.jpg')) {
        return jpegIcon;
      }
      return htmlIcon; // 默认图标
    }
  },
  
  mounted() {
    // 监听输入变化，添加防抖
    const inputElement = document.querySelector('.search-input input')
    if (inputElement) {
      inputElement.addEventListener('input', (e) => {
        if (searchTimeout) {
          clearTimeout(searchTimeout)
        }
        searchTimeout = setTimeout(() => {
          this.handleSearch()
        }, 500)
      })
    }
  }
}
</script>

<style scoped>
.everything-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 600px;
}

.results-container {
  flex: 1;
}

.filename {
  font-weight: 500;
  color: #409EFF;
}

.file-path {
  color: #666;
  font-size: 12px;
}

.directory {
  color: #999;
}

.stats {
  margin-top: 10px;
  text-align: right;
  color: #666;
  font-size: 12px;
}

/* 文件图标样式 */
.file-icon {
  width: 24px;
  height: 24px;
  margin-right: 8px;
  vertical-align: middle;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-table .cell) {
  line-height: 1.4;
}

/* 添加表头样式 */
:deep(.el-table__header-wrapper th) {
  background-color: #fff !important; 
  color: #333;
  font-weight: bold;
  border-bottom: 5px solid #fafafa !important; 
}
:deep(.el-pager li) {
  min-width: 29px !important;
}
</style>

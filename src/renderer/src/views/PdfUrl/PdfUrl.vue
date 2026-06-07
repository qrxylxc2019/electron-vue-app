<!--
 * @Author: xuechao
 * @Description: 闲鱼资料管理组件
-->
<template>
  <div class="xianyu-container">
    <div class="header">
      <div class="header-actions">
        <el-input
          v-model="searchText"
          placeholder="搜索资料"
          class="search-input"
          clearable
          @input="searchData"
          size="large"
          style="height: 40px;"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" size="large" @click="openDialog()" style="height: 40px; margin-left: 10px;">
          <el-icon><Plus /></el-icon>新增资料
        </el-button>
      </div>
    </div>

    <!-- 资料列表表格 -->
    <el-table
      :data="tableData"
      style="width: 100%; height: calc(100vh - 200px)"
      v-loading="loading"
      stripe
    >
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column prop="title" label="网盘" min-width="200">
        <template #default="scope">
          <div class="copy-cell">
            <span class="ellipsis-text">{{ scope.row.title }}</span>
            
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="url" label="描述" min-width="300">
        <template #default="scope">
          <div class="copy-cell">
            <span class="ellipsis-text">{{ scope.row.url }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="scope">
          <el-button type="primary" link size="small" @click="copyToClipboard(scope.row.title)">
            <el-icon><CopyDocument /></el-icon>复制
          </el-button>
          <el-button type="primary" link @click="openDialog(scope.row)">
            <el-icon><Edit /></el-icon>编辑
          </el-button>
          <el-button type="danger" link @click="deleteData(scope.row)">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑资料' : '新增资料'"
      width="600px"
    >
      <el-form :model="form" label-width="80px" :rules="rules" ref="formRef">
        <el-form-item label="网盘" prop="title">
          <el-input 
            v-model="form.title" 
            type="textarea"
            :rows="5"
            placeholder="请输入标题" 
          />
        </el-form-item>
        <el-form-item label="描述" prop="url">
          <el-input type="textarea" :rows="5" v-model="form.url" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveData">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Search, Plus, Edit, Delete, CopyDocument } from '@element-plus/icons-vue'

export default {
  name: 'Xianyu',
  components: {
    Search,
    Plus,
    Edit,
    Delete,
    CopyDocument
  },
  data() {
    return {
      loading: false,
      searchText: '',
      tableData: [],
      currentPage: 1,
      pageSize: 20,
      total: 0,
      dialogVisible: false,
      isEdit: false,
      form: {
        id: null,
        title: '',
        url: ''
      },
      rules: {
        title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
        url: [{ required: true, message: '请输入链接', trigger: 'blur' }]
      }
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    // 加载数据
    async loadData() {
      this.loading = true
      try {
        const res = await this.$axios.post('http://localhost:8000/api/pdfurl/get', {
          page: this.currentPage,
          pageNum: this.pageSize,
          conditions: this.searchText ? { title: this.searchText } : {}
        })
        if (res.data.code === 200) {
          this.tableData = res.data.result.list || []
          this.total = res.data.result.pagination?.total || 0
        }
      } catch (error) {
        console.error('加载数据失败:', error)
        this.$message.error('加载数据失败')
      } finally {
        this.loading = false
      }
    },

    // 搜索
    searchNotes() {
      this.currentPage = 1
      this.loadData()
    },

    // 打开弹窗
    openDialog(row) {
      if (row) {
        this.isEdit = true
        this.form = { ...row }
      } else {
        this.isEdit = false
        this.form = {
          id: null,
          title: '',
          url: ''
        }
      }
      this.dialogVisible = true
    },

    // 保存数据
    async saveData() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return
        
        try {
          const url = this.isEdit ? '/api/pdfurl/update' : '/api/pdfurl/add'
          const res = await this.$axios.post(`http://localhost:8000${url}`, this.form)
          if (res.data.code === 200) {
            this.$message.success(this.isEdit ? '更新成功' : '添加成功')
            this.dialogVisible = false
            this.loadData()
          } else {
            this.$message.error(res.data.message || '操作失败')
          }
        } catch (error) {
          console.error('保存失败:', error)
          this.$message.error('保存失败')
        }
      })
    },

    // 删除数据
    async deleteData(row) {
      try {
        await this.$confirm('确定要删除这条资料吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const res = await this.$axios.post('http://localhost:8000/api/pdfurl/delete', {
          id: row.id
        })
        if (res.data.code === 200) {
          this.$message.success('删除成功')
          this.loadData()
        } else {
          this.$message.error(res.data.message || '删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除失败:', error)
          this.$message.error('删除失败')
        }
      }
    },

    // 分页大小变化
    handleSizeChange() {
      this.currentPage = 1
      this.loadData()
    },

    // 页码变化
    handleCurrentChange() {
      this.loadData()
    },

    // 复制到剪贴板
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.$message.success('复制成功')
      } catch (err) {
        this.$message.error('复制失败')
      }
    }
  }
}
</script>

<style scoped>
.xianyu-container {
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
}

.search-input {
  width: 300px;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}

/* 表格字体大小 */
:deep(.el-table) {
  font-size: 18px;
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
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
  color: #1a1a1a;
}
:deep(.el-tag) {
  font-size: 16px;
  border-radius: 8px;
}

/* 复制单元格样式 */
.copy-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 单行省略文本 */
.ellipsis-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* Element Plus 按钮主题覆盖 - 参照 Note.vue Commerce 风格 */
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

/* 输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
}
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
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

/* 弹窗样式 */
:deep(.el-dialog) {
  border-radius: 12px;
}
:deep(.el-dialog__header) {
  border-bottom: 1px solid #e8e4df;
  padding: 20px 24px;
}
:deep(.el-dialog__title) {
  color: #1a1a1a;
  font-weight: 600;
}
:deep(.el-dialog__body) {
  background-color: #faf8f5;
}
</style>

<template>
  <div class="aiapi-container">
    <div class="header">
      <div class="header-actions">
        <el-button type="primary" size="large" @click="showAddModal = true">
          <el-icon><Plus /></el-icon>
          添加 AI API
        </el-button>
        <el-button type="success" size="large" @click="handleQuery">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>
    </div>

    <!-- AI API 列表 -->
    <el-table
      :data="aiApis"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="provider" label="厂商" min-width="120" show-overflow-tooltip />
      <el-table-column prop="apikey" label="API Key" min-width="250" show-overflow-tooltip />
      <el-table-column prop="url" label="url" min-width="250" show-overflow-tooltip />
      <el-table-column prop="model" label="模型" min-width="150" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status == 1 ? 'success' : 'danger'">
            {{ row.status == 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
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

    <!-- 添加 AI API 弹窗 -->
    <el-dialog
      v-model="showAddModal"
      title="添加 AI API"
      width="600px"
    >
      <el-form :model="form" label-width="120px" size="large">
        <el-form-item label="厂商" required>
          <el-input v-model="form.provider" placeholder="如：deepseek、openai、claude" />
        </el-form-item>
        <el-form-item label="API Key" required>
          <el-input v-model="form.apikey" type="textarea" :rows="3" placeholder="请输入 API Key" />
        </el-form-item>
        <el-form-item label="url">
          <el-input v-model="form.url" placeholder="如：https://api.deepseek.com" />
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="form.model" placeholder="如：deepseek-chat" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="showAddModal = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleAdd" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑 AI API 弹窗 -->
    <el-dialog
      v-model="showEditModal"
      title="编辑 AI API"
      width="600px"
    >
      <el-form :model="editForm" label-width="120px" size="large">
        <el-form-item label="厂商" required>
          <el-input v-model="editForm.provider" placeholder="如：deepseek、openai、claude" />
        </el-form-item>
        <el-form-item label="API Key" required>
          <el-input v-model="editForm.apikey" type="textarea" :rows="3" placeholder="请输入 API Key" />
        </el-form-item>
        <el-form-item label="url">
          <el-input v-model="editForm.url" placeholder="如：https://api.deepseek.com" />
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="editForm.model" placeholder="如：deepseek-chat" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="editForm.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="showEditModal = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleEdit" :loading="editing">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'

export default {
  name: 'AiApi',
  components: {
    Plus,
    Search,
    Edit,
    Delete
  },
  data() {
    return {
      aiApis: [],
      loading: false,
      currentPage: 1,
      pageSize: 20,
      total: 0,
      showAddModal: false,
      showEditModal: false,
      submitting: false,
      editing: false,
      form: {
        provider: '',
        apikey: '',
        url: '',
        model: '',
        status: 1
      },
      editForm: {
        id: null,
        provider: '',
        apikey: '',
        url: '',
        model: '',
        status: 1
      }
    }
  },
  computed: {
    tableHeight() {
      return 'calc(100vh - 230px)'
    }
  },
  mounted() {
    this.handleQuery()
  },
  methods: {
    // 查询列表
    async handleQuery() {
      this.loading = true
      try {
        const res = await this.$axios.post('http://localhost:8000/api/aiapi/get', {
          page: this.currentPage,
          pageNum: this.pageSize,
          conditions: {}
        })
        if (res.data.code === 200) {
          this.aiApis = res.data.result.list || []
          this.total = res.data.result.pagination?.total || 0
        }
      } catch (error) {
        console.error('查询失败:', error)
        this.$message.error('查询失败')
      } finally {
        this.loading = false
      }
    },

    // 添加
    async handleAdd() {
      if (!this.form.provider || !this.form.apikey) {
        this.$message.warning('请填写厂商和 API Key')
        return
      }

      this.submitting = true
      try {
        const res = await this.$axios.post('http://localhost:8000/api/aiapi/add', this.form)
        if (res.data.code === 200) {
          this.$message.success('添加成功')
          this.showAddModal = false
          this.resetForm()
          this.handleQuery()
        } else {
          this.$message.error(res.data.message || '添加失败')
        }
      } catch (error) {
        console.error('添加失败:', error)
        this.$message.error('添加失败')
      } finally {
        this.submitting = false
      }
    },

    // 打开编辑弹窗
    openEditModal(row) {
      this.editForm = { ...row }
      this.showEditModal = true
    },

    // 编辑
    async handleEdit() {
      if (!this.editForm.provider || !this.editForm.apikey) {
        this.$message.warning('请填写厂商和 API Key')
        return
      }

      this.editing = true
      try {
        const res = await this.$axios.post('http://localhost:8000/api/aiapi/update', this.editForm)
        if (res.data.code === 200) {
          this.$message.success('更新成功')
          this.showEditModal = false
          this.handleQuery()
        } else {
          this.$message.error(res.data.message || '更新失败')
        }
      } catch (error) {
        console.error('更新失败:', error)
        this.$message.error('更新失败')
      } finally {
        this.editing = false
      }
    },

    // 删除
    async handleDelete(id) {
      try {
        await this.$confirm('确定要删除这条 API 配置吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        const res = await this.$axios.post('http://localhost:8000/api/aiapi/delete', { id })
        if (res.data.code === 200) {
          this.$message.success('删除成功')
          this.handleQuery()
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

    // 重置表单
    resetForm() {
      this.form = {
        provider: '',
        apikey: '',
        url: '',
        model: '',
        status: 1
      }
    },

    // 分页
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.handleQuery()
    },

    handlePageChange(val) {
      this.currentPage = val
      this.handleQuery()
    }
  }
}
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

  .aiapi-container {
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

  :deep(.el-tag) {
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    padding: 4px 10px;
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

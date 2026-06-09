<template>
  <div class="token-container">
    <div class="header">
      <div class="header-actions">
        <el-button type="primary" size="large" @click="showAddModal">
          <el-icon><Plus /></el-icon>
          添加 Token
        </el-button>
        <el-button type="success" size="large" @click="handleSearch">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>
    </div>

    <!-- Token 列表 -->
    <el-table
      :data="tableData"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="url" label="URL" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="ellipsis-text">{{ row.url }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="ellipsis-text">{{ row.desc }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="token" label="Token" min-width="300" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="ellipsis-text">{{ row.token }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="copyToken(row.token)">
            <el-icon><CopyDocument /></el-icon>复制
          </el-button>
          <el-button type="warning" link @click="handleEdit(row)">
            <el-icon><Edit /></el-icon>编辑
          </el-button>
          <el-button type="danger" link @click="handleDelete(row)">
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
        v-model:page-size="pageNum"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 添加/编辑 Token 弹窗 -->
    <el-dialog
      v-model="showModal"
      :title="isEdit ? '编辑 Token' : '添加 Token'"
      width="600px"
    >
      <el-form :model="form" ref="formRef" :rules="rules" label-width="100px" size="large">
        <el-form-item label="URL" prop="url">
          <el-input v-model="form.url" placeholder="请输入 URL" />
        </el-form-item>
        <el-form-item label="描述" prop="desc">
          <el-input v-model="form.desc" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="Token" prop="token">
          <el-input v-model="form.token" type="textarea" :rows="4" placeholder="请输入 Token" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="closeModal">取消</el-button>
        <el-button size="large" type="primary" @click="handleSave" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Plus, Search, CopyDocument, Edit, Delete } from '@element-plus/icons-vue'

const api = window.electronAPI

export default {
  components: {
    Plus,
    Search,
    CopyDocument,
    Edit,
    Delete
  },
  data() {
    return {
      tableData: [],
      currentPage: 1,
      pageNum: 20,
      total: 0,
      isEdit: false,
      currentId: null,
      showModal: false,
      loading: false,
      submitting: false,
      form: {
        url: "",
        desc: "",
        token: "",
      },
      rules: {
        url: [{ required: true, message: "请输入URL", trigger: "blur" }],
        token: [{ required: true, message: "请输入Token", trigger: "blur" }],
      },
    };
  },
  computed: {
    tableHeight() {
      return 'calc(100vh - 230px)'
    }
  },
  mounted() {
    this.getTokenList();
  },
  methods: {
    showAddModal() {
      this.isEdit = false;
      this.resetForm();
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.resetForm();
    },
    handleSearch() {
      this.currentPage = 1;
      this.getTokenList();
    },
    getTokenList() {
      this.loading = true;
      const params = {
        conditions: {},
        page: this.currentPage,
        pageNum: this.pageNum,
        orderBy: { column: "id", type: "desc" },
      };
      api.getTokenList(params)
        .then((res) => {
          if (res && res.list) {
            this.tableData = res.list || [];
            this.total = res.pagination?.total || 0;
          } else {
            this.$message.error("获取数据失败");
          }
        })
        .catch(() => {
          this.$message.error("获取数据失败");
        })
        .finally(() => {
          this.loading = false;
        });
    },
    handleSave() {
      this.$refs.formRef.validate((valid) => {
        if (!valid) return;
        this.submitting = true;
        const params = { url: this.form.url, desc: this.form.desc, token: this.form.token };
        if (this.isEdit) {
          params.id = this.currentId;
          api.updateToken(this.currentId, params)
            .then((res) => {
              if (res) {
                this.$message.success("更新成功");
                this.closeModal();
                this.getTokenList();
              } else {
                this.$message.error("更新失败");
              }
            })
            .catch(() => this.$message.error("更新失败"))
            .finally(() => {
              this.submitting = false;
            });
        } else {
          api.addToken(params)
            .then((res) => {
              if (res) {
                this.$message.success("添加成功");
                this.closeModal();
                this.getTokenList();
              } else {
                this.$message.error("添加失败");
              }
            })
            .catch(() => this.$message.error("添加失败"))
            .finally(() => {
              this.submitting = false;
            });
        }
      });
    },
    handleEdit(row) {
      this.isEdit = true;
      this.currentId = row.id;
      this.form = { url: row.url, desc: row.desc || "", token: row.token };
      this.showModal = true;
    },
    handleDelete(row) {
      this.$confirm("确认删除该Token记录?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(() => {
        api.deleteToken(row.id)
          .then((res) => {
            if (res) {
              this.$message.success("删除成功");
              this.getTokenList();
            } else {
              this.$message.error("删除失败");
            }
          })
          .catch(() => this.$message.error("删除失败"));
      }).catch(() => {});
    },
    handleSizeChange(size) {
      this.pageNum = size;
      this.currentPage = 1;
      this.getTokenList();
    },
    handleCurrentChange(val) {
      this.currentPage = val;
      this.getTokenList();
    },
    resetForm() {
      this.form = { url: "", desc: "", token: "" };
      this.isEdit = false;
      this.currentId = null;
      if (this.$refs.formRef) {
        this.$refs.formRef.clearValidate();
      }
    },
    copyToken(token) {
      navigator.clipboard.writeText(token).then(() => {
        this.$message.success("已复制到剪贴板");
      }).catch(() => {
        this.$message.error("复制失败");
      });
    },
  },
};
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

  .token-container {
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

  .ellipsis-text {
    display: inline-block;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

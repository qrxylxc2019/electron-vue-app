<template>
  <div class="email-container">
    <div class="action-bar">
      <el-button type="primary" @click="loadData">刷新</el-button>
    </div>
    <div class="table-section">
      <div class="table-div">
        <el-table
          :data="tableData"
          style="width: 100%"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          stripe
        >
          <el-table-column label="序号" width="80">
            <template #default="scope">
              {{ (currentPage - 1) * pageSize + scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column label="邮件信息" min-width="300">
            <template #default="scope">
              <div class="email-info">
                <div class="email-subject">{{ scope.row.subject }}</div>
                <div class="email-sender">{{ scope.row.from_name }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="from_addr" label="发件人邮箱" width="200" />
          <el-table-column prop="date" label="日期" width="180" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button type="primary" @click="handleView(scope.row)">
                查看
              </el-button>
            
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="detail-div">
      </div>
    </div>
    <!-- 邮件详情对话框 -->
    <el-dialog
      title="邮件详情"
      :visible.sync="dialogVisible"
      width="70%"
      :before-close="handleDialogClose"
    >
      <div v-loading="detailLoading">
        <div v-if="emailDetail" class="email-detail">
          <h2 class="email-detail-subject">{{ emailDetail.subject }}</h2>
          <div class="email-detail-info">
            <div><span class="label">发件人：</span>{{ emailDetail.from_name }} &lt;{{ emailDetail.from_addr }}&gt;</div>
            <div><span class="label">收件人：</span>{{ emailDetail.to_name }} &lt;{{ emailDetail.to_addr }}&gt;</div>
            <div><span class="label">日期：</span>{{ emailDetail.date }}</div>
          </div>
          <div v-if="emailDetail.has_attachments" class="email-attachments">
            <div class="label">附件：</div>
            <div class="attachment-list">
              <div v-for="(attachment, index) in emailDetail.attachments" :key="index" class="attachment-item">
                <i class="el-icon-document"></i>
                {{ attachment.filename }} ({{ (attachment.size / 1024).toFixed(2) }} KB)
              </div>
            </div>
          </div>
          <el-divider></el-divider>
          <div class="email-content" v-html="emailDetail.content"></div>
        </div>
        <div v-else-if="!detailLoading" class="email-detail-error">
          无法加载邮件内容
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getEmailList, getEmailDetail } from '@/api/index';

export default {
  name: "EmailIndex",
  data() {
    return {
      loading: false,
      detailLoading: false,
      searchForm: {
        subject: '',
        from_name: ''
      },
      tableData: [],
      multipleSelection: [],
      currentPage: 1,
      pageSize: 10,
      total: 0,
      dialogVisible: false,
      emailDetail: null
    };
  },
  methods: {
    // 加载数据
    async loadData() {
      this.loading = true;
      try {
        // 调用API获取邮件列表
        const response = await getEmailList({
          page: this.currentPage,
          pageSize: this.pageSize,
          ...this.searchForm
        });
        if (response.code === 200) {
          this.tableData = response.result.list;
          this.total = response.result.total || this.tableData.length;
        } else {
          this.$message.error(response.message || '加载数据失败');
        }
      } catch (error) {
        console.error('加载邮件列表失败:', error);
        this.$message.error('加载数据失败');
      } finally {
        this.loading = false;
      }
    },

    // 搜索
    handleSearch() {
      this.currentPage = 1;
      this.loadData();
    },

    // 重置
    handleReset() {
      this.searchForm = {
        subject: '',
        from_name: ''
      };
      this.currentPage = 1;
      this.loadData();
    },

    // 查看
    async handleView(row) {
      this.dialogVisible = true;
      this.detailLoading = true;
      this.emailDetail = null;
      
      try {
        const response = await getEmailDetail({ id: row.id });
        if (response.code === 200) {
          this.emailDetail = response.result;
        } else {
          this.$message.error(response.message || '获取邮件详情失败');
        }
      } catch (error) {
        console.error('获取邮件详情失败:', error);
        this.$message.error('获取邮件详情失败');
      } finally {
        this.detailLoading = false;
      }
    },

    // 关闭对话框
    handleDialogClose() {
      this.dialogVisible = false;
      this.emailDetail = null;
    },

    // 删除
    handleDelete(row) {
      this.$confirm(`确定要删除邮件"${row.subject}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$message.success('删除成功');
        this.loadData();
      });
    },

    // 选择变化
    handleSelectionChange(selection) {
      this.multipleSelection = selection;
    },
    
    // 每页条数变化
    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
      this.loadData();
    },
    
    // 页码变化
    handleCurrentChange(val) {
      this.currentPage = val;
      this.loadData();
    }
  },

  mounted() {
    this.loadData();
  }
};
</script>

<style scoped>
.email-container {
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

.action-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.search-section {
  background: #fff;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.search-form {
  margin: 0;
}

.action-section {
  margin-bottom: 20px;
}

.table-section {
  background: #fff;
  border-radius: 4px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.email-info {
  display: flex;
  flex-direction: column;
}

.email-subject {
  font-weight: bold;
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
}

.email-sender {
  font-size: 13px;
  color:rgb(189, 190, 192);
}

/* 邮件详情样式 */
.email-detail {
  padding: 10px;
}

.email-detail-subject {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
}

.email-detail-info {
  margin-bottom: 15px;
  line-height: 1.8;
}

.email-detail-info .label {
  font-weight: bold;
  color: #606266;
}

.email-attachments {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
}

.attachment-item {
  margin-right: 15px;
  margin-bottom: 5px;
  padding: 5px 10px;
  background-color: #e4e7ed;
  border-radius: 3px;
  display: flex;
  align-items: center;
}

.attachment-item i {
  margin-right: 5px;
}

.email-content {
  padding: 10px;
  background-color: #fff;
  border-radius: 4px;
  overflow-x: auto;
}

.email-detail-error {
  text-align: center;
  padding: 30px;
  color: #909399;
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
:deep(.el-tag) {
  font-size: 16px;
}
</style>

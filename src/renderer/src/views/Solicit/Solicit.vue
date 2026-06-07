<template>
  <div class="solicit-container">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="书法" name="2">
        <div class="tab-content">
          <div class="header">
            <el-input
              v-model="searchKeyword"
              placeholder="请输入搜索关键词"
              class="search-input"
              size="large"
              clearable
              @input="debouncedSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="filterExpired"
              placeholder="是否过期"
              size="large"
              clearable
              @change="handleSearch"
              style="width: 150px"
            >
              <el-option label="全部" value="" />
              <el-option label="未过期" value="0" />
              <el-option label="已过期" value="1" />
            </el-select>
            <el-date-picker
              v-model="filterDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="large"
              clearable
              @change="handleSearch"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
            <el-select
              v-model="filterStatus"
              placeholder="投稿状态"
              size="large"
              clearable
              @change="handleSearch"
              style="width: 150px"
            >
              <el-option label="全部" value="" />
              <el-option label="未入选" value="1" />
              <el-option label="入选" value="2" />
              <el-option label="未投稿" value="3" />
              <el-option label="已投稿" value="4" />
            </el-select>
            <el-button type="primary" size="large" @click="showAddDialog">
              <el-icon><Plus /></el-icon>新增
            </el-button>
          </div>
          <el-table
            :data="tableData"
            v-loading="loading"
            stripe
            style="width: 100%"
            :height="tableHeight"
          >
            <el-table-column type="index" :index="indexMethod" label="序号" width="60" />
            <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="time" label="时间" width="180" />
            <el-table-column label="是否过期" width="120">
              <template #default="scope">
                <el-tag :type="getRemainingDays(scope.row.time) < 0 ? 'danger' : 'success'">
                  {{ getExpiryText(scope.row.time) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="投稿状态" width="120">
              <template #default="scope">
                <div style="display: flex; align-items: center;">
                  <template v-if="scope.row.editingStatus !== undefined">
                    <el-select 
                      v-model="scope.row.editingStatus" 
                      @change="(value) => handleStatusChange(scope.row, value)"
                      @blur="scope.row.editingStatus = undefined"
                      size="small"
                      ref="statusSelect"
                      style="width: 100px;"
                      autofocus
                    >
                      <el-option label="未入选" value="1" />
                      <el-option label="入选" value="2" />
                      <el-option label="未投稿" value="3" />
                      <el-option label="已投稿" value="4" />
                    </el-select>
                  </template>
                  <template v-else>
                    <div 
                      style="width: 100%; cursor: pointer; display: inline-block;" 
                      @click="scope.row.editingStatus = scope.row.status"
                      :class="'status-' + String(scope.row.status)"
                    >
                      {{ getStatusLabel(scope.row.status) }}
                    </div>
                  </template>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="url" label="链接" min-width="200" show-overflow-tooltip>
              <template #default="scope">
                <a v-if="scope.row.url" :href="scope.row.url" target="_blank" class="url-link">
                  {{ scope.row.url }}
                </a>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
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
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="写作" name="1">
        <div class="tab-content">
          <div class="header">
            <el-input
              v-model="searchKeyword"
              placeholder="请输入搜索关键词"
              class="search-input"
              size="large"
              clearable
              @input="debouncedSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="filterExpired"
              placeholder="是否过期"
              size="large"
              clearable
              @change="handleSearch"
              style="width: 150px"
            >
              <el-option label="全部" value="" />
              <el-option label="未过期" value="0" />
              <el-option label="已过期" value="1" />
            </el-select>
            <el-date-picker
              v-model="filterDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="large"
              clearable
              @change="handleSearch"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
            <el-select
              v-model="filterStatus"
              placeholder="投稿状态"
              size="large"
              clearable
              @change="handleSearch"
              style="width: 150px"
            >
              <el-option label="全部" value="" />
              <el-option label="未入选" value="1" />
              <el-option label="入选" value="2" />
              <el-option label="未投稿" value="3" />
              <el-option label="已投稿" value="4" />
            </el-select>
            <el-button type="primary" size="large" @click="showAddDialog">
              <el-icon><Plus /></el-icon>新增
            </el-button>
          </div>
          <el-table
            :data="tableData"
            v-loading="loading"
            stripe
            style="width: 100%"
            :height="tableHeight"
          >
            <el-table-column type="index" :index="indexMethod" label="序号" width="60" />
            <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="time" label="时间" width="180" />
            <el-table-column label="是否过期" width="120">
              <template #default="scope">
                <el-tag :type="getRemainingDays(scope.row.time) < 0 ? 'danger' : 'success'">
                  {{ getExpiryText(scope.row.time) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="投稿状态" width="120">
              <template #default="scope">
                <div style="display: flex; align-items: center;">
                  <template v-if="scope.row.editingStatus !== undefined">
                    <el-select 
                      v-model="scope.row.editingStatus" 
                      @change="(value) => handleStatusChange(scope.row, value)"
                      @blur="scope.row.editingStatus = undefined"
                      size="small"
                      ref="statusSelect"
                      style="width: 100px;"
                      autofocus
                    >
                      <el-option label="未入选" value="1" />
                      <el-option label="入选" value="2" />
                      <el-option label="未投稿" value="3" />
                      <el-option label="已投稿" value="4" />
                    </el-select>
                  </template>
                  <template v-else>
                    <div 
                      style="width: 100%; cursor: pointer; display: inline-block;" 
                      @click="scope.row.editingStatus = scope.row.status"
                      :class="'status-' + String(scope.row.status)"
                    >
                      {{ getStatusLabel(scope.row.status) }}
                    </div>
                  </template>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="url" label="链接" min-width="200" show-overflow-tooltip>
              <template #default="scope">
                <a v-if="scope.row.url" :href="scope.row.url" target="_blank" class="url-link">
                  {{ scope.row.url }}
                </a>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
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
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑抽屉 -->
    <el-drawer
      v-model="dialogVisible"
      :title="isEdit ? '编辑' : '新增'"
      direction="rtl"
      size="500px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="10" placeholder="请输入内容" />
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="form.time"
            type="date"
            placeholder="选择时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="链接">
          <div style="display: flex; gap: 8px; width: 100%;">
            <el-input type="textarea" :rows="10" v-model="form.url" placeholder="请输入链接" style="flex: 1;" />
            <el-button type="success" :loading="aiLoading" @click="aiParse" style="height: 40px;">AI</el-button>
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="未入选" value="1" />
            <el-option label="入选" value="2" />
            <el-option label="未投稿" value="3" />
            <el-option label="已投稿" value="4" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script>
import { Search, Plus, Edit, Delete } from "@element-plus/icons-vue";
import { debounce } from "lodash";

export default {
  name: "Solicit",
  components: { Search, Plus, Edit, Delete },
  data() {
    return {
      activeTab: "2",
      tableData: [],
      loading: false,
      searchKeyword: "",
      filterExpired: "",
      filterDateRange: null,
      filterStatus: "",
      currentPage: 1,
      pageSize: 20,
      pagination: {
        total: 0,
        current: 1,
        pageNum: 20,
        totalPages: 0
      },
      dialogVisible: false,
      isEdit: false,
      form: {
        id: null,
        content: "",
        time: "",
        url: "",
        status: "3",
        type: "1",
      },
      aiLoading: false
    };
  },
  computed: {
    tableHeight() {
      return "calc(100vh - 230px)";
    }
  },
  created() {
    this.fetchData();
    this.debouncedSearch = debounce(this.handleSearch, 300);
  },
  beforeUnmount() {
    this.debouncedSearch?.cancel();
  },
  methods: {
    indexMethod(index) {
      return (this.currentPage - 1) * this.pageSize + index + 1;
    },
    handleTabChange(tab) {
      this.activeTab = tab;
      this.currentPage = 1;
      this.searchKeyword = "";
      this.filterExpired = "";
      this.filterDateRange = null;
      this.filterStatus = "";
      this.fetchData();
    },
    async handleStatusChange(row, newStatus) {
      try {
        await this.$axios.post("http://localhost:8000/api/solicit/update", {
          id: row.id,
          status: newStatus
        });
        // 更新成功后，更新行的状态（确保转换为字符串）
        row.status = String(newStatus);
        row.editingStatus = undefined;
        this.$message.success("状态更新成功");
      } catch (error) {
        console.error("状态更新失败:", error);
        this.$message.error("状态更新失败");
        // 如果更新失败，恢复原状态
        row.editingStatus = undefined;
      }
    },
    async fetchData() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          pageNum: this.pageSize,
          conditions: { type: this.activeTab },
          orderBy: { column: 'time', type: 'ASC' }
        };
        const res = await this.$axios.post("http://localhost:8000/api/solicit/get", params);
        if (res.data.result?.list) {
          const rawData = res.data.result.list;
          // Ensure status field exists and set proper structure for each row
          this.tableData = rawData.map(item => ({
            ...item,
            status: String(item.status || '1') // Convert to string for CSS classes
          }));
          this.pagination = {
            total: res.data.result.pagination.total,
            current: res.data.result.pagination.current,
            pageNum: res.data.result.pagination.pageNum,
            totalPages: res.data.result.pagination.totalPages
          };
        }
      } catch (error) {
        console.error("加载数据失败:", error);
        this.$message.error("加载数据失败");
      } finally {
        this.loading = false;
      }
    },
    async handleSearch() {
      this.currentPage = 1;
      this.loading = true;
      try {
        const conditions = { type: this.activeTab };
        
        // 关键词搜索
        if (this.searchKeyword.trim()) {
          conditions.content = this.searchKeyword.trim();
        }
        
        // 投稿状态筛选
        if (this.filterStatus) {
          conditions.status = this.filterStatus;
        }
        
        // 时间范围筛选
        if (this.filterDateRange && this.filterDateRange.length === 2) {
          conditions.startTime = this.filterDateRange[0];
          conditions.endTime = this.filterDateRange[1];
        }
        
        // 是否过期筛选
        if (this.filterExpired !== "") {
          conditions.expired = this.filterExpired;
        }
        
        const res = await this.$axios.post("http://localhost:8000/api/solicit/get", {
          page: this.currentPage,
          pageNum: this.pageSize,
          conditions,
          orderBy: { column: 'time', type: 'ASC' }
        });
        if (res.data.result?.list) {
          const rawData = res.data.result.list;
          // Ensure status field exists and set proper structure for each row
          this.tableData = rawData.map(item => ({
            ...item,
            status: String(item.status || '1') // Convert to string for CSS classes
          }));
          this.pagination = res.data.result.pagination;
        }
      } catch (error) {
        console.error("搜索失败:", error);
        this.$message.error("搜索失败");
      } finally {
        this.loading = false;
      }
    },
    showAddDialog() {
      this.isEdit = false;
      this.form = { id: null, content: "", time: "", url: "", type: this.activeTab, status: "3" };
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.isEdit = true;
      this.form = { ...row, type: this.activeTab, status: row.status || "1" };
      this.dialogVisible = true;
    },
    async handleSubmit() {
      if (!this.form.content) {
        this.$message.warning("请输入内容");
        return;
      }
      try {
        if (this.isEdit) {
          await this.$axios.post("http://localhost:8000/api/solicit/update", {
            id: this.form.id,
            content: this.form.content,
            time: this.form.time,
            url: this.form.url,
            type: this.activeTab,
            status: this.form.status
          });
          this.$message.success("更新成功");
        } else {
          await this.$axios.post("http://localhost:8000/api/solicit/add", {
            content: this.form.content,
            time: this.form.time,
            url: this.form.url,
            type: this.activeTab,
            status: this.form.status
          });
          this.$message.success("新增成功");
        }
        this.dialogVisible = false;
        this.fetchData();
      } catch (error) {
        console.error("保存失败:", error);
        this.$message.error("保存失败");
      }
    },
    async handleDelete(row) {
      try {
        await this.$confirm("确认删除该记录吗？", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        });
        await this.$axios.post("http://localhost:8000/api/solicit/delete", { id: row.id });
        this.$message.success("删除成功");
        this.fetchData();
      } catch (error) {
        if (error !== "cancel") {
          console.error("删除失败:", error);
          this.$message.error("删除失败");
        }
      }
    },
    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
      this.fetchData();
    },
    handleCurrentChange(val) {
      this.currentPage = val;
      this.fetchData();
    },
    resetForm() {
      this.form = { id: null, content: "", time: "", url: "", type: this.activeTab, status: "1" };
    },
    getStatusLabel(status) {
      const statusMap = {
        "1": "未入选",
        "2": "入选",
        "3": "未投稿",
        "4": "已投稿"
      };
      return statusMap[status] || "未知";
    },
    getStatusTagType(status) {
      const typeMap = {
        "1": "info",
        "2": "success",
        "3": "warning",
        "4": "primary"
      };
      return typeMap[status] || "info";
    },
    isExpired(time) {
      if (!time) return false;
      const targetDate = new Date(time);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return targetDate < today;
    },
    getRemainingDays(time) {
      if (!time) return 0;
      const targetDate = new Date(time);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    },
    getExpiryText(time) {
      if (!time) return '无日期';
      const days = this.getRemainingDays(time);
      if (days < 0) {
        return '已过期';
      } else if (days === 0) {
        return '今天到期';
      } else {
        return `${days}天`;
      }
    },
    async aiParse() {
      if (!this.form.url) {
        this.$message.warning("请先输入链接");
        return;
      }
      this.aiLoading = true;
      try {
        const tokenRes = await this.$axios.post('http://localhost:8000/api/token/getCookieByUrl', { url: 'ds' });
        const dsToken = tokenRes?.data?.data?.cookie || '';
        if (!dsToken) throw new Error('未配置 DeepSeek Token');

        const res = await this.$axios.post("http://localhost:8000/api/ds/solicitAichat", {
          url: this.form.url,
          token: dsToken
        });
        if (res.data.code === 200 && res.data.data) {
          const { content, time } = res.data.data;
          if (content) this.form.content = content;
          if (time) this.form.time = time;
          this.$message.success("AI 解析成功");
        } else {
          this.$message.error(res.data.message || "AI 解析失败");
        }
      } catch (error) {
        console.error("AI 解析失败:", error);
        this.$message.error("AI 解析失败");
      } finally {
        this.aiLoading = false;
      }
    },
    getStatusColor(status) {
      // 已投稿 (4) = red, 未投稿 (3) = green
      switch (status) {
        case 3: return '#67c23a'; // 未投稿 - green
        case 4: return '#f56c6c'; // 已投稿 - red
        case 1: return '#909399'; // 未入选 - gray
        case 2: return '#409EFF'; // 入选 - blue
        default: return '#606266'; // 其他状态 - 默认gray
      }
    }
  }
};
</script>

<style scoped>
.solicit-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}
.tab-content {
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-self:flex-start
}
.search-input {
  width: 300px;
}
.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}
.url-link {
  color: #8b9a6d;
  text-decoration: none;
}
.url-link:hover {
  text-decoration: underline;
  color: #7a895c;
}

/* 状态样式 */
.status-1 {
  color: #9a9590; /* 未入选 - gray */
  font-weight: 500;
}
.status-2 {
  color: #8b9a6d; /* 入选 - green */
  font-weight: 500;
}
.status-3 {
  color: #8b9a6d; /* 未投稿 - green */
  font-weight: 500;
}
.status-4 {
  color: #e8686a; /* 已投稿 - red */
  font-weight: 500;
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

/* Tabs 样式 */
:deep(.el-tabs__item.is-active) {
  color: #8b9a6d;
}
:deep(.el-tabs__active-bar) {
  background-color: #8b9a6d;
}
:deep(.el-tabs__item:hover) {
  color: #7a895c;
}
</style>

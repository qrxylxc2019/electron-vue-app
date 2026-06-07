<template>
  <div class="prompt-container">
    <!-- 搜索区域 -->
    <div class="search-area">
      <el-button type="primary" :size="'large'" @click="handleAdd"
        >新增语言</el-button
      >
      <el-select
        v-model="searchType"
        placeholder="请选择类型"
        clearable
        size="large"
        style="width: 150px"
      >
        <el-option :value="0" label="所有" />
        <el-option :value="1" label="粤语" />
        <el-option :value="2" label="潮汕话" />
      </el-select>
      <el-input
        v-model="searchQuery"
        placeholder="请输入语言关键字"
        class="search-input"
        @input="handleSearch"
        style="width: 200px"
        clearable
        size="large"
      />
    </div>

    <!-- 列表区域 -->
    <el-table
      height="600px"
      v-loading="tableLoading"
      :data="eloquenceList"
      stripe
      style="width: 100%"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="content" label="语言">
        <template #default="scope">
          <div class="content-cell">{{ scope.row.yuyan }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="普通话">
        <template #default="scope">
          <div class="content-cell">{{ scope.row.common }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="120">
        <template #default="scope">
          <span>{{ scope.row.type === 1 ? "粤语" : "潮汕话" }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280">
        <template #default="scope">
          <el-button
            type="primary"
            :size="'large'"
            @click="handleEdit(scope.row)"
            >编辑</el-button
          >
          <el-button
            type="danger"
            :size="'large'"
            @click="handleDelete(scope.row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <el-pagination
      style="margin-top: 20px"
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @current-change="handlePageChange"
    />

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增语言' : '编辑语言'"
      width="50%"
    >
      <el-form :model="eloquenceForm" label-width="80px">
        <el-form-item label="类型">
          <el-select
            v-model="eloquenceForm.type"
            size="large"
            style="width: 100%"
          >
            <el-option :value="1" label="粤语" />
            <el-option :value="2" label="潮汕话" />
          </el-select>
        </el-form-item>
        <el-form-item label="语言">
          <el-input
            size="large"
            style="font-size: 20px"
            v-model="eloquenceForm.yuyan"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="普通话">
          <el-input
            size="large"
            style="font-size: 20px"
            v-model="eloquenceForm.common"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :size="'large'" @click="dialogVisible = false"
            >取消</el-button
          >
          <el-button :size="'large'" type="primary" @click="handleSubmit"
            >确定</el-button
          >
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ipcApiRoute } from "@/api/main";

export default {
  name: "Eloquence",

  data() {
    return {
      searchQuery: "",
      eloquenceList: [],
      currentPage: 1,
      pageSize: 10,
      total: 0,
      dialogVisible: false,
      dialogType: "add",
      eloquenceForm: {
        title: "",
        content: "",
        type: 1,
      },
      tableLoading: false,
      searchType: 0,
    };
  },

  created() {
    this.getEloquenceList();
  },

  watch: {
    searchType: {
      handler(newVal) {
        this.currentPage = 1;
        this.getEloquenceList();
      },
    },
  },

  methods: {
    // 获取语言列表
    async getEloquenceList() {
      this.tableLoading = true;
      try {
        const params = {
          action: "get",
          table: "yuyan",
          conditions: {
            yuyan: this.searchQuery
              ? {
                  $like: `%${this.searchQuery}%`,
                }
              : "",
            ...(this.searchType ? { type: this.searchType } : {}),
          },
          page: this.currentPage,
          pageNum: this.pageSize,
          orderBy: {
            column: "id",
            type: "desc",
          },
        };
        console.log(params, "params");
        const res = await this.$ipc.invoke(
          ipcApiRoute.sqlitedbOperation,
          params
        );
        this.eloquenceList = res.result.list || [];
        console.log(res.result.list, "promptList");
        this.total = res.result.pagination.total || 0;
      } catch (error) {
        this.$message.error("获取列表失败");
      } finally {
        this.tableLoading = false;
      }
    },

    // 搜索
    handleSearch() {
      this.currentPage = 1;
      this.getEloquenceList();
    },

    // 新增
    handleAdd() {
      this.dialogType = "add";
      this.eloquenceForm = { title: "", content: "", type: 1 };
      this.dialogVisible = true;
    },

    // 编辑
    handleEdit(row) {
      this.dialogType = "edit";
      this.eloquenceForm = { ...row };
      this.dialogVisible = true;
    },

    // 删除
    async handleDelete(row) {
      this.$confirm("确认删除该语言?", "提示", {
        type: "warning",
      }).then(async () => {
        this.tableLoading = true;
        try {
          const params = {
            action: "delete",
            table: "yuyan",
            where: {
              id: row.id,
            },
          };
          await this.$ipc.invoke(ipcApiRoute.sqlitedbOperation, params);
          this.$message.success("删除成功");
          this.getEloquenceList();
        } catch (error) {
          this.$message.error("删除失败");
        } finally {
          this.tableLoading = false;
        }
      });
    },

    // 提交表单
    async handleSubmit() {
      this.tableLoading = true;
      try {
        const params = {
          action: this.dialogType === "add" ? "add" : "update",
          table: "yuyan",
          conditions: {
            yuyan: this.eloquenceForm.yuyan,
            common: this.eloquenceForm.common,
            type: this.eloquenceForm.type,
          },
        };

        console.log(params, "params");

        if (this.dialogType === "edit") {
          params.where = {
            id: this.eloquenceForm.id,
          };
        }

        await this.$ipc.invoke(ipcApiRoute.sqlitedbOperation, params);
        this.$message.success(
          this.dialogType === "add" ? "新增成功" : "更新成功"
        );
        this.dialogVisible = false;
        this.getEloquenceList();
      } catch (error) {
        this.$message.error(
          this.dialogType === "add" ? "新增失败" : "更新失败"
        );
      } finally {
        this.tableLoading = false;
      }
    },

    // 页码改变
    handlePageChange(newPage) {
      this.currentPage = newPage;
      this.getEloquenceList();
    },
  },
};
</script>

<style scoped>
.prompt-container {
  padding: 20px;
}
.search-area {
  display: flex;
  margin-bottom: 20px;
  gap: 10px;
}
.search-input {
  width: 300px;
}

.prompt-container {
  padding: 20px;
  font-size: 20px;
}
.search-area {
  display: flex;
  margin-bottom: 20px;
  gap: 10px;
}
.search-input {
  width: 300px;
  :deep(input) {
    font-size: 20px;
  }
}

/* 添加深度选择器来修改 Element Plus 组件的字体大小 */
:deep(.el-button) {
  font-size: 20px;
}

:deep(.el-table) {
  font-size: 20px;
}

:deep(.el-pagination) {
  font-size: 20px;
}

:deep(.el-dialog) {
  font-size: 20px;
}

.content-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>

<template>
  <div class="prompt-container">
    <!-- 搜索区域 -->
    <div class="search-area">
      <el-button type="primary" :size="'large'" @click="handleAdd"
        >新增编程</el-button
      >
      <el-select
        v-model="searchType"
        placeholder="请选择类型"
        clearable
        size="large"
        style="width: 150px"
      >
        <el-option :value="0" label="所有" />
        <el-option :value="1" label="java" />
        <el-option :value="2" label="js" />
        <el-option :value="3" label="python" />
      </el-select>
      <el-input
        v-model="searchQuery"
        placeholder="请输入编程关键字"
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
      <el-table-column prop="content" label="标题">
        <template #default="scope">
          <div class="content-cell">{{ scope.row.title }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="120">
        <template #default="scope">
          <span>{{
            scope.row.type === 1
              ? "java"
              : scope.row.type === 2
              ? "js"
              : scope.row.type === 3
              ? "python"
              : "未知"
          }}</span>
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
      :title="dialogType === 'add' ? '新增编程' : '编辑编程'"
      width="50%"
    >
      <el-form :model="eloquenceForm" label-width="80px">
        <el-form-item label="类型">
          <el-select
            v-model="eloquenceForm.type"
            size="large"
            style="width: 100%"
          >
            <el-option :value="1" label="java" />
            <el-option :value="2" label="js" />
            <el-option :value="3" label="python" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input
            size="large"
            style="font-size: 20px"
            v-model="eloquenceForm.title"
          />
        </el-form-item>
        <el-form-item label="内容">
          <div ref="editorContainer" class="editor-container"></div>
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
import WangEditor from "wangeditor";

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
      editor: null,
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

  mounted() {
    // 移除这里的编辑器初始化代码
  },

  methods: {
    // 获取语言列表
    async getEloquenceList() {
      this.tableLoading = true;
      try {
        const params = {
          action: "get",
          table: "program",
          conditions: {
            title: this.searchQuery
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
      this.eloquenceForm = { title: "", type: 1 };
      this.dialogVisible = true;
      this.$nextTick(() => {
        this.initEditor();
      });
    },

    // 编辑
    handleEdit(row) {
      this.dialogType = "edit";
      this.eloquenceForm = { ...row };
      this.dialogVisible = true;
      this.$nextTick(() => {
        this.initEditor();
        this.editor.txt.html(row.content || "");
      });
    },

    // 删除
    async handleDelete(row) {
      this.$confirm("确认删除该编程?", "提示", {
        type: "warning",
      }).then(async () => {
        this.tableLoading = true;
        try {
          const params = {
            action: "delete",
            table: "program",
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
        const editorContent = this.editor.txt.html();
        const params = {
          action: this.dialogType === "add" ? "add" : "update",
          table: "program",
          conditions: {
            title: this.eloquenceForm.title,
            content: editorContent,
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

    // 添加新方法
    initEditor() {
      // 如果已存在编辑器实例，先销毁
      if (this.editor) {
        this.editor.destroy();
      }

      this.editor = new WangEditor(this.$refs.editorContainer);
      this.editor.config.menus = [
        "bold",
        "fontSize",
        "italic",
        "underline",
        "code",
        "undo",
        "redo",
        "clear",
        "image",
      ];

      this.editor.config.uploadImgShowBase64 = true;
      this.editor.config.pasteIgnoreImg = false;
      this.editor.config.height = 300;
      this.editor.config.placeholder = "请填写内容";

      this.editor.create();
      this.editor.cmd.do("fontSize", "20px");
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
  margin-top: 20px;
}

.editor-container {
  height: 300px;
  margin-top: 10px;
  width: 100%;
}

:deep(.w-e-text-container) {
  height: 300px;
}
</style>

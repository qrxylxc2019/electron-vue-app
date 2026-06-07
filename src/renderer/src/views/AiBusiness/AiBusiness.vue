<template>
  <div class="aibusiness-container">
    <div class="header">
      <el-input
        v-model="searchKeyword"
        placeholder="请输入搜索关键词"
        class="search-input"
        size="large"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" @click="showAddDialog">
        <el-icon><Plus /></el-icon>新增
      </el-button>
    </div>

    <el-table :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="title" label="商机" min-width="200" show-overflow-tooltip />
      <el-table-column prop="material" label="材料" min-width="300" show-overflow-tooltip />
      <el-table-column label="操作" width="350" fixed="right">
        <template #default="scope">
          <el-button type="warning"  @click="aiAnalyze(scope.row)">
            AI分析
          </el-button>
          <el-button type="primary"  @click="handleEdit(scope.row)">
            <el-icon><Edit /></el-icon>编辑
          </el-button>
          <el-button type="danger"  @click="handleDelete(scope.row)">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑抽屉 -->
    <el-drawer v-model="dialogVisible" :title="isEdit ? '编辑商机' : '新增商机'" direction="rtl" size="500px" @close="resetForm">
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="商机">
          <el-input v-model="form.title" placeholder="请输入商机名称" />
        </el-form-item>
        <el-form-item label="材料">
          <el-input v-model="form.material" type="textarea" :rows="6" placeholder="请输入材料描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>

    <!-- AI 分析弹窗 -->
    <el-dialog v-model="aiDialogVisible" title="🤖 AI 商机分析" width="800px" destroy-on-close>
      <div class="ai-dialog-content" ref="aiDialogRef">
        <div v-if="aiResult" v-html="renderedMarkdown"></div>
        <div v-else-if="aiLoading" style="text-align: center; color: #999; padding: 40px;">AI 正在分析中...</div>
        <div v-else style="text-align: center; color: #999; padding: 40px;">等待分析结果</div>
        <span v-if="aiLoading" class="typing-cursor">|</span>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { Search, Plus, Edit, Delete, MagicStick } from "@element-plus/icons-vue";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
let idCounter = 100;

export default {
  name: "AiBusiness",
  components: { Search, Plus, Edit, Delete, MagicStick },
  data() {
    return {
      searchKeyword: "",
      loading: false,
      tableData: [
        { id: 1, title: "跨境电商平台", material: "客户需要支持多语言多币种的跨境电商平台，预算120万，已初步沟通技术方案" },
      ],
      dialogVisible: false,
      isEdit: false,
      form: { id: null, title: "", material: "" },
      aiDialogVisible: false,
      aiLoading: false,
      aiResult: "",
    };
  },
  computed: {
    tableHeight() { return "calc(100vh - 180px)"; },
    filteredData() {
      return this.tableData.filter((r) => {
        const kw = this.searchKeyword.trim().toLowerCase();
        return !kw || r.title.toLowerCase().includes(kw) || r.material.toLowerCase().includes(kw);
      });
    },
    renderedMarkdown() { return md.render(this.aiResult || ""); },
  },
  methods: {
    handleSearch() {},
    showAddDialog() {
      this.isEdit = false;
      this.form = { id: null, title: "", material: "" };
      this.dialogVisible = true;
    },
    handleEdit(row) { this.isEdit = true; this.form = { ...row }; this.dialogVisible = true; },
    handleSubmit() {
      if (!this.form.title) { this.$message.warning("请输入商机名称"); return; }
      if (this.isEdit) {
        const idx = this.tableData.findIndex((r) => r.id === this.form.id);
        if (idx !== -1) this.tableData.splice(idx, 1, { ...this.form });
        this.$message.success("更新成功");
      } else {
        this.tableData.unshift({ ...this.form, id: ++idCounter });
        this.$message.success("新增成功");
      }
      this.dialogVisible = false;
    },
    handleDelete(row) {
      this.$confirm("确认删除该商机吗？", "提示", { type: "warning" }).then(() => {
        this.tableData = this.tableData.filter((r) => r.id !== row.id);
        this.$message.success("删除成功");
      }).catch(() => {});
    },
    resetForm() { this.form = { id: null, title: "", material: "" }; },
    async aiAnalyze(row) {
      this.aiDialogVisible = true;
      this.aiLoading = true;
      this.aiResult = "";
      const prompt = `请对以下商机进行详细分析，请用markdown格式输出：\n\n商机名称：${row.title}\n材料信息：${row.material}\n\n请从以下角度分析：\n1. 商机价值评估\n2. 成交概率预测\n3. 跟进策略建议\n4. 潜在风险提示\n5. 推荐的下一步行动`;
      try {
        const tokenRes = await this.$axios.post('http://localhost:8000/api/token/getCookieByUrl', { url: 'ds' });
        const dsToken = tokenRes?.data?.data?.cookie || '';
        if (!dsToken) throw new Error('未配置 DeepSeek Token');

        const response = await fetch("http://localhost:8000/api/ds/aichat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, token: dsToken }),
        });
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                this.aiResult += parsed.content;
                this.$nextTick(() => { const el = this.$refs.aiDialogRef; if (el) el.scrollTop = el.scrollHeight; });
              }
              if (parsed.error) { this.aiResult += "\n❌ 错误: " + parsed.error; }
            } catch (e) { /* skip */ }
          }
        }
      } catch (err) {
        this.aiResult += "\n❌ 请求失败: " + err.message;
      } finally {
        this.aiLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.aibusiness-container {
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
  align-self: flex-start;
}
.search-input { width: 300px; }
.ai-dialog-content {
  max-height: 65vh;
  overflow-y: auto;
  font-size: 15px;
  line-height: 1.8;
}
.typing-cursor { animation: blink 0.7s infinite; font-weight: bold; color: #409eff; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.ai-dialog-content :deep(h1), .ai-dialog-content :deep(h2), .ai-dialog-content :deep(h3) { margin: 12px 0 8px; color: #303133; }
.ai-dialog-content :deep(h1) { font-size: 20px; }
.ai-dialog-content :deep(h2) { font-size: 17px; }
.ai-dialog-content :deep(h3) { font-size: 15px; }
.ai-dialog-content :deep(p) { margin: 6px 0; }
.ai-dialog-content :deep(ul), .ai-dialog-content :deep(ol) { padding-left: 20px; margin: 6px 0; }
.ai-dialog-content :deep(li) { margin: 4px 0; }
.ai-dialog-content :deep(code) { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
.ai-dialog-content :deep(pre) { background: #2d2d2d; color: #f8f8f2; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
.ai-dialog-content :deep(pre code) { background: none; color: inherit; padding: 0; }
.ai-dialog-content :deep(blockquote) { border-left: 4px solid #409eff; padding: 8px 12px; margin: 8px 0; background: #ecf5ff; color: #606266; }
.ai-dialog-content :deep(table) { border-collapse: collapse; width: 100%; margin: 8px 0; }
.ai-dialog-content :deep(th), .ai-dialog-content :deep(td) { border: 1px solid #dcdfe6; padding: 6px 10px; text-align: left; }
.ai-dialog-content :deep(th) { background: #f5f7fa; font-weight: 600; }
.ai-dialog-content :deep(strong) { color: #303133; }
.ai-dialog-content :deep(hr) { border: none; border-top: 1px solid #e4e7ed; margin: 12px 0; }
/* Commerce 风格表格 */
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

/* 主要按钮样式 - 深绿色 */
:deep(.el-button--primary) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  border-radius: 10px;
}

:deep(.el-button--primary:hover) {
  background-color: #7a895c;
  border-color: #7a895c;
}

/* 警告按钮样式 */
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

/* 危险按钮样式 */
:deep(.el-button--danger) {
  background-color: #e8686a;
  border-color: #e8686a;
  border-radius: 10px;
}

:deep(.el-button--danger:hover) {
  background-color: #d8585a;
  border-color: #d8585a;
}

/* 搜索输入框样式 */
:deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border-radius: 10px;
  box-shadow: none !important;
  border: 1px solid #e8e4df !important;
}

:deep(.el-input__wrapper:hover) {
  border-color: #c4a882 !important;
  box-shadow: none !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882 !important;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}
</style>

<template>
  <div class="decision-container">
    <div class="header">
      <el-input
        v-model="searchKeyword"
        placeholder="请输入搜索关键词"
        class="search-input"
        size="large"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" @click="showAddDialog">
        <el-icon><Plus /></el-icon>新增
      </el-button>
    </div>

    <el-table :data="filteredData" stripe style="width: 100%" :height="tableHeight">
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column prop="title" label="决策标题" min-width="180" show-overflow-tooltip />
      <el-table-column label="选项概览" min-width="260" show-overflow-tooltip>
        <template #default="scope">
          <el-tag v-for="(opt, i) in scope.row.options" :key="i" style="margin-right: 6px;" size="large">
            {{ opt.name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="scope">
          <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="390" >
        <template #default="scope">
          <el-button type="success"  @click="openCompare(scope.row)">
            <el-icon><Switch /></el-icon>对比
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
    <el-drawer v-model="dialogVisible" :title="isEdit ? '编辑决策' : '新增决策'" direction="rtl" size="600px" @close="resetForm">
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入决策标题" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待决策" value="待决策" />
            <el-option label="已决策" value="已决策" />
            <el-option label="已搁置" value="已搁置" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注" />
        </el-form-item>
        <!-- 动态选项 -->
        <el-divider content-position="left">对比选项</el-divider>
        <div v-for="(opt, oi) in form.options" :key="oi" class="option-card">
          <div class="option-card-header">
            <span class="option-label">选项 {{ oi + 1 }}</span>
            <el-button type="danger" link size="small" @click="removeOption(oi)" :disabled="form.options.length <= 2">
              <el-icon><Delete /></el-icon>删除选项
            </el-button>
          </div>
          <el-input v-model="opt.name" placeholder="选项名称" style="margin-bottom: 8px;" />
          <div v-for="(desc, di) in opt.descs" :key="di" style="display: flex; gap: 6px; margin-bottom: 6px;">
            <el-input v-model="opt.descs[di]" placeholder="描述信息" />
            <el-button type="danger" link @click="opt.descs.splice(di, 1)" :disabled="opt.descs.length <= 1">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <el-button type="primary" link size="small" @click="opt.descs.push('')">
            <el-icon><Plus /></el-icon>添加描述
          </el-button>
        </div>
        <el-button type="success" style="width: 100%; margin-top: 10px;" @click="addOption">
          <el-icon><Plus /></el-icon>添加选项
        </el-button>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>

    <!-- 对比弹窗 - 左右布局 -->
    <el-dialog v-model="compareVisible" title="对比分析" width="90%" top="3vh" destroy-on-close>
      <div class="compare-layout">
        <!-- 左侧：选项卡片 -->
        <div class="compare-left">
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 16px; font-weight: 600;">{{ compareRow?.title }}</span>
            <el-button type="warning" :loading="aiLoading" @click="aiCompare">
              AI对比
            </el-button>
          </div>
          <div class="options-grid">
            <div v-for="(opt, oi) in compareRow?.options" :key="oi" class="compare-option-card">
              <div class="compare-option-title">选项 {{ oi + 1 }}：{{ opt.name }}</div>
              <div class="compare-option-descs">
                <div v-for="(desc, di) in opt.descs" :key="di" class="desc-item">
                  <span class="desc-bullet">•</span>
                  <span>{{ desc }}</span>
                  <el-button type="danger" link size="small" class="desc-delete-btn" @click="removeCompareDesc(oi, di)">
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>
                <div v-if="!opt.descs || opt.descs.filter(d => d).length === 0" class="desc-empty">暂无描述</div>
              </div>
              <div class="compare-extra-input">
                <el-input v-model="compareInputText[oi]" type="textarea" :rows="3" placeholder="输入补充描述，点击右侧按钮添加" />
                <el-button type="primary" :disabled="!compareInputText[oi]?.trim()" @click="submitExtraDesc(oi)" style="margin-top: 6px;">
                  <el-icon><Plus /></el-icon>补充描述
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <!-- 右侧：AI 分析结果 -->
        <div class="compare-right">
          <div class="ai-result-box">
            <div class="ai-result-header">
              <span>🤖 AI 分析结果</span>
              <el-button v-if="!aiLoading && aiResult" type="info" link size="small" @click="aiResult = ''">清除</el-button>
            </div>
            <div class="ai-result-content" ref="aiResultRef">
              <div v-if="aiResult" v-html="renderedMarkdown"></div>
              <div v-else class="ai-placeholder">点击「AI对比」按钮，AI 将从多个维度分析各选项的优劣并给出建议</div>
              <span v-if="aiLoading" class="typing-cursor">|</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { Search, Plus, Edit, Delete, Switch, MagicStick, Close } from "@element-plus/icons-vue";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
let idCounter = 100;

function makeOption(name = "", descs = [""]) {
  return { name, descs: [...descs] };
}

export default {
  name: "Decision",
  components: { Search, Plus, Edit, Delete, Switch, MagicStick, Close },
  data() {
    return {
      searchKeyword: "",
      tableData: [
        {
          id: 1, title: "技术选型：前端框架", status: "待决策", time: "2026-03-01", remark: "前端框架选型",
          options: [
            { name: "Vue3 + Element Plus", descs: ["生态丰富", "学习曲线平缓", "中文社区活跃"] },
            { name: "Svelte + Skeleton", descs: ["编译时框架", "包体积小", "性能极佳"] },
          ],
        }
      ],
      dialogVisible: false,
      isEdit: false,
      form: {
        id: null, title: "", status: "待决策", remark: "",
        options: [makeOption(), makeOption()],
      },
      compareVisible: false,
      compareRow: null,
      compareInputText: [],
      aiLoading: false,
      aiResult: "",
    };
  },
  computed: {
    tableHeight() { return "calc(100vh - 160px)"; },
    filteredData() {
      if (!this.searchKeyword.trim()) return this.tableData;
      const kw = this.searchKeyword.trim().toLowerCase();
      return this.tableData.filter((r) =>
        r.title.toLowerCase().includes(kw) ||
        r.options.some((o) => o.name.toLowerCase().includes(kw))
      );
    },
    renderedMarkdown() { return md.render(this.aiResult || ""); },
  },
  methods: {
    statusTagType(s) { return { "待决策": "warning", "已决策": "success", "已搁置": "info" }[s] || "info"; },
    // 表单选项操作
    addOption() { this.form.options.push(makeOption()); },
    removeOption(i) { if (this.form.options.length > 2) this.form.options.splice(i, 1); },
    // CRUD
    showAddDialog() {
      this.isEdit = false;
      this.form = { id: null, title: "", status: "待决策", remark: "", options: [makeOption(), makeOption()] };
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.isEdit = true;
      this.form = {
        id: row.id, title: row.title, status: row.status, remark: row.remark,
        options: row.options.map((o) => ({ name: o.name, descs: [...o.descs] })),
      };
      this.dialogVisible = true;
    },
    handleSubmit() {
      if (!this.form.title) { this.$message.warning("请输入决策标题"); return; }
      const validOpts = this.form.options.filter((o) => o.name.trim());
      if (validOpts.length < 2) { this.$message.warning("至少需要两个有效选项"); return; }
      const cleanOpts = validOpts.map((o) => ({ name: o.name.trim(), descs: o.descs.filter((d) => d.trim()) }));
      if (this.isEdit) {
        const idx = this.tableData.findIndex((r) => r.id === this.form.id);
        if (idx !== -1) {
          this.tableData.splice(idx, 1, { ...this.form, options: cleanOpts });
        }
        this.$message.success("更新成功");
      } else {
        this.tableData.unshift({ ...this.form, id: ++idCounter, time: new Date().toISOString().slice(0, 10), options: cleanOpts });
        this.$message.success("新增成功");
      }
      this.dialogVisible = false;
    },
    handleDelete(row) {
      this.$confirm("确认删除该决策吗？", "提示", { type: "warning" }).then(() => {
        this.tableData = this.tableData.filter((r) => r.id !== row.id);
        this.$message.success("删除成功");
      }).catch(() => {});
    },
    resetForm() {
      this.form = { id: null, title: "", status: "待决策", remark: "", options: [makeOption(), makeOption()] };
    },
    // 对比
    openCompare(row) {
      this.compareRow = JSON.parse(JSON.stringify(row));
      this.compareInputText = row.options.map(() => "");
      this.aiResult = "";
      this.compareVisible = true;
    },
    submitExtraDesc(oi) {
      const text = (this.compareInputText[oi] || "").trim();
      if (!text) return;
      this.compareRow.options[oi].descs.push(text);
      this.compareInputText[oi] = "";
    },
    removeCompareDesc(oi, di) {
      this.compareRow.options[oi].descs.splice(di, 1);
    },
    // AI 对比
    async aiCompare() {
      if (!this.compareRow) return;
      this.aiLoading = true;
      this.aiResult = "";
      // 构建提示词，包含所有选项及描述
      let optionsText = "";
      this.compareRow.options.forEach((opt, i) => {
        optionsText += `\n选项${i + 1}：${opt.name}\n`;
        if (opt.descs && opt.descs.length) {
          optionsText += opt.descs.map((d) => `  - ${d}`).join("\n") + "\n";
        }
      });
      const prompt = `请对以下决策的多个选项进行详细对比分析，并给出你的推荐建议，请用markdown格式输出：\n\n决策主题：${this.compareRow.title}\n${this.compareRow.remark ? "备注：" + this.compareRow.remark + "\n" : ""}${optionsText}\n请从多个角度（如成本、性能、可维护性、学习曲线、生态等）分析各选项的优劣，最后给出明确的推荐建议。`;
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
                this.$nextTick(() => { const el = this.$refs.aiResultRef; if (el) el.scrollTop = el.scrollHeight; });
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
.decision-container {
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
  align-self: flex-start;
}
.search-input { width: 300px; }

/* 新增/编辑 - 选项卡片 */
.option-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
  background: #fafafa;
}
.option-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.option-label {
  font-size: 15px;
  font-weight: 600;
  color: #409eff;
}

/* 对比弹窗左右布局 */
.compare-layout {
  display: flex;
  gap: 20px;
  height: 75vh;
}
.compare-left {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
.compare-right {
  width: 450px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.compare-option-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: #fafbfc;
}
.compare-option-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
}
.compare-option-descs { margin-bottom: 10px; }
.desc-bullet { color: #409eff; margin-right: 4px; }
.desc-empty { color: #c0c4cc; font-size: 13px; }
.compare-extra-input {
  border-top: 1px dashed #dcdfe6;
  padding-top: 10px;
  margin-top: 8px;
}
.desc-item {
  font-size: 14px;
  color: #606266;
  line-height: 2;
  display: flex;
  align-items: center;
  gap: 4px;
}
.desc-delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: auto;
}
.desc-item:hover .desc-delete-btn {
  opacity: 1;
}
/* AI 结果 */
.ai-result-box {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.ai-result-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.ai-result-header .el-button { color: #fff !important; }
.ai-result-content {
  padding: 16px;
  font-size: 14px;
  line-height: 1.8;
  flex: 1;
  overflow-y: auto;
  background: #fafafa;
}
.ai-placeholder { color: #999; text-align: center; margin-top: 40px; font-size: 14px; }
.typing-cursor { animation: blink 0.7s infinite; font-weight: bold; color: #409eff; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* markdown */
.ai-result-content :deep(h1), .ai-result-content :deep(h2), .ai-result-content :deep(h3) { margin: 12px 0 8px; color: #303133; }
.ai-result-content :deep(h1) { font-size: 20px; }
.ai-result-content :deep(h2) { font-size: 17px; }
.ai-result-content :deep(h3) { font-size: 15px; }
.ai-result-content :deep(p) { margin: 6px 0; }
.ai-result-content :deep(ul), .ai-result-content :deep(ol) { padding-left: 20px; margin: 6px 0; }
.ai-result-content :deep(li) { margin: 4px 0; }
.ai-result-content :deep(code) { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
.ai-result-content :deep(pre) { background: #2d2d2d; color: #f8f8f2; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
.ai-result-content :deep(pre code) { background: none; color: inherit; padding: 0; }
.ai-result-content :deep(blockquote) { border-left: 4px solid #409eff; padding: 8px 12px; margin: 8px 0; background: #ecf5ff; color: #606266; }
.ai-result-content :deep(table) { border-collapse: collapse; width: 100%; margin: 8px 0; }
.ai-result-content :deep(th), .ai-result-content :deep(td) { border: 1px solid #dcdfe6; padding: 6px 10px; text-align: left; }
.ai-result-content :deep(th) { background: #f5f7fa; font-weight: 600; }
.ai-result-content :deep(strong) { color: #303133; }
.ai-result-content :deep(hr) { border: none; border-top: 1px solid #e4e7ed; margin: 12px 0; }

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

/* 成功按钮样式 */
:deep(.el-button--success) {
  background-color: #5db872;
  border-color: #5db872;
  border-radius: 10px;
}

:deep(.el-button--success:hover) {
  background-color: #4ca861;
  border-color: #4ca861;
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

/* 信息按钮样式 */
:deep(.el-button--info) {
  background-color: #9a9590;
  border-color: #9a9590;
  border-radius: 10px;
}

:deep(.el-button--info:hover) {
  background-color: #8a8580;
  border-color: #8a8580;
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

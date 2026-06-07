<template>
  <div class="loupan-container">
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
          v-model="filterStatus"
          placeholder="状态"
          size="large"
          clearable
          @change="handleSearch"
          style="width: 150px"
        >
          <el-option label="全部" value="" />
          <el-option label="在售" value="1" />
          <el-option label="待售" value="2" />
          <el-option label="售罄" value="3" />
        </el-select>
        <el-button type="primary" size="large" @click="showAddDialog">
          <el-icon><Plus /></el-icon>新增
        </el-button>
      </div>
      <!-- AI 对比栏 -->
      <div v-if="aiCompareList.length" class="ai-compare-bar">
        <div class="ai-compare-items">
          <el-tag
            v-for="(item, i) in aiCompareList.slice(0, showAllAi ? aiCompareList.length : 2)"
            :key="item.id"
            closable
            size="large"
            type="warning"
            @close="aiCompareList.splice(i, 1)"
            style="margin-right: 8px;"
          >
            {{ item.name }}（{{ item.price }}）
          </el-tag>
          <el-button v-if="aiCompareList.length > 2 && !showAllAi" type="info" link size="small" @click="showAllAi = true">
            显示更多（共{{ aiCompareList.length }}条）
          </el-button>
          <el-button v-if="showAllAi && aiCompareList.length > 2" type="info" link size="small" @click="showAllAi = false">
            收起
          </el-button>
        </div>
        <div style="display: flex; gap: 8px;">
          <el-button type="warning" :loading="aiLoading" @click="openAiCompare" :disabled="aiCompareList.length < 2">
            AI对比（{{ aiCompareList.length }}）
          </el-button>
          <el-button type="danger" link @click="aiCompareList = []; showAllAi = false;">清空</el-button>
        </div>
      </div>
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        style="width: 100%"
        :height="tableHeight"
      >
        <el-table-column prop="name" label="楼盘名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="city" label="城市" width="100" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="150" />
        <el-table-column prop="age" label="年龄" width="100" />
        <el-table-column prop="advantage" label="优点" min-width="200" show-overflow-tooltip />
        <el-table-column label="一手" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.is_first === '1' ? 'success' : 'warning'">
              {{ scope.row.is_first === '1' ? '一手' : '二手' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <div style="display: flex; align-items: center;">
              <template v-if="scope.row.editingStatus !== undefined">
                <el-select
                  v-model="scope.row.editingStatus"
                  @change="(value) => handleStatusChange(scope.row, value)"
                  @blur="scope.row.editingStatus = undefined"
                  size="small"
                  style="width: 100px;"
                  autofocus
                >
                  <el-option label="在售" value="1" />
                  <el-option label="待售" value="2" />
                  <el-option label="售罄" value="3" />
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
        <el-table-column prop="remark" label="备注" width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="300" >
          <template #default="scope">
            <el-button type="warning"  @click="addToAiList(scope.row)">
              <el-icon><MagicStick /></el-icon>AI
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

    <!-- 新增/编辑抽屉 -->
    <el-drawer
      v-model="dialogVisible"
      :title="isEdit ? '编辑' : '新增'"
      direction="rtl"
      size="500px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="楼盘名称">
          <el-input v-model="form.name" placeholder="请输入楼盘名称" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="form.city" placeholder="请输入城市" />
        </el-form-item>
        <el-form-item label="价格">
          <el-input v-model="form.price" placeholder="请输入价格" />
        </el-form-item>
        <el-form-item label="年龄">
          <el-input v-model="form.age" placeholder="请输入楼龄（年）" />
        </el-form-item>
        <el-form-item label="优点">
          <el-input v-model="form.advantage" type="textarea" :rows="3" placeholder="请输入优点" />
        </el-form-item>
        <el-form-item label="是否一手">
          <el-select v-model="form.is_first" placeholder="请选择" style="width: 100%">
            <el-option label="一手" value="1" />
            <el-option label="二手" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="在售" value="1" />
            <el-option label="待售" value="2" />
            <el-option label="售罄" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="5" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>

    <!-- AI 对比弹窗 -->
    <el-dialog v-model="aiDialogVisible" title="🤖 AI 楼盘对比分析" width="800px" destroy-on-close>
      <div class="ai-dialog-content" ref="aiDialogRef">
        <div v-if="aiResult" v-html="renderedAiMarkdown"></div>
        <div v-else-if="aiLoading" style="text-align: center; color: #999; padding: 40px;">AI 正在分析中...</div>
        <div v-else style="text-align: center; color: #999; padding: 40px;">等待分析结果</div>
        <span v-if="aiLoading" class="typing-cursor">|</span>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { Search, Plus, Edit, Delete, MagicStick } from "@element-plus/icons-vue";
import { debounce } from "lodash";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true, breaks: true, linkify: true });

export default {
  name: "LouPan",
  components: { Search, Plus, Edit, Delete, MagicStick },
  data() {
    return {
      tableData: [
        { id: 1, name: "万科翡翠湾", address: "南山区深南大道888号", city: "深圳", price: "65000元/㎡", age: "新盘", advantage: "精装交付，地铁口500米，双学区", is_first: "1", status: "1", remark: "精装交付，地铁口" },
        { id: 2, name: "保利天悦", address: "天河区珠江新城花城大道", city: "广州", price: "82000元/㎡", age: "2年", advantage: "一线江景，顶级学区，品牌物业", is_first: "1", status: "1", remark: "江景房，学区房" },
        { id: 3, name: "融创壹号院", address: "朝阳区望京东路", city: "北京", price: "95000元/㎡", age: "5年", advantage: "满五唯一，精装修，配套成熟", is_first: "2", status: "2", remark: "二手精装，满五唯一" },
        { id: 4, name: "碧桂园星钻", address: "番禺区大学城南", city: "广州", price: "32000元/㎡", age: "新盘", advantage: "价格低，近地铁，大户型", is_first: "1", status: "1", remark: "毛坯交付，近地铁" },
        { id: 5, name: "龙湖春江天玺", address: "江宁区百家湖", city: "南京", price: "41000元/㎡", age: "1年", advantage: "湖景房，龙湖物业，绿化率高", is_first: "1", status: "3", remark: "已售罄" },
        { id: 6, name: "华润城润府", address: "南山区科技园", city: "深圳", price: "120000元/㎡", age: "8年", advantage: "核心地段，商业配套齐全，保值强", is_first: "2", status: "1", remark: "二手豪宅，带精装" },
        { id: 7, name: "中海锦城", address: "武侯区天府大道", city: "成都", price: "22000元/㎡", age: "新盘", advantage: "央企品质，性价比高，交通便利", is_first: "1", status: "2", remark: "待开盘，可预约" },
        { id: 8, name: "绿城桂花园", address: "西湖区文三路", city: "杭州", price: "78000元/㎡", age: "3年", advantage: "绿城品质，园林景观好，次新房", is_first: "2", status: "1", remark: "二手次新房" },
      ],
      loading: false,
      searchKeyword: "",
      filterStatus: "",
      currentPage: 1,
      pageSize: 20,
      pagination: {
        total: 8,
        current: 1,
        pageNum: 20,
        totalPages: 1
      },
      dialogVisible: false,
      isEdit: false,
      form: {
        id: null,
        name: "",
        address: "",
        city: "",
        price: "",
        age: "",
        advantage: "",
        is_first: "1",
        status: "1",
        remark: "",
      },
      aiCompareList: [],
      showAllAi: false,
      aiDialogVisible: false,
      aiLoading: false,
      aiResult: "",
    };
  },
  computed: {
    tableHeight() {
      return "calc(100vh - 180px)";
    },
    renderedAiMarkdown() {
      return md.render(this.aiResult || "");
    },
  },
  created() {
    this.fetchData();
    this.debouncedSearch = debounce(this.handleSearch, 300);
  },
  beforeUnmount() {
    this.debouncedSearch?.cancel();
  },
  methods: {
    async handleStatusChange(row, newStatus) {
      try {
        await this.$axios.post("http://localhost:8000/api/loupan/update", {
          id: row.id,
          status: newStatus
        });
        row.status = String(newStatus);
        row.editingStatus = undefined;
        this.$message.success("状态更新成功");
      } catch (error) {
        console.error("状态更新失败:", error);
        this.$message.error("状态更新失败");
        row.editingStatus = undefined;
      }
    },
    async fetchData() {
      //    this.loading = true;
      //    try {
      //      const params = {
      //        page: this.currentPage,
      //        pageNum: this.pageSize,
      //        conditions: {},
      //        orderBy: { column: 'id', type: 'DESC' }
      //      };
      //      const res = await this.$axios.post("http://localhost:8000/api/loupan/get", params);
      //      if (res.data.result?.list) {
      //        this.tableData = res.data.result.list.map(item => ({
      //          ...item,
      //          status: String(item.status || '1')
      //        }));
      //        this.pagination = {
      //          total: res.data.result.pagination.total,
      //          current: res.data.result.pagination.current,
      //          pageNum: res.data.result.pagination.pageNum,
      //          totalPages: res.data.result.pagination.totalPages
      //        };
      //      }
      //    } catch (error) {
      //      console.error("加载数据失败:", error);
      //      this.$message.error("加载数据失败");
      //    } finally {
      //      this.loading = false;
      //    }
    },
    async handleSearch() {
      this.currentPage = 1;
      this.loading = true;
      try {
        const conditions = {};
        if (this.searchKeyword.trim()) {
          conditions.name = this.searchKeyword.trim();
        }
        if (this.filterStatus) {
          conditions.status = this.filterStatus;
        }
        const res = await this.$axios.post("http://localhost:8000/api/loupan/get", {
          page: this.currentPage,
          pageNum: this.pageSize,
          conditions,
          orderBy: { column: 'id', type: 'DESC' }
        });
        if (res.data.result?.list) {
          this.tableData = res.data.result.list.map(item => ({
            ...item,
            status: String(item.status || '1')
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
      this.form = { id: null, name: "", address: "", city: "", price: "", age: "", advantage: "", is_first: "1", status: "1", remark: "" };
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.isEdit = true;
      this.form = { ...row, status: row.status || "1", is_first: row.is_first || "1" };
      this.dialogVisible = true;
    },
    async handleSubmit() {
      if (!this.form.name) {
        this.$message.warning("请输入楼盘名称");
        return;
      }
      try {
        if (this.isEdit) {
          await this.$axios.post("http://localhost:8000/api/loupan/update", this.form);
          this.$message.success("更新成功");
        } else {
          await this.$axios.post("http://localhost:8000/api/loupan/add", this.form);
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
        await this.$axios.post("http://localhost:8000/api/loupan/delete", { id: row.id });
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
      this.form = { id: null, name: "", address: "", city: "", price: "", age: "", advantage: "", is_first: "1", status: "1", remark: "" };
    },
    getStatusLabel(status) {
      const statusMap = { "1": "在售", "2": "待售", "3": "售罄" };
      return statusMap[status] || "未知";
    },
    addToAiList(row) {
      if (this.aiCompareList.find((r) => r.id === row.id)) {
        this.$message.warning("该楼盘已在对比列表中");
        return;
      }
      this.aiCompareList.push({ ...row });
      this.$message.success(`已添加「${row.name}」到对比列表`);
    },
    async openAiCompare() {
      if (this.aiCompareList.length < 2) {
        this.$message.warning("至少选择2个楼盘进行对比");
        return;
      }
      this.aiDialogVisible = true;
      this.aiLoading = true;
      this.aiResult = "";
      let text = "";
      this.aiCompareList.forEach((item, i) => {
        text += `\n楼盘${i + 1}：${item.name}\n`;
        text += `  - 地址：${item.address}\n`;
        text += `  - 城市：${item.city}\n`;
        text += `  - 价格：${item.price}\n`;
        text += `  - 楼龄：${item.age}\n`;
        text += `  - 优点：${item.advantage}\n`;
        text += `  - 是否一手：${item.is_first === "1" ? "一手" : "二手"}\n`;
        text += `  - 状态：${this.getStatusLabel(item.status)}\n`;
        if (item.remark) text += `  - 备注：${item.remark}\n`;
      });
      const prompt = `请对以下${this.aiCompareList.length}个楼盘进行详细对比分析，请用markdown格式输出：\n${text}\n请从价格、地段、配套、升值潜力、居住体验等多个维度进行对比，最后给出明确的购买推荐建议。`;
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
  }
};
</script>

<style scoped>
.loupan-container {
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
  align-self: flex-start;
}
.search-input {
  width: 300px;
}
.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}
.status-1 {
  color: #67c23a;
  font-weight: 500;
}
.status-2 {
  color: #e6a23c;
  font-weight: 500;
}
.status-3 {
  color: #f56c6c;
  font-weight: 500;
}
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
/* AI 对比栏 */
.ai-compare-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #fff7e6 0%, #fff1d6 100%);
  border: 1px solid #ffd666;
  border-radius: 8px;
}
.ai-compare-items {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
/* AI 弹窗内容 */
.ai-dialog-content {
  max-height: 65vh;
  overflow-y: auto;
  font-size: 15px;
  line-height: 1.8;
}
.typing-cursor {
  animation: blink 0.7s infinite;
  font-weight: bold;
  color: #409eff;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
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
</style>

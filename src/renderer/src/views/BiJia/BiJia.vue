<template>
  <div class="bijia-container">
    <div class="header">
      <div class="header-actions">
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
        <el-button type="primary" size="large" @click="showAddDialog">
          <el-icon><Plus /></el-icon>新增
        </el-button>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      :data="tableData"
      v-loading="loading"
      stripe
      style="width: 100%;height:619px"
    >
        <el-table-column type="index" label="序号" width="100" />
        <el-table-column prop="name" label="商品" min-width="180" show-overflow-tooltip />
        <el-table-column label="比价商品URL" min-width="300" show-overflow-tooltip>
          <template #default="scope">
            <span v-if="scope.row.urls && scope.row.urls.length" class="url-text">{{ scope.row.urls.join(' , ') }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="390" fixed="right">
          <template #default="scope">
            <el-button type="warning" @click="showBiJiaDialog(scope.row)">
              <el-icon><TrendCharts /></el-icon>比价
            </el-button>
            <el-button type="primary" @click="handleEdit(scope.row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button type="danger" @click="handleDelete(scope.row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

    <!-- 分页 -->
    <div class="pagination" v-if="pagination.total > 0">
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

    <!-- 新增/编辑抽屉 -->
    <el-drawer
      v-model="dialogVisible"
      :title="isEdit ? '编辑' : '新增'"
      direction="rtl"
      size="500px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="商品">
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="4" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>

    <!-- 比价弹窗 - 填写多个商品URL -->
    <el-dialog v-model="biJiaVisible" title="比价 - 添加商品URL" width="600px">
      <div class="bijia-urls">
        <div v-for="(item, idx) in biJiaUrls" :key="idx" class="bijia-url-row">
          <el-input
            v-model="biJiaUrls[idx]"
            placeholder="请输入商品URL"
            size="large"
            style="flex: 1;"
          />
          <el-button type="danger" :icon="Delete" circle size="small" @click="removeBiJiaUrl(idx)" v-if="biJiaUrls.length > 1" />
        </div>
        <el-button type="primary" link @click="addBiJiaUrl" style="margin-top: 8px;">
          <el-icon><Plus /></el-icon> 添加URL
        </el-button>
      </div>
      <template #footer>
        <el-button size="large" @click="biJiaVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="saveBiJiaUrls">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Search, Plus, Edit, Delete, TrendCharts } from "@element-plus/icons-vue";
import { debounce } from "lodash";

export default {
  name: "BiJia",
  components: { Search, Plus, Edit, Delete, TrendCharts },
  data() {
    return {
      mockData: [
        { id: 1, name: "联想ThinkPad X1 Carbon", urls: ["https://item.jd.com/100041628064.html", "https://detail.tmall.com/item.htm?id=741523698", "https://mobile.yangkeduo.com/goods.html?goods_id=458723"], remark: "京东/天猫/拼多多比价" },
        { id: 2, name: "苹果 MacBook Air M3", urls: ["https://www.apple.com.cn/shop/buy-mac/macbook-air", "https://item.jd.com/100065937812.html"], remark: "官网/京东" },
        { id: 3, name: "戴尔U2723QE显示器", urls: ["https://item.jd.com/100034064498.html", "https://detail.tmall.com/item.htm?id=682145"], remark: "4K显示器比价" },
        { id: 4, name: "罗技MX Master 3S鼠标", urls: ["https://item.jd.com/100039417498.html", "https://detail.tmall.com/item.htm?id=698712", "https://mobile.yangkeduo.com/goods.html?goods_id=512398"], remark: "已选拼多多最低价" },
        { id: 5, name: "索尼WH-1000XM5耳机", urls: ["https://item.jd.com/100015636894.html"], remark: "等618活动" },
        { id: 6, name: "小米14 Ultra手机", urls: ["https://item.jd.com/100072345612.html", "https://detail.tmall.com/item.htm?id=765432", "https://www.mi.com/product/mi-14-ultra"], remark: "各平台比价中" },
        { id: 7, name: "华为MatePad Pro 13.2", urls: [], remark: "待补充URL" },
        { id: 8, name: "雷蛇黑寡妇V4键盘", urls: ["https://item.jd.com/100048712365.html", "https://detail.tmall.com/item.htm?id=812345"], remark: "已下单京东" },
      ],
      allData: [],
      tableData: [],
      loading: false,
      searchKeyword: "",
      currentPage: 1,
      pageSize: 20,
      pagination: { total: 0, current: 1, pageNum: 20, totalPages: 0 },
      dialogVisible: false,
      isEdit: false,
      nextId: 9,
      form: { id: null, name: "", remark: "" },
      // 比价弹窗
      biJiaVisible: false,
      biJiaUrls: [""],
      biJiaCurrentRow: null,
    };
  },
  computed: {
    tableHeight() {
      return "calc(100vh - 180px)";
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
    fetchData() {
      this.loading = true;
      setTimeout(() => {
        if (!this.allData.length) this.allData = [...this.mockData];
        this.applyFilter();
        this.loading = false;
      }, 200);
    },
    applyFilter() {
      let filtered = [...this.allData];
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.trim().toLowerCase();
        filtered = filtered.filter(item => item.name.toLowerCase().includes(kw));
      }
      this.pagination.total = filtered.length;
      this.pagination.totalPages = Math.ceil(filtered.length / this.pageSize);
      const start = (this.currentPage - 1) * this.pageSize;
      this.tableData = filtered.slice(start, start + this.pageSize);
    },
    handleSearch() {
      this.currentPage = 1;
      this.applyFilter();
    },
    showAddDialog() {
      this.isEdit = false;
      this.form = { id: null, name: "", remark: "" };
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.isEdit = true;
      this.form = { id: row.id, name: row.name, remark: row.remark };
      this.dialogVisible = true;
    },
    handleSubmit() {
      if (!this.form.name) {
        this.$message.warning("请输入商品名称");
        return;
      }
      if (this.isEdit) {
        const idx = this.allData.findIndex(item => item.id === this.form.id);
        if (idx !== -1) {
          this.allData[idx].name = this.form.name;
          this.allData[idx].remark = this.form.remark;
        }
        this.$message.success("更新成功");
      } else {
        this.allData.unshift({ id: this.nextId++, name: this.form.name, urls: [], remark: this.form.remark });
        this.$message.success("新增成功");
      }
      this.dialogVisible = false;
      this.applyFilter();
    },
    handleDelete(row) {
      this.$confirm("确认删除该记录吗？", "提示", {
        confirmButtonText: "确定", cancelButtonText: "取消", type: "warning"
      }).then(() => {
        this.allData = this.allData.filter(item => item.id !== row.id);
        this.$message.success("删除成功");
        this.applyFilter();
      }).catch(() => {});
    },
    // 比价弹窗
    showBiJiaDialog(row) {
      this.biJiaCurrentRow = row;
      this.biJiaUrls = row.urls && row.urls.length ? [...row.urls] : [""];
      this.biJiaVisible = true;
    },
    addBiJiaUrl() {
      this.biJiaUrls.push("");
    },
    removeBiJiaUrl(idx) {
      this.biJiaUrls.splice(idx, 1);
    },
    saveBiJiaUrls() {
      const urls = this.biJiaUrls.filter(u => u.trim() !== "");
      if (this.biJiaCurrentRow) {
        const idx = this.allData.findIndex(item => item.id === this.biJiaCurrentRow.id);
        if (idx !== -1) this.allData[idx].urls = urls;
      }
      this.biJiaVisible = false;
      this.applyFilter();
      this.$message.success("比价URL已保存");
    },
    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
      this.applyFilter();
    },
    handleCurrentChange(val) {
      this.currentPage = val;
      this.applyFilter();
    },
    resetForm() {
      this.form = { id: null, name: "", remark: "" };
    },
  }
};
</script>

<style scoped>
.bijia-container {
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.search-input {
  width: 300px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.url-text {
  color: #409eff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.bijia-urls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bijia-url-row {
  display: flex;
  gap: 8px;
  align-items: center;
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

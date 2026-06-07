<template>
  <div class="stock-container">
    <div class="search-container">
      <!-- <el-input
        v-model="searchForm.stock_name"
        placeholder="请输入股票名称"
        clearable
        @input="handleSearch"
        style="width: 200px"
      >
      </el-input>
      <el-select
        v-model="searchForm.year"
        placeholder="选择年份"
        style="width: 120px; margin-left: 10px"
      >
        <el-option
          v-for="year in yearOptions"
          :key="year"
          :label="year"
          :value="year"
        />
      </el-select> -->
      <el-date-picker
        v-model="searchForm.date"
        type="date"
        placeholder="选择日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 180px; margin-right: 10px"
      />
      <el-button type="primary" @click="analyzeStockData" :loading="analyzing">
        分析股票数据
      </el-button>
    </div>
    <!-- <div class="top-table-section">
      <div class="stock-list-table">
        <el-table :data="stockNameList" height="100%">
          <el-table-column prop="name" label="名称"></el-table-column>
          <el-table-column prop="code" label="代码"></el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="handleStockSelect(scope.row)"
              >
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="stock-detail-table">
        <el-table
          :data="tableData"
          width="90%"
          height="90%"
          :row-class-name="tableRowClassName"
        >
          <el-table-column type="expand" width="50">
            <template #default="props">
              <div style="padding: 20px">
                <el-descriptions :column="3" border>
                  <el-descriptions-item label="RSI">
                    {{ props.row.rsi }}
                  </el-descriptions-item>
                  <el-descriptions-item label="利润">
                    {{ props.row.profit }}
                  </el-descriptions-item>
                  <el-descriptions-item label="新增成交量">
                    {{ props.row.volumeIncrease }}
                  </el-descriptions-item>
                  <el-descriptions-item label="5日均线">
                    {{ props.row.ma5 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="10日均线">
                    {{ props.row.ma10 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="20日均线">
                    {{ props.row.ma20 }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="isValidSignal" label="均线信号">
            <template #default="scope">
              {{ scope.row.isValidSignal ? "多头排列" : "" }}
            </template>
          </el-table-column>
          <el-table-column prop="stock_name" label="名称"> </el-table-column>
          <el-table-column
            prop="trade_date"
            label="日期"
            :formatter="formatDate"
          >
          </el-table-column>
          <el-table-column prop="open_price" label="开盘"> </el-table-column>
          <el-table-column prop="close_price" label="收盘"> </el-table-column>
          <el-table-column prop="price" label="价格" width="150">
            <template #default="scope">
              <div>
                今日: [{{ scope.row.low_price }}, {{ scope.row.high_price }}]
              </div>
              <div v-if="scope.row.nextDayPrice">
                明日: [{{ scope.row.nextDayPrice.low }},
                {{ scope.row.nextDayPrice.high }}]
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="volume" label="成交量"> </el-table-column>
          <el-table-column prop="amount" label="成交额"> </el-table-column>
          <el-table-column prop="amplitude" label="振幅"> </el-table-column>
          <el-table-column prop="change_amount" label="涨跌额">
          </el-table-column>
          <el-table-column prop="change_percent" label="涨跌幅">
          </el-table-column>
          <el-table-column prop="turnover_rate" label="换手率">
          </el-table-column>
        </el-table>

        <div class="pagination-container">
          <el-pagination
            @current-change="handleCurrentChange"
            :current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next, jumper"
            :total="total"
          >
          </el-pagination>
        </div>
      </div>
    </div> -->

    <div class="bottom-table-section">
      <div class="select-stock">
        <el-table
          :data="selectStockTableData"
          width="100%"
          height="100%"
          :row-class-name="tableRowClassName"
        >
          <el-table-column type="expand" width="50">
            <template #default="props">
              <div style="padding: 20px">
                <el-descriptions :column="3" border>
                  <el-descriptions-item label="RSI">
                    {{ props.row.rsi }}
                  </el-descriptions-item>
                  <el-descriptions-item label="利润">
                    {{ props.row.profit }}
                  </el-descriptions-item>
                  <el-descriptions-item label="新增成交量">
                    {{ props.row.volumeIncrease }}
                  </el-descriptions-item>
                  <el-descriptions-item label="5日均线">
                    {{ props.row.ma5 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="10日均线">
                    {{ props.row.ma10 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="20日均线">
                    {{ props.row.ma20 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="换手率">
                    {{ props.row.turnover_rate }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="stock_name" label="名称"> </el-table-column>
          <el-table-column prop="stock_code" label="代码"> </el-table-column>
          <el-table-column
            prop="trade_date"
            label="日期"
            :formatter="formatDate"
          >
          </el-table-column>
          <el-table-column prop="open_price" label="开盘"> </el-table-column>
          <el-table-column prop="close_price" label="收盘"> </el-table-column>
          <el-table-column prop="low_price" label="最低价"></el-table-column>
          <el-table-column prop="high_price" label="最高价"></el-table-column>
          <el-table-column prop="volume" label="成交量"> </el-table-column>
          <el-table-column prop="amount" label="成交额"> </el-table-column>
          <el-table-column prop="amplitude" label="振幅"> </el-table-column>
          <el-table-column prop="change_amount" label="涨跌额">
          </el-table-column>
          <el-table-column prop="change_percent" label="涨跌幅">
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script>
import { ipcApiRoute } from "@/api/main";

export default {
  name: "Stock",
  data() {
    return {
      tableData: [],
      currentPage: 1,
      pageSize: 10,
      total: 0,
      searchForm: {
        stock_name: "",
        year: new Date().getFullYear(),
        date: new Date().toISOString().split("T")[0],
      },
      analyzing: false,
      selectStockTableData: [],
      stockNameList: [],
      currentStockCode: "",
      yearOptions: [],
    };
  },
  methods: {
    // 获取表格数据
    async fetchData() {
      this.tableData = [];
      try {
        const params = {
          action: "get",
          table: `stock_${this.searchForm.year}`,
          conditions: {
            stock_code: this.currentStockCode,
          },
          page: this.currentPage,
          pageNum: this.pageSize,
          orderBy: {
            column: "trade_date",
            type: "desc",
          },
        };

        const res = await this.$ipc.invoke(
          ipcApiRoute.sqlitedbOperation,
          params
        );
        if (res.result.list && res.result.list.length > 0) {
          this.tableData = res.result.list;
          this.total = res.result.pagination.total;
          this.currentPage = res.result.pagination.current;
        }
      } catch (error) {
        console.error("获取数据失败:", error);
        this.$message.error("获取数据失败");
      }
    },
    // 处理页码变化
    handleCurrentChange(val) {
      this.currentPage = val;
      this.fetchData();
    },
    formatDate(row, column, cellValue) {
      if (!cellValue) return "";
      const date = new Date(cellValue);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    },
    tableRowClassName({ row }) {
      if (row.change_percent > 0) {
        return "up-row";
      } else if (row.change_percent < 0) {
        return "down-row";
      }
      return "";
    },
    handleSearch() {
      this.currentPage = 1;
      this.fetchStockNameList();
    },
    // 分析股票数据
    async analyzeStockData() {
      try {
        this.analyzing = true;
        // 获取所有股票列表
        const stockListParams = {
          action: "get",
          table: "stock_name",
          conditions: {},
        };
        const stockListRes = await this.$ipc.invoke(
          ipcApiRoute.sqlitedbOperation,
          stockListParams
        );
        const stockList = stockListRes.result.list || [];

        // 存储符合条件的股票数据
        let selectedStocks = [];

        // 获取当前日期
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        // 遍历每只股票
        for (const stock of stockList) {
          // 查询最新的价格记录
          const params = {
            action: "get",
            table: `stock_${currentYear}`,
            conditions: {
              stock_code: stock.code,
              trade_date: this.searchForm.date,
              isValidSignal: 1,
              change_percent: {
                $gt: 0
              }
            },
            page: 1,
            pageNum: 1,
            orderBy: {
              column: "trade_date",
              type: "desc",
            },
          };

          const res = await this.$ipc.invoke(
            ipcApiRoute.sqlitedbOperation,
            params
          );
          const latestRecord = res.result.list?.[0];

          // 如果存在记录且均线信号为1且涨跌幅大于0，添加到选中列表
          if (latestRecord) {
            selectedStocks.push({
              ...latestRecord,
              stock_code: stock.code,
            });
          }
        }

        this.selectStockTableData = selectedStocks;
      } catch (error) {
        console.error("分析股票数据失败:", error);
        this.$message.error("分析股票数据失败");
      } finally {
        this.analyzing = false;
      }
    },
    // 获取股票名称列表
    async fetchStockNameList() {
      try {
        const params = {
          action: "get",
          table: "stock_name",
          conditions: {
            name: this.searchForm.stock_name
              ? `%${this.searchForm.stock_name}%`
              : "",
          },
        };
        const res = await this.$ipc.invoke(
          ipcApiRoute.sqlitedbOperation,
          params
        );
        this.stockNameList = res.result.list || [];
      } catch (error) {
        console.error("获取股票列表失败:", error);
        this.$message.error("获取股票列表失败");
      }
    },
    // 处理股票选择
    async handleStockSelect(row) {
      try {
        this.total = 0;
        this.currentPage = 1;
        this.pageSize = 10;
        this.currentStockCode = row.code;
        this.tableData = [];

        // 使用选择的年份
        const params = {
          action: "get",
          table: `stock_${this.searchForm.year}`,
          conditions: {
            stock_code: this.currentStockCode,
          },
          page: this.currentPage,
          pageNum: this.pageSize,
          orderBy: {
            column: "trade_date",
            type: "desc",
          },
        };

        const res = await this.$ipc.invoke(
          ipcApiRoute.sqlitedbOperation,
          params
        );
        console.log("查询所有数据 res=", res);
        if (res.result.list && res.result.list.length > 0) {
          this.tableData = res.result.list;
          this.total = res.result.pagination.total;
          this.currentPage = res.result.pagination.current;
        }
      } catch (error) {
        console.error("获取股票详情失败:", error);
        this.$message.error("获取股票详情失败");
      }
    },
    // 初始化年份选项
    initYearOptions() {
      const currentYear = new Date().getFullYear();
      this.yearOptions = [];
      for (let year = currentYear; year >= 2018; year--) {
        this.yearOptions.push(year);
      }
    },
  },
  created() {
    this.initYearOptions();
    this.fetchStockNameList();
  },
};
</script>

<style scoped>
.stock-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.search-container {
  height: 50px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.top-table-section,
.bottom-table-section {
  height: 100vh;
  min-height: 0;
}

.bottom-table-section {
  padding: 10px 0;
}

.bottom-table-section .select-stock {
  height: 100%;
}

/* 确保表格在器内正确滚动 */
.bottom-table-section .select-stock .el-table {
  height: 100%;
}

.pagination-container {
  margin: 0 auto;
}

:deep(.el-table__header-wrapper th) {
  background-color: #f0f8ff !important;
}
:deep(.up-row) {
  background-color: #ffecec !important;
}
:deep(.down-row) {
  background-color: #ecffec !important;
}
:deep(.el-table__body tr.up-row:hover > td) {
  background-color: #ffe0e0 !important;
}
:deep(.el-table__body tr.down-row:hover > td) {
  background-color: #e0ffe0 !important;
}

.top-table-section {
  display: flex;
  flex-direction: row;
  gap: 20px;
}

.stock-list-table {
  width: 300px;
  height: 100%;
  flex-shrink: 0;
}

.stock-detail-table {
  flex: 1;
  height: 100%;
}

.demo-table-expand {
  padding: 20px;
}
.demo-table-expand .el-form-item {
  margin-right: 20px;
  margin-bottom: 0;
  width: 30%;
}
</style>

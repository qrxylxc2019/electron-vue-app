<template>
  <div class="year-plan">
    <!-- 年份选择器 -->
    <div class="year-selector">
      <el-date-picker
        v-model="selectedYear"
        type="year"
        placeholder="选择年份"
        format="YYYY年"
        value-format="YYYY"
        @change="onYearChange"
        :clearable="false"
      />
    </div>
    <!-- 第一行 1-6月 -->
    <div class="month-row">
      <div v-for="month in 6" :key="`first-${month}`" class="month-wrap">
        <div class="month-title">{{ month }}月计划</div>
        <el-table
          :data="planList[month - 1]"
          style="border-radius:8px; flex:1;"
          :show-header="false"
        >
          <el-table-column type="index" width="20" />
          <el-table-column prop="content" label="">
            <template #default="{ row }">
              <span class="plan-text">{{ row.plan }}</span>
            </template>
          </el-table-column>
          <el-table-column width="50" v-if="canDelete(month)">
            <template #default="scope">
              <el-icon class="delete-icon" @click="confirmDelete(scope.row)"><Delete /></el-icon>
            </template>
          </el-table-column>
        </el-table>
        <div class="input-group">
          <el-input
            type="textarea"
            :rows="2"
            :placeholder="`请输入${month}月计划`"
            v-model="planData[month - 1]"
            :disabled="!canDelete(month)"
          />
          <el-button type="primary" class="tiffany-blue-btn" @click="addPlan(month - 1)" :disabled="!canDelete(month)">新增</el-button>
        </div>
      </div>
    </div>
    <div class="month-row">
      <div v-for="month in 6" :key="`second-${month}`" class="month-wrap">
        <div class="month-title">{{ month + 6 }}月</div>
        <el-table
          :data="planList[month + 5]"
          style="border-radius:8px; flex:1;"
          :show-header="false"
        >
          <el-table-column type="index" width="20" />
          <el-table-column prop="content" label="">
            <template #default="{ row }">
              <span class="plan-text">{{ row.plan }}</span>
            </template>
          </el-table-column>
          <el-table-column width="50" v-if="canDelete(month + 6)">
            <template #default="scope">
              <el-icon class="delete-icon" @click="confirmDelete(scope.row)"><Delete /></el-icon>
            </template>
          </el-table-column>
        </el-table>
        <div class="input-group">
          <el-input
            type="textarea"
            :rows="2"
            :placeholder="`请输入${month + 6}月计划`"
            v-model="planData[month + 5]"
            :disabled="!canDelete(month + 6)"
          />
          <el-button type="primary" class="tiffany-blue-btn" @click="addPlan(month + 5)" :disabled="!canDelete(month + 6)">新增</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { Delete } from "@element-plus/icons-vue";
export default {
  name: "YearPlan",
  components: {
    Delete,
  },
  data() {
    return {
      planData: new Array(12).fill(""), // 12个月的数据
      planList: new Array(12).fill().map(() => []), // 每个月的计划列表
      currentYear: new Date().getFullYear(), // 当前年份
      selectedYear: String(new Date().getFullYear()), // 选择的年份（字符串格式）
    };
  },
  mounted() {
    this.getPlanList();
  },
  methods: {
    onYearChange(year) {
      if (year) {
        this.currentYear = parseInt(year);
        this.getPlanList();
      }
    },
    canDelete(month) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const selectedYear = parseInt(this.selectedYear);
      if (selectedYear < currentYear) return false;
      if (selectedYear > currentYear) return true;
      return month >= currentMonth;
    },
    confirmDelete(row) {
      this.$confirm("确定要删除该计划吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(() => {
        this.deletePlan(row);
      }).catch(() => {});
    },
    async deletePlan(row) {
      try {
        const res = await axios.post("http://localhost:8000/api/yearPlan/delete", {
          id: row.id
        });
        
        if (res.data.code === 200) {
          this.$message.success("删除成功");
          this.getPlanList();
        } else {
          this.$message.error("删除失败");
        }
      } catch (error) {
        console.error("删除计划失败:", error);
        this.$message.error("删除计划失败");
      }
    },
    async getPlanList() {
      try {
        const res = await axios.post("http://localhost:8000/api/yearPlan/get", {
          conditions: {
            year: this.currentYear, // 添加年份条件
          },
        });
        console.log("getPlanList ", res.data);
        if (res.data.code == 200) {
          // 重置计划列表
          this.planList = new Array(12).fill().map(() => []);
          res.data.result.list.forEach((item) => {
            const monthIndex = item.month - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
              this.planList[monthIndex].push(item);
            }
          });
        } else {
          this.$message.error("获取计划列表失败");
        }
      } catch (error) {
        console.error("获取计划列表失败:", error);
        this.$message.error("获取计划列表失败");
      }
    },
    async addPlan(monthIndex) {
      if (this.planData[monthIndex].trim()) {
        try {
          // 调用年度计划API
          const res = await axios.post("http://localhost:8000/api/yearPlan/add", {
            plan: this.planData[monthIndex].trim(),
            month: monthIndex + 1,
            year: this.currentYear,
            status: 0, // 默认状态为0
          });
          
          console.log(res);
          if (res.data.code === 200) {
            this.$message.success("保存计划成功");
            // 更新界面显示
            this.getPlanList();
            this.planData[monthIndex] = ""; // 清空输入框
          } else {
            this.$message.error("保存计划失败");
          }
        } catch (error) {
          console.error("保存计划失败:", error);
          this.$message.error("保存计划失败");
        }
      }
    },
    async updatePlan(planItem, newContent) {
      try {
        const res = await axios.post("http://localhost:8000/api/yearPlan/update", {
          id: planItem.id,
          plan: newContent,
          month: planItem.month,
          year: planItem.year,
          status: planItem.status
        });
        
        if (res.data.code === 200) {
          this.$message.success("更新计划成功");
          this.getPlanList();
        } else {
          this.$message.error("更新计划失败");
        }
      } catch (error) {
        console.error("更新计划失败:", error);
        this.$message.error("更新计划失败");
      }
    },
  },
};
</script>

<style scoped>
  /* Claude Design System - Colors */
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

  .year-plan {
    padding: 20px;
    height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
    background-color: #faf8f5;
    color: #1a1a1a;
  }

  .year-selector {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 0;
    padding: 0 20px;
    height: 60px;
    background: #fff;
    border-radius: 12px;
    flex-shrink: 0;
    border-bottom: 1px solid #e8e4df;
  }

  .year-label {
    font-size: 16px;
    font-weight: 500;
    color: #6b6560;
    border-left: 5px solid #8b9a6d;
    padding-left: 10px;
    white-space: nowrap;
  }

  .month-row {
    display: flex;
    justify-content: space-between;
    flex: 1;
    gap: 16px;
    min-height: 0;
  }

  .month-wrap {
    flex: 1;
    padding: 16px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    gap: 12px;
    background: #fff;
    border: 1px solid #e8e4df;
  }

  .month-title {
    margin-bottom: 0;
    font-weight: 600;
    text-align: left;
    flex-shrink: 0;
    height: 24px;
    line-height: 24px;
    padding-left: 12px;
    border-left: 4px solid #8b9a6d;
    color: #6b6560;
    font-size: 16px;
  }

  .month-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e8e4df;
    border-radius: 10px;
    background-color: #faf8f5;
    color: #1a1a1a;
    font-size: 14px;
  }

  .plan-list {
    margin-bottom: 0;
    border-radius: 8px;
    height: 70%;
    background-color: #fff;
  }

  .plan-list > div {
    margin-bottom: 4px;
    font-size: 14px;
  }

  .input-group {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
    padding: 0;
    align-items: stretch;
  }

  .input-group .el-button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background-color: #8b9a6d;
    border-color: #8b9a6d;
    color: #fff;
    border-radius: 10px;
    padding: 12px 20px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .input-group .el-button:hover {
    background-color: #7a895c;
    border-color: #7a895c;
  }

  .input-group :deep(.el-textarea) {
    flex: 1;
  }

  .input-group :deep(.el-textarea__inner) {
    height: 100% !important;
    box-shadow: none !important;
    border: 1px solid #e8e4df !important;
    border-radius: 10px;
    background-color: #faf8f5;
    padding: 10px 14px;
    color: #1a1a1a;
  }

  .input-group :deep(.el-textarea__inner:focus) {
    box-shadow: 0 0 0 2px rgba(139, 154, 109, 0.2) !important;
    border-color: #c4a882 !important;
    outline: none !important;
  }

  .month-plan-list {
    padding: 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .month-plan-list::-webkit-scrollbar {
    display: none;
  }

  .month-plan-list:hover {
    scrollbar-width: thin;
    -ms-overflow-style: auto;
  }

  .month-plan-list:hover::-webkit-scrollbar {
    display: block;
    width: 6px;
  }

  .month-plan-list:hover::-webkit-scrollbar-thumb {
    background-color: var(--claude-hairline);
    border-radius: 3px;
  }

  .month-plan-list:hover::-webkit-scrollbar-track {
    background-color: transparent;
  }

  .plan-item {
    padding: 10px 12px;
    border-bottom: 1px solid #e8e4df;
    background-color: #faf8f5;
    border-radius: 8px;
    margin-bottom: 4px;
  }

  .plan-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .plan-text {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;
    color: #1a1a1a;
  }

  .tiffany-blue-btn {
    background-color: #8b9a6d !important;
    border-color: #8b9a6d !important;
    color: #fff !important;
  }

  .tiffany-blue-btn:hover {
    background-color: #7a895c !important;
    border-color: #7a895c !important;
  }

  .tiffany-blue-btn:active {
    background-color: #6b7a4d !important;
    border-color: #6b7a4d !important;
  }

  .delete-icon {
    color: #e8686a;
    cursor: pointer;
    font-size: 18px;
    transition: color 0.2s ease;
  }

  .delete-icon:hover {
    color: #f78989;
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

  :deep(.el-table th) {
    color: #6b6560;
    background-color: #f5f3f0 !important;
    font-weight: 600;
    font-size: 16px;
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

  /* 年份选择器样式 */
  :deep(.el-date-picker) {
    border-radius: 10px;
  }

  :deep(.el-input__wrapper) {
    border-radius: 10px;
    background-color: #f5f3f0;
    border: 1px solid #e8e4df;
    box-shadow: none !important;
  }

  :deep(.el-input__wrapper:hover) {
    border-color: #c4a882;
  }

  :deep(.el-input__wrapper.is-focus) {
    border-color: #c4a882;
    box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
  }
</style>

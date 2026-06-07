<template>
  <div class="plan-container">
    <div class="plan-column" :style="{ flex: 3, minWidth: '500px' }">
      <div class="column-header">
        <span class="header-tag">【重要，快】</span>
        <el-button type="primary" @click="showOverlay1 = !showOverlay1">{{
          showOverlay1 == false ? "隐藏内容" : "显示内容"
        }}</el-button>
        <el-popover
          placement="right"
          :width="800"
          trigger="click"
          v-model:visible="showMonthlyPlanDialog"
        >
          <template #reference>
            <el-button type="primary" style="margin-left: 10px;">
              当月计划
            </el-button>
          </template>
          <div v-loading="monthlyPlanLoading">
            <div v-if="monthlyPlanData.length === 0 && !monthlyPlanLoading" style="text-align: center; color: #909399; padding: 20px;">
              暂无当月计划数据
            </div>
            <el-table v-else :data="monthlyPlanData" style="width: 100%;height:600px">
              <el-table-column prop="plan" label="计划内容" min-width="200">
                <template #default="scope">
                  <div style="font-size: 16px; line-height: 1.5;">
                    {{ scope.row.plan }}
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div style="text-align: right; margin-top: 10px;">
            <el-button @click="showMonthlyPlanDialog = false">关闭</el-button>
          </div>
        </el-popover>
        <el-switch
          v-model="showOtherColumns"
          active-text="显示其他列"
          inactive-text="隐藏其他列"
          style="margin-left: 20px;"
          @change="handleColumnsChange"
        ></el-switch>
      </div>
      <el-table
        stripe
        :data="getFilteredTableData1"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDblClick"
        :row-class-name="tableRowClassName"
        :expand-row-keys="expandableRows"
        row-key="id"
      >
        <el-table-column width="1">
          <template #default="scope">
            <el-button
              v-if="scope.row.children && scope.row.children.length > 0"
              type="text"
              size="small"
              @click="toggleExpand(scope.row)"
              class="expand-button"
            >
              <el-icon>
                <ArrowRight v-if="!expandableRows.includes(scope.row.id)" />
                <ArrowDown v-else />
              </el-icon>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column type="expand" width="0" v-show="false">
          <template #default="scope">
            <div class="plan-content" style="padding-left: 50px">
              <el-table
                stripe
                :row-class-name="tableRowClassName"
                :show-header="false"
                :data="scope.row.children"
              >
                <el-table-column prop="plan" label="日程">
                  <template #default="scope">
                    <div class="plan-content">
                      <div
                        class="plan-text"
                        :style="{
                          color: 'rgb(32, 120, 227)',
                        }"
                      >
                        {{ scope.row.plan }}
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="150">
                  <template #default="scope">
                    <el-button
                      size="small"
                      :type="scope.row.status == '1' ? 'success' : 'primary'"
                      plain
                      @click.stop="handleUnfinishClick(scope.row)"
                    >
                      <el-icon v-if="scope.row.status == '1'"
                        ><Check
                      /></el-icon>
                      <span v-else>未完成</span>
                    </el-button>
                    <el-button
                      size="small"
                      type="danger"
                      @click.stop="handleDeletePlan(scope.row)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="plan" label="日程">
          <template #default="scope">
            <div class="plan-content">
              <div
                class="plan-text"
                :style="{
                  color: isOverdue(scope.row.planfinishtime)
                    ? '#ff4949'
                    : 'inherit',
                  fontWeight: '800',
                  flex: '1',
                }"
              >
                <span>{{ scope.row.plan }}</span>
                <span
                  style="font-weight: 800"
                  v-if="scope.row.children.length > 0"
                >
                  【有子计划】
                </span>
              </div>
              <div class="plan-date" style="display: flex; align-items: center; gap: 8px;">
                <span
                  :style="{
                    color: isOverdue(scope.row.planfinishtime)
                      ? '#ff4949'
                      : '#909399',
                  }"
                >
                  完成时间：
                </span>
                <el-date-picker
                  style="width: 150px"
                  v-model="scope.row.planfinishtime"
                  type="date"
                  placeholder="选择日期"
                  @change="(date) => handleDateChange(date, scope.row)"
                  :default-value="scope.row.planfinishtime"
                  format="YYYY-MM-DD"
                >
                </el-date-picker>
                <span v-if="scope.row.planfinishtime">
                  <span
                    style="color:rgb(32, 120, 227)"
                    v-if="getDaysLeft(scope.row.planfinishtime) > 0"
                  >
                    还有<span style="font-size: 26px; font-weight: 800">{{
                      getDaysLeft(scope.row.planfinishtime)
                    }}</span
                    >天
                  </span>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="200">
          <template #default="scope">
            <el-button
              size="small"
              :type="scope.row.status == '1' ? 'success' : 'primary'"
              plain
              @click.stop="handleUnfinishClick(scope.row)"
              :disabled="scope.row.children.length != 0"
            >
              <el-icon v-if="scope.row.status == '1'"><Check /></el-icon>
              <span v-else>未完成</span>
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click.stop="handleAddPlan(scope.row)"
            >
              <el-icon><Plus /></el-icon>
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click.stop="handleDeletePlan(scope.row)"
              :disabled="scope.row.children.length != 0"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="button-group">
        <div class="input-row">
          <el-input
            v-model="newPlan1"
            type="textarea"
            :rows="3"
            style="font-size: 20px"
            placeholder="请输入计划内容"
            @keydown="handleNewPlanKeydown"
            ref="newPlanInput1"
          ></el-input>
          <el-date-picker
            v-model="newPlanFinishTime1"
            type="date"
            placeholder="选择完成时间"
            format="YYYY-MM-DD"
            style="width: 150px"
          />
          <el-button type="primary" @click="addPlan(0)">{{ selectedRowId ? '编辑' : '新增' }}</el-button>
          <el-button v-if="selectedRowId" type="info" @click="clearSelection">取消编辑</el-button>
        </div>
        <el-button
          style="height: 60px"
          type="primary"
          class="full-width-btn"
          @click="refreshUnfinished(0)"
          >未完成</el-button
        >
      </div>
    </div>

    <!-- 第二列 -->
    <div class="plan-column" :style="{ flex: showOtherColumns ? 2 : 0, width: showOtherColumns ? 'auto' : '0px', padding: showOtherColumns ? '15px' : '0px', margin: showOtherColumns ? '' : '0px' }" v-show="showOtherColumns">
      <div class="column-header">
        <span class="header-tag">【重要，慢】</span>
        <el-button type="primary" @click="showOverlay2 = true"
          >隐藏内容</el-button
        >
      </div>
      <div class="frosted-overlay" v-if="showOverlay2">
        <el-button
          type="primary"
          class="show-button"
          @click="showOverlay2 = false"
        >
          显示内容
        </el-button>
      </div>
      <el-table
        :data="tableData2"
        style="width: 100%"
        @row-click="handleRowClick"
        :row-class-name="tableRowClassName"
      >
        <el-table-column prop="plan" label="日程"></el-table-column>
        <el-table-column prop="status" label="状态" width="180">
          <template #default="scope">
            <el-button
              size="small"
              :type="scope.row.status == '1' ? 'success' : 'primary'"
              plain
              @click.stop="handleUnfinishClick(scope.row)"
            >
              <el-icon v-if="scope.row.status == '1'"><Check /></el-icon>
              <span v-else>移到第一列</span>
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click.stop="handleDeletePlan(scope.row)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="button-group">
        <div class="input-row">
          <el-input
            style="font-size: 20px"
            v-model="newPlan2"
            type="textarea"
            :rows="3"
            placeholder="请输入计划内容"
            @keydown="handleNewPlanKeydown"
            ref="newPlanInput2"
          ></el-input>
          <el-button type="primary" @click="addPlan(1)">新增</el-button>
        </div>
        <el-button
          style="height: 60px"
          type="primary"
          class="full-width-btn"
          @click="refreshUnfinished(1)"
          >未完成</el-button
        >
      </div>
    </div>

    <!-- 第三列 -->
    <div class="plan-column" :style="{ flex: showOtherColumns ? 2 : 0, width: showOtherColumns ? 'auto' : '0px', padding: showOtherColumns ? '15px' : '0px', margin: showOtherColumns ? '' : '0px' }" v-show="showOtherColumns">
      <div class="column-header">
        <span class="header-tag">【长期目标，慢】</span>
        <el-button type="primary" @click="showOverlay3 = true"
          >隐藏内容</el-button
        >
      </div>
      <div class="frosted-overlay" v-if="showOverlay3">
        <el-button
          type="primary"
          class="show-button"
          @click="showOverlay3 = false"
        >
          显示内容
        </el-button>
      </div>
      <el-table
        :data="tableData3"
        style="width: 100%"
        @row-click="handleRowClick"
        :row-class-name="tableRowClassName"
      >
        <el-table-column prop="plan" label="日程"></el-table-column>
        <el-table-column prop="status" label="状态" width="180">
          <template #default="scope">
            <el-button
              size="small"
              :type="scope.row.status == '1' ? 'success' : 'primary'"
              plain
              @click.stop="handleUnfinishClick(scope.row)"
            >
              <el-icon v-if="scope.row.status == '1'"><Check /></el-icon>
              <span v-else>移到第一列</span>
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click.stop="handleDeletePlan(scope.row)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="button-group">
        <div class="input-row">
          <el-input
            style="font-size: 20px"
            v-model="newPlan3"
            type="textarea"
            :rows="3"
            placeholder="请输入计划内容"
            @keydown="handleNewPlanKeydown"
            ref="newPlanInput3"
          ></el-input>
          <el-button type="primary" @click="addPlan(2)">新增</el-button>
        </div>
        <el-button
          style="height: 60px"
          type="primary"
          class="full-width-btn"
          @click="refreshUnfinished(2)"
          >未完成</el-button
        >
      </div>
    </div>

    <!-- 添加自定义对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="新增子计划"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <el-input
        v-model="subPlanContent"
        type="textarea"
        :rows="4"
        placeholder="请输入子计划内容"
        style="font-size: 20px; margin-bottom: 15px"
        @keydown="handleSubPlanKeydown"
      />
      <div class="plan-date">
        <span style="font-size: 20px">计划完成时间：</span>
        <el-date-picker
          v-model="subPlanFinishTime"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          style="width: 150px"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAddSubPlan">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加弹出层 -->
    <div class="popup-overlay" v-if="showPopup">
      <div class="popup-content">
        <div class="popup-content-div">
          <div style="font-size: 20px">现在只需要完成</div>
          <h2 style="color: #ff4949">
            {{ selectedRow.plan }}
          </h2>
          <p style="font-size: 20px">
            计划完成时间：{{ formatDate(selectedRow.planfinishtime) }}
          </p>
        </div>
        <div class="popup-buttons">
          <el-button type="primary" @click="handleUnfinishClick(selectedRow)"
            >完成</el-button
          >
          <el-button type="primary" @click="closePopup()">隐藏</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Check, Calendar, Delete, Plus } from "@element-plus/icons-vue";
import axios from "axios";

export default {
  name: "Plan",
  components: {
    Check,
    Calendar,
    Delete,
    Plus,
  },
  data() {
    return {
      tableData1: [],
      tableData2: [],
      tableData3: [],
      newPlan1: "",
      newPlan2: "",
      newPlan3: "",
      newEditPlan1: "",
      newEditPlan2: "",
      newEditPlan3: "",
      selectedRowId: null,
      selectedRowType: null,
      currentDate: new Date(),
      dialogVisible: false,
      subPlanContent: "",
      currentParentPlan: null,
      expandableRows: [],
      subPlanFinishTime: null,
      newPlanFinishTime1: null,
      editPlanFinishTime1: null,
      editPlanFinishTime2: null,
      editPlanFinishTime3: null,
      showPopup: false,
      selectedRow: {},
      showOverlay2: true,
      showOverlay3: true,
      showOverlay1: false,
      showOtherColumns: false,
      showMonthlyPlanDialog: false,
      monthlyPlanData: [],
      monthlyPlanLoading: false,
    };
  },
  computed: {
    getFilteredTableData1() {
      if (this.showOverlay1) {
        // 当遮罩显示时，只显示没有计划完成时间的数据
        return this.tableData1.filter((item) => !item.planfinishtime);
      }
      return this.tableData1;
    },
  },
  watch: {
    showMonthlyPlanDialog(newVal) {
      if (newVal) {
        this.fetchMonthlyPlanData();
      }
    },
  },
  mounted() {
    this.getPlanData();
    // 检查本地存储中是否有选中的计划
    const cachedRow = localStorage.getItem("selectedPlan");
    if (cachedRow) {
      this.selectedRow = JSON.parse(cachedRow);
      this.showPopup = true;
    }
  },
  methods: {
    handleColumnsChange(value) {
      // 当显示其他列时，强制重新计算布局
      if (value === true) {
        this.$nextTick(() => {
          // 触发窗口的 resize 事件，让组件重新计算布局
          window.dispatchEvent(new Event('resize'));
        });
      }
    },

    // 获取当月计划数据
    async fetchMonthlyPlanData() {
      this.monthlyPlanLoading = true;
      try {
        // 获取当前月份
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const res = await axios.post("http://localhost:8000/api/yearPlan/get", {
          conditions: { 
            month: currentMonth,
            year: currentYear
          }
        });
        if (res.data && res.data.result && res.data.result.list) {
          this.monthlyPlanData = res.data.result.list;
        } else {
          this.monthlyPlanData = [];
        }
      } catch (error) {
        console.error("获取当月计划失败:", error);
        this.$message.error(`获取当月计划失败: ${error.message}`);
        this.monthlyPlanData = [];
      } finally {
        this.monthlyPlanLoading = false;
      }
    },
    
    async handleAddPlan(row) {
      this.dialogVisible = true;
      this.currentParentPlan = row;
      this.subPlanContent = "";
      this.subPlanFinishTime = null;
    },

    async confirmAddSubPlan() {
      if (!this.subPlanContent.trim()) {
        this.$message.warning("请输入子计划内容");
        return;
      }

      const currentDate = new Date();
      const formattedDate = `${currentDate.getFullYear()}年${
        currentDate.getMonth() + 1
      }月${currentDate.getDate()}日`;

      const params = {
        plan: this.subPlanContent,
        type: "0",
        status: "0",
        preplanid: this.currentParentPlan.id,
        date: formattedDate,
      };
      
      // 只有当完成时间有值时才添加
      if (this.subPlanFinishTime) {
        params.planfinishtime = this.subPlanFinishTime;
      }

      try {
        console.log("发送子计划请求参数:", JSON.stringify(params));
        const res = await axios.post("http://localhost:8000/api/plan/add", params);
        if (res.data.result.code === 200) {
          this.$message.success("添加子计划成功");
          this.dialogVisible = false;
          this.subPlanContent = "";
          this.subPlanFinishTime = null;
          this.getPlanData();
        } else {
          this.$message.error("添加失败");
        }
      } catch (error) {
        console.error("添加失败:", error);
        if (error.response) {
          console.error("错误响应数据:", error.response.data);
          console.error("错误响应状态:", error.response.status);
          console.error("错误响应头:", error.response.headers);
          this.$message.error(`添加失败: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          console.error("请求已发送但无响应:", error.request);
          this.$message.error(`添加失败: 无响应`);
        } else {
          console.error("请求配置错误:", error.message);
          this.$message.error(`添加失败: ${error.message}`);
        }
      }
    },
    // 删除计划
    async handleDeletePlan(row) {
      console.log("删除计划 row = ", row);
      const params = {
        id: row.id,
      };
      try {
        const res = await axios.post("http://localhost:8000/api/plan/delete", params);
        console.log("删除计划 res = ", res);
        this.$message.success("删除成功");
        this.clearSelection(); // 重置编辑状态和清空输入框
        this.getPlanData();
      } catch (error) {
        console.error("删除失败:", error);
        this.$message.error(`删除失败: ${error.message}`);
      }
    },
    // 获取计划数据
    getPlanData() {
      const params = {
        conditions: {
          status: "0",
        },
      };

      console.log("params = ", params);

      axios.post("http://localhost:8000/api/plan/get", params)
        .then((res) => {
          if (!res.data.result.list || res.data.result.list.length === 0) {
            this.$message.warning("暂无计划数据");
            return;
          }

          const allPlans = res.data.result.list;

          // 将计划分为父计划和子计划
          const parentPlans = allPlans.filter((plan) => !plan.preplanid);
          const childPlans = allPlans.filter((plan) => plan.preplanid);

          // 将子计划添加到对应父计划的children数组中
          parentPlans.forEach((parent) => {
            parent.children = childPlans.filter(
              (child) => child.preplanid === parent.id
            );
          });

          // 只对父计划进行分类和排序处理
          const type0Plans = parentPlans.filter((plan) => 
            plan.type === 0 || plan.type === "0");

          // 按照与其他表格相同的方式进行倒序排列
          this.tableData1 = type0Plans
            .filter((plan) => plan.type === 0 || plan.type === "0")
            .reverse();
          // 其他表格数据的处理也只针对父计划
          this.tableData2 = parentPlans
            .filter((plan) => plan.type === 1 || plan.type === "1")
            .reverse();
          this.tableData3 = parentPlans
            .filter((plan) => plan.type === 2 || plan.type === "2")
            .reverse();

          // 在处理完数据后，更新可展开的行
          this.expandableRows = parentPlans
            .filter((plan) => plan.children && plan.children.length > 0)
            .map((plan) => plan.id);
        })
        .catch((error) => {
          console.error("查询失败详情:", error);
          this.$message.error(`查询失败: ${error.message}`);
        });
    },
    // 新增计划
    async addPlan(type) {
      // 根据类型选择对应的输入框的值
      const planContent = this[`newPlan${type + 1}`];
      const planFinishTime = this[`newPlanFinishTime${type + 1}`];

      if (!planContent.trim()) {
        this.$message.warning("请输入计划内容");
        return;
      }

      // 如果有选中的行ID，则执行编辑操作
      if (this.selectedRowId && type === 0) {
        const params = {
          plan: planContent,
          planfinishtime: planFinishTime,
          id: this.selectedRowId,
        };

        try {
          const res = await axios.post("http://localhost:8000/api/plan/update", params);
          if (res.data.result.code == 200) {
            this.$message.success("编辑成功");
            this[`newPlan${type + 1}`] = ""; // 清空输入框
            this[`newPlanFinishTime${type + 1}`] = null; // 清空时间
            this.selectedRowId = null; // 清空选中的ID
            this.selectedRowType = null;
            this.getPlanData(); // 刷新数据
          } else {
            this.$message.error("编辑失败");
          }
        } catch (error) {
          console.error("编辑失败:", error);
          this.$message.error(`编辑失败: ${error.message}`);
        }
        return;
      }

      // 执行新增操作
      const currentDate = new Date();
      const formattedDate = `${currentDate.getFullYear()}年${
        currentDate.getMonth() + 1
      }月${currentDate.getDate()}日`;

      const params = {
        plan: planContent,
        type: String(type), // 将type转换为字符串
        status: "0",
        date: formattedDate,
      };
      
      // 只有当planFinishTime有值时才添加
      if (planFinishTime) {
        params.planfinishtime = planFinishTime;
      }

      try {
        console.log("发送请求参数:", JSON.stringify(params));
        const res = await axios.post("http://localhost:8000/api/plan/add", params);
        if (res.data.result.code == 200) {
          this.$message.success("添加成功");
          this[`newPlan${type + 1}`] = "";
          this[`newPlanFinishTime${type + 1}`] = null;
          this.getPlanData();
        } else {
          this.$message.error("添加失败");
        }
      } catch (error) {
        console.error("添加失败:", error);
        if (error.response) {
          console.error("错误响应数据:", error.response.data);
          console.error("错误响应状态:", error.response.status);
          console.error("错误响应头:", error.response.headers);
          this.$message.error(`添加失败: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          console.error("请求已发送但无响应:", error.request);
          this.$message.error(`添加失败: 无响应`);
        } else {
          console.error("请求配置错误:", error.message);
          this.$message.error(`添加失败: ${error.message}`);
        }
      }
    },
    // 添加双击处理方法
    async handleUnfinishClick(row) {
      try {
        this.closePopup();
        if (row.type === 1 || row.type === 2 || row.type === "1" || row.type === "2") {
          const params = {
            type: "0", // 将类型改为"0"（第一列）
            id: row.id,
          };

          const res = await axios.post("http://localhost:8000/api/plan/update", params);

          if (res.data.result.code == 200) {
            this.$message.success("已移动到第一列");
            this.clearSelection(); // 重置编辑状态和清空输入框
            this.getPlanData(); // 刷新数据
          } else {
            this.$message.error("更新失败");
          }
          return;
        }

        // 第一列和第三列的处理保持不变
        const newStatus = row.status === "1" ? "0" : "1";
        const currentDate = new Date();
        const formattedDate = `${currentDate.getFullYear()}-${String(
          currentDate.getMonth() + 1
        ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

        const params = {
          status: newStatus,
          finishtime: formattedDate,
          id: row.id,
        };

        const res = await axios.post("http://localhost:8000/api/plan/update", params);

        if (res.data.result.code == 200) {
          row.status = newStatus;
          this.$message.success(
            newStatus === "1" ? "计划已完成" : "计划已取消完成"
          );
          this.clearSelection(); // 重置编辑状态和清空输入框
        } else {
          this.$message.error("状态更新失败");
        }
      } catch (error) {
        console.error("更新失败:", error);
        this.$message.error(`更新失败: ${error.message}`);
      }
    },
    // 刷新未完成数据
    async refreshUnfinished(type) {
      const params = {
        conditions: {
          status: "0",
        },
      };

      try {
        const res = await axios.post("http://localhost:8000/api/plan/get", params);
        if (!res.data.result.list || res.data.result.list.length === 0) {
          this.$message.warning("暂无未完成的计划");
          return;
        }

        const allPlans = res.data.result.list;

        // 将计划分为父计划和子计划
        const parentPlans = allPlans.filter((plan) => !plan.preplanid);
        const childPlans = allPlans.filter((plan) => plan.preplanid);

        // 将子计划添加到对应父计划的children数组中
        parentPlans.forEach((parent) => {
          parent.children = childPlans.filter(
            (child) => child.preplanid === parent.id
          );
        });

        // 按类型筛选父计划
        const typePlans = parentPlans.filter((plan) => 
          plan.type === type || plan.type === String(type));

        switch (type) {
          case 0:
            this.tableData1 = typePlans.reverse();
            break;
          case 1:
            this.tableData2 = typePlans.reverse();
            break;
          case 2:
            this.tableData3 = typePlans.reverse();
            break;
        }
      } catch (error) {
        console.error("查询失败:", error);
        this.$message.error(`查询失败: ${error.message}`);
      }
    },
    // 添加行类名方法
    tableRowClassName({ row }) {
      return row.status === "1" ? "completed-row" : "";
    },
    handleRowClick(row) {
      // 存储选中行的 id 和 type
      this.selectedRowId = row.id;
      this.selectedRowType = row.type;

      // 将选中行的内容填充到第一列的新增输入框中（用于编辑）
      this.newPlan1 = row.plan;
      this.newPlanFinishTime1 = row.planfinishtime;

      // 同时更新对应的编辑框内容和时间（保持原有逻辑）
      switch (row.type) {
        case 0:
          this.newEditPlan1 = row.plan;
          this.editPlanFinishTime1 = row.planfinishtime;
          break;
        case 1:
          this.newEditPlan2 = row.plan;
          this.editPlanFinishTime2 = row.planfinishtime;
          break;
        case 2:
          this.newEditPlan3 = row.plan;
          this.editPlanFinishTime3 = row.planfinishtime;
          break;
      }
    },
    async editPlan(type) {
      // 获取对应的编辑框内容和时间
      const editContent = this[`newEditPlan${type + 1}`];
      const editFinishTime = this[`editPlanFinishTime${type + 1}`];

      if (!this.selectedRowId || this.selectedRowType !== type) {
        this.$message.warning("请先选择要编辑的计划");
        return;
      }

      if (!editContent.trim()) {
        this.$message.warning("请输入编辑内容");
        return;
      }

      const params = {
        plan: editContent,
        planfinishtime: editFinishTime,
        id: this.selectedRowId,
      };

      try {
        const res = await axios.post("http://localhost:8000/api/plan/update", params);
        if (res.data.result.code == 200) {
          this.$message.success("编辑成功");
          this[`newEditPlan${type + 1}`] = ""; // 清空编辑框
          this[`editPlanFinishTime${type + 1}`] = null; // 清空时间
          this.getPlanData(); // 刷新数据
        } else {
          this.$message.error("编辑失败");
        }
      } catch (error) {
        console.error("编辑失败:", error);
        this.$message.error(`编辑失败: ${error.message}`);
      }
    },
    handleDateSelect(date, row) {
      console.log("handleDateSelect date = ", date);
      const formattedDate = `${date.getFullYear()}年${
        date.getMonth() + 1
      }月${date.getDate()}日`;
      row.date = formattedDate;

      const params = {
        date: formattedDate,
        planfinishtime: formattedDate, // 添加 planfinishtime 字段
        id: row.id,
      };

      axios.post("http://localhost:8000/api/plan/update", params)
        .then((res) => {
          if (res.data.result.code == 200) {
            this.$message.success("日期更新成功");
            // 关闭日历弹出框
            this.$refs.datePopover.hide();
          } else {
            this.$message.error("日期更新失败");
          }
        })
        .catch((error) => {
          console.error("更新失败:", error);
          this.$message.error(`更新失败: ${error.message}`);
        });
    },

    async handleDateChange(date, row) {
      if (!date) return;

      // 修改日期格式为 YYYY-MM-DD
      const formattedDate = date.toISOString().split("T")[0];
      const params = {
        planfinishtime: row.planfinishtime,
        date: formattedDate,
        id: row.id,
      };

      try {
        const res = await axios.post("http://localhost:8000/api/plan/update", params);
        if (res.data.result.code == 200) {
          this.$message.success("计划完成时间已更新");
          row.date = formattedDate; // 更新本地数据
        } else {
          this.$message.error("更新失败");
        }
      } catch (error) {
        console.error("更新失败:", error);
        this.$message.error(`更新失败: ${error.message}`);
      }
    },
    getDaysLeft(planfinishtime) {
      if (planfinishtime == null) {
        return "";
      }
      const today = new Date();
      const targetDate = new Date(planfinishtime);
      const timeDiff = targetDate.getTime() - today.getTime();
      return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    },
    isOverdue(planfinishtime) {
      if (planfinishtime == null) {
        return false;
      }
      return this.getDaysLeft(planfinishtime) <= 0;
    },
    handleRowDblClick(row) {
      this.selectedRow = row;
      this.showPopup = true;
      // 将选中的计划存入本地存储
      localStorage.setItem("selectedPlan", JSON.stringify(row));
    },
    closePopup() {
      this.showPopup = false;
      // 清除本地存储
      localStorage.removeItem("selectedPlan");
    },
    handleComplete() {
      // 在这里添加完成任务的逻辑
      this.closePopup();
    },
    // 添加日期格式化方法
    formatDate(date) {
      if (!date) return "";
      const d = new Date(date);
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    },
    // 添加键盘事件处理方法
    handleNewPlanKeydown(e) {
      // 如果按下的是 Enter 键且没有同时按下 Alt 键
      if (e.key === 'Enter' && !e.altKey) {
        e.preventDefault(); // 阻止默认行为
        // 根据输入框确定类型并调用添加方法
        const type = this.getTypeFromInputRef(e.target);
        this.addPlan(type);
      }
      // 如果是 Alt+Enter，手动插入换行符
      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault(); // 阻止默认行为
        // 在光标位置插入换行符
        const cursorPosition = e.target.selectionStart;
        const inputName = this.getInputNameFromRef(e.target);
        const textBeforeCursor = this[inputName].substring(0, cursorPosition);
        const textAfterCursor = this[inputName].substring(cursorPosition);
        this[inputName] = textBeforeCursor + '\n' + textAfterCursor;
        
        // 设置光标位置到换行符后
        this.$nextTick(() => {
          e.target.selectionStart = cursorPosition + 1;
          e.target.selectionEnd = cursorPosition + 1;
        });
      }
    },
    
    // 编辑计划的键盘事件处理
    handleEditPlanKeydown(e) {
      // 如果按下的是 Enter 键且没有同时按下 Alt 键
      if (e.key === 'Enter' && !e.altKey) {
        e.preventDefault(); // 阻止默认行为
        // 根据输入框确定类型并调用编辑方法
        const type = this.getTypeFromInputRef(e.target);
        this.editPlan(type);
      }
      // 如果是 Alt+Enter，手动插入换行符
      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault(); // 阻止默认行为
        // 在光标位置插入换行符
        const cursorPosition = e.target.selectionStart;
        const inputName = this.getInputNameFromRef(e.target);
        const textBeforeCursor = this[inputName].substring(0, cursorPosition);
        const textAfterCursor = this[inputName].substring(cursorPosition);
        this[inputName] = textBeforeCursor + '\n' + textAfterCursor;
        
        // 设置光标位置到换行符后
        this.$nextTick(() => {
          e.target.selectionStart = cursorPosition + 1;
          e.target.selectionEnd = cursorPosition + 1;
        });
      }
    },
    
    // 子计划的键盘事件处理
    handleSubPlanKeydown(e) {
      // 如果按下的是 Enter 键且没有同时按下 Alt 键
      if (e.key === 'Enter' && !e.altKey) {
        e.preventDefault(); // 阻止默认行为
        this.confirmAddSubPlan();
      }
      // 如果是 Alt+Enter，手动插入换行符
      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault(); // 阻止默认行为
        // 在光标位置插入换行符
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = this.subPlanContent.substring(0, cursorPosition);
        const textAfterCursor = this.subPlanContent.substring(cursorPosition);
        this.subPlanContent = textBeforeCursor + '\n' + textAfterCursor;
        
        // 设置光标位置到换行符后
        this.$nextTick(() => {
          e.target.selectionStart = cursorPosition + 1;
          e.target.selectionEnd = cursorPosition + 1;
        });
      }
    },
    
    // 根据输入框引用获取类型
    getTypeFromInputRef(target) {
      if (target === this.$refs.newPlanInput1 || target === this.$refs.editPlanInput1) {
        return 0;
      } else if (target === this.$refs.newPlanInput2 || target === this.$refs.editPlanInput2) {
        return 1;
      } else if (target === this.$refs.newPlanInput3 || target === this.$refs.editPlanInput3) {
        return 2;
      }
      // 默认返回第一列
      return 0;
    },
    
    // 根据输入框引用获取输入框名称
    getInputNameFromRef(target) {
      if (target === this.$refs.newPlanInput1) {
        return 'newPlan1';
      } else if (target === this.$refs.newPlanInput2) {
        return 'newPlan2';
      } else if (target === this.$refs.newPlanInput3) {
        return 'newPlan3';
      } else if (target === this.$refs.editPlanInput1) {
        return 'newEditPlan1';
      } else if (target === this.$refs.editPlanInput2) {
        return 'newEditPlan2';
      } else if (target === this.$refs.editPlanInput3) {
        return 'newEditPlan3';
      }
      return '';
    },

    // 清空选择，回到新增模式
    clearSelection() {
      this.selectedRowId = null;
      this.selectedRowType = null;
      this.newPlan1 = "";
      this.newPlanFinishTime1 = null;
    },
  },
};
</script>

<style scoped>
.plan-container {
  padding: 10px;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  gap: 20px;
  height: calc(100vh - 10px);
  position: relative;
  width: 100%;
  overflow-x: auto;
}

.plan-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  background: #ffffff;
  border-radius: 8px;
  padding: 15px;
  position: relative;
  min-width: 0;
  flex-shrink: 0;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.input-row .el-input {
  flex: 1;
}

.input-row .el-date-picker {
  flex-shrink: 0;
}

.column-header {
  padding: 10px;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-tag {
  font-size: 16px;
  font-weight: bold;
  color: #409eff;
  background-color: #ecf5ff;
  padding: 5px 15px;
  border-radius: 4px;
  border: 1px solid #d9ecff;
  display: inline-block;
}

:deep(.el-table .cell) {
  text-align: left;
}

:deep(.el-input__wrapper) {
  height: 40px;
}

:deep(.el-button) {
  height: 40px;
  font-size: 16px;
}

.full-width-btn {
  width: 100%;
}

:deep(.el-textarea__inner) {
  min-height: 80px;
}

.input-row .el-button {
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
}

:deep(.el-table__row) {
  height: 50px !important;
  line-height: 50px !important;
  cursor: pointer;
}

:deep(.completed-row) {
  color: #909399 !important;
  text-decoration: line-through;
  background-color: #f9f9f9 !important;
}

:deep(.completed-row:hover) {
  background-color: #f0f2f5 !important;
}

:deep(.completed-row .el-tag) {
  opacity: 0.8;
}

:deep(.el-table) {
  font-size: 20px !important;
}

:deep(.el-table th) {
  font-size: 20px !important;
  font-weight: bold !important;
}

:deep(.el-tag) {
  font-size: 20px !important;
  padding: 4px 8px !important;
}

:deep(.completed-row) {
  color: #909399 !important;
  text-decoration: line-through;
  background-color: #f5f7fa !important;
}

:deep(.el-table__row) {
  height: 60px !important;
  line-height: 60px !important;
}

:deep(.el-table) {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.plan-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
}

.plan-text {
  font-size: 20px;
  line-height: 1;
  flex: 1;
}

.plan-date {
  font-size: 14px;
  color: #909399;
  line-height: 1;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.calendar-icon {
  margin-left: 8px;
  font-size: 16px;
  color: #909399;
  cursor: pointer;
  vertical-align: middle;
}

.calendar-icon:hover {
  color: #409eff;
}

:deep(.el-calendar) {
  --el-calendar-cell-width: 35px;
  --el-calendar-header-height: 40px;
}

:deep(.el-calendar-day) {
  height: 35px;
  padding: 4px;
  text-align: center;
}

:deep(.el-calendar__header) {
  padding: 8px 12px;
}

:deep(.el-calendar-table) {
  padding: 8px;
}

:deep(.el-calendar tr) {
  height: auto;
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding: 0;
  height: 30px;
}

:deep(.el-input__wrapper):hover {
  box-shadow: none !important;
  padding: 0;
  background: none;
}

:deep(.el-dialog) {
  border-radius: 8px;
}

:deep(.el-dialog__header) {
  margin: 0;
  padding: 20px;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: bold;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 20px;
}

:deep(.el-textarea__inner) {
  font-size: 20px !important;
  padding: 12px !important;
  min-height: 120px !important;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}

:deep(.dialog-footer .el-button) {
  min-width: 100px;
  height: 40px;
  font-size: 16px;
}
:deep(.el-table__placeholder) {
  display: none;
}

.popup-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background: white;
  padding: 50px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  font-size: 50px;
  margin: 20px 0;
}

.popup-content-div {
  font-size: 30px;
  margin: 20px 0;
}

.popup-content-div p {
  height: 60px;
  line-height: 60px;
}
.popup-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.popup-buttons .el-button {
  height: 60px;
  font-size: 20px;
  padding: 0 30px;
}

.frosted-overlay {
  position: absolute;
  top: 60px;
  left: 0;
  width: 100%;
  height: calc(100% - 60px);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.show-button {
  font-size: 20px !important;
  padding: 20px 40px !important;
  height: auto !important;
}

:deep(.el-table thead) {
  background-color: #fff !important;
}

:deep(.el-table th.el-table__cell) {
  background-color: #fff !important;
  border-bottom: 5px solid #ebeef5 !important;
}

:deep(.el-table .el-table__cell) {
  z-index:0!important;
}
</style>


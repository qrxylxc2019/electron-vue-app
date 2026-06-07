<template>
  <div class="echarts-summary">
    <div class="top-container">
      <div class="image-container" ref="imageContainer">
        <el-carousel :interval="4000" type="card" :height="carouselHeight">
          <el-carousel-item v-for="i in 10" :key="i">
            <img :src="getImageUrl(i)" class="summary-image" />
          </el-carousel-item>
        </el-carousel>
      </div>
    </div>

    <div>
      <div class="middle-container">
        <div class="stat-box">
          <img src="../../assets/images/1.jpg" class="stat-icon" />
          <div class="stat-content">
            <div class="stat-title">总计划数</div>
            <div class="stat-number">123</div>
          </div>
        </div>
        <div class="stat-box">
          <img src="../../assets/images/1.jpg" class="stat-icon" />
          <div class="stat-content">
            <div class="stat-title">已完成计划</div>
            <div class="stat-number">89</div>
          </div>
        </div>
        <div class="stat-box">
          <img src="../../assets/images/1.jpg" class="stat-icon" />
          <div class="stat-content">
            <div class="stat-title">进行中计划</div>
            <div class="stat-number">34</div>
          </div>
        </div>
        <div class="stat-box">
          <img src="../../assets/images/1.jpg" class="stat-icon" />
          <div class="stat-content">
            <div class="stat-title">总题目数</div>
            <div class="stat-number">562</div>
          </div>
        </div>
        <div class="stat-box">
          <img src="../../assets/images/1.jpg" class="stat-icon" />
          <div class="stat-content">
            <div class="stat-title">已完成题目</div>
            <div class="stat-number">428</div>
          </div>
        </div>
      </div>
    </div>

    <div class="charts-container">
      <div class="chart-box">
        <div class="chart-header">
          <h3>计划完成汇总</h3>
          <el-radio-group v-model="planTimeType" @change="fetchPlanData">
            <el-radio-button label="day">按天</el-radio-button>
            <el-radio-button label="month">按月</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="planChart" class="chart"></div>
      </div>

      <div class="chart-box">
        <div class="chart-header">
          <h3>做题汇总</h3>
          <el-radio-group
            v-model="exerciseTimeType"
            @change="fetchExerciseData"
          >
            <el-radio-button label="day">按天</el-radio-button>
            <el-radio-button label="month">按月</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="exerciseChart" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from "echarts";
import axios from "axios";

export default {
  name: "EchartsSummary",

  data() {
    return {
      planChart: null,
      exerciseChart: null,
      planTimeType: "day",
      exerciseTimeType: "day",
      planChartInstance: null,
      exerciseChartInstance: null,
      carouselHeight: 0,
    };
  },

  mounted() {
    this.initCharts();
    this.fetchPlanData();
    this.fetchExerciseData();
    this.carouselHeight = this.$refs.imageContainer.clientHeight - 20 + "px";
  },

  methods: {

    initCharts() {
      this.planChartInstance = echarts.init(this.$refs.planChart);
      this.exerciseChartInstance = echarts.init(this.$refs.exerciseChart);
    },

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    async fetchPlanData() {
      try {
        let startTime, endTime;

        if (this.planTimeType === "day") {
          // 按天：查询最近一周（7天）
          const start = new Date();
          start.setDate(start.getDate() - 6);
          startTime = this.formatDate(start);

          const end = new Date();
          endTime = this.formatDate(end);
        } else {
          // 按月：查询最近半年（6个月）
          const start = new Date();
          start.setMonth(start.getMonth() - 5);
          start.setDate(1);
          startTime = this.formatDate(start);

          const end = new Date();
          end.setMonth(end.getMonth() + 1, 0);
          endTime = this.formatDate(end);
        }

        const params = {
          action: "planSummary",
          type: this.planTimeType,
          startTime,
          endTime,
        };
        const res = await axios.post("http://localhost:8000/api/ehartsSummary/planSummary", params);
        console.log("planSummary data", params, res.data);
        
        if (res.data.code === 200) {
          const result = res.data.result;
          const option = {
            tooltip: {
              trigger: "axis",
              axisPointer: {
                type: "shadow",
              },
            },
            legend: {
              data: ["计划数", "已完成"],
            },
            grid: {
              left: "3%",
              right: "4%",
              bottom: "3%",
              containLabel: true,
            },
            xAxis: {
              type: "category",
              data: result.dates,
            },
            yAxis: { type: "value" },
            series: [
              {
                name: "计划数",
                data: result.planCounts,
                type: "bar",
                label: {
                  show: true,
                  position: "top",
                },
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#ffd93d" },
                    { offset: 1, color: "#ff9500" },
                  ]),
                },
              },
              {
                name: "已完成",
                data: result.finishCounts,
                type: "bar",
                label: {
                  show: true,
                  position: "top",
                },
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#83bff6" },
                    { offset: 0.5, color: "#188df0" },
                    { offset: 1, color: "#188df0" },
                  ]),
                },
              },
            ],
          };
          this.planChartInstance.setOption(option);
        }
      } catch (error) {
        console.error("获取计划数据失败:", error);
      }
    },

    async fetchExerciseData() {
      try {
        // 生成测试数据
        const mockData = {
          dates: [],
          values: [],
        };

        if (this.exerciseTimeType === "day") {
          // 生成最近7天的数据
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            mockData.dates.push(`${date.getMonth() + 1}/${date.getDate()}`);
            mockData.values.push(Math.floor(Math.random() * 20 + 5));
          }
        } else {
          // 生成最近6个月的数据
          for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            mockData.dates.push(`${date.getMonth() + 1}月`);
            mockData.values.push(Math.floor(Math.random() * 200 + 50));
          }
        }

        const option = {
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: mockData.dates },
          yAxis: { type: "value" },
          series: [
            {
              data: mockData.values,
              type: "line",
              smooth: true,
              lineStyle: {
                color: "#188df0",
                width: 2,
              },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(24, 141, 240, 0.8)" }, // 线附近颜色较深
                  { offset: 0.5, color: "rgba(24, 141, 240, 0.4)" }, // 中间渐变
                  { offset: 1, color: "rgba(24, 141, 240, 0.1)" }, // 底部颜色较浅
                ]),
              },
              itemStyle: {
                color: "#188df0",
              },
            },
          ],
        };
        this.exerciseChartInstance.setOption(option);
      } catch (error) {
        console.error("获取做题数据失败:", error);
      }
    },

    getImageUrl(index) {
      return new URL(`../../assets/images/${index}.jpg`, import.meta.url).href;
    },
  },
};
</script>

<style scoped>
.echarts-summary {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.top-container {
  display: flex;
  gap: 20px;
}

.image-container {
  flex: 1;
  border-radius: 8px;
  padding: 10px;
  height: 380px;
  overflow: hidden;
  background:#fafafa
}

.btn-box {
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.charts-container {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0; /* 防止flex布局溢出 */
}

.chart-box {
  flex: 1;
  background: linear-gradient(to bottom, #ffffff, #fafafa);
  padding: 20px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.chart {
  flex: 1;
  min-height: 0; /* 防止flex布局溢出 */
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  border-left: 5px solid #409EFF; /* 蓝色边框，宽度20px */
  padding-left: 10px; /* 添加左侧内边距 */
  margin: 0; /* 移除默认外边距 */
}

.summary-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  margin: 0 auto;
}

:deep(.el-carousel__container) {
  height: 100%;
}

.middle-container {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  background: #fff;
  border-radius: 8px;
}

.stat-box {
  flex: 1;
  height: 100px;
  display: flex;
  align-items: center;
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
  border-radius: 8px;
  padding: 10px;
}

.stat-icon {
  height: 100%;
  width: auto;
  margin-right: 15px;
  border-radius: 5px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-title {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
  
}

.stat-number {
  font-size: 30px;
  font-weight: bold;
  color: #409EFF;
}
</style> 
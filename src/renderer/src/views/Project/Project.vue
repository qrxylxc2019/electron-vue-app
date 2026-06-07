<template>
  <section id="hero">
    <div class="container">
      <!-- 新增计划列表 -->
      <div style="display:none" class="plan-column" :class="{ 'plan-column-hidden': !isPlanColumnVisible }">
        <div class="top-div">
          <div class="search-container">
            <el-input
              v-model="searchQuery"
              placeholder="搜索"
              class="search-input"
              clearable
            ></el-input>
          </div>
          <div>
            <el-icon 
              style="height: 40px; width: 40px; color: #409EFF; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px;"
              @click="generateDailyReport"
              title="生成日报"
            >
              <Document />
            </el-icon>
          </div>
          <div>
            <el-icon 
              style="height: 40px; width: 40px; color: #409EFF; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px;"
              @click="refreshUnfinishedPlans"
              title="刷新未完成计划"
            >
              <Refresh />
            </el-icon>
          </div>
          <div class="mode-switch">
            <el-switch
              v-model="isTimelineMode"
              active-text="时间轴"
              style="--el-switch-on-color: #8b9a6d; --el-switch-off-color: #9a9590"
            />
          </div>
        </div>
        <div class="plan-table">
          <!-- 列表模式 -->
          <div v-if="!isTimelineMode" class="list-mode">
            <el-table
              :data="displayPlanData"
              style="width: 100%"
              :height="tableHeight"
              stripe
              :show-header="false"
              :row-class-name="tableRowClassName"
              v-loading="planLoading"
              @scroll="handlePlanTableScroll"
              @row-click="handlePlanRowClick"
            >
            <el-table-column prop="plan" label="计划">
              <template #default="scope">
                <div class="plan-content">
                  <img 
                    src="@/assets/png/html.png" 
                    class="plan-icon"
                    alt="HTML图标"
                  />
                  <div class="plan-text">
                    {{ getPlanContent(scope.row.plan) }}
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="150">
              <template #default="scope">
                <el-select
                  v-model="scope.row.status"
                  style="width: 100%"
                  :class="{
                    'status-completed': scope.row.status == '1',
                    'status-pending': scope.row.status != '1'
                  }"
                  @change="handleStatusChange(scope.row)"
                >
                  <el-option 
                    :label="scope.row.status == '1' && statusCountdowns[scope.row.id] ? `已完成(${statusCountdowns[scope.row.id]}s)` : '已完成'" 
                    value="1" 
                  />
                  <el-option label="未完成" value="0" />
                </el-select>
              </template>
            </el-table-column>
            </el-table>
          </div>
          
          <!-- 时间轴模式 -->
          <div v-else class="timeline-mode" :style="{ height: tableHeight + 'px' }">
            <div v-loading="planLoading" class="timeline-container">
              <div class="timeline-gradient-mask">
                <el-timeline v-if="timelineData.length > 0">
                  <el-timeline-item
                      v-for="(item, index) in timelineData"
                      :key="item.id || index"
                      :timestamp="getItemTimestamp(item)"
                      placement="top"
                      :type="getTimelineItemType(item)"
                    >
                      <el-card class="timeline-card">
                        <div
                          class="timeline-item"
                          :class="{ 'completed': item.status === '1', 'reminder': item.isReminder }"
                          @click="handleTimelineItemClick(item)"
                        >
                          <div class="timeline-item-content">
                            <div class="plan-text">
                              {{ getPlanContent(item.plan) }}
                            </div>
                            <div class="project-name" style="display:none">
                              {{ getProjectName(item.plan) }}
                            </div>
                          </div>
                          <div class="timeline-item-actions">
                            <el-icon 
                              :class="item.status == '1' ? 'status-icon completed' : 'status-icon pending'"
                              @click.stop="handlePlanRowDblClick(item)"
                            >
                              <Check v-if="item.status == '1'" />
                              <Document v-else />
                            </el-icon>
                          </div>
                        </div>
                      </el-card>
                    </el-timeline-item>
                </el-timeline>
              </div>
            </div>
          </div>
          <div class="button-group">
            <div class="input-container">
              <div class="input-group">
                <div>
                  <div class="label-container">
                    <div class="label">完成内容</div>
                    <div class="button-row">
                      
                      <el-icon 
                        style="height: 40px; width: 40px; color: #409EFF; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; "
                        @click="showProjectPlan"
                        title="计划悬浮窗"
                      >
                        <Calendar />
                      </el-icon>
                      <el-icon 
                        style="height: 40px; width: 40px; color: #409EFF; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px;"
                        @click="handleAddNew"
                        title="添加计划"
                      >
                        <Plus />
                      </el-icon>
                      
                    </div>
                  </div>
                </div>
                <el-input
                  size="large"
                  v-model="newPlan"
                  type="textarea"
                  :rows="3"
                  style="font-size: 20px"
                  placeholder="请输入完成内容"
                  clearable
                  @keydown="handleNewPlanKeydown"
                  ref="newPlanInput"
                ></el-input>
              </div>
            </div>
            <div class="button-container">
              <el-button
                type="primary"
                style="height: 60px; flex: 1"
                @click="isEditingPlan ? updateProjectPlan() : addProjectPlan()"
                >保存</el-button
              >
            </div>

          </div>
        </div>
      </div>

      <div class="project-column">
        <div class="top-div">
          <h2 class="section-title">项目内容</h2>
          <el-button 
            type="text" 
            @click="togglePlanColumn"
            class="toggle-button"
            :title="isPlanColumnVisible ? '隐藏计划面板' : '显示计划面板'"
          >
            <el-icon :class="{ 'rotate-icon': !isPlanColumnVisible }">
              <ArrowLeft />
            </el-icon>
          </el-button>
        </div>
        <div class="project-content">
          
          <!-- 左侧窄表格 -->
          <div class="leftDiv">
            <div class="search-container project-search">
              <el-input
                v-model="projectSearchQuery"
                placeholder="搜索项目"
                class="search-input"
                clearable
                style="flex: 1;"
              ></el-input>
              <el-button type="primary" size="large" @click="handleAdd" style="margin-left: 10px; width: 40px; padding: 0;">
                <el-icon><Plus /></el-icon>
              </el-button>
            </div>
            <el-table
              :data="filteredTableData"
              style="width: 100%; flex: 1; min-height: 0;"
              size="large"
              stripe
              :show-header="false"
              @row-click="handleRowClick"
              v-loading="projectLoading"
              v-pull-refresh="handlePullRefresh"
              @scroll="handleProjectTableScroll"
            >
              <el-table-column prop="project" label="标题" min-width="180">
                <template #default="{ row }">
                  <span :style="{ fontWeight: (currentId === row.id || row.isTemp) ? 'bold' : 'normal' }">{{ row.project }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="50" fixed="right">
                <template #default="{ row }">
                  <el-icon 
                    class="delete-icon" 
                    @click.stop="handleDelete(row)"
                  >
                    <Delete />
                  </el-icon>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination
              class="pagination"
              :current-page="currentPage"
              :total="total"
              :prev-text="'上一页'"
              :next-text="'下一页'"
              layout="prev, next"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
          <!-- 右侧编辑器 -->
          <div class="content">
            <div class="content-wrapper">
              <div class="title-input">
                <el-input
                  v-model="title"
                  size="large"
                  placeholder="请输入标题"
                  clearable
                ></el-input>
                
                <el-button type="primary" size="large" @click="handleSave"
                  >保存</el-button
                >
              </div>
              <div class="editor-container">
                <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" mode="simple" style="border-bottom: 1px solid #e8e4df" />
                <Editor v-model="editorHtml" :defaultConfig="editorConfig" mode="simple" style="height: calc(100vh - 260px); overflow-y: auto;" @onCreated="handleEditorCreated" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-dialog
        v-model="dailyReportVisible"
        title="今日完成事项"
        width="50%"
        :before-close="handleClose"
      >
        <!-- 添加时间线视图 -->
        <el-timeline style="max-height: 600px">
          <el-timeline-item
            v-for="(group, date) in groupedDailyReport"
            :key="date"
            :timestamp="date"
            placement="top"
          >
            <div class="time-line-div">
              <el-button
                type="primary"
                size="large"
                @click="copyAndClose(group)"
                style="font-size: 20px; margin-bottom: 20px"
                >复制并关闭</el-button
              >
              <div
                v-for="(item, index) in group"
                :key="index"
                class="timeline-content"
              >
                {{ index + 1 }}. {{ item.plan }}
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-dialog>
    </div>
  </section>
</template>
<script>
import '@wangeditor/editor/dist/css/style.css'; // 引入 wangEditor css
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import { ArrowLeft, Calendar, Check, Clock, Delete, Document, Loading, Plus, Refresh } from "@element-plus/icons-vue";

export default {
  name: 'Project',
  components: {
    ArrowLeft,
    Calendar,
    Check,
    Clock,
    Delete,
    Document,
    Editor,
    Loading,
    Plus,
    Refresh,
    Toolbar,
  },
  directives: {
    pullRefresh: {
      mounted(el, binding) {
        let startY = 0;
        let isRefreshing = false;
        
        // 添加下拉刷新相关样式
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'pull-refresh-indicator';
        refreshIndicator.style.position = 'absolute';
        refreshIndicator.style.top = '-40px';
        refreshIndicator.style.left = '0';
        refreshIndicator.style.width = '100%';
        refreshIndicator.style.height = '40px';
        refreshIndicator.style.display = 'flex';
        refreshIndicator.style.alignItems = 'center';
        refreshIndicator.style.justifyContent = 'center';
        refreshIndicator.style.transition = 'transform 0.3s';
        refreshIndicator.style.background = '#f5f7fa';
        refreshIndicator.innerHTML = '<span>下拉刷新</span>';
        
        el.style.position = 'relative';
        el.style.overflow = 'auto';
        el.appendChild(refreshIndicator);
        
        el.addEventListener('touchstart', (e) => {
          if (el.scrollTop === 0 && !isRefreshing) {
            startY = e.touches[0].pageY;
          }
        });
        
        el.addEventListener('touchmove', (e) => {
          if (el.scrollTop === 0 && !isRefreshing) {
            const currentY = e.touches[0].pageY;
            const distance = currentY - startY;
            
            if (distance > 0) {
              e.preventDefault();
              const pullDistance = Math.min(distance * 0.5, 60);
              el.style.transform = `translateY(${pullDistance}px)`;
              refreshIndicator.style.transform = `translateY(${pullDistance}px)`;
              
              if (pullDistance > 40) {
                refreshIndicator.innerHTML = '<span>释放刷新</span>';
              } else {
                refreshIndicator.innerHTML = '<span>下拉刷新</span>';
              }
            }
          }
        });
        
        el.addEventListener('touchend', (e) => {
          if (el.scrollTop === 0 && !isRefreshing) {
            const currentY = e.changedTouches[0].pageY;
            const distance = currentY - startY;
            
            if (distance > 40) {
              isRefreshing = true;
              el.style.transform = 'translateY(40px)';
              refreshIndicator.style.transform = 'translateY(40px)';
              refreshIndicator.innerHTML = '<span>正在刷新...</span>';
              
              // 执行绑定的刷新函数
              const refreshPromise = binding.value();
              
              if (refreshPromise && typeof refreshPromise.then === 'function') {
                refreshPromise.then(() => {
                  // 刷新完成后，恢复原状态
                  setTimeout(() => {
                    el.style.transform = 'translateY(0)';
                    refreshIndicator.style.transform = 'translateY(0)';
                    isRefreshing = false;
                  }, 500);
                });
              }
            } else {
              // 如果没触发刷新，直接恢复原状态
              el.style.transform = 'translateY(0)';
              refreshIndicator.style.transform = 'translateY(0)';
            }
          }
        });
      }
    }
  },
  data() {
    return {
      test: "",
      name: "",
      editorRef: null,
      editorHtml: '',
      toolbarConfig: {},
      editorConfig: {
        placeholder: '请输入内容',
        MENU_CONF: {},
      },
      tableData: [],
      filteredTableData: [],
      projectSearchQuery: '',
      projectLoading: false,
      projectFinished: false,
      title: "",
      currentId: 0,
      isEdit: false,
      currentPage: 1,
      pageNum: 20,
      total: 0,
      planData: [],
      newPlan: "",
      tableHeight: 0,
      projectTableHeight: 0,
      dailyReportVisible: false,
      dailyReportData: [],
      projectName: "",
      monthlyReportData: [],
      planLoading: false,
      planFinished: false,
      planCurrentPage: 1,
      planPageSize: 50,
      planTotal: 0,
      searchQuery: '',
      searchTimer: null,
      lastMessageKey: null,
      lastProjectMessageKey: null,
      projectSearchTimer: null,
      isEditingPlan: false,
      editingPlanId: null,
      isPlanColumnVisible: true,
      isTimelineMode: false,
      statusCountdowns: {}, // 存储每行的倒计时秒数
      countdownTimers: {}, // 存储倒计时定时器
    };
  },
  created() {
    try {
      this.getProjectPlans();
      this.getAllProjectData();
    } catch (error) {
      console.error('Error in created hook:', error);
    }
  },
  mounted() {
    try {
      // 设置表格高度
      this.calculateTableHeight();
      window.addEventListener("resize", this.calculateTableHeight);
    } catch (error) {
      console.error('Error in mounted hook:', error);
    }
  },
  beforeUnmount() {
    // 移除事件监听器
    window.removeEventListener("resize", this.calculateTableHeight);
    
    // 销毁编辑器实例
    if (this.editorRef) {
      this.editorRef.destroy();
      this.editorRef = null;
    }
    
    // 清理所有倒计时定时器
    if (this.countdownTimers) {
      Object.keys(this.countdownTimers).forEach(rowId => {
        clearInterval(this.countdownTimers[rowId]);
      });
      this.countdownTimers = {};
    }
  },
  unmounted() {
    try {
      // 清理所有可能的副作用
      if (this.editorRef) {
        this.editorRef.destroy();
        this.editorRef = null;
      }
      
      // 清理定时器等其他资源
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }
    } catch (error) {
      console.error('Error in unmounted hook:', error);
    }
  },
  beforeRouteLeave(to, from, next) {
    try {
      // 在路由离开前进行清理
      if (this.editorRef) {
        this.editorRef.destroy();
        this.editorRef = null;
      }
      next();
    } catch (error) {
      console.error('Error in route guard:', error);
      next(false);
    }
  },
  computed: {
    formattedDailyReport() {
      return this.dailyReportData
        .map((item, index) => `${index + 1}. ${item.plan}`)
        .join("\n");
    },
    groupedDailyReport() {
      const groups = {};
      this.dailyReportData.forEach((item) => {
        // 使用 finishtime 作为分组依据
        const date = item.finishtime;

        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(item);
      });
      
      // 对日期进行排序,最近的日期在上面
      const sortedGroups = {};
      Object.keys(groups).sort().reverse().forEach(date => {
        sortedGroups[date] = groups[date];
      });

      console.log('日报数据:', sortedGroups);
      
      return sortedGroups;
    },
    displayPlanData() {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0是周日，1是周一，4是周四

      // 基础数据（包含早会提醒）
      let baseData = [];
      
      // 添加每日日报提醒
      const dailyReportReminder = {
        plan: "【项目名称】日报【完成内容】需要提交日报",
        status: "0",
        isReminder: true,
        id: "daily-report-" + today.toISOString().split('T')[0] // 添加唯一标识，包含日期
      };
      
      // 将日报提醒添加到基础数据
      baseData.push(dailyReportReminder);

      // 添加打卡提醒
      const clockInReminder = {
        plan: "记得打卡哈",
        status: "0",
        isReminder: true,
        id: "clock-in-" + today.toISOString().split('T')[0]
      };
      baseData.push(clockInReminder);
      
      // 根据搜索关键字过滤数据
      let filteredData = this.planData;
      
      if (this.searchQuery && this.searchQuery.trim() !== '') {
        const query = this.searchQuery.toLowerCase().trim();
        filteredData = this.planData.filter(item => {
          // 搜索项目名称
          const projectName = this.getProjectName(item.plan).toLowerCase();
          // 搜索完成内容
          const planContent = this.getPlanContent(item.plan).toLowerCase();
          // 搜索整个计划文本
          const fullText = item.plan.toLowerCase();
          
          return projectName.includes(query) || 
                 planContent.includes(query) || 
                 fullText.includes(query);
        });
      }
      
      // 检查本地存储中是否有已完成的日报提醒
      const completedReminders = JSON.parse(localStorage.getItem('completedReminders') || '{}');
      const todayKey = today.toISOString().split('T')[0];
      
      // 更新提醒的状态而不是过滤掉它们
      baseData = baseData.map(item => {
        if (item.isReminder && item.id && item.id.startsWith('daily-report-')) {
          const dateKey = item.id.replace('daily-report-', '');
          if (completedReminders[dateKey]) {
            item.status = "1"; // 更新状态为已完成
          }
        }
        return item;
      });
      
      // 合并早会提醒和过滤后的数据
      return [...baseData, ...filteredData];
    },
    timelineData() {
      // 直接返回计划数据，不进行分组
      return this.displayPlanData;
    },
  },
  watch: {
    searchQuery(newVal) {
      // 清除之前的定时器
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }
      
      // 使用setTimeout延迟执行搜索，实现debounce
      this.searchTimer = setTimeout(() => {
        this.performSearch(newVal);
      }, 300); // 300ms延迟
    },
    projectSearchQuery(newVal) {
      // 使用debounce处理项目搜索
      if (this.projectSearchTimer) {
        clearTimeout(this.projectSearchTimer);
      }
      
      this.projectSearchTimer = setTimeout(() => {
        this.filterProjectData();
      }, 300); // 300ms延迟
    },
    tableData: {
      handler(newVal) {
        this.filterProjectData();
      },
      immediate: true
    }
  },
  methods: {
    // 编辑器创建回调
    handleEditorCreated(editor) {
      this.editorRef = editor;
    },

    // 执行搜索并显示反馈
    performSearch(query) {
      if (!query || query.trim() === '') {
        // 如果清空了搜索，重置为初始状态
        if (this.lastMessageKey) {
          this.$message.closeAll();
          this.lastMessageKey = null;
        }
        return;
      }
      
      this.$nextTick(() => {
        const count = this.displayPlanData.filter(item => !item.isReminder).length;
        
        // 关闭之前的消息
        if (this.lastMessageKey) {
          this.$message.closeAll();
        }
        
        if (count === 0) {
          this.lastMessageKey = this.$message.info('没有找到匹配的内容');
        } else {
          this.lastMessageKey = this.$message.success(`找到 ${count} 条匹配记录`);
        }
      });
    },
    // 过滤项目数据
    filterProjectData() {
      if (!this.projectSearchQuery || this.projectSearchQuery.trim() === '') {
        this.filteredTableData = this.tableData;
        return;
      }
      
      const query = this.projectSearchQuery.toLowerCase().trim();
      this.filteredTableData = this.tableData.filter(item => {
        const projectTitle = item.project ? item.project.toLowerCase() : '';
        return projectTitle.includes(query);
      });
      
      // 显示搜索结果反馈
      this.$nextTick(() => {
        const count = this.filteredTableData.length;
        
        // 关闭之前的消息
        if (this.lastProjectMessageKey) {
          this.$message.closeAll();
        }
        
        if (count === 0) {
          this.lastProjectMessageKey = this.$message.info('没有找到匹配的项目');
        } else {
          this.lastProjectMessageKey = this.$message.success(`找到 ${count} 条项目记录`);
        }
      });
    },
    async getAllProjectData() {
      try {
        this.projectLoading = true;
        const res = await window.electronAPI.getProjectList({
          page: this.currentPage,
          pageNum: this.pageNum,
          orderBy: {
            column: "id",
            type: "desc",
          },
        });

        console.log("获取到的数据:", res);
        if (res && res.list) {
          this.tableData = res.list || [];
          this.total = res.pagination?.total || 0;
          this.projectFinished = this.tableData.length >= this.total;
        } else {
          this.$message.error("获取数据失败");
        }
      } catch (error) {
        console.error("获取数据失败:", error);
        this.$message.error("获取数据失败: " + error.message);
      } finally {
        this.projectLoading = false;
      }
    },
    handleRowClick(row) {
      // 检查是否存在未保存的新增内容
      const tempRow = this.tableData.find(item => item.isTemp);
      if (tempRow) {
        // 从表格数据中移除临时行
        this.tableData = this.tableData.filter(item => !item.isTemp);
        this.filteredTableData = this.filteredTableData.filter(item => !item.isTemp);
      }

      this.title = row.project;
      this.currentId = row.id; // 保存当前编辑项的 ID
      this.editorHtml = row.content || "";
      this.isEdit = true; // 设置为编辑模式
    },
    // 修改保存方法
    async handleSave() {
      // 添加表单验证
      if (!this.title.trim()) {
        this.$message.warning("请输入标题");
        return;
      }

      const editorContent = this.editorHtml;
      if (!editorContent.trim()) {
        this.$message.warning("请输入内容");
        return;
      }

      try {
        let result;
        if (this.isEdit) {
          // 更新
          result = await window.electronAPI.updateProject(this.currentId, {
            project: this.title,
            content: editorContent
          });
        } else {
          // 新增
          result = await window.electronAPI.addProject({
            project: this.title,
            content: editorContent
          });
          this.title = "";
           this.editorHtml = "";
        }

        if (result) {
          this.$message.success(this.isEdit ? "更新成功" : "保存成功");
          this.getAllProjectData();
        } else {
          this.$message.error(this.isEdit ? "更新失败" : "保存失败");
        }
      } catch (err) {
        console.error(this.isEdit ? "更新失败:" : "保存失败:", err);
        this.$message.error(this.isEdit ? "更新失败" : "保存失败");
      }
    },
    // 添加新增方法
    handleAdd() {
      // 生成一个临时的唯一ID（使用负数，避免与数据库ID冲突）
      const tempId = -Date.now();
      
      // 创建临时记录
      const tempRecord = {
        id: tempId,
        project: "新内容",
        content: "",
        isTemp: true // 标记为临时记录
      };
      
      // 将临时记录添加到表格数据的最前面
      this.tableData.unshift(tempRecord);
      this.filteredTableData = [...this.tableData];
      
      // 设置当前编辑状态
      this.title = "";
      this.editorHtml = "";
      this.currentId = tempId;
      this.isEdit = false;
      
      this.$message.success("新增一条");
    },
    // 修改删除方法
    async handleDelete(row) {
      try {
        await this.$confirm("确认删除这条记录吗?", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        });

        const result = await window.electronAPI.deleteProject(row.id);

        if (result) {
          this.$message.success("删除成功");
          this.getAllProjectData();
          // 如果删除的是当前正在编辑的项，清空编辑器
          if (this.currentId === row.id) {
            this.title = ""; // 清空标题
            this.editorHtml = ""; // 清空编辑器内容
            this.currentId = ''; // 清空当前编辑项的 ID
            this.isEdit = false; // 设置为新增模式
          }
        } else {
          this.$message.error("删除失败");
        }
      } catch (err) {
        if (err !== 'cancel') {  // 忽略用户取消操作的错误
          console.error("删除失败:", err);
          this.$message.error("删除失败");
        }
      }
    },
    handleSizeChange(val) {
      this.pageNum = val;
      this.getAllProjectData();
    },
    handleCurrentChange(val) {
      this.currentPage = val;
      this.getAllProjectData();
    },
    // 新增方法
    async getProjectPlans(isLoadMore = false) {
      if (this.planLoading || (this.planFinished && isLoadMore)) {
        return;
      }

      try {
        this.planLoading = true;
        const allPlans = await window.electronAPI.getPlans();
        // 过滤 type=3 且 status=0 的计划
        let newData = allPlans.filter(p => p.type === '3' && p.status === '0');
        // 按 id 倒序
        newData.sort((a, b) => b.id - a.id);
        this.planTotal = newData.length;

        if (isLoadMore) {
          // 追加新数据
          this.planData = [...this.planData, ...newData];
        } else {
          // 重置数据
          this.planData = newData;
          this.planCurrentPage = 1;
        }

        // 判断是否加载完所有数据
        this.planFinished = this.planData.length >= this.planTotal;
        
        console.log('数据加载状态：', {
          currentPage: this.planCurrentPage,
          totalItems: this.planTotal,
          loadedItems: this.planData.length,
          isFinished: this.planFinished
        });
      } catch (error) {
        console.error('Failed to get project plans:', error);
        this.$message.error('获取计划列表失败');
      } finally {
        this.planLoading = false;
      }
    },

    async addProjectPlan() {
      if (!this.newPlan.trim()) {
        this.$message.warning("请输入完成内容");
        return;
      }

      if (!this.projectName.trim()) {
        this.projectName = this.newPlan;
      }

      const currentDate = new Date();
      const formattedDate = `${currentDate.getFullYear()}年${
        currentDate.getMonth() + 1
      }月${currentDate.getDate()}日`;

      const params = {
        plan: this.newPlan,
        status: "0",
        date: formattedDate,
        type: "3",
      };

      try {
        const result = await window.electronAPI.addPlan(params);
        if (result) {
          this.$message.success("添加成功");
          this.projectName = "";
          this.newPlan = "";
          this.getProjectPlans();
          // 设置焦点回到输入框
          this.$nextTick(() => {
            if (this.$refs.newPlanInput) {
              this.$refs.newPlanInput.focus();
            }
          });
        }
      } catch (error) {
        console.error("添加计划失败:", error);
        this.$message.error("添加失败");
      }
    },

    async handlePlanRowClick(row) {
      // 如果是提醒行，不处理
      if (row.isReminder) {
        return;
      }
      
      // 设置编辑状态
      this.isEditingPlan = true;
      this.editingPlanId = row.id;
      
      // 反显数据到输入框
      this.newPlan = this.getPlanContent(row.plan);
      this.projectName = this.getProjectName(row.plan);
    },

    // 更新计划
    async updateProjectPlan() {
      console.log( "更新计划")
      if (!this.newPlan.trim()) {
        this.$message.warning("请输入完成内容");
        return;
      }

      try {
        const success = await window.electronAPI.updatePlan(this.editingPlanId, {
          plan: this.newPlan,
          status: "0",
          type: "3",
        });

        if (success) {
          this.$message.success("更新成功");
          // 重置编辑状态
          this.isEditingPlan = false;
          this.editingPlanId = null;
          this.projectName = "";
          this.newPlan = "";
          // 刷新数据
          await this.getProjectPlans();
          // 设置焦点回到输入框
          this.$nextTick(() => {
            if (this.$refs.newPlanInput) {
              this.$refs.newPlanInput.focus();
            }
          });
        } else {
          this.$message.error("更新失败");
        }
      } catch (error) {
        console.error("更新计划失败:", error);
        this.$message.error("更新失败: " + error.message);
      }
    },

    refreshUnfinishedPlans() {
      this.newPlan = "";
      this.projectName =  "";
      
      // 此处不需要修改，因为已经在displayPlanData中处理了过滤逻辑
      this.planCurrentPage = 1;
      this.planFinished = false;
      this.planData = [];
      this.getProjectPlans();
      this.getAllProjectData();
      
      // 提醒用户
      this.$message.success("未完成计划已刷新");
    },

    calculateTableHeight() {
      try {
        const windowHeight = window.innerHeight;
        const otherElementsHeight = 328;
        this.tableHeight = windowHeight - otherElementsHeight;
      } catch (error) {
        console.error('Error calculating table height:', error);
        this.tableHeight = 510;
      }
    },

    async generateDailyReport() {
      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      const formattedToday = `${today.getFullYear()}年${
        today.getMonth() + 1
      }月${today.getDate()}日`;
      const formattedFirstDay = `${firstDayOfMonth.getFullYear()}年${
        firstDayOfMonth.getMonth() + 1
      }月${firstDayOfMonth.getDate()}日`;

      this.dailyReportVisible = true;

      try {
        const allPlans = await window.electronAPI.getPlans();
        // 过滤 type=3 的计划
        const allData = allPlans.filter(p => p.type === '3');
        
        // 只过滤有 finishtime 的数据，并且在当月范围内
        const filteredData = allData.filter(item => {
          // 必须有 finishtime
          if (!item.finishtime) {
            return false;
          }
          
          const itemFinishtime = item.finishtime;
          
          // 检查 finishtime 是否在当月范围内
          return itemFinishtime >= formattedFirstDay && itemFinishtime <= formattedToday;
        });
        

        this.monthlyReportData = filteredData;
        this.dailyReportData = filteredData;

        console.log("日报数据:", JSON.stringify(filteredData));
      } catch (error) {
        console.error("获取日报数据失败:", error);
        this.$message.error("获取日报数据失败");
      }
    },

    handleClose() {
      this.dailyReportVisible = false;
    },

    copyAndClose(items) {
      // 将所有项的plan内容拼接成字符串，每项加上序号
      const planContent = items
        .map((item, index) => `${index + 1}. ${item.plan}`)
        .join("\n");

      // 复制到剪贴板
      navigator.clipboard
        .writeText(planContent)
        .then(() => {
          this.$message.success("复制成功");
          this.dailyReportVisible = false;
        })
        .catch(() => {
          this.$message.error("复制失败");
        });
    },

    tableRowClassName({ row }) {
      if (row.isReminder) {
        return "reminder-row";
      }
      return row.status === "1" ? "completed-row" : "";
    },

    getProjectName(planText) {
      const match = planText.match(/【项目名称】(.*?)【完成内容】/);
      return match ? match[1] : "";
    },

    getPlanContent(planText) {
      const match = planText.match(/【完成内容】(.*?)$/);
      return match ? match[1] : planText;
    },

    // 修改滚动加载方法
    handlePlanTableScroll(e) {
      // 获取表格的滚动容器
      const scrollWrapper = e.target;
      
      // 计算距离底部的距离
      const scrollDistance = scrollWrapper.scrollHeight - scrollWrapper.scrollTop - scrollWrapper.clientHeight;
      
      // 当距离底部小于 30px 且不在加载中且还有更多数据时触发加载
      if (scrollDistance < 30 && !this.planLoading && !this.planFinished) {
        console.log('触发加载更多', {
          scrollTop: scrollWrapper.scrollTop,
          scrollHeight: scrollWrapper.scrollHeight,
          clientHeight: scrollWrapper.clientHeight,
          distance: scrollDistance
        });
        this.loadMorePlans();
      }
    },

    // 添加新的加载更多方法
    async loadMorePlans() {
      if (this.planLoading || this.planFinished) return;
      
      this.planCurrentPage += 1;
      await this.getProjectPlans(true);
    },

    // 处理上拉加载更多项目
    handleProjectTableScroll(e) {
      // 获取表格的滚动容器
      const scrollWrapper = e.target;
      
      // 计算距离底部的距离
      const scrollDistance = scrollWrapper.scrollHeight - scrollWrapper.scrollTop - scrollWrapper.clientHeight;
      
      // 当距离底部小于 30px 且不在加载中且还有更多数据时触发加载
      if (scrollDistance < 30 && !this.projectLoading && !this.projectFinished) {
        console.log('触发加载更多项目', {
          scrollTop: scrollWrapper.scrollTop,
          scrollHeight: scrollWrapper.scrollHeight,
          clientHeight: scrollWrapper.clientHeight,
          distance: scrollDistance
        });
        this.loadMoreProjects();
      }
    },
    
    // 加载更多项目
    async loadMoreProjects() {
      if (this.projectLoading || this.projectFinished) return;
      
      this.currentPage += 1;
      await this.getMoreProjectData();
    },
    
    // 获取更多项目数据
    async getMoreProjectData() {
      try {
        this.projectLoading = true;
        const res = await window.electronAPI.getProjectList({
          page: this.currentPage,
          pageNum: this.pageNum,
          orderBy: {
            column: "id",
            type: "desc",
          },
        });

        if (res && res.list) {
          const newData = res.list || [];
          this.tableData = [...this.tableData, ...newData];
          this.total = res.pagination?.total || 0;
          
          // 判断是否加载完所有数据
          this.projectFinished = this.tableData.length >= this.total;
        } else {
          this.$message.error("获取数据失败");
        }
      } catch (error) {
        console.error("获取数据失败:", error);
        this.$message.error("获取数据失败: " + error.message);
      } finally {
        this.projectLoading = false;
      }
    },
    
    // 处理下拉刷新
    handlePullRefresh() {
      return new Promise((resolve) => {
        this.refreshProjects()
          .then(() => {
            this.$message.success('刷新成功');
            resolve();
          })
          .catch(error => {
            console.error('刷新失败:', error);
            this.$message.error('刷新失败');
            resolve();
          });
      });
    },
    
    // 刷新项目列表
    async refreshProjects() {
      this.currentPage = 1;
      this.projectFinished = false;
      this.tableData = [];
      await this.getAllProjectData();
    },

    async handlePlanRowDblClick(row) {
      try {
        // 特殊处理日报提醒
        if (row.isReminder && row.id && row.id.startsWith('daily-report-')) {
          const dateKey = row.id.replace('daily-report-', '');
          const completedReminders = JSON.parse(localStorage.getItem('completedReminders') || '{}');
          
          // 切换完成状态
          if (row.status === "0") {
            row.status = "1";
            completedReminders[dateKey] = true;
            this.$message.success("日报提醒已完成");
          } else {
            row.status = "0";
            delete completedReminders[dateKey];
            this.$message.success("日报提醒已取消完成");
          }
          
          // 保存到本地存储
          localStorage.setItem('completedReminders', JSON.stringify(completedReminders));
          return;
        }

        // 处理普通计划项目
        // 切换状态：如果当前是未完成(0)则改为已完成(1)，反之亦然
        const newStatus = row.status === "1" ? "0" : "1";

        const params = {
          status: newStatus,
          id: row.id
        };

        const success = await window.electronAPI.updatePlan(row.id, params);

        if (success) {
          // 直接更新当前行的状态，无需重新请求所有数据
          row.status = newStatus;
          this.$message.success(
            newStatus === "1" ? "计划更新完成" : "计划已取消完成"
          );
        } else {
          this.$message.error("状态更新失败");
        }
      } catch (error) {
        console.error("更新计划失败:", error);
        this.$message.error("更新失败");
      }
    },

    // 处理状态下拉框变更
    async handleStatusChange(row) {
      try {
        // 如果切换到已完成状态，启动倒计时
        if (row.status === "1") {
          this.startCountdown(row.id, 5);
        } else {
          // 如果切换到未完成状态，清除倒计时
          this.clearCountdown(row.id);
        }

        // 特殊处理日报提醒
        if (row.isReminder && row.id && row.id.startsWith('daily-report-')) {
          const dateKey = row.id.replace('daily-report-', '');
          const completedReminders = JSON.parse(localStorage.getItem('completedReminders') || '{}');
          
          if (row.status === "1") {
            completedReminders[dateKey] = true;
            this.$message.success("日报提醒已完成");
            
            // 10秒后刷新数据
            setTimeout(() => {
              this.refreshUnfinishedPlans();
            }, 5000);
          } else {
            delete completedReminders[dateKey];
            this.$message.success("日报提醒已取消完成");
          }
          
          // 保存到本地存储
          localStorage.setItem('completedReminders', JSON.stringify(completedReminders));
          return;
        }

        // 处理普通计划项目
        const now = new Date();
        const formattedDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
        const params = {
          status: row.status,
          id: row.id,
          finishtime: row.status === "1" ? formattedDate : ""
        };

        const success = await window.electronAPI.updatePlan(row.id, params);

        if (success) {
          this.$message.success(
            row.status === "1" ? "计划更新完成" : "计划已取消完成"
          );
          if(row.status === "1"){
            this.handleAddNew();
            
            setTimeout(() => {
              this.refreshUnfinishedPlans();
            }, 5000);
          }
        } else {
          this.$message.error("状态更新失败");
        }
      } catch (error) {
        console.error("更新计划失败:", error);
        this.$message.error("更新失败");
      }
    },

    // 启动倒计时
    startCountdown(rowId, seconds) {
      // 清除该行可能存在的旧倒计时
      this.clearCountdown(rowId);
      
      // 设置初始倒计时值 (Vue 3 直接赋值即可)
      this.statusCountdowns[rowId] = seconds;
      
      // 创建定时器
      const timerId = setInterval(() => {
        if (this.statusCountdowns[rowId] > 0) {
          this.statusCountdowns[rowId] = this.statusCountdowns[rowId] - 1;
        } else {
          // 倒计时结束，清除定时器和倒计时数据
          this.clearCountdown(rowId);
        }
      }, 1000);
      
      // 保存定时器ID，以便后续清除
      if (!this.countdownTimers) {
        this.countdownTimers = {};
      }
      this.countdownTimers[rowId] = timerId;
    },

    // 清除倒计时
    clearCountdown(rowId) {
      // 清除定时器
      if (this.countdownTimers && this.countdownTimers[rowId]) {
        clearInterval(this.countdownTimers[rowId]);
        delete this.countdownTimers[rowId];
      }
      
      // 清除倒计时数据 (Vue 3 直接使用 delete)
      if (this.statusCountdowns[rowId] !== undefined) {
        delete this.statusCountdowns[rowId];
      }
    },

    // 处理新增按钮点击
    handleAddNew() {
      // 重置编辑状态
      this.isEditingPlan = false;
      this.editingPlanId = null;
      // 清空输入框
      this.projectName = "";
      this.newPlan = "";
    },

    // 添加键盘事件处理方法
    handleNewPlanKeydown(e) {
      // 如果按下的是 Enter 键且没有同时按下 Alt 键
      if (e.key === 'Enter' && !e.altKey) {
        e.preventDefault(); // 阻止默认行为
        // 调用保存方法
        if (this.isEditingPlan) {
          this.updateProjectPlan();
        } else {
          this.addProjectPlan();
        }
      }
      // 如果是 Alt+Enter，手动插入换行符
      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault(); // 阻止默认行为
        // 在光标位置插入换行符
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = this.newPlan.substring(0, cursorPosition);
        const textAfterCursor = this.newPlan.substring(cursorPosition);
        this.newPlan = textBeforeCursor + '\n' + textAfterCursor;
        
        // 设置光标位置到换行符后
        this.$nextTick(() => {
          e.target.selectionStart = cursorPosition + 1;
          e.target.selectionEnd = cursorPosition + 1;
        });
      }
    },
    
    // 显示项目计划窗口
    showProjectPlan() {
      // 发送IPC消息到主进程
      this.$ipc.send('show-project-plan-window');
    },

    // 切换计划面板显示/隐藏
    togglePlanColumn() {
      this.isPlanColumnVisible = !this.isPlanColumnVisible;
    },
    
    // 处理时间轴项目点击
    handleTimelineItemClick(item) {
      if (!item.isReminder) {
        this.handlePlanRowClick(item);
      }
    },
    
    // 获取时间轴节点类型
    getTimelineType(date) {
      if (date === '今日计划') {
        return 'primary';
      }
      const today = new Date();
      const itemDate = new Date(date.replace(/年|月|日/g, '/'));
      const diffTime = today - itemDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        return 'success';
      } else if (diffDays <= 7) {
        return 'warning';
      } else {
        return 'info';
      }
    },
    
    // 获取单个计划项的时间戳
    getItemTimestamp(item) {
      if (item.isReminder) {
        return '今日提醒';
      }
      if (item.finishtime) {
        const d = new Date(item.finishtime);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
      }
      if (item.date) {
        return item.date;
      }
      return '今日计划';
    },
    
    // 获取单个计划项的时间轴类型
    getTimelineItemType(item) {
      if (item.isReminder) {
        return 'warning';
      }
      if (item.status === '1') {
        return 'success';
      }
      
      const today = new Date();
      let itemDate;
      
      if (item.finishtime) {
        itemDate = new Date(item.finishtime);
      } else if (item.date) {
        itemDate = new Date(item.date.replace(/年|月|日/g, '/'));
      } else {
        return 'primary';
      }
      
      const diffTime = today - itemDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        return 'primary';
      } else if (diffDays <= 7) {
        return 'warning';
      } else {
        return 'info';
      }
    },
  },
};
</script>
<style scoped>
/* 统一按钮样式 - 深绿色主题（排除 text 和 link 按钮） */
:deep(.el-button--primary:not(.el-button--text):not(.is-link)) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  border-radius: 10px;
}

:deep(.el-button--primary:not(.el-button--text):not(.is-link):hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

:deep(.el-button--primary:not(.el-button--text):not(.is-link):active) {
  background-color: #6b7a4d !important;
  border-color: #6b7a4d !important;
}

/* 默认按钮也使用深绿色（排除 text 和 link 按钮） */
:deep(.el-button--default:not(.el-button--text):not(.is-link)) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
  border-radius: 10px;
}

:deep(.el-button--default:not(.el-button--text):not(.is-link):hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

/* 危险按钮保持红色（排除 text 和 link 按钮） */
:deep(.el-button--danger:not(.el-button--text):not(.is-link)) {
  border-radius: 10px;
}

/* 链接按钮 */
:deep(.el-button.is-link) {
  color: #8b9a6d !important;
}

:deep(.el-button.is-link:hover) {
  color: #7a895c !important;
}

/* 文字按钮 */
:deep(.el-button--text) {
  color: #8b9a6d !important;
}

:deep(.el-button--text:hover) {
  color: #7a895c !important;
}

:deep(.el-button--text.el-button--danger) {
  color: #F56C6C !important;
}

:deep(.el-button--text.el-button--danger:hover) {
  color: #f78989 !important;
}

.delete-icon {
  color: #f56c6c;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
}

.delete-icon:hover {
  color: #f78989;
}

section {
}

#hero {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tagline {
  font-size: 52px;
  line-height: 1.25;
  font-weight: bold;
  letter-spacing: -1.5px;
  max-width: 960px;
  margin: 0px auto;
}
html:not(.dark) .accent,
.dark .tagline {
  background: -webkit-linear-gradient(315deg, #42d392 25%, #647eff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.description {
  max-width: 960px;
  line-height: 1.5;
  color: var(--vt-c-text-2);
  transition: color 0.5s;
  font-size: 22px;
  margin: 24px auto 40px;
}
.actions a {
  font-size: 16px;
  display: inline-block;
  background-color: var(--vt-c-bg-mute);
  padding: 8px 18px;
  font-weight: 500;
  border-radius: 8px;
  transition: background-color 0.5s, color 0.5s;
  text-decoration: none;
}
.actions .setup {
  color: var(--vt-c-text-code);
  background: -webkit-linear-gradient(315deg, #42d392 25%, #647eff);
}
.actions .setup:hover {
  background-color: var(--vt-c-gray-light-4);
  transition-duration: 0.2s;
}
.printBtn {
  margin-top: 10px;
}

.container {
  display: flex;
  margin-bottom: 16px; /* 添加底部间距 */
  flex: 1;
  height: 100%;
  overflow: hidden;
  min-height: 0;
  padding: 20px;
  box-sizing: border-box;
  background-color: #faf8f5;
}

.leftDiv {
  width: 320px;
  background-color: var(--vt-c-bg-mute);
  border-radius: 8px;
  overflow: hidden;
  border-right: 1px solid #eaeef1;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  min-width: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
}

.editor-container {
  margin-top: 10px;
  width: 100%;
  z-index:0;
  border: 1px solid #e8e4df;
  border-radius: 4px;
}

/* WangEditor 内容区域字体样式 */
:deep(.w-e-text-container) {
  font-size: 20px !important;
}

:deep(.w-e-text) {
  font-size: 20px !important;
}

:deep(.w-e-text p) {
  font-size: 20px !important;
}

:deep(.el-form-item__label) {
  font-size: 20px;
  color: var(--el-text-color-regular);
}

:deep(.el-input) {
  width: 100%;
}

/* 自定义表格样式 */
:deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
  font-size: 18px;
  background-color: #fff;
  border-radius: 12px;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

:deep(.el-table .el-table__header th) {
  font-size: 18px;
  font-weight: 600;
  color: #6b6560;
  background-color: #f5f3f0 !important;
}

:deep(.el-table .cell) {
  font-size: 18px;
}

/* 移除输入框边框 */
:deep(.input-group .el-input__wrapper),
:deep(.input-group .el-textarea__inner) {
  box-shadow: none !important;
  border: none !important;
}

/* 可以根据需要调整表头文字颜色 */
:deep(.el-table th) {
  color: #333;
  background-color: #f5f3f0 !important;
}

:deep(.el-table__row) {
  height: 50px !important;
  line-height: 50px !important;
  cursor: pointer;
}

:deep(.el-table__cell) {
  padding: 8px 16px !important;
}

:deep(.el-table .cell){
  padding: 0 !important;
}

:deep(.el-table__header-row) {
  height: 45px !important;
}

/* 自定义编辑器样式 */
:deep(.w-e-text-container) {
  height: 99% !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
}

:deep(.w-e-text) {
  word-wrap: break-word !important;
  word-break: break-all !important;
}

/* 修改保存按钮容器样式 */
.save-button-container {
  text-align: center;
  margin: 16px 0;
}

.title-header {
  text-align: left;
}
.title-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: none !important;
}

.title-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

/* 添加以下样式来确保弹窗在编辑器之上 */
:deep(.el-message-box__wrapper) {
  z-index: 99999 !important;
}

:deep(.v-modal) {
  z-index: 99998 !important;
}

/* 设置编辑器的 z-index */
:deep(.w-e-text-container),
:deep(.w-e-toolbar) {
  z-index: 100 !important;
}

.plan-column {
  width: 600px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #faf8f5;
  border-right: 1px solid #e8e4df;
  transition: all 0.3s ease-in-out;
  overflow: hidden;
  padding: 50px;
  box-sizing: border-box;
}

.plan-column-hidden {
  width: 0 !important;
  min-width: 0 !important;
  border-right: none !important;
  opacity: 0;
}

.plan-table{
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex:1;
}
.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label {
  font-size: 16px;
  color: #606266;
}

.project-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: rgb(249, 249, 249);
  box-sizing: border-box;
  overflow: hidden;
  min-height: 0;
}

.project-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 60px;
}

/* 添加 timeline 对话框的样式 */
:deep(.el-dialog__body) {
  max-height: 60vh;
  overflow-y: auto;
}

:deep(.completed-row) {
  color:rgb(221, 219, 219) !important; 
  text-decoration: line-through; 
}

/* 确保鼠标悬停时背景色仍然保持 */
:deep(.completed-row:hover) {
  background-color: #f0f2f5 !important; /* 稍微深一点的灰色 */
}

:deep(.completed-row .el-tag) {
  opacity: 0.8; /* 使状态标签也稍微变淡 */
}

.plan-content {
  display: flex;
  flex-direction: row; /* 改为行排列，确保图标和文本在同一行 */
  align-items: center; /* 垂直居中 */
  gap: 8px; /* 调整间距 */
}

.plan-text {
  font-size: 20px;
  line-height: 1.4;
}

.project-name {
  font-size: 13px;
  color: #909399;
  line-height: 1.2;
}

/* 添加以下样式 */
.timeline-content {
  font-size: 14px;
  margin: 4px 0;
  line-height: 1.4;
}

:deep(.el-timeline-item__node) {
  background-color: rgb(190, 249, 249)
}

:deep(.el-timeline-item__timestamp) {
  font-size: 14px;
  color: #606266;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

.pagination {
  height: 50px;
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
  flex-shrink: 0;
}

:deep(.reminder-row) {
  background-color: #fdf6ec !important;
  font-weight: bold;
}

:deep(.reminder-row:hover) {
  background-color: #faecd8 !important;
}

:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next) {
  background-color: #1a1a1a;
  color: white;
  border-radius: 8px;
  padding: 0 15px;
  height: 32px;
  line-height: 32px;
  margin: 0 5px;
}

:deep(.el-pagination .btn-prev span),
:deep(.el-pagination .btn-next span) {
  font-size: 14px;
}

:deep(.el-pagination button:disabled) {
  background-color: #c0c4cc;
  color: white;
}

/* 加载状态样式 */
:deep(.el-table__append-wrapper) {
  position: sticky;
  bottom: 0;
  background-color: var(--el-table-tr-bg-color);
  z-index: 1;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.top-div {
  background-color: #ffffff;
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  gap: 10px;
  border-bottom: 1px solid #e8e4df;
  border-radius: 12px;
  margin-bottom: 16px;
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.mode-label {
  font-size: 12px;
  color: #606266;
}

.toggle-button {
  padding: 8px !important;
  margin: 0 !important;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.toggle-button:hover {
  background-color: #f0f2f5;
}

.toggle-button .el-icon {
  font-size: 18px;
  color: #606266;
  transition: transform 0.3s ease;
}

.rotate-icon {
  transform: rotate(180deg);
}

.search-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input :deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
  padding: 0 0 0 8px;
  transition: all 0.3s;
  width: 100%;
}

.search-input :deep(.el-input__wrapper:hover) {
  border-color: #c4a882;
}

.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

.search-input :deep(.el-input__inner) {
  background-color: transparent;
  border: none;
  height: 40px;
  padding: 0 20px;
  transition: all 0.3s;
  outline: none !important;
}

/* 添加项目搜索框样式 */
.project-search {
  padding: 10px 15px;
  background-color: #fff;
  flex-shrink: 0;
}

/* 添加下拉刷新指示器样式 */
.pull-refresh-indicator {
  color: #606266;
  font-size: 14px;
}

.pull-refresh-indicator span {
  display: inline-flex;
  align-items: center;
}

/* 确保表格内容垂直居中 */
:deep(.leftDiv .el-table__cell) {
  vertical-align: middle;
}

/* 修改分页器边距 */
:deep(.leftDiv .pagination) {
  margin-top: 10px;
}

.button-container {
  display: flex;
  gap: 12px;
  width: 100%;
}

.button-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-plan-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #8b9a6d;
}

/* 时间轴模式样式 */
.timeline-mode {
  overflow-y: auto;
  padding: 16px;
  background-color: #faf8f5;
}

.timeline-container {
  height: 100%;
  overflow: hidden;
  position: relative;
}

.timeline-gradient-mask {
  height: 100%;
  overflow-y: auto;
  position: relative;
}



/* 自定义滚动条样式 */
.timeline-gradient-mask::-webkit-scrollbar {
  width: 6px;
}

.timeline-gradient-mask::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.timeline-gradient-mask::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.3s ease;
}

.timeline-gradient-mask::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.timeline-gradient-mask::-webkit-scrollbar-corner {
  background: #f1f1f1;
}

.timeline-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 0px 0px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
  background: linear-gradient(135deg, #ffffff 0%, #f5f3f0 100%);

}

.timeline-card:hover {
  box-shadow: 0 0px 0px rgba(0, 0, 0, 0.1);
}

.timeline-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}


.timeline-item.completed {
  opacity: 0.8;
}

.timeline-item.completed .plan-text {
  text-decoration: line-through;
  color: #909399;
}

.timeline-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-item-actions {
  margin-left: 12px;
}

/* 状态图标样式 */
.status-icon {
  font-size: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px;
}

.status-icon.completed {
  color: #8b9a6d;;
}

.status-icon.pending {
  color: #c4a882;;
}

.empty-timeline {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 时间轴组件样式调整 */
:deep(.timeline-mode .el-timeline) {
  padding: 0 5px;
}

:deep(.timeline-mode .el-timeline-item__node) {
  width: 14px;
  height: 14px;
  left: -2px;
}

:deep(.timeline-mode .el-timeline-item__timestamp) {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

/* 列表模式样式 */
.list-mode {
  display: flex;
  flex-direction: column;
}

/* 优化开关样式 */
:deep(.el-switch) {
  --el-switch-on-color: #8b9a6d;
  --el-switch-off-color: #9a9590;
}

:deep(.el-switch__label) {
  color: #606266;
  font-size: 12px;
}

:deep(.el-switch__label.is-active) {
  color: #8b9a6d;
}

:deep(.el-switch__label:not(.is-active)) {
  color: #409eff;
}

/* 优化开关样式 */
:deep(.el-switch) {
  --el-switch-on-color: #8b9a6d;
  --el-switch-off-color: #9a9590;
}

:deep(.el-switch__label) {
  color: #606266;
  font-size: 12px;
}

:deep(.el-switch__label.is-active) {
  color: #8b9a6d;
}
.time-line-div {
  border-radius: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f5f3f0 100%);
  border: 1px solid #e8e4df;
}
:deep(.el-switch__label:not(.is-active)) {
  color: #409eff;
}

/* 添加计划图标样式 */
.plan-icon {
  width: 24px;
  height: 24px;
  margin-right: 8px;
  object-fit: contain;
  flex-shrink: 0;
}

.plan-content {
  display: flex;
  align-items: center; /* 确保垂直居中 */
  gap: 4px;
}

/* 状态选择框样式 */
:deep(.status-completed .el-select__wrapper) {
  background-color: #8b9a6d !important; /* 深绿色背景 */
  border:none!important;
}
:deep(.status-completed .el-select__selected-item) {
  color: #fff!important;
  border:none!important;
}

:deep(.status-pending .el-select__wrapper) {
  background-color: #c4a882 !important; /* 金棕色背景 */
  border:none!important;
}
:deep(.status-pending .el-select__selected-item) {
  color: #fff!important;
  border:none!important;
}

:deep(.status-completed .el-select__wrapper),
:deep(.status-pending .el-select__wrapper){
  color: white !important;
  box-shadow:none!important;
}

:deep(.status-completed .el-select__caret),
:deep(.status-pending .el-select__caret){
  color: white !important;
}
:deep(.el-table .el-table__cell) {
  z-index:0!important;
}
.el-table--border .el-table__inner-wrapper:after, .el-table--border:after, .el-table--border:before, .el-table__inner-wrapper:before{
   z-index:0!important;
}

</style>

<template>
  <section id="hero">
    <div class="container">
      <!-- 新增计划列表 -->
      <div class="plan-column" :class="{ 'plan-column-hidden': !isPlanColumnVisible }">
        <div class="top-div">

          <div v-if="inlineWarningMessage" class="inline-warning-wrap">
            <el-alert
              :title="inlineWarningMessage"
              type="warning"
              :closable="false"
              show-icon
            />
          </div>

          <div class="label">计划总数：{{planTotal}}</div>
          
          <!-- 跑马灯和设置按钮 -->
          <div v-if="maqueeShow" style="display: flex; align-items: center; gap: 10px; flex: 1;">
            <div class="marquee-container" style="flex: 1;">
              <div class="marquee-content">
                <span v-for="(text, index) in marqueeTexts" :key="'a' + index" class="marquee-item">
                  {{ text }}
                </span>
                <span v-for="(text, index) in marqueeTexts" :key="'b' + index" class="marquee-item">
                  {{ text }}
                </span>
              </div>
            </div>
            <!-- 设置按钮 -->
            <el-icon @click.stop="openMarqueeDialog" style="cursor: pointer;"><Setting /></el-icon>
          </div>
          <!-- 仅显示设置按钮（当跑马灯隐藏时） -->
          <div v-else style="display: flex; justify-content: flex-end; flex: 1;">
            <el-icon @click.stop="openMarqueeDialog" style="cursor: pointer;"><Setting /></el-icon>
          </div>
          
          
          <div>
            <el-button type="primary" @click="generateDailyReport">
              <el-icon><Document /></el-icon>
              生成日报
            </el-button>
            
            <el-button type="primary" @click="handleAddNew">
              <el-icon><Plus /></el-icon>
              新增计划
            </el-button>
            <el-button style="display:none" type="primary" @click="aiOptimizePlan" :disabled="aiOptimizing">
              <el-icon :class="{ 'is-loading': aiOptimizing }"><Refresh /></el-icon>
              {{ aiOptimizing ? '优化中...' : 'AI优化' }}
            </el-button>
          </div>
        </div>
        <div class="plan-table">
          <div class="button-group">
            <div class="input-container">
              <div class="input-group">
                
                <div class="input-with-image" style="display: flex; gap: 10px;">
                  <el-input
                    size="large"
                    v-model="newPlan"
                    type="textarea"
                    :rows="5"
                    style="font-size: 20px; flex: 1;"
                    placeholder="请输入完成内容，支持批量添加（每行一个计划，支持粘贴图片）"
                    clearable
                    @keydown="handleNewPlanKeydown"
                    @paste="handlePaste"
                    ref="newPlanInput"
                  ></el-input>
                  <!-- 右侧容器：预计完成时间和引用网址按钮 -->
                  <div style="width: 220px; display: flex; flex-direction: column; gap: 8px;">
                    <!-- 预计完成时间 -->
                    <div class="plan-finish-time-container">
                      <div style="font-size: 12px; color: #606266; margin-bottom: 4px;">预计完成时间</div>
                      <input
                        type="date"
                        v-model="newPlanFinishTime"
                        :disabled="showTodayPlanOnly"
                        style="width: 100%; height: 40px; padding: 0 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 14px;"
                      />
                    </div>
                    <!-- 今天完成开关 -->
                    <div style="display: flex; align-items: center; gap: 8px; padding: 0 10px; height: 40px; background: #f5f7fa; border-radius: 4px;">
                      <span style="font-size: 12px; color: #606266;">今天完成</span>
                      <el-switch
                        v-model="showTodayPlanOnly"
                        style="--el-switch-on-color: #8b9a6d; --el-switch-off-color: #9a9590"
                      />
                    </div>
                    <!-- 引用网址按钮 -->
                    <el-button type="primary" @click="openUrlSelectorDialog" style="height: 40px;">
                      <el-icon><Link /></el-icon>引用网址({{ newPlanRelatedUrls.length }})
                    </el-button>
                  </div>
                  <!-- echarts 图表区域 -->
                  <div v-if="clipboardImage" class="image-thumbnail">
                    <img :src="clipboardImage" alt="粘贴的图片" />
                    <el-button 
                      type="danger" 
                      size="small" 
                      class="delete-image-btn"
                      @click="removeClipboardImage"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
            <div class="button-container">
              <el-button
                type="primary"
                class="gradient-save-btn"
                @click="isEditingPlan ? updateProjectPlan() : addProjectPlan()"
                >保存</el-button
              >
            </div>
            <div>
            <!-- 搜索和刷新行 -->
            <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
              <el-icon @click="refreshUnfinishedPlans" style="cursor: pointer; font-size: 20px; color: #c4a882;"><Refresh /></el-icon>
              <div class="search-container" style="flex: 1;">
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索"
                  class="search-input"
                  clearable
                ></el-input>
              </div>
              <el-switch
                v-model="isTimelineMode"
                active-text="时间轴"
                style="--el-switch-on-color: #67c23a; --el-switch-off-color: #909399"
              />
              <el-switch
                v-model="showTodayPlanOnly"
                active-text="今天完成"
                style="--el-switch-on-color: #67c23a; --el-switch-off-color: #909399"
              />
              <el-button type="primary" @click="showProjectPlan" style="height: 40px;">
                <el-icon><Calendar /></el-icon>
                计划悬浮窗
              </el-button>
              
            </div>
          </div>

          </div>
          <!-- 列表模式 -->
          <div v-if="!isTimelineMode" class="list-mode">
            <!-- 单条计划遮罩弹窗 -->
            <div class="plan-popup-overlay" v-if="showPlanPopup">
              <div class="plan-popup-content">
                <div class="plan-popup-content-div">
                  <div style="font-size: 20px">现在只需要完成</div>
                  <h2 style="color: #ff4949">
                    {{ selectedPlanRow.plan }}
                  </h2>
                </div>
                <div class="plan-popup-buttons">
                  <el-button type="primary" @click="handlePlanComplete(selectedPlanRow)">完成</el-button>
                  <el-button type="primary" @click="closePlanPopup()">隐藏</el-button>
                </div>
              </div>
            </div>
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
                    style="display:none"
                  />
                  <div class="plan-text" :class="{ 'plan-text-top': scope.row.top == 1 || scope.row.top === '1' }">
                    {{ getPlanContent(scope.row.plan) }}
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="planfinishtime" label="预计完成" width="150">
              <template #default="scope">
                <div v-if="scope.row.planfinishtime" style="color: #409eff; font-size: 13px;">
                  {{ formatDateTime(scope.row.planfinishtime) }}
                </div>
                <div v-else style="color: #909399; font-size: 13px;">-</div>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="320">
              <template #default="scope">
                <el-button
                  :class="scope.row.status == '1' ? 'status-btn-completed' : 'status-btn-pending'"
                  @click.stop="handleStatusBtnClick(scope.row)"
                >
                  <template v-if="scope.row.status == '1'">
                    <el-icon><Check /></el-icon>
                  </template>
                  <span v-else>未完成</span>
                </el-button>
                <el-button
                  type="primary"
                  @click.stop="showCurrentRow(scope.row)"
                >
                  显示本条
                </el-button>
                <el-button
                  @click.stop="handleToggleTop(scope.row)"
                  :disabled="scope.row.isReminder"
                  :type="(scope.row.top == 1 || scope.row.top === '1') ? 'warning' : 'primary'"
                >
                  {{ (scope.row.top == 1 || scope.row.top === '1') ? '取消置顶' : '置顶' }}
                </el-button>
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
                            <el-button
                              :type="item.status == '1' ? 'success' : 'primary'"
                              @click.stop="handlePlanRowDblClick(item)"
                            >
                              {{ item.status == '1' ? '已完成' : '待完成' }}
                            </el-button>
                          </div>
                        </div>
                      </el-card>
                    </el-timeline-item>
                </el-timeline>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      <!-- 详情 -->
      <div v-if="showSubPlanPanel" class="subplan-panel" :style="subPlanPanelStyle">
        <div class="subplan-header">
          <span class="subplan-title">详情</span>
          <el-icon class="subplan-refresh" @click.stop="refreshSubPlanList" title="刷新"><Refresh /></el-icon>
          <el-button type="primary" @click.stop="closeSubPlanPanel">关闭</el-button>
        </div>
        <div class="subplan-content">
          <!-- 主计划编辑区域 -->
          <div class="parent-plan-display" v-if="currentParentPlan">
            <el-input
              v-model="currentParentPlan.plan"
              type="textarea"
              :rows="5"
              style="font-size: 20px; flex: 1; --el-input-border-color: transparent; --el-input-hover-border-color: transparent; --el-input-focus-border-color: transparent;"
              placeholder="请输入计划内容"
              @blur="updateParentPlanContent"
            ></el-input>
          </div>
          <!-- 预计完成时间编辑 -->
          <div class="plan-finish-time-display" v-if="currentParentPlan" style="background: #f5f7fa; border-radius: 4px;">
            <div style="font-weight: bold; margin-bottom: 5px; color: #606266;">预计完成时间：</div>
            <input
              type="date"
              v-model="currentParentPlan.planfinishtime"
              @blur="updateParentPlanContent"
              style="width: 100%; height: 40px; padding: 0 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 14px;"
            />
          </div>
          <!-- 相关资料网址列表 -->
          <div class="related-content-edit" v-if="currentParentPlan" style="background: #f5f7fa; border-radius: 4px;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #606266;">相关资料网址：</div>
            <div v-if="!currentParentPlan.relatedContent || currentParentPlan.relatedContent === '[]'" style="color: #909399; font-size: 14px;">暂无引用网址</div>
            <div v-else class="related-content-scroll" style="max-height: 200px; overflow-y: auto;">
              <div v-for="(item, index) in parseRelatedContent(currentParentPlan.relatedContent)" :key="index" 
                   class="url-link-item" 
                   style="display: flex; align-items: center; margin-bottom: 8px; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e4e7ed; cursor: pointer;"
                   @click="openUrlInCollect(item.url)">
                <el-icon style="color: #409eff; margin-right: 10px; font-size: 18px;"><Link /></el-icon>
                <div style="flex: 1; overflow: hidden;">
                  <div style="font-weight: 500; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ item.title || '无标题' }}</div>
                  <div style="font-size: 12px; color: #409eff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: underline;">{{ item.url }}</div>
                </div>
                <el-icon style="color: #67c23a; margin-left: 8px;"><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
          
          <!-- AI下级按钮 -->
          <div style="margin: 10px 0;">
            <el-button
              type="warning"
              style="width:100px"
              @click.stop="aiGenerateSubPlans(currentParentPlan)"
              :disabled="currentParentPlan?.aiLoading"
              v-if="currentParentPlan"
            >
              <el-icon :class="{ 'is-loading': currentParentPlan?.aiLoading }"><Refresh /></el-icon>
              {{ currentParentPlan?.aiLoading ? '优化中' : 'AI下级' }}
            </el-button>
          </div>

          <!-- 下级计划输入区域 -->
          <div class="subplan-input-area" style="max-height: 200px; overflow-y: auto;">
            <div v-for="(item, index) in subPlanInputs" :key="index" class="subplan-input-row" style="display: flex; gap: 8px; margin-bottom: 8px;">
              <el-input
                v-model="subPlanInputs[index]"
                placeholder="请输入下级计划内容"
                @keyup.enter="handleSubPlanInputEnter(index)"
                style="flex: 1;"
              ></el-input>
              <el-button v-if="index === subPlanInputs.length - 1" type="primary" @click="handleSubPlanInputEnter(index)">新增</el-button>
              <el-icon v-else class="delete-icon" @click="removeSubPlanInput(index)" style="cursor: pointer; color: #f56c6c; font-size: 20px; margin-top: 8px;"><Delete /></el-icon>
            </div>
          </div>

          <!-- 保存按钮 -->
          <div style="margin-top: 15px;">
            <el-button type="primary" size="large" style="width: 100%;" @click="saveSubPlans">保存</el-button>
          </div>
          <div class="subplan-list" style="height: 390px; overflow-y: auto;">
            <el-table
              :data="subPlanList"
              style="width: 100%"
              stripe
              :show-header="false"
              :row-class-name="subPlanRowClassName"
              height="300"
            >
              <el-table-column prop="plan" label="计划">
                <template #default="scope">
                  <div class="plan-content">
                    <div class="plan-text sub-plan-text">{{ scope.row.plan }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="109">
                <template #default="scope">
                  <el-button
                    :class="scope.row.status == '1' ? 'status-btn-completed' : 'status-btn-pending'"
                    @click.stop="toggleSubPlanStatus(scope.row)"
                  >
                    <template v-if="scope.row.status == '1'">
                      <el-icon><Check /></el-icon>已完成
                    </template>
                    <span v-else>未完成</span>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
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

    <!-- 跑马灯设置弹窗 -->
    <el-dialog
      v-model="marqueeDialogVisible"
      title="跑马灯设置"
      width="985px"
      top="5vh"
      :close-on-click-modal="true"
    >
      <!-- 显示设置 -->
      <div style="margin-bottom: 15px; padding: 10px; background: #f5f7fa; border-radius: 4px;">
        <el-form inline>
          <el-form-item label="是否显示跑马灯">
            <el-switch v-model="maqueeShow" @change="savemaqueeShow" />
          </el-form-item>
        </el-form>
      </div>
      <!-- 新增/编辑表单区域 -->
      <div class="marquee-form-area">
        <div class="marquee-form-title">{{ marqueeForm.id ? '编辑跑马灯' : '新增跑马灯' }}</div>
        <el-form :model="marqueeForm" inline label-width="60px">
          <el-form-item label="内容">
            <el-input
              v-model="marqueeForm.text"
              type="textarea"
              :rows="2"
              placeholder="请输入跑马灯内容"
              style="width: 280px"
            />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="marqueeForm.sort_order" :min="0" :max="999" style="width: 100px" />
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model="marqueeForm.is_enabled" :active-value="1" :inactive-value="0" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveMarqueeItem">{{ marqueeForm.id ? '保存' : '新增' }}</el-button>
            <el-button v-if="marqueeForm.id" @click="resetMarqueeForm">取消编辑</el-button>
          </el-form-item>
        </el-form>
      </div>
      <el-table :data="marqueeList" stripe>
        <el-table-column type="index" label="序号" width="100"/>
        <el-table-column prop="text" label="内容" />
        <el-table-column prop="sort_order" label="排序" width="100"/>
        <el-table-column label="启用" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.is_enabled === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.is_enabled === 1 ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="openMarqueeEditDialog(scope.row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button type="danger" link @click="deleteMarqueeItem(scope.row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end;">
        <el-pagination
          :total="marqueeTotal"
          v-model:current-page="marqueeCurrentPage"
          v-model:page-size="marqueePageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="handleMarqueePageChange"
          @size-change="handleMarqueeSizeChange"
        />
      </div>
      <template #footer>
        <el-button @click="marqueeDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 网址选择弹窗 -->
    <el-dialog
      v-model="urlSelectorDialogVisible"
      title="选择要引用的网址"
      width="1500px"
      top="10vh"
      :close-on-click-modal="true"
    >
      <div v-loading="urlSelectorLoading">
        <div class="related-urls-container" style="padding: 10px; background: #f5f7fa; border-radius: 4px; margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 8px; color: #606266;">已选网址：</div>
          <div class="url-list-scroll" style="max-height: 150px; overflow-y: auto;">
            <div v-for="(item, index) in newPlanRelatedUrls" :key="index" class="url-tag-item" style="display: flex; align-items: center; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #e4e7ed; margin-bottom: 8px;">
              <el-icon style="color: #409eff; margin-right: 8px;"><Link /></el-icon>
              <div style="flex: 1; overflow: hidden;">
                <div style="display: flex; gap: 10px;">
                  <div style="flex: 1; font-weight: 500; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ item.title || '无标题' }}</div>
                  <div style="flex: 1; font-size: 12px; color: #909399; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ item.url }}</div>
                </div>
              </div>
              <el-icon style="color: #f56c6c; cursor: pointer; margin-left: 8px;" @click="removeRelatedUrl(index)"><Delete /></el-icon>
            </div>
            <el-empty v-if="newPlanRelatedUrls.length === 0" description="暂无引用网址" :image-size="60" style="height: 100px; display: flex; flex-direction: column; justify-content: center;"></el-empty>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
            <el-input
              v-model="manualUrlInput"
              placeholder="请输入网址"
              style="flex: 1;"
            ></el-input>
            <el-button type="success" @click="addManualUrl">
              <el-icon><Plus /></el-icon>手动添加
            </el-button>
          </div>
        </div>
        <el-table
          :data="urlSelectorList"
          style="width: 100%;height:400px"
          stripe
          @row-click="handleUrlSelectorRowClick"
        >
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="scope">
              <div style="font-weight: 500; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" :title="null">{{ scope.row.title || '无标题' }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="url" label="网址" width="300">
            <template #default="scope">
              <div style="color: #409eff; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ scope.row.url }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="scope">
              <el-button type="primary" @click.stop="selectUrl(scope.row)">引用</el-button>
            </template>
          </el-table-column>
        </el-table>
        <!-- 分页 -->
        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
          <el-pagination
            v-model:current-page="urlSelectorPage"
            v-model:page-size="urlSelectorPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="urlSelectorTotal"
            layout="total, sizes, prev, pager, next"
            @size-change="handleUrlSelectorSizeChange"
            @current-change="handleUrlSelectorPageChange"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="urlSelectorDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    </div>
  </section>
</template>
<script>
import { ArrowRight, Calendar, Check, CircleCheck, Clock, Close, Delete, Document, Link, Loading, Plus, Refresh, Setting } from "@element-plus/icons-vue";  

export default {
  name: 'Project',
  emits: ['close'],
  components: {
    Calendar,
    Check,
    CircleCheck,
    Clock,
    Close,
    Delete,
    Document,
    Loading,
    Plus,
    Refresh,
    Setting,
  },

  data() {
    return {

      planData: [],
      newPlan: "",
      newPlanRelatedUrls: [], // 相关资料网址数组，格式: [{url: string, title: string}]
      newPlanFinishTime: null, // 预计完成时间
      manualUrlInput: "", // 手动填写的网址
      manualTitleInput: "", // 手动填写的标题
      tableHeight: 0,
      projectTableHeight: 0,
      dailyReportVisible: false,
      dailyReportData: [],
      projectName: "",
      monthlyReportData: [],
      planLoading: false,
      planFinished: false,
      planCurrentPage: 1,
      planPageSize: 200,
      planTotal: 0,
      searchQuery: '',
      searchTimer: null,
      lastMessageKey: null,
      isEditingPlan: false,
      editingPlanId: null,

      isTimelineMode: false,
      showTodayPlanOnly: true, // 是否只显示今天需要完成的计划（默认true）
      statusCountdowns: {}, // 存储每行的倒计时秒数
      countdownTimers: {}, // 存储倒计时定时器
      
      // 子计划相关
      showSubPlanPanel: false,
      currentParentPlan: null,
      subPlanList: [],
      newSubPlan: '',
      subPlanInputs: [''], // 多个子计划输入框
      subPlanPanelStyle: {},
      
      // 单条计划弹窗相关
      showPlanPopup: false,
      selectedPlanRow: {},
      
      // 跑马灯文字（从API获取）
      marqueeTexts: [],
      
      // 跑马灯设置弹窗
      marqueeDialogVisible: false,
      marqueeList: [],
      marqueeTotal: 0,
      marqueeCurrentPage: 1,
      marqueePageSize: 10,
      maqueeShow: true, // 是否显示跑马灯，从缓存读取
      
      // AI优化加载状态
      aiOptimizing: false,
      
      // 跑马灯编辑表单
      marqueeForm: {
        id: null,
        text: '',
        sort_order: 0,
        is_enabled: 1
      },
      
      // 剪切板图片
      clipboardImage: null,

      // 组件内联警告提示
      inlineWarningMessage: '',
      
      // 网址选择弹窗
      urlSelectorDialogVisible: false,
      urlSelectorList: [],
      urlSelectorLoading: false,
      urlSelectorPage: 1,
      urlSelectorPageSize: 20,
    };
  },
  created() {
    try {
      // 先计算表格高度，确保 el-table 有正确的高度
      this.calculateTableHeight();
      this.getProjectPlans();
      this.loadMarqueeData();
      this.loadmaqueeShow();
    } catch (error) {
      console.error('Error in created hook:', error);
    }
  },
  mounted() {
    try {
      // 设置表格高度（再次计算以确保正确）
      this.calculateTableHeight();
      window.addEventListener("resize", this.calculateTableHeight);
    } catch (error) {
      console.error('Error in mounted hook:', error);
    }
  },
  beforeUnmount() {
    // 移除事件监听器
    window.removeEventListener("resize", this.calculateTableHeight);
    
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
      // 清理定时器等其他资源
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }
    } catch (error) {
      console.error('Error in unmounted hook:', error);
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
      let filteredData = [...this.planData];
      
      // 根据"今天完成"开关筛选数据
      if (this.showTodayPlanOnly) {
        // 勾选：只显示 todayPlan = 1 的数据
        filteredData = filteredData.filter(item => item.todayPlan == 1 || item.todayPlan === '1');
      } else {
        // 不勾选：只显示 todayPlan != 1 的数据
        filteredData = filteredData.filter(item => item.todayPlan != 1 && item.todayPlan !== '1');
      }
      
      if (this.searchQuery && this.searchQuery.trim() !== '') {
        const query = this.searchQuery.toLowerCase().trim();
        filteredData = filteredData.filter(item => {
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
      
      // 对过滤后的数据进行排序：置顶的排在前面
      filteredData.sort((a, b) => {
        const topA = (a.top == 1 || a.top === '1') ? 1 : 0;
        const topB = (b.top == 1 || b.top === '1') ? 1 : 0;
        if (topA !== topB) {
          return topB - topA; // 置顶优先
        }
        // 然后按id倒序（新的在前）
        return b.id - a.id;
      });
      
      // 合并早会提醒和过滤后的数据（置顶的在基础数据后显示）
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

  },
  methods: {
    // 格式化日期时间（只显示年月日）
    formatDateTime(datetime) {
      if (!datetime) return '';
      const date = new Date(datetime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    showInlineWarning(message) {
      this.inlineWarningMessage = message;
      setTimeout(() => {
        this.inlineWarningMessage = '';
      }, 2000);
    },

    // 保存相关资料
    async saveRelatedContent() {
      if (!this.currentParentPlan || !this.currentParentPlan.id) {
        this.$message.warning("请先选择计划");
        return;
      }
      
      try {
        const success = await window.electronAPI.updatePlan(this.currentParentPlan.id, {
          relatedContent: this.currentParentPlan.relatedContent || null,
        });
        
        if (success) {
          this.$message.success("资料保存成功");
          // 更新本地数据
          const planIndex = this.planData.findIndex(p => p.id === this.currentParentPlan.id);
          if (planIndex !== -1) {
            this.planData[planIndex].relatedContent = this.currentParentPlan.relatedContent;
          }
        } else {
          this.$message.error("保存失败");
        }
      } catch (error) {
        console.error("保存相关资料失败:", error);
        this.$message.error("保存失败: " + (error.message || '未知错误'));
      }
    },

    // 打开网址选择弹窗
    async openUrlSelectorDialog() {
      this.urlSelectorDialogVisible = true;
      this.urlSelectorPage = 1;
      await this.loadUrlSelectorData();
    },

    // 加载网址选择弹窗数据
    async loadUrlSelectorData() {
      // Electron 版本暂不支持网址收藏功能
      this.urlSelectorList = [];
      this.urlSelectorTotal = 0;
      this.urlSelectorLoading = false;
    },

    // 网址选择弹窗分页大小变化
    handleUrlSelectorSizeChange(val) {
      this.urlSelectorPageSize = val;
      this.urlSelectorPage = 1;
      this.loadUrlSelectorData();
    },

    // 网址选择弹窗页码变化
    handleUrlSelectorPageChange(val) {
      this.urlSelectorPage = val;
      this.loadUrlSelectorData();
    },

    // 选择网址
    selectUrl(row) {
      // 检查是否已存在
      const exists = this.newPlanRelatedUrls.some(item => item.url === row.url);
      if (exists) {
        this.$message.warning("该网址已添加");
        return;
      }
      this.newPlanRelatedUrls.push({
        url: row.url,
        title: row.title
      });
      this.$message.success("引用成功");
    },

    // 处理网址选择行点击
    handleUrlSelectorRowClick(row) {
      this.selectUrl(row);
    },

    // 删除引用的网址
    removeRelatedUrl(index) {
      this.newPlanRelatedUrls.splice(index, 1);
    },

    // 手动添加网址
    addManualUrl() {
      if (!this.manualUrlInput.trim()) {
        this.$message.warning("请输入网址");
        return;
      }
      // 检查是否已存在
      const exists = this.newPlanRelatedUrls.some(item => item.url === this.manualUrlInput.trim());
      if (exists) {
        this.$message.warning("该网址已添加");
        return;
      }
      this.newPlanRelatedUrls.push({
        url: this.manualUrlInput.trim(),
        title: this.manualTitleInput.trim() || this.manualUrlInput.trim()
      });
      this.$message.success("添加成功");
      // 清空输入框
      this.manualUrlInput = "";
      this.manualTitleInput = "";
    },

    // 解析相关资料 JSON
    parseRelatedContent(content) {
      if (!content) return [];
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return [];
      } catch (e) {
        return [];
      }
    },

    // 在 Collect 页面打开网址
    openUrlInCollect(url) {
      // 通过路由跳转到 Collect 页面，并传递网址参数
      this.$router.push({
        path: '/collect',
        query: { url: encodeURIComponent(url) }
      });
    },

    // 处理粘贴事件
    handlePaste(event) {
      const items = event.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (e) => {
            this.clipboardImage = e.target.result;
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    },
    // 删除剪切板图片
    removeClipboardImage() {
      this.clipboardImage = null;
    },
    
    // 显示单条计划弹窗
    showCurrentRow(row) {
      this.selectedPlanRow = row;
      this.showPlanPopup = true;
    },
    // 关闭单条计划弹窗
    closePlanPopup() {
      this.showPlanPopup = false;
      this.selectedPlanRow = {};
    },
    // 处理计划完成
    handlePlanComplete(row) {
      this.handleStatusBtnClick(row);
      this.closePlanPopup();
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
        this.planTotal = newData.length;
        
        if (isLoadMore) {
          // 追加新数据
          this.planData = [...this.planData, ...newData];
        } else {
          // 重置数据
          this.planData = newData;
          this.planCurrentPage = 1;
        }
        
        // 对数据进行排序：置顶优先
        this.sortPlanData();

        // 判断是否加载完所有数据
        this.planFinished = true;
        
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

      // 检查是否有多行内容（批量添加）
      const plans = this.newPlan.split('\n').filter(line => line.trim());
      
      if (plans.length > 1) {
        // 批量添加
        await this.batchAddProjectPlans(plans);
      } else {
        // 单条添加
        await this.singleAddProjectPlan();
      }
    },

    // 单条添加计划
    async singleAddProjectPlan() {
      if (!this.projectName.trim()) {
        this.projectName = this.newPlan;
      }

      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const params = {
        plan: this.newPlan,
        status: "0",
        date: formattedDate,
        type: "3",
        relatedContent: this.newPlanRelatedUrls.length > 0 ? JSON.stringify(this.newPlanRelatedUrls) : null,
        planfinishtime: this.newPlanFinishTime || null,
        todayPlan: this.showTodayPlanOnly ? 1 : 0,
      };

      try {
        const result = await window.electronAPI.addPlan(params);
        if (result) {
          this.$message.success("添加成功");
          this.projectName = "";
          this.newPlan = "";
          this.newPlanRelatedUrls = []; // 清空相关资料网址
          this.newPlanFinishTime = null; // 清空预计完成时间
          this.showTodayPlanOnly = true; // 重置为默认值
          this.clipboardImage = null; // 清空图片
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

    // 批量添加计划
    async batchAddProjectPlans(plans) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // 构建批量添加的数据
      const plansData = plans.map(planText => ({
        plan: planText.trim(),
        status: "0",
        date: formattedDate,
        type: "3",
        relatedContent: this.newPlanRelatedUrls.length > 0 ? JSON.stringify(this.newPlanRelatedUrls) : null,
        planfinishtime: this.newPlanFinishTime || null,
        todayPlan: this.showTodayPlanOnly ? 1 : 0,
      }));

      const params = {
        plans: plansData,
        default_status: "0",
        default_type: "3"
      };

      try {
        // 批量添加：逐条调用 electronAPI
        let successCount = 0;
        for (const planData of plansData) {
          const result = await window.electronAPI.addPlan(planData);
          if (result) successCount++;
        }
        this.$message.success(`成功添加 ${successCount} 条计划`);
        this.projectName = "";
        this.newPlan = "";
        this.newPlanRelatedUrls = []; // 清空相关资料网址
        this.newPlanFinishTime = null; // 清空预计完成时间
        this.showTodayPlanOnly = true; // 重置为默认值
        this.clipboardImage = null; // 清空图片
        this.getProjectPlans();
        // 设置焦点回到输入框
        this.$nextTick(() => {
          if (this.$refs.newPlanInput) {
            this.$refs.newPlanInput.focus();
          }
        });
      } catch (error) {
        console.error("批量添加计划失败:", error);
        this.$message.error("批量添加失败");
      }
    },

    async handlePlanRowClick(row) {
      // 如果是提醒行，不处理
      if (row.isReminder) {
        return;
      }
      
      // 只打开详情弹窗，不反显到新增表单
      this.handleSubPlanClick(row, null);
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
          relatedContent: this.newPlanRelatedUrls.length > 0 ? JSON.stringify(this.newPlanRelatedUrls) : null,
          planfinishtime: this.newPlanFinishTime || null,
        });

        if (success) {
          this.$message.success("更新成功");
          // 重置编辑状态
          this.isEditingPlan = false;
          this.editingPlanId = null;
          this.projectName = "";
          this.newPlan = "";
          this.newPlanRelatedUrls = []; // 清空相关资料网址
          this.newPlanFinishTime = null; // 清空预计完成时间
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
        this.$message.error("更新失败: " + (error.message || '未知错误'));
      }
    },

    // 更新详情弹窗中的主计划内容
    async updateParentPlanContent() {
      if (!this.currentParentPlan || !this.currentParentPlan.plan.trim()) {
        this.$message.warning("计划内容不能为空");
        return;
      }

      try {
        const success = await window.electronAPI.updatePlan(this.currentParentPlan.id, {
          plan: this.currentParentPlan.plan,
          status: this.currentParentPlan.status,
          type: this.currentParentPlan.type,
          relatedContent: this.currentParentPlan.relatedContent,
          planfinishtime: this.currentParentPlan.planfinishtime,
        });

        if (success) {
          this.$message.success("更新成功");
          // 刷新列表数据
          await this.getProjectPlans();
        } else {
          this.$message.error("更新失败");
        }
      } catch (error) {
        console.error("更新计划失败:", error);
        this.$message.error("更新失败: " + (error.message || '未知错误'));
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
      
      // 提醒用户
      this.$message.success("未完成计划已刷新");
    },

    calculateTableHeight() {
      try {
        const windowHeight = window.innerHeight;
        const otherElementsHeight = 399;
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

      const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const formattedFirstDay = `${firstDayOfMonth.getFullYear()}-${String(firstDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(firstDayOfMonth.getDate()).padStart(2, '0')}`;

      this.dailyReportVisible = true;

      try {
        const allData = await window.electronAPI.getPlans();
        // 过滤 type=3 的计划
        const type3Data = allData.filter(p => p.type === '3');
        
        // 只过滤有 finishtime 的数据，并且在当月范围内
        const filteredData = type3Data.filter(item => {
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

    subPlanRowClassName({ row }) {
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

        // Electron 版本暂不支持下级计划查询
        // 如需支持，需要扩展数据库表结构添加 parentId 字段

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

    // 处理置顶/取消置顶
    async handleToggleTop(row) {
      if (row.isReminder) return;
      
      const newTop = row.top === 1 ? 0 : 1;
      try {
        const success = await window.electronAPI.updatePlan(row.id, {
          top: newTop,
        });
        
        if (success) {
          row.top = newTop;
          this.$message.success(newTop === 1 ? "已置顶" : "已取消置顶");
          // 重新排序数据
          this.sortPlanData();
        } else {
          this.$message.error("操作失败");
        }
      } catch (error) {
        console.error("置顶操作失败:", error);
        this.$message.error("操作失败");
      }
    },
    
    // 排序计划数据（置顶在前）
    sortPlanData() {
      this.planData.sort((a, b) => {
        // 置顶优先（处理字符串和数字类型）
        const topA = (a.top == 1 || a.top === '1') ? 1 : 0;
        const topB = (b.top == 1 || b.top === '1') ? 1 : 0;
        if (topA !== topB) {
          return topB - topA;
        }
        // 然后按id倒序（新的在前）
        return b.id - a.id;
      });
    },

    // 处理状态按钮点击
    async handleStatusBtnClick(row) {
      // 如果是从未完成切换到已完成，需要检查是否有未完成的下级计划
      // Electron 版本暂不支持下级计划查询
      // 如需支持，需要扩展数据库表结构添加 parentId 字段

      // 切换状态
      row.status = row.status === "1" ? "0" : "1";
      // 调用原有的状态变更处理
      this.handleStatusChange(row);
    },

    // 处理状态下拉框变更
    async handleStatusChange(row) {
      try {
        // Electron 版本暂不支持下级计划查询
        // 如需支持，需要扩展数据库表结构添加 parentId 字段

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
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
      
      // 设置初始倒计时值 - 使用展开运算符触发响应式更新
      this.statusCountdowns = { ...this.statusCountdowns, [rowId]: seconds };
      
      // 创建定时器
      const timerId = setInterval(() => {
        if (this.statusCountdowns[rowId] > 0) {
          // 使用展开运算符触发响应式更新
          this.statusCountdowns = { 
            ...this.statusCountdowns, 
            [rowId]: this.statusCountdowns[rowId] - 1 
          };
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
      
      // 清除倒计时数据 - 使用展开运算符触发响应式更新
      if (this.statusCountdowns[rowId] !== undefined) {
        const newCountdowns = { ...this.statusCountdowns };
        delete newCountdowns[rowId];
        this.statusCountdowns = newCountdowns;
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
      this.newPlanRelatedUrls = []; // 清空相关资料网址
      this.newPlanFinishTime = null; // 清空预计完成时间
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
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        itemDate = new Date(item.date);
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

    // 子计划相关方法
    handleSubPlanClick(row, event) {
      // 如果点击的是同一个计划的下级计划按钮，则切换面板显示状态
      if (this.showSubPlanPanel && this.currentParentPlan && this.currentParentPlan.id === row.id) {
        // this.closeSubPlanPanel();
        return;
      }

      this.currentParentPlan = row;
      this.showSubPlanPanel = true;
      this.newSubPlan = '';
      // 重置子计划输入框
      this.subPlanInputs = [''];

      // 抽屉式面板，不需要计算位置
      this.subPlanPanelStyle = {};

      // 获取子计划列表
      this.getSubPlanList(row.id);
    },

    closeSubPlanPanel() {
      this.showSubPlanPanel = false;
      this.currentParentPlan = null;
      this.subPlanList = [];
    },

    refreshSubPlanList() {
      if (this.currentParentPlan) {
        this.getSubPlanList(this.currentParentPlan.id);
        this.$message.success('下级计划已刷新');
      }
    },

    // AI优化计划 - 将newPlan分解成多个具体可执行的下级计划
    async aiOptimizePlan() {
      // Electron 版本暂不支持 AI 优化功能（需要 DeepSeek Token 配置）
      this.$message.warning("Electron 版本暂不支持 AI 优化功能");
    },

    // AI生成下级计划 - 从主计划列表点击
    async aiGenerateSubPlans(row) {
      // Electron 版本暂不支持下级计划功能
      this.$message.warning("Electron 版本暂不支持子计划功能");
    },

    async getSubPlanList(parentId) {
      // Electron 版本暂不支持下级计划功能
      this.subPlanList = [];
    },

    // 处理子计划输入框回车事件
    handleSubPlanInputEnter(index) {
      // 如果是最后一个输入框且不为空，添加新行
      if (index === this.subPlanInputs.length - 1 && this.subPlanInputs[index].trim()) {
        this.subPlanInputs.push('');
        // 聚焦到新输入框
        this.$nextTick(() => {
          const inputs = this.$el.querySelectorAll('.subplan-input-row .el-input__inner');
          if (inputs[index + 1]) {
            inputs[index + 1].focus();
          }
        });
      }
    },

    // 删除子计划输入框
    removeSubPlanInput(index) {
      if (this.subPlanInputs.length > 1) {
        this.subPlanInputs.splice(index, 1);
      } else {
        // 如果只剩一个，清空内容
        this.subPlanInputs[0] = '';
      }
    },

    // 添加子计划
    async addSubPlan() {
      // Electron 版本暂不支持下级计划功能
      this.$message.warning("Electron 版本暂不支持子计划功能");
    },

    // 保存子计划（与addSubPlan相同逻辑，用于底部保存按钮）
    async saveSubPlans() {
      await this.addSubPlan();
    },

    async toggleSubPlanStatus(item) {
      // Electron 版本暂不支持下级计划功能
      this.$message.warning("Electron 版本暂不支持子计划功能");
    },

    async deleteSubPlan(item) {
      // Electron 版本暂不支持下级计划功能
      this.$message.warning("Electron 版本暂不支持子计划功能");
    },

    // ========== 跑马灯相关方法 ==========
    
    // 加载跑马灯数据
    async loadMarqueeData() {
      try {
        const list = await window.electronAPI.getMarquees();
        // 按排序字段排序
        list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        this.marqueeTexts = list.map(item => item.text);
        // 计算并设置动画时长
        this.$nextTick(() => {
          this.calculateMarqueeDuration();
        });
      } catch (error) {
        console.error('加载跑马灯数据失败:', error);
      }
    },

    // 计算跑马灯动画时长，保持固定速度
    calculateMarqueeDuration() {
      const marqueeContent = document.querySelector('.marquee-content');
      if (!marqueeContent) return;
      
      const width = marqueeContent.scrollWidth / 2; // 只计算一半宽度（因为内容复制了一份）
      // 速度：每100px需要3秒，最少20秒，最多60秒
      const duration = Math.max(20, Math.min(60, (width / 100) * 3));
      
      // 设置CSS变量
      document.documentElement.style.setProperty('--marquee-duration', `${duration}s`);
    },

    // 打开跑马灯设置弹窗
    async openMarqueeDialog() {
      this.marqueeDialogVisible = true;
      await this.loadMarqueeList();
    },

    // 加载跑马灯列表（设置弹窗用，分页）
    async loadMarqueeList() {
      try {
        const list = await window.electronAPI.getMarquees();
        list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        this.marqueeList = list;
        this.marqueeTotal = list.length;
      } catch (error) {
        console.error('加载跑马灯列表失败:', error);
        this.$message.error('加载跑马灯列表失败');
      }
    },

    // 跑马灯分页切换
    handleMarqueePageChange() {
      this.loadMarqueeList();
    },

    handleMarqueeSizeChange() {
      this.marqueeCurrentPage = 1;
      this.loadMarqueeList();
    },

    // 打开编辑弹窗
    openMarqueeEditDialog(row) {
      if (row && row.id) {
        // 编辑模式
        this.marqueeForm = {
          id: row.id,
          text: row.text,
          sort_order: row.sort_order || 0,
          is_enabled: row.is_enabled !== undefined ? row.is_enabled : 1
        };
      } else {
        // 新增模式
        this.marqueeForm = {
          id: null,
          text: '',
          sort_order: this.marqueeList.length,
          is_enabled: 1
        };
      }
    // 不再打开单独弹窗，表单直接显示在设置弹窗内
  },

  // 重置表单为新增模式
  resetMarqueeForm() {
    this.marqueeForm = {
      id: null,
      text: '',
      sort_order: this.marqueeList.length,
      is_enabled: 1
    };
  },

  // 保存跑马灯项
    async saveMarqueeItem() {
      if (!this.marqueeForm.text.trim()) {
        this.$message.warning('请输入内容');
        return;
      }
      try {
        let success;
        if (this.marqueeForm.id) {
          // 编辑
          success = await window.electronAPI.updateMarquee(this.marqueeForm.id, {
            text: this.marqueeForm.text,
            sort_order: this.marqueeForm.sort_order,
            is_enabled: this.marqueeForm.is_enabled
          });
        } else {
          // 新增
          const result = await window.electronAPI.addMarquee({
            text: this.marqueeForm.text,
            sort_order: this.marqueeForm.sort_order,
            is_enabled: this.marqueeForm.is_enabled
          });
          success = !!result;
        }
        
        if (success) {
          this.$message.success(this.marqueeForm.id ? '编辑成功' : '新增成功');
          // 保存成功后重置表单为新增模式
          this.resetMarqueeForm();
          await this.loadMarqueeList();
          await this.loadMarqueeData();
        } else {
          this.$message.error('操作失败');
        }
      } catch (error) {
        console.error('保存跑马灯失败:', error);
        this.$message.error('保存失败');
      }
    },

    // 删除跑马灯项
    async deleteMarqueeItem(row) {
      try {
        const success = await window.electronAPI.deleteMarquee(row.id);
        if (success) {
          this.$message.success('删除成功');
          await this.loadMarqueeList();
          await this.loadMarqueeData();
        } else {
          this.$message.error('删除失败');
        }
      } catch (error) {
        console.error('删除跑马灯失败:', error);
        this.$message.error('删除失败');
      }
    },

    // 保存跑马灯显示状态到缓存
    savemaqueeShow(value) {
      localStorage.setItem('maqueeShow', JSON.stringify(value));
      this.$message.success(value ? '已开启跑马灯显示' : '已关闭跑马灯显示');
    },

    // 从缓存加载跑马灯显示状态
    loadmaqueeShow() {
      const saved = localStorage.getItem('maqueeShow');
      if (saved !== null) {
        this.maqueeShow = JSON.parse(saved);
      }
    },
  },
};
</script>
<style scoped>
/* 统一按钮样式 - 深绿色主题 */
:deep(.el-button--primary) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  border-radius: 10px;
}

:deep(.el-button--primary:hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

:deep(.el-button--primary:active) {
  background-color: #6b7a4d !important;
  border-color: #6b7a4d !important;
}

/* 默认按钮也使用深绿色 */
:deep(.el-button--default) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
  border-radius: 10px;
}

:deep(.el-button--default:hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

/* 成功按钮保持绿色系 */
:deep(.el-button--success) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  border-radius: 10px;
}

:deep(.el-button--success:hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

/* 警告按钮使用金棕色 */
:deep(.el-button--warning) {
  background-color: #c4a882 !important;
  border-color: #c4a882 !important;
  border-radius: 10px;
}

:deep(.el-button--warning:hover) {
  background-color: #b0946e !important;
  border-color: #b0946e !important;
}

/* 危险按钮保持红色 */
:deep(.el-button--danger) {
  background-color: #F56C6C !important;
  border-color: #F56C6C !important;
  border-radius: 10px;
}

/* 文字按钮 */
:deep(.el-button--text) {
  color: #8b9a6d !important;
}

:deep(.el-button--text:hover) {
  color: #7a895c !important;
}

/* 链接按钮 */
:deep(.el-button.is-link) {
  color: #8b9a6d !important;
}

:deep(.el-button.is-link:hover) {
  color: #7a895c !important;
}

  /* 优化滚动条样式 */
  .url-list-scroll::-webkit-scrollbar,
  .related-content-scroll::-webkit-scrollbar {
    width: 6px;
  }

  .url-list-scroll::-webkit-scrollbar-track,
  .related-content-scroll::-webkit-scrollbar-track {
    background: #f5f3f0;
    border-radius: 3px;
  }

  .url-list-scroll::-webkit-scrollbar-thumb,
  .related-content-scroll::-webkit-scrollbar-thumb {
    background: #c4a882;
    border-radius: 3px;
  }

  .url-list-scroll::-webkit-scrollbar-thumb:hover,
  .related-content-scroll::-webkit-scrollbar-thumb:hover {
    background: #b0946e;
  }

  /* 确保日期选择器容器不会被裁剪 */
  .plan-finish-time-container {
    overflow: visible !important;
  }
  
  .input-with-image {
    overflow: visible !important;
  }

/* 组件内联警告提示 */
.inline-warning-wrap {
  position: absolute;
  top: 10px;
  left: 16px;
  right: 16px;
  z-index: 20;
  width:50%;
  margin:0 auto;
}

.inline-warning-wrap :deep(.el-alert) {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
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

/* 输入框与图片容器 */
.input-with-image {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* 图片缩略图样式 */
.image-thumbnail {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e8e4df;
  flex-shrink: 0;
}

.image-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 删除图片按钮 */
.delete-image-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 2px 4px !important;
  min-height: 20px !important;
  height: 20px !important;
  font-size: 12px;
}

section {
}

#hero {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
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
  margin-bottom: 16px;
  flex: 1;
  height: 100%;
  background-color: #faf8f5;
}



/* 自定义表格样式 */
:deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
  font-size: 20px;
  background-color: #fff;
  border-radius: 12px;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

/* 移除输入框边框 */
:deep(.input-group .el-input__wrapper),
:deep(.input-group .el-textarea__inner) {
  box-shadow: none !important;
  border: 1.5px solid #e8e4df !important;
  border-radius: 12px !important;
  padding: 16px !important;
  font-size: 20px !important;
  line-height: 1.6 !important;
  background: #fdfbf8 !important;
  color: #1a1a1a !important;
  transition: all 0.3s ease !important;
}

:deep(.input-group .el-textarea__inner:hover) {
  border-color: #c4a882 !important;
}

:deep(.input-group .el-textarea__inner:focus) {
  border-color: #c4a882 !important;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

:deep(.input-group .el-textarea__inner::placeholder) {
  color: #9a9590 !important;
}

/* 可以根据需要调整表头文字颜色 */
:deep(.el-table th) {
  color: #6b6560;
  background-color: #f5f3f0 !important;
  font-weight: 600;
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



.plan-column {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  height: 100%;
  border-right: 1px solid #e8e4df;
  transition: all 0.3s ease-in-out;
  overflow: visible;
}



.plan-table{
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex:1;
  padding-top: 16px;
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
  color: #6b6560;
  border-left: 5px solid #8b9a6d;
  padding-left: 10px;
  font-weight: 500;
}



/* 添加 timeline 对话框的样式 */
:deep(.el-dialog__body) {
  max-height: 60vh;
  overflow-y: auto;
}

:deep(.completed-row) {
  color: #b8b4b0 !important;
  text-decoration: line-through;
}

:deep(.completed-row:hover) {
  background-color: #f5f3f0 !important;
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

.plan-text-top {
color: #c4a882;
font-weight: 600;
}

.sub-plan-text {
  font-size: 16px;
}

.project-name {
  font-size: 13px;
  color: #9a9590;
  line-height: 1.2;
}

/* 添加以下样式 */
.timeline-content {
  font-size: 14px;
  margin: 4px 0;
  line-height: 1.4;
}

:deep(.el-timeline-item__node) {
  background-color: #c4a882 !important;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 14px;
  color: #6b6560;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

.pagination {
  height: 50px;
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
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
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  gap: 10px;
  background-color: #fff;
  border-bottom: 1px solid #e8e4df;
  flex-shrink: 0;
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.mode-label {
  font-size: 12px;
  color: #6b6560;
}



.search-container {
  flex:1;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.search-input :deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
  padding: 0;
  transition: all 0.3s;
  width: 100%;
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: none !important;
}

.search-input :deep(.el-input__wrapper.is-focus) {
}

.search-input :deep(.el-input__inner) {
  background-color: transparent;
  border: none;
  height: 40px;
  padding:0 20px;
  transition: all 0.3s;
  outline: none !important;
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
  background-color: #f5f3f0;
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
  border-radius: 5px;
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
  box-shadow: none !important;
  border:none;
}

.timeline-card:hover {
}

.timeline-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
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
  color: #c4a882;
}

.status-icon.pending {
  color: #8b9a6d;
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
  background-color: #c4a882 !important;
}

:deep(.timeline-mode .el-timeline-item__timestamp) {
  font-size: 14px;
  font-weight: 600;
  color: #6b6560;
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
  color: #6b6560;
  font-size: 12px;
}

:deep(.el-switch__label.is-active) {
  color: #8b9a6d;
}

:deep(.el-switch__label:not(.is-active)) {
  color: #9a9590;
}

/* 优化开关样式 */
:deep(.el-switch) {
  --el-switch-on-color: #8b9a6d;
  --el-switch-off-color: #9a9590;
}

:deep(.el-switch__label) {
  color: #6b6560;
  font-size: 12px;
}

:deep(.el-switch__label.is-active) {
  color: #8b9a6d;
}
.time-line-div{
  border-radius: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #fff 0%, #f5f3f0 100%);
}
:deep(.el-switch__label:not(.is-active)) {
  color: #9a9590;
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
  background-color: #8b9a6d !important;
  border:none!important;
}
:deep(.status-completed .el-select__selected-item) {
  color: #fff!important;
  border:none!important;
}

:deep(.status-pending .el-select__wrapper) {
  background-color: #c4a882 !important;
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

/* 状态按钮样式 */
.status-btn-completed {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
  border-radius: 12px;
}

.status-btn-pending {
  background-color: #c4a882 !important;
  border-color: #c4a882 !important;
  color: #fff !important;
  border-radius: 12px;
}

.status-btn-completed:hover,
.status-btn-pending:hover {
  opacity: 0.8;
}

.countdown-text {
  margin-left: 4px;
  font-size: 12px;
  color: #9a9590;
}

/* 保存按钮渐变效果 - 从左到右变浅 */
.gradient-save-btn {
  height: 60px;
  flex: 1;
  background: linear-gradient(to right, #8b9a6d, #9aaa7d) !important;
  border: none !important;
  border-radius: 12px !important;
  transition: all 0.3s ease;
}

.gradient-save-btn:hover {
  background: linear-gradient(to right, #7a895c, #899a6c) !important;
}

.subplan-btn {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
  padding: 4px 8px !important;
  border-radius: 12px;
}

.subplan-btn:hover {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

.subplan-panel {
  position: absolute;
  top: 0;
  left: 100%;
  width: 490px;
  height: 100%;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.3s ease;
  border-left: 1px solid #e8e4df;
  z-index: 10;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.subplan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 15px;
  height: 60px;
  background-color: #ffffff;
}

.subplan-title {
  font-size: 16px;
  font-weight: 600;
  color: #6b6560;
  border-left: 5px solid #8b9a6d;
  padding-left: 10px;
}

.subplan-close {
  cursor: pointer;
  font-size: 20px;
  color: #9a9590;
  transition: all 0.2s;
}

.subplan-close:hover {
  color: #f56c6c;
  transform: scale(1.2);
}

.subplan-refresh {
  cursor: pointer;
  font-size: 20px;
  color: #9a9590;
  transition: all 0.2s;
  margin-left: auto;
  margin-right: 10px;
}

.subplan-refresh:hover {
  color: #c4a882;
  transform: scale(1.2);
}

.subplan-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 16px;
  gap: 12px;
}

.parent-plan-display {
  margin-top: 12px;
}

.parent-plan-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.parent-plan-text {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  word-break: break-all;
  color: #1a1a1a;
}

.subplan-input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}

.subplan-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subplan-input-row .el-input {
  flex: 1;
}

.subplan-input-row .delete-icon {
  cursor: pointer;
  color: #f56c6c;
  font-size: 25px;
  padding: 4px;
}

.subplan-input-row .delete-icon:hover {
  color: #ff4d4f;
}

.subplan-input-area :deep(.el-textarea__inner) {
  box-shadow: none !important;
  border: none !important;
  font-size: 20px;
}

.subplan-add-btn {
  height: 50px;
  background: linear-gradient(to right, #8b9a6d, #9aaa7d) !important;
  border: none !important;
  border-radius: 12px !important;
}

.subplan-add-btn:hover {
  background: linear-gradient(to right, #7a895c, #899a6c) !important;
}

.subplan-list {
  flex: 1;
  overflow-y: auto;
}

.subplan-list :deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  font-size: 16px;
}

.subplan-list :deep(.el-table__row) {
  height: 50px !important;
  line-height: 50px !important;
  cursor: pointer;
}

.subplan-list :deep(.el-table__cell) {
  padding: 8px 16px !important;
}

.subplan-list :deep(.el-table .cell) {
  padding: 0 !important;
}

.subplan-delete-icon {
  color: #f56c6c;
  cursor: pointer;
  font-size: 25px;
  margin-left: 8px;
  transition: color 0.3s;
}

.subplan-delete-icon:hover {
  color: #f78989;
}

/* 单条计划遮罩弹窗样式 */
.plan-popup-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(250, 248, 245, 0.75);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.plan-popup-content {
  background: #fff;
  padding: 50px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  font-size: 50px;
  margin: 20px 0;
  border: 1px solid #e8e4df;
}

.plan-popup-content-div {
  font-size: 30px;
  margin: 20px 0;
}

.plan-popup-content-div h2 {
  font-size: 40px;
  margin: 20px 0;
  word-break: break-all;
}

.plan-popup-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.plan-popup-buttons .el-button {
  height: 60px;
  font-size: 20px;
  padding: 0 30px;
}

/* 跑马灯样式 */
.marquee-container {
  width: 200px;
  overflow: hidden;
  height: 40px;
  line-height: 40px;
  background: linear-gradient(90deg, #f5f3f0 0%, #efe9e2 100%);
  border-radius: 10px;
  margin: 0 15px;
  position: relative;
}

.marquee-content {
  display: inline-flex;
  white-space: nowrap;
  will-change: transform;
  /* 动态计算动画时长：每100px宽度需要3秒，最少20秒，最多60秒 */
  animation: marquee var(--marquee-duration, 30s) linear infinite;
}

.marquee-item {
  padding: 0 40px;
  color: #6b6560;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.marquee-container:hover .marquee-content {
  animation-play-state: paused;
}

/* 跑马灯设置按钮 */
.marquee-setting-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: rgba(196, 168, 130, 0.8);
  border-color: rgba(196, 168, 130, 0.8);
  color: #fff;
  opacity: 0;
  transition: opacity 0.3s;
}

.marquee-container:hover .marquee-setting-btn {
  opacity: 1;
}

.marquee-setting-btn:hover {
  background: #c4a882 !important;
  border-color: #c4a882 !important;
  color: #fff;
}

/* 跑马灯弹窗工具栏 */
/* 跑马灯表单区域 */
.marquee-form-area {
  background: #f5f3f0;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 8px;
}

.marquee-form-title {
  font-size: 14px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 12px;
}

/* 跑马灯设置弹窗 - 去掉外层滚动条，内容完整显示 */
.marquee-dialog-visible .el-dialog__body {
  max-height: none !important;
  overflow: visible !important;
}

</style>

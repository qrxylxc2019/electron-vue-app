<template>
  <div class="self-media-container">
    <div class="header">
      <div class="label">自媒体内容工作台</div>
    </div>

    <el-tabs v-model="activeTab" class="sm-tabs" @tab-click="handleTabChange">
      <el-tab-pane label="📋 选题管理" name="topics">
        <TopicList @select-topic="handleSelectTopic" />
      </el-tab-pane>

      <el-tab-pane label="✍️ 文章创作" name="workflow">
        <WorkflowPanel @go-publish="handleGoPublish" />
      </el-tab-pane>

      <el-tab-pane label="🎨 配图管理" name="images">
        <ImageGallery />
      </el-tab-pane>

      <el-tab-pane label="📤 发布管理" name="publish">
        <PublishPanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { TabsPaneContext } from 'element-plus'
import TopicList from './TopicList.vue'
import WorkflowPanel from './WorkflowPanel.vue'
import ImageGallery from './ImageGallery.vue'
import PublishPanel from './PublishPanel.vue'

const activeTab = ref('topics')

const handleTabChange = (tab: TabsPaneContext) => {
  // 可扩展：切换 tab 时做数据刷新等操作
}

// 从选题管理跳转到文章创作
const handleSelectTopic = (topic: any) => {
  activeTab.value = 'workflow'
}

// 从创作完成跳转到发布管理
const handleGoPublish = (_articleId: number) => {
  activeTab.value = 'publish'
}
</script>

<style scoped>
.self-media-container {
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
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 15px;
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #e8e4df;
  border-radius: 12px;
}

.label {
  font-size: 18px;
  color: #6b6560;
  border-left: 5px solid #8b9a6d;
  padding-left: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.sm-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.sm-tabs .el-tabs__header) {
  margin-bottom: 0;
}

:deep(.sm-tabs .el-tabs__item) {
  font-size: 15px;
  color: #6b6560;
  font-weight: 500;
  padding: 0 20px;
  height: 48px;
  line-height: 48px;
}

:deep(.sm-tabs .el-tabs__item.is-active) {
  color: #8b9a6d;
  font-weight: 600;
}

:deep(.sm-tabs .el-tabs__active-bar) {
  background-color: #8b9a6d;
  height: 3px;
  border-radius: 2px;
}

:deep(.sm-tabs .el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #e8e4df;
}

:deep(.sm-tabs .el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding:20px 0;
}

:deep(.sm-tabs .el-tab-pane) {
  height: 100%;
}

/* 通用按钮样式 */
:deep(.el-button--primary:not(.el-button--text):not(.is-link)) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  border-radius: 10px;
}

:deep(.el-button--primary:not(.el-button--text):not(.is-link):hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

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

:deep(.el-button--danger:not(.el-button--text):not(.is-link)) {
  border-radius: 10px;
}

:deep(.el-button.is-link) { color: #8b9a6d !important; }
:deep(.el-button.is-link:hover) { color: #7a895c !important; }
:deep(.el-button--text) { color: #8b9a6d !important; }
:deep(.el-button--text:hover) { color: #7a895c !important; }
:deep(.el-button--text.el-button--danger) { color: #F56C6C !important; }

/* 状态标签 */
:deep(.el-tag--success) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
}

:deep(.el-tag--warning) {
  background-color: #c4a882 !important;
  border-color: #c4a882 !important;
  color: #fff !important;
}

:deep(.el-tag--danger) {
  background-color: #e8686a !important;
  border-color: #e8686a !important;
  color: #fff !important;
}

:deep(.el-tag--info) {
  background-color: #9a9590 !important;
  border-color: #9a9590 !important;
  color: #fff !important;
}

/* 搜索输入框 */
:deep(.search-input .el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
}

:deep(.search-input .el-input__wrapper:hover) { border-color: #c4a882; }
:deep(.search-input .el-input__wrapper.is-focus) {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

/* 表单通用样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-select .el-select__wrapper) { border-radius: 10px; }
:deep(.el-select .el-select__wrapper:hover) { box-shadow: 0 0 0 1px #c4a882 inset !important; }
:deep(.el-select .el-select__wrapper.is-focused) { box-shadow: 0 0 0 1px #c4a882 inset !important; }

:deep(.el-form-item__label) {
  color: #6b6560;
  font-weight: 500;
}

/* 分页 */
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

:deep(.el-pagination button:disabled) {
  background-color: #c0c4cc;
  color: white;
}

/* 抽屉 */
:deep(.el-drawer__header) {
  border-bottom: 1px solid #e8e4df;
  padding-bottom: 16px;
  color: #6b6560;
}

:deep(.el-drawer__body) {
  background-color: #faf8f5;
}

/* 开关 */
:deep(.el-switch) {
  --el-switch-on-color: #8b9a6d;
  --el-switch-off-color: #9a9590;
}

/* Steps */
:deep(.el-step__head.is-finish .el-step__icon) {
  color: #8b9a6d;
  border-color: #8b9a6d;
}

:deep(.el-step__head.is-process .el-step__icon) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
}

:deep(.el-step__title.is-finish) { color: #8b9a6d; }
:deep(.el-step__title.is-process) { color: #8b9a6d; font-weight: 600; }

/* Slider */
:deep(.el-slider__bar) {
  background-color: #8b9a6d;
}

:deep(.el-slider__button) {
  border-color: #8b9a6d;
}

/* Radio */
:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
}
</style>

<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2024-07-05 00:00:00
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-07-05 00:00:00
 * @FilePath: \eletron\frontend\src\views\InfoQuery\InfoQuery.vue
 * @Description: 信息查询组件，用于查询公交信息和外卖信息
-->
<template>
  <div class="info-query-container">
    <div class="content">
      <el-tabs v-model="activeTab" class="custom-tabs" @tab-click="handleTabClick">
        <el-tab-pane name="bus">
          <template #label>
            <div class="tab-label">
              <el-icon class="tab-icon"><Van /></el-icon>
              <span>公交信息</span>
            </div>
          </template>
          <BusQuery />
        </el-tab-pane>
        <el-tab-pane name="food">
          <template #label>
            <div class="tab-label">
              <el-icon class="tab-icon"><Food /></el-icon>
              <span>外卖信息</span>
            </div>
          </template>
          <FoodDelivery />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Van, Food } from '@element-plus/icons-vue'
import BusQuery from './components/BusQuery.vue'
import FoodDelivery from './components/FoodDelivery.vue'

const activeTab = ref('bus')

const handleTabClick = (tab) => {
  console.log('Tab clicked:', tab.paneName)
}
</script>

<style scoped>
.info-query-container {
  padding: 20px;
  height: 100%;
}

.header {
  margin-bottom: 20px;
}

.header h1 {
  font-size: 24px;
  color: #303133;
}

.content {
  height: calc(100% - 60px);
  background-color: #fff;
  border-radius: 4px;
}

.custom-tabs {
  height: 100%;
}

:deep(.el-tabs__content) {
  padding: 20px;
  height: calc(100% - 40px);
  overflow-y: auto;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-icon {
  font-size: 18px;
}
</style> 
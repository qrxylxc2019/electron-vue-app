<template>
  <div class="left-menu">
    <el-menu
      :default-active="activeMenu"
      class="menu-container"
      router
      background-color="#faf8f5"
      text-color="#1a1a1a"
      active-text-color="#8b9a6d"
    >
      <el-menu-item index="/plan">
        <el-icon><Calendar /></el-icon>
        <span>计划</span>
      </el-menu-item>
      <el-menu-item index="/">
        <el-icon><HomeFilled /></el-icon>
        <span>科目列表</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled, Reading, Calendar } from '@element-plus/icons-vue'

const route = useRoute()

const activeMenu = computed(() => {
  const path = route.path
  if (path === '/' || path === '') return '/'
  if (path.startsWith('/learn') || path.startsWith('/quiz') || path.startsWith('/case') || path.startsWith('/ai') || path.startsWith('/english') || path.startsWith('/translate') || path.startsWith('/article') || path.startsWith('/cloze') || path.startsWith('/shuxue')) {
    return '/learn'
  }
  if (path.startsWith('/plan')) {
    return '/plan'
  }
  return path
})
</script>

<style scoped>
.left-menu {
  width: 200px;
  height: 100vh;
  background: #faf8f5;
  border-right: 1px solid #e8e4df;
  flex-shrink: 0;
}

.menu-container {
  height: 100%;
  border-right: none;
}

:deep(.el-menu-item) {
  font-size: 16px;
  height: 56px;
  line-height: 56px;
}

:deep(.el-menu-item .el-icon) {
  font-size: 20px;
  margin-right: 12px;
}

:deep(.el-menu-item.is-active) {
  background: rgba(139, 154, 109, 0.1) !important;
  font-weight: 600;
}

:deep(.el-menu-item:hover) {
  background: rgba(139, 154, 109, 0.05) !important;
}
</style>

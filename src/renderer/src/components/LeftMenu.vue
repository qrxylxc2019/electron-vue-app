<template>
  <div class="left-menu">
    <el-menu
      :default-active="activeMenu"
      class="menu-container"
      router
      background-color="#e8e4df"
      text-color="#3a3a3a"
      active-text-color="#8b9a6d"
    >
      <div class="menu-logo">
        <img src="../assets/favicon.ico" alt="logo" />
      </div>
      <el-menu-item index="/collect">
        <el-icon><Star /></el-icon>
        <span>收藏</span>
      </el-menu-item>
      <el-menu-item index="/plan">
        <el-icon><Calendar /></el-icon>
        <span>计划</span>
      </el-menu-item>
      <el-menu-item index="/solicit">
        <el-icon><EditPen /></el-icon>
        <span>征稿</span>
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
import { HomeFilled, Reading, Calendar, EditPen, Star } from '@element-plus/icons-vue'

const route = useRoute()

const activeMenu = computed(() => {
  const path = route.path
  if (path === '/' || path === '') return '/'
  if (path.startsWith('/learn') || path.startsWith('/quiz') || path.startsWith('/case') || path.startsWith('/ai') || path.startsWith('/english') || path.startsWith('/translate') || path.startsWith('/article') || path.startsWith('/cloze') || path.startsWith('/shuxue')) {
    return '/learn'
  }
  if (path.startsWith('/collect')) {
    return '/collect'
  }
  if (path.startsWith('/plan')) {
    return '/plan'
  }
  if (path.startsWith('/solicit')) {
    return '/solicit'
  }
  return path
})
</script>

<style scoped>
.left-menu {
  width: 200px;
  height: 100vh;
  background: #e8e4df;
  border-right: 1px solid #d5d0c8;
  flex-shrink: 0;
  position: fixed;
  left: 0;
  top: 0;
  overflow-y: auto;
  z-index: 10;
}

.menu-container {
  height: 100%;
  border-right: none;
  overflow-y: auto;
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
  border-left: 5px solid #8b9a6d;
}

:deep(.el-menu-item:hover) {
  background: rgba(139, 154, 109, 0.05) !important;
}

.menu-logo {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.menu-logo img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
</style>

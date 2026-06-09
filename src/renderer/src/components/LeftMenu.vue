<template>
  <div class="left-menu" :class="{ collapsed: isCollapsed }">
    <el-menu
      :default-active="activeMenu"
      class="menu-container"
      :class="{ collapsed: isCollapsed }"
      router
      :collapse="isCollapsed"
      background-color="#e8e4df"
      text-color="#3a3a3a"
      active-text-color="#8b9a6d"
    >
      <div class="menu-logo" :class="{ collapsed: isCollapsed }">
        <img src="../assets/favicon.ico" alt="logo" />
      </div>
      <el-menu-item index="/plan">
        <el-icon><Calendar /></el-icon>
        <template #title><span>计划</span></template>
      </el-menu-item>
      <el-menu-item index="/yearplan">
        <el-icon><Calendar /></el-icon>
        <template #title><span>月计划</span></template>
      </el-menu-item>
      <el-menu-item index="/collect">
        <el-icon><Star /></el-icon>
        <template #title><span>收藏</span></template>
      </el-menu-item>
      <el-menu-item index="/project">
        <el-icon><Folder /></el-icon>
        <template #title><span>项目</span></template>
      </el-menu-item>

      <el-menu-item index="/solicit">
        <el-icon><EditPen /></el-icon>
        <template #title><span>征稿</span></template>
      </el-menu-item>
      <el-menu-item index="/note">
        <el-icon><Notebook /></el-icon>
        <template #title><span>笔记</span></template>
      </el-menu-item>
      <el-menu-item index="/">
        <el-icon><HomeFilled /></el-icon>
        <template #title><span>科目列表</span></template>
      </el-menu-item>
    </el-menu>
    <div class="collapse-btn" @click="toggleCollapse">
      <el-icon v-if="isCollapsed"><ArrowRight /></el-icon>
      <el-icon v-else><ArrowLeft /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled, Calendar, EditPen, Star, Folder, Notebook, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const route = useRoute()
const isCollapsed = ref(false)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// Emit collapse state change so App.vue can adjust main-content margin
const emit = defineEmits(['collapseChange'])
watch(isCollapsed, (val) => {
  emit('collapseChange', val)
})

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
  if (path.startsWith('/project')) {
    return '/project'
  }
  if (path.startsWith('/solicit')) {
    return '/solicit'
  }
  if (path.startsWith('/yearplan')) {
    return '/yearplan'
  }
  if (path.startsWith('/note')) {
    return '/note'
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
  z-index: 10;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.left-menu.collapsed {
  width: 64px;
}

.menu-container {
  flex: 1;
  border-right: none;
  overflow-y: auto;
  overflow-x: hidden;
}

.menu-container:not(.collapsed) :deep(.el-menu-item) {
  font-size: 16px;
  height: 56px;
  line-height: 56px;
}

.menu-container.collapsed :deep(.el-menu-item) {
  font-size: 12px;
  height: 64px;
  line-height: 1.2;
  padding: 8px 0 !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.menu-container:not(.collapsed) :deep(.el-menu-item .el-icon) {
  font-size: 20px;
  margin-right: 12px;
}

.menu-container.collapsed :deep(.el-menu-item .el-icon) {
  font-size: 20px;
  margin-right: 0;
}

:deep(.el-menu-item.is-active) {
  background: rgba(139, 154, 109, 0.1) !important;
  font-weight: 600;
  position: relative;
}

:deep(.el-menu-item.is-active)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: #8b9a6d;
  border-radius: 0 3px 3px 0;
}

:deep(.el-menu-item:hover) {
  background: rgba(139, 154, 109, 0.05) !important;
}

.menu-logo {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
  transition: padding 0.3s ease;
}

.menu-logo.collapsed {
  padding: 12px 0;
}

.menu-logo img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  transition: width 0.3s ease, height 0.3s ease;
}

.menu-logo.collapsed img {
  width: 36px;
  height: 36px;
}

.collapse-btn {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b6560;
  font-size: 16px;
  border-top: 1px solid #d5d0c8;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background: rgba(139, 154, 109, 0.1);
  color: #8b9a6d;
}

/* Collapsed menu item title styling */
.menu-container.collapsed :deep(.el-menu-item span) {
  font-size: 12px;
  line-height: 1.2;
}

/* Override el-menu collapse styles */
.menu-container.collapsed :deep(.el-tooltip__trigger) {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 8px 0 !important;
}
</style>

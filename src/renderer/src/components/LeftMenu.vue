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

      

      <!-- 一级：计划 -->
      <el-menu-item index="/plan">
        <el-icon><Calendar /></el-icon>
        <template #title><span>计划</span></template>
      </el-menu-item>

      <!-- 一级：月计划 -->
      <el-menu-item index="/yearplan">
        <el-icon><Calendar /></el-icon>
        <template #title><span>月计划</span></template>
      </el-menu-item>

      <!-- 一级：书法（二级：征稿、集字、书法图片） -->
      <el-sub-menu index="/calligraphy">
        <template #title>
          <el-icon><Edit /></el-icon>
          <span>书法</span>
        </template>
        <el-menu-item index="/solicit">
          <el-icon><EditPen /></el-icon>
          <template #title><span>征稿</span></template>
        </el-menu-item>
        <el-menu-item index="/jizi">
          <el-icon><Grid /></el-icon>
          <template #title><span>集字</span></template>
        </el-menu-item>
        <el-menu-item index="/handwriting">
          <el-icon><Picture /></el-icon>
          <template #title><span>书法图片</span></template>
        </el-menu-item>
      </el-sub-menu>

      <!-- 一级：学习汇总（二级：信息收藏、项目、笔记、爬虫、知识库） -->
      <el-sub-menu index="/summary">
        <template #title>
          <el-icon><Collection /></el-icon>
          <span>信息汇总</span>
        </template>
        <el-menu-item index="/collect">
          <el-icon><Star /></el-icon>
          <template #title><span>信息收藏</span></template>
        </el-menu-item>
        <el-menu-item index="/project">
          <el-icon><Folder /></el-icon>
          <template #title><span>项目</span></template>
        </el-menu-item>
        <el-menu-item index="/note">
          <el-icon><Notebook /></el-icon>
          <template #title><span>笔记</span></template>
        </el-menu-item>
        <el-menu-item index="/xinxi">
          <el-icon><Document /></el-icon>
          <template #title><span>爬虫</span></template>
        </el-menu-item>
        <el-menu-item index="/knowledge">
          <el-icon><Search /></el-icon>
          <template #title><span>知识库</span></template>
        </el-menu-item>
        <el-menu-item index="/password">
          <el-icon><Lock /></el-icon>
          <template #title><span>密码</span></template>
        </el-menu-item>
      </el-sub-menu>

      <!-- 一级：编程（二级：Claude、Token、Agent） -->
      <el-sub-menu index="/code">
        <template #title>
          <el-icon><Cpu /></el-icon>
          <span>编程</span>
        </template>
        <el-menu-item index="/claude">
          <el-icon><ChatDotRound /></el-icon>
          <template #title><span>Claude</span></template>
        </el-menu-item>
        <el-menu-item index="/token">
          <el-icon><Key /></el-icon>
          <template #title><span>Token</span></template>
        </el-menu-item>
        <el-menu-item index="/codeagent">
          <el-icon><MagicStick /></el-icon>
          <template #title><span>Agent</span></template>
        </el-menu-item>
      </el-sub-menu>

      <!-- 一级：学习（二级：科目列表） -->
      <el-sub-menu index="/study">
        <template #title>
          <el-icon><Reading /></el-icon>
          <span>学习</span>
        </template>
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title><span>科目列表</span></template>
        </el-menu-item>
      </el-sub-menu>
      

      <!-- 一级：副业 -->
      <el-sub-menu index="/commerce">
        <template #title>
          <el-icon><Shop /></el-icon>
          <span>商业</span>
        </template>
        <el-menu-item index="/commerce">
          <el-icon><Goods /></el-icon>
          <template #title><span>副业项目</span></template>
        </el-menu-item>
        <el-menu-item index="/selfmedia">
          <el-icon><VideoCamera /></el-icon>
          <template #title><span>自媒体运营</span></template>
        </el-menu-item>
      </el-sub-menu>

      <!-- 一级：副业 -->
      <el-sub-menu index="/prompt">
        <template #title>
          <el-icon><Shop /></el-icon>
          <span>设置</span>
        </template>
        <el-menu-item index="/prompt">
          <el-icon><ChatDotRound /></el-icon>
          <template #title><span>提示词</span></template>
        </el-menu-item>
      </el-sub-menu>

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
import { HomeFilled, Calendar, EditPen, Star, Folder, Notebook, ChatDotRound, Key, Collection, Cpu, Reading, ArrowLeft, ArrowRight, Edit, Grid, Picture, Document, Shop, Goods, Lock, VideoCamera, MagicStick, Search } from '@element-plus/icons-vue'

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
  if (path.startsWith('/jizi')) {
    return '/jizi'
  }
  if (path.startsWith('/handwriting')) {
    return '/handwriting'
  }
  if (path.startsWith('/xinxi')) {
    return '/xinxi'
  }
  if (path.startsWith('/knowledge')) {
    return '/knowledge'
  }
  if (path.startsWith('/yearplan')) {
    return '/yearplan'
  }
  if (path.startsWith('/note')) {
    return '/note'
  }
  if (path.startsWith('/claude')) {
    return '/claude'
  }
  if (path.startsWith('/token')) {
    return '/token'
  }
  if (path.startsWith('/codeagent')) {
    return '/codeagent'
  }
  if (path.startsWith('/commerce')) {
    return '/commerce'
  }
  if (path.startsWith('/selfmedia')) {
    return '/selfmedia'
  }
  if (path.startsWith('/password')) {
    return '/password'
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

/* Sub-menu styling */
:deep(.el-sub-menu__title) {
  font-size: 16px;
  height: 56px;
  line-height: 56px;
}

:deep(.el-sub-menu__title .el-icon) {
  font-size: 20px;
  margin-right: 12px;
}

:deep(.el-sub-menu .el-menu-item) {
  padding-left: 48px !important;
}

:deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: #8b9a6d !important;
  font-weight: 600;
}
/* 滚动条优化：默认隐藏，悬停显示，不占空间 */
.menu-container::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

.menu-container::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
  transition: background 0.3s;
}

.left-menu:hover .menu-container::-webkit-scrollbar-thumb {
  background: #b8b3ab;
}

.left-menu:hover .menu-container::-webkit-scrollbar-thumb:hover {
  background: #a09a92;
}

/* Firefox 滚动条 */
.menu-container {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.left-menu:hover .menu-container {
  scrollbar-color: #b8b3ab transparent;
}
</style>

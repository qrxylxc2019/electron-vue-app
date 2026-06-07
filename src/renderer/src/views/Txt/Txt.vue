<template>
  <div class="txt-container">
    <!-- 自定义tab标题栏 -->
    <div class="custom-tabs-header">
      <div class="tabs-scroll-container">
        <!-- 左箭头按钮 -->
        <el-icon 
          v-if="showLeftArrow" 
          class="scroll-arrow left-arrow" 
          @click="scrollLeft"
        >
          <ArrowLeft />
        </el-icon>
        
        <div class="tabs-container" ref="tabsContainer">
            <div 
                v-for="(tab, index) in tabs" 
                :key="index"
                :class="['custom-tab', { active: activeTab === index.toString() }]"
                @click="setActiveTab(index)"
            >
                <span class="tab-title">{{ tab.title }}</span>
                <el-icon class="close-icon" @click.stop="removeTab(index.toString())">
                <Close />
                </el-icon>
            </div>
            <!-- plus按钮 -->
            <el-icon class="add-tab-icon" @click="addNewTab">
                <Plus />
            </el-icon>
        </div>
        
        <!-- 右箭头按钮 -->
        <el-icon 
          v-if="showRightArrow" 
          class="scroll-arrow right-arrow" 
          @click="scrollRight"
        >
          <ArrowRight />
        </el-icon>
      </div>
    </div>

    <!-- tab内容区域 -->
    <div class="tab-content">
      <div 
        v-for="(tab, index) in tabs" 
        :key="index"
        v-show="activeTab === index.toString()"
        class="tab-pane"
      >
        <el-input
          v-model="tab.content"
          type="textarea"
          placeholder="请填写内容..."
          class="fullscreen-textarea"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { Close, Plus, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

export default {
  name: 'Txt',
  components: {
    Close,
    Plus,
    ArrowLeft,
    ArrowRight
  },
  data() {
    return {
      activeTab: '0',
      tabs: [
        {
          title: '内容1',
          content: ''
        }
      ],
      content: '',
      tabCounter: 1,
      // 滚动相关数据
      scrollPosition: 0,
      showLeftArrow: false,
      showRightArrow: false
    }
  },
  methods: {
    addNewTab() {
      this.tabCounter++
      this.tabs.push({
        title: `内容${this.tabCounter}`,
        content: ''
      })
      this.activeTab = (this.tabs.length - 1).toString()
      this.$nextTick(() => {
        this.updateScrollArrows()
      })
    },
    removeTab(tabIndex) {
      const index = parseInt(tabIndex)
      if (this.tabs.length > 1) {
        this.tabs.splice(index, 1)
        if (this.activeTab === tabIndex) {
          this.activeTab = Math.max(0, index - 1).toString()
        }
      }
      this.$nextTick(() => {
        this.updateScrollArrows()
      })
    },
    setActiveTab(index) {
      this.activeTab = index.toString()
    },
    // 滚动相关方法
    scrollLeft() {
      const container = this.$refs.tabsContainer
      if (container) {
        this.scrollPosition = Math.max(0, this.scrollPosition - 200)
        container.scrollLeft = this.scrollPosition
        this.updateScrollArrows()
      }
    },
    scrollRight() {
      const container = this.$refs.tabsContainer
      if (container) {
        const maxScroll = container.scrollWidth - container.clientWidth
        this.scrollPosition = Math.min(maxScroll, this.scrollPosition + 200)
        container.scrollLeft = this.scrollPosition
        this.updateScrollArrows()
      }
    },
    updateScrollArrows() {
      const container = this.$refs.tabsContainer
      if (container) {
        const maxScroll = container.scrollWidth - container.clientWidth
        this.showLeftArrow = this.scrollPosition > 0
        this.showRightArrow = this.scrollPosition < maxScroll
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.updateScrollArrows()
    })
    
    // 监听窗口大小变化
    window.addEventListener('resize', this.updateScrollArrows)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateScrollArrows)
  }
}
</script>

<style scoped>
.txt-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 10px;
  border-bottom: 1px solid #e6e6e6;
}

.custom-tabs-header {
  background: #f5f7fa;
  padding: 0 10px;
}

.tabs-scroll-container {
  display: flex;
  align-items: center;
  position: relative;
  padding: 0 30px; /* 为箭头留出空间 */
}

.scroll-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #606266;
  cursor: pointer;
  border-radius: 4px;
  background: #f5f7fa;
  z-index: 10;
  transition: all 0.3s;
}

.scroll-arrow:hover {
  background: #e4e7ed;
  color: #409eff;
}

.left-arrow {
  left: 0;
}

.right-arrow {
  right: 0;
}

.tabs-container {
  display: flex;
  align-items: center;
  gap: 0;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.tabs-container::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.custom-tab {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 5px 5px 0 0;
  background: #f5f7fa;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 0;
  gap: 9px;
  flex-shrink: 0; /* 防止标签被压缩 */
  white-space: nowrap; /* 防止文字换行 */
}

.custom-tab.active {
  background: #fff;
  font-weight: 500;
}

.custom-tab:hover:not(.active) {
  border-color: #c0c4cc;
  background: #e4e7ed; /* 加深背景色 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 添加阴影效果 */
}

.tab-title {
  margin-right: 8px;
  font-size: 14px;
}

.close-icon {
  font-size: 16px;
  color: #909399;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  transition: all 0.3s; /* 改为所有属性过渡 */
}

.close-icon:hover {
  background-color: #f56c6c;
  color: #fff;
  transform: scale(1.1); /* 添加缩放效果 */
}

.add-tab-icon {
  cursor: pointer;
  margin-left: 15px;
  padding: 6px;
  font-size: 25px;
}

.add-tab-icon:hover {
  border-radius: 5px;
  border-color: #c0c4cc;
  background: #e4e7ed; /* 加深背景色 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 添加阴影效果 */
  color: #fff;
}

.tab-content {
  flex: 1;
  overflow: auto;
}

.tab-pane {
  height: 100%;
}

.fullscreen-textarea {
  width: 100%;
  height: 100%;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  font-size: 25px;
  line-height: 1.5;
  border: none;
}

:deep(.el-textarea__inner) {
  resize: vertical;
  border: none;
  border-radius: 0;
  padding: 15px;
  height: 100%;
  outline: none;
  box-shadow: none;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  font-size: 25px;
}

:deep(.el-textarea__inner:focus) {
  outline: none;
  box-shadow: none;
  border: none;
}
</style>

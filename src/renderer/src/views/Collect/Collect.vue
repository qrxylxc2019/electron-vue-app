<template>
  <div class="browser-wrapper" :class="{ 'has-left-sidebar': collectDisplayPosition === 'left' }">
    <!-- 左侧收藏夹（整体左侧布局时使用） -->
    <div v-if="collectDisplayPosition === 'left' && !isLeftSidebarCollapsed" class="global-left-sidebar">
      <div class="url-left-content">
        <div class="url-left-header">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入搜索关键词"
            class="search-input"
            size="default"
            @input="debouncedSearch"
            clearable
          >
          </el-input>
          <el-button type="primary" @click="collectUrl" size="default">所有url</el-button>
        </div>
        <div class="url-left-table">
          <el-table
            :data="learnData"
            height="100%"
            v-loading="loading"
            :show-header="false"
            :row-class-name="rowClassName"
            @row-click="handleRowClick"
          >
            <el-table-column prop="title" label="标题" />
            <el-table-column label="操作" width="40">
              <template #default="scope">
                <el-icon
                  style="cursor: pointer; color: #f56c6c; font-size: 16px;"
                  @click.stop="handleDelete(scope.row)"
                >
                  <Delete />
                </el-icon>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="url-left-pagination">
          <el-pagination
            small
            background
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
        <!-- 新增学习内容表单 -->
        <div class="url-left-form">
          <h4 class="form-title">新增学习内容</h4>
          <el-form :model="form" size="large" label-position="left" class="compact-form" label-width="60px">
            <el-form-item label="URL" class="compact-form-item horizontal-item">
              <div class="input-button-group">
                <el-input
                  v-model="form.url"
                  placeholder="请输入URL"
                  clearable
                  class="url-input"
                  size="large"
                ></el-input>
                <el-button type="success" :loading="aiLoading" @click="aiParseUrl" class="ai-btn" size="large">AI</el-button>
              </div>
            </el-form-item>
            <el-form-item label="标题" class="compact-form-item horizontal-item">
              <el-input
                v-model="form.title"
                placeholder="请输入标题"
                clearable
                size="large"
              ></el-input>
            </el-form-item>
            <el-form-item class="submit-item">
              <el-button
                type="primary"
                @click="handleSubmit"
                class="submit-btn"
                size="large"
              >保存</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
    
    <div class="browser-container">
      <!-- 标签页栏 -->
      <div class="tabs-bar">
        <!-- 左侧折叠按钮（仅在左侧布局时显示） -->
        <div 
          v-if="collectDisplayPosition === 'left'" 
          class="sidebar-toggle-btn"
          @click="isLeftSidebarCollapsed = !isLeftSidebarCollapsed"
          :title="isLeftSidebarCollapsed ? '展开收藏夹' : '折叠收藏夹'"
        >
          <el-icon>
            <Fold v-if="!isLeftSidebarCollapsed" />
            <Expand v-else />
          </el-icon>
        </div>
        <div class="tabs-container">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-item', { active: tab.id === activeTabId }]"
            @click="switchTab(tab.id)"
          >
            <span class="tab-icon">🌐</span>
            <span class="tab-title">{{ tab.title || '新标签页' }}</span>
            <span class="tab-close" @click.stop="closeTab(tab.id)">×</span>
          </div>
          <div class="tab-new" @click="addNewTab">+</div>
          
        </div>
      </div>

      <div class="url-container">
        <div class="circle">
          <el-icon @click="goBack"><ArrowLeft /></el-icon>
        </div>
        <div class="circle">
          <el-icon @click="goForward"><ArrowRight /></el-icon>
        </div>
        <div class="circle" style="display:none">
          <el-button type="primary" @click="openInBrowser" class="url-button">
            打开
          </el-button>
        </div>
        <div class="circle">
          <el-icon @click="refresh" class="refresh-icon" :class="{ rotating: isRefreshing }"><Refresh /></el-icon>
        </div>
        <div class="url-input-container">
          <el-icon class="home-icon"><House /></el-icon>
          <input
            type="text"
            v-model="inputUrl"
            placeholder="请输入网址"
            @keyup.enter="loadUrl"
            class="url-input"
            @focus="selectAllText"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <el-icon class="favorite-icon" @click="favorite">
            <StarFilled v-if="isCurrentUrlFavorited" />
            <Star v-else />
          </el-icon>
        </div>
        <el-popover
          placement="bottom"
          :width="200"
          trigger="click"
          v-model:visible="popoverVisible"
        >
          <template #reference>
            <div class="circle">
              <el-icon><House /></el-icon>
            </div>
          </template>
          <el-table :data="homepageList">
            <el-table-column label="">
              <template #default="scope">
                <div @click="goToHomepage(scope.row.url)">
                  {{ scope.row.name }}
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-popover>
        <div
          class="collapse-button circle"
          :class="{ 'is-collapsed': isTableCollapsed }"
          @click="toggleTableCollapse"
          type="primary"
          v-if="collectDisplayPosition !== 'left'"
        >
          <el-icon><ArrowUp /></el-icon>
        </div>
        <div class="learn-button" v-if="collectDisplayPosition !== 'left'">
          <el-button type="primary" @click="collectUrl" class="url-button">
            所有url
          </el-button>
          <el-input
            v-model="searchKeyword"
            placeholder="请输入搜索关键词"
            class="search-input"
            size="large"
            style="width: 300px"
            @input="debouncedSearch"
            clearable
          >
          </el-input>
        </div>
        <div class="tab-settings" @click="showSettingsDialog" title="设置">
            <el-icon><Setting /></el-icon>
          </div>
      </div>

      <div class="url-content">
        <!-- 浏览器区域 -->
        <div class="webpage-container">
          <webview
            v-for="tab in tabs"
            :key="tab.viewId"
            :ref="(el: any) => { if (el) webviewRefs[tab.viewId] = el }"
            :src="tab.url"
            :class="['webview-item', { active: tab.id === activeTabId }]"
            style="width: 100%; height: 100%"
            allowpopups
            nodeintegration
            webpreferences="contextIsolation=false, nativeWindowOpen=false"
          ></webview>
        </div>
      </div>
    
    <!-- 底部收藏夹 -->
    <div v-if="collectDisplayPosition === 'bottom'" class="learnData-container">
      <div class="content-wrapper">
        <div class="table-container">
          <el-table
            :data="learnData"
            :height="tableHeight"
            v-loading="loading"
            :show-header="false"
            :row-class-name="rowClassName"
            @row-click="handleRowClick"
          >
            <el-table-column label="序号" width="80" fixed>
              <template #default="scope">
                {{ (currentPage - 1) * pageSize + scope.$index + 1 }}
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" />
            <el-table-column prop="url" label="URL" />
            <el-table-column label="操作" width="50">
              <template #default="scope">
                <div style="display: flex; gap: 10px">
                  <el-icon
                    style="cursor: pointer; color: #f56c6c; font-size: 20px;"
                    @click.stop="handleDelete(scope.row)"
                  >
                    <Delete />
                  </el-icon>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="form-container">
          <h3>新增学习内容</h3>
          <el-form :model="form">
            <el-form-item label="URL">
              <div style="display: flex; gap: 8px; width: 100%;">
                <el-input
                  type="textarea"
                  :rows="2"
                  v-model="form.url"
                  placeholder="请输入URL"
                  size="large"
                  clearable
                  style="flex: 1;"
                ></el-input>
                <el-button type="success" :loading="aiLoading" @click="aiParseUrl" style="height: 40px;">AI</el-button>
              </div>
            </el-form-item>
            <el-form-item label="标题">
              <el-input
                type="textarea"
                :rows="2"
                v-model="form.title"
                placeholder="请输入标题"
                size="large"
                clearable
              ></el-input>
            </el-form-item>
            
            <el-form-item>
              <el-button
                style="width: 100%"
                type="primary"
                size="large"
                @click="handleSubmit"
                >保存</el-button
              >
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div>
        <!-- 加载状态提示 -->
        <div class="load-status">
          <el-alert
            v-if="loading"
            title="正在加载中..."
            type="info"
            center
            :closable="false"
            show-icon
          />
        </div>

        <!-- 添加分页组件 -->
        <div class="pagination-container">
          <el-pagination
            background
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- 设置弹窗 -->
  <el-dialog
    v-model="settingsDialogVisible"
    title="收藏夹设置"
    width="400px"
    :close-on-click-modal="true"
  >
    <div class="settings-content">
      <div class="setting-item">
        <span class="setting-label">收藏夹显示位置:</span>
        <el-radio-group v-model="collectDisplayPosition" @change="saveCollectDisplayPosition">
          <el-radio label="left">左侧</el-radio>
          <el-radio label="bottom">底部</el-radio>
        </el-radio-group>
      </div>
      <div class="setting-tip">
        <el-alert
          title="提示"
          type="info"
          description="选择'左侧'后，收藏夹将以侧边栏形式显示在浏览器左侧"
          :closable="false"
          show-icon
        />
      </div>
    </div>
  </el-dialog>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
import { ElMessage, ElMessageBox } from 'element-plus'
import { debounce } from 'lodash'
import {
  Plus,
  Star,
  StarFilled,
  ArrowLeft,
  ArrowRight,
  Refresh,
  ArrowUp,
  Delete,
  House,
  Setting,
  Fold,
  Expand,
} from '@element-plus/icons-vue'
// editor ref removed - not used with current UI

// 类型定义
interface Tab {
  id: number
  viewId: string
  url: string
  title: string
}

interface HomepageItem {
  name: string
  url: string
}

interface LearnDataItem {
  id: number
  title: string
  url: string
  content?: string
}

interface Pagination {
  total: number
  current: number
  pageNum: number
  totalPages: number
}

interface FormData {
  title: string
  url: string
  content?: string
}

// 响应式数据
const tabs = ref<Tab[]>([])
const activeTabId = ref<number | null>(null)
const nextTabId = ref(1)
const webviewRefs = ref<Record<string, any>>({})
const inputUrl = ref('')
const learnData = ref<LearnDataItem[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const originalLearnData = ref<LearnDataItem[]>([])
const selectedRowId = ref<number | null>(null)
const currentPage = ref(1)
const pageSize = ref(50)
const popoverVisible = ref(false)
const isTableCollapsed = ref(false)
const isRefreshing = ref(false)
const aiLoading = ref(false)
const editor = ref<any>(null)
const collectDisplayPosition = ref<'left' | 'bottom'>('bottom')
const isLeftSidebarCollapsed = ref(false)
const settingsDialogVisible = ref(false)
const isCurrentUrlFavorited = ref(false)

const form = ref<FormData>({
  title: '',
  url: '',
  content: '',
})

const pagination = ref<Pagination>({
  total: 0,
  current: 1,
  pageNum: 10,
  totalPages: 0,
})

const homepageList = ref<HomepageItem[]>([
  { name: '抖音', url: 'https://www.douyin.com' },
  { name: '百度', url: 'https://www.baidu.com' },
  { name: '哔哩哔哩', url: 'https://www.bilibili.com' },
  { name: '闲鱼', url: 'https://www.goofish.com/' },
  { name: '豆包', url: 'https://www.doubao.com' },
  { name: '讯飞星火', url: 'https://xinghuo.xfyun.cn/' },
  { name: '淘宝', url: 'https://www.taobao.com' },
  { name: '必应', url: 'https://www.bing.com' },
  { name: 'deepseek', url: 'https://www.deepseek.com' },
  { name: 'csdn', url: 'https://bbs.csdn.net' },
  { name: 'claude', url: 'https://claude.ai/' },
  { name: 'chatgpt', url: 'https://chatgpt.com/' },
])

// 计算属性
const currentTab = computed<Tab>(() => {
  return tabs.value.find(tab => tab.id === activeTabId.value) || { id: 0, viewId: '', url: '', title: '' }
})

// 用于显示的 URL（过滤掉 about:blank）
const displayUrl = computed(() => {
  const url = currentTab.value.url
  return url === 'about:blank' ? '' : url
})

const tableHeight = computed(() => '100%')

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return learnData.value.slice(start, end)
})

// 获取 webview DOM 元素的辅助方法
const getWebviewElement = (viewId: string): any | null => {
  const webview = webviewRefs.value[viewId]
  if (!webview) return null
  // 在 Vue 3 中，ref 获取的可能是组件实例，需要通过 $el 获取 DOM 元素
  if (webview.$el) {
    return webview.$el
  }
  // 如果直接是 DOM 元素
  if (webview.tagName && webview.tagName.toLowerCase() === 'webview') {
    return webview
  }
  return null
}

// 获取当前活动的 webview DOM 元素
const getCurrentWebview = (): any | null => {
  const tab = currentTab.value
  if (tab && tab.viewId) {
    return getWebviewElement(tab.viewId)
  }
  return null
}

// 添加新标签页
const addNewTab = () => {
  const newTab: Tab = {
    id: nextTabId.value++,
    viewId: `urlView_${nextTabId.value}`,
    url: '',
    title: '新标签页',
  }
  tabs.value.push(newTab)
  switchTab(newTab.id)
}

// 添加带 URL 的新标签页
const addNewTabWithUrl = (url: string) => {
  const newTab: Tab = {
    id: nextTabId.value++,
    viewId: `urlView_${nextTabId.value}`,
    url: url,
    title: '加载中...',
  }
  tabs.value.push(newTab)
  switchTab(newTab.id)
  // 加载 URL
  loadUrl()
}

// 切换标签页
const switchTab = (tabId: number) => {
  if (activeTabId.value === tabId) return
  activeTabId.value = tabId
  
  // 同步输入框 URL
  const tab = tabs.value.find(t => t.id === tabId)
  inputUrl.value = tab?.url === 'about:blank' ? '' : (tab?.url || '')
  
  // 重置收藏状态
  isCurrentUrlFavorited.value = false
  
  // 延迟设置 webview 监听器，确保 DOM 已更新
  nextTick(() => {
    setupWebviewListeners()
  })
}

// 关闭标签页
const closeTab = (tabId: number) => {
  const tabIndex = tabs.value.findIndex(tab => tab.id === tabId)
  if (tabIndex === -1) return

  const tab = tabs.value[tabIndex]

  // 清除 webview 引用
  delete webviewRefs.value[tab.viewId]

  // 如果关闭的是当前标签页，切换到其他标签页
  if (tabId === activeTabId.value) {
    if (tabs.value.length > 1) {
      const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : tabIndex + 1
      if (newActiveIndex < tabs.value.length) {
        switchTab(tabs.value[newActiveIndex].id)
      }
    } else {
      activeTabId.value = null
    }
  }

  // 移除标签页
  tabs.value.splice(tabIndex, 1)

  // 如果没有标签页了，创建一个新的
  if (tabs.value.length === 0) {
    addNewTab()
  }
}

// 加载 URL
const loadUrl = () => {
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab || !inputUrl.value.trim()) return

  let processedUrl = inputUrl.value.trim()
  if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
    processedUrl = 'https://' + processedUrl
  }

  // 直接修改 tabs 数组中的数据，触发响应式更新
  tab.url = processedUrl
  inputUrl.value = processedUrl
  console.log('加载 URL:', processedUrl, 'tab:', tab)

  // 同时尝试直接操作 DOM 作为备选
  nextTick(() => {
    const webview = getCurrentWebview()
    console.log('nextTick webview:', webview)
    if (webview) {
      // 如果 webview 已经准备好（dom-ready），使用 loadURL
      if (webview.loadURL) {
        webview.loadURL(processedUrl)
        console.log('使用 loadURL 加载:', processedUrl)
      } else {
        // 否则直接设置 src
        webview.src = processedUrl
        console.log('直接设置 src:', processedUrl)
      }
    } else {
      console.warn('未找到 webview 元素')
    }
  })
}

// 后退
const goBack = () => {
  const webview = getCurrentWebview()
  if (webview && webview.canGoBack && webview.canGoBack()) {
    webview.goBack()
  }
}

// 前进
const goForward = () => {
  const webview = getCurrentWebview()
  if (webview && webview.canGoForward && webview.canGoForward()) {
    webview.goForward()
  }
}

// 刷新
const refresh = () => {
  isRefreshing.value = true
  loadUrl()
  setTimeout(() => {
    isRefreshing.value = false
  }, 2000)
}

// 在外部浏览器打开
const openInBrowser = () => {
  if (!currentTab.value.url) {
    ElMessage.warning('请先输入URL')
    return
  }

  let processedUrl = currentTab.value.url
  if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
    processedUrl = 'https://' + processedUrl
  }

  window.open(processedUrl, '_blank')
}

// 获取容器的位置和尺寸（保留用于兼容性）
const getContainerBounds = () => {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }
}

// 获取学习数据
const fetchLearnData = async () => {
  loading.value = true
  const params = {
    page: currentPage.value,
    pageNum: pageSize.value,
    conditions: {},
  }

  try {
    const res = await window.electronAPI.getCollectList(params)
    if (!res?.list) {
      throw new Error('数据格式错误')
    }
    originalLearnData.value = res.list
    learnData.value = [...originalLearnData.value]
    pagination.value = {
      total: res.pagination.total,
      current: res.pagination.current,
      pageNum: res.pagination.pageNum,
      totalPages: res.pagination.totalPages,
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 显示添加对话框
const showAddDialog = () => {
  form.value = {
    title: '',
    url: '',
    content: '',
  }
  nextTick(() => {
    if (!editor.value) {
      const editorContainer = document.querySelector('.editor-container') as HTMLElement
      if (editorContainer) {
        editor.value = new WangEditor(editorContainer)
        editor.value.config.uploadImgShowBase64 = true
        editor.value.create()
      }
    } else {
      editor.value.txt.html('')
    }
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!form.value.title || !form.value.url) {
    ElMessage.error('请填写完整信息')
    return
  }
  try {
    const params = {
      title: form.value.title,
      url: form.value.url,
    }

    const res = await window.electronAPI.addCollect(params)

    form.value = {
      title: '',
      url: '',
    }

    fetchLearnData()
    if (res) {
      ElMessage.success('保存成功')
      isCurrentUrlFavorited.value = true
    } else {
      ElMessage.error('保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败，请稍后重试')
  }
}

// 处理行点击
const handleRowClick = (row: LearnDataItem) => {
  selectedRowId.value = row.id
  if (!row.url && row.content) {
    form.value = {
      title: row.title,
      url: row.url,
      content: row.content,
    }

    nextTick(() => {
      if (!editor.value) {
        const editorContainer = document.querySelector('.editor-container') as HTMLElement
        if (editorContainer) {
          editor.value = new WangEditor(editorContainer)
          editor.value.config.uploadImgShowBase64 = true
          editor.value.create()
        }
      }
      if (editor.value && row.content) {
        editor.value.txt.html(row.content)
      }
    })
  } else {
    currentTab.value.url = row.url
    loadUrl()
  }
}

// 处理行类名
const rowClassName = ({ row }: { row: LearnDataItem }) => {
  return row.id === selectedRowId.value ? 'selected-row' : ''
}

// 收藏
const favorite = () => {
  if (isTableCollapsed.value) {
    toggleTableCollapse()
  }
  form.value.url = currentTab.value.url
  fetchUrlTitle()
}

// 获取 URL 标题
const fetchUrlTitle = async () => {
  if (!currentTab.value.url) {
    ElMessage.warning('请先输入URL')
    return
  }

  try {
    const response = await window.electronAPI.fetchCollectUrlTitle(currentTab.value.url)

    if (response.code === 200 && response.result) {
      form.value.title = response.result.title
      handleSubmit()
    } else {
      ElMessage.warning('未能获取到标题，请手动输入')
    }
  } catch (error) {
    console.error('获取标题失败:', error)
    ElMessage.warning('获取标题失败，请手动输入')
  }
}

// 收集 URL
const collectUrl = () => {
  currentPage.value = 1
  fetchLearnData()
}

// 搜索
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    fetchLearnData()
    return
  }
  currentPage.value = 1
  learnData.value = []
  loading.value = true

  try {
    const keyword = searchKeyword.value.trim()
    const res = await window.electronAPI.getCollectList({
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {
        title: keyword,
      },
    })
    console.log('搜索结果:', res)
    if (res?.list) {
      learnData.value = res.list
      pagination.value = {
        total: res.pagination.total,
        current: res.pagination.current,
        pageNum: res.pagination.pageNum,
        totalPages: res.pagination.totalPages,
      }
    }
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 防抖搜索
const debouncedSearch = debounce(handleSearch, 300)

// 删除
const handleDelete = async (row: LearnDataItem) => {
  try {
    const result = await ElMessageBox.confirm('确认要删除这条记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    if (result === 'confirm') {
      const success = await window.electronAPI.deleteCollect(row.id)
      if (success) {
        ElMessage.success('删除成功')
        fetchLearnData()
      } else {
        ElMessage.error('删除异常')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }
}

// 分页大小变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchLearnData()
}

// 分页页码变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchLearnData()
}

// 跳转到主页
const goToHomepage = (site: string) => {
  currentTab.value.url = site
  loadUrl()
  popoverVisible.value = false
}

// 切换表格折叠
const toggleTableCollapse = () => {
  isTableCollapsed.value = !isTableCollapsed.value
}

// 显示设置弹窗
const showSettingsDialog = () => {
  settingsDialogVisible.value = true
}

// 保存收藏夹显示位置设置
const saveCollectDisplayPosition = () => {
  localStorage.setItem('collectDisplayPosition', collectDisplayPosition.value)
  ElMessage.success('设置已保存')
  settingsDialogVisible.value = false
}

// 处理 URL 输入
const handleUrlInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // 更新当前标签页的 URL
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (tab) {
    tab.url = value
  }
}

// 全选文本
const selectAllText = () => {
  setTimeout(() => {
    const input = document.querySelector('.url-input') as HTMLInputElement
    if (input && typeof input.select === 'function') {
      input.select()
    }
  }, 100)
}

// 设置 webview 事件监听
const setupWebviewListeners = () => {
  tabs.value.forEach(tab => {
    const webview = getWebviewElement(tab.viewId)
    if (webview && !webview._hasListeners) {
      webview._hasListeners = true

      // 监听页面标题变化
      webview.addEventListener('page-title-updated', (event: any) => {
        tab.title = event.title || tab.title
      })

      // 监听导航完成
      webview.addEventListener('did-finish-load', () => {
        const url = webview.getURL()
        tab.url = url
      })

      // 监听 URL 变化
      webview.addEventListener('did-navigate', (event: any) => {
        tab.url = event.url
      })

      // 监听新窗口打开 - 在新标签页打开
      webview.addEventListener('new-window', (event: any) => {
        event.preventDefault()
        console.log('new-window event:', event.url)
        // 创建新标签页并打开链接
        const newTab: Tab = {
          id: nextTabId.value++,
          viewId: `urlView_${nextTabId.value}`,
          url: event.url,
          title: '新标签页',
        }
        tabs.value.push(newTab)
        switchTab(newTab.id)
      })

      // 监听页面内链接点击（target="_blank"）
      webview.addEventListener('will-navigate', (event: any) => {
        // 只在 URL 真正改变时更新
        if (event.url && event.url !== tab.url) {
          console.log('will-navigate event:', event.url)
          tab.url = event.url
        }
      })

      // 页面加载完成后，注入脚本拦截 target="_blank" 链接
      webview.addEventListener('dom-ready', () => {
        const script = `
          if (!window._linkInterceptorInstalled) {
            window._linkInterceptorInstalled = true;
            document.addEventListener('click', (e) => {
              const link = e.target.closest('a');
              if (link && link.target === '_blank' && link.href) {
                e.preventDefault();
                e.stopPropagation();
                // 发送消息给父窗口，请求在新标签页打开
                if (window.require) {
                  const { ipcRenderer } = window.require('electron');
                  ipcRenderer.sendToHost('open-in-new-tab', link.href);
                }
                return false;
              }
            }, true);
          }
        `;
        try {
          webview.executeJavaScript(script);
        } catch (err) {
          console.error('Failed to inject script:', err);
        }
      })

      // 使用标志位防止重复处理 ipc-message
      webview._ipcMessageHandlerInstalled = true
      webview.addEventListener('ipc-message', (event: any) => {
        if (event.channel === 'open-in-new-tab') {
          const url = event.args[0];
          console.log('ipc-message open-in-new-tab:', url);
          const newTab: Tab = {
            id: nextTabId.value++,
            viewId: `urlView_${nextTabId.value}`,
            url: url,
            title: '新标签页',
          }
          tabs.value.push(newTab)
          switchTab(newTab.id)
        }
      })
    }
  })
}

// AI 解析 URL 标题
const aiParseUrl = async () => {
  if (!form.value.url) {
    ElMessage.warning('请先输入URL')
    return
  }

  aiLoading.value = true
  try {
    const prompt = `请访问以下链接，获取网页标题。
返回格式要求：直接返回一个JSON对象，包含url和title两个字段。
链接: ${form.value.url}`

    // 使用已有的 AI 提取关键词接口（非流式调用）来解析URL标题
    const result = await window.electronAPI.extractKeywords({
      paragraph: prompt,
      providerOrder: ['deepseekLocal', 'modelspace', 'deepseek'],
    })

    console.log('AI解析结果:', result)
    if (result.success && result.keywords) {
      // 尝试从AI返回结果中解析标题
      try {
        const jsonMatch = result.keywords.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.title) {
            form.value.title = parsed.title
            ElMessage.success('标题解析成功')
          } else {
            ElMessage.warning('未能解析到标题')
          }
        } else {
          // 如果不是JSON，直接用返回的文本作为标题
          form.value.title = result.keywords.trim().substring(0, 200)
          ElMessage.success('标题解析成功')
        }
      } catch {
        // JSON 解析失败，直接用返回的文本
        form.value.title = result.keywords.trim().substring(0, 200)
        ElMessage.success('标题解析成功')
      }
    } else {
      ElMessage.error(result.error || 'AI解析失败')
    }
  } catch (error) {
    console.error('AI解析失败:', error)
    ElMessage.error('AI解析失败，请稍后重试')
  } finally {
    aiLoading.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  // 从 localStorage 读取收藏夹显示位置设置
  const savedPosition = localStorage.getItem('collectDisplayPosition')
  if (savedPosition && (savedPosition === 'left' || savedPosition === 'bottom')) {
    collectDisplayPosition.value = savedPosition
  }
  
  // 创建第一个标签页
  addNewTab()

  // 为每个 webview 添加事件监听
  nextTick(() => {
    setupWebviewListeners()
  })
  
  // 处理从 Project 页面传递过来的 URL 参数
  handleRouteUrlParam()
})

// 处理路由 URL 参数
const handleRouteUrlParam = () => {
  const urlParam = route.query.url as string
  if (urlParam) {
    const decodedUrl = decodeURIComponent(urlParam)
    // 在新标签页打开网址
    addNewTabWithUrl(decodedUrl)
    // 清除 URL 参数，避免刷新时重复打开
    router.replace({ path: '/collect', query: {} })
  }
}

// 监听路由变化
watch(() => route.query.url, (newUrl) => {
  if (newUrl) {
    handleRouteUrlParam()
  }
})

onBeforeUnmount(() => {
  // 清理 webview 引用
  webviewRefs.value = {}

  if (editor.value) {
    editor.value.destroy()
    editor.value = null
  }
})

// 初始化数据
fetchLearnData()
</script>

<style scoped>
/* 外层包装器 */
.browser-wrapper {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* 全局左侧边栏 */
.global-left-sidebar {
  width: 390px;
  flex-shrink: 0;
  border-right: 1px solid #ebeef5;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.url-left-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.url-left-header {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fff;
}

.url-left-header .search-input {
  flex: 1;
}

.url-left-header .el-button {
  height: 32px;
  padding: 0 16px;
}

.url-left-table {
  flex: 1;
  overflow: hidden;
  padding: 10px;
}

.url-left-pagination {
  padding: 10px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
}

.url-left-form {
  padding: 20px 16px;
  border-top: 1px solid #e8e4df;
  background-color: #faf8f5;
  flex-shrink: 0;
}

.form-title {
  margin: 0 0 16px 0;
  padding-left: 12px;
  color: #3d3d3a;
  font-size: 18px;
  font-weight: 600;
  border-left: 4px solid #8b9a6d;
}

.compact-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.compact-form :deep(.el-form-item__label) {
  line-height: 40px;
  font-size: 15px;
  color: #6c6a64;
  font-weight: 500;
}

.compact-form.horizontal-item :deep(.el-form-item__content) {
  flex: 1;
}

.input-button-group {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.input-button-group .url-input {
  flex: 1;
}

.ai-btn {
  height: 40px;
  padding: 0 20px;
  font-weight: 500;
  font-size: 15px;
  border-radius: 10px;
}

.submit-item {
  margin-top: 8px;
  margin-bottom: 0 !important;
}

.submit-item :deep(.el-form-item__content) {
  margin-left: 60px !important;
}

.submit-btn {
  width: 100%;
  height: 40px;
  font-weight: 500;
  font-size: 15px;
  border-radius: 10px;
}

.browser-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}

/* 标签页栏样式 */
.tabs-bar {
  background: #f1f3f4;
  height: 40px;
  display: flex;
  align-items: flex-end;
  padding: 0 8px;
  user-select: none;
}

/* 左侧折叠按钮样式 */
.sidebar-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-right: 8px;
  margin-bottom: 6px;
  border-radius: 4px;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
}

.sidebar-toggle-btn:hover {
  background: #e4e7ed;
  color: #409eff;
}

.tabs-container {
  display: flex;
  align-items: flex-end;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
}

.tabs-container::-webkit-scrollbar {
  height: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  height: 32px;
  min-width: 120px;
  max-width: 240px;
  padding: 0 12px;
  margin-right: 4px;
  background: #e8eaed;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  border: 1px solid #dadce0;
  border-bottom: none;
}

.tab-item:hover {
  background: #dee1e6;
}

.tab-item.active {
  background: #fff;
  border-color: #dadce0;
  height: 36px;
}

.tab-icon {
  font-size: 16px;
  margin-right: 8px;
  flex-shrink: 0;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #5f6368;
}

.tab-item.active .tab-title {
  color: #202124;
  font-weight: 500;
}

.tab-close {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  font-size: 18px;
  color: #5f6368;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.tab-close:hover {
  background: #dadce0;
  color: #202124;
}

.tab-new {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  color: #5f6368;
  border-radius: 50%;
  transition: background-color 0.2s;
  margin-left: 4px;
  flex-shrink: 0;
}

.tab-new:hover {
  background: #e8eaed;
}

.tab-settings {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  color: #5f6368;
  border-radius: 50%;
  transition: background-color 0.2s;
  margin-left: 4px;
  flex-shrink: 0;
}

.tab-settings:hover {
  background: #e8eaed;
  color: #409eff;
}

.url-container {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 20px;
  border-bottom: 1px solid #ebeef5;
}

.url-button {
  flex-shrink: 0;
  height: 40px;
  padding: 0 15px;
}

.webpage-container {
  flex: 1;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.webview-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  visibility: hidden;
}

.webview-item.active {
  visibility: visible;
}

.webpage-frame {
  width: 100%;
  height: 100%;
}

/* 主内容区域布局 */
.url-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

/* 左侧边栏样式（已废弃，保留兼容性） */
.left-sidebar {
  width: 390px;
  flex-shrink: 0;
  border-right: 1px solid #ebeef5;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-table-container {
  flex: 1;
  overflow: hidden;
  padding: 10px;
}

.sidebar-pagination {
  padding: 10px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
}

.learnData-container {
  border-top: 1px solid #ebeef5;
  height: v-bind('isTableCollapsed ? "0px" : "360px"');
  transition: height 0.3s ease;
  border-radius: 4px;
  background-color: #fff;
}

/* 设置弹窗样式 */
.settings-content {
  padding: 10px 0;
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.setting-label {
  font-size: 14px;
  color: #606266;
  margin-right: 16px;
  white-space: nowrap;
}

.setting-tip {
  margin-top: 10px;
  overflow: hidden;
}

:deep(.el-table__row) {
  height: auto !important;
  max-height: 80px !important;
  line-height: 1.5 !important;
  cursor: pointer;
  font-size: 20px !important;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.w-e-text-container) {
  height: 100% !important;
}

:deep(.w-e-scroll) {
  height: 100% !important;
  overflow-y: auto !important;
}

:deep(.el-button + .el-button) {
  margin: 0px;
}

:deep(.el-dialog__header) {
  padding: 20px;
  background-color: #409eff;
  margin-right: 0;
}

:deep(.el-dialog__title) {
  color: white;
  font-size: 20px;
  font-weight: bold;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
}

:deep(.el-dialog__body) {
  padding: 30px 20px;
}

:deep(.el-dialog__footer) {
  padding: 20px;
  border-top: 1px solid #dcdfe6;
}

.content-wrapper {
  display: flex;
  height: 86%;
}

.table-container {
  flex: 1;
  height: 100%;
  padding: 10px;
}

.form-container {
  width: 500px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.form-container h3 {
  margin-bottom: 20px;
  color: #303133;
  font-size: 18px;
}

.load-status {
  margin-top: 10px;
}

:deep(.el-table) {
  border-radius: 4px;
  overflow: hidden;
  box-shadow: none !important;
}

:deep(.el-table__body-wrapper) {
  overflow-y: auto;
}

:deep(.el-alert) {
  margin-bottom: 10px;
}

/* 优化滚动条样式 */
:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 6px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  background: #dcdfe6;
  border-radius: 3px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
  background: #f5f7fa;
}

/* 添加编辑器容器样式 */
.editor-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* 修改编辑器相关样式 */
:deep(.w-e-toolbar) {
  flex-shrink: 0;
}

:deep(.w-e-text-container) {
  flex: 1;
  height: auto !important;
}

:deep(.w-e-scroll) {
  height: 100% !important;
  overflow-y: auto !important;
}

.dialog-footer {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 10px;
}

:deep(.el-table__row.selected-row) {
  background-color: #e6f1fc !important;
  font-weight: 600;
}

/* 添加单元格内容的样式 */
:deep(.el-table .cell) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
  line-height: 1.5;
}

.pagination-container {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.collapse-button {
  flex-shrink: 0;
  height: 40px;
  transition: transform 0.3s;
}

.collapse-button.is-collapsed {
  transform: rotate(180deg);
}

/* 刷新图标旋转动画 */
.refresh-icon {
  cursor: pointer;
  font-size: 18px;
  transition: transform 0.3s ease;
}

.refresh-icon.rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 添加表格收缩动画 */
:deep(.el-table) {
  transition: max-height 0.3s ease;
}

/* URL输入框容器样式 */
.url-input-container {
  display: flex;
  align-items: center;
  background-color: #EDF2FA;
  border-radius: 20px;
  padding: 0 10px;
  height: 40px;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
}

.url-input-container:hover {
  background-color: rgb(227, 230, 235);
}

.url-input-container:focus-within {
  background-color: #fff !important;
  border: 2px solid #409eff;
}

.home-icon,
.favorite-icon {
  cursor: pointer;
  font-size: 25px;
  color: #606266;
  padding: 0 5px;
}

.home-icon:hover,
.favorite-icon:hover {
  color: #409eff;
}

/* 调整内部input样式 */
.url-input {
  background-color: transparent;
  border: none;
  height: 100%;
  font-size: 14px;
  outline: none;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
}

.url-input::placeholder {
  color: #909399;
}

/* 确保输入框右侧的访问按钮也有匹配的样式 */
.url-container > div {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
}

/* 图标悬停时的圆形灰色背景 */
.url-container > .circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.url-container > .circle:hover {
  background-color: #f0f0f0;
}

/* 单独为URL输入框内的图标设置样式 */
.url-input-container .home-icon,
.url-input-container .favorite-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.url-input-container .home-icon:hover,
.url-input-container .favorite-icon:hover {
  background-color: #f0f0f0;
}

.learn-button {
  display: flex;
  align-items: center;
  gap: 10px;
}

:deep(.el-table .el-table__cell) {
  z-index: 0 !important;
}

.el-table--border .el-table__inner-wrapper:after,
.el-table--border:after,
.el-table--border:before,
.el-table__inner-wrapper:before {
  z-index: 0 !important;
}
</style>

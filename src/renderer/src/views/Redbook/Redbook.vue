<template>
  <div class="redbook-container">
    <div class="header">
      <div class="header-actions">
        <el-button type="warning" @click="showAuthModal = true">
          <el-icon><Key /></el-icon>
          授权管理
        </el-button>
        <el-button type="info" @click="openSubscriptionsModal">
          <el-icon><List /></el-icon>
          博主列表
        </el-button>
        <el-button type="primary" @click="handleQueryNotes">
          <el-icon><Search /></el-icon>
          查询笔记
        </el-button>
        <el-button type="success" @click="batchCrawlNotes" :loading="batchCrawling">
          <el-icon><Refresh /></el-icon>
          批量爬取
        </el-button>
      </div>
    </div>

    <!-- 笔记列表 -->
    <el-table
      :data="notes"
      v-loading="loadingNotes"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column label="封面" width="100" align="center">
        <template #default="{ row }">
          <img :src="row.cover" :alt="row.title" class="table-img" @click="showImagePreview(row.cover)" />
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="300" show-overflow-tooltip />
      <el-table-column label="链接" min-width="200">
        <template #default="{ row }">
          <el-link type="primary" @click="copyToClipboard(row.url)" :underline="false">
            {{ row.url }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="author_name" label="博主" width="150" show-overflow-tooltip />
      <el-table-column prop="likes" label="点赞数" width="150" align="center" />
      <el-table-column label="发布时间" width="200">
        <template #default="{ row }">
          {{ formatTime(row.publish_time) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openNote(row.url)">
            <el-icon><View /></el-icon>查看
          </el-button>
          <el-button type="warning" link @click="collectNote(row)">
            <el-icon><Star /></el-icon>收藏
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container" v-if="noteTotal > 0">
      <el-pagination
        background
        v-model:current-page="notePage"
        v-model:page-size="notePageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="noteTotal"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleNoteSizeChange"
        @current-change="handleNotePageChange"
      />
    </div>

    <!-- 博主列表弹窗 -->
    <el-dialog
      v-model="showSubscriptionsModal"
      title="博主管理"
      width="90%"
    >
      <div class="subscription-content">
        <!-- 左侧：添加博主表单 -->
        <div class="subscription-form">
          <h3 style="margin-top: 0;">添加博主</h3>
          <el-form :model="form" label-width="120px">
            <el-form-item label="博主名称" required>
              <el-input v-model="form.author_name" placeholder="请输入博主名称" />
            </el-form-item>

            <el-form-item label="博主ID" required>
              <el-input v-model="form.author_id" placeholder="请输入博主ID" />
            </el-form-item>

            <el-form-item label="头像URL">
              <el-input v-model="form.avatar" placeholder="请输入头像URL" />
              <el-avatar v-if="form.avatar" :src="form.avatar" :size="60" style="margin-top: 10px" />
            </el-form-item>

            <el-form-item label="简介">
              <el-input
                v-model="form.intro"
                type="textarea"
                placeholder="请输入博主简介"
                :rows="3"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleAddSubscription" :loading="submitting">
                确定添加
              </el-button>
              <el-button @click="resetForm">
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 中间虚线分隔 -->
        <div class="divider-vertical"></div>

        <!-- 右侧：博主列表 -->
        <div class="subscription-list">
          <h3 style="margin-top: 0;">博主列表</h3>
          <el-table
            :data="subscriptions"
            v-loading="loading"
            stripe
            style="width: 100%;"
            max-height="500"
          >
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="author_name" label="博主名称" min-width="150" />
            <el-table-column label="添加时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="320" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="crawlNotes(row.id)">
                  爬取
                </el-button>
                <el-button size="small" @click="viewAuthorNotes(row.id)">
                  查看
                </el-button>
                <el-button type="warning" size="small" @click="openEditSubscription(row)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteSubscription(row.id)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="subscriptions.length === 0 && !loading" description="暂无订阅，请添加博主" />

          <!-- 博主分页 -->
          <div class="pagination-container" v-if="total > 0" style="margin-top: 20px;">
            <el-pagination
              background
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 授权管理弹窗 -->
    <el-dialog
      v-model="showAuthModal"
      title="授权管理"
      width="600px"
    >
      <div class="auth-container">
        <el-alert
          v-if="authStatus.authorized"
          title="已授权"
          type="success"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <div>授权有效期剩余: {{ formatExpireTime(authStatus.expires_in) }}</div>
          </template>
        </el-alert>

        <el-alert
          v-else
          title="未授权"
          type="warning"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <div>需要授权才能使用搜索和爬取功能</div>
          </template>
        </el-alert>

        <el-form :model="authForm" label-width="100px" size="large">
          <el-form-item label="Cookie">
            <el-input
              v-model="authForm.cookie"
              type="textarea"
              :rows="4"
              placeholder="请输入小红书的Cookie"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSaveAuth" :loading="savingAuth">
              保存授权
            </el-button>
            <el-button @click="handleClearAuth" :loading="clearingAuth">
              清除授权
            </el-button>
          </el-form-item>
        </el-form>

        <el-divider />

        <div class="auth-help">
          <h4>如何获取Cookie？</h4>
          <ol>
            <li>打开浏览器，访问 <a href="https://www.xiaohongshu.com" target="_blank">小红书网页版</a></li>
            <li>登录你的小红书账号</li>
            <li>按F12打开开发者工具</li>
            <li>切换到Network（网络）标签</li>
            <li>刷新页面，找到任意请求</li>
            <li>在请求头中找到Cookie，复制完整的Cookie值</li>
          </ol>
        </div>
      </div>
    </el-dialog>

    <!-- 单个博主笔记列表弹窗 -->
    <el-dialog
      v-model="showAuthorNotesModal"
      title="博主笔记列表"
      width="90%"
    >
      <el-table :data="authorNotes" v-loading="loadingAuthorNotes" max-height="500">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.publish_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="openNote(row.url)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 编辑博主弹窗 -->
    <el-dialog
      v-model="showEditModal"
      title="编辑博主"
      width="600px"
    >
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="博主名称" required>
          <el-input v-model="editForm.author_name" placeholder="请输入博主名称" />
        </el-form-item>
        <el-form-item label="博主ID" required>
          <el-input v-model="editForm.author_id" placeholder="请输入博主ID" />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="editForm.avatar" placeholder="请输入头像URL" />
          <el-avatar v-if="editForm.avatar" :src="editForm.avatar" :size="60" style="margin-top: 10px" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.intro" type="textarea" placeholder="请输入博主简介" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handleEditSubscription" :loading="editing">确定</el-button>
      </template>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="imagePreviewVisible" width="800px" :show-close="true">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img :src="previewImageUrl" alt="预览图片" style="max-height: 600px; max-width: 100%; object-fit: contain;" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Key, Search, Refresh, List, View, Star } from '@element-plus/icons-vue'
import request from '@/utils/request'

// 假数据
const mockNotes = [
  {
    id: 1,
    title: '超好用的护肤品分享！敏感肌必看',
    cover: 'https://picsum.photos/200/200?random=1',
    url: 'https://www.xiaohongshu.com/explore/123456',
    author_name: '美妆小达人',
    likes: 1234,
    publish_time: '2024-03-10 10:30:00'
  },
  {
    id: 2,
    title: '成都三日游攻略｜人均500玩转成都',
    cover: 'https://picsum.photos/200/200?random=2',
    url: 'https://www.xiaohongshu.com/explore/234567',
    author_name: '旅行日记',
    likes: 5678,
    publish_time: '2024-03-09 15:20:00'
  },
  {
    id: 3,
    title: '减肥餐食谱｜一周瘦5斤不是梦',
    cover: 'https://picsum.photos/200/200?random=3',
    url: 'https://www.xiaohongshu.com/explore/345678',
    author_name: '健康生活家',
    likes: 3456,
    publish_time: '2024-03-08 09:15:00'
  },
  {
    id: 4,
    title: 'OOTD｜春季穿搭灵感分享',
    cover: 'https://picsum.photos/200/200?random=4',
    url: 'https://www.xiaohongshu.com/explore/456789',
    author_name: '时尚博主',
    likes: 8901,
    publish_time: '2024-03-07 14:45:00'
  },
  {
    id: 5,
    title: '家居好物推荐｜提升幸福感的小物件',
    cover: 'https://picsum.photos/200/200?random=5',
    url: 'https://www.xiaohongshu.com/explore/567890',
    author_name: '居家达人',
    likes: 2345,
    publish_time: '2024-03-06 11:30:00'
  }
]

const mockSubscriptions = [
  {
    id: 1,
    author_name: '美妆小达人',
    author_id: 'user123',
    avatar: 'https://picsum.photos/100/100?random=10',
    intro: '专注美妆护肤分享',
    created_at: '2024-03-01 10:00:00'
  },
  {
    id: 2,
    author_name: '旅行日记',
    author_id: 'user456',
    avatar: 'https://picsum.photos/100/100?random=11',
    intro: '带你看遍世界美景',
    created_at: '2024-03-02 11:00:00'
  },
  {
    id: 3,
    author_name: '健康生活家',
    author_id: 'user789',
    avatar: 'https://picsum.photos/100/100?random=12',
    intro: '健康饮食，快乐生活',
    created_at: '2024-03-03 12:00:00'
  }
]

// 数据
const subscriptions = ref([])
const notes = ref([])
const authorNotes = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const noteTotal = ref(0)
const notePage = ref(1)
const notePageSize = ref(20)
const showAuthModal = ref(false)
const showSubscriptionsModal = ref(false)
const showAuthorNotesModal = ref(false)
const showEditModal = ref(false)
const editing = ref(false)
const editForm = ref({ id: '', author_name: '', author_id: '', avatar: '', intro: '' })
const loading = ref(false)
const loadingNotes = ref(false)
const loadingAuthorNotes = ref(false)
const submitting = ref(false)
const savingAuth = ref(false)
const clearingAuth = ref(false)
const batchCrawling = ref(false)
const currentAuthorId = ref('')
const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')

const tableHeight = 'calc(100vh - 230px)'

// 授权状态
const authStatus = ref({
  authorized: false,
  expires_in: 0
})

// 授权表单
const authForm = ref({
  cookie: ''
})

// 表单数据
const form = ref({
  author_name: '',
  author_id: '',
  avatar: '',
  intro: ''
})

// 获取授权状态
const getAuthStatus = async () => {
  // 使用假数据
  authStatus.value = {
    authorized: true,
    expires_in: 86400
  }
}

// 保存授权
const handleSaveAuth = async () => {
  if (!authForm.value.cookie) {
    ElMessage.warning('请填写Cookie')
    return
  }

  savingAuth.value = true
  setTimeout(() => {
    ElMessage.success('授权保存成功')
    getAuthStatus()
    showAuthModal.value = false
    savingAuth.value = false
  }, 1000)
}

// 清除授权
const handleClearAuth = async () => {
  try {
    await ElMessageBox.confirm('确定要清除授权信息吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    clearingAuth.value = true
    setTimeout(() => {
      ElMessage.success('授权已清除')
      authForm.value.cookie = ''
      getAuthStatus()
      clearingAuth.value = false
    }, 1000)
  } catch (error) {
    // 用户取消
  }
}

// 格式化过期时间
const formatExpireTime = (seconds) => {
  if (!seconds || seconds <= 0) return '已过期'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

// 获取订阅列表
const getSubscriptions = async () => {
  loading.value = true
  setTimeout(() => {
    subscriptions.value = mockSubscriptions
    total.value = mockSubscriptions.length
    loading.value = false
  }, 500)
}

// 打开博主管理弹窗
const openSubscriptionsModal = () => {
  showSubscriptionsModal.value = true
  getSubscriptions()
}

// 查询笔记列表
const handleQueryNotes = async () => {
  loadingNotes.value = true
  setTimeout(() => {
    notes.value = mockNotes
    noteTotal.value = mockNotes.length
    loadingNotes.value = false
  }, 500)
}

// 获取所有笔记列表
const getAllNotes = async () => {
  loadingNotes.value = true
  setTimeout(() => {
    notes.value = mockNotes
    noteTotal.value = mockNotes.length
    loadingNotes.value = false
  }, 500)
}

// 添加订阅
const handleAddSubscription = async () => {
  if (!form.value.author_name || !form.value.author_id) {
    ElMessage.warning('请填写必填项')
    return
  }

  submitting.value = true
  setTimeout(() => {
    ElMessage.success('添加成功')
    resetForm()
    getSubscriptions()
    submitting.value = false
  }, 1000)
}

// 删除订阅
const deleteSubscription = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个订阅吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    ElMessage.success('删除成功')
    getSubscriptions()
  } catch (error) {
    // 用户取消
  }
}

// 打开编辑博主弹窗
const openEditSubscription = (row) => {
  editForm.value = {
    id: row.id,
    author_name: row.author_name || '',
    author_id: row.author_id || '',
    avatar: row.avatar || '',
    intro: row.intro || ''
  }
  showEditModal.value = true
}

// 保存编辑
const handleEditSubscription = async () => {
  if (!editForm.value.author_name || !editForm.value.author_id) {
    ElMessage.warning('请填写必填项')
    return
  }
  editing.value = true
  setTimeout(() => {
    ElMessage.success('编辑成功')
    showEditModal.value = false
    getSubscriptions()
    editing.value = false
  }, 1000)
}

// 爬取笔记
const crawlNotes = async (authorId) => {
  const loading = ElMessage({
    message: '正在爬取笔记...',
    duration: 0,
    type: 'info'
  })

  setTimeout(() => {
    loading.close()
    ElMessage.success('爬取成功，共5篇笔记')
  }, 2000)
}

// 批量爬取笔记
const batchCrawlNotes = async () => {
  batchCrawling.value = true
  ElMessage.info('开始批量爬取...')

  setTimeout(() => {
    ElMessage.success('批量爬取完成！成功: 3，失败: 0')
    handleQueryNotes()
    batchCrawling.value = false
  }, 3000)
}

// 查看单个博主的笔记
const viewAuthorNotes = async (authorId) => {
  currentAuthorId.value = authorId
  showAuthorNotesModal.value = true
  loadingAuthorNotes.value = true

  setTimeout(() => {
    authorNotes.value = mockNotes.slice(0, 3)
    loadingAuthorNotes.value = false
  }, 500)
}

// 打开笔记
const openNote = (url) => {
  window.open(url, '_blank')
}

// 收藏笔记
const collectNote = async (row) => {
  try {
    const res = await request.post('http://localhost:8000/api/collect/add', {
      title: row.title,
      url: row.url
    })
    if (res.code === 200) {
      ElMessage.success('收藏成功')
    }
  } catch (e) {
    ElMessage.error(e.message || '收藏失败')
  }
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
    console.error(error)
  }
}

// 显示图片预览
const showImagePreview = (imageUrl) => {
  previewImageUrl.value = imageUrl
  imagePreviewVisible.value = true
}

// 重置表单
const resetForm = () => {
  form.value = {
    author_name: '',
    author_id: '',
    avatar: '',
    intro: ''
  }
}

// 博主分页
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  getSubscriptions()
}

const handlePageChange = (page) => {
  currentPage.value = page
  getSubscriptions()
}

// 笔记分页
const handleNoteSizeChange = (size) => {
  notePageSize.value = size
  notePage.value = 1
  handleQueryNotes()
}

const handleNotePageChange = (page) => {
  notePage.value = page
  handleQueryNotes()
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  return time
}

// 初始化
onMounted(() => {
  getAllNotes()
  getAuthStatus()
})
</script>

<style scoped>
.redbook-container {
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
  padding: 0 20px;
  height: 60px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header .el-button--primary {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  color: #fff;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.header .el-button--primary:hover {
  background-color: #7a895c;
  border-color: #7a895c;
}

.header .el-button--success {
  background-color: #5db872;
  border-color: #5db872;
  color: #fff;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.header .el-button--success:hover {
  background-color: #4da862;
  border-color: #4da862;
}

.header .el-button--warning {
  background-color: #c4a882;
  border-color: #c4a882;
  color: #fff;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.header .el-button--warning:hover {
  background-color: #b59872;
  border-color: #b59872;
}

.header .el-button--info {
  background-color: #9a9590;
  border-color: #9a9590;
  color: #fff;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.header .el-button--info:hover {
  background-color: #8a8580;
  border-color: #8a8580;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
}

.table-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.table-img:hover {
  transform: scale(1.1);
}

.subscription-content {
  display: flex;
  gap: 30px;
  min-height: 500px;
}

.subscription-form {
  flex: 1;
  padding-right: 30px;
}

.divider-vertical {
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    #e8e4df 0,
    #e8e4df 5px,
    transparent 5px,
    transparent 10px
  );
  flex-shrink: 0;
}

.subscription-list {
  flex: 1.5;
  padding-left: 30px;
}

.subscription-header {
  margin-bottom: 15px;
}

.auth-container {
  padding: 10px 0;
}

.auth-help {
  padding: 15px;
  background: #f5f3f0;
  border-radius: 10px;
}

.auth-help h4 {
  margin: 0 0 10px 0;
  color: #3d3d3a;
}

.auth-help ol {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
  color: #6c6a64;
}

.auth-help a {
  color: #8b9a6d;
  text-decoration: none;
}

.auth-help a:hover {
  text-decoration: underline;
}

/* Commerce 风格表格 */
:deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
  font-size: 16px;
  background-color: #fff;
  border-radius: 12px;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

:deep(.el-table__body) {
  background-color: #fff;
}

:deep(.el-table .el-table__header th) {
  font-size: 16px;
  font-weight: 600;
  color: #6b6560;
  background-color: #f5f3f0 !important;
  padding: 12px 16px;
}

:deep(.el-table .cell) {
  font-size: 16px;
  color: #1a1a1a;
  line-height: 1.5;
}

:deep(.el-table__row) {
  background-color: #fff;
  height: 50px !important;
  line-height: 50px !important;
}

:deep(.el-table__row:hover) {
  background-color: #faf8f5 !important;
}

:deep(.el-table__cell) {
  padding: 8px 16px !important;
}

:deep(.el-tag) {
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  padding: 4px 10px;
}

/* 分页按钮样式 */
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

/* 主要按钮样式 - 深绿色 */
:deep(.el-button--primary) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  border-radius: 10px;
}

:deep(.el-button--primary:hover) {
  background-color: #7a895c;
  border-color: #7a895c;
}

/* link 类型按钮 */
:deep(.el-button--primary.is-link) {
  background-color: transparent;
  border-color: transparent;
  color: #8b9a6d;
}

:deep(.el-button--primary.is-link:hover) {
  color: #7a895c;
  background-color: rgba(139, 154, 109, 0.1);
}

/* 危险/删除按钮样式 */
:deep(.el-button--danger) {
  background-color: #e8686a;
  border-color: #e8686a;
  border-radius: 10px;
}

:deep(.el-button--danger:hover) {
  background-color: #d8585a;
  border-color: #d8585a;
}

/* link 类型危险按钮 */
:deep(.el-button--danger.is-link) {
  background-color: transparent;
  border-color: transparent;
  color: #e8686a;
}

:deep(.el-button--danger.is-link:hover) {
  color: #d8585a;
  background-color: rgba(232, 104, 106, 0.1);
}

/* 警告按钮样式 */
:deep(.el-button--warning) {
  background-color: #c4a882;
  border-color: #c4a882;
  border-radius: 10px;
  color: #fff;
}

:deep(.el-button--warning:hover) {
  background-color: #b59872;
  border-color: #b59872;
  color: #fff;
}

/* link 类型警告按钮 */
:deep(.el-button--warning.is-link) {
  background-color: transparent;
  border-color: transparent;
  color: #c4a882;
}

:deep(.el-button--warning.is-link:hover) {
  color: #b59872;
  background-color: rgba(196, 168, 130, 0.1);
}

/* 成功按钮样式 */
:deep(.el-button--success) {
  background-color: #5db872;
  border-color: #5db872;
  border-radius: 10px;
  color: #fff;
}

:deep(.el-button--success:hover) {
  background-color: #4da862;
  border-color: #4da862;
  color: #fff;
}

/* link 类型成功按钮 */
:deep(.el-button--success.is-link) {
  background-color: transparent;
  border-color: transparent;
  color: #5db872;
}

:deep(.el-button--success.is-link:hover) {
  color: #4da862;
  background-color: rgba(93, 184, 114, 0.1);
}

/* 信息按钮样式 */
:deep(.el-button--info) {
  background-color: #9a9590;
  border-color: #9a9590;
  border-radius: 10px;
  color: #fff;
}

:deep(.el-button--info:hover) {
  background-color: #8a8580;
  border-color: #8a8580;
  color: #fff;
}

/* 默认按钮样式 */
:deep(.el-button--default) {
  background-color: #f5f3f0;
  border-color: #e8e4df;
  color: #6b6560;
  border-radius: 10px;
}

:deep(.el-button--default:hover) {
  background-color: #e8e4df;
  border-color: #d8d4cf;
  color: #5b5650;
}

/* 弹窗样式优化 */
:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #e8e4df;
}

:deep(.el-dialog__title) {
  color: #6b6560;
  font-weight: 500;
  font-size: 18px;
}

/* 表单输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-textarea__inner) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
  color: #1a1a1a;
}

:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
  border-color: #c4a882 !important;
}
</style>

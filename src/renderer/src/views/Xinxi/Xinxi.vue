<template>
  <div class="xuexi-container">
    <div class="header">
      <div class="header-actions">
        <el-button type="primary" @click="startCrawler" :loading="crawlerRunning" :disabled="crawlerRunning">
          <el-icon><Refresh /></el-icon>
          {{ crawlerRunning ? '爬取中...' : '刷新爬虫' }}
        </el-button>
        <el-button type="danger" @click="stopCrawler" :disabled="!crawlerRunning" v-if="crawlerRunning">
          <el-icon><Close /></el-icon>
          停止爬取
        </el-button>
        <el-button type="warning" @click="showAuthModal = true" style="display:none">
          <el-icon><Key /></el-icon>
          授权管理
        </el-button>
        <el-button type="info" @click="openSubscriptionsModal">
          <el-icon><List /></el-icon>
          订阅号
        </el-button>
        <el-input
          v-model="articleKeyword"
          placeholder="请输入标题或来源查询"
          clearable
          style="width: 260px"
        />
      </div>
    </div>

    <!-- 爬虫进度提示 -->
    <div v-if="crawlerRunning || batchCrawling" style="margin-bottom: 15px;">
      <p style="margin-bottom: 8px;">{{ statusMessage }}</p>
      <el-progress :percentage="crawlerProgress" />
    </div>

    <!-- 文章列表 -->
    <el-table
      :data="articles"
      v-loading="loadingArticles"
      stripe
      style="width: 100%;height:619px"
    >
      <el-table-column type="index" label="序号" width="100" />
      <el-table-column label="标题" min-width="300">
        <template #default="{ row }">
          <div class="single-line-text">{{ row.title }}</div>
        </template>
      </el-table-column>
      <el-table-column label="链接" min-width="200">
        <template #default="{ row }">
          <el-tooltip :content="row.url" placement="top">
            <el-link type="primary" @click="copyToClipboard(row.url)" :underline="false" class="url-link">
              {{ row.url }}
            </el-link>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="200">
        <template #default="{ row }">
          <div class="single-line-text">{{ row.mp_name || '学习信息' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" width="200">
        <template #default="{ row }">
          {{ formatTime(row.publish_time) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" @click="openArticle(row.url)">
            查看
          </el-button>
          <el-button type="warning" @click="collectArticle(row)">
            收藏
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination" v-if="articleTotal > 0">
      <el-pagination
        background
        v-model:current-page="articlePage"
        v-model:page-size="articlePageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="articleTotal"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleArticleSizeChange"
        @current-change="handleArticlePageChange"
      />
    </div>

    <!-- 订阅号列表弹窗 -->
    <el-dialog
      v-model="showSubscriptionsModal"
      title="订阅号管理"
      width="90%"
    >
      <div class="subscription-content">
        <!-- 左侧：添加订阅号表单 -->
        <div class="subscription-form">
          <h3 style="margin-top: 0;">添加订阅号</h3>
          <el-form :model="form" label-width="120px">
            <el-form-item label="通过URL获取">
              <el-input
                v-model="articleUrl"
                type="textarea"
                :rows="3"
                placeholder="输入微信公众号文章链接"
                clearable
              />
              <el-button :loading="parsing" @click="handleParseUrl" style="margin-top: 8px;">
                解析
              </el-button>
              <div style="margin-top: 8px; font-size: 12px; color: #999;">
                示例: https://mp.weixin.qq.com/s/xxxxx
              </div>
            </el-form-item>

            <el-divider>或</el-divider>

            <el-form-item label="搜索公众号">
              <el-input
                v-model="searchKeyword"
                placeholder="输入公众号名称搜索"
                clearable
              >
                <template #append>
                  <el-button :loading="searching" @click="handleSearch">
                    <el-icon><Search /></el-icon>
                    搜索
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="公众号名称" required>
              <el-input v-model="form.mp_name" placeholder="请输入公众号名称" />
            </el-form-item>

            <el-form-item label="公众号ID" required>
              <el-input v-model="form.mp_id" placeholder="请输入公众号ID" />
            </el-form-item>

            <el-form-item label="头像URL">
              <el-input v-model="form.mp_cover" placeholder="请输入头像URL" />
              <el-avatar v-if="form.mp_cover" :src="form.mp_cover" :size="60" style="margin-top: 10px" />
            </el-form-item>

            <el-form-item label="简介">
              <el-input
                v-model="form.mp_intro"
                type="textarea"
                placeholder="请输入公众号简介"
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

        <!-- 右侧：订阅号列表 -->
        <div class="subscription-list">
          <h3 style="margin-top: 0;">订阅号列表</h3>
          <el-table
            :data="subscriptions"
            v-loading="loading"
            stripe
            style="width: 100%;"
            max-height="500"
          >
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="mp_name" label="公众号名称" min-width="150" />
            <el-table-column label="添加时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="320" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="crawlArticles(row.id)">
                  爬取
                </el-button>
                <el-button size="small" @click="viewMpArticles(row.id)">
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

          <el-empty v-if="subscriptions.length === 0 && !loading" description="暂无订阅，请添加公众号" />

          <!-- 订阅号分页 -->
          <div class="pagination" v-if="total > 0" style="margin-top: 20px;">
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

        <el-tabs v-model="authTab">
          <el-tab-pane label="手动授权" name="manual">
            <el-form :model="authForm" label-width="100px">
              <el-form-item label="Cookie">
                <el-input
                  v-model="authForm.cookie"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入微信公众号平台的Cookie"
                />
              </el-form-item>

              <el-form-item label="Token">
                <el-input
                  v-model="authForm.token"
                  placeholder="请输入Token"
                />
              </el-form-item>
              <el-form-item label="User-Agent">
                <el-input
                  v-model="authForm.user_agent"
                  placeholder="可选，默认使用标准UA"
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
              <h4>如何获取Cookie和Token？</h4>
              <ol>
                <li>打开浏览器，访问 <a href="https://mp.weixin.qq.com" target="_blank">微信公众号平台</a></li>
                <li>登录你的公众号账号</li>
                <li>按F12打开开发者工具</li>
                <li>切换到Network（网络）标签</li>
                <li>刷新页面，找到任意请求</li>
                <li>在请求头中找到Cookie，复制完整的Cookie值</li>
                <li>在URL中找到token参数，复制token值</li>
              </ol>
            </div>
          </el-tab-pane>

          <el-tab-pane label="二维码授权" name="qrcode">
            <el-alert
              title="二维码扫码授权"
              type="info"
              :closable="false"
              style="margin-bottom: 20px"
            >
              <template #default>
                <div>使用微信扫描二维码登录公众号平台，自动获取授权</div>
              </template>
            </el-alert>

            <div class="qrcode-container">
              <el-button type="primary" @click="generateQrcode" :loading="generatingQrcode">
                生成二维码
              </el-button>

              <div v-if="qrcodeUrl" class="qrcode-display">
                <img :src="qrcodeUrl" alt="登录二维码" />
                <p>请使用微信扫描二维码登录</p>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 单个公众号文章列表弹窗 -->
    <el-dialog
      v-model="showMpArticlesModal"
      title="公众号文章列表"
      width="90%"
    >
      <el-table :data="mpArticles" v-loading="loadingMpArticles" max-height="500">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.publish_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="openArticle(row.url)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 编辑订阅号弹窗 -->
    <el-dialog
      v-model="showEditModal"
      title="编辑订阅号"
      width="600px"
    >
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="公众号名称" required>
          <el-input v-model="editForm.mp_name" placeholder="请输入公众号名称" />
        </el-form-item>
        <el-form-item label="公众号ID" required>
          <el-input v-model="editForm.mp_id" placeholder="请输入公众号ID" />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="editForm.mp_cover" placeholder="请输入头像URL" />
          <el-avatar v-if="editForm.mp_cover" :src="editForm.mp_cover" :size="60" style="margin-top: 10px" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.mp_intro" type="textarea" placeholder="请输入公众号简介" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handleEditSubscription" :loading="editing">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, Close, Key, List } from '@element-plus/icons-vue'
import axios from 'axios'

const api = (window as any).electronAPI

// 数据
const articles = ref([])
const articleTotal = ref(0)
const articlePage = ref(1)
const articlePageSize = ref(20)
const loadingArticles = ref(false)
const articleKeyword = ref('')
let articleSearchTimer = null

// 爬虫状态
const crawlerRunning = ref(false)
const crawlerProgress = ref(0)
const statusMessage = ref('')
let statusTimer = null
let eventSource = null

// 微信公众号相关数据
const subscriptions = ref([])
const mpArticles = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const showAuthModal = ref(false)
const showSubscriptionsModal = ref(false)
const showMpArticlesModal = ref(false)
const showEditModal = ref(false)
const editing = ref(false)
const editForm = ref({ id: '', mp_name: '', mp_id: '', mp_cover: '', mp_intro: '' })
const searching = ref(false)
const parsing = ref(false)
const loading = ref(false)
const loadingMpArticles = ref(false)
const submitting = ref(false)
const savingAuth = ref(false)
const clearingAuth = ref(false)
const generatingQrcode = ref(false)
const batchCrawling = ref(false)
const searchKeyword = ref('')
const articleUrl = ref('')
const qrcodeUrl = ref('')
const authTab = ref('manual')

// 微信 Cookie 和 Token
const wxCookie = ref('')
const wxToken = ref('')

// 授权状态
const authStatus = ref({
  authorized: false,
  expires_in: 0
})

// 授权表单
const authForm = ref({
  cookie: '',
  token: '',
  user_agent: ''
})

// 表单数据
const form = ref({
  mp_name: '',
  mp_id: '',
  mp_cover: '',
  mp_intro: ''
})

// 启动爬虫（原有的多源爬虫）
const startCrawler = async () => {
  try {
    // 先清空数据表
    const clearRes = await api.clearXinxi()
    if (clearRes.code === 200) {
      ElMessage.success('已清空旧数据')
    } else {
      ElMessage.warning('清空数据失败: ' + clearRes.message)
    }

    const response = await api.startXinxiCrawler()
    if (response.code === 200) {
      crawlerRunning.value = response.result.running
      crawlerProgress.value = response.result.progress
      statusMessage.value = response.result.message
      startStatusPolling()
      ElMessage.success('爬虫任务已开始')
    }
  } catch (error) {
    console.error('启动爬虫失败:', error)
    ElMessage.error('启动爬虫失败')
  }
}

// 通用方法：根据 url 获取 cookie
const getCookieByUrl = async (url) => {
  try {
    const res = await api.getTokenList({ url })
    if (res.code === 200 && res.result && res.result.list && res.result.list.length > 0) {
      return res.result.list[0].token || ''
    }
    return ''
  } catch (error) {
    console.log(`获取 ${url} cookie 失败:`, error)
    return ''
  }
}

// 获取微信 Cookie 和 Token
const fetchWeixinCredentials = async () => {
  wxCookie.value = await getCookieByUrl('wx_cookie')
  wxToken.value = await getCookieByUrl('wx_token')
}

// 批量爬取微信公众号文章
const batchCrawlWeixinArticles = async () => {
  // 获取所有订阅号
  let allSubscriptions = []
  // 先清空 wxarticle 表
  // try {
  //   await axios.delete('http://localhost:8000/api/weixin/rss/articles/clear')
  // } catch (error) {
  //   console.error('清空文章数据失败:', error)
  // }

  try {
    const response = await api.getWxaccountList({
      page: 1,
      pageNum: 9999
    })
    if (response.code === 200) {
      allSubscriptions = response.result.list
    }
  } catch (error) {
    console.error('获取订阅列表失败:', error)
    return
  }

  if (allSubscriptions.length === 0) {
    console.log('暂无订阅号，跳过微信爬取')
    return
  }

  // 确保有 cookie 和 token
  if (!wxCookie.value || !wxToken.value) {
    await fetchWeixinCredentials()
  }

  if (!wxCookie.value || !wxToken.value) {
    console.log('未配置微信 Cookie 和 Token，跳过微信爬取')
    return
  }

  try {
    batchCrawling.value = true
    statusMessage.value = '开始爬取微信公众号文章...'

    

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < allSubscriptions.length; i++) {
      const sub = allSubscriptions[i]
      statusMessage.value = `正在爬取微信公众号 ${i + 1}/${allSubscriptions.length}: ${sub.mp_name}`
      crawlerProgress.value = Math.floor((i / allSubscriptions.length) * 100)

      try {
        const response = await axios.post(`http://localhost:8000/api/weixin/rss/crawl/${sub.id}`, {
          page: 1,
          cookie: wxCookie.value,
          token: wxToken.value,
          max_articles: 5
        })

        if (response.data.success) {
          successCount++
        }
      } catch (error) {
        failCount++
        console.error(`${sub.mp_name} 爬取失败:`, error)
      }

      // 如果不是最后一个，等待5秒
      if (i < allSubscriptions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    crawlerProgress.value = 100
    statusMessage.value = `微信公众号爬取完成！成功: ${successCount}，失败: ${failCount}`
    ElMessage.success(`微信公众号爬取完成！成功: ${successCount}，失败: ${failCount}`)
  } catch (error) {
    console.error('批量爬取微信文章错误:', error)
  } finally {
    batchCrawling.value = false
  }
}

const startStatusPolling = () => {
  if (statusTimer) {
    clearInterval(statusTimer)
  }

  statusTimer = setInterval(async () => {
    try {
      const response = await api.getXinxiStatus()
      if (response.code === 200) {
        const result = response.result
        crawlerRunning.value = result.running
        crawlerProgress.value = result.progress
        statusMessage.value = result.message

        // 实时刷新文章列表（爬取中每500ms刷新一次）
        if (result.running) {
          handleQueryArticles()
        }

        if (!result.running) {
          clearInterval(statusTimer)
          statusTimer = null
          ElMessage.success(`学习信息爬取完成，共获取 ${result.total_count} 条数据`)
          handleQueryArticles()

          setTimeout(() => {
            batchCrawlWeixinArticles()
          }, 2000)
        }
      }
    } catch (error) {
      console.error('获取状态失败:', error)
    }
  }, 500)
}

// 停止爬虫
const stopCrawler = () => {
  // 关闭 EventSource 连接
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }

  // 停止状态轮询
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }

  // 重置状态
  crawlerRunning.value = false
  crawlerProgress.value = 0
  statusMessage.value = ''

  ElMessage.warning('已停止爬取')
  handleQueryArticles()
}

// 查询文章列表（只查询 xinxi 表）
const handleQueryArticles = async () => {
  loadingArticles.value = true
  try {
    const keyword = articleKeyword.value.trim()

    const response = await api.getXinxiList({
      page: articlePage.value,
      pageNum: articlePageSize.value,
      keyword
    })

    if (response.code === 200) {
      articles.value = response.result.list.filter(item => item.title)
      articleTotal.value = response.result.pagination.total
    }
  } catch (error) {
    ElMessage.error('查询文章失败')
    console.error(error)
  } finally {
    loadingArticles.value = false
  }
}


// 打开文章
const openArticle = (url) => {
  if (!url) {
    ElMessage.warning('文章链接为空')
    return
  }
  window.open(url, '_blank')
}

// 收藏文章
const collectArticle = async (row) => {
  try {
    const res = await api.addCollect({
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

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  // 如果是时间戳（数字）
  if (typeof time === 'number') {
    return new Date(time * 1000).toLocaleString('zh-CN')
  }
  // 如果是日期字符串
  return new Date(time).toLocaleString('zh-CN')
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

// 获取授权状态
const getAuthStatus = async () => {
  try {
    const response = await axios.get('http://localhost:8000/api/weixin/rss/auth/status')
    if (response.data.success) {
      authStatus.value = response.data.result
    }
  } catch (error) {
    console.error('获取授权状态失败', error)
  }
}

// 保存授权
const handleSaveAuth = async () => {
  if (!authForm.value.cookie || !authForm.value.token) {
    ElMessage.warning('请填写Cookie和Token')
    return
  }

  savingAuth.value = true
  try {
    const response = await axios.post('http://localhost:8000/api/weixin/rss/auth/save', authForm.value)

    if (response.data.success) {
      await api.addToken({
        url: 'wx_cookie',
        token: authForm.value.cookie
      })

      await api.addToken({
        url: 'wx_token',
        token: authForm.value.token
      })

      ElMessage.success('授权保存成功')
      await getAuthStatus()
      await fetchWeixinCredentials()
      showAuthModal.value = false
    }
  } catch (error) {
    ElMessage.error('保存授权失败')
    console.error(error)
  } finally {
    savingAuth.value = false
  }
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
    const response = await axios.post('http://localhost:8000/api/weixin/rss/auth/clear')

    if (response.data.success) {
      ElMessage.success('授权已清除')
      authForm.value = { cookie: '', token: '', user_agent: '' }
      await getAuthStatus()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清除授权失败')
      console.error(error)
    }
  } finally {
    clearingAuth.value = false
  }
}

// 生成二维码
const generateQrcode = async () => {
  generatingQrcode.value = true
  try {
    const response = await axios.get('http://localhost:8000/api/weixin/rss/auth/qrcode')
    if (response.data.success) {
      const result = response.data.result
      if (result.qrcode_url) {
        qrcodeUrl.value = result.qrcode_url
        ElMessage.success('二维码已生成，请扫码登录')
      } else {
        ElMessage.info('二维码生成中，请稍候...')
      }
    }
  } catch (error) {
    ElMessage.error('生成二维码失败')
    console.error(error)
  } finally {
    generatingQrcode.value = false
  }
}

// 获取订阅列表
const getSubscriptions = async () => {
  loading.value = true
  try {
    const response = await api.getWxaccountList({
      page: currentPage.value,
      pageNum: pageSize.value
    })

    if (response.code === 200) {
      subscriptions.value = response.result.list
      total.value = response.result.pagination.total
    }
  } catch (error) {
    ElMessage.error('获取订阅列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 打开订阅号管理弹窗
const openSubscriptionsModal = () => {
  showSubscriptionsModal.value = true
  getSubscriptions()
}

// 通过URL解析公众号信息
const handleParseUrl = async () => {
  if (!articleUrl.value) {
    ElMessage.warning('请输入文章链接')
    return
  }

  if (!articleUrl.value.includes('mp.weixin.qq.com')) {
    ElMessage.warning('请输入正确的微信公众号文章链接')
    return
  }

  parsing.value = true
  try {
    const response = await axios.post('http://localhost:8000/api/weixin/rss/parse-article-url', {
      url: articleUrl.value
    })

    if (response.data.success) {
      const mp = response.data.result
      form.value = {
        mp_name: mp.mp_name || '',
        mp_id: mp.mp_id || '',
        mp_cover: mp.mp_cover || '',
        mp_intro: mp.mp_intro || ''
      }
      ElMessage.success('解析成功！已自动填充公众号信息')
    } else {
      ElMessage.error('解析失败，请检查链接是否正确')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '解析失败，请检查链接是否正确')
    console.error(error)
  } finally {
    parsing.value = false
  }
}

// 搜索公众号
const handleSearch = async () => {
  if (!searchKeyword.value) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  if (!wxCookie.value || !wxToken.value) {
    await fetchWeixinCredentials()
  }

  if (!wxCookie.value || !wxToken.value) {
    ElMessage.warning('请先配置微信 Cookie 和 Token')
    return
  }

  searching.value = true
  try {
    const response = await axios.get('http://localhost:8000/api/weixin/rss/search', {
      params: {
        keyword: searchKeyword.value,
        cookie: wxCookie.value,
        token: wxToken.value
      }
    })

    if (response.data.success && response.data.result.list.length > 0) {
      const mp = response.data.result.list[0]
      form.value = {
        mp_name: mp.nickname || mp.mp_name,
        mp_id: mp.fakeid || mp.mp_id,
        mp_cover: mp.round_head_img || mp.mp_cover,
        mp_intro: mp.signature || mp.mp_intro
      }
      ElMessage.success('搜索成功')
    } else {
      ElMessage.info('未找到相关公众号')
    }
  } catch (error) {
    ElMessage.error('搜索失败')
    console.error(error)
  } finally {
    searching.value = false
  }
}

// 添加订阅
const handleAddSubscription = async () => {
  if (!form.value.mp_name || !form.value.mp_id) {
    ElMessage.warning('请填写必填项')
    return
  }

  submitting.value = true
  try {
    const response = await api.addWxaccount(form.value)

    if (response.code === 200) {
      ElMessage.success('添加成功')
      resetForm()
      getSubscriptions()
    }
  } catch (error) {
    ElMessage.error('添加失败')
    console.error(error)
  } finally {
    submitting.value = false
  }
}

// 删除订阅
const deleteSubscription = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个订阅吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await api.deleteWxaccount(id)

    if (response.code === 200) {
      ElMessage.success('删除成功')
      getSubscriptions()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }
}

// 打开编辑订阅号弹窗
const openEditSubscription = (row) => {
  editForm.value = {
    id: row.id,
    mp_name: row.mp_name || '',
    mp_id: row.mp_id || '',
    mp_cover: row.mp_cover || '',
    mp_intro: row.mp_intro || ''
  }
  showEditModal.value = true
}

// 保存编辑
const handleEditSubscription = async () => {
  if (!editForm.value.mp_name || !editForm.value.mp_id) {
    ElMessage.warning('请填写必填项')
    return
  }
  editing.value = true
  try {
    const response = await api.updateWxaccount(editForm.value.id, {
      mp_name: editForm.value.mp_name,
      mp_id: editForm.value.mp_id,
      mp_cover: editForm.value.mp_cover,
      mp_intro: editForm.value.mp_intro
    })
    if (response.code === 200) {
      ElMessage.success('编辑成功')
      showEditModal.value = false
      getSubscriptions()
    }
  } catch (error) {
    ElMessage.error('编辑失败')
    console.error(error)
  } finally {
    editing.value = false
  }
}

// 爬取单个公众号文章
const crawlArticles = async (mpId) => {
  try {
    if (!wxCookie.value || !wxToken.value) {
      await fetchWeixinCredentials()
    }

    if (!wxCookie.value || !wxToken.value) {
      ElMessage.warning('请先配置微信 Cookie 和 Token')
      return
    }

    const loading = ElMessage({
      message: '正在爬取文章...',
      duration: 0,
      type: 'info'
    })

    const response = await axios.post(`http://localhost:8000/api/weixin/rss/crawl/${mpId}`, {
      page: 1,
      cookie: wxCookie.value,
      token: wxToken.value
    })

    loading.close()

    if (response.data.success) {
      ElMessage.success(`爬取成功，共${response.data.result.count}篇文章`)
      handleQueryArticles()
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || '爬取失败'
    ElMessage.error(errorMsg)
    console.error('爬取错误:', error.response?.data || error)
  }
}

// 查看单个公众号的文章
const viewMpArticles = async (mpId) => {
  showMpArticlesModal.value = true
  loadingMpArticles.value = true

  try {
    const response = await axios.get('http://localhost:8000/api/weixin/rss/articles', {
      params: { mp_id: mpId, limit: 100, offset: 0 }
    })

    if (response.data.success) {
      mpArticles.value = response.data.result.list
    }
  } catch (error) {
    ElMessage.error('获取文章列表失败')
    console.error(error)
  } finally {
    loadingMpArticles.value = false
  }
}

// 重置表单
const resetForm = () => {
  form.value = {
    mp_name: '',
    mp_id: '',
    mp_cover: '',
    mp_intro: ''
  }
  searchKeyword.value = ''
  articleUrl.value = ''
}

// 订阅号分页
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  getSubscriptions()
}

const handlePageChange = (page) => {
  currentPage.value = page
  getSubscriptions()
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

// 文章分页
const handleArticleSizeChange = (size) => {
  articlePageSize.value = size
  articlePage.value = 1
  handleQueryArticles()
}

const handleArticlePageChange = (page) => {
  articlePage.value = page
  handleQueryArticles()
}

// 初始化
onMounted(() => {
  fetchWeixinCredentials()
  getAuthStatus()
  handleQueryArticles()
})

// 监听搜索关键词变化，带防抖
watch(articleKeyword, () => {
  if (articleSearchTimer) {
    clearTimeout(articleSearchTimer)
  }
  articleSearchTimer = setTimeout(() => {
    articlePage.value = 1
    handleQueryArticles()
  }, 500)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (statusTimer) {
    clearInterval(statusTimer)
  }
  if (eventSource) {
    eventSource.close()
  }
  if (articleSearchTimer) {
    clearTimeout(articleSearchTimer)
  }
})
</script>

<style scoped>
  /* Claude Design System - Colors */
  :root {
    --claude-primary: #cc785c;
    --claude-primary-active: #a9583e;
    --claude-primary-disabled: #e6dfd8;
    --claude-ink: #141413;
    --claude-body: #3d3d3a;
    --claude-body-strong: #252523;
    --claude-muted: #6c6a64;
    --claude-muted-soft: #8e8b82;
    --claude-hairline: #e6dfd8;
    --claude-hairline-soft: #ebe6df;
    --claude-canvas: #faf9f5;
    --claude-surface-soft: #f5f0e8;
    --claude-surface-card: #efe9de;
    --claude-surface-cream-strong: #e8e0d2;
    --claude-success: #5db872;
    --claude-error: #c64545;
  }

  .xuexi-container {
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
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 0 20px;
    height: 60px;
    background: #fff;
    border-radius: 12px;
    border-bottom: 1px solid #e8e4df;
  }

  .header h2 {
    margin: 0;
    font-size: 16px;
    color: #6b6560;
    font-weight: 500;
    border-left: 5px solid #8b9a6d;
    padding-left: 10px;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .header-actions .el-button--primary {
    background-color: #8b9a6d;
    border-color: #8b9a6d;
    color: #fff;
    border-radius: 10px;
    padding: 12px 20px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .header-actions .el-button--primary:hover {
    background-color: #7a895c;
    border-color: #7a895c;
  }

  .header-actions .el-input__wrapper {
    background-color: #f5f3f0;
    border: 1px solid #e8e4df;
    border-radius: 10px;
    box-shadow: none !important;
    transition: all 0.3s;
  }

  .header-actions .el-input__wrapper:hover {
    border-color: #c4a882;
  }

  .header-actions .el-input__wrapper.is-focus {
    border-color: #c4a882;
    box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
  }

  .pagination {
    display: flex;
    justify-content: center;
    margin-top: 16px;
    padding: 16px;
    background: #fff;
    border-radius: 12px;
    border-bottom: 1px solid #e8e4df;
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

  /* 状态标签主题色 */
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

  .single-line-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    color: #1a1a1a;
  }

  .url-link {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    color: #8b9a6d;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .url-link:hover {
    color: #7a895c;
    text-decoration: underline;
  }

  .subscription-content {
    display: flex;
    gap: 24px;
    min-height: 500px;
    padding: 20px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e8e4df;
  }

  .subscription-form {
    flex: 1;
    padding-right: 24px;
  }

  .divider-vertical {
    width: 1px;
    background: #e8e4df;
    flex-shrink: 0;
  }

  .subscription-list {
    flex: 1.5;
    padding-left: 24px;
  }

  .auth-container {
    padding: 16px 0;
  }

  .auth-help {
    padding: 20px;
    background: #f5f3f0;
    border-radius: 12px;
    border: 1px solid #e8e4df;
  }

  .auth-help h4 {
    margin: 0 0 12px 0;
    color: #6b6560;
    font-size: 16px;
    font-weight: 500;
  }

  .auth-help ol {
    margin: 0;
    padding-left: 20px;
    line-height: 1.8;
    color: #1a1a1a;
  }

  .auth-help a {
    color: #8b9a6d;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .auth-help a:hover {
    color: #7a895c;
    text-decoration: underline;
  }

  .qrcode-container {
    text-align: center;
    padding: 20px;
    background: #f5f3f0;
    border-radius: 12px;
    border: 1px solid #e8e4df;
  }

  .qrcode-display {
    margin-top: 20px;
  }

  .qrcode-display img {
    max-width: 300px;
    border: 1px solid #e8e4df;
    border-radius: 8px;
    padding: 12px;
    background: #fff;
  }

  .qrcode-display p {
    margin-top: 12px;
    color: #6b6560;
    font-size: 14px;
  }

  /* 进度条样式优化 */
  :deep(.el-progress-bar__outer) {
    background-color: #f5f3f0;
    border-radius: 8px;
  }

  :deep(.el-progress-bar__inner) {
    background-color: #8b9a6d;
    border-radius: 8px;
  }

  /* 对话框样式优化 */
  :deep(.el-dialog) {
    border-radius: 12px;
    background-color: #faf8f5;
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

  :deep(.el-dialog__body) {
    padding: 20px;
    color: #1a1a1a;
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

  /* 警告/收藏按钮样式 - 琥珀色 */
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

  /* 信息按钮样式 */
  :deep(.el-button--info) {
    background-color: #9a9590;
    border-color: #9a9590;
    border-radius: 10px;
  }

  :deep(.el-button--info:hover) {
    background-color: #8a8580;
    border-color: #8a8580;
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
</style>

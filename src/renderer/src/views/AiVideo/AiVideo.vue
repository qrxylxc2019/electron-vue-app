<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2024-07-05 00:00:00
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-07-05 00:00:00
 * @FilePath: \eletron\frontend\src\views\AiVideo\AiVideo.vue
 * @Description: AI视频组件
-->
<template>
  <div class="ai-video-container">
    <div class="header">
      <el-input
        v-model="searchText"
        placeholder="搜索视频"
        class="search-input"
        size="large"
        clearable
        @input="searchVideos"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="large" @click="refreshVideos">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </div>

    <el-table
      :data="videos"
      v-loading="loading"
      stripe
      style="width: 100%"
      :height="tableHeight"
    >
      <el-table-column type="index" label="序号" width="80" />
      <el-table-column label="视频预览" width="200">
        <template #default="scope">
          <div class="video-preview-small" @click="playVideo(scope.row)">
            <img :src="scope.row.thumbnail || defaultThumbnail" alt="视频缩略图" />
            <div class="video-overlay-small">
              <el-icon><VideoPlay /></el-icon>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
      <el-table-column prop="type" label="类型" width="150">
        <template #default="scope">
          {{ scope.row.type || 'MP4' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="scope">
          <el-button type="primary" link @click="playVideo(scope.row)">
            <el-icon><VideoPlay /></el-icon>播放
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
      <el-pagination
        background
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 视频播放器对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentVideo.title"
      width="80%"
      :before-close="handleClose"
    >
      <div class="video-player">
        <video ref="videoPlayer" controls autoplay>
          <source :src="currentVideo.url" :type="currentVideo.type || 'video/mp4'">
          您的浏览器不支持视频播放。
        </video>
      </div>
      <div class="video-description" v-if="currentVideo.description">
        <h4>视频描述</h4>
        <p>{{ currentVideo.description }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, Search, Refresh } from '@element-plus/icons-vue'

// 视频数据
const videos = ref([])
const allVideos = ref([])
const dialogVisible = ref(false)
const currentVideo = ref({})
const videoPlayer = ref(null)
const loading = ref(false)
const defaultThumbnail = '/path/to/default-thumbnail.jpg'
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = 'calc(100vh - 230px)'

let searchTimeout = null

onMounted(() => {
  // 页面加载时获取视频数据
  refreshVideos()
})

// 刷新视频列表
const refreshVideos = async () => {
  loading.value = true
  try {
    // 这里添加获取视频数据的API调用
    // 临时模拟数据
    const mockData = [
      {
        id: 1,
        title: '人工智能介绍',
        description: 'AI技术的基本原理与应用场景',
        url: '/static/video/sample1.mp4',
        thumbnail: '',
        type: 'video/mp4'
      },
      {
        id: 2,
        title: '机器学习基础',
        description: '机器学习算法与实践案例分析',
        url: '/static/video/sample2.mp4',
        thumbnail: '',
        type: 'video/mp4'
      }
    ]
    allVideos.value = mockData
    total.value = mockData.length
    filterVideos()
  } catch (error) {
    console.error('获取视频数据失败:', error)
    ElMessage.error('获取视频数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索视频
const searchVideos = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    filterVideos()
  }, 300)
}

// 筛选视频
const filterVideos = () => {
  let filtered = allVideos.value
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    filtered = allVideos.value.filter(video =>
      video.title?.toLowerCase().includes(keyword) ||
      video.description?.toLowerCase().includes(keyword)
    )
  }
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  videos.value = filtered.slice(start, end)
}

// 分页
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  filterVideos()
}

const handlePageChange = (val) => {
  currentPage.value = val
  filterVideos()
}

// 播放视频
const playVideo = (video) => {
  currentVideo.value = video
  dialogVisible.value = true
}

// 关闭对话框
const handleClose = () => {
  if (videoPlayer.value) {
    videoPlayer.value.pause()
  }
  dialogVisible.value = false
}
</script>

<style scoped>
.ai-video-container {
  padding: 50px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  background-image:
    linear-gradient(rgba(220, 220, 220, 0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(220, 220, 220, 0.5) 1px, transparent 1px);
  background-size: 80px 80px;
}

.header {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  width: 300px;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}

/* 视频预览小图 */
.video-preview-small {
  position: relative;
  width: 160px;
  height: 90px;
  background-color: #f0f0f0;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
}

.video-preview-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay-small {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.video-preview-small:hover .video-overlay-small {
  opacity: 1;
}

.video-overlay-small .el-icon {
  font-size: 32px;
  color: #fff;
}

/* 视频播放器 */
.video-player {
  width: 100%;
}

.video-player video {
  width: 100%;
}

.video-description {
  margin-top: 20px;
}

.video-description h4 {
  margin: 0 0 10px;
  font-size: 16px;
  color: #303133;
}

.video-description p {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

/* 表格字体大小 - 与Note.vue保持一致 */
:deep(.el-table) {
  font-size: 18px;
}
:deep(.el-table .el-table__header th) {
  font-size: 18px;
  font-weight: 600;
}
:deep(.el-table .cell) {
  font-size: 18px;
}
:deep(.el-tag) {
  font-size: 16px;
}
</style>

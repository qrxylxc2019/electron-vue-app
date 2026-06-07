<template>
  <div class="jizi-container">
    <!-- 左侧：输入区 -->
    <div class="jizi-left">
      <div class="input-section">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="6"
          placeholder="输入要集字的内容，如：天道酬勤"
          @input="handleTextChange"
        />
      </div>
      <div class="settings-section">
        <div class="setting-item">
          <span class="setting-label">每行字数</span>
          <el-input-number v-model="cols" :min="1" :max="20" size="small" />
        </div>
        <div class="setting-item">
          <span class="setting-label">行数（0=自动）</span>
          <el-input-number v-model="rows" :min="0" :max="50" size="small" />
        </div>
        <div class="setting-item">
          <span class="setting-label">格子大小(px)</span>
          <el-input-number v-model="cellSize" :min="50" :max="500" :step="50" size="small" />
        </div>
        <el-button type="primary" @click="generateCompose" :loading="composeLoading" style="width:100%;margin-top:12px">
          生成拼图
        </el-button>
      </div>

      <!-- 逐字匹配结果 -->
      <div class="char-list" v-if="charResults.length > 0">
        <div class="char-list-title">字符匹配（{{ charResults.filter(c => c.found).length }}/{{ charResults.length }}）</div>
        <div class="char-grid">
          <div
            v-for="(item, idx) in charResults"
            :key="idx"
            class="char-item"
            :class="{ missing: !item.found }"
          >
            <el-image
              v-if="item.found"
              :src="getUrl(item.url)"
              fit="cover"
              class="char-img"
              lazy
            />
            <div v-else class="char-placeholder">
              <span>{{ item.char }}</span>
              <span class="miss-tip">缺</span>
            </div>
            <div class="char-label">{{ item.char }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：拼图预览 -->
    <div class="jizi-right">
      <div class="preview-header">
        <span>拼图预览</span>
        <el-button v-if="composeUrl" size="small" @click="downloadImage">下载图片</el-button>
      </div>
      <div class="preview-area" v-loading="composeLoading">
        <el-image
          v-if="composeUrl"
          :src="composeUrl"
          fit="contain"
          class="compose-image"
        />
        <el-empty v-else description="输入文字并点击「生成拼图」" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

interface CharResult {
  char: string
  found: boolean
  url: string | null
}

const inputText = ref('')
const cols = ref(4)
const rows = ref(0)
const cellSize = ref(200)
const charResults = ref<CharResult[]>([])
const composeUrl = ref('')
const composeLoading = ref(false)

let searchTimeout: number | null = null

const getUrl = (url: string | null) => {
  if (!url) return ''
  return `http://localhost:8000${url}`
}

// 输入变化时搜索匹配
const handleTextChange = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const text = inputText.value.replace(/\s/g, '')
    if (!text) {
      charResults.value = []
      return
    }
    try {
      const res = await request.post('http://localhost:8000/api/jizi/search', { text })
      if (res.code === 200) {
        charResults.value = res.result
      }
    } catch (e) {
      console.error('搜索失败', e)
    }
  }, 400)
}

// 生成拼图
const generateCompose = async () => {
  const chars = inputText.value.replace(/\s/g, '').split('')
  if (chars.length === 0) {
    ElMessage.warning('请先输入文字')
    return
  }
  composeLoading.value = true
  composeUrl.value = ''
  try {
    const res = await fetch('http://localhost:8000/api/jizi/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chars, cols: cols.value, rows: rows.value, cellSize: cellSize.value })
    })
    if (!res.ok) throw new Error('请求失败')
    const blob = await res.blob()
    composeUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    ElMessage.error('生成拼图失败')
    console.error(e)
  } finally {
    composeLoading.value = false
  }
}

// 下载图片
const downloadImage = () => {
  if (!composeUrl.value) return
  const a = document.createElement('a')
  a.href = composeUrl.value
  a.download = `集字_${inputText.value.slice(0, 10)}.png`
  a.click()
}
</script>

<style scoped>
.jizi-container {
  display: flex;
  height: 100vh;
  padding: 20px;
  gap: 20px;
  box-sizing: border-box;
  background: #f5f7fa;
}

.jizi-left {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.input-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.settings-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-label {
  font-size: 14px;
  color: #606266;
}

.char-list {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  flex: 1;
  overflow-y: auto;
}

.char-list-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.char-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.char-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
  background: #fafafa;
}

.char-item.missing {
  border-color: #f56c6c;
  background: #fef0f0;
}

.char-img {
  width: 100%;
  aspect-ratio: 1;
}

.char-placeholder {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #f56c6c;
  font-size: 22px;
}

.miss-tip {
  font-size: 11px;
  margin-top: 2px;
}

.char-label {
  font-size: 12px;
  color: #606266;
  padding: 4px 0;
  text-align: center;
}

.jizi-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
}

.compose-image {
  max-width: 100%;
  max-height: 100%;
}

/* 隐藏滚动条 */
.jizi-left::-webkit-scrollbar,
.char-list::-webkit-scrollbar {
  display: none;
}
.jizi-left, .char-list {
  scrollbar-width: none;
}
</style>

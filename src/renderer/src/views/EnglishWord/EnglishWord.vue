<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2024-12-28 00:00:00
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-12-28 00:00:00
 * @FilePath: \eletron\frontend\src\views\EnglishWord\EnglishWord.vue
 * @Description: 英语单词学习组件
-->
<template>
  <div class="english-word-container">
    <!-- 顶部 Tab 切换 -->
    <div class="tab-header glass-header">
      <el-tabs v-model="activeMode" class="mode-tabs">
        <el-tab-pane label="记忆模式" name="memory" />
        <el-tab-pane label="拼写模式" name="spelling" />
        <el-tab-pane label="速记模式" name="quick" />
      </el-tabs>
    </div>

    <!-- 记忆模式 -->
    <div v-if="activeMode === 'memory'" class="main-content memory-main">
      <!-- 记忆模式配置区 -->
      <div class="memory-config-bar">
        <el-button @click="refreshMemoryWords" type="primary" size="large">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <span class="config-label">单词数量:</span>
        <el-input-number v-model="memoryWordCount" :min="1" :max="100" size="large" />
        <span class="config-label">重复次数:</span>
        <el-input-number v-model="memoryRepeatCount" :min="1" :max="10" size="large" />
        
      </div>
      
      <!-- 左右两列 -->
      <div class="memory-content">
        <!-- 左侧：单词卡片 -->
        <div class="memory-left-panel">
          <div v-if="memoryWordList.length > 0" class="memory-word-card">
            <div class="memory-word-english">{{ memoryWordList[currentMemoryIndex]?.english }}</div>
            <div class="memory-word-chinese" v-if="showMemoryChinese">{{ memoryWordList[currentMemoryIndex]?.chinese }}</div>
            <div class="memory-progress">
              {{ currentMemoryIndex + 1 }} / {{ memoryWordList.length }}
            </div>
          </div>
          <div v-else class="memory-empty">
            暂无单词，请点击刷新获取
          </div>
          
          <!-- 底部操作按钮 -->
          <div class="memory-actions" style="width:100%">
            <el-button style="width:50%;height:50px" @click="showMemoryChinese = !showMemoryChinese" type="primary">
              {{ showMemoryChinese ? '隐藏中文' : '显示中文' }}
            </el-button>
            <el-button style="width:50%;height:50px" @click="removeMemoryWord" type="danger">
              删除
            </el-button>
          </div>
        </div>
        
        <!-- 右侧：句子显示 -->
        <div class="memory-right-panel">
          <div class="memory-sentence-title">例句</div>
          <div v-if="currentMemorySentence" class="memory-sentence-content">
            {{ currentMemorySentence }}
          </div>
          <div v-else class="memory-sentence-empty">
            暂无例句
          </div>
        </div>
      </div>
    </div>

    <!-- 拼写/速记模式的按钮区域 -->
    <div class="btn-div" v-if="activeMode !== 'memory'">
      <el-button @click="resetWords" type="primary" size="large">
        重置单词
      </el-button>
      <el-button @click="fetchWords" type="success" size="large">
        获取单词
      </el-button>
      <el-input-number v-model="wordCount" :min="1" :max="100" size="large" style="width: 120px; margin: 0 10px; height: 40px; display: flex; align-items: center;"></el-input-number>
      <el-button @click="openAddWordDialog" type="warning" size="large">
        添加单词
      </el-button>
      <el-switch
        v-model="showChinese"
        active-text="显示汉语"
        inactive-text=""
        style="margin-left: 10px; height: 40px; display: flex; align-items: center;"
      ></el-switch>
      <el-switch
        v-model="showEnglish"
        active-text="显示英语"
        inactive-text=""
        style="margin-left: 10px; height: 40px; display: flex; align-items: center;"
      ></el-switch>
    </div>

    <!-- 下方主要内容区域 (拼写/速记模式) -->
    <div class="main-content" v-if="activeMode !== 'memory'">
      <!-- 左侧单词卡片区域 -->
      <div class="left-panel">
        <!-- 拼写模式 -->
        <div v-if="activeMode === 'spelling'" class="cards-container" ref="cardsContainer">
          <div
            v-for="(word, index) in words"
            :key="word.id"
            class="word-card"
            :class="{ 'removing': removingIndex === index }"
            :style="getCardStyle(index)"
            @animationend="onAnimationEnd"
          >
            <div class="word-english" v-if="showEnglish">{{ word.english }}</div>
            <div class="word-chinese" v-if="showChinese">{{ word.chinese }}</div>
          </div>
        </div>
        
        <!-- 速记模式 -->
        <div v-if="activeMode === 'quick'" class="memory-mode-container">
          <!-- 左侧英语列表 -->
          <div class="english-list">
            <div
              v-for="(word, index) in randomizedEnglishWords"
              :key="'english-' + word.id"
              class="memory-word-item english-item"
              :class="{ 'selected': selectedEnglish === word.id, 'matched': matchedWords.includes(word.id) }"
              :data-english-id="word.id"
              @click="selectEnglish(word.id)"
            >
              {{ word.english }}
            </div>
          </div>
          
          <!-- 连线画布 -->
          <div class="connection-canvas" ref="connectionCanvas">
            <svg width="100%" height="100%" class="connection-svg">
              <line
                v-for="connection in connections"
                :key="connection.id"
                :x1="connection.x1"
                :y1="connection.y1"
                :x2="connection.x2"
                :y2="connection.y2"
                :class="connection.correct ? 'correct-line' : 'incorrect-line'"
                stroke-width="2"
              />
            </svg>
          </div>
          
          <!-- 右侧汉语列表 -->
          <div class="chinese-list">
            <div
              v-for="(word, index) in randomizedChineseWords"
              :key="'chinese-' + word.id"
              class="memory-word-item chinese-item"
              :class="{ 'selected': selectedChinese === word.id, 'matched': matchedWords.includes(word.id) }"
              :data-chinese-id="word.id"
              @click="selectChinese(word.id)"
            >
              {{ word.chinese }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧输入区域 -->
      <div class="right-panel">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="5"
          placeholder="按回车划走一张卡片，按Alt+Enter换行"
          class="input-area"
          @keydown="handleKeydown"
          resize="none"
          style="font-size: 50px;"
        />

        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">剩余单词:</span>
            <span class="stat-value">{{ words.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已完成:</span>
            <span class="stat-value">{{ completedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">完成率:</span>
            <span class="stat-value">{{ Math.round((completedCount / (completedCount + words.length)) * 100) }}%</span>
          </div>
        </div>

        <div class="wordDiv">
          <div v-if="correctWord" class="correct-word">
            <span>正确单词: </span>
            <span class="word">{{ correctWord }}</span>
          </div>
        </div>

        <div v-if="words.length === 0" class="completion-message">
          🎉 所有单词都已完成！
          <el-button @click="resetWords" type="success" size="small" style="margin-top: 10px;">
            再来
          </el-button>
        </div>
      </div>
    </div>

    <!-- 添加单词弹窗 -->
    <el-dialog
      v-model="addWordDialogVisible"
      title="添加单词"
      width="50%"
      :close-on-click-modal="false"
    >
      <el-form :model="addWordForm">
        <el-form-item label="单词列表" :label-width="formLabelWidth">
          <el-input
            v-model="addWordForm.wordsList"
            type="textarea"
            :rows="8"
            placeholder="请输入单词，格式为：&#10;apple-----苹果&#10;banana-----香蕉&#10;一行一个单词"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addWordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addWords">添加</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import request from '@/utils/request'

interface Word {
  id: number
  english: string
  chinese: string
  category?: string
  difficulty?: number
  notes?: string
}

const activeMode = ref('memory')
const correctWord = ref('')
const inputText = ref('')
const words = ref<Word[]>([])
const removingIndex = ref(-1)
const completedCount = ref(0)
const cardsContainer = ref<HTMLElement>()
const wordCount = ref(5) // 添加单词数量变量，默认为10
const allFetchedWords = ref<Word[]>([]) // 存储所有获取到的单词
const showChinese = ref(true) // 是否显示汉语
const showEnglish = ref(false) // 是否显示英语
const memoryWordCount = ref(10) // 记忆模式单词数量
const memoryRepeatCount = ref(5) // 重复次数
const memoryWordList = ref<Word[]>([]) // 记忆模式单词列表
const currentMemoryIndex = ref(0) // 当前显示的单词索引
const showMemoryChinese = ref(false) // 是否显示记忆模式中文
const currentMemorySentence = computed(() => {
  const word = memoryWordList.value[currentMemoryIndex.value]
  return word?.notes || '' // 假设 notes 字段存储例句
})
const randomizedChineseWords = ref<Word[]>([]) // 随机排序的汉语单词
const randomizedEnglishWords = ref<Word[]>([]) // 随机排序的英语单词
const selectedChinese = ref<number | null>(null) // 选中的汉语单词ID
const selectedEnglish = ref<number | null>(null) // 选中的英语单词ID
const matchedWords = ref<number[]>([]) // 已匹配的单词ID列表
const connections = ref<any[]>([]) // 连线数组
const connectionCanvas = ref<HTMLElement>()

// 添加单词相关变量
const addWordDialogVisible = ref(false)
const formLabelWidth = '100px'
const addWordForm = ref({
  wordsList: ''
})

// 模拟单词数据（当API调用失败时使用）
const mockWords: Word[] = [
  { id: 1, english: 'hello', chinese: '你好' },
  { id: 2, english: 'world', chinese: '世界' },
  { id: 3, english: 'computer', chinese: '计算机' },
  { id: 4, english: 'programming', chinese: '编程' },
  { id: 5, english: 'javascript', chinese: 'JavaScript语言' },
  { id: 6, english: 'typescript', chinese: 'TypeScript语言' },
  { id: 7, english: 'vue', chinese: 'Vue框架' },
  { id: 8, english: 'react', chinese: 'React框架' },
  { id: 9, english: 'angular', chinese: 'Angular框架' },
  { id: 10, english: 'nodejs', chinese: 'Node.js运行时' },
  { id: 11, english: 'database', chinese: '数据库' },
  { id: 12, english: 'algorithm', chinese: '算法' },
  { id: 13, english: 'function', chinese: '函数' },
  { id: 14, english: 'variable', chinese: '变量' },
  { id: 15, english: 'array', chinese: '数组' },
  { id: 16, english: 'object', chinese: '对象' },
  { id: 17, english: 'string', chinese: '字符串' },
  { id: 18, english: 'number', chinese: '数字' },
  { id: 19, english: 'boolean', chinese: '布尔值' },
  { id: 20, english: 'promise', chinese: '承诺/异步对象' },
  { id: 21, english: 'async', chinese: '异步的' },
  { id: 22, english: 'await', chinese: '等待' },
  { id: 23, english: 'component', chinese: '组件' },
  { id: 24, english: 'template', chinese: '模板' },
  { id: 25, english: 'style', chinese: '样式' },
]

onMounted(() => {
  // 页面加载时获取单词数据
  fetchWords()
})

// 从API获取单词数据
const fetchWords = async () => {
  try {
    // 调用API获取单词数据
    const params = {
      pageNum: wordCount.value, // 使用设置的单词数量
      conditions: {},
      orderBy: { random: true } // 添加随机获取标志
    }
    
    const res = await request.post('http://localhost:8000/api/englishwords/get', params)
    
    if (res.code === 200 && res.result && res.result.list && res.result.list.length > 0) {
      // 使用API返回的数据
      allFetchedWords.value = [...res.result.list] // 保存所有获取到的单词
      words.value = [...allFetchedWords.value] // 设置当前显示的单词
    } else {
      // 如果API没有返回数据，使用模拟数据
      allFetchedWords.value = [...mockWords.slice(0, wordCount.value)]
      words.value = [...allFetchedWords.value]
    }
    
    // 重置计数器和样式
    completedCount.value = 0
    cardStyles.value.clear()
    
    // 初始化速记模式数据
    initializeMemoryMode()
    
    // 打乱单词顺序
    nextTick(() => {
      shuffleCards()
    })
  } catch (error) {
    console.error('获取单词数据失败:', error)
    // 使用模拟数据作为备用
    allFetchedWords.value = [...mockWords.slice(0, wordCount.value)]
    words.value = [...allFetchedWords.value]
    ElMessage({
      message: '获取单词数据失败，使用本地数据',
      type: 'warning'
    })
    
    // 初始化速记模式数据
    initializeMemoryMode()
    
    // 打乱单词顺序
    nextTick(() => {
      shuffleCards()
    })
  }
}

// 存储每张卡片的随机样式
const cardStyles = ref<Map<number, any>>(new Map())

// 获取卡片样式（杂乱堆叠效果）
const getCardStyle = (index: number) => {
  const wordId = words.value[index]?.id
  if (!wordId) return {}

  // 如果已经有样式，直接返回
  if (cardStyles.value.has(wordId)) {
    const style = cardStyles.value.get(wordId)
    return {
      ...style,
      zIndex: words.value.length - index // 更新层级
    }
  }

  // 生成新的随机样式
  const rotation = (Math.random() - 0.5) * 20 // -10到10度的随机旋转
  const offsetX = (Math.random() - 0.5) * 60 // -30到30px的随机水平偏移
  const offsetY = (Math.random() - 0.5) * 60 // -30到30px的随机垂直偏移
  const zIndex = words.value.length - index // 后面的卡片层级更高

  const style = {
    transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
    zIndex: zIndex,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: '-60px',
    marginLeft: '-100px'
  }

  cardStyles.value.set(wordId, style)
  return style
}

const shuffleCards = () => {
  // 清除旧的样式缓存
  cardStyles.value.clear()

  for (let i = words.value.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words.value[i], words.value[j]] = [words.value[j], words.value[i]]
  }
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    if (event.altKey) {
      // Alt+Enter 换行，不做任何处理，让默认行为发生
      return
    } else {
      event.preventDefault()
      
      // 如果没有单词了，重置单词
      if (words.value.length === 0) {
        resetWords()
        return
      }
      
      // 检查输入的单词是否与顶部卡片匹配
      const topCardWord = words.value[0]?.english || ''
      const userInput = inputText.value.trim().toLowerCase()
      
      if (userInput === topCardWord.toLowerCase()) {
        // 清除正确单词显示
        correctWord.value = ''
        
        // 如果这是最后一张卡片，直接重置单词而不触发动画
        if (words.value.length === 0) {
          // 直接重置单词，不移除卡片
          resetWords()
          // 重置输入框
          inputText.value = ''
        } else {
          // 不是最后一张，正常移除卡片
          removeTopCard()
          // 重置输入框
          inputText.value = ''
        }
      } else {
        inputText.value = ''
        // 单词错误，显示错误提示
        ElMessage({
          message: `单词拼写错误`,
          type: 'error',
          duration: 2000
        })
        
        // 设置正确单词以在wordDiv中显示
        correctWord.value = topCardWord
      }
    }
  } else if (event.key === 'Delete') {
    // 处理 DEL 键删除单词
    inputText.value = ''
    correctWord.value = ''
    event.preventDefault()
    deleteCurrentWord()
  }
}

// 移除顶部卡片
const removeTopCard = () => {
  if (words.value.length === 0) return

  // 最上层卡片是最后一个元素
  removingIndex.value = 0
  
  // 注意：动画由模板中的 :class="{ 'removing': removingIndex === index }" 控制
  // 不需要手动添加类
}

// 动画结束处理
const onAnimationEnd = () => {
  if (removingIndex.value !== -1) {
    const removedWord = words.value[removingIndex.value]
    // 从样式缓存中移除该卡片样式
    if (removedWord) {
      cardStyles.value.delete(removedWord.id)
    }

    words.value.splice(removingIndex.value, 1)
    completedCount.value++
    removingIndex.value = -1
    
    // 删除了清除所有样式缓存的代码，保持其他卡片位置不变
  }
}

// 重置单词
const resetWords = () => {
  if (allFetchedWords.value.length === 0) {
    fetchWords() // 如果没有获取过单词，则获取单词
    return
  }
  
  words.value = [...allFetchedWords.value]
  completedCount.value = 0
  cardStyles.value.clear()
  correctWord.value = '' // 重置正确单词显示
  
  // 如果是速记模式，重置速记模式数据
  if (isMemoryMode.value) {
    initializeMemoryMode()
  } else {
    nextTick(() => {
      shuffleCards()
    })
  }
}

// 打开添加单词弹窗
const openAddWordDialog = () => {
  addWordDialogVisible.value = true
  addWordForm.value.wordsList = ''
}

// 添加单词
const addWords = async () => {
  if (!addWordForm.value.wordsList.trim()) {
    ElMessage({
      message: '请输入单词',
      type: 'warning'
    })
    return
  }

  try {
    // 解析输入的单词列表
    const lines = addWordForm.value.wordsList.trim().split('\n')
    const wordsList = []
    
    for (const line of lines) {
      if (line.trim()) {
        const parts = line.split('-----')
        if (parts.length === 2) {
          wordsList.push({
            english: parts[0].trim(),
            chinese: parts[1].trim()
          })
        } else {
          ElMessage({
            message: `格式错误: ${line}，请使用 "英语-----汉语" 格式`,
            type: 'error'
          })
          return
        }
      }
    }
    
    if (wordsList.length === 0) {
      ElMessage({
        message: '没有有效的单词',
        type: 'warning'
      })
      return
    }
    
    // 调用API添加单词
    const res = await request.post('http://localhost:8000/api/englishwords/text/add', {
      text: addWordForm.value.wordsList
    })
    
    if (res.code === 200) {
      ElMessage({
        message: `成功添加 ${wordsList.length} 个单词`,
        type: 'success'
      })
      addWordDialogVisible.value = false
      // 刷新单词列表
      fetchWords()
    } else {
      ElMessage({
        message: res.message || '添加单词失败',
        type: 'error'
      })
    }
  } catch (error) {
    console.error('添加单词失败:', error)
    ElMessage({
      message: '添加单词失败，请检查格式或网络连接',
      type: 'error'
    })
  }
}

// 删除当前单词
const deleteCurrentWord = async () => {
  if (words.value.length === 0) return
  
  const currentWord = words.value[0]
  if (!currentWord || !currentWord.id) {
    ElMessage({
      message: '无法删除单词，无效的单词ID',
      type: 'error'
    })
    return
  }
  
  try {
    // 调用API删除单词
    const res = await request.post('http://localhost:8000/api/englishwords/delete', {
      id: currentWord.id
    })
    
    if (res.code === 200) {
      ElMessage({
        message: `已删除单词: ${currentWord.english}`,
        type: 'success'
      })
      
      // 从本地数据中也删除这个单词
      const index = allFetchedWords.value.findIndex(w => w.id === currentWord.id)
      if (index !== -1) {
        allFetchedWords.value.splice(index, 1)
      }
      
      // 移除顶部卡片
      removeTopCard()
    } else {
      ElMessage({
        message: res.message || '删除单词失败',
        type: 'error'
      })
    }
  } catch (error) {
    console.error('删除单词失败:', error)
    ElMessage({
      message: '删除单词失败，请检查网络连接',
      type: 'error'
    })
  }
}

// 速记模式相关方法
// 初始化速记模式数据
const initializeMemoryMode = () => {
  // 重置状态
  selectedChinese.value = null
  selectedEnglish.value = null
  matchedWords.value = []
  connections.value = []
  
  // 创建随机排序的中英语列表
  randomizedChineseWords.value = [...words.value].sort(() => Math.random() - 0.5)
  randomizedEnglishWords.value = [...words.value].sort(() => Math.random() - 0.5)
}

// 选择汉语单词
const selectChinese = (wordId: number) => {
  if (matchedWords.value.includes(wordId)) return // 已匹配的单词不能再选择
  
  selectedChinese.value = wordId
  
  // 如果已经选择了英语单词，则尝试匹配
  if (selectedEnglish.value) {
    checkMatch()
  }
}

// 选择英语单词
const selectEnglish = (wordId: number) => {
  if (matchedWords.value.includes(wordId)) return // 已匹配的单词不能再选择
  
  selectedEnglish.value = wordId
  
  // 如果已经选择了汉语单词，则尝试匹配
  if (selectedChinese.value) {
    checkMatch()
  }
}

// 检查匹配
const checkMatch = () => {
  if (!selectedChinese.value || !selectedEnglish.value) return
  
  const isCorrect = selectedChinese.value === selectedEnglish.value
  
  if (isCorrect) {
    // 正确匹配 - 立即添加永久连线
    const connection = {
      id: Date.now(),
      chineseId: selectedChinese.value,
      englishId: selectedEnglish.value,
      correct: true,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0
    }
    
    connections.value.push(connection)
    
    // 计算连线坐标
    nextTick(() => {
      updateConnectionCoordinates(connection)
    })
    
    // 标记为已匹配
    matchedWords.value.push(selectedChinese.value)
    
    ElMessage({
      message: '匹配正确！',
      type: 'success',
      duration: 1500
    })
    
    // 检查是否全部匹配完成
    if (matchedWords.value.length === words.value.length) {
      setTimeout(() => {
        ElMessage({
          message: '🎉 所有单词都匹配完成！',
          type: 'success'
        })
        
        // 2秒后重置所有连线状态
        setTimeout(() => {
          resetMemoryMode()
        }, 2000)
      }, 500)
    }
  } else {
    // 错误匹配 - 显示临时红色连线
    const tempConnection = {
      id: Date.now(),
      chineseId: selectedChinese.value,
      englishId: selectedEnglish.value,
      correct: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0
    }
    
    connections.value.push(tempConnection)
    
    // 计算连线坐标
    nextTick(() => {
      updateConnectionCoordinates(tempConnection)
    })
    
    ElMessage({
      message: '匹配错误，请重试',
      type: 'error',
      duration: 1500
    })
    
    // 1秒后移除错误的连线
    setTimeout(() => {
      const index = connections.value.findIndex(c => c.id === tempConnection.id)
      if (index !== -1) {
        connections.value.splice(index, 1)
      }
    }, 1000)
  }
  
  // 重置选择状态
  selectedChinese.value = null
  selectedEnglish.value = null
}

// 更新连线坐标
const updateConnectionCoordinates = (connection: any) => {
  if (!connectionCanvas.value) return
  
  const chineseElement = document.querySelector(`[data-chinese-id="${connection.chineseId}"]`)
  const englishElement = document.querySelector(`[data-english-id="${connection.englishId}"]`)
  
  if (chineseElement && englishElement) {
    const canvasRect = connectionCanvas.value.getBoundingClientRect()
    const chineseRect = chineseElement.getBoundingClientRect()
    const englishRect = englishElement.getBoundingClientRect()
    
    // 左侧是英语，右侧是汉语
    // x1: 英语元素的右边中点，x2: 汉语元素的左边中点
    connection.x1 = englishRect.right - canvasRect.left
    connection.y1 = englishRect.top + englishRect.height / 2 - canvasRect.top
    connection.x2 = chineseRect.left - canvasRect.left
    connection.y2 = chineseRect.top + chineseRect.height / 2 - canvasRect.top
    
    // 强制触发响应式更新
    const index = connections.value.findIndex(c => c.id === connection.id)
    if (index !== -1) {
      connections.value[index] = { ...connection }
    }
  }
}

// 重置速记模式
const resetMemoryMode = () => {
  initializeMemoryMode()
  ElMessage({
    message: '🔄 速记模式已重置，开始新一轮挑战！',
    type: 'info'
  })
}

// 记忆模式相关方法
// 刷新记忆模式单词
const refreshMemoryWords = async () => {
  try {
    const params = {
      pageNum: memoryWordCount.value,
      conditions: {},
      orderBy: { random: true }
    }
    
    const res = await request.post('http://localhost:8000/api/englishwords/get', params)
    
    if (res.code === 200 && res.result?.list?.length > 0) {
      // 根据重复次数生成单词列表
      const originalList = res.result.list
      const repeatedList: Word[] = []
      for (let i = 0; i < memoryRepeatCount.value; i++) {
        repeatedList.push(...originalList.map((w: Word) => ({ ...w })))
      }
      // 打乱顺序
      memoryWordList.value = repeatedList.sort(() => Math.random() - 0.5)
      currentMemoryIndex.value = 0
    } else {
      memoryWordList.value = []
      ElMessage.warning('暂无单词数据')
    }
  } catch (error) {
    console.error('获取记忆模式单词失败:', error)
    ElMessage.error('获取单词失败')
  }
}

// 上一个单词
const prevMemoryWord = () => {
  if (currentMemoryIndex.value > 0) {
    currentMemoryIndex.value--
  }
}

// 下一个单词
const nextMemoryWord = () => {
  if (currentMemoryIndex.value < memoryWordList.value.length - 1) {
    currentMemoryIndex.value++
  }
}

// 删除当前单词（从数组移除，不调接口）
const removeMemoryWord = () => {
  if (memoryWordList.value.length === 0) return
  
  const removedWord = memoryWordList.value[currentMemoryIndex.value]
  memoryWordList.value.splice(currentMemoryIndex.value, 1)
  
  // 调整索引
  if (currentMemoryIndex.value >= memoryWordList.value.length && memoryWordList.value.length > 0) {
    currentMemoryIndex.value = memoryWordList.value.length - 1
  }
  
  ElMessage.success(`已移除: ${removedWord.english}`)
}
</script>

<style scoped>
.english-word-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding:20px;
  background-color: #faf8f5;
  color: #1a1a1a;
}

.tab-header {
  padding: 10px 20px 0;
}

.glass-header {
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
  margin-bottom: 16px;
}

.mode-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.mode-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.mode-tabs :deep(.el-tabs__item) {
  color: #6b6560;
  font-size: 16px;
  font-weight: 500;
  padding: 0 30px;
  height: 50px;
  line-height: 50px;
}

.mode-tabs :deep(.el-tabs__item.is-active) {
  color: #8b9a6d;
}

.mode-tabs :deep(.el-tabs__active-bar) {
  background: #8b9a6d;
  height: 3px;
  border-radius: 2px;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap:20px;
}

.left-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cards-container {
  position: relative;
  width: 300px;
  height: 200px;
}

.word-card {
  width: 300px;
  height: 200px;
  background: linear-gradient(145deg, #ffffff, #f5f3f0);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid #e8e4df;
}

.word-card.removing {
  animation: slideOut 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes slideOut {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2) rotate(-5deg);
  }
  100% {
    transform: translateX(-1000px) rotate(0deg) scale(1);
  }
}

.word-english {
  font-size: 30px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.word-chinese {
  font-size: 30px;
  color: #6b6560;
}

.right-panel {
  flex: 1;
  padding: 20px;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  margin: 0 16px 16px 0;
}

.btn-div {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  background: #fff;
  border-bottom: 1px solid #e8e4df;
  height: 70px;
  align-items: center;
  border-radius: 12px;
  margin: 0 16px 16px 16px;
}

.input-area {
  width: 100%;
  min-height: 200px;
  font-size: 50px;
  line-height: 1.6;
  margin-bottom: 15px;
}



:deep(.el-textarea__inner) {
  font-size: 49px !important;
  line-height: 1.6 !important;
  min-height: 200px !important;
  padding: 12px !important;
  border-radius: 10px;
}

:deep(.el-input-number.el-input-number--large) {
  height: 40px;
  line-height: 40px;
}

:deep(.el-input-number__decrease),
:deep(.el-input-number__increase) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #666;
  padding: 15px;
  background: #f5f3f0;
  border-radius: 8px;
  margin-bottom: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-weight: 500;
}

.stat-value {
  font-weight: bold;
  color: #8b9a6d;
  font-size: 16px;
}

.completion-message {
  text-align: center;
  padding: 20px;
  background: #8b9a6d;
  color: white;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
}

.correct-word {
  margin: 15px 0;
  padding: 12px;
  background-color: #fef0f0;
  border-left: 4px solid #e8686a;
  border-radius: 4px;
  font-size: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.correct-word .word {
  font-weight: bold;
  color: #e8686a;
  margin-left: 5px;
}

/* 速记模式样式 */
.memory-mode-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

.chinese-list,
.english-list {
  flex: 1;
  padding: 20px;
  max-height: 100%;
  overflow-y: auto;
}

.list-title {
  font-size: 20px;
  font-weight: bold;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 15px;
  padding: 10px;
  background: #fff;
  border-radius: 8px;
}

.memory-word-item {
  padding: 16px 20px;
  margin: 8px 0;
  height: 100px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 35px;
  font-weight: bold;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.memory-word-item:hover {
  background: #faf8f5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.memory-word-item.selected {
  background: #8b9a6d;
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(139, 154, 109, 0.4);
}

.memory-word-item.matched {
  background: #8b9a6d;
  color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.8;
  border-color: transparent;
  text-decoration: line-through;
}

.connection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.connection-svg {
  width: 100%;
  height: 100%;
}

.correct-line {
  stroke: #8b9a6d;
  stroke-width: 3;
  opacity: 0.8;
}

.incorrect-line {
  stroke: #e8686a;
  stroke-width: 3;
  opacity: 0.8;
  stroke-dasharray: 5,5;
}

/* 记忆模式样式 */
.memory-main {
  flex-direction: column;
}

.memory-config-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  background: #fff;
  border-radius: 12px;
}

.config-label {
  font-size: 14px;
  color: #6b6560;
  font-weight: 500;
}

.memory-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap:20px;
}

.memory-left-panel {
  width:30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: #fff;
  border-radius: 20px;
}

.memory-word-card {
  width: 100%;
  min-height: 250px;
  background: linear-gradient(145deg, #ffffff, #f5f3f0);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.memory-word-english {
  font-size: 48px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 20px;
}

.memory-word-chinese {
  font-size: 32px;
  color: #6b6560;
  margin-bottom: 20px;
}

.memory-progress {
  font-size: 16px;
  color: #999;
}

.memory-empty {
  font-size: 18px;
  color: #999;
}

.memory-actions {
  display: flex;
  gap: 20px;
  margin-top: 30px;
}

.memory-right-panel {
  flex: 1;
  padding: 30px;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
}

.memory-sentence-title {
  font-size: 20px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #8b9a6d;
}

.memory-sentence-content {
  font-size: 24px;
  line-height: 1.8;
  color: #333;
}

.memory-sentence-empty {
  font-size: 18px;
  color: #999;
  text-align: center;
  margin-top: 50px;
}

/* Element Plus 按钮主题覆盖 */
:deep(.el-button--primary) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  border-radius: 10px;
}

:deep(.el-button--primary:hover) {
  background-color: #7a895c;
  border-color: #7a895c;
}

:deep(.el-button--success) {
  background-color: #67c23a;
  border-color: #67c23a;
  border-radius: 10px;
}

:deep(.el-button--success:hover) {
  background-color: #5cb32f;
  border-color: #5cb32f;
}

:deep(.el-button--danger) {
  background-color: #e8686a;
  border-color: #e8686a;
  border-radius: 10px;
}

:deep(.el-button--danger:hover) {
  background-color: #d8585a;
  border-color: #d8585a;
}

:deep(.el-button--warning) {
  background-color: #e6a23c;
  border-color: #e6a23c;
  border-radius: 10px;
}

:deep(.el-button--warning:hover) {
  background-color: #d4a03c;
  border-color: #d4a03c;
}

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

<template>
  <div class="quiz-container">
    <el-page-header @back="goBack" :content="directoryName" />
    <div class="quiz-content" >
      <div class="top-toolbar">
        <div class="toolbar-actions">
          <el-button class="add-material-btn" type="primary" size="small" @click="openAddQuestionDialog">
            <el-icon><Plus /></el-icon> 新增题目
          </el-button>
          <el-button class="knowledge-btn" size="small" @click="openKnowledgeDialog">
            <el-icon><Reading /></el-icon> 知识点
          </el-button>
        </div>
        <div class="progress-bar">
          <span class="progress-text">题目 {{ currentIndex + 1 }} / {{ questions.length }}</span>
          <el-progress :percentage="progressPercent" :show-text="false" />
        </div>
      </div>

      <div class="quiz-main" v-if="questions.length > 0 && currentQuestion">
        <div class="quiz-left">
          <el-card class="question-card">
            <template #header>
              <div class="question-header">
                <div class="header-left">
                  <el-tag :type="questionTypeTag.type">{{ questionTypeTag.text }}</el-tag>
                  <el-tag v-if="currentQuestionKnowledgeName" type="info" size="small" class="knowledge-tag">{{ currentQuestionKnowledgeName }}</el-tag>
                </div>
                <div class="header-actions">
                  <el-button class="copy-btn" size="small" @click="copyQuestionContent" :title="copySuccess ? '已复制' : '复制题目'">
                    <el-icon :size="18">
                      <Check v-if="copySuccess" style="color: #67c23a;" />
                      <DocumentCopy v-else />
                    </el-icon>
                  </el-button>
                  <div v-if="showAnswer" class="answer-status">
                    <el-icon :class="isCorrect ? 'correct-icon' : 'wrong-icon'">
                      <CircleCheck v-if="isCorrect" />
                      <CircleClose v-else />
                    </el-icon>
                    <span :class="isCorrect ? 'correct-text' : 'wrong-text'">{{ isCorrect ? '答对了！' : '答错了！' }}</span>
                    <span class="correct-answer">正确答案：{{ currentQuestion.correct_answer }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- 题目显示 -->
            <div class="question-title">
              <Latex :content="currentQuestion.title" />
            </div>

            <!-- 选择题选项 -->
            <div v-if="currentQuestion.question_type === 'single' || currentQuestion.question_type === 'multiple'" class="options-list">
              <div v-for="option in optionsList" :key="option.key" class="option-row"
                :class="{ 'selected': currentQuestion.question_type === 'multiple' ? selectedAnswers.has(option.key) : selectedAnswer === option.key, 'correct': showAnswer && isCorrectOption(option.key), 'wrong': showAnswer && isWrongOption(option.key) }">
                <div class="option-item" @click="selectOption(option.key)">
                  <span class="option-key">{{ option.key }}.</span>
                  <span class="option-text">
                    <Latex :content="option.text || ''" />
                  </span>
                  <el-icon v-if="showAnswer && isCorrectOption(option.key)" class="result-icon correct-icon"><CircleCheck /></el-icon>
                  <el-icon v-if="showAnswer && isWrongOption(option.key)" class="result-icon wrong-icon"><CircleClose /></el-icon>
                </div>
              </div>
              <el-button v-if="currentQuestion.question_type === 'multiple' && !showAnswer" class="confirm-btn" @click="confirmMultipleAnswer">确认答案</el-button>
            </div>

            <!-- AI 讲解和下一题 -->
            <div class="ai-explain-section">
              <el-button class="ai-explain-btn" @click="openAIChatDrawer"><el-icon><Cpu /></el-icon> AI讲解</el-button>
              <el-button class="next-question-btn" @click="nextQuestion">下一题 <el-icon><ArrowRight /></el-icon></el-button>
              <el-button class="delete-question-btn" @click="deleteCurrentQuestion"><el-icon><Delete /></el-icon> 删除题目</el-button>
            </div>

            <!-- 答案显示 -->
            <div v-if="showAnswer" class="answer-result">
              <el-divider />
              <div v-if="currentQuestion.explanation" class="explanation-line">
                <strong>解析：</strong>
                <Latex :content="currentQuestion.explanation" />
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：DeepSeek 网页 -->
        <div class="quiz-right">
          <div class="webview-header">
            <el-icon class="webview-icon"><Cpu /></el-icon>
            <span class="webview-title">DeepSeek AI 助手</span>
            <el-button class="webview-refresh-btn" size="small" @click="refreshWebview" title="刷新"><el-icon><Refresh /></el-icon></el-button>
          </div>
          <webview ref="deepseekWebviewRef" class="deepseek-webview" src="https://chat.deepseek.com" allowpopups></webview>
        </div>
      </div>
      <el-empty v-else description="暂无题目" />
    </div>

    <!-- 批量新增题目弹窗 -->
    <el-dialog v-model="addQuestionDialogVisible" title="批量新增数学题目" width="900px" :close-on-click-modal="true" destroy-on-close class="add-question-dialog">
      <div class="add-question-form">
        <div class="form-item editor-row">
          <div class="editor-left">
            <div class="editor-header">
              <span class="editor-label">题目内容（支持批量粘贴）</span>
              <el-button class="copy-format-btn" size="small" text @click="copyQuestionFormatTemplate"><el-icon><DocumentCopy /></el-icon> 复制格式</el-button>
            </div>
            <el-input v-model="newQuestionContent" type="textarea" :rows="18" placeholder="请按格式粘贴题目内容..." />
          </div>
          <div class="editor-right">
            <div class="format-hint">
              <div class="hint-title">格式说明</div>
              <div class="hint-content">
                <pre>【题目】
题干内容... \( x^2 \)
【/题目】
【类型】单选题【/类型】
【选项】
A. \( x \)
B. \( y \)
C. \( z \)
D. \( w \)
【/选项】
【答案】A【/答案】
【解析】解析内容...\( \int_0^1 x dx \)【/解析】

====================

【题目】
题干内容...
【/题目】
【类型】单选题【/类型】
【选项】
A. 选项A
B. 选项B
C. 选项C
D. 选项D
【/选项】
【答案】B【/答案】
【解析】解析内容...【/解析】</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="addQuestionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNewQuestions">保存</el-button>
      </template>
    </el-dialog>

    <!-- 知识点弹窗 -->
    <el-dialog
      v-model="showKnowledgeDialog"
      title="知识点"
      width="700px"
      class="warm-dialog knowledge-dialog"
    >
      <el-tree
        :data="knowledgeTree"
        :props="{ label: 'name', children: 'children' }"
        default-expand-all
        :expand-on-click-node="false"
        node-key="id"
        class="knowledge-tree"
        @node-click="onKnowledgeNodeClick"
      >
        <template #default="{ node, data }">
          <div class="knowledge-node">
            <span class="node-label">{{ data.name }}</span>
            <el-button
              v-if="!data.children || data.children.length === 0"
              class="generate-btn"
              size="small"
              :loading="generatingNodeId === data.id"
              :disabled="generatingNodeId !== null"
              @click.stop="generateQuestions(data)"
            >
              <el-icon v-if="generatingNodeId !== data.id"><Cpu /></el-icon>
              {{ generatingNodeId === data.id ? '出题中...' : 'AI出题' }}
            </el-button>
          </div>
        </template>
      </el-tree>
      <el-empty v-if="knowledgeTree.length === 0" description="暂无知识点" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Check, DocumentCopy, CircleCheck, CircleClose,
  Cpu, ArrowRight, Delete, Refresh, Reading
} from '@element-plus/icons-vue'
import Latex from '../../../components/Latex.vue'

const route = useRoute()
const router = useRouter()
const props = defineProps({
  directoryId: { type: String, required: true }
})

const directoryName = ref('数学')
const questions = ref([])
const currentIndex = ref(0)
const selectedAnswer = ref('')
const selectedAnswers = ref(new Set())
const showAnswer = ref(false)
const copySuccess = ref(false)
const addQuestionDialogVisible = ref(false)
const newQuestionContent = ref('')
const deepseekWebviewRef = ref(null)
const showKnowledgeDialog = ref(false)
const knowledgeTree = ref([])

// 知识点映射表 id -> name
const knowledgeMap = ref(new Map())

// 将扁平知识点列表转为树状结构
const buildTree = (items) => {
  const map = {}
  const roots = []
  for (const item of items) {
    map[item.id] = { ...item, children: [] }
  }
  for (const item of items) {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children.push(map[item.id])
    } else {
      roots.push(map[item.id])
    }
  }
  // 清理空 children 数组
  const clean = (nodes) => {
    for (const node of nodes) {
      if (node.children.length === 0) {
        delete node.children
      } else {
        clean(node.children)
      }
    }
  }
  clean(roots)
  return roots
}

const openKnowledgeDialog = async () => {
  try {
    const points = await window.electronAPI.getKnowledgePoints(parseInt(props.directoryId))
    knowledgeTree.value = buildTree(points)
    showKnowledgeDialog.value = true
  } catch (error) {
    ElMessage.error('加载知识点失败')
    console.error(error)
  }
}

const generatingNodeId = ref<number | null>(null)

const generateQuestions = async (knowledgePoint: any) => {
  generatingNodeId.value = knowledgePoint.id
  try {
    const result = await window.electronAPI.generateQuestionsByKnowledge({
      knowledgeName: knowledgePoint.name,
      directoryId: parseInt(props.directoryId),
      count: 5,
      providerOrder: ['deepseekLocal', 'modelspace', 'deepseek']
    })
    if (result.success && result.questions && result.questions.length > 0) {
      let savedCount = 0
      for (const q of result.questions) {
        const questionData = {
          directory_id: parseInt(props.directoryId),
          knowledge_id: knowledgePoint.id,
          question_type: q.question_type || 'single',
          title: q.title,
          option_a: q.option_a || null,
          option_b: q.option_b || null,
          option_c: q.option_c || null,
          option_d: q.option_d || null,
          option_e: q.option_e || null,
          correct_answer: q.correct_answer,
          explanation: q.explanation || null,
        }
        const saved = await window.electronAPI.addQuestion(questionData)
        if (saved) savedCount++
      }
      ElMessage.success(`已生成并保存 ${savedCount} 道题目`)
      // 刷新题目列表
      await loadQuestions()
    } else {
      ElMessage.error(result.error || 'AI出题失败，请稍后重试')
    }
  } catch (error: any) {
    ElMessage.error('AI出题失败：' + (error.message || '未知错误'))
    console.error(error)
  } finally {
    generatingNodeId.value = null
  }
}

// 当前筛选的知识点ID（null表示显示全部）
const filterKnowledgeId = ref<number | null>(null)

// 点击知识点节点，筛选该知识点下的题目
const onKnowledgeNodeClick = async (data: any) => {
  // 如果是最底层节点，点击后加载该知识点下的题目
  if (!data.children || data.children.length === 0) {
    filterKnowledgeId.value = data.id
    await loadQuestionsByKnowledge(data.id, data.name)
  }
}

// 根据知识点加载题目（应用重复规则）
const loadQuestionsByKnowledge = async (knowledgeId: number, knowledgeName?: string) => {
  try {
    let qs = await window.electronAPI.getQuestionsByKnowledge(knowledgeId)
    qs = qs || []

    const mode = route.query.mode as string
    const count = parseInt(route.query.count as string) || qs.length
    const repeat = parseInt(route.query.repeat as string) || 1

    qs = shuffleArray([...qs])

    if (mode === 'random' && count < qs.length) {
      qs = qs.slice(0, count)
    }

    if (repeat > 1) {
      const baseQuestions = [...qs]
      const repeated: any[] = []
      for (let i = 0; i < repeat; i++) {
        repeated.push(...shuffleArray([...baseQuestions]))
      }
      qs = repeated
    }

    questions.value = qs
    currentIndex.value = 0
    resetAnswer()
    if (knowledgeName) {
      directoryName.value = `${knowledgeName} - 数学`
    }
  } catch (error) {
    console.error('加载知识点题目失败:', error)
    ElMessage.error('加载知识点题目失败')
  }
}

const currentQuestion = computed(() => questions.value[currentIndex.value] || null)

// 当前题目对应的知识点名称（从缓存映射表中查找）
const currentQuestionKnowledgeName = computed(() => {
  const q = currentQuestion.value
  if (q?.knowledge_id && knowledgeMap.value.has(q.knowledge_id)) {
    return knowledgeMap.value.get(q.knowledge_id)
  }
  return ''
})

const progressPercent = computed(() => {
  if (questions.value.length === 0) return 0
  return Math.round(((currentIndex.value + 1) / questions.value.length) * 100)
})

const questionTypeTag = computed(() => {
  const typeMap = {
    single: { type: 'primary', text: '单选题' },
    multiple: { type: 'warning', text: '多选题' },
    judge: { type: 'success', text: '判断题' }
  }
  return typeMap[currentQuestion.value?.question_type] || { type: 'info', text: '未知' }
})

const optionsList = computed(() => {
  if (!currentQuestion.value) return []
  const opts = []
  const keys = ['A', 'B', 'C', 'D', 'E']
  for (const key of keys) {
    const text = currentQuestion.value[`option_${key.toLowerCase()}`]
    if (text) opts.push({ key, text })
  }
  return opts
})

const isCorrect = computed(() => {
  if (!currentQuestion.value || !showAnswer.value) return false
  const correct = currentQuestion.value.correct_answer.split(',').sort().join(',')
  if (currentQuestion.value.question_type === 'multiple') {
    const selected = Array.from(selectedAnswers.value).sort().join(',')
    return selected === correct
  }
  return selectedAnswer.value === correct
})

const selectOption = (key) => {
  if (showAnswer.value) return
  if (currentQuestion.value?.question_type === 'multiple') {
    if (selectedAnswers.value.has(key)) selectedAnswers.value.delete(key)
    else selectedAnswers.value.add(key)
  } else {
    selectedAnswer.value = key
    showAnswer.value = true
  }
}

const confirmMultipleAnswer = () => {
  if (selectedAnswers.value.size === 0) {
    ElMessage.warning('请至少选择一个选项')
    return
  }
  showAnswer.value = true
}

const isCorrectOption = (key) => {
  if (!currentQuestion.value || !showAnswer.value) return false
  return currentQuestion.value.correct_answer.split(',').includes(key)
}

const isWrongOption = (key) => {
  if (!currentQuestion.value || !showAnswer.value) return false
  const correct = currentQuestion.value.correct_answer.split(',')
  if (currentQuestion.value.question_type === 'multiple') {
    return selectedAnswers.value.has(key) && !correct.includes(key)
  }
  return selectedAnswer.value === key && !correct.includes(key)
}

const nextQuestion = () => {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    resetAnswer()
  } else {
    ElMessage.success('已是最后一题')
  }
}

const resetAnswer = () => {
  selectedAnswer.value = ''
  selectedAnswers.value.clear()
  showAnswer.value = false
}

const copyQuestionContent = async () => {
  if (!currentQuestion.value) return
  try {
    let text = currentQuestion.value.title + '\n'
    
    // 添加选项
    const opts = []
    const keys = ['A', 'B', 'C', 'D', 'E']
    for (const key of keys) {
      const optText = currentQuestion.value[`option_${key.toLowerCase()}`]
      if (optText) opts.push(`${key}. ${optText}`)
    }
    if (opts.length > 0) {
      text += '\n' + opts.join('\n') + '\n'
    }
    
    // 添加答案和解析（如果已显示答案）
    if (showAnswer.value) {
      text += `\n正确答案：${currentQuestion.value.correct_answer}`
      if (currentQuestion.value.explanation) {
        text += `\n解析：${currentQuestion.value.explanation}`
      }
    }
    
    await navigator.clipboard.writeText(text)
    copySuccess.value = true
    setTimeout(() => copySuccess.value = false, 2000)
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

const deleteCurrentQuestion = () => {
  ElMessageBox.confirm('确定删除当前题目？', '提示', { type: 'warning' }).then(() => {
    questions.value.splice(currentIndex.value, 1)
    if (currentIndex.value >= questions.value.length) currentIndex.value = Math.max(0, questions.value.length - 1)
    resetAnswer()
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const refreshWebview = () => {
  if (deepseekWebviewRef.value) deepseekWebviewRef.value.reload()
}

const openAIChatDrawer = () => {
  ElMessage.info('AI讲解功能开发中...')
}

const goBack = () => router.push('/')

// 数组随机打乱
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// 打开批量新增题目弹窗
const openAddQuestionDialog = () => {
  addQuestionDialogVisible.value = true
  newQuestionContent.value = ''
}

// 复制格式模板
const copyQuestionFormatTemplate = async () => {
  const template = `【题目】
设函数 \( f(x) \) 连续，且满足 \( \int_0^{x^2} f(t) \, dt = x^2 e^x \)，则 \( f(1) = \)
【/题目】
【类型】单选题【/类型】
【选项】
A. \( e \)
B. \( \frac{3}{2}e \)
C. \( 2e \)
D. \( \frac{1}{2}e \)
【/选项】
【答案】B【/答案】
【解析】两边对 \( x \) 求导得 \( f(x^2) \cdot 2x = 2x e^x + x^2 e^x \)，除以 \( 2x \)（\( x>0 \)）得 \( f(x^2) = e^x + \frac{x}{2} e^x \)，令 \( x=1 \) 得 \( f(1) = e + \frac{1}{2}e = \frac{3}{2}e \)。【/解析】

====================

【题目】
题干内容...
【/题目】
【类型】单选题【/类型】
【选项】
A. 选项A内容
B. 选项B内容
C. 选项C内容
D. 选项D内容
【/选项】
【答案】A【/答案】
【解析】解析内容...【/解析】`
  try {
    await navigator.clipboard.writeText(template)
    ElMessage.success('格式已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

// 中文类型映射
const typeMapping = {
  '单选题': 'single',
  '多选题': 'multiple',
  '判断题': 'judge',
}

// 解析题目块
const parseQuestionBlock = (text) => {
  const titleMatch = text.match(/【题目】\s*([\s\S]*?)\s*【\/题目】/)
  const typeMatch = text.match(/【类型】\s*([\s\S]*?)\s*【\/类型】/)
  const optionsMatch = text.match(/【选项】\s*([\s\S]*?)\s*【\/选项】/)
  const answerMatch = text.match(/【答案】\s*([\s\S]*?)\s*【\/答案】/)
  const explanationMatch = text.match(/【解析】\s*([\s\S]*?)\s*【\/解析】/)

  if (!titleMatch || !answerMatch) return null

  const title = titleMatch[1].trim()
  const rawType = typeMatch?.[1].trim() || '单选题'
  const questionType = typeMapping[rawType] || 'single'
  const answer = answerMatch[1].trim()
  const explanation = explanationMatch?.[1].trim() || ''

  const options = {}
  if (optionsMatch) {
    const optionLines = optionsMatch[1].trim().split('\n')
    for (const line of optionLines) {
      const match = line.match(/^([A-E])\.\s*(.*)$/)
      if (match) options[match[1]] = match[2].trim()
    }
  }

  return {
    directory_id: parseInt(props.directoryId),
    question_type: questionType,
    title,
    option_a: options['A'] || null,
    option_b: options['B'] || null,
    option_c: options['C'] || null,
    option_d: options['D'] || null,
    option_e: options['E'] || null,
    correct_answer: answer,
    explanation,
  }
}

// 保存批量新增的题目
const saveNewQuestions = async () => {
  const text = newQuestionContent.value.trim()
  if (!text) {
    ElMessage.warning('请输入题目内容')
    return
  }

  const blocks = text.split(/={3,}/).map(b => b.trim()).filter(b => b)
  if (blocks.length === 0) {
    ElMessage.warning('未找到有效内容')
    return
  }

  let totalAdded = 0

  try {
    for (const block of blocks) {
      const parsed = parseQuestionBlock(block)
      if (!parsed) {
        ElMessage.warning('部分格式不正确，已跳过')
        continue
      }

      const result = await window.electronAPI.addQuestion(parsed)
      if (result) {
        questions.value.push(result)
        totalAdded++
      } else {
        ElMessage.error('部分题目保存失败')
      }
    }

    ElMessage.success(`成功保存 ${totalAdded} 道题目`)
    addQuestionDialogVisible.value = false
    newQuestionContent.value = ''
  } catch (error) {
    ElMessage.error('保存失败')
    console.error(error)
  }
}

// 加载知识点列表并构建映射表
const loadKnowledgeMap = async () => {
  try {
    const points = await window.electronAPI.getKnowledgePoints(parseInt(props.directoryId))
    const map = new Map()
    for (const point of points) {
      map.set(point.id, point.name)
    }
    knowledgeMap.value = map
  } catch (error) {
    console.error('加载知识点映射表失败:', error)
  }
}

onMounted(() => {
  loadQuestions()
  loadKnowledgeMap()
})

const loadQuestions = async () => {
  try {
    let qs = await window.electronAPI.getQuestions(parseInt(props.directoryId))
    qs = qs || []

    // 处理出题设置参数
    const mode = route.query.mode as string
    const count = parseInt(route.query.count as string) || qs.length
    const repeat = parseInt(route.query.repeat as string) || 1

    // 先随机打乱
    qs = shuffleArray([...qs])

    if (mode === 'random' && count < qs.length) {
      qs = qs.slice(0, count)
    }

    if (repeat > 1) {
      const baseQuestions = [...qs]
      const repeated: any[] = []
      for (let i = 0; i < repeat; i++) {
        repeated.push(...shuffleArray([...baseQuestions]))
      }
      qs = repeated
    }

    questions.value = qs
  } catch (error) {
    console.error('加载题目失败:', error)
    ElMessage.error('加载题目失败')
  }
}
</script>

<style scoped>
.quiz-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

.quiz-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 10px;
}

.top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.add-material-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
}

.add-material-btn:hover {
  background-color: #8b9a6d;
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  margin-left: 20px;
}

.progress-text {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.quiz-main {
  display: flex;
  flex: 1;
  gap: 10px;
  overflow: hidden;
}

.quiz-left {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.quiz-right {
  width: 45%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e8e4df;
  padding-left: 10px;
}

.question-card {
  margin-bottom: 10px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-title {
  font-size: 22px;
  line-height: 1.8;
  margin-bottom: 20px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-row {
  border: 1px solid #e8e4df;
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.option-row:hover {
  border-color: #c4a882;
  background: #faf8f5;
}

.option-row.selected {
  border-color: #8b9a6d;
  background: rgba(139, 154, 109, 0.1);
}

.option-row.correct {
  border-color: #5db872;
  background: rgba(93, 184, 114, 0.1);
}

.option-row.wrong {
  border-color: #e8686a;
  background: rgba(232, 104, 106, 0.1);
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-key {
  font-weight: 600;
  color: #8b9a6d;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  font-size: 20px;
}

.result-icon {
  font-size: 20px;
  margin-left: auto;
}

.result-icon.correct-icon {
  color: #5db872;
}

.result-icon.wrong-icon {
  color: #e8686a;
}

.confirm-btn {
  margin-top: 10px;
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
  margin-left: 0;
}

.confirm-btn:hover {
  background-color: #8b9a6d;
}

.ai-explain-section {
  margin-top: 20px;
  display: flex;
  justify-content: flex-start;
  gap: 12px;
}

.ai-explain-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  transition: all 0.2s ease;
  min-height: 52px;
  height: auto;
  margin-left: 0;
}

.ai-explain-btn:hover {
  background-color: #8b9a6d;
}

.next-question-btn {
  background-color: #c4a882;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
  margin-left: 0;
}

.next-question-btn:hover:not(:disabled) {
  background-color: #c4a882;
}

.next-question-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.delete-question-btn {
  background-color: #F56C6C;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
  margin-left: 0;
}

.delete-question-btn:hover {
  background-color: #f78989;
}

.answer-result {
  margin-top: 20px;
  padding: 16px;
  background: #f5f3f0;
  border-radius: 10px;
}

.explanation-line {
  font-size: 16px;
  line-height: 1.8;
}

.answer-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.correct-text {
  color: #5db872;
  font-weight: 600;
}

.wrong-text {
  color: #e8686a;
  font-weight: 600;
}

.correct-answer {
  color: #8b9a6d;
  font-weight: 600;
}

.webview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid #e8e4df;
}

.webview-title {
  font-weight: 600;
  flex: 1;
}

.deepseek-webview {
  flex: 1;
  width: 100%;
  border: none;
}

/* 新增弹窗样式 */
.add-question-form {
  display: flex;
  flex-direction: column;
}

.editor-row {
  display: flex;
  gap: 20px;
  align-items: stretch;
}

.editor-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.editor-right {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.editor-label {
  font-weight: 600;
  color: #1a1a1a;
}

.format-hint {
  background: #f8f7f5;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 480px;
  max-height: 520px;
}

.hint-title {
  font-weight: 600;
  margin-bottom: 10px;
  color: #1a1a1a;
}

.hint-content {
  flex: 1;
  overflow-y: auto;
}

.hint-content pre {
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: #666;
}

/* 弹窗整体样式统一 */
:deep(.add-question-dialog) {
  border-radius: 16px;
  overflow: hidden;
  padding: 0 !important;
  background: #faf9f7;
}

:deep(.add-question-dialog .el-dialog__header) {
  background: #faf9f7;
  border-bottom: 1px solid #e8e4df;
  padding: 20px 24px;
  margin-right: 0;
}

:deep(.add-question-dialog .el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

:deep(.add-question-dialog .el-dialog__footer) {
  background: #faf9f7;
  border-top: 1px solid #e8e4df;
  padding: 16px 24px;
}

:deep(.add-question-dialog .el-dialog__footer .el-button) {
  min-height: 44px;
  padding: 12px 24px;
  font-size: 15px;
  border-radius: 10px;
}

:deep(.add-question-dialog .el-dialog__footer .el-button--primary) {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

:deep(.add-question-dialog .el-dialog__footer .el-button--primary:hover) {
  background: #333;
  border-color: #333;
}

.add-question-form {
  padding: 20px 24px;
}

.knowledge-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 15px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 44px;
}

.knowledge-btn:hover {
  background-color: #7a895c;
}

:deep(.knowledge-dialog) {
  border-radius: 16px;
  overflow: hidden;
  background: #faf9f7;
}

:deep(.knowledge-dialog .el-dialog__header) {
  background: #faf9f7;
  border-bottom: 1px solid #e8e4df;
  padding: 20px 24px;
  margin-right: 0;
}

:deep(.knowledge-dialog .el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

:deep(.knowledge-dialog .el-dialog__body) {
  padding: 20px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.knowledge-tree {
  background: transparent;
}

:deep(.knowledge-tree .el-tree-node__content) {
  height: 40px;
  border-radius: 8px;
  margin-bottom: 2px;
}

:deep(.knowledge-tree .el-tree-node__content:hover) {
  background: #f5f0e8;
}

:deep(.knowledge-tree .el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(139, 154, 109, 0.12);
}

:deep(.knowledge-tree .el-tree-node__expand-icon) {
  color: #8b9a6d;
}

.knowledge-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  padding-right: 8px;
}

.node-label {
  font-size: 14px;
  color: #1a1a1a;
}

.generate-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 28px;
}

.generate-btn:hover:not(:disabled) {
  background-color: #7a895c;
}

.generate-btn:disabled {
  background-color: #c0c4cc;
  border-color: #c0c4cc;
}
</style>

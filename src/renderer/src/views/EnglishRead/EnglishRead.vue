<template>
  <div class="english-read-container">
    <!-- 左侧区域：题目与选项 -->
    <div class="left-section">
    
      <!-- 题目区域 -->
      <div class="question-section" :style="{ flex: currentQuestionOptions && currentQuestionOptions.length > 0 ? questionFlex : 1 }">
        <div class="section-header">
          <div class="search-container">
            <el-input
              v-model="searchWord"
              placeholder="输入要搜索的单词"
              size="large"
              clearable
              @input="searchInText"
              class="search-input"
            >
            </el-input>
            <el-button-group>
              <el-button size="large" @click="findPreviousMatch" :disabled="contextIndices.length === 0 || currentMatchIndex <= 0">
                <el-icon><ArrowLeft /></el-icon>
              </el-button>
              <el-button size="large" @click="findNextMatch" :disabled="contextIndices.length === 0 || currentMatchIndex >= contextIndices.length - 1">
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </el-button-group>
            <span v-if="contextIndices.length > 0" class="search-results">
              {{ currentMatchIndex + 1 }} / {{ contextIndices.length }}
            </span>
          </div>
          <div class="question-info">
            <el-button
              type="primary"
              size="large"
              @click="openSettingsDialog"
            >
              设置
            </el-button>
            <el-button
              type="primary"
              @click="openAddQuestionDialog"
              size="large"
            >
              <el-icon><Plus /></el-icon>
            </el-button>
            <el-button
              type="primary"
              @click="openQuestionListDialog"
              size="large"
            >
              <el-icon><List /></el-icon>
            </el-button>
            <el-button
              type="primary"
              @click="selectContext"
              size="large"
            >
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
          <div class="translate-content">
            <translate-popup
              :word="selectedWord"
              :visible.sync="translatePopupVisible"
              :contextId="currentQuestion?.id"
            />
          </div>
        </div>

        <div class="question-content" v-if="currentQuestion">
          <div class="question-text">
            <div 
              v-for="(paragraph, pIndex) in processedParagraphs" 
              :key="`p-${pIndex}`"
              class="paragraph"
            >
              <template v-for="(sentence, sIndex) in paragraph.sentences" :key="`s-${pIndex}-${sIndex}`">
                <span 
                  v-for="(word, wIndex) in splitSentenceIntoWords(sentence.text)" 
                  :key="`w-${pIndex}-${sIndex}-${wIndex}`" 
                  class="word-item"
                  :class="{ 'highlighted': isWordHighlightedInParagraph(pIndex, sIndex, wIndex) }"
                  :ref="isActiveMatchInParagraph(pIndex, sIndex, wIndex) ? 'activeMatch' : null"
                  :id="isWordHighlightedInParagraph(pIndex, sIndex, wIndex) ? `word-match-${getMatchIndexInParagraph(pIndex, sIndex, wIndex)}` : null"
                  @click.stop="showTranslatePopup($event, word)"
                >
                  {{ word }}
                </span>
                <el-button 
                  type="primary" 
                  size="large"
                  style="margin:0 12px 12px 12px;"
                  @click="copySentence(sentence.text, sentence.globalIndex)"
                >
                  <template v-if="copiedSentences.has(sentence.globalIndex)">
                    <el-icon><Check /></el-icon>
                  </template>
                  <template v-else>
                    复制
                  </template>
                </el-button>
              </template>
            </div>
          </div>
        </div>
      </div>
      <!-- 选项区域 -->
      <div class="options-section" v-if="currentQuestionOptions && currentQuestionOptions.length > 0" :style="{ flex: optionsFlex }">
        <div class="resize-handle" @mousedown="startResize"></div>
        <div class="options-content">
          <div class="questions-container">
            <div
              class="question-block"
              v-for="(questionOption, questionIndex) in currentQuestionOptions"
              :key="questionIndex"
            >
              <div class="question-number">
                <div class="question-title">
                  <div>{{ questionIndex + 1 }}</div>、
                  <div 
                    v-for="(word, wordIndex) in splitIntoWords(questionOption.questionTitle)"
                    :key="`title-${questionIndex}-${wordIndex}`"
                    class="option-word"
                    @dblclick="fillSearchWord(word)"
                    @click.stop="showTranslatePopup($event, word)"
                  >
                    {{ word }}
                  </div>
                  
                  <el-button 
                    type="primary" 
                    class="copy-btn"
                    size="large"
                    @click="copyQuestionWithContext(questionIndex)"
                  >复制</el-button>
                </div>
              </div>

              <div class="options-list">
                <div
                  class="option-item"
                  v-for="(option, key) in getOptionsForQuestion(questionOption)"
                  :key="`${questionIndex}-${key}`"
                  :class="{ 'deleted-option': isOptionDeleted(questionOption, key) }"
                >
                  <div class="option-delete">
                    <el-icon 
                      @click="toggleDeleteOption(questionOption, key)" 
                      :style="{ 
                        cursor: 'pointer', 
                        marginRight: '10px',
                        color: isOptionDeleted(questionOption, key) ? '#f56c6c' : '#909399',
                        fontSize: '20px',
                        flexShrink: 0
                      }"
                    >
                      <Delete />
                    </el-icon>
                  </div>
                  <div class="option-label">{{ key.toUpperCase() }}.</div>
                  <div class="option-text" :style="{ textDecoration: isOptionDeleted(questionOption, key) ? 'line-through' : 'none' }">
                    <span 
                      v-for="(word, wordIndex) in splitIntoWords(option)"
                      :key="`${questionIndex}-${key}-${wordIndex}`"
                      class="option-word"
                      @dblclick="fillSearchWord(word)"
                      @click.stop="showTranslatePopup($event, word)"
                    >
                      {{ word }}
                    </span>
                  </div>
                </div>
              </div>
              <!-- 选项按钮组 -->
              <div class="option-buttons" style="margin: 15px 0; display: flex; gap: 10px; align-items: center;">
                <el-button 
                  v-for="(option, key) in getOptionsForQuestion(questionOption)" 
                  :key="key"
                  v-show="!isOptionDeleted(questionOption, key)"
                  :type="isOptionSelected(questionIndex, key) ? 'primary' : 'default'" 
                  size="large" 
                  @click="selectOption(questionOption, key)"
                  style="min-width: 60px; height: 45px; font-size: 18px; font-weight: bold;"
                >
                  {{ key.toUpperCase() }}
                </el-button>

                <div class="answer-status">
                  <el-icon v-if="isAnswerCorrect(questionIndex, key) == 'true'" style="color: #f56c6c; font-size: 25px;">
                    <Check />
                  </el-icon>
                  <el-icon v-if="isAnswerCorrect(questionIndex, key) == 'false'" style="color: #f56c6c; font-size: 25px;">
                    <Close />
                  </el-icon>
                </div>
              </div>

              <div class="explainContent">
                <div>
                  <el-button 
                    type="primary" 
                    size="large"
                    @click="toggleExplain(questionIndex)"
                    style="margin-bottom: 10px;"
                  >
                    {{ showExplain[questionIndex] ? '隐藏答案' : '查看答案' }}
                  </el-button>

                  <el-button 
                    type="danger" 
                    size="large"
                    @click="deleteQuestionItem(questionIndex)"
                    style="margin-bottom: 10px; margin-left: 10px;"
                  >
                    删除
                  </el-button>
                </div>
                <div v-if="showExplain[questionIndex]" class="explain-text">
                  {{ getExplainContent(questionIndex) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧区域：网页浏览器 -->
    <div class="right-section" v-show="showWebView">
      <div
        class="webpage-container"
        ref="webpageContainer"
        id="webview-container"
      ></div>
    </div>
  </div>

  <!-- 添加题目弹窗 -->
  <el-dialog
    v-model="addQuestionDialogVisible"
    title="添加阅读理解题目"
    width="50%"
    :style="{marginLeft: '10%', marginRight: 'auto'}"
  >
    <div class="format-example-container">
      <div class="format-example-header">
        <el-button type="primary" @click="copyFormatExample">复制提示词</el-button>
      </div>
      <div class="format-example-content">
        <pre>将这些材料的英语题目按照格式填写：
假设有2道题：
【英语】
【材料】这里是材料内容...【/材料】
【题目1】 
【题目】这里是题目内容...【/题目】
【选项a】选项A内容...【/选项a】
【选项b】选项B内容...【/选项b】
【选项c】选项C内容...【/选项c】
【选项d】选项D内容...【/选项d】
【答案】【/答案】
【解析】【/解析】
【/题目1】
【/英语】
=================================================================================================
【英语】
【材料】这里是材料内容...【/材料】
【题目1】 
【题目】这里是题目内容...【/题目】
【选项a】选项A内容...【/选项a】
【选项b】选项B内容...【/选项b】
【选项c】选项C内容...【/选项c】
【选项d】选项D内容...【/选项d】
【答案】【/答案】
【解析】【/解析】
【/题目1】
【/英语】</pre>
      </div>
    </div>
    <el-form>
      <el-form-item>
        <el-input
          v-model="addQuestionForm.content"
          type="textarea"
          :rows="8"
          placeholder="请按照格式填写题目"
        ></el-input>
      </el-form-item>
    </el-form>
    <div class="add-count">
      <el-form-item label="保存次数">
        <el-input-number 
          v-model="addQuestionForm.saveCount" 
          :min="1" 
          :max="100"
          placeholder="输入保存次数"
          style="width: 200px;"
        />
        <span style="margin-left: 10px; color: #909399; font-size: 14px;">
          题目将被保存 {{ addQuestionForm.saveCount || 2 }} 次
        </span>
      </el-form-item>
    </div>
    <template #footer>
      <span class="dialog-footer" style="display: flex; justify-content: center; width: 100%;">
        <el-button @click="addQuestionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 题目列表弹窗 -->
  <el-dialog
    v-model="questionListDialogVisible"
    title="阅读理解题目列表"
    width="50%"
    :style="{marginLeft: '10%', marginRight: 'auto'}"
  >
    <el-table
      :data="questionListData"
      stripe
      style="width: 100%"
      v-loading="tableLoading"
      height="500"
    >
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="context" label="材料预览" show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.context ? scope.row.context.substring(0, 100) + '...' : '无内容' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240">
        <template #default="scope">
          <el-button size="large" type="primary" @click="selectQuestionById(scope.row.id)" style="margin-right: 10px">选择</el-button>
          <el-button size="large" type="danger" @click="deleteQuestion(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <span class="dialog-footer" style="display: flex; justify-content: center; width: 100%;">
        <el-button @click="questionListDialogVisible = false">关闭</el-button>
      </span>
    </template>
  </el-dialog>
  
  <!-- 翻译弹窗 -->
  

  <!-- 单词列表对话框 -->
  <el-dialog
    v-model="wordListDialogVisible"
    title="列表"
    width="50%"
    :close-on-click-modal="true"
    :title-style="{fontSize: '28px'}"
    :style="{marginLeft: '10%', marginRight: 'auto'}"
  >
    <div class="mode-selector">
      <el-radio-group v-model="wordListMode" size="large">
        <el-radio-button label="list">列表模式</el-radio-button>
        <el-radio-button label="spelling">拼写模式</el-radio-button>
      </el-radio-group>
    </div>
    
    <!-- 列表模式 -->
    <div v-if="wordListMode === 'list'" class="word-list-container">
      <div class="word-list-header">
        <div class="word-column">英语单词</div>
        <div class="word-column">翻译</div>
      </div>
      <div class="word-list-body">
        <div v-for="(word, index) in articleWords" :key="index" class="word-list-row">
          <div class="word-column">{{ word.english }}</div>
          <div class="word-column">{{ word.chinese }}</div>
        </div>
      </div>
    </div>
    
    <!-- 拼写模式 -->
    <div v-else class="english-word-container">
      <!-- 左侧单词卡片区域 -->
      <div class="left-panel">
        <div class="cards-container" ref="cardsContainer">
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
      </div>

      <!-- 右侧输入区域 -->
      <div class="right-panel">
        <div class="btn-div">
          <el-button @click="resetWords" type="primary" size="large">
            重置单词
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
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="wordListDialogVisible = false">关闭</el-button>
      </span>
    </template>
  </el-dialog>
  
  <!-- 设置弹窗 -->
  <el-dialog
    v-model="settingsDialogVisible"
    title="功能设置"
    width="50%"
    :close-on-click-modal="true"
    :style="{marginLeft: '10%', marginRight: 'auto'}"
  >
    <div class="settings-container">
      <div>
        <el-button
          type="primary"
          @click="openWordListDialog"
          size="large"
          style="margin: 5px; width: 180px;"
        >
          对应单词列表
        </el-button>
      </div>
      <div>
        <el-button
          type="primary"
          @click="openWordListDialog"
          size="large"
          style="margin: 5px; width: 180px;"
        >
          批量添加内容
        </el-button>
      </div>
      <div style="display: flex; align-items: center; ">
        <div style="margin-right: 10px;">显示右侧网页</div>
        <el-switch
          v-model="showWebView"
        />
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="margin-right: 10px; min-width: 100px;">选择网站</div>
        <el-select
          v-model="selectedWebsite"
          placeholder="选择网站"
          @change="loadSelectedWebsite"
          style="flex: 1;"
        >
          <el-option
            v-for="site in websites"
            :key="site.value"
            :label="site.label"
            :value="site.value"
          >
          </el-option>
        </el-select>
      </div>
    </div>
    
    <template #footer>
      <span class="dialog-footer" style="display: flex; justify-content: center; width: 100%;">
        <el-button @click="settingsDialogVisible = false">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script>
import TranslatePopup from '../../components/TranslatePopup.vue';
import request from '@/utils/request';
import { Delete, Check, Close, ArrowLeft, ArrowRight, Refresh, Plus, List } from '@element-plus/icons-vue';

export default {
  name: "EnglishRead",
  components: {
    TranslatePopup,
    Delete,
    Check,
    Close,
    ArrowLeft,
    ArrowRight,
    Refresh,
    Plus,
    List
  },
  data() {
    return {
      currentQuestionIndex: 0,
      selectedWebsite: 'doubao',
      browserViewCreated: false,
      viewId: 'english-read-browser',
      searchWord: '',
      contextIndices: [],
      currentMatchIndex: -1,
      addQuestionDialogVisible: false,
      questionListDialogVisible: false,
      showWebView: true, // 控制右侧webview显示状态，默认显示
      tableLoading: false,
      questionListData: [],
      addQuestionForm: {
        content: '',
        saveCount: 5,
      },
      
      // 翻译弹窗相关数据
      selectedWord: '',
      translatePopupVisible: false,
      popupPosition: { x: 0, y: 0 },

      // 网站选项
      websites: [
        {
          label: '豆包',
          value: 'doubao',
          url: 'https://www.doubao.com'
        },
        {
          label: 'DeepSeek',
          value: 'deepseek',
          url: 'https://www.deepseek.com'
        }
      ],

      // 英语阅读材料数据
      englishreads: [],
      // 选项数据
      options: [],

      // 单词列表弹窗相关数据
      wordListDialogVisible: false,
      articleWords: [],
      optionsFlex: 1,
      questionFlex: 1,
      isResizing: false,
      startY: 0,
      startHeight: 0,
      wordListMode: 'list', // 新增：单词列表模式
      words: [], // 新增：拼写模式下的单词数组
      inputText: '', // 新增：拼写模式下的输入文本
      showEnglish: true, // 新增：控制显示英语或汉语
      showChinese: true, // 新增：控制显示英语或汉语
      removingIndex: -1, // 新增：正在移除的卡片索引
      completedCount: 0, // 新增：已完成单词数量
      correctWord: '', // 新增：正确单词
      cardStyles: new Map(), // 极速：卡片样式缓存
      // 删除选项相关数据
      deletedOptions: [], // 存储被删除的选项
      currentTranslation: '', // 新增：当前翻译内容
      settingsDialogVisible: false, // 新增：设置弹窗可见性
      copiedSentences: new Set(), // 新增：存储已复制的句子索引
      // 选项选中状态
      selectedOptions: {}, // 存储选项的选中状态，格式为 {questionIndex_optionKey: true}
      // 答题结果
      answerResults: {}, // 存储答题结果，格式为 {questionIndex: {isCorrect: boolean, selectedOption: string}}
      // 解析显示状态
      showExplain: {}, // 存储解析显示状态，格式为 {questionIndex: boolean}
    };
  },

  computed: {
    currentQuestion() {
      return this.englishreads[this.currentQuestionIndex];
    },

    currentQuestionOptions() {
      const optionData = this.options.find(option => option.questionId === this.currentQuestion?.id);
      return optionData ? optionData.questions : [];
    },

    // 将当前问题文本处理成单词数组
    processedQuestionText() {
      if (!this.currentQuestion) return [];
      
      // 首先按照换行符分割成段落
      const paragraphs = this.currentQuestion.context.split('\n');
      
      // 然后对每个段落进行处理
      return paragraphs.map(paragraph => {
        // 如果段落为空，返回一个空数组
        if (!paragraph.trim()) return [];
        
        // 将段落分割成单词
        return paragraph.split(/(\s+)/).filter(word => word !== '');
      });
    },

    // 将文本按段落和句子处理
    processedParagraphs() {
      if (!this.currentQuestion) return [];
      
      // 首先按换行符分割成段落
      const paragraphs = this.currentQuestion.context.split('\n');
      let globalSentenceIndex = 0;
      
      return paragraphs.map((paragraph, pIndex) => {
        if (!paragraph.trim()) {
          return { sentences: [] };
        }
        
        // 在每个段落内按句号分割句子
        const parts = paragraph.split('.');
        const sentences = [];
        
        for (let i = 0; i < parts.length - 1; i++) {
          const sentence = parts[i].trim();
          if (sentence) {
            sentences.push({
              text: sentence + '.',
              localIndex: i,
              globalIndex: globalSentenceIndex++
            });
          }
        }
        
        // 处理最后一部分（如果没有句号结尾）
        const lastPart = parts[parts.length - 1].trim();
        if (lastPart) {
          sentences.push({
            text: lastPart,
            localIndex: parts.length - 1,
            globalIndex: globalSentenceIndex++
          });
        }
        
        return { sentences };
      });
    }
  },

  methods: {
    // 打开单词列表对话框
    async openWordListDialog() {
      // 跳转到英语单词页面，并传递当前文章ID作为参数
      if (this.currentQuestion?.id) {
        this.wordListDialogVisible = true
        await this.fetchArticleWords()
        // 加载拼写模式的单词数据
        this.loadWords()
      } else {
        this.$message.warning('请先选择一篇文章');
      }
    },
    
    // 获取文章相关单词
    async fetchArticleWords() {
      if (!this.currentQuestion?.id) return
      
      try {
        const params = {
          conditions: {
            contextId: this.currentQuestion.id
          }
        }
        
        const res = await request.post('http://localhost:8000/api/englishwords/get', params)
        
        if (res.code === 200 && res.result && res.result.list) {
          this.articleWords = res.result.list
        } else {
          this.$message.warning('获取单词列表失败')
          this.articleWords = []
        }
      } catch (error) {
        console.error('获取单词列表失败:', error)
        this.$message.error('获取单词列表失败，请检查网络连接')
        this.articleWords = []
      }
    },
    
    // 显示翻译弹窗
    showTranslatePopup(event, word) {
      // 清除标点符号
      const cleanWord = word.replace(/[.,?!;:()"'\-]/g, '').trim();
      if (!cleanWord) return;
      
      // 设置弹窗位置
      this.popupPosition = {
        x: event.clientX,
        y: event.clientY
      };
      
      // 设置选中的单词并显示弹窗
      this.selectedWord = cleanWord;
      this.translatePopupVisible = true;
      
      // 点击页面其他地方关闭弹窗
      this.$nextTick(() => {
        const closePopup = (e) => {
          const popup = document.querySelector('.translate-popup');
          if (popup && !popup.contains(e.target)) {
            this.translatePopupVisible = false;
            document.removeEventListener('click', closePopup);
          }
        };
        
        setTimeout(() => {
          document.addEventListener('click', closePopup);
        }, 100);
      });
    },
    
    // 获取指定题目的选项
    getOptionsForQuestion(questionOption) {
      return {
        a: questionOption.aItem,
        b: questionOption.bItem,
        c: questionOption.cItem,
        d: questionOption.dItem
      };
    },

    // 上一题
    previousQuestion() {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--;
      }
    },

    // 下一题
    nextQuestion() {
      if (this.currentQuestionIndex < this.englishreads.length - 1) {
        this.currentQuestionIndex++;
      }
    },

    // 跳转到指定题目
    goToQuestion(index) {
      if (index >= 0 && index < this.englishreads.length) {
        this.currentQuestionIndex = index;
      }
    },

    // 获取容器的位置和尺寸
    getContainerBounds() {
      const container = this.$refs.webpageContainer;
      if (!container) {
        console.error("找不到容器");
        return null;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.error("容器尺寸无效");
        return null;
      }

      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    },

    // 更新 BrowserView 的位置和大小
    updateBrowserViewBounds() {
      if (!this.browserViewCreated) return;

      const bounds = this.getContainerBounds();
      if (bounds) {
        this.$ipc.send("update-browser-view-bounds", {
          viewId: this.viewId,
          bounds: bounds,
        });
      }
    },

    // 初始化 BrowserView
    initBrowserView() {
      setTimeout(() => {
        const bounds = this.getContainerBounds();
        if (bounds) {
          this.$ipc.send("create-browser-view", {
            viewId: this.viewId,
            bounds: bounds,
          });

          this.$ipc.once("browser-view-ready", () => {
            this.$ipc.send("load-url", {
              viewId: this.viewId,
              url: 'https:www.doubao.com',
              bounds: this.getContainerBounds(),
            });

            
            this.browserViewCreated = true;
          });
        }
      }, 300);
    },

    // 加载选中的网站
    loadSelectedWebsite() {
      const selectedSite = this.websites.find(site => site.value === this.selectedWebsite);
      if (selectedSite && this.browserViewCreated) {
        console.log("loadSelectedWebsite");
        this.$ipc.send("load-url", {
          viewId: this.viewId,
          url: selectedSite.url,
          bounds: this.getContainerBounds(),
        });
      }
    },

    // 搜索文本中的单词
    searchInText() {
      // 清空之前的搜索结果
      this.contextIndices = [];
      this.currentMatchIndex = -1;

      if (!this.searchWord.trim()) return;

      const searchTerm = this.searchWord.trim().toLowerCase();
      
      // 遍历所有段落、句子和单词，找到匹配项
      this.processedParagraphs.forEach((paragraph, pIndex) => {
        paragraph.sentences.forEach((sentence, sIndex) => {
          const words = this.splitSentenceIntoWords(sentence.text);
          words.forEach((word, wIndex) => {
            // 移除单词中的标点符号等进行比较
            const cleanWord = word.replace(/[.,?!;:()"'\-]/g, '').toLowerCase();
            if (cleanWord === searchTerm) {
              this.contextIndices.push({ pIndex, sIndex, wIndex });
            }
          });
        });
      });

      // 如果找到匹配项，定位到第一个
      if (this.contextIndices.length > 0) {
        this.currentMatchIndex = 0;
        this.$nextTick(() => {
          // 确保DOM更新后再滚动
          this.scrollToActiveMatch();
          
          // 如果第一次尝试失败，再次尝试（保险措施）
          setTimeout(() => {
            if (this.contextIndices.length > 0) {
              this.scrollToActiveMatch();
            }
          }, 300);
        });
      }
    },

    // 查找下一个匹配项
    findNextMatch() {
      if (this.contextIndices.length === 0) return;
      
      if (this.currentMatchIndex < this.contextIndices.length - 1) {
        this.currentMatchIndex++;
        this.$nextTick(() => {
          this.scrollToActiveMatch();
        });
      }
    },

    // 查找上一个匹配项
    findPreviousMatch() {
      if (this.contextIndices.length === 0) return;
      
      if (this.currentMatchIndex > 0) {
        this.currentMatchIndex--;
        this.$nextTick(() => {
          this.scrollToActiveMatch();
        });
      }
    },

    // 判断单词是否需要高亮显示（保留原方法以兼容）
    isWordHighlighted(pIndex, wIndex) {
      return this.contextIndices.some(match => match.pIndex === pIndex && match.wIndex === wIndex);
    },

    // 判断是否是当前激活的匹配项（保留原方法以兼容）
    isActiveMatch(pIndex, wIndex) {
      if (this.currentMatchIndex === -1 || this.contextIndices.length === 0) return false;
      const activeMatch = this.contextIndices[this.currentMatchIndex];
      return activeMatch.pIndex === pIndex && activeMatch.wIndex === wIndex;
    },

    // 获取匹配项的索引（保留原方法以兼容）
    getMatchIndex(pIndex, wIndex) {
      return this.contextIndices.findIndex(match => match.pIndex === pIndex && match.wIndex === wIndex);
    },

    // 滚动到当前激活的匹配项
    scrollToActiveMatch() {
      if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.contextIndices.length) {
        const elementId = `word-match-${this.currentMatchIndex}`;
        const element = document.getElementById(elementId);
        
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } 
        else if (this.$refs.activeMatch && this.$refs.activeMatch[0]) {
          this.$refs.activeMatch[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        } 
        else {
          setTimeout(() => {
            const retryElement = document.getElementById(elementId);
            if (retryElement) {
              retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (this.$refs.activeMatch && this.$refs.activeMatch[0]) {
              this.$refs.activeMatch[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100); // 延迟100毫秒再次尝试
        }
      }
    },

    // 打开添加题目弹窗
    openAddQuestionDialog() {
      this.addQuestionDialogVisible = true;
      this.addQuestionForm.content = '';
      this.addQuestionForm.saveCount = 5;
    },

    // 保存题目
    async submit() {
      try {
        if (!this.addQuestionForm.content.trim()) {
          this.$message.warning('请输入题目内容');
          return;
        }

        const parsedData = this.parseQuestionContent(this.addQuestionForm.content);
        if (parsedData.length === 0) {
          this.$message.warning('解析题目内容错误，检查格式是否正确');
          return;
        }
        // 获取保存次数
        const saveCount = this.addQuestionForm.saveCount || 1;
        
        // 根据保存次数复制题目数据
        let dataToSave = [];
        for (let i = 0; i < saveCount; i++) {
          dataToSave = dataToSave.concat(JSON.parse(JSON.stringify(parsedData)));
        }
        // 调用接口保存题目
        const response = await this.$axios.post('http://localhost:8000/api/englishRead/add', dataToSave);
        
        if (response.data.code === 200) {
          this.$message.success(`题目添加成功（已保存 ${saveCount} 次）`);
          this.addQuestionDialogVisible = false;
          // 添加成功后可以刷新题目列表
          this.fetchQuestions();
        } else {
          this.$message.error(response.data.message || '添加失败');
        }
      } catch (error) {
        this.$message.error('添加题目异常: ' + (error.message || '未知错误'));
      }
    },

    // 解析题目内容
    parseQuestionContent(content) {
      const result = [];
      const readings = content.split('=================================================================================================');
      for (let i = 0; i < readings.length; i++) {
        const readingContent = readings[i].trim();
        
        // 跳过空内容
        if (!readingContent) continue;
        
        // 检查是否包含英语标记
        if (!readingContent.includes('【英语】')) continue;
        
        // 提取材料内容
        const materialRegex = /【材料】([\s\S]*?)【\/材料】/;
        const materialMatch = readingContent.match(materialRegex);
        
        if (!materialMatch) continue;
        
        const context = materialMatch[1].trim();
        
        // 创建阅读对象
        const reading = {
          context,
          questions: []
        };
        
        // 提取所有题目
        const questionRegex = /【题目\d+】([\s\S]*?)【\/题目\d+】/g;
        const questionMatches = [...readingContent.matchAll(questionRegex)];
        
        for (const match of questionMatches) {
          const questionContent = match[1];
          
          // 提取题目标题
          const titleRegex = /【题目】([\s\S]*?)【\/题目】/;
          const titleMatch = questionContent.match(titleRegex);
          
          if (!titleMatch) continue;
          
          // 提取选项
          const optionARegex = /【选项a】([\s\S]*?)【\/选项a】/;
          const optionBRegex = /【选项b】([\s\S]*?)【\/选项b】/;
          const optionCRegex = /【选项c】([\s\S]*?)【\/选项c】/;
          const optionDRegex = /【选项d】([\s\S]*?)【\/选项d】/;
          const answerRegex = /【答案】([\s\S]*?)【\/答案】/;
          const explainRegex = /【解析】([\s\S]*?)【\/解析】/;
          
          const optionAMatch = questionContent.match(optionARegex);
          const optionBMatch = questionContent.match(optionBRegex);
          const optionCMatch = questionContent.match(optionCRegex);
          const optionDMatch = questionContent.match(optionDRegex);
          const answerMatch = questionContent.match(answerRegex);
          const explainMatch = questionContent.match(explainRegex);
          
          if (!optionAMatch || !optionBMatch || !optionCMatch || !optionDMatch || !answerMatch || !explainMatch) continue;
          
          // 创建题目对象
          const question = {
            question: titleMatch[1].trim(),
            aItem: optionAMatch[1].trim(),
            bItem: optionBMatch[1].trim(),
            cItem: optionCMatch[1].trim(),
            dItem: optionDMatch[1].trim(),
            answer: answerMatch[1].trim(),
            explain: explainMatch[1].trim(),
          };

          console.log('保存题目 解析',explainMatch[1].trim())
          
          reading.questions.push(question);
        }
        
        if (reading.questions.length > 0) {
          result.push(reading);
        }
      }
      
      return result;
    },

    // 打开题目列表弹窗
    openQuestionListDialog() {
      this.questionListDialogVisible = true;
      this.fetchQuestionList();
    },

    // 获取题目列表用于弹窗展示
    async fetchQuestionList() {
      try {
        this.tableLoading = true;
        const response = await this.$axios.post('http://localhost:8000/api/englishRead/list',{});
        if (response.data.code === 200) {
          this.questionListData = response.data.result.list;
          console.log('获取题目列表成功:', this.questionListData);
        } else {
          this.$message.warning(response.data.message || '获取题目列表失败');
        }
      } catch (error) {
        console.error('获取题目列表失败', error);
        this.$message.error('获取题目列表失败: ' + (error.message || '未知错误'));
      } finally {
        this.tableLoading = false;
      }
    },

    // 选择题目
    selectQuestion(id) {
      const questionIndex = this.englishreads.findIndex(q => q.id === id);
      if (questionIndex !== -1) {
        this.currentQuestionIndex = questionIndex;
        this.questionListDialogVisible = false;
        this.$message.success('已切换到选中题目');
        
        // 如果没有选项，重置flex比例
        this.resetFlexIfNoOptions();
      } else {
        // 如果当前题目列表中没有找到，需要先加载题目
        this.loadQuestionById(id);
      }
    },
    
    // 重置flex比例（如果没有选项）
    resetFlexIfNoOptions() {
      if (!this.currentQuestionOptions || this.currentQuestionOptions.length === 0) {
        // 如果没有选项，重置为默认值
        this.questionFlex = 1;
        this.optionsFlex = 1;
        
        // 移除直接设置在DOM上的样式
        const questionSection = document.querySelector('.question-section');
        if (questionSection) {
          questionSection.style.flex = '';
        }
      }
    },
    
    // 通过ID选择题目并加载详细数据
    async selectQuestionById(id) {
      try {
        const response = await this.$axios.get(`http://localhost:8000/api/englishRead/detail/${id}`);
        if (response.data.code === 200 && response.data.data) {
          // 处理返回的题目数据
          const questionData = response.data.data;
          
          // 检查是否已存在该题目
          const existingIndex = this.englishreads.findIndex(q => q.id === questionData.id);
          
          if (existingIndex !== -1) {
            // 如果已存在，直接切换到该题目
            this.currentQuestionIndex = existingIndex;
          } else {
            // 如果不存在，添加到列表
            this.englishreads.push({
              id: questionData.id,
              context: questionData.context
            });
            
            // 添加题目选项
            if (questionData.questions && questionData.questions.length > 0) {
              this.options.push({
                questionId: questionData.id,
                questions: questionData.questions.map(q => ({
                  questionTitle: q.question,
                  ...q,
                }))
              });
            }
            
            // 跳转到新加载的题目
            this.currentQuestionIndex = this.englishreads.length - 1;
          }
          
          // 检查是否有选项，如果没有则重置flex比例
          this.$nextTick(() => {
            this.resetFlexIfNoOptions();
          });
          
          this.$message.success('题目已加载');
          this.questionListDialogVisible = false;
        } else {
          this.$message.warning(response.data.message || '加载题目失败');
        }
      } catch (error) {
        console.error('加载题目失败', error);
        this.$message.error('加载题目失败: ' + (error.message || '未知错误'));
      } 
    },

    async selectContext() {
      try {
        // 清空答题状态
        this.answerResults = {};
        this.selectedOptions = {};
        
        const response = await this.$axios.get('http://localhost:8000/api/englishRead/get');
        
        if (response.data.code === 200 && response.data.data) {
          // 处理返回的题目数据
          const questionData = response.data.data;
          
          // 添加题目到英语阅读材料列表
          const existingIndex = this.englishreads.findIndex(q => q.id === questionData.id);
          
          if (existingIndex !== -1) {
            // 如果已存在，直接切换到该题目
            this.currentQuestionIndex = existingIndex;
            this.$message.success('已切换到随机阅读材料');
          } else {
            // 如果不存在，添加到列表
            this.englishreads.push({
              id: questionData.id,
              context: questionData.context
            });
            
            // 添加题目选项
            if (questionData.questions && questionData.questions.length > 0) {
              this.options.push({
                questionId: questionData.id,
                questions: questionData.questions.map(q => ({
                  questionTitle: q.question,
                  ...q
                }))
              });
            }
            
            // 跳转到新加载的题目
            this.currentQuestionIndex = this.englishreads.length - 1;
            this.$message.success('随机阅读材料已加载');
          }
          
          // 检查是否有选项，如果没有则重置flex比例
          this.$nextTick(() => {
            this.resetFlexIfNoOptions();
          });
          
        } else {
          this.$message.warning(response.data.message || '获取随机阅读材料失败');
        }
      } catch (error) {
        console.error('获取随机阅读材料失败', error);
        this.$message.error('获取随机阅读材料失败: ' + (error.message || '未知错误'));
      }
    },

    // 通过ID加载题目
    async loadQuestionById(id) {
      try {
        const response = await this.$axios.get(`http://localhost:8000/api/englishRead/detail/${id}`);
        if (response.data.code === 200 && response.data.data) {
          // 处理返回的题目数据
          const questionData = response.data.data;
          
          // 添加题目到英语阅读材料列表
          this.englishreads.push({
            id: questionData.id,
            context: questionData.context
          });
          
          // 添加题目选项
          if (questionData.questions && questionData.questions.length > 0) {
            this.options.push({
              questionId: questionData.id,
              questions: questionData.questions.map(q => ({
                questionTitle: q.question,
                ...q
              }))
            });
          }
          
          // 跳转到新加载的题目
          this.currentQuestionIndex = this.englishreads.length - 1;
          
          // 检查是否有选项，如果没有则重置flex比例
          this.$nextTick(() => {
            this.resetFlexIfNoOptions();
          });
          
          this.questionListDialogVisible = false;
          this.$message.success('题目已加载');
        } else {
          this.$message.warning(response.data.message || '加载题目失败');
        }
      } catch (error) {
        console.error('加载题目失败', error);
        this.$message.error('加载题目失败: ' + (error.message || '未知错误'));
      }
    },

    // 获取题目列表
    async fetchQuestions() {
      try {
        const response = await this.$axios.post('http://localhost:8000/api/englishRead/list', {});
        if (response.data.code === 200) {
          // 处理返回的题目数据
          this.processQuestions(response.data.result.list);
          
          // 检查是否有选项，如果没有则重置flex比例
          this.$nextTick(() => {
            this.resetFlexIfNoOptions();
          });
        }
      } catch (error) {
        console.error('获取题目列表失败', error);
        this.$message.error('获取题目列表失败: ' + (error.message || '未知错误'));
      }
    },
    
    // 删除题目
    async deleteQuestion(id) {
      try {
        const response = await this.$axios.delete(`http://localhost:8000/api/englishRead/delete/${id}`);
        if (response.data.code === 200) {
          this.$message.success('删除成功');
          // 刷新题目列表
          this.fetchQuestionList();
          
          // 如果删除的是当前正在查看的题目，则需要重新加载题目列表
          const currentIndex = this.englishreads.findIndex(q => q.id === id);
          if (currentIndex !== -1) {
            this.englishreads.splice(currentIndex, 1);
            this.options = this.options.filter(o => o.questionId !== id);
            
            if (this.englishreads.length === 0) {
              // 如果没有题目了，重新获取题目
              this.fetchQuestions();
            } else if (this.currentQuestionIndex >= this.englishreads.length) {
              // 如果当前索引超出范围，则设置为最后一个题目
              this.currentQuestionIndex = this.englishreads.length - 1;
              
              // 检查是否有选项，如果没有则重置flex比例
              this.$nextTick(() => {
                this.resetFlexIfNoOptions();
              });
            }
          }
        } else {
          this.$message.warning(response.data.message || '删除题目失败');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除题目失败', error);
          this.$message.error('删除题目失败: ' + (error.message || '未知错误'));
        }
      }
    },

    // 处理题目数据
    processQuestions(data) {
      // 处理API返回的数据，转换为组件需要的格式
      if (!data || data.length === 0) {
        return;
      }

      // 将API返回的数据转换为组件需要的格式
      this.englishreads = data.map(item => ({
        id: item.id,
        context: item.context
      }));

      // 清空选项数据
      this.options = [];

      // 对每个材料加载对应的题目
      data.forEach(item => {
        this.loadQuestionOptions(item.id);
      });

      // 默认显示第一题
      this.currentQuestionIndex = 0;
    },

    // 加载题目选项
    async loadQuestionOptions(contextId) {
      try {
        const response = await this.$axios.get(`http://localhost:8000/api/englishRead/detail/${contextId}`);
        if (response.data.code === 200 && response.data.data) {
          const questionData = response.data.data;
          
          // 添加题目选项
          if (questionData.questions && questionData.questions.length > 0) {
            this.options.push({
              questionId: questionData.id,
              questions: questionData.questions.map(q => ({
                questionTitle: q.question,
                ...q
              }))
            });
          }
        }
      } catch (error) {
        console.error(`加载题目选项失败 (contextId: ${contextId})`, error);
      }
    },

    // 将文本拆分成单词
    splitIntoWords(text) {
      if (!text) return [];
      return text.split(/(\s+)/).filter(word => word !== '');
    },

    // 将句子拆分成单词
    splitSentenceIntoWords(sentence) {
      if (!sentence) return [];
      return sentence.split(/(\s+)/).filter(word => word !== '');
    },

    // 复制句子到剪贴板
    copySentence(sentenceText, sentenceIndex) {
      try {
        navigator.clipboard.writeText(sentenceText).then(() => {
          this.$message.success(`第 ${sentenceIndex + 1} 句已复制到剪贴板`);
          // 添加句子索引到已复制集合中
          this.copiedSentences.add(sentenceIndex);
          
          // 2秒后自动恢复为复制按钮
          setTimeout(() => {
            this.copiedSentences.delete(sentenceIndex);
          }, 2000);
        }).catch(err => {
          console.error('复制失败:', err);
          this.$message.error('复制失败，请手动复制');
          
          // 备用复制方法
          this.fallbackCopy(sentenceText);
        });
      } catch (error) {
        console.error('复制过程出错:', error);
        this.$message.error('复制失败，请稍后重试');
      }
    },

    // 判断段落中句子的单词是否需要高亮显示
    isWordHighlightedInParagraph(pIndex, sIndex, wIndex) {
      if (!this.searchWord.trim()) return false;
      
      const searchTerm = this.searchWord.trim().toLowerCase();
      const paragraph = this.processedParagraphs[pIndex];
      if (!paragraph || !paragraph.sentences[sIndex]) return false;
      
      const sentence = paragraph.sentences[sIndex];
      const words = this.splitSentenceIntoWords(sentence.text);
      const word = words[wIndex];
      if (!word) return false;
      
      const cleanWord = word.replace(/[.,?!;:()"'\-]/g, '').toLowerCase();
      return cleanWord === searchTerm;
    },

    // 判断是否是当前激活的匹配项（段落模式）
    isActiveMatchInParagraph(pIndex, sIndex, wIndex) {
      if (this.currentMatchIndex === -1 || this.contextIndices.length === 0) return false;
      const activeMatch = this.contextIndices[this.currentMatchIndex];
      return activeMatch.pIndex === pIndex && activeMatch.sIndex === sIndex && activeMatch.wIndex === wIndex;
    },

    // 获取段落中匹配项的索引
    getMatchIndexInParagraph(pIndex, sIndex, wIndex) {
      return this.contextIndices.findIndex(match => 
        match.pIndex === pIndex && match.sIndex === sIndex && match.wIndex === wIndex
      );
    },
    
    // 双击单词填充到搜索框
    fillSearchWord(word) {
      // 移除单词中的标点符号等
      this.searchWord = word.replace(/[.,?!;:()"'\-]/g, '');
      // 自动触发搜索
      this.searchInText();
    },

    // 打开添加单词弹窗
    openAddArticleWordDialog() {
      this.$emit('open-add-article-word-dialog');
    },

    // 复制格式示例
    copyFormatExample() {
      const example = `将这些材料的英语题目按照格式填写：
假设有2道题：
【英语】
【材料】这里是材料内容...【/材料】
【题目1】 
【题目】这里是题目内容...【/题目】
【选项a】选项A内容...【/选项a】
【选项b】选项B内容...【/选项b】
【选项c】选项C内容...【/选项c】
【选项d】选项D内容...【/选项d】
【答案】【/答案】
【解析】【/解析】
【/题目1】
【/英语】
=================================================================================================
【英语】
【材料】这里是材料内容...【/材料】
【题目1】 
【题目】这里是题目内容...【/题目】
【选项a】选项A内容...【/选项a】
【选项b】选项B内容...【/选项b】
【选项c】选项C内容...【/选项c】
【选项d】选项D内容...【/选项d】
【答案】【/答案】
【解析】【/解析】
【/题目1】
【/英语】`;
      navigator.clipboard.writeText(example).then(() => {
        this.$message.success('格式示例已复制到剪贴板');
      }).catch(err => {
        console.error('复制失败:', err);
        this.$message.error('复制失败，请手动复制');
      });
    },
    
    // 复制题目和材料到剪贴板
    copyQuestionWithContext(questionIndex) {
      if (!this.currentQuestion || !this.currentQuestionOptions) {
        this.$message.warning('没有可复制的内容');
        return;
      }
      
      try {
        // 获取材料内容
        const context = this.currentQuestion.context || '';
        
        // 获取当前题目
        const questionOption = this.currentQuestionOptions[questionIndex];
        if (!questionOption) {
          this.$message.warning('题目数据不完整');
          return;
        }
        
        // 构建复制内容
        let copyContent = `${context}\n\n`;
        copyContent += `${questionOption.questionTitle}\n`;
        copyContent += `A、${questionOption.aItem}\n`;
        copyContent += `B、${questionOption.bItem}\n`;
        copyContent += `C、${questionOption.cItem}\n`;
        copyContent += `D、${questionOption.dItem}\n`;
        copyContent += `这道题选什么\n`;
        
        // 复制到剪贴板
        navigator.clipboard.writeText(copyContent).then(() => {
          this.$message.success('题目和材料已复制到剪贴板');
        }).catch(err => {
          console.error('复制失败:', err);
          this.$message.error('复制失败，请手动复制');
          
          // 备用复制方法
          this.fallbackCopy(copyContent);
        });
      } catch (error) {
        console.error('复制过程出错:', error);
        this.$message.error('复制失败，请稍后重试');
      }
    },
    
    // 备用复制方法
    fallbackCopy(text) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
          this.$message.success('题目和材料已复制到剪贴板');
        } else {
          this.$message.error('复制失败，请手动复制');
        }
      } catch (err) {
        this.$message.error('复制失败，请手动复制');
      }
    },
    
    // 开始调整大小
    startResize(event) {
      this.isResizing = true;
      this.startY = event.clientY;
      
      // 获取当前options-section的高度
      const optionsSection = event.target.parentElement;
      this.startHeight = optionsSection.getBoundingClientRect().height;
      
      // 添加事件监听
      document.addEventListener('mousemove', this.doResize);
      document.addEventListener('mouseup', this.stopResize);
      
      // 添加禁止选择文本的样式
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
    },
    
    // 执行调整大小
    doResize(event) {
      if (!this.isResizing) return;
      
      const deltaY = this.startY - event.clientY;
      const leftSection = document.querySelector('.left-section');
      const questionSection = document.querySelector('.question-section');
      
      if (leftSection && questionSection) {
        const totalHeight = leftSection.getBoundingClientRect().height;
        const newOptionsHeight = this.startHeight + deltaY;
        const newQuestionHeight = totalHeight - newOptionsHeight;
        
        // 设置最小高度限制
        const minHeight = 100;
        if (newOptionsHeight < minHeight || newQuestionHeight < minHeight) return;
        
        // 计算新的flex比例
        const newOptionsFlex = newOptionsHeight / totalHeight;
        const newQuestionFlex = newQuestionHeight / totalHeight;
        
        this.optionsFlex = newOptionsFlex;
        this.questionFlex = newQuestionFlex;
      }
    },
    
    // 停止调整大小
    stopResize() {
      this.isResizing = false;
      
      // 移除事件监听
      document.removeEventListener('mousemove', this.doResize);
      document.removeEventListener('mouseup', this.stopResize);
      
      // 恢复正常样式
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    },

    // 拼写模式相关方法
    async loadWords() {
      if (!this.currentQuestion?.id) {
        this.$message.warning('请先选择一篇文章');
        return;
      }
      try {
        const params = {
          conditions: {
            contextId: this.currentQuestion.id
          }
        }
        const res = await request.post('http://localhost:8000/api/englishwords/get', params)
        if (res.code === 200 && res.result && res.result.list && res.result.list.length > 0) {
          this.words = [...res.result.list];
          this.completedCount = 0;
          this.correctWord = '';
          this.inputText = '';
          this.removingIndex = -1;
          
          // 清除样式缓存
          this.cardStyles.clear();
          
          // 初始化显示设置
          this.showChinese = true;
          this.showEnglish = false;
          
          // 随机排序单词
          this.shuffleWords();
        } else {
          this.$message.warning('没有找到相关单词，请先添加单词')
          this.words = []
        }
      } catch (error) {
        console.error('获取单词列表失败:', error)
        this.$message.error('获取单词列表失败，请检查网络连接')
        this.words = []
      }
    },
    
    // 随机排序单词
    shuffleWords() {
      for (let i = this.words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.words[i], this.words[j]] = [this.words[j], this.words[i]];
      }
    },

    resetWords() {
      if (this.words.length === 0) {
        // 如果没有单词，重新加载
        this.loadWords();
        return;
      }
      
      // 清除样式缓存
      this.cardStyles.clear();
      
      // 重新随机排序单词
      this.shuffleWords();
      
      // 重置状态
      this.inputText = '';
      this.completedCount = 0;
      this.correctWord = '';
      this.removingIndex = -1;
      
      this.$message.success('单词已重置');
    },

    // 动画结束处理
    onAnimationEnd() {
      if (this.removingIndex !== -1) {
        // 从单词列表中移除该卡片
        if (this.words.length > 0) {
          const removedWord = this.words[this.removingIndex];
          // 从样式缓存中移除该卡片样式
          if (removedWord) {
            this.cardStyles.delete(removedWord.id);
          }
          
          this.words.splice(this.removingIndex, 1);
          this.completedCount++;
          this.removingIndex = -1;
        }
      }
    },

    handleKeydown(event) {
      if (event.key === 'Enter') {
        if (event.altKey) {
          // Alt+Enter 换行，不做任何处理，让默认行为发生
          return
        } else {
          event.preventDefault()
          
          // 如果没有单词了，重置单词
          if (this.words.length === 0) {
            this.resetWords()
            return
          }
          
          // 检查输入的单词是否与顶部卡片匹配
          const topCardWord = this.words[0]?.english || ''
          const userInput = this.inputText.trim().toLowerCase()
          
          if (userInput === topCardWord.toLowerCase()) {
            // 清除正确单词显示
            this.correctWord = ''
            
            // 如果这是最后一张卡片，直接重置单词而不触发动画
            if (this.words.length <= 1) {
              // 移除最后一张卡片
              this.words.splice(0, 1)
              this.completedCount++
              
              // 重置输入框
              this.inputText = ''
            } else {
              // 不是最后一张，正常移除卡片
              this.removingIndex = 0
              
              // 重置输入框
              this.inputText = ''
            }
          } else {
            this.inputText = ''
            // 单词错误，显示错误提示
            this.$message({
              message: `单词拼写错误`,
              type: 'error',
              duration: 2000
            })
            
            // 设置正确单词以显示
            this.correctWord = topCardWord
          }
        }
      }
    },



    getCardStyle(index) {
      const wordId = this.words[index]?.id
      if (!wordId) return {}

      // 如果已经有样式，直接返回
      if (this.cardStyles.has(wordId)) {
        return {
          ...this.cardStyles.get(wordId),
          zIndex: this.words.length - index // 更新层级
        }
      }

      // 生成新的随机样式
      const rotation = (Math.random() - 0.5) * 20 // -10到10度的随机旋转
      const offsetX = (Math.random() - 0.5) * 60 // -30到30px的随机水平偏移
      const offsetY = (Math.random() - 0.5) * 60 // -30到30px的随机垂直偏移
      const zIndex = this.words.length - index // 后面的卡片层级更高

      const style = {
        transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
        zIndex: zIndex
      }

      // 缓存样式
      this.cardStyles.set(wordId, style)
      return style
    },

    // 切换选项删除状态
    toggleDeleteOption(questionOption, optionKey) {
      const questionId = this.currentQuestion?.id;
      if (!questionId) return;
      
      const optionId = `${questionId}-${questionOption.questionTitle}-${optionKey}`;
      
      if (this.isOptionDeleted(questionOption, optionKey)) {
        // 如果选项已被删除，则恢复
        this.deletedOptions = this.deletedOptions.filter(id => id !== optionId);
      } else {
        // 如果选项未被删除，则删除
        this.deletedOptions.push(optionId);
      }
    },
    
    // 判断选项是否被删除
    isOptionDeleted(questionOption, optionKey) {
      const questionId = this.currentQuestion?.id;
      if (!questionId) return false;
      
      const optionId = `${questionId}-${questionOption.questionTitle}-${optionKey}`;
      return this.deletedOptions.includes(optionId);
    },

    // 选择选项
    selectOption(questionOption, key) {
      const questionIndex = this.currentQuestionOptions.indexOf(questionOption);
      const optionKey = `${questionIndex}_${key}`;
      
      // 先取消所有选项的选中状态
      Object.keys(this.selectedOptions).forEach(k => {
        if (k.startsWith(`${questionIndex}_`)) {
          this.selectedOptions[k] = false;
        }
      });
      
      // 选中当前选项
      this.selectedOptions[optionKey] = true;
      const correctAnswer = questionOption.answer; // 获取正确答案
      const isCorrect = key === correctAnswer.toLowerCase()? "true": "false"; // 判断是否选择正确
      
      // 存储答题结果
      this.answerResults[questionIndex] = {
        isCorrect,
        selectedOption: key
      };
    },

    // 打开设置弹窗
    openSettingsDialog() {
      this.settingsDialogVisible = true;
    },

    // 判断选项是否被选中
    isOptionSelected(questionIndex, optionKey) {
      
      const key = `${questionIndex}_${optionKey}`;
      console.log('isOptionSelected=========', questionIndex, optionKey);
      console.log('!!this.selectedOptions[key]=========',!!this.selectedOptions[key]);
      return !!this.selectedOptions[key];
    },

    // 判断答案是否正确
    isAnswerCorrect(questionIndex, optionKey) {
      const result = this.answerResults[questionIndex];
      // 如果当前选项是选中的选项，返回是否正确
      return result?.isCorrect;
    },

    toggleExplain(questionIndex) {
      this.showExplain[questionIndex] = !this.showExplain[questionIndex];
    },

    getExplainContent(questionIndex) {
      console.log('optionData.questions=====',this.options)
      const optionData = this.options.find(option => option.questionId === this.currentQuestion?.id);
      if (!optionData || !optionData.questions[questionIndex]) return '';

      return optionData.questions[questionIndex].explain || '暂无解析';
    },

    async deleteQuestionItem(questionIndex) {
      // 获取当前选项的ID
      const currentQuestion = this.currentQuestionOptions[questionIndex];
      if (!currentQuestion || !currentQuestion.id) {
        this.$message.warning('无法获取选项ID');
        return;
      }
      
      try {
        const response = await this.$axios.delete(`http://localhost:8000/api/englishRead/item/delete/${currentQuestion.id}`);
        if (response.data.code === 200) {
          this.$message.success('删除成功');
          // 从当前题目列表中移除该选项
          this.currentQuestionOptions.splice(questionIndex, 1);
          
          // 如果没有选项了，重置flex比例
          this.resetFlexIfNoOptions();
        } else {
          this.$message.error(response.data.message || '删除失败');
        }
      } catch (error) {
        console.error('删除选项失败', error);
        this.$message.error('删除失败: ' + (error.message || '未知错误'));
      }
      
    },
  },
  
  watch: {
    // 监听当前题目索引变化
    currentQuestionIndex() {
      // 检查是否有选项，如果没有则重置flex比例
      this.$nextTick(() => {
        this.resetFlexIfNoOptions();
      });
      // 切换题目时清空已复制的句子状态
      this.copiedSentences.clear();
    },
    
    // 监听单词列表模式变化
    wordListMode(newMode) {
      if (newMode === 'spelling') {
        // 切换到拼写模式时加载单词数据
        this.loadWords();
      }
    },

    // 监听showWebView变化
    showWebView(newVal) {
      if (this.$refs.webpageContainer) {
        this.$refs.webpageContainer.style.display = newVal ? 'block' : 'none';
      }
      
      if (newVal) {
        // 显示browser view
        this.$ipc.send("show-browser-view", { viewId: this.viewId});
      } else {
        // 隐藏browser view
        this.$ipc.send("hide-browser-view", this.viewId);
      }
    }
  },

  mounted() {
    console.log('英语阅读页面已加载');
    console.log('题目数量:', this.englishreads.length);

    // 初始化BrowserView
    this.initBrowserView();

    // 监听窗口大小变化
    window.addEventListener("resize", this.updateBrowserViewBounds);

    // 添加键盘快捷键监听
    window.addEventListener("keydown", this.handleKeyDown);

    // 获取题目列表
    this.fetchQuestions();

    // 添加窗口调整大小时重置布局的处理
    window.addEventListener("resize", () => {
      this.updateBrowserViewBounds();
      // 如果正在调整大小，则停止
      if (this.isResizing) {
        this.stopResize();
      }
    });
  },

  beforeUnmount() {
    // 清理工作
    window.removeEventListener("resize", this.updateBrowserViewBounds);
    window.removeEventListener("keydown", this.handleKeyDown);
    if (this.browserViewCreated) {
      this.$ipc.send("destroy-browser-view", this.viewId);
      this.browserViewCreated = false;
    }
    
    // 确保清理所有事件监听器
    document.removeEventListener('mousemove', this.doResize);
    document.removeEventListener('mouseup', this.stopResize);
  },
  
  // 添加键盘快捷键处理
  handleKeyDown(event) {
    // 按F3或Ctrl+F触发搜索功能
    if (event.key === 'F3' || (event.ctrlKey && event.key === 'f')) {
      event.preventDefault();
      // 聚焦到搜索框
      const searchInput = document.querySelector('.search-input input');
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    // 按Enter键搜索
    if (event.key === 'Enter' && document.activeElement.closest('.search-input')) {
      this.searchInText();
    }
    
    // 按F3查找下一个
    if (event.key === 'F3' && !event.shiftKey) {
      event.preventDefault();
      this.findNextMatch();
    }
    
    // 按Shift+F3查找上一个
    if (event.key === 'F3' && event.shiftKey) {
      event.preventDefault();
      this.findPreviousMatch();
    }
  }
};
</script>

<style scoped>
.english-read-container {
  height: 100vh;
  display: flex;
  flex-direction: row;
  background-color: #faf8f5;
  overflow: hidden;
  color: #1a1a1a;
}

/* 左侧区域 */
.left-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-right: 10px;
}

/* 右侧区域 */
.right-section {
  width: 600px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 2px solid #e8e4df;
  overflow: hidden;
}

/* 浏览器头部 */
.browser-header {
  padding: 15px;
  background: #f5f3f0;
  border-bottom: 1px solid #e8e4df;
  flex-shrink: 0;
}

/* 网页容器 */
.webpage-container {
  flex: 1;
  background: #fff;
  overflow: hidden;
}

/* 题目区域 - 占50% */
.question-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-bottom: 2px solid #e8e4df;
  overflow: hidden;
  position: relative;
}

/* 选项区域 - 可调整大小 */
.options-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
  position: relative;
}

/* 调整大小的手柄 */
.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  background-color: transparent;
  cursor: ns-resize;
  z-index: 10;
}

.resize-handle:hover {
  background-color: rgba(139, 154, 109, 0.2);
}

/* 区域头部 */
.section-header {
  padding: 15px 20px;
  background: #f5f3f0;
  border-bottom: 1px solid #e8e4df;
  display: flex;
  gap: 20px;
  flex-shrink: 0;
}

.search-container {
  display: flex;
  align-items: center;
  width: 280px;
  gap: 20px;
}

.search-input {
  flex: 1;
}

.search-input :deep(.el-input-group__append) {
  padding: 0;
}

.search-input :deep(.el-button-group .el-button) {
  padding: 8px 10px;
}

.search-results {
  font-size: 14px;
  color: #8b9a6d;
  margin-left: 10px;
  white-space: nowrap;
}

.section-header h3 {
  margin: 0;
  color: #1a1a1a;
  font-size: 30px;
  font-weight: 600;
}

.section-header h4 {
  margin: 0;
  color: #1a1a1a;
  font-size: 30px;
  font-weight: 600;
}

.question-info {
  display: flex;
  align-items: center;
}

.question-info span {
  color: #6b6560;
  font-size: 30px;
}

.answer-actions {
  display: flex;
  gap: 10px;
}

/* 题目内容区域 */
.question-content {
  flex: 1;
  overflow-y: auto;
}

.question-text {
  line-height: 1.8;
  color: #1a1a1a;
  background-color: #faf8f5;
  padding: 20px;
  border-radius: 8px;
}

.paragraph {
  margin-bottom: 16px;
}

.words-container {
  display: flex;
  flex-wrap: wrap;
}

.word-item {
  display: inline-block;
  padding: 0 2px;
  font-size: 30px;
  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  transition: all 0.2s;
  cursor: pointer;
}

.word-item:hover {
  background-color: #f5f3f0;
  border-radius: 3px;
}


.word-item.highlighted {
  background-color: #ffeb3b;
  border-radius: 3px;
  padding: 0 3px;
  box-shadow: 0 0 5px rgba(255, 235, 59, 0.7);
}

.highlighted[ref="activeMatch"] {
  background-color: #8b9a6d;
  color: white;
  font-weight: bold;
  box-shadow: 0 0 8px rgba(139, 154, 109, 0.8);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 8px rgba(139, 154, 109, 0.8); }
  50% { box-shadow: 0 0 12px rgba(139, 154, 109, 1); }
  100% { box-shadow: 0 0 8px rgba(139, 154, 109, 0.8); }
}

.question-text pre {
  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
  font-size: 30px;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  background: none;
  border: none;
  padding: 0;
}

/* 选项内容区域 */
.options-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.questions-container {
  display: flex;
  flex-direction: column;
  gap: 35px;
}

.question-block {
  background: linear-gradient(to bottom, #ffffff, #faf8f5);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e8e4df;
}

.question-number {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e8e4df;
}

.question-number h5 {
  margin: 0 0 8px 0;
  color: #8b9a6d;
  font-size: 30px;
  font-weight: 600;
}

.question-title {
  color: #1a1a1a;
  font-size: 30px;
  line-height: 1.5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-weight: 500;
  position: relative;
}

.question-title > div {
  display: inline-block;
  padding: 0 2px;
}

.question-title .copy-btn {
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  margin: 0;
}

.option-label {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #6b6560;
  margin-right: 12px;
  flex-shrink: 0;
  font-size: 30px;
}

.option-text {
  flex: 1;
  line-height: 1.6;
  color: #1a1a1a;
  font-size: 30px;
  display: flex;
  flex-wrap: wrap;
}

.option-word {
  padding: 0 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-word:hover {
  background-color: #f5f3f0;
  border-radius: 3px;
}

/* 滚动条样式 */
.question-content::-webkit-scrollbar,
.options-content::-webkit-scrollbar {
  width: 6px;
}

.question-content::-webkit-scrollbar-track,
.options-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.question-content::-webkit-scrollbar-thumb,
.options-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.question-content::-webkit-scrollbar-thumb:hover,
.options-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 单词列表样式 */
.word-list-container {
  width: 100%;
  max-height: 500px;
  overflow-y: auto;
  border-radius: 4px;
}

.word-list-header {
  display: flex;
  background-color: #f5f3f0;
  border-bottom: 1px solid #e8e4df;
  font-weight: bold;
  font-size: 30px;
  padding: 15px 0;
}

.word-list-body {
  max-height: 450px;
  overflow-y: auto;
}

.word-list-row {
  display: flex;
  border-bottom: 1px solid #e8e4df;
  transition: background-color 0.3s;
  padding: 15px 0;
  font-size: 30px;
}

.word-list-row:nth-child(even) {
  background-color: #faf8f5;
}

.word-list-row:hover {
  background-color: #f5f3f0;
}

.word-column {
  flex: 1;
  padding: 0 15px;
  display: flex;
  align-items: center;
}

/* 单词列表滚动条样式 */
.word-list-body::-webkit-scrollbar {
  width: 6px;
}

.word-list-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.word-list-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.word-list-body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 格式示例样式 */
.format-example-container {
  margin-bottom: 20px;
  background-color: #faf8f5;
  border-radius: 8px;
  overflow: hidden;
}

.format-example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f3f0;
  border-bottom: 1px solid #e8e4df;
}

.format-example-header span {
  font-size: 28px;
  font-weight: bold;
  color: #8b9a6d;
}

.format-example-content {
  padding: 15px;
  max-height: 300px;
  overflow-y: auto;
}

.format-example-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Courier New', Courier, monospace;
  font-size: 24px;
  line-height: 1.6;
  color: #1a1a1a;
}

/* 模式选择器样式 */
.mode-selector {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

/* 拼写模式样式 */
.english-word-container {
  display: flex;
  height: 500px;
  background: linear-gradient(135deg, #8b9a6d 0%, #a8b88a 100%);
  border-radius: 8px;
  overflow: hidden;
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
  background: linear-gradient(145deg, #ffffff, #faf8f5);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid #e8e4df;
  backdrop-filter: blur(10px);
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -60px;
  margin-left: -100px;
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
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
}

.btn-div {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  height: 40px;
  align-items: center;
}

.input-area {
  width: 100%;
  min-height: 150px;
  font-size: 30px;
  line-height: 1.6;
  margin-bottom: 15px;
}

:deep(.el-textarea__inner) {
  font-size: 30px !important;
  line-height: 1.6 !important;
  min-height: 150px !important;
  padding: 12px !important;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #6b6560;
  padding: 15px;
  background: rgba(0, 0, 0, 0.05);
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
  background: linear-gradient(135deg, #8b9a6d, #a8b88a);
  color: white;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

.correct-word {
  margin: 15px 0;
  padding: 12px;
  background-color: #fff3f3;
  border-left: 4px solid #ff4d4f;
  border-radius: 4px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.correct-word .word {
  font-weight: bold;
  color: #ff4d4f;
  margin-left: 5px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .section-header {
    padding: 10px 15px;
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .question-info {
    justify-content: space-between;
  }

  .answer-actions {
    justify-content: center;
  }

  .question-content,
  .options-content {
    padding: 15px;
  }

  .option-item {
    padding: 12px;
  }

  .option-label {
    width: 35px;
    height: 35px;
    margin-right: 12px;
  }

  .option-text {
    font-size: 30px;
  }

  .questions-container {
    gap: 20px;
  }

  .question-block {
    padding: 15px;
  }

  .question-number h5 {
    font-size: 30px;
  }

  .question-title {
    font-size: 30px;
  }

  .options-list {
    gap: 10px;
  }

  .option-label {
    width: 28px;
    height: 28px;
    font-size: 30px;
    margin-right: 10px;
  }
}

/* 被删除的选项样式 */
.deleted-option .option-text {
  color: #c0c4cc !important;
}

.deleted-option .option-label {
  color: #c0c4cc !important;
}

.explain-text {
  padding: 10px;
  background-color: #faf8f5;
  border-left: 5px solid #8b9a6d;
  font-size: 25px;
}
.settings-container{
  display: flex;
  flex-direction: column;
  gap: 20px;

}
</style>
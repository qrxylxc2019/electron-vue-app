﻿<template>
  <div class="quiz-container">
    <el-page-header @back="goBack" :content="directoryName" />

    <div class="quiz-content" v-if="(questions.length > 0 || articles.length > 0) && currentQuestion">
      <!-- 题目进度 -->
      <div class="progress-bar">
        <span class="progress-text">题目 {{ currentIndex + 1 }} / {{ questions.length }}</span>
        <el-progress :percentage="progressPercent" :show-text="false" />
      </div>

    <!-- 左右布局主体 -->
    <div class="quiz-main">
      <!-- 高项论文模式：左侧显示所有文章列表 -->
      <div v-if="directoryName === '高项论文'" class="article-list-panel">
        <el-card class="article-list-card">
          <template #header>
            <div class="article-list-header">
              <span>文章列表</span>
              <el-tag type="info">{{ allArticles.length }} 篇</el-tag>
            </div>
          </template>
          <div class="article-list">
            <div
              v-for="(article, idx) in allArticles"
              :key="article.id"
              class="article-list-item"
              :class="{ 'active': currentQuestion?.id === article.id }"
              @click="jumpToArticleById(article.id)"
            >
              <span v-if="!isEditingArticleTitle(article.id)" class="article-title">{{ article.title || '无标题' }}</span>
              <el-input
                v-else
                :ref="el => setArticleTitleInputRef(el, article.id)"
                v-model="editingArticleTitles[article.id]"
                size="small"
                class="article-title-input"
                @blur="saveArticleTitle(article.id)"
                @keydown.enter="saveArticleTitle(article.id)"
              />
              <el-button
                v-if="!isEditingArticleTitle(article.id)"
                class="edit-title-btn"
                size="small"
                text
                @click.stop="startEditArticleTitle(article.id, article.title)"
              >
                <el-icon :size="14"><EditPen /></el-icon>
              </el-button>
              <el-button
                v-else
                class="save-title-btn"
                size="small"
                type="primary"
                text
                @click.stop="saveArticleTitle(article.id)"
              >
                <el-icon :size="14"><CircleCheck /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 左侧：题目内容 -->
      <div class="quiz-left">
          <el-card class="question-card">
            <template #header>
              <div class="question-header">
                <el-tag :type="questionTypeTag.type">
                  {{ questionTypeTag.text }}
                </el-tag>
                <div class="header-actions">
                  <el-button
                    class="copy-btn"
                    size="small"
                    @click="copyQuestionContent"
                    :title="copySuccess ? '已复制' : '复制题目'"
                  >
                    <el-icon :size="18">
                      <Check v-if="copySuccess" style="color: #67c23a;" />
                      <DocumentCopy v-else />
                    </el-icon>
                  </el-button>
                  <!-- 答对/答错结果 -->
                  <div v-if="showAnswer" class="answer-status">
                    <el-icon :class="isCorrect ? 'correct-icon' : 'wrong-icon'">
                      <CircleCheck v-if="isCorrect" />
                      <CircleClose v-else />
                    </el-icon>
                    <span :class="isCorrect ? 'correct-text' : 'wrong-text'">
                      {{ isCorrect ? '答对了！' : '答错了！' }}
                    </span>
                    <span class="correct-answer">正确答案：{{ currentQuestion.correct_answer }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div class="question-title markdown-body" v-html="renderMarkdown(currentQuestion.title)"></div>

            <!-- 选择题选项 -->
            <div v-if="currentQuestion.question_type === 'single' || currentQuestion.question_type === 'multiple'" class="options-list">
              <div
                v-for="option in optionsList"
                :key="option.key"
                class="option-row"
                :class="{ 
                  'selected': currentQuestion.question_type === 'multiple' ? selectedAnswers.has(option.key) : selectedAnswer === option.key, 
                  'deleted': option.deleted,
                  'correct': showAnswer && isCorrectOption(option.key),
                  'wrong': showAnswer && isWrongOption(option.key)
                }"
              >
                <div
                  class="delete-btn"
                  @click.stop="toggleDelete(option.key)"
                >
                  <el-icon><Delete /></el-icon>
                </div>
                <div
                  class="option-item"
                  @click="selectOption(option.key)"
                >
                  <span class="option-key">{{ option.key }}.</span>
                  <span class="option-text markdown-body" :class="{ 'strikethrough': option.deleted }" v-html="renderMarkdown(option.text || '')"></span>
                  <!-- 答案对错的图标显示 -->
                  <el-icon v-if="showAnswer && isCorrectOption(option.key)" class="result-icon correct-icon"><CircleCheck /></el-icon>
                  <el-icon v-if="showAnswer && isWrongOption(option.key)" class="result-icon wrong-icon"><CircleClose /></el-icon>
                </div>
              </div>
              <!-- 多选题确认按钮 -->
              <el-button
                v-if="currentQuestion.question_type === 'multiple' && !showAnswer"
                class="confirm-btn"
                @click="confirmMultipleAnswer"
              >
                确认答案
              </el-button>
            </div>

            <!-- 文章题：按段落显示，带隐藏/显示按钮 -->
            <div v-else-if="currentQuestion.question_type === 'write'" class="write-content">
              <div
                v-for="(paragraph, index) in writeParagraphs"
                :key="index"
                class="paragraph-block"
              >
                <div class="paragraph-row">
                  <div
                    class="paragraph-item"
                    :class="{ 'hidden': hiddenParagraphs.has(index) }"
                  >
                    <!-- 显示模式 -->
                    <div v-if="!isEditingParagraph(index)">
                      <p class="paragraph-text markdown-body" v-html="renderMarkdown(paragraph)"></p>
                    </div>
                    <!-- 编辑模式 -->
                    <div
                      v-else
                      :ref="el => setParagraphEditorRef(el, index)"
                      class="paragraph-editor"
                      contenteditable="true"
                      v-html="getParagraphEditHtml(index)"
                      @paste="handleParagraphPaste($event, index)"
                    ></div>
                  </div>
                  <div class="paragraph-actions">
                    <el-button
                      v-if="!isEditingParagraph(index)"
                      class="edit-btn"
                      size="small"
                      @click="startEditParagraph(index)"
                      title="编辑段落"
                    >
                      <el-icon :size="16"><EditPen /></el-icon>
                    </el-button>
                    <el-button
                      v-if="isEditingParagraph(index)"
                      class="save-btn"
                      size="small"
                      type="primary"
                      @click="saveParagraph(index)"
                      title="保存段落"
                    >
                      <el-icon :size="16"><CircleCheck /></el-icon>
                    </el-button>
                    <el-button
                      class="toggle-btn"
                      size="small"
                      @click="toggleParagraph(index)"
                    >
                      {{ hiddenParagraphs.has(index) ? '显示' : '隐藏' }}
                    </el-button>
                  </div>
                </div>
                    <!-- 高项论文手写输入区 -->
                <div v-if="showHandwrite && directoryName === '高项论文'" class="handwrite-area">
                  <el-input
                    v-model="handwriteInputs[index]"
                    type="textarea"
                    :rows="6"
                    :placeholder="`第 ${index + 1} 段手写内容...`"
                    class="handwrite-input"
                  />
                  <!-- 关键词显示区域 -->
                  <div v-if="paragraphKeywords[index]" style="display:none" class="keywords-display">
                    <el-icon><Collection /></el-icon>
                    <span class="keywords-label">记忆关键词：</span>
                    <span class="keywords-content">{{ paragraphKeywords[index] }}</span>
                  </div>
                  <div class="handwrite-actions">
                    <el-button
                      style="display:none"
                      class="ai-keywords-btn"
                      :loading="keywordsLoading[index]"
                      @click="extractParagraphKeywords(index)"
                    >
                      <el-icon><Cpu /></el-icon>
                      AI关键词
                    </el-button>
                    <el-button
                      class="clear-handwrite-btn"
                      size="small"
                      text
                      @click="handwriteInputs[index] = ''"
                    >
                      <el-icon><Delete /></el-icon>
                      清空
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 判断题选项 -->
            <div v-else class="options-list judge-options">
              <div
                v-for="option in judgeOptions"
                :key="option.key"
                class="option-row"
                :class="{ 'selected': selectedAnswer === option.key, 'deleted': option.deleted }"
              >
                <div
                  class="delete-btn"
                  @click.stop="toggleDelete(option.key)"
                >
                  <el-icon><Delete /></el-icon>
                </div>
                <div
                  class="option-item"
                  @click="selectOption(option.key)"
                >
                  <span class="option-text" :class="{ 'strikethrough': option.deleted }">
                    {{ option.text }}
                  </span>
                </div>
              </div>
            </div>

            <!-- AI 讲解按钮和同类题按钮 - 非高项论文科目显示 -->
            <div v-if="directoryName !== '高项论文'" class="ai-explain-section">
              <el-button
                class="ai-explain-btn"
                @click="openAIChatDrawer"
              >
                <el-icon><Cpu /></el-icon>
                AI讲解
              </el-button>
              <el-button
                class="next-question-btn"
                @click="nextQuestion"
              >
                下一题 <el-icon><ArrowRight /></el-icon>
              </el-button>
              
              
              <el-button
                class="similar-btn"
                @click="openSimilarDrawer"
              >
                <el-icon><Collection /></el-icon>
                同类题
                <el-tag v-if="similarCount > 0" type="danger" size="small" class="similar-count">{{ similarCount }}</el-tag>
              </el-button>
              <el-button
                class="delete-question-btn"
                @click="deleteCurrentQuestion"
              >
                <el-icon><Delete /></el-icon> 删除题目
              </el-button>
            </div>

            <!-- 答案显示 -->
            <div v-if="showAnswer" class="answer-result">
              <el-divider />
              <div v-if="currentQuestion.explanation" class="explanation-line markdown-body" v-html="renderMarkdown('**解析：**' + currentQuestion.explanation)"></div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：操作按钮 - 高项论文科目所有按钮都在右侧 -->
        <div class="quiz-right">
          <div class="right-actions">
            <template v-if="directoryName === '高项论文'">
              <el-button
                class="delete-question-btn"
                @click="deleteCurrentQuestion"
              >
                <el-icon><Delete /></el-icon> 删除题目
              </el-button>
              <el-button
                class="add-article-btn"
                type="primary"
                @click="openAddArticleDialog"
              >
                <el-icon><Plus /></el-icon> 新增论文
              </el-button>
              <el-button
                class="handwrite-btn"
                :class="{ 'active': showHandwrite }"
                @click="toggleHandwrite"
              >
                <el-icon><EditPen /></el-icon>
                {{ showHandwrite ? '隐藏手写' : '显示手写' }}
              </el-button>
              <el-button
                class="ai-explain-btn"
                @click="openAIChatDrawer"
              >
                <el-icon><Cpu /></el-icon>
                AI讲解
              </el-button>
              <el-button
                class="next-question-btn"
                @click="nextQuestion"
              >
                下一题 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else :description="isArticleMode ? '暂无文章' : '暂无题目'" />

    <!-- AI 讲解抽屉 -->
    <div
      class="ai-drawer-overlay"
      :class="{ 'show': aiDrawerVisible }"
      @click="closeAIChatDrawer"
    >
      <div
        class="ai-drawer"
        :class="{ 'show': aiDrawerVisible }"
        @click.stop
      >
        <div class="drawer-header">
          <h2>AI讲解</h2>
          <el-icon class="drawer-close" @click="closeAIChatDrawer"><Close /></el-icon>
        </div>
        <div class="drawer-content ai-chat-content" ref="aiChatContentRef" @scroll="handleAIChatScroll">
          <!-- 对话列表 -->
          <div class="chat-messages" ref="aiChatMessagesRef">
            <div
              v-for="(msg, index) in aiChatMessages"
              :key="index"
              class="chat-message"
              :class="msg.role"
            >
              
              <div class="message-bubble">
                <div v-if="msg.provider" class="message-provider">{{ msg.provider }}</div>
                <!-- 用户消息保留换行格式，AI消息使用Markdown渲染 -->
                <div v-if="msg.role === 'user'" class="user-message-text">{{ msg.content }}</div>
                <div v-else class="ai-markdown" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <!-- 正在输入中 v-if="aiLoading"-->
            <div v-if="aiLoading" class="chat-message assistant">
              <div class="message-bubble loading-bubble">
                <el-icon class="is-loading"><Loading /></el-icon>
              </div>
            </div>
            <!-- 错误提示 -->
            <div v-if="aiError" class="chat-message assistant">
              <div class="message-bubble error-bubble">
                <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit;">{{ aiError }}</pre>
              </div>
            </div>
            <!-- AI 回答完毕后的同类题区域 -->
            <div v-if="!aiLoading && aiChatMessages.length > 0 && aiChatMessages[aiChatMessages.length - 1].role === 'assistant'" class="chat-message assistant">
              <div class="message-bubble similar-bubble">
                <!-- 同类题按钮始终显示 -->
                <el-button
                  class="generate-similar-btn"
                  :loading="aiSimilarLoading"
                  @click="generateAISimilarQuestions"
                >
                  <el-icon><Collection /></el-icon>
                  {{ aiSimilarQuestions.length > 0 ? '再来5道同类题' : '同类题（5道）' }}
                </el-button>
                <!-- 同类题卡片 -->
                <div v-if="aiSimilarQuestions.length > 0" class="ai-similar-card">
                  <div class="ai-similar-main">
                    <div class="ai-similar-header">
                      <el-tag :type="aiSimilarCurrentTag.type">{{ aiSimilarCurrentTag.text }}</el-tag>
                      <span class="ai-similar-progress">{{ aiSimilarCurrentIndex + 1 }} / {{ aiSimilarQuestions.length }}</span>
                    </div>
                    <div class="ai-similar-title markdown-body" v-html="renderMarkdown(aiCurrentSimilarQuestion?.title || '')"></div>
                    <div class="ai-similar-options">
                      <div
                        v-for="option in aiSimilarOptionsList"
                        :key="option.key"
                        class="ai-similar-option-row"
                        :class="{
                          'selected': aiSelectedSimilarAnswer === option.key,
                          'deleted': option.deleted,
                          'correct': aiShowSimilarAnswer && aiIsSimilarCorrectOption(option.key),
                          'wrong': aiShowSimilarAnswer && aiIsSimilarWrongOption(option.key)
                        }"
                      >
                        <div class="delete-btn" :class="{ 'is-deleted': option.deleted }" @click.stop="aiToggleDeleteOption(option.key)">
                          <el-icon><Delete /></el-icon>
                        </div>
                        <div class="ai-similar-option" @click="aiSelectSimilarOption(option.key)">
                          <span class="option-key">{{ option.key }}.</span>
                          <span class="option-text">{{ option.text }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="aiShowSimilarAnswer" class="ai-similar-answer">
                      <el-divider />
                      <div class="answer-label">正确答案：{{ aiCurrentSimilarQuestion?.correct_answer }}</div>
                      <div class="answer-explanation markdown-body" v-html="renderMarkdown(aiCurrentSimilarQuestion?.explanation || '')"></div>
                    </div>
                  </div>
                  <div class="ai-similar-actions">
                    <el-button
                      class="nav-btn delete-question-btn"
                      @click="aiDeleteCurrentQuestion"
                    >
                      <el-icon><Delete /></el-icon>
                      删除本题
                    </el-button>
                    <el-button
                      class="nav-btn next-btn"
                      @click="aiNextSimilarQuestion"
                    >
                      {{ aiSimilarCurrentIndex >= aiSimilarQuestions.length - 1 ? '再来一组' : '下一题' }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 底部输入框 -->
        <div class="ai-chat-input-area">
          <div class="input-box">
            <el-input
              v-model="aiUserInput"
              type="textarea"
              :rows="2"
              :placeholder="aiInputPlaceholder"
              class="ai-chat-input"
              @keydown.enter.prevent="sendAIChatMessage"
            />
            <div class="input-toolbar-bottom">
              <!-- 技能按钮 / 取消技能按钮 -->
              <el-button
                v-if="!currentSkill"
                class="skill-btn"
                size="small"
                text
                @click="showSkillList = !showSkillList"
              >
                <el-icon><MagicStick /></el-icon>
                技能
              </el-button>
              <el-button
                v-else
                class="skill-btn cancel-skill-btn"
                size="small"
                text
                type="danger"
                @click="cancelSkill"
              >
                <el-icon><CircleClose /></el-icon>
                取消技能
              </el-button>
              <!-- 技能列表弹出层 -->
              <div v-if="showSkillList" class="skill-popover">
                <div
                  v-for="skill in skillList"
                  :key="skill.key"
                  class="skill-item"
                  @click="handleSkillClick(skill)"
                >
                  <el-icon><component :is="skill.icon" /></el-icon>
                  <div class="skill-info">
                    <div class="skill-name">{{ skill.name }}</div>
                    <div class="skill-desc">{{ skill.desc }}</div>
                  </div>
                </div>
              </div>
              <el-button
                class="ai-send-icon-btn"
                :loading="aiLoading"
                :disabled="!aiUserInput.trim()"
                @click="sendAIChatMessage"
              >
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 同类题抽屉 -->
    <div
      class="similar-drawer-overlay"
      :class="{ 'show': drawerVisible }"
      @click="closeDrawer"
    >
      <div
        class="similar-drawer"
        :class="{ 'show': drawerVisible }"
        @click.stop
      >
        <div class="drawer-header">
          <h2>同类题练习</h2>
          <el-icon class="drawer-close" @click="closeDrawer"><Close /></el-icon>
        </div>
        <div class="drawer-content">
          <div v-if="similarQuestions.length > 0 && currentSimilarQuestion" class="similar-quiz">
            <!-- 进度 -->
            <div class="similar-progress">
              <span>题目 {{ currentSimilarIndex + 1 }} / {{ similarQuestions.length }}</span>
              <el-progress :percentage="similarProgressPercent" :show-text="false" />
            </div>
            <!-- 题目内容 -->
            <div class="similar-quiz-main">
              <el-card class="similar-question-card">
                <template #header>
                  <div class="question-header">
                    <el-tag :type="similarQuestionTypeTag.type">{{ similarQuestionTypeTag.text }}</el-tag>
                  </div>
                </template>
                <div class="question-title markdown-body" v-html="renderMarkdown(currentSimilarQuestion.title)"></div>
                <!-- 选项 -->
                <div class="options-list">
                  <div
                    v-for="option in similarOptionsList"
                    :key="option.key"
                    class="option-row"
                    :class="{
                      'selected': selectedSimilarAnswer === option.key,
                      'deleted': option.deleted,
                      'correct': showSimilarAnswer && isSimilarCorrectOption(option.key),
                      'wrong': showSimilarAnswer && isSimilarWrongOption(option.key)
                    }"
                  >
                    <div class="delete-btn" :class="{ 'is-deleted': option.deleted }" @click.stop="toggleSimilarDeleteOption(option.key)">
                      <el-icon><Delete /></el-icon>
                    </div>
                    <div class="option-item" @click="selectSimilarOption(option.key)">
                      <span class="option-key">{{ option.key }}.</span>
                      <span class="option-text markdown-body" v-html="renderMarkdown(option.text || '')"></span>
                      <el-icon v-if="showSimilarAnswer && isSimilarCorrectOption(option.key)" class="result-icon correct-icon"><CircleCheck /></el-icon>
                      <el-icon v-if="showSimilarAnswer && isSimilarWrongOption(option.key)" class="result-icon wrong-icon"><CircleClose /></el-icon>
                    </div>
                  </div>
                </div>
                <!-- 答案显示 -->
                <div v-if="showSimilarAnswer" class="answer-result">
                  <el-divider />
                  <div class="explanation-line">
                    <strong>正确答案：</strong>{{ currentSimilarQuestion.correct_answer }}
                  </div>
                  <div v-if="currentSimilarQuestion.explanation" class="explanation-line markdown-body" v-html="renderMarkdown('**解析：**' + currentSimilarQuestion.explanation)"></div>
                </div>
              </el-card>
              <!-- 操作按钮 -->
              <div class="similar-actions">
                <el-button class="delete-question-btn" @click="deleteSimilarQuestion">
                  <el-icon><Delete /></el-icon> 删除题目
                </el-button>
                <el-button class="next-question-btn" @click="nextSimilarQuestion">
                  {{ currentSimilarIndex >= similarQuestions.length - 1 ? '再来一组' : '下一题' }}
                </el-button>
              </div>
            </div>
          </div>
          <div v-else-if="similarLoading" class="similar-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>AI 正在生成同类题...</span>
          </div>
          <div v-else class="similar-empty">
            <el-empty description="暂无同类题">
              <template #default>
                <el-button
                  class="generate-similar-btn"
                  :loading="similarLoading"
                  @click="generateSimilarInDrawer"
                >
                  <el-icon><Collection /></el-icon>
                  生成同类题（20道）
                </el-button>
              </template>
            </el-empty>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 新增论文弹窗 -->
  <el-dialog
    v-model="addArticleDialogVisible"
    title="新增论文"
    width="900px"
    :close-on-click-modal="true"
    destroy-on-close
    class="add-article-dialog"
  >
    <div class="add-article-form">
      <div class="form-item">
        <label>论文标题：</label>
        <el-input v-model="newArticleTitle" placeholder="请输入论文标题" />
      </div>
      <div class="form-item">
        <label>论文内容：</label>
        <div
          ref="addArticleEditorRef"
          class="article-editor"
          contenteditable="true"
          v-html="newArticleContent"
          @paste="handleAddArticlePaste"
        ></div>
      </div>
    </div>
    <template #footer>
      <el-button @click="addArticleDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="saveNewArticle">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { marked } from 'marked';
import type { Question, Article, QuestionType, OptionWithState } from '../types';
import { Cpu, Collection, Delete, ArrowRight, Loading, Warning, CircleCheck, CircleClose, Close, Promotion, EditPen, DocumentCopy, Check } from '@element-plus/icons-vue';

const API_ORDER_KEY = 'apiProviderOrder';

// 获取本地缓存的厂商排序
function getProviderOrder(): string[] {
try {
const stored = localStorage.getItem(API_ORDER_KEY);
if (stored) {
return JSON.parse(stored);
}
} catch (e) {
console.error('读取厂商排序失败:', e);
}
return ['deepseekLocal', 'modelspace', 'deepseek'];
}

const props = defineProps<{
  directoryId: string;
}>();

const router = useRouter();
const route = useRoute();
const directoryName = ref('');
const isArticleMode = ref(false);
const questions = ref<Question[]>([]);
const articles = ref<Article[]>([]);
const allArticles = ref<Article[]>([]); // 高项论文模式下所有原始文章数据（用于左侧列表）
const currentIndex = ref(0);
const selectedAnswer = ref<string>('');
const selectedAnswers = ref<Set<string>>(new Set()); // 多选题选中的答案
const showAnswer = ref(false);
const deletedOptions = ref<Set<string>>(new Set());

// 文章题段落隐藏状态
const hiddenParagraphs = ref<Set<number>>(new Set());

// AI 讲解相关状态
const aiDrawerVisible = ref(false);
const aiLoading = ref(false);
const aiError = ref('');
const aiProviderName = ref('');
const aiChatMessages = ref<Array<{role: 'user' | 'assistant'; content: string; provider?: string}>>([]);
const aiUserInput = ref('');
const aiChatContentRef = ref<HTMLDivElement | null>(null);
const aiChatMessagesRef = ref<HTMLDivElement | null>(null);
let aiUnsubscribers: (() => void)[] = [];

// 技能相关状态
const showSkillList = ref(false);
const currentSkill = ref<string>('');
const aiInputPlaceholder = ref('对这道题还有疑问？继续向 AI 提问...');

// 新增论文弹窗状态
const addArticleDialogVisible = ref(false);
const newArticleTitle = ref('');
const newArticleContent = ref('');
const addArticleEditorRef = ref<HTMLDivElement | null>(null);

// 技能列表
const skillList = [
  {
    key: 'similar_questions',
    name: '同类题',
    desc: '根据主题生成同类练习题',
    icon: 'Collection',
    placeholder: '请输入主题，例如：项目风险管理、配置管理...',
  },
];

// 处理技能点击
const handleSkillClick = (skill: typeof skillList[0]) => {
  currentSkill.value = skill.key;
  aiInputPlaceholder.value = skill.placeholder;
  aiUserInput.value = '';
  showSkillList.value = false;
  // 聚焦输入框
  setTimeout(() => {
    const inputEl = document.querySelector('.ai-chat-input textarea') as HTMLTextAreaElement;
    if (inputEl) inputEl.focus();
  }, 100);
};

// 取消技能
const cancelSkill = () => {
  currentSkill.value = '';
  aiInputPlaceholder.value = '对这道题还有疑问？继续向 AI 提问...';
  aiUserInput.value = '';
};

// AI 聊天区域滚动状态
const isUserScrolling = ref(false);
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

// 复制按钮状态
const copySuccess = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

// AI 生成同类题状态
const aiSimilarQuestions = ref<Question[]>([]);
const aiSimilarLoading = ref(false);
const aiSimilarCurrentIndex = ref(0);
const aiSelectedSimilarAnswer = ref('');

// 段落编辑状态
const editingParagraphIndex = ref<number | null>(null);
const paragraphEditorRefs = ref<Record<number, HTMLDivElement>>({});
const paragraphEditContents = ref<Record<number, string>>({});

// 文章标题编辑状态
const editingArticleTitleId = ref<number | null>(null);
const editingArticleTitles = ref<Record<number, string>>({});
const articleTitleInputRefs = ref<Record<number, any>>({});
const aiShowSimilarAnswer = ref(false);
const aiSimilarDeletedOptions = ref<Set<string>>(new Set());

// 手写输入相关状态（默认显示）
const showHandwrite = ref(true);
const handwriteInputs = ref<Record<number, string>>({});

// 段落关键词状态
const paragraphKeywords = ref<Record<number, string>>({});
const keywordsLoading = ref<Record<number, boolean>>({});

// 检测是否在底部（允许 10px 误差）
const isAtBottom = () => {
  if (!aiChatContentRef.value) return true;
  const el = aiChatContentRef.value;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
};

// 处理用户滚动事件
const handleAIChatScroll = () => {
  if (!aiChatContentRef.value) return;
  isUserScrolling.value = true;
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    // 如果用户滚动到了底部，恢复自动定位
    if (isAtBottom()) {
      isUserScrolling.value = false;
    }
  }, 150);
};

// 滚动到对话底部（仅在用户未手动滚动时）
const scrollToBottom = async () => {
  await nextTick();
  if (aiChatContentRef.value && !isUserScrolling.value) {
    aiChatContentRef.value.scrollTop = aiChatContentRef.value.scrollHeight;
  }
};

// Markdown 渲染
const renderMarkdown = (content: string) => {
  return marked.parse(content || '', { async: false }) as string;
};

// 当前题目/文章
const currentQuestion = computed(() => {
  if (isArticleMode.value) {
    // 文章模式：将 Article 转换为 Question 格式
    const article = articles.value[currentIndex.value];
    if (!article) return null;
    return {
      id: article.id,
      directory_id: article.directory_id,
      question_type: 'write' as QuestionType,
      title: article.title,
      option_a: article.content,
      option_b: null,
      option_c: null,
      option_d: null,
      option_e: null,
      correct_answer: article.correct_answer,
      explanation: article.explanation,
      sort_order: article.sort_order,
      created_at: article.created_at,
    } as Question;
  }
  return questions.value[currentIndex.value] || null;
});

// 进度百分比
const progressPercent = computed(() => {
  const total = isArticleMode.value ? articles.value.length : questions.value.length;
  if (total === 0) return 0;
  return ((currentIndex.value + 1) / total) * 100;
});

// 是否答对
const isCorrect = computed(() => {
  if (!currentQuestion.value) return false;
  if (currentQuestion.value.question_type === 'multiple') {
    // 多选题：比较选中的答案和正确答案（排序后比较）
    const correct = currentQuestion.value.correct_answer.split(',').sort().join(',');
    const selected = Array.from(selectedAnswers.value).sort().join(',');
    return correct === selected;
  }
  return selectedAnswer.value === currentQuestion.value.correct_answer;
});

// 题目类型标签
const questionTypeTag = computed(() => {
  if (!currentQuestion.value) return { text: '', type: 'info' };
  switch (currentQuestion.value.question_type) {
    case 'single': return { text: '单选题', type: 'primary' };
    case 'multiple': return { text: '多选题', type: 'warning' };
    case 'judge': return { text: '判断题', type: 'success' };
    case 'write': return { text: '文章题', type: 'info' };
    default: return { text: '选择题', type: 'primary' };
  }
});

// 选择题选项列表
const optionsList = computed<OptionWithState[]>(() => {
  if (!currentQuestion.value || (currentQuestion.value.question_type !== 'single' && currentQuestion.value.question_type !== 'multiple')) return [];
  const q = currentQuestion.value;
  return [
    { key: 'A', text: q.option_a, deleted: deletedOptions.value.has('A') },
    { key: 'B', text: q.option_b, deleted: deletedOptions.value.has('B') },
    { key: 'C', text: q.option_c, deleted: deletedOptions.value.has('C') },
    { key: 'D', text: q.option_d, deleted: deletedOptions.value.has('D') },
    { key: 'E', text: q.option_e, deleted: deletedOptions.value.has('E') },
  ].filter(o => o.text !== null && o.text !== undefined);
});

// 判断题选项（可删除）
const judgeOptions = computed<OptionWithState[]>(() => {
  return [
    { key: '正确', text: '正确', deleted: deletedOptions.value.has('正确') },
    { key: '错误', text: '错误', deleted: deletedOptions.value.has('错误') },
  ];
});

// 文章题段落列表（按换行符分段，支持富文本 HTML 分段）
const writeParagraphs = computed<string[]>(() => {
  if (!currentQuestion.value || currentQuestion.value.question_type !== 'write') return [];
  // 按 option_a 存储文章内容
  const content = currentQuestion.value.option_a || currentQuestion.value.title || '';
  if (!content.trim()) return [];

  // 如果内容是富文本 HTML（包含 <div>、<p> 等块级标签），按块级标签分段
  if (/<(div|p)\b/i.test(content)) {
    const paragraphs: string[] = [];
    // 先按 <div> 分段
    const divParts = content.split(/<div\b[^>]*>/i);
    for (const part of divParts) {
      // 去掉 </div> 标签
      const cleanPart = part.replace(/<\/div>/gi, '').trim();
      if (cleanPart) {
        paragraphs.push(cleanPart);
      }
    }
    // 如果没有 div 分段成功，尝试按 <p> 分段
    if (paragraphs.length === 0) {
      const pParts = content.split(/<p\b[^>]*>/i);
      for (const part of pParts) {
        const cleanPart = part.replace(/<\/p>/gi, '').trim();
        if (cleanPart) {
          paragraphs.push(cleanPart);
        }
      }
    }
    if (paragraphs.length > 0) {
      return paragraphs;
    }
  }

  // 默认按换行符分段
  return content.split(/\n+/).filter(p => p.trim());
});

// 加载数据
const loadData = async () => {
  try {
    const dirId = parseInt(props.directoryId);
    const dirs = await window.electronAPI.getDirectories();
    const dir = dirs.find(d => d.id === dirId);
    if (dir) {
      directoryName.value = dir.name;
    }

    // 判断是否是文章模式（高项论文）
    isArticleMode.value = route.query.isArticle === '1' || dir?.name === '高项论文';

    if (isArticleMode.value) {
      // 文章模式：从 article 表加载
      let arts = await window.electronAPI.getArticles(dirId);
      if (arts.length === 0) {
        ElMessage.warning('该科目暂无文章');
        return;
      }
      // 保存所有原始文章数据用于左侧列表显示
      allArticles.value = [...arts];

      // 处理出题设置参数
      const mode = route.query.mode as string;
      const count = parseInt(route.query.count as string) || arts.length;
      const repeat = parseInt(route.query.repeat as string) || 1;

      // 先随机打乱
      arts = shuffleArray([...arts]);

      if (mode === 'random' && count < arts.length) {
        arts = arts.slice(0, count);
      }

      if (repeat > 1) {
        const baseArticles = [...arts];
        const repeated: Article[] = [];
        for (let i = 0; i < repeat; i++) {
          repeated.push(...shuffleArray([...baseArticles]));
        }
        arts = repeated;
      }

      articles.value = arts;
      questions.value = []; // 清空题目
    } else {
      // 普通模式：从 questions 表加载
      let qs = await window.electronAPI.getQuestions(dirId);
      
      // 处理出题设置参数
      const mode = route.query.mode as string;
      const count = parseInt(route.query.count as string) || qs.length;
      const repeat = parseInt(route.query.repeat as string) || 1;
      
      // 先随机打乱
      qs = shuffleArray([...qs]);
      
      if (mode === 'random' && count < qs.length) {
        // 随机抽取指定数量的题目
        qs = qs.slice(0, count);
      }
      
      if (repeat > 1) {
        // 重复出题：将抽出的题目重复指定次数
        const baseQuestions = [...qs];
        const repeated: Question[] = [];
        for (let i = 0; i < repeat; i++) {
          // 每次重复都重新打乱顺序
          repeated.push(...shuffleArray([...baseQuestions]));
        }
        qs = repeated;
      }
      
      questions.value = qs;
      articles.value = []; // 清空文章
    }
    
    resetState();
  } catch (error) {
    ElMessage.error('加载题目失败');
    console.error(error);
  }
};

// 数组随机打乱
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 重置状态
const resetState = () => {
  currentIndex.value = 0;
  selectedAnswer.value = '';
  showAnswer.value = false;
  deletedOptions.value.clear();
};

// 返回首页
const goBack = () => {
  router.push({ name: 'Home' });
};

// 选择选项
const selectOption = (key: string) => {
  // 如果已删除，不能选择
  if (deletedOptions.value.has(key)) return;
  
  if (currentQuestion.value?.question_type === 'multiple') {
    // 多选题：切换选中状态
    if (selectedAnswers.value.has(key)) {
      selectedAnswers.value.delete(key);
    } else {
      selectedAnswers.value.add(key);
    }
    // 多选题不立即判断，需要点击确认按钮
  } else {
    // 单选题/判断题：即选即判断
    selectedAnswer.value = key;
    showAnswer.value = true;
  }
};

// 确认多选题答案
const confirmMultipleAnswer = () => {
  if (selectedAnswers.value.size === 0) {
    ElMessage.warning('请至少选择一个答案');
    return;
  }
  showAnswer.value = true;
};

// 删除当前题目
const deleteCurrentQuestion = async () => {
  if (!currentQuestion.value) return;

  const isArticle = isArticleMode.value;
  const itemName = isArticle ? '文章' : '题目';

  try {
    await ElMessageBox.confirm(
      `确定要删除当前${itemName}吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    // 用户取消
    return;
  }

  try {
    const id = currentQuestion.value.id;
    let success: boolean;

    if (isArticle) {
      success = await window.electronAPI.deleteArticle(id);
    } else {
      success = await window.electronAPI.deleteQuestion(id);
    }

    if (success) {
      ElMessage.success(`${itemName}已删除`);

      // 从本地数组中移除所有相同id的题目（处理重复出题的情况）
      if (isArticle) {
        articles.value = articles.value.filter(a => a.id !== id);
      } else {
        questions.value = questions.value.filter(q => q.id !== id);
      }

      // 如果删除后没有题目了，返回上一页
      const remaining = isArticle ? articles.value.length : questions.value.length;
      if (remaining === 0) {
        ElMessage.info('该科目下已无任何题目');
        router.push({ name: 'Home' });
        return;
      }

      // 调整当前索引
      if (currentIndex.value >= remaining) {
        currentIndex.value = remaining - 1;
      }
      resetQuestionState();
    } else {
      ElMessage.error('删除失败');
    }
  } catch (error) {
    ElMessage.error('删除失败');
    console.error(error);
  }
};

// 打开新增论文弹窗
const openAddArticleDialog = () => {
  addArticleDialogVisible.value = true;
  newArticleTitle.value = '';
  newArticleContent.value = '';
};

// 新增论文弹窗粘贴图片处理
const handleAddArticlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64 && addArticleEditorRef.value) {
          const imgHtml = `<img src="${base64}" style="max-width:100%;" />`;
          document.execCommand('insertHTML', false, imgHtml);
        }
      };
      reader.readAsDataURL(blob);
    }
  }
};

// 保存新论文
const saveNewArticle = async () => {
  if (!newArticleTitle.value.trim()) {
    ElMessage.warning('请输入论文标题');
    return;
  }

  const editorContent = addArticleEditorRef.value?.innerHTML || '';
  if (!editorContent.trim()) {
    ElMessage.warning('请输入论文内容');
    return;
  }

  try {
    const dirId = parseInt(props.directoryId);
    const result = await window.electronAPI.addArticle({
      directory_id: dirId,
      title: newArticleTitle.value.trim(),
      content: editorContent,
    });

    if (!result) {
      ElMessage.error('保存失败');
      return;
    }

    ElMessage.success('论文保存成功');
    addArticleDialogVisible.value = false;

    // 刷新数据
    await loadData();
    // 跳转到新添加的论文
    const newIndex = articles.value.findIndex(a => a.id === result.id);
    if (newIndex >= 0) {
      currentIndex.value = newIndex;
    }
  } catch (error) {
    ElMessage.error('保存失败');
    console.error(error);
  }
};

// 判断选项是否是正确答案
const isCorrectOption = (key: string) => {
  if (!currentQuestion.value || !showAnswer.value) return false;
  const correctAnswers = currentQuestion.value.correct_answer.split(',');
  return correctAnswers.includes(key);
};

// 判断选项是否是用户选错的答案
const isWrongOption = (key: string) => {
  if (!currentQuestion.value || !showAnswer.value) return false;
  const correctAnswers = currentQuestion.value.correct_answer.split(',');
  
  if (currentQuestion.value.question_type === 'multiple') {
    // 多选题：用户选了但不是正确答案，或正确答案用户没选（不标记未选的正确答案为错）
    return selectedAnswers.value.has(key) && !correctAnswers.includes(key);
  } else {
    // 单选题：用户选的答案且不是正确答案
    return selectedAnswer.value === key && !correctAnswers.includes(key);
  }
};

// 切换删除状态
const toggleDelete = (key: string) => {
  if (deletedOptions.value.has(key)) {
    deletedOptions.value.delete(key);
    // 如果当前选中的是这个选项，取消选择
    if (selectedAnswer.value === key) {
      selectedAnswer.value = '';
    }
  } else {
    deletedOptions.value.add(key);
    // 如果当前选中的是这个选项，取消选择
    if (selectedAnswer.value === key) {
      selectedAnswer.value = '';
    }
  }
};

// 切换文章段落隐藏/显示
const toggleParagraph = (index: number) => {
  if (hiddenParagraphs.value.has(index)) {
    hiddenParagraphs.value.delete(index);
  } else {
    hiddenParagraphs.value.add(index);
  }
};

// 段落编辑相关方法
const isEditingParagraph = (index: number) => {
  return editingParagraphIndex.value === index;
};

const setParagraphEditorRef = (el: any, index: number) => {
  if (el) {
    paragraphEditorRefs.value[index] = el;
  }
};

const getParagraphEditHtml = (index: number) => {
  const paragraph = writeParagraphs.value[index];
  if (!paragraph) return '';
  // 如果内容已经是 HTML（包含 <div>、<p>、<br>、<img> 等标签），直接返回
  if (/<(div|p|br|img|span|strong|em|u|ol|ul|li|h[1-6])\b/i.test(paragraph)) {
    return paragraph;
  }
  // 将纯文本中的换行转为 <br>，保留已有的 <img> 标签
  const parts = paragraph.split(/(<img\s+[^>]+>)/gi);
  const htmlParts = parts.map((part) => {
    if (/^<img\s/i.test(part)) {
      return part;
    }
    return part
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  });
  return htmlParts.join('');
};

const startEditParagraph = (index: number) => {
  editingParagraphIndex.value = index;
};

const handleParagraphPaste = (e: ClipboardEvent, index: number) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          const imgHtml = `<img src="${base64}" style="max-width:100%;" />`;
          document.execCommand('insertHTML', false, imgHtml);
        }
      };
      reader.readAsDataURL(blob);
    }
  }
};

const saveParagraph = async (index: number) => {
  if (!currentQuestion.value) return;
  const editor = paragraphEditorRefs.value[index];
  if (!editor) return;

  // 获取编辑器内容
  let html = editor.innerHTML;
  // 如果内容包含富文本标签（div、p 等），保留原始 HTML
  const hasRichTags = /<(div|p|span|strong|em|u|ol|ul|li|h[1-6])\b/i.test(html);
  let newParagraph: string;
  if (hasRichTags) {
    // 富文本模式：保留 HTML，仅做简单清理
    newParagraph = html.trim();
  } else {
    // 纯文本模式：将 <br> 转回换行符
    html = html.replace(/<br\s*\/?>/gi, '\n');
    html = html.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
    html = html.replace(/<p>/gi, '\n').replace(/<\/p>/gi, '');
    // 清理其他标签但保留 img
    html = html.replace(/<(?!img\s|\/img)[^>]+>/gi, '');
    // 解码 HTML 实体
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    newParagraph = textarea.value;
    // 清理多余换行
    newParagraph = newParagraph.replace(/\n{3,}/g, '\n\n').trim();
  }

// 更新文章内容
const article = articles.value[currentIndex.value];
if (!article) return;

// 获取当前所有段落
const currentContent = article.content;
let paragraphs: string[];
// 如果内容是富文本 HTML，按 div/p 分段
if (/<(div|p)\b/i.test(currentContent)) {
  paragraphs = [];
  const divParts = currentContent.split(/<div\b[^>]*>/i);
  for (const part of divParts) {
    const cleanPart = part.replace(/<\/div>/gi, '').trim();
    if (cleanPart) paragraphs.push(cleanPart);
  }
  if (paragraphs.length === 0) {
    const pParts = currentContent.split(/<p\b[^>]*>/i);
    for (const part of pParts) {
      const cleanPart = part.replace(/<\/p>/gi, '').trim();
      if (cleanPart) paragraphs.push(cleanPart);
    }
  }
} else {
  paragraphs = currentContent.split(/\n+/).filter((p: string) => p.trim());
}

// 替换指定段落
if (index >= 0 && index < paragraphs.length) {
paragraphs[index] = newParagraph;
// 如果原内容是富文本，用 div 包裹拼接；否则用换行拼接
const newContent = /<(div|p)\b/i.test(currentContent)
  ? paragraphs.map(p => `<div>${p}</div>`).join('')
  : paragraphs.join('\n\n');
    
    try {
      const success = await window.electronAPI.updateArticle(article.id, newContent);
      if (success) {
        article.content = newContent;
        // 更新当前显示的文章内容
        if (currentQuestion.value) {
          currentQuestion.value.option_a = newContent;
        }
        editingParagraphIndex.value = null;
        ElMessage.success('段落已保存');
      } else {
        ElMessage.error('保存失败');
      }
    } catch (error) {
      ElMessage.error('保存失败');
      console.error(error);
    }
  }
};

// 切换手写输入显示/隐藏
const toggleHandwrite = () => {
  showHandwrite.value = !showHandwrite.value;
};

// 获取手写输入内容
const getHandwriteInput = (index: number) => {
  return handwriteInputs.value[index] || '';
};

// 更新手写输入内容
const updateHandwriteInput = (index: number, value: string) => {
  handwriteInputs.value[index] = value;
};

// AI 提取段落关键词
const extractParagraphKeywords = async (index: number) => {
  const paragraph = writeParagraphs.value[index];
  if (!paragraph || !paragraph.trim()) {
    ElMessage.warning('段落内容为空，无法提取关键词');
    return;
  }

  keywordsLoading.value[index] = true;
  try {
    const providerOrder = getProviderOrder();
    const result = await window.electronAPI.extractKeywords({
      paragraph: paragraph.trim(),
      providerOrder,
    });

    if (result.success && result.keywords) {
      paragraphKeywords.value[index] = result.keywords;
      ElMessage.success('关键词提取成功');
    } else {
      ElMessage.error(result.error || '提取失败');
    }
  } catch (error) {
    ElMessage.error('提取关键词失败');
    console.error(error);
  } finally {
    keywordsLoading.value[index] = false;
  }
};

// 文章标题编辑相关方法
const isEditingArticleTitle = (id: number) => {
  return editingArticleTitleId.value === id;
};

const setArticleTitleInputRef = (el: any, id: number) => {
  if (el) {
    articleTitleInputRefs.value[id] = el;
  }
};

const startEditArticleTitle = (id: number, title: string) => {
  editingArticleTitleId.value = id;
  editingArticleTitles.value[id] = title || '';
  // 自动聚焦输入框
  nextTick(() => {
    const inputRef = articleTitleInputRefs.value[id];
    if (inputRef && inputRef.focus) {
      inputRef.focus();
    }
  });
};

const saveArticleTitle = async (id: number) => {
  const newTitle = editingArticleTitles.value[id];
  if (newTitle === undefined) return;

  // 查找文章
  const article = allArticles.value.find(a => a.id === id);
  if (!article) return;

  // 如果标题没有变化，直接退出编辑
  if (article.title === newTitle) {
    editingArticleTitleId.value = null;
    return;
  }

  try {
    const success = await window.electronAPI.updateArticle(id, article.content, newTitle);
    if (success) {
      // 更新 allArticles 中的标题
      article.title = newTitle;
      // 更新 articles 中的标题（如果存在）
      const articleInList = articles.value.find(a => a.id === id);
      if (articleInList) {
        articleInList.title = newTitle;
      }
      // 更新当前显示的标题
      if (currentQuestion.value && currentQuestion.value.id === id) {
        currentQuestion.value.title = newTitle;
      }
      editingArticleTitleId.value = null;
      ElMessage.success('标题已保存');
    } else {
      ElMessage.error('保存失败');
    }
  } catch (error) {
    ElMessage.error('保存失败');
    console.error(error);
  }
};

// 上一题
const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetQuestionState();
  }
};

// 跳转到指定文章（高项论文模式）
const jumpToArticle = (index: number) => {
  if (index < 0 || index >= articles.value.length) return;
  currentIndex.value = index;
  resetQuestionState();
};

// 根据文章 ID 跳转（左侧列表点击用）
const jumpToArticleById = (id: number) => {
  // 在当前的 articles（重复出题数组）中查找该文章
  const idx = articles.value.findIndex(a => a.id === id);
  if (idx !== -1) {
    // 如果当前出题数组中有，直接跳转
    currentIndex.value = idx;
    resetQuestionState();
  } else {
    // 如果当前出题数组中没有（被随机抽掉了），临时插入到当前位置
    const article = allArticles.value.find(a => a.id === id);
    if (article) {
      articles.value.splice(currentIndex.value + 1, 0, article);
      currentIndex.value++;
      resetQuestionState();
    }
  }
};

// 下一题
const nextQuestion = () => {
  const total = isArticleMode.value ? articles.value.length : questions.value.length;
  if (currentIndex.value < total - 1) {
    currentIndex.value++;
    resetQuestionState();
  } else {
    // 已经是最后一题，重新加载题目（按照配置重新随机获取）
    ElMessage.success('本轮题目已完成，即将重新开始');
    loadData();
  }
};

// 重置题目状态（换题时保留删除的选项）
const resetQuestionState = () => {
  selectedAnswer.value = '';
  selectedAnswers.value.clear();
  showAnswer.value = false;
  // 清空高项论文手写输入，但保持显示
  handwriteInputs.value = {};
  showHandwrite.value = true;
  // 退出段落编辑模式
  editingParagraphIndex.value = null;
  paragraphEditorRefs.value = {};
};

// 监听题目变化，清空删除状态和 AI 状态
watch(currentQuestion, async (newQuestion, oldQuestion) => {
  // 如果是同一道题，不处理
  if (newQuestion && oldQuestion && newQuestion.id === oldQuestion.id) return;

  deletedOptions.value.clear();
  hiddenParagraphs.value.clear();
  selectedAnswer.value = '';
  selectedAnswers.value.clear();
  showAnswer.value = false;
  // 清空高项论文手写输入，但保持显示
  handwriteInputs.value = {};
  showHandwrite.value = true;
  // 关闭 AI 抽屉并重置状态
  aiDrawerVisible.value = false;
  aiLoading.value = false;
  aiError.value = '';
  aiProviderName.value = '';
  aiChatMessages.value = [];
  aiUserInput.value = '';
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];

  // 重置同类题状态
  aiSimilarQuestions.value = [];
  aiSimilarCurrentIndex.value = 0;
  aiSelectedSimilarAnswer.value = '';
  aiShowSimilarAnswer.value = false;
  aiSimilarDeletedOptions.value.clear();
  // 退出段落编辑模式
  editingParagraphIndex.value = null;
  paragraphEditorRefs.value = {};

  // 查询当前题目的同类题数据
  if (newQuestion && newQuestion.id) {
    try {
      const similarData = await window.electronAPI.getSimilarQuestions(newQuestion.id);
      if (similarData && similarData.length > 0) {
        aiSimilarQuestions.value = shuffleArray([...similarData]);
        aiSimilarCurrentIndex.value = 0;
      }
    } catch (e) {
      console.error('查询同类题失败:', e);
    }
  }
});

// 构建题目展示文本
const buildQuestionDisplayText = (): string => {
  if (!currentQuestion.value) return '';
  let text = currentQuestion.value.title;

  if (currentQuestion.value.question_type === 'single' || currentQuestion.value.question_type === 'multiple') {
    const options = optionsList.value
      .filter(o => !o.deleted)
      .map(o => `${o.key}. ${o.text}`)
      .join('\n');
    if (options) {
      text += '\n\n' + options;
    }
  } else if (currentQuestion.value.question_type === 'judge') {
    text += '\n\n正确\n错误';
  }

  return text;
};

// 打开 AI 讲解抽屉
const openAIChatDrawer = async () => {
  if (!currentQuestion.value) return;
  aiDrawerVisible.value = true;

  // 如果已经有对话记录，滚动到底部
  if (aiChatMessages.value.length > 0) {
    scrollToBottom();
    return;
  }

  // 如果数据库中有缓存的 AI 解析，先显示题目再显示缓存内容
  if (currentQuestion.value.ai_explanation) {
    aiChatMessages.value.push({
      role: 'user',
      content: buildQuestionDisplayText()
    });
    aiChatMessages.value.push({
      role: 'assistant',
      content: currentQuestion.value.ai_explanation
    });
    scrollToBottom();
    return;
  }

  // 首次打开：先显示题目作为用户消息，再调用 AI
  aiChatMessages.value.push({
    role: 'user',
    content: buildQuestionDisplayText()
  });
  scrollToBottom();

  await callAIExplain(false);
};

// 关闭 AI 讲解抽屉
const closeAIChatDrawer = () => {
  aiDrawerVisible.value = false;
};

// 发送 AI 对话消息（追问）
const sendAIChatMessage = async () => {
  if (!aiUserInput.value.trim() || aiLoading.value) return;

  const userMessage = aiUserInput.value.trim();
  aiUserInput.value = '';

  // 如果是同类题技能模式
  if (currentSkill.value === 'similar_questions') {
    await handleSkillGenerateSimilar(userMessage);
    return;
  }

  if (!currentQuestion.value) return;

  // 添加用户消息到对话列表
  aiChatMessages.value.push({
    role: 'user',
    content: userMessage
  });
  // 用户发送新问题时，重置滚动状态并滚动到底部
  isUserScrolling.value = false;
  scrollToBottom();

  await callAIExplain(true, userMessage);
};

// 处理技能：生成同类题
const handleSkillGenerateSimilar = async (topic: string) => {
  if (!currentQuestion.value) return;

  aiLoading.value = true;
  aiSimilarLoading.value = true;

  // 添加用户消息
  aiChatMessages.value.push({
    role: 'user',
    content: `生成同类题：${topic}`
  });
  scrollToBottom();

  try {
    const providerOrder = getProviderOrder();
    const result = await window.electronAPI.generateSimilarQuestionsByTopic({
      topic,
      providerOrder,
    });

    console.log('[handleSkillGenerateSimilar] 结果:', result);

    if (result.success && result.questions && Array.isArray(result.questions)) {
      // 添加 pid 和 directory_id
      const questionsToAdd = result.questions.map((q: any) => ({
        ...q,
        pid: currentQuestion.value!.id,
        directory_id: currentQuestion.value!.directory_id,
        question_type: 'single',
      }));

      const saved = await window.electronAPI.addSimilarQuestions(questionsToAdd);
      // 追加到已有数组并重新随机排序
      aiSimilarQuestions.value = shuffleArray([...aiSimilarQuestions.value, ...saved]);
      aiSimilarCurrentIndex.value = 0;
      aiSelectedSimilarAnswer.value = '';
      aiShowSimilarAnswer.value = false;
      aiSimilarDeletedOptions.value.clear();

      // 添加 AI 回复
      aiChatMessages.value.push({
        role: 'assistant',
        content: `已根据主题「${topic}」生成 ${saved.length} 道同类题，请在下方卡片中查看。`
      });

      ElMessage.success(`已生成 ${saved.length} 道同类题`);
    } else {
      console.error('[handleSkillGenerateSimilar] 失败:', result);
      aiChatMessages.value.push({
        role: 'assistant',
        content: `生成失败：${result.error || '未知错误'}`
      });
      ElMessage.error(result.error || '生成同类题失败');
    }
  } catch (err: any) {
    console.error('[handleSkillGenerateSimilar] 异常:', err);
    aiChatMessages.value.push({
      role: 'assistant',
      content: `生成失败：${err.message || '未知错误'}`
    });
    ElMessage.error(err.message || '生成同类题失败');
  } finally {
    aiLoading.value = false;
    aiSimilarLoading.value = false;
    // 重置技能状态
    currentSkill.value = '';
    aiInputPlaceholder.value = '对这道题还有疑问？继续向 AI 提问...';
  }
};

// 调用 AI 讲解（支持首次和追问）
const callAIExplain = async (isFollowUp = false, userMessage = '') => {
  if (!currentQuestion.value) return;

  aiLoading.value = true;
  aiError.value = '';
  aiProviderName.value = '';

  // 清理之前的监听器
  aiUnsubscribers.forEach(fn => fn());
  aiUnsubscribers = [];

  let assistantContent = '';
  let currentProvider = '';

  // 设置厂商切换监听
  const unsubProviderSwitch = window.electronAPI.onAIProviderSwitch((provider: string) => {
    currentProvider = provider === 'modelspace' ? 'ModelSpace' : provider === 'deepseek' ? 'DeepSeek' : provider;
    aiProviderName.value = currentProvider;
    // 更新最后一条 assistant 消息的 provider
    const lastMsg = aiChatMessages.value[aiChatMessages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.provider = currentProvider;
    }
  });
  aiUnsubscribers.push(unsubProviderSwitch);

  // 设置流式监听
  const unsubChunk = window.electronAPI.onAIStreamChunk((content: string) => {
    assistantContent += content;
    // 更新最后一条 assistant 消息，如果没有则添加
    const lastMsg = aiChatMessages.value[aiChatMessages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = assistantContent;
      if (currentProvider && !lastMsg.provider) {
        lastMsg.provider = currentProvider;
      }
    } else {
      aiChatMessages.value.push({
        role: 'assistant',
        content: assistantContent,
        provider: currentProvider || undefined
      });
    }
    scrollToBottom();
  });
  aiUnsubscribers.push(unsubChunk);

  const unsubDone = window.electronAPI.onAIStreamDone(async () => {
    aiLoading.value = false;
    aiProviderName.value = '';
    // AI 解析完成后，保存到数据库（只保存首次讲解）
    if (!isFollowUp && currentQuestion.value && assistantContent) {
      try {
        await window.electronAPI.updateAIExplanation(currentQuestion.value.id, assistantContent);
        const q = questions.value.find(q => q.id === currentQuestion.value!.id);
        if (q) q.ai_explanation = assistantContent;
      } catch (e) {
        console.error('保存 AI 解析失败:', e);
      }
    }
  });
  aiUnsubscribers.push(unsubDone);

  const unsubError = window.electronAPI.onAIStreamError((error: string) => {
    aiLoading.value = false;
    aiProviderName.value = '';
    aiError.value = error;
  });
  aiUnsubscribers.push(unsubError);

  // 构建选项文本
  let optionsText = '';
  if (currentQuestion.value.question_type === 'single' || currentQuestion.value.question_type === 'multiple') {
    optionsText = optionsList.value.map(o => `${o.key}. ${o.text}`).join('\n');
  } else if (currentQuestion.value.question_type === 'judge') {
    optionsText = '正确\n错误';
  }

  try {
    const providerOrder = getProviderOrder();
    // 预估当前会使用的厂商（第一个）
    currentProvider = providerOrder[0] === 'modelspace' ? 'ModelSpace' : providerOrder[0] === 'deepseek' ? 'DeepSeek' : providerOrder[0];
    aiProviderName.value = currentProvider;

    const result = await window.electronAPI.explainQuestion({
      title: currentQuestion.value.title,
      options: optionsText,
      correctAnswer: currentQuestion.value.correct_answer,
      explanation: currentQuestion.value.explanation || '',
      questionId: currentQuestion.value.id,
      isFollowUp,
      userMessage,
      providerOrder,
    });

    if (!result.success && result.error) {
      aiLoading.value = false;
      aiProviderName.value = '';
      aiError.value = result.error;
    }
  } catch (err: any) {
    aiLoading.value = false;
    aiProviderName.value = '';
    aiError.value = err.message || '调用失败';
  }
};

// 复制题目内容到剪贴板
const copyQuestionContent = async () => {
  if (!currentQuestion.value) return;

  let text = currentQuestion.value.title;

  // 添加选项
  if (currentQuestion.value.question_type === 'single' || currentQuestion.value.question_type === 'multiple') {
    const options = optionsList.value
      .filter(o => !o.deleted)
      .map(o => `${o.key}. ${o.text}`)
      .join('\n');
    if (options) {
      text += '\n\n' + options;
    }
  } else if (currentQuestion.value.question_type === 'judge') {
    text += '\n\n正确\n错误';
  }

  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
    ElMessage.success('题目已复制到剪贴板');
  } catch (e) {
    console.error('复制失败:', e);
    ElMessage.error('复制失败');
  }
};

// AI 聊天区域生成同类题
const generateAISimilarQuestions = async () => {
  if (!currentQuestion.value) return;

  aiSimilarLoading.value = true;
  try {
    const optionsText = optionsList.value.map(o => `${o.key}. ${o.text}`).join('\n');
    const result = await window.electronAPI.generateSimilarQuestions({
      title: currentQuestion.value.title,
      options: optionsText,
      correctAnswer: currentQuestion.value.correct_answer,
      explanation: currentQuestion.value.explanation || '',
      providerOrder: getProviderOrder(),
    });

    console.log('[generateAISimilarQuestions] 结果:', result);
    if (result.success && result.questions) {
      console.log('[generateAISimilarQuestions] questions类型:', typeof result.questions, Array.isArray(result.questions));
      // 添加 pid 和 directory_id
      const questionsToAdd = result.questions.map((q: any) => ({
        ...q,
        pid: currentQuestion.value!.id,
        directory_id: currentQuestion.value!.directory_id,
        question_type: currentQuestion.value!.question_type,
      }));

      const saved = await window.electronAPI.addSimilarQuestions(questionsToAdd);
      // 追加到已有数组并重新随机排序
      aiSimilarQuestions.value = shuffleArray([...aiSimilarQuestions.value, ...saved]);
      aiSimilarCurrentIndex.value = 0;
      aiSelectedSimilarAnswer.value = '';
      aiShowSimilarAnswer.value = false;
      aiSimilarDeletedOptions.value.clear();
      ElMessage.success(`已追加 ${saved.length} 道同类题，共 ${aiSimilarQuestions.value.length} 道`);
      scrollToBottom();
    } else {
      console.error('[generateAISimilarQuestions] 错误:', result);
      ElMessage.error(result.error || '同类题错误');
    }
  } catch (err: any) {
    console.error('[generateAISimilarQuestions] 错误:', err);
    ElMessage.error(err.message || '同类题错误');
  } finally {
    aiSimilarLoading.value = false;
  }
};

// 当前 AI 同类题
const aiCurrentSimilarQuestion = computed(() => {
  return aiSimilarQuestions.value[aiSimilarCurrentIndex.value] || null;
});

// AI 同类题类型标签
const aiSimilarCurrentTag = computed(() => {
  if (!aiCurrentSimilarQuestion.value) return { text: '', type: 'info' };
  switch (aiCurrentSimilarQuestion.value.question_type) {
    case 'single': return { text: '单选题', type: 'primary' };
    case 'multiple': return { text: '多选题', type: 'warning' };
    case 'judge': return { text: '判断题', type: 'success' };
    default: return { text: '选择题', type: 'primary' };
  }
});

// AI 同类题选项列表
const aiSimilarOptionsList = computed<OptionWithState[]>(() => {
  if (!aiCurrentSimilarQuestion.value) return [];
  const q = aiCurrentSimilarQuestion.value;
  return [
    { key: 'A', text: q.option_a, deleted: aiSimilarDeletedOptions.value.has('A') },
    { key: 'B', text: q.option_b, deleted: aiSimilarDeletedOptions.value.has('B') },
    { key: 'C', text: q.option_c, deleted: aiSimilarDeletedOptions.value.has('C') },
    { key: 'D', text: q.option_d, deleted: aiSimilarDeletedOptions.value.has('D') },
    { key: 'E', text: q.option_e, deleted: aiSimilarDeletedOptions.value.has('E') },
  ].filter(o => o.text !== null && o.text !== undefined);
});

// 选择 AI 同类题选项
const aiSelectSimilarOption = (key: string) => {
  if (aiShowSimilarAnswer.value) return;
  aiSelectedSimilarAnswer.value = key;
  aiShowSimilarAnswer.value = true;
};

// 判断 AI 同类题选项是否正确
const aiIsSimilarCorrectOption = (key: string) => {
  if (!aiCurrentSimilarQuestion.value || !aiShowSimilarAnswer.value) return false;
  return aiCurrentSimilarQuestion.value.correct_answer === key;
};

// 判断 AI 同类题选项是否错误
const aiIsSimilarWrongOption = (key: string) => {
  if (!aiCurrentSimilarQuestion.value || !aiShowSimilarAnswer.value) return false;
  return aiSelectedSimilarAnswer.value === key && aiCurrentSimilarQuestion.value.correct_answer !== key;
};

// 切换删除 AI 同类题选项
const aiToggleDeleteOption = (key: string) => {
  if (aiSimilarDeletedOptions.value.has(key)) {
    aiSimilarDeletedOptions.value.delete(key);
  } else {
    aiSimilarDeletedOptions.value.add(key);
  }
};

// 删除当前 AI 同类题
const aiDeleteCurrentQuestion = () => {
  if (aiSimilarQuestions.value.length === 0) return;
  aiSimilarQuestions.value.splice(aiSimilarCurrentIndex.value, 1);
  aiSelectedSimilarAnswer.value = '';
  aiShowSimilarAnswer.value = false;
  aiSimilarDeletedOptions.value.clear();
  // 如果删除的是最后一题，索引回退
  if (aiSimilarCurrentIndex.value >= aiSimilarQuestions.value.length && aiSimilarCurrentIndex.value > 0) {
    aiSimilarCurrentIndex.value--;
  }
  if (aiSimilarQuestions.value.length === 0) {
    ElMessage.success('已删除全部同类题');
  } else {
    ElMessage.success('已删除本题');
  }
};

// AI 同类题下一题（循环随机出题）
const aiNextSimilarQuestion = () => {
  if (aiSimilarCurrentIndex.value >= aiSimilarQuestions.value.length - 1) {
    // 最后一题：重新打乱顺序，从头再来一组
    aiSimilarQuestions.value = shuffleArray([...aiSimilarQuestions.value]);
    aiSimilarCurrentIndex.value = 0;
  } else {
    aiSimilarCurrentIndex.value++;
  }
  aiSelectedSimilarAnswer.value = '';
  aiShowSimilarAnswer.value = false;
  aiSimilarDeletedOptions.value.clear();
};

// 同类题相关状态
const drawerVisible = ref(false);
const similarLoading = ref(false);
const similarQuestions = ref<Question[]>([]);
const currentSimilarIndex = ref(0);
const selectedSimilarAnswer = ref('');
const showSimilarAnswer = ref(false);
const similarCount = ref(0);

// 当前同类题
const currentSimilarQuestion = computed(() => {
  return similarQuestions.value[currentSimilarIndex.value] || null;
});

// 同类题进度
const similarProgressPercent = computed(() => {
  if (similarQuestions.value.length === 0) return 0;
  return ((currentSimilarIndex.value + 1) / similarQuestions.value.length) * 100;
});

// 同类题类型标签
const similarQuestionTypeTag = computed(() => {
  if (!currentSimilarQuestion.value) return { text: '', type: 'info' };
  switch (currentSimilarQuestion.value.question_type) {
    case 'single': return { text: '单选题', type: 'primary' };
    case 'multiple': return { text: '多选题', type: 'warning' };
    case 'judge': return { text: '判断题', type: 'success' };
    default: return { text: '选择题', type: 'primary' };
  }
});

// 抽屉内同类题删除的选项状态
const similarDeletedOptions = ref<Set<string>>(new Set());

// 同类题选项列表
const similarOptionsList = computed<OptionWithState[]>(() => {
  if (!currentSimilarQuestion.value) return [];
  const q = currentSimilarQuestion.value;
  return [
    { key: 'A', text: q.option_a, deleted: similarDeletedOptions.value.has('A') },
    { key: 'B', text: q.option_b, deleted: similarDeletedOptions.value.has('B') },
    { key: 'C', text: q.option_c, deleted: similarDeletedOptions.value.has('C') },
    { key: 'D', text: q.option_d, deleted: similarDeletedOptions.value.has('D') },
    { key: 'E', text: q.option_e, deleted: similarDeletedOptions.value.has('E') },
  ].filter(o => o.text !== null && o.text !== undefined);
});

// 切换抽屉内同类题选项删除状态
const toggleSimilarDeleteOption = (key: string) => {
  if (similarDeletedOptions.value.has(key)) {
    similarDeletedOptions.value.delete(key);
  } else {
    similarDeletedOptions.value.add(key);
  }
};

// 加载同类题数量
const loadSimilarCount = async () => {
  if (!currentQuestion.value) return;
  try {
    const similar = await window.electronAPI.getSimilarQuestions(currentQuestion.value.id);
    similarCount.value = similar.length;
  } catch (e) {
    console.error('加载同类题数量失败:', e);
  }
};

// 打开同类题抽屉
const openSimilarDrawer = async () => {
  if (!currentQuestion.value) return;
  drawerVisible.value = true;

  // 先清空重置抽屉显示
  similarQuestions.value = [];
  currentSimilarIndex.value = 0;
  selectedSimilarAnswer.value = '';
  showSimilarAnswer.value = false;
  similarLoading.value = false;

  // 查询是否已有同类题，有则反显
  try {
    const existing = await window.electronAPI.getSimilarQuestions(currentQuestion.value.id);
    if (existing.length > 0) {
      similarQuestions.value = existing;
    }
  } catch (e) {
    console.error('查询同类题失败:', e);
  }
};

// 抽屉内生成同类题
const generateSimilarInDrawer = async () => {
  if (!currentQuestion.value) return;

  similarLoading.value = true;
  try {
    const optionsText = optionsList.value.map(o => `${o.key}. ${o.text}`).join('\n');
    const result = await window.electronAPI.generateSimilarQuestions({
      title: currentQuestion.value.title,
      options: optionsText,
      correctAnswer: currentQuestion.value.correct_answer,
      explanation: currentQuestion.value.explanation || '',
      providerOrder: getProviderOrder(),
    });

    if (result.success && result.questions) {
      // 添加 pid 和 directory_id
      const questionsToAdd = result.questions.map((q: any) => ({
        ...q,
        pid: currentQuestion.value!.id,
        directory_id: currentQuestion.value!.directory_id,
        question_type: currentQuestion.value!.question_type,
      }));

      const saved = await window.electronAPI.addSimilarQuestions(questionsToAdd);
      // 追加到已有数组并重新随机排序
      similarQuestions.value = shuffleArray([...similarQuestions.value, ...saved]);
      currentSimilarIndex.value = 0;
      selectedSimilarAnswer.value = '';
      showSimilarAnswer.value = false;
      similarCount.value = similarQuestions.value.length;
      ElMessage.success(`已追加 ${saved.length} 道同类题，共 ${similarQuestions.value.length} 道`);
    } else {
      ElMessage.error(result.error || '生成同类题失败');
    }
  } catch (err: any) {
    ElMessage.error(err.message || '生成同类题失败');
  } finally {
    similarLoading.value = false;
  }
};

// 关闭抽屉
const closeDrawer = () => {
  drawerVisible.value = false;
};

// 选择同类题选项
const selectSimilarOption = (key: string) => {
  if (showSimilarAnswer.value) return;
  selectedSimilarAnswer.value = key;
  showSimilarAnswer.value = true;
};

// 判断同类题选项是否正确
const isSimilarCorrectOption = (key: string) => {
  if (!currentSimilarQuestion.value || !showSimilarAnswer.value) return false;
  return currentSimilarQuestion.value.correct_answer === key;
};

// 判断同类题选项是否错误
const isSimilarWrongOption = (key: string) => {
  if (!currentSimilarQuestion.value || !showSimilarAnswer.value) return false;
  return selectedSimilarAnswer.value === key && currentSimilarQuestion.value.correct_answer !== key;
};

// 下一道同类题（循环随机）
const nextSimilarQuestion = () => {
  if (currentSimilarIndex.value >= similarQuestions.value.length - 1) {
    // 最后一题：重新打乱顺序，从头再来一组
    similarQuestions.value = shuffleArray([...similarQuestions.value]);
    currentSimilarIndex.value = 0;
  } else {
    currentSimilarIndex.value++;
  }
  selectedSimilarAnswer.value = '';
  showSimilarAnswer.value = false;
  similarDeletedOptions.value.clear();
};

// 删除同类题
const deleteSimilarQuestion = async () => {
  if (!currentSimilarQuestion.value) return;
  try {
    const success = await window.electronAPI.deleteQuestion(currentSimilarQuestion.value.id);
    if (success) {
      ElMessage.success('题目已删除');
      similarQuestions.value = similarQuestions.value.filter(q => q.id !== currentSimilarQuestion.value!.id);
      if (similarQuestions.value.length === 0) {
        similarCount.value = 0;
      } else if (currentSimilarIndex.value >= similarQuestions.value.length) {
        currentSimilarIndex.value = similarQuestions.value.length - 1;
      }
      selectedSimilarAnswer.value = '';
      showSimilarAnswer.value = false;
      similarDeletedOptions.value.clear();
    } else {
      ElMessage.error('删除失败');
    }
  } catch (error) {
    ElMessage.error('删除失败');
    console.error(error);
  }
};

// 监听当前题目变化，加载同类题数量
watch(currentQuestion, () => {
  loadSimilarCount();
});

// 组件卸载时清理监听器
onUnmounted(() => {
  aiUnsubscribers.forEach(fn => fn());
});

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.quiz-container {
  padding: 20px 2vw;
  width: 100%;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-page-header__content) {
  font-size: 26px;
  font-weight: 500;
  color: #1a1a1a;
}

:deep(.el-page-header__left) {
  font-size: 18px;
}

:deep(.el-page-header__back) {
  font-size: 18px;
}

:deep(.el-page-header__title) {
  font-size: 18px;
}

.quiz-content {
  margin-top: 28px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.progress-bar {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.quiz-main {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 20px;
}

.quiz-left {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.quiz-left::-webkit-scrollbar {
  display: none;
}

.quiz-right {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 高项论文文章列表 */
.article-list-panel {
  width: 280px;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  -ms-overflow-style: auto;
}

.article-list-panel::-webkit-scrollbar {
  width: 6px;
}

.article-list-panel::-webkit-scrollbar-thumb {
  background-color: #c4a882;
  border-radius: 3px;
}

.article-list-card {
  border-radius: 16px;
  border: 1px solid #e8e4df;
  background: #fff;
  box-shadow: none;
}

.article-list-card :deep(.el-card__header) {
  border-bottom: 1px solid #f0ece7;
  padding: 16px 20px;
}

.article-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
}

.article-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  color: #4a4540;
}

.article-list-item:hover {
  background: #f5f3f0;
}

.article-list-item.active {
  background: #f0ece7;
  color: #1a1a1a;
  font-weight: 600;
}

.article-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8e4df;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #6b6560;
  flex-shrink: 0;
}

.article-list-item.active .article-number {
  background: #c4a882;
  color: #fff;
}

.article-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-title-input {
  flex: 1;
}

.article-title-input :deep(.el-input__inner) {
  font-size: 14px;
  padding: 4px 8px;
}

.edit-title-btn,
.save-title-btn {
  flex-shrink: 0;
  padding: 4px 8px;
  min-height: 28px;
}

.right-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.progress-text {
  display: block;
  margin-bottom: 12px;
  color: #6b6560;
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-progress-bar__outer) {
  background-color: #e8e4df;
  border-radius: 4px;
  height: 8px !important;
}

:deep(.el-progress-bar__inner) {
  background-color: #c4a882;
  border-radius: 4px;
}

.question-card {
  margin-bottom: 24px;
  border-radius: 20px;
  border: 1px solid #e8e4df;
  background: #fff;
  box-shadow: none;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #f0ece7;
  padding: 20px 24px;
}

:deep(.el-tag) {
  font-size: 15px;
  padding: 6px 14px;
  border-radius: 8px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.copy-btn {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #9a9590;
  font-size: 18px;
}

.copy-btn:hover {
  color: #1a1a1a;
  background: #f5f3f0;
}

.answer-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 500;
}

.answer-status .el-icon {
  font-size: 24px;
}

.correct-text {
  color: #67C23A;
}

.wrong-text {
  color: #F56C6C;
}

.correct-answer {
  color: #6b6560;
  font-size: 16px;
  font-weight: normal;
  margin-left: 8px;
}

.next-question-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 18px 20px;
  font-size: 16px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
  margin-left:0;
}

.next-question-btn:hover:not(:disabled) {
  background-color: #8b9a6d;
}

.next-question-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.delete-question-btn {
background-color: #8b9a6d;
color: #fff;
border: none;
border-radius: 12px;
padding: 18px 20px;
font-size: 16px;
transition: all 0.2s ease;
height: auto;
min-height: 56px;
margin-left: 0;
}

.delete-question-btn:hover {
background-color: #8b9a6d;
}

.handwrite-btn {
  background-color: #8b9a6d;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 18px 20px;
  font-size: 16px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 56px;
  width: 100%;
  margin-left: 0;
}

.handwrite-btn:hover {
  background-color: #8b9a6d;
}

.handwrite-btn.active {
  background-color: #8b9a6d;
}

/* 手写输入区域 */
.handwrite-area {
  margin-top: 12px;
  width: 100%;
}

.handwrite-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 16px;
  font-size: 18px;
  line-height: 1.8;
  background: #fdfbf8;
  border: 1.5px solid #e8e4df;
  resize: vertical;
}

.clear-handwrite-btn {
  margin-top: 12px;
  color: #fff;
  background-color: #F56C6C;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  transition: all 0.2s ease;
  height: auto;
  min-height: 52px;
  margin-left: 0;
}

.clear-handwrite-btn:hover {
  background-color: #f78989;
}

.case-handwrite {
  margin: 20px 0;
}

.question-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 28px;
  line-height: 1.6;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.option-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.option-row .delete-btn {
  flex-shrink: 0;
  align-self: center;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #F56C6C;
  font-size: 32px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.option-row .delete-btn:hover {
  background-color: #fef0f0;
}

.option-item {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 22px 24px;
  border: 1.5px solid #e8e4df;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  gap: 14px;
  background: #fff;
  min-height: 64px;
}

.option-item:hover:not(.deleted) {
  border-color: #c4a882;
  background-color: #fdfbf8;
}

.option-row.selected .option-item {
  border-color: #8b9a6d;
  background-color: #f5f7f0;
}

.option-row.correct .option-item {
  border-color: #67C23A;
  background-color: #f0f9eb;
}

.option-row.wrong .option-item {
  border-color: #F56C6C;
  background-color: #fef0f0;
}

.option-row.deleted .option-item {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f5f3f0;
}

.result-icon {
  font-size: 24px;
  margin-left: 12px;
  flex-shrink: 0;
}

.correct-icon {
  color: #67C23A;
}

.wrong-icon {
  color: #F56C6C;
}


.option-key {
  font-weight: 600;
  color: #1a1a1a;
  flex-shrink: 0;
  font-size: 20px;
}

.option-text {
  flex: 0 1 auto;
  color: #4a4540;
  font-size: 20px;
  min-width: 0;
  word-break: break-all;
}

.strikethrough {
  text-decoration: line-through;
  color: #9a9590;
}

.judge-options .option-text {
  font-size: 20px;
  font-weight: 500;
}

.answer-section {
  margin-top: 24px;
  text-align: center;
}

.answer-result {
  margin-top: 14px;
}

.explanation-line {
  font-size: 22px;
  color: #1a1a1a;
  line-height: 1.8;
  padding: 10px 0;
}

/* Markdown 渲染样式 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin-top: 16px;
  margin-bottom: 10px;
  color: #1a1a1a;
  font-weight: 600;
}

.markdown-body :deep(p) {
  margin-bottom: 10px;
}

.markdown-body :deep(strong) {
  color: #1a1a1a;
  font-weight: 600;
}

.markdown-body :deep(code) {
  background: #f0ece7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
}

.markdown-body :deep(pre) {
  background: #f5f3f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-bottom: 12px;
  padding-left: 24px;
}

.markdown-body :deep(li) {
  margin-bottom: 6px;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #c4a882;
  padding-left: 16px;
  margin-left: 0;
  color: #6b6560;
  font-style: italic;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e8e4df;
  margin: 20px 0;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e8e4df;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f5f3f0;
  font-weight: 600;
}

.confirm-btn {
  margin-top: 20px;
  width: 100%;
  padding: 18px 20px;
  font-size: 16px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  transition: all 0.2s ease;
  min-height: 56px;
  height: auto;
}

.confirm-btn:hover {
  background: #333;
}

/* 文章题样式 */
.write-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paragraph-block {
  display: flex;
  flex-direction: column;
}

.paragraph-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.paragraph-item {
  flex: 1;
  padding: 10px 15px;
  border: 1.5px solid #e8e4df;
  border-radius: 14px;
  background: #fff;
  transition: all 0.25s ease;
  min-height: 64px;
}

.paragraph-item.hidden {
  background-color: #f5f3f0;
  border-color: #e8e4df;
}

.paragraph-item.hidden .paragraph-text {
  opacity: 0;
  filter: blur(8px);
  user-select: none;
}

.paragraph-text {
  margin: 0;
  font-size: 22px;
  color: #1a1a1a;
  line-height: 1.8;
  transition: all 0.25s ease;
}

.paragraph-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  align-self: center;
}

.toggle-btn {
  min-height: 40px;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
  margin-left: 0;
}

.edit-btn,
.save-btn {
  min-height: 40px;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
}

.paragraph-editor {
  flex: 1;
  padding: 16px;
  border: 2px solid #c4a882;
  border-radius: 14px;
  background: #fff;
  min-height: 120px;
  outline: none;
  font-size: 22px;
  line-height: 1.8;
  color: #1a1a1a;
}

.paragraph-editor img {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

/* AI 讲解按钮 */
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

/* AI 讲解抽屉 */
.ai-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 1000;
  pointer-events: none;
  transition: background 0.3s ease;
}

.ai-drawer-overlay.show {
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.ai-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 90%;
  height: 100%;
  background: #fff;
  z-index: 1001;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
}

.ai-drawer.show {
  transform: translateX(0);
}

.ai-chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f8f7f5;
  scrollbar-width: thin;
  scrollbar-color: #c4c4c4 transparent;
}

.ai-chat-content::-webkit-scrollbar {
  width: 6px;
}

.ai-chat-content::-webkit-scrollbar-track {
  background: transparent;
}

.ai-chat-content::-webkit-scrollbar-thumb {
  background: #c4c4c4;
  border-radius: 3px;
}

.ai-chat-content::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.chat-message {
  display: flex;
  align-items: flex-start;
}

.chat-message.user {
  justify-content: flex-end;
}

.chat-message.assistant {
  justify-content: flex-start;
}

.message-bubble {
  padding: 5px 0px;
  border-radius: 1px;
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
}

.chat-message.user .message-bubble {
  background: #f0f0f0;
  padding:18px 19px;
  border-radius: 12px;
  max-width: 80%;
}

.loading-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b6560;
}

.message-provider {
  font-size: 12px;
  color: #9a9590;
  margin-bottom: 6px;
  padding: 2px 8px;
  background: #f5f3f0;
  border-radius: 4px;
  display: inline-block;
}

.error-bubble {
  color: #F56C6C;
  background: #fef0f0;
}

.ai-chat-input-area {
padding: 16px 0px;
border-top: 1px solid #e8e4df;
background: #fff;
display: flex;
flex-direction: column;
flex-shrink: 0;
max-width: 800px;
margin: 0 auto;
width: 100%;
}

.input-box {
background: #f5f3f0;
border-radius: 16px;
padding: 12px 16px;
display: flex;
flex-direction: column;
gap: 8px;
}

.ai-chat-input :deep(.el-textarea__inner) {
background: transparent;
border: none;
box-shadow: none;
resize: none;
padding: 0;
font-size: 15px;
line-height: 1.6;
color: #1a1a1a;
}

.ai-chat-input :deep(.el-textarea__inner:focus) {
box-shadow: none;
}

.ai-chat-input :deep(.el-textarea__inner::placeholder) {
color: #9a9590;
}

.input-toolbar-bottom {
display: flex;
align-items: center;
justify-content: space-between;
position: relative;
}

.skill-btn {
background: transparent;
border: none;
color: #6b6560;
padding: 4px 8px;
font-size: 13px;
}

.skill-btn:hover {
background: #e8e4df;
color: #1a1a1a;
border-radius: 6px;
}

.cancel-skill-btn {
color: #f56c6c;
}

.cancel-skill-btn:hover {
background: #fde2e2;
color: #c45656;
}

.skill-popover {
position: absolute;
bottom: 100%;
left: 0;
margin-bottom: 8px;
background: #fff;
border: 1px solid #e8e4df;
border-radius: 12px;
padding: 8px;
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
z-index: 100;
min-width: 220px;
}

.skill-item {
display: flex;
align-items: center;
gap: 12px;
padding: 12px;
border-radius: 8px;
cursor: pointer;
transition: all 0.2s ease;
}

.skill-item:hover {
background: #f5f3f0;
}

.skill-item .el-icon {
font-size: 20px;
color: #c4a882;
}

.skill-info {
display: flex;
flex-direction: column;
gap: 4px;
}

.skill-name {
font-size: 14px;
font-weight: 600;
color: #1a1a1a;
}

.skill-desc {
font-size: 12px;
color: #9a9590;
}

.ai-send-icon-btn {
width: 32px;
height: 32px;
padding: 0;
border-radius: 8px;
background: #1a1a1a;
border: none;
color: #fff;
display: flex;
align-items: center;
justify-content: center;
}

.ai-send-icon-btn:hover {
background: #333;
}

.ai-send-icon-btn.is-disabled {
background: #ccc;
opacity: 0.6;
}

.ai-send-icon-btn .el-icon {
font-size: 16px;
}

.ai-chat-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 16px;
  resize: none;
}

.ai-send-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 16px;
  transition: all 0.2s ease;
  min-height: 52px;
  height: auto;
}

.ai-send-btn:hover:not(:disabled) {
  background-color: #333;
}

.ai-send-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

/* AI 聊天区域同类题样式 */
.similar-bubble {
  width: 100%;
  max-width: 100%;
  padding:10px 0;
  display:flex;
  flex-direction:column;
  gap:20px;
}

.generate-similar-btn {
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 15px;
  width:200px;
  height:50px
}

.generate-similar-btn:hover {
  background: #333;
}

.ai-similar-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.ai-similar-main {
  flex: 1;
  min-width: 0;
}

.ai-similar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ai-similar-progress {
  font-size: 14px;
  color: #9a9590;
}

.ai-similar-title {
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.ai-similar-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.ai-similar-option-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-similar-option-row .delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: #f56c6c;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 18px;
}

.ai-similar-option-row .delete-btn.is-deleted {
  color: #c0c4cc;
}

.ai-similar-option-row .delete-btn:hover {
  color: #ff7875;
}

.ai-similar-option-row.deleted .ai-similar-option {
  opacity: 0.3;
  text-decoration: line-through;
  pointer-events: none;
}

.ai-similar-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #f8f7f5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-similar-option:hover {
  background: #f0ece7;
}

.ai-similar-option-row.selected .ai-similar-option {
  background: #e8f5e9;
  border: 1.5px solid #c8e6c9;
}

.ai-similar-option-row.correct .ai-similar-option {
  background: #e8f5e9;
  border: 1.5px solid #67c23a;
}

.ai-similar-option-row.wrong .ai-similar-option {
  background: #fef0f0;
  border: 1.5px solid #f56c6c;
}

.ai-similar-answer {
  margin-bottom: 16px;
}

.ai-similar-answer .answer-label {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.ai-similar-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.ai-similar-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
}

.ai-similar-actions .nav-btn {
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 17px;
  min-height: 52px;
  height: auto;
  min-width: 120px;
}

.ai-similar-actions .delete-question-btn {
  background: transparent;
  color: #f56c6c;
  border: 1.5px solid #f56c6c;
}

.ai-similar-actions .delete-question-btn:hover {
  background: #fef0f0;
}

.ai-similar-actions .next-btn {
  background: #1a1a1a;
  color: #fff;
  border: none;
  min-width: 120px;
  margin-left:0
}

.ai-similar-actions .next-btn:hover:not(:disabled) {
  background: #333;
}

/* Markdown 渲染样式 */
.ai-markdown {
font-size: 18px;
line-height: 1.8;
color: #1a1a1a;
}

.user-message-text {
font-size: 18px;
line-height: 1.8;
color: #1a1a1a;
white-space: pre-wrap;
word-break: break-word;
}

.ai-markdown :deep(h1),
.ai-markdown :deep(h2),
.ai-markdown :deep(h3),
.ai-markdown :deep(h4) {
  margin-top: 16px;
  margin-bottom: 10px;
  color: #1a1a1a;
  font-weight: 600;
}

.ai-markdown :deep(p) {
}

.ai-markdown :deep(strong) {
  color: #1a1a1a;
  font-weight: 600;
}

.ai-markdown :deep(code) {
  background: #f0ece7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.ai-markdown :deep(pre) {
  background: #f5f3f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.ai-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
}

.ai-markdown :deep(ul),
.ai-markdown :deep(ol) {
  margin-bottom: 12px;
  padding-left: 24px;
}

.ai-markdown :deep(li) {
  margin-bottom: 6px;
}

.ai-markdown :deep(blockquote) {
  border-left: 4px solid #c4a882;
  padding-left: 16px;
  margin-left: 0;
  color: #6b6560;
  font-style: italic;
}

.ai-markdown :deep(hr) {
  border: none;
  border-top: 1px solid #e8e4df;
  margin: 20px 0;
}

.ai-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.ai-markdown :deep(th),
.ai-markdown :deep(td) {
  border: 1px solid #e8e4df;
  padding: 8px 12px;
  text-align: left;
}

.ai-markdown :deep(th) {
  background: #f5f3f0;
  font-weight: 600;
}

/* 同类题按钮 */
.similar-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  transition: all 0.2s ease;
  min-height: 52px;
  height: auto;
  position: relative;
   margin-left: 0;
}

.similar-btn:hover {
  background-color: #333;
}

.similar-count {
  margin-left: 8px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

/* 同类题抽屉 */
.similar-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 1000;
  pointer-events: none;
  transition: background 0.3s ease;
}

.similar-drawer-overlay.show {
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.similar-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 90%;
  height: 100%;
  background: #fff;
  z-index: 1001;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
}

.similar-drawer.show {
  transform: translateX(0);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e4df;
  flex-shrink: 0;
}

.drawer-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.drawer-close {
  font-size: 24px;
  cursor: pointer;
  color: #6b6560;
  transition: color 0.2s;
}

.drawer-close:hover {
  color: #1a1a1a;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.similar-quiz {
  max-width: 900px;
  margin: 0 auto;
}

.similar-progress {
  margin-bottom: 20px;
}

.similar-progress span {
  display: block;
  margin-bottom: 12px;
  color: #6b6560;
  font-size: 16px;
  font-weight: 500;
}

.similar-quiz-main {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;
}

.similar-question-card {
  flex: 1;
  min-width: 0;
  border-radius: 20px;
  border: 1px solid #e8e4df;
  background: #fff;
}

.similar-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
  margin-top: 0;
}

.similar-actions .delete-question-btn {
  background: transparent;
  color: #f56c6c;
  border: 1.5px solid #f56c6c;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 17px;
  min-height: 52px;
  height: auto;
  min-width: 120px;
}

.similar-actions .delete-question-btn:hover {
  background: #fef0f0;
}

.similar-actions .next-question-btn {
  background: #1a1a1a;
  color: #fff;
  border: none;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 17px;
  min-height: 52px;
  height: auto;
  min-width: 120px;
}

.similar-actions .next-question-btn:hover {
  background: #333;
}

.similar-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6b6560;
  font-size: 16px;
  padding: 60px 0;
}

.similar-empty {
  padding: 60px 0;
}

/* 抽屉内选项删除按钮 */
.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.option-row .delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: #f56c6c;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 18px;
}

.option-row .delete-btn.is-deleted {
  color: #c0c4cc;
}

.option-row .delete-btn:hover {
  color: #ff7875;
}

.option-row.deleted .option-item {
  opacity: 0.3;
  text-decoration: line-through;
  pointer-events: none;
}

.option-row .option-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #f8f7f5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-row .option-item:hover {
  background: #f0ece7;
}

/* 新增论文弹窗样式 */
.add-article-form {
  padding: 20px 24px;
}

.add-article-form .form-item {
  margin-bottom: 20px;
}

.add-article-form .form-item label {
  display: block;
  font-weight: 600;
  margin-bottom: 10px;
  color: #1a1a1a;
  font-size: 15px;
}

.add-article-form .el-input__wrapper {
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  box-shadow: none;
  padding: 8px 16px;
  transition: all 0.2s ease;
}

.add-article-form .el-input__wrapper:hover {
  border-color: #c4a882;
}

.add-article-form .el-input__wrapper.is-focus {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2);
}

.add-article-form .el-input__inner {
  height: 44px;
  font-size: 16px;
  color: #1a1a1a;
}

.add-article-form .el-input__inner::placeholder {
  color: #9a9590;
}

.article-editor {
  min-height: 480px;
  max-height: 520px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  padding: 16px;
  font-size: 16px;
  line-height: 1.8;
  color: #1a1a1a;
  outline: none;
  transition: all 0.2s ease;
}

.article-editor:focus {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2);
}

.article-editor::-webkit-scrollbar {
  width: 6px;
}

.article-editor::-webkit-scrollbar-track {
  background: transparent;
}

.article-editor::-webkit-scrollbar-thumb {
  background: #c4c4c4;
  border-radius: 3px;
}

.article-editor::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

/* 弹窗整体样式统一 */
:deep(.add-article-dialog) {
  border-radius: 16px;
  overflow: hidden;
  padding: 0 !important;
  background: #faf9f7;
}

:deep(.add-article-dialog .el-dialog__header) {
  background: #faf9f7;
  border-bottom: 1px solid #e8e4df;
  padding: 20px 24px;
  margin-right: 0;
}

:deep(.add-article-dialog .el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

:deep(.add-article-dialog .el-dialog__footer) {
  background: #faf9f7;
  border-top: 1px solid #e8e4df;
  padding: 16px 24px;
}

:deep(.add-article-dialog .el-dialog__footer .el-button) {
  min-height: 44px;
  padding: 12px 24px;
  font-size: 15px;
  border-radius: 10px;
}

:deep(.add-article-dialog .el-dialog__footer .el-button--primary) {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

:deep(.add-article-dialog .el-dialog__footer .el-button--primary:hover) {
  background: #333;
  border-color: #333;
}

.add-article-btn {
background-color: #8b9a6d;
color: #fff;
border: none;
border-radius: 12px;
padding: 18px 20px;
font-size: 16px;
transition: all 0.2s ease;
height: auto;
min-height: 56px;
width: 100%;
margin-left: 0;
}

.add-article-btn:hover {
background-color: #8b9a6d;
}

/* 关键词显示区域 */
.keywords-display {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #f0f9eb;
  border: 1px solid #b3e19d;
  border-radius: 10px;
  margin: 8px 0;
  font-size: 14px;
  color: #67c23a;
}

.keywords-display .el-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.keywords-label {
  font-weight: 600;
  flex-shrink: 0;
}

.keywords-content {
  color: #1a1a1a;
  font-weight: 500;
}

/* 手写区域按钮布局 */
.handwrite-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.ai-keywords-btn {
  color: #409eff;
}

.ai-keywords-btn:hover {
  color: #66b1ff;
  background: #ecf5ff;
}
</style>

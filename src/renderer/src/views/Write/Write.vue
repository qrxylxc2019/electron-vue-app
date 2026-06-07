<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2024-12-28 00:00:00
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-12-28 00:00:00
 * @FilePath: \eletron\frontend\src\views\Note\Note.vue
 * @Description: 笔记管理组件
-->
<template>
  <div class="note-container">
    <div class="header">
      <div class="header-actions">
        <el-input
          v-model="searchText"
          placeholder="搜索笔记"
          class="search-input"
          clearable
          @input="searchNotes"
          style="width: 300px;"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="toggleSettingDrawer">
          设置
        </el-button>
        <el-button type="primary" @click="startAllTasks">
          开始所有任务
        </el-button>
      </div>
    </div>

    <!-- 第一行：自媒体账号与图表 -->
    <div style="display: flex; gap: 16px; margin-bottom: 16px; height: 300px;">
      <!-- 左侧：自媒体账号 -->
      <div style="flex: 1; background: #fff; border-radius: 4px; padding: 12px; overflow: hidden;">
        <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; font-size: 16px; border-left: 4px solid #8b9a6d; padding-left: 8px;">自媒体账号</span>
          <el-button type="primary" @click="openAddAccountDialog">
            <el-icon><Plus /></el-icon>
            添加
          </el-button>
        </div>
        <el-table
          :data="mediaAccounts"
          v-loading="mediaAccountsLoading"
          stripe
          style="width: 100%; height: calc(100% - 40px)"
          :header-cell-style="{ fontSize: '12px' }"
          :cell-style="{ fontSize: '12px' }"
        >
          <el-table-column type="index" label="序号" width="100" />
          <el-table-column prop="platform" label="平台" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.platform === 'toutiao'" type="danger" size="small">头条</el-tag>
              <el-tag v-else-if="row.platform === 'wechat'" type="success" size="small">公众号</el-tag>
              <el-tag v-else type="info" size="small">{{ row.platform }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="account" label="账号" min-width="120" show-overflow-tooltip />
          <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === '正常' ? 'success' : row.status === '异常' ? 'danger' : 'info'" size="small">
                {{ row.status || '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="editMediaAccount(row)">
                编辑
              </el-button>
              <el-button type="danger" link size="small" @click="deleteMediaAccount(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 中间：任务日志 -->
      <div style="width: 300px; background: #fff; border-radius: 4px; padding: 12px; display: flex; flex-direction: column;">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="border-left: 4px solid #8b9a6d; padding-left: 8px;">任务日志</span>
          <el-button type="danger" link size="small" @click="clearTaskLogs">清空</el-button>
        </div>
        <div ref="logContainerRef" style="flex: 1; overflow-y: auto; background: #f5f7fa; border-radius: 4px; padding: 8px; font-size: 12px; font-family: monospace;">
          <div v-if="taskLogs.length === 0" style="color: #909399; text-align: center; padding-top: 20px;">暂无日志</div>
          <div v-for="(log, index) in taskLogs" :key="index" :class="['log-item', 'log-' + log.type]">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：统计图表 -->
      <div style="width: 400px; background: #fff; border-radius: 4px; padding: 12px;">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; border-left: 4px solid #8b9a6d; padding-left: 8px;">发布统计</div>
        <div ref="chartRef" style="width: 100%; height: 240px;"></div>
      </div>
    </div>

    <!-- 新增：指标卡片行 -->
    <div style="display: flex; gap: 16px; margin-bottom: 16px;">
      <div class="metric-card blue-gradient">
        <div class="metric-icon"><el-icon><Document /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value">{{ notesTotal }}</div>
          <div class="metric-label">文章数</div>
        </div>
      </div>
      <div class="metric-card green-gradient">
        <div class="metric-icon"><el-icon><CircleCheck /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value">{{ publishedCount }}</div>
          <div class="metric-label">总金额</div>
        </div>
      </div>
      <div class="metric-card orange-gradient">
        <div class="metric-icon"><el-icon><Clock /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value">{{ pendingCount }}</div>
          <div class="metric-label">总阅读量</div>
        </div>
      </div>
      <div class="metric-card purple-gradient">
        <div class="metric-icon"><el-icon><User /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value">{{ mediaAccounts.length }}</div>
          <div class="metric-label">账号数量</div>
        </div>
      </div>
      <div class="metric-card red-gradient">
        <div class="metric-icon"><el-icon><TrendCharts /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value">{{ weeklyPublishCount }}</div>
          <div class="metric-label">本周发布</div>
        </div>
      </div>
    </div>

    <!-- 第二行：笔记列表 -->
    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
      <el-table
        :data="notes"
        style="width: 100%; flex: 1;"
        v-loading="loading"
        stripe
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="time" label="时间" width="150" />
        <el-table-column label="体裁" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.genre === 1" size="small" type="primary">小说</el-tag>
            <el-tag v-else-if="scope.row.genre === 2" size="small" type="success">散文</el-tag>
            <el-tag v-else-if="scope.row.genre === 3" size="small" type="warning">诗歌</el-tag>
            <el-tag v-else-if="scope.row.genre === 4" size="small" type="info">评论</el-tag>
            <el-tag v-else-if="scope.row.genre === 5" size="small">随笔</el-tag>
            <el-tag v-else size="small" type="info">未分类</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="平台" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.platform === 1" size="small" type="danger">头条</el-tag>
            <el-tag v-else-if="scope.row.platform === 2" size="small" type="success">公众号</el-tag>
            <el-tag v-else size="small" type="info">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="投稿状态" width="150">
          <template #default="scope">
            <el-select
              v-model="scope.row.status"
              size="small"
              @change="handleStatusChange(scope.row)"
              style="width: 100%"
            >
              <el-option label="未投稿" :value="0" />
              <el-option label="已投稿" :value="1" />
              <el-option label="已采用" :value="2" />
              <el-option label="已退稿" :value="3" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button type="success" link @click="handleSubmission(scope.row)">
              <el-icon><EditPen /></el-icon>投稿
            </el-button>
            <el-button type="danger" link @click="deleteNote(scope.row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination" v-if="notesTotal > 0" style="margin-top: 16px;">
        <el-pagination
          background
          v-model:current-page="notesPage"
          v-model:page-size="notesPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="notesTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleNotesSizeChange"
          @current-change="handleNotesPageChange"
        />
      </div>
    </div>

    <!-- 会话记录弹窗 -->
    <el-dialog
      v-model="chatHistoryVisible"
      title="会话记录"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="chat-history-list">
        <div
          v-for="session in chatSessions"
          :key="session.id"
          class="chat-history-item"
          :class="{ active: session.id === currentSessionId }"
          @click="switchSession(session.id)"
        >
          <div class="chat-history-info">
            <div class="chat-history-title">{{ session.title }}</div>
            <div class="chat-history-time">{{ session.createTime }}</div>
          </div>
          <el-button
            type="danger"
            link
            :icon="Delete"
            @click.stop="deleteSession(session.id)"
          >
            删除
          </el-button>
        </div>
        <el-empty v-if="chatSessions.length === 0" description="暂无会话记录" />
      </div>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑笔记"
      width="90%"
      :close-on-click-modal="false"
      destroy-on-close
      top="1vh"
    >
      <div class="edit-dialog-content">
        <div class="write-panel">
          

          <div class="write-body">
            <div class="editor-panel">
              <div v-if="currentNote" class="note-editor">
                <div class="title-input-wrapper">
                  <el-input
                    v-model="currentNote.title"
                    placeholder="笔记标题"
                    class="title-input"
                    size="large"
                  ></el-input>
                  <el-button
                    type="primary"
                    size="large"
                    @click="generateTitleFromContent"
                    :loading="titleGenerating"
                  >
                    AI标题
                  </el-button>
                </div>
                
                <RichEditor 
                  v-model:contentHtml="currentNote.note" 
                  height="100%" 
                  :fontSize="30" 
                  :showMenuBar="false"
                  class="note-rich-editor"
                  placeholder="开始编写笔记内容..."
                  ref="editorRef"
                />
              </div>
            </div>

            <div class="ask-panel">
              <!-- 顶部工具栏 -->
              <div class="ask-panel-toolbar">
                <el-button
                  type="primary"
                  :icon="Plus"
                  circle
                  size="small"
                  @click="createNewChat"
                  title="新建会话"
                />
                <el-button
                  type="info"
                  :icon="ChatLineSquare"
                  circle
                  size="small"
                  @click="chatHistoryVisible = true"
                  title="会话记录"
                />
              </div>

              <div class="ask-messages" ref="askScrollRef">
                <div
                  v-for="(msg, index) in askMessages"
                  :key="index"
                  class="ask-message"
                  :class="msg.role"
                >
                  <div class="ask-bubble">
                    <div v-if="msg.role === 'assistant' && editorRendering && index === editorRenderMsgIndex" class="editor-render-status">
                      <el-icon class="is-loading"><Loading /></el-icon>
                      <span>{{ editorRenderStatusText }}</span>
                    </div>
                    <div v-else-if="msg.role === 'assistant' && msg.editorDone" class="editor-render-done">
                      ✅ 内容已渲染（共 {{ msg.editorTotal }} 段）
                    </div>
                    <!-- 正常消息 -->
                    <template v-else>
                      <!-- 用户消息中的引用块 -->
                      <div v-if="msg.role === 'user' && msg.quoted" class="msg-quoted-block">
                        <span class="msg-quoted-label">📎 引用（第 {{ msg.quoted.startLine }}-{{ msg.quoted.endLine }} 行）</span>
                        <div class="msg-quoted-text">{{ msg.quoted.text.length > 150 ? msg.quoted.text.slice(0, 150) + '...' : msg.quoted.text }}</div>
                      </div>
                      <div class="md-content" v-html="md.render(msg.content)"></div>
                      <span v-if="msg.role === 'assistant' && askLoading && index === askMessages.length - 1" class="typing-cursor">|</span>
                      <!-- AI消息底部操作按钮 -->
                      <div v-if="msg.role === 'assistant' && msg.content" class="message-actions">
                        <el-button size="small" @click="copyMessageContent(msg.content)" :icon="DocumentCopy">
                          复制
                        </el-button>
                        <el-button size="small" @click="overrideToEditor(msg.content)" :icon="Edit">
                          覆盖到左侧
                        </el-button>
                      </div>
                    </template>
                  </div>
                </div>
                <div v-if="askLoading && askMessages[askMessages.length - 1]?.content === ''" class="ask-message assistant">
                  <div class="ask-bubble ask-typing">AI 思考中...</div>
                </div>
              </div>

              <div class="ask-input">
                <!-- 引用内容展示 -->
                <div v-if="quotedContent" class="quoted-block">
                  <div class="quoted-header">
                    <span class="quoted-label">📎 引用内容（第 {{ quotedContent.startLine }}-{{ quotedContent.endLine }} 行）</span>
                    <el-button type="danger" link size="small" @click="clearQuote" :icon="Close">
                    </el-button>
                  </div>
                  <div class="quoted-text">{{ quotedContent.text.length > 200 ? quotedContent.text.slice(0, 200) + '...' : quotedContent.text }}</div>
                </div>
                <div class="ask-row-top">
                  <el-input
                    v-model="askInput"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 10 }"
                    placeholder="提问或描述任务..."
                    resize="none"
                    @keydown.enter.exact="handleSendOrStop"
                  />
                  <el-button
                    v-if="!askLoading"
                    type="primary"
                    circle
                    @click="sendAsk"
                    :icon="Promotion"
                  />
                  <el-button
                    v-else
                    type="danger"
                    circle
                    @click="stopAsk"
                    :icon="VideoPause"
                  />
                </div>
                <div class="ask-row-bottom">
                  <el-button
                    type="info"
                    size="small"
                    @click="openPromptPicker('ask')"
                  >
                    提示词
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <div class="note-toolbar">
            <div class="right-buttons">
              <el-button @click="saveNote" type="success" size="large" :disabled="!currentNote">保存内容</el-button>
              <el-button @click="publishNote" type="warning" size="large" :disabled="!currentNote">发表到头条号</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 执行配置弹窗 -->
    <el-dialog
      v-model="executeDialogVisible"
      :title="executeType ? '执行配置' : '选择任务类型'"
      width="1000px"
      :close-on-click-modal="true"
      destroy-on-close
      @close="resetExecuteDialog"
    >
      <!-- 任务类型选择 -->
      <div v-if="!executeType" class="task-type-selector">
        <div class="task-type-btn" @click="selectTaskType('selfMedia')">
          <el-icon :size="48"><Monitor /></el-icon>
          <span class="task-type-title">自媒体</span>
          <span class="task-type-desc">发布到头条、公众号等平台</span>
        </div>
        <div class="task-type-btn" @click="selectTaskType('submission')">
          <el-icon :size="48"><EditPen /></el-icon>
          <span class="task-type-title">投稿</span>
          <span class="task-type-desc">投稿到杂志、期刊等</span>
        </div>
      </div>

      <!-- 自媒体配置 -->
      <div v-else-if="executeType === 'selfMedia'">
        <el-form label-position="top" class="execute-form">
          <el-form-item label="发表次数">
            <el-input-number v-model="executeForm.count" :min="1" :max="100" />
          </el-form-item>
          <el-form-item label="标题提示词">
            <div style="display:flex;gap:10px;width:100%">
              <el-input v-model="executeForm.titlePrompt" type="textarea" :rows="3" placeholder="标题提示词" style="flex:1" />
              <el-button type="primary" @click="openPromptPicker('title')">选择</el-button>
            </div>
          </el-form-item>
          <el-form-item label="内容提示词">
            <div style="display:flex;gap:10px;width:100%">
              <el-input v-model="executeForm.contentPrompt" type="textarea" :rows="3" placeholder="内容提示词，可用 {{title}} 引用生成的标题" style="flex:1" />
              <el-button type="primary" @click="openPromptPicker('content')">选择</el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 投稿配置 -->
      <div v-else-if="executeType === 'submission'">
        <div class="submission-step">
          <!-- 筛选条件 -->
          <div class="email-filter-container" style="margin-bottom: 15px;">
            <el-input
              v-model="emailFilter.email"
              placeholder="搜索邮箱"
              clearable
              style="width: 200px; margin-right: 10px;"
              @input="handleEmailFilterChange"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-input
              v-model="emailFilter.journal"
              placeholder="搜索杂志名"
              clearable
              style="width: 200px; margin-right: 10px;"
              @input="handleEmailFilterChange"
            />
            <el-button type="primary" @click="loadEmailListForSubmission">
              搜索
            </el-button>
            <el-button @click="resetEmailFilter">
              重置
            </el-button>
            
          </div>
          
          <!-- 邮箱表格 -->
          <el-table
            ref="emailTableRef"
            :data="emailListForSubmission"
            style="width: 100%"
            height="300px"
            row-key="email"
            @selection-change="handleEmailSelectionChange"
            v-loading="emailLoading"
          >
            <el-table-column type="selection" width="55" :reserve-selection="true" />
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column prop="editor" label="编辑名" />
            <el-table-column prop="journal" label="杂志名" />
          </el-table>
          
          <!-- 分页 -->
          <div class="email-pagination" style="margin-top: 15px;">
            <el-pagination
              background
              v-model:current-page="emailCurrentPageForSubmission"
              v-model:page-size="emailPageSizeForSubmission"
              :page-sizes="[5, 10, 20, 50]"
              :total="emailTotalForSubmission"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="handleEmailPageChangeForSubmission"
              @size-change="handleEmailSizeChangeForSubmission"
            />
          </div>
          
          <!-- 选择状态 -->
          <div v-if="selectedEmails.length > 0" style="margin-top: 10px; color: #67C23A;">
            已选择 {{ selectedEmails.length }} 个邮箱：
            <el-tag
              v-for="(email, index) in selectedEmails.slice(0, 3)"
              :key="index"
              size="small"
              style="margin-left: 5px; margin-right: 5px;"
            >
              {{ email.email }}
            </el-tag>
            <span v-if="selectedEmails.length > 3">等 {{ selectedEmails.length }} 个邮箱</span>
          </div>
          <div v-else style="margin-top: 10px; color: #909399;">
            请选择至少一个邮箱
          </div>
          <div style="margin-top:10px">
            <el-input-number
              v-model="randomSelectCount"
              :min="1"
              :max="10000"
              :step="100"
              style="width: 120px; margin-right: 10px;"
              placeholder="数量"
            />
            <el-button type="warning" @click="randomSelectEmails" :loading="randomSelectLoading">
              随机选择
            </el-button>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <template #footer>
        <!-- 任务类型选择时隐藏footer -->
        <template v-if="!executeType">
          <span></span>
        </template>
        <!-- 自媒体配置footer -->
        <template v-else-if="executeType === 'selfMedia'">
          <el-button @click="executeType = ''">返回</el-button>
          <el-button type="primary" @click="confirmExecute" :disabled="!executeForm.titlePrompt || !executeForm.contentPrompt">确定</el-button>
        </template>
        <!-- 投稿配置footer -->
        <template v-else-if="executeType === 'submission'">
          <el-button type="primary" @click="confirmSubmissionExecute" :loading="submissionLoading" :disabled="selectedEmails.length === 0">确定投稿</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 提示词选择弹窗 -->
    <el-dialog
      v-model="promptPickerVisible"
      title="选择提示词"
      width="600px"
      :close-on-click-modal="true"
      destroy-on-close
      append-to-body
    >
      <div class="prompt-picker-body">
        <el-input v-model="pickerSearchText" placeholder="搜索提示词" clearable @input="searchPickerPrompts" style="margin-bottom:10px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-table :data="pickerPromptList" style="width:100%" highlight-current-row :height="'400px'" v-loading="pickerLoading">
          <el-table-column v-slot="scope">
            <div class="prompt-item">
              <div class="prompt-title">{{ scope.row.title }}</div>
              <div class="prompt-content">{{ scope.row.content }}</div>
            </div>
          </el-table-column>
          <el-table-column width="80" v-slot="scope">
            <el-button size="small" type="primary" @click="pickPrompt(scope.row)">选择</el-button>
          </el-table-column>
        </el-table>
        <div style="display:flex;justify-content:center;padding-top:10px">
          <el-pagination
            v-model:current-page="pickerPage"
            v-model:page-size="pickerPageSize"
            layout="prev, pager, next"
            :total="pickerTotal"
            @current-change="loadPickerPrompts"
            background
            small
          />
        </div>
      </div>
    </el-dialog>

    <!-- 设置抽屉 -->
    <el-drawer
      v-model="settingDrawerVisible"
      title="设置"
      direction="rtl"
      size="500px"
      :close-on-click-modal="true"
    >
      <div class="setting-drawer-body">
        <!-- 账号列表 -->
        <div class="setting-section">
          <div class="setting-title">账号列表</div>
          <el-table
            :data="mediaAccounts"
            style="width: 100%"
            height="200"
            @selection-change="handleSettingAccountChange"
            ref="settingAccountTableRef"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="platform" label="平台" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.platform === 'toutiao'" type="danger" size="small">头条</el-tag>
                <el-tag v-else-if="row.platform === 'wechat'" type="success" size="small">公众号</el-tag>
                <el-tag v-else type="info" size="small">{{ row.platform }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="account_name" label="账号" show-overflow-tooltip />
          </el-table>
        </div>

        <!-- 提示词列表 -->
        <div class="setting-section">
          <div class="setting-title">提示词列表</div>
          <el-table
            :data="promptWords"
            style="width: 100%"
            height="200"
            @selection-change="handleSettingPromptChange"
            ref="settingPromptTableRef"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="title" label="标题" show-overflow-tooltip />
          </el-table>
        </div>

        <!-- 发布间隔 -->
        <div class="setting-section">
          <div class="setting-title">发布间隔</div>
          <el-form label-position="left" label-width="100px">
            <el-form-item label="间隔时间(秒)">
              <el-input-number v-model="publishInterval" :min="1" :max="3600" :step="10" />
            </el-form-item>
          </el-form>
        </div>

        <!-- 保存按钮 -->
        <div class="setting-footer">
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 账号编辑弹窗 -->
    <el-dialog
      v-model="accountDialogVisible"
      :title="isEditAccount ? '编辑账号' : '添加账号'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="accountForm" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="accountForm.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="平台">
          <el-select v-model="accountForm.platform" placeholder="请选择平台" style="width: 100%">
            <el-option label="头条" value="头条" />
            <el-option label="公众号" value="公众号" />
            <el-option label="知乎" value="知乎" />
            <el-option label="百家号" value="百家号" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="accountForm.account" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="accountForm.password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="Cookie">
          <el-input v-model="accountForm.cookie" placeholder="请输入Cookie" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="accountForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="正常" value="正常" />
            <el-option label="异常" value="异常" />
            <el-option label="停用" value="停用" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="accountForm.remark" placeholder="请输入备注" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="accountDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAccountSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, onBeforeUnmount, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { Search, Fold, Expand, Close, ArrowDown, CopyDocument, Loading, Plus, Edit, Delete, Monitor, EditPen, DocumentCopy, MagicStick, ChatLineSquare, Promotion, VideoPause, Document, CircleCheck, Clock, User, TrendCharts } from '@element-plus/icons-vue'
import RichEditor from '@/components/editor.vue'
import MarkdownIt from 'markdown-it'
import * as echarts from 'echarts'

const md = new MarkdownIt({ html: true, breaks: true, linkify: true })

// 导入所有图片
import img1 from '@/assets/images/1.jpg'
import img2 from '@/assets/images/2.jpg'
import img3 from '@/assets/images/3.jpg'
import img4 from '@/assets/images/4.jpg'
import img5 from '@/assets/images/5.jpg'
import img6 from '@/assets/images/6.jpg'
import img7 from '@/assets/images/7.jpg'
import img8 from '@/assets/images/8.jpg'
import img9 from '@/assets/images/9.jpg'
import img10 from '@/assets/images/10.jpg'
import img11 from '@/assets/images/11.jpg'
import img12 from '@/assets/images/12.jpg'
import img13 from '@/assets/images/13.jpg'
import img14 from '@/assets/images/14.jpg'

// 图片数组
const noteImages = [
  img1, img2, img3, img4, img5, img6, img7,
  img8, img9, img10, img11, img12, img13, img14
]

// 获取笔记图片
const getNoteImage = (index: number) => {
  return noteImages[index % 14]
}

interface Note {
  id?: number
  title: string
  content: string  // HTML content
  category?: string
  tags?: string
  create_time?: string
  update_time?: string
  image?: string
  type?: string
  isTemp?: boolean
  note?: string
  platform?: number  // 1: 头条, 2: 公众号
  time?: string      // 年月日格式
  genre?: number     // 1: 小说, 2: 散文, 3: 诗歌, 4: 评论, 5: 随笔
  status?: number    // 1: 已投稿, 其他: 未投稿
}

// 数据定义
const notes = ref<Note[]>([])
const currentNote = ref<Note | null>(null)
const currentNoteForSubmission = ref<Note | null>(null) // 用于投稿的笔记
const searchText = ref('')
const categories = ref<string[]>(['编程', '考研'])
const editorRef = ref(null)
const loading = ref(false)

// 表格高度计算
const tableHeight = computed(() => 'calc(100vh - 260px)')

// 统计指标计算属性
const publishedCount = computed(() => {
  return notes.value.filter(note => note.status === 1 || note.status === 2).length
})

const pendingCount = computed(() => {
  return notes.value.filter(note => !note.status || note.status === 0).length
})

const weeklyPublishCount = computed(() => {
  // 假数据，可以根据实际需求从后端获取
  return 42
})

// 编辑弹窗
const editDialogVisible = ref(false)

// ========== 投稿配置弹窗邮箱选择相关 ==========
// 投稿邮箱数据
const emailListForSubmission = ref<any[]>([])
const emailTotalForSubmission = ref(0)
const emailCurrentPageForSubmission = ref(1)
const emailPageSizeForSubmission = ref(10)
const emailLoading = ref(false)
const emailFilter = ref({
  email: '',
  editor: '',
  journal: ''
})
const selectedEmails = ref<any[]>([])
// 随机选择相关
const randomSelectCount = ref(200)
const randomSelectLoading = ref(false)
const emailTableRef = ref()

// 图表相关
const chartRef = ref<HTMLElement>()
const chartInstance = ref<echarts.ECharts | null>(null)

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  chartInstance.value = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['头条发布', '公众号发布'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '30',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLabel: { fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        name: '头条发布',
        type: 'bar',
        data: [12, 18, 15, 22, 28, 35, 30],
        itemStyle: { color: '#ff4d4f' }
      },
      {
        name: '公众号发布',
        type: 'bar',
        data: [8, 12, 10, 15, 18, 22, 20],
        itemStyle: { color: '#67c23a' }
      }
    ]
  }

  chartInstance.value.setOption(option)
}

// 加载自媒体账号（write_account）
const loadMediaAccounts = async () => {
  try {
    mediaAccountsLoading.value = true
    const res = await request.post('http://localhost:8000/api/write_account/get', {
      page: 1,
      pageNum: 1000,
      conditions: {},
      orderBy: { column: "id", type: "desc" }
    })
    if (res.code === 200 && res.result) {
      mediaAccounts.value = res.result.list || []
    }
  } catch (error) {
    console.error('获取自媒体账号失败:', error)
  } finally {
    mediaAccountsLoading.value = false
  }
}

// 加载投稿配置弹窗的邮箱列表
const loadEmailListForSubmission = async () => {
  try {
    emailLoading.value = true
    const params: any = {
      page: emailCurrentPageForSubmission.value,
      pageNum: emailPageSizeForSubmission.value
    }
    
    // 添加筛选条件
    const conditions: any = {}
    if (emailFilter.value.email) {
      conditions.email = emailFilter.value.email
    }
    if (emailFilter.value.editor) {
      conditions.editor = emailFilter.value.editor
    }
    if (emailFilter.value.journal) {
      conditions.journal = emailFilter.value.journal
    }
    
    if (Object.keys(conditions).length > 0) {
      params.conditions = conditions
    }
    
    const res = await request({
      url: '/api/solicitEmail/get',
      method: 'post',
      data: params
    })
    
    if (res.code === 200 && res.result?.list) {
      emailListForSubmission.value = res.result.list
      emailTotalForSubmission.value = res.result.pagination?.total || 0
    } else {
      emailListForSubmission.value = []
      emailTotalForSubmission.value = 0
    }
  } catch (error) {
    console.error('加载投稿邮箱列表失败:', error)
    ElMessage({ message: '加载投稿邮箱列表失败', type: 'error' })
    emailListForSubmission.value = []
    emailTotalForSubmission.value = 0
  } finally {
    emailLoading.value = false
  }
}

// 同步表格勾选状态
const syncTableSelection = async () => {
  await nextTick()
  if (emailTableRef.value) {
    const selectedEmailSet = new Set(selectedEmails.value.map((e: any) => e.email))
    emailListForSubmission.value.forEach((row: any) => {
      const isSelected = selectedEmailSet.has(row.email)
      emailTableRef.value.toggleRowSelection(row, isSelected)
    })
  }
}

// 邮箱分页变化
const handleEmailPageChangeForSubmission = async (page: number) => {
  emailCurrentPageForSubmission.value = page
  await loadEmailListForSubmission()
  syncTableSelection()
}

// 邮箱每页条数变化
const handleEmailSizeChangeForSubmission = async (size: number) => {
  emailPageSizeForSubmission.value = size
  emailCurrentPageForSubmission.value = 1
  await loadEmailListForSubmission()
  syncTableSelection()
}

// 邮箱筛选条件变化
const handleEmailFilterChange = () => {
  // 防抖处理，避免频繁请求
  clearTimeout((window as any).emailFilterTimer)
  ;(window as any).emailFilterTimer = setTimeout(() => {
    emailCurrentPageForSubmission.value = 1
    loadEmailListForSubmission()
  }, 500)
}

// 重置筛选条件
const resetEmailFilter = async () => {
  emailFilter.value = {
    email: '',
    editor: '',
    journal: ''
  }
  emailCurrentPageForSubmission.value = 1
  await loadEmailListForSubmission()
  syncTableSelection()
}

// 邮箱选择变化 - 支持跨页保持勾选
const handleEmailSelectionChange = (selection: any[]) => {
  // 获取当前页的所有邮箱
  const currentPageEmails = new Set(emailListForSubmission.value.map((e: any) => e.email))
  // 获取当前页被选中的邮箱
  const selectedInCurrentPage = new Set(selection.map((e: any) => e.email))
  
  // 保留不在当前页的已选邮箱，更新当前页的选择状态
  const otherPageSelected = selectedEmails.value.filter((e: any) => !currentPageEmails.has(e.email))
  const currentPageSelected = selection.filter((e: any) => currentPageEmails.has(e.email))
  
  selectedEmails.value = [...otherPageSelected, ...currentPageSelected]
}

// 随机选择邮箱
const randomSelectEmails = async () => {
  try {
    randomSelectLoading.value = true
    
    // 获取已选择邮箱的email列表（用于排除）
    const excludeEmails = selectedEmails.value.map(e => e.email)
    
    // 构建筛选条件
    const conditions: any = {}
    if (emailFilter.value.email) {
      conditions.email = emailFilter.value.email
    }
    if (emailFilter.value.editor) {
      conditions.editor = emailFilter.value.editor
    }
    if (emailFilter.value.journal) {
      conditions.journal = emailFilter.value.journal
    }
    
    const params: any = {
      count: randomSelectCount.value,
      exclude_emails: excludeEmails,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined
    }
    
    const res = await request({
      url: '/api/solicitEmail/random',
      method: 'post',
      data: params
    })
    
    if (res.code === 200 && res.result?.list) {
      const randomEmails = res.result.list
      
      // 合并到已选择数组
      const newSelectedEmails = [...selectedEmails.value, ...randomEmails]
      selectedEmails.value = newSelectedEmails
      
      // 同步表格勾选状态
      syncTableSelection()
      
      ElMessage({ message: `已随机选择 ${randomEmails.length} 个邮箱，当前共 ${selectedEmails.value.length} 个邮箱`, type: 'success' })
    } else {
      ElMessage({ message: '随机获取邮箱失败', type: 'error' })
    }
  } catch (error) {
    console.error('随机选择邮箱失败:', error)
    ElMessage({ message: '随机选择邮箱失败', type: 'error' })
  } finally {
    randomSelectLoading.value = false
  }
}


// 打开邮箱编辑弹窗
const openEmailEditDialog = (row?: any, index?: number) => {
  if (row && index !== undefined) {
    // 编辑模式
    emailEditIndex.value = index
    emailForm.value = { ...row }
  } else {
    // 新增模式
    emailEditIndex.value = -1
    emailForm.value = {
      id: undefined,
      email: '',
      editor: '',
      journal: '',
      prompt: '',
      description: ''
    }
  }
  emailEditDialogVisible.value = true
}

// 保存邮箱
const saveEmail = async () => {
  if (!emailForm.value.email) {
    ElMessage({ message: '请输入邮箱地址', type: 'warning' })
    return
  }
  try {
    if (emailEditIndex.value === -1) {
      // 新增
      const res = await request({
        url: '/api/solicitEmail/add',
        method: 'post',
        data: emailForm.value
      })
      if (res.code === 200) {
        ElMessage({ message: '新增成功', type: 'success' })
        loadEmailList()
      } else {
        ElMessage({ message: '新增失败', type: 'error' })
      }
    } else {
      // 编辑
      const res = await request({
        url: '/api/solicitEmail/update',
        method: 'post',
        data: emailForm.value
      })
      if (res.code === 200) {
        ElMessage({ message: '编辑成功', type: 'success' })
        loadEmailList()
      } else {
        ElMessage({ message: '编辑失败', type: 'error' })
      }
    }
    emailEditDialogVisible.value = false
  } catch (error) {
    console.error('保存邮箱失败:', error)
    ElMessage({ message: '保存失败', type: 'error' })
  }
}

// 删除邮箱
const deleteEmail = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await request({
      url: '/api/solicitEmail/delete',
      method: 'post',
      data: { id: row.id }
    })
    if (res.code === 200) {
      ElMessage({ message: '删除成功', type: 'success' })
      loadEmailList()
    } else {
      ElMessage({ message: '删除失败', type: 'error' })
    }
  } catch {
    // 用户取消
  }
}

// ========== 查看邮件相关方法 ==========
// 加载收到的邮件列表
const loadReceivedEmailList = async () => {
  receivedEmailLoading.value = true
  try {
    const res = await request.post('http://localhost:8000/api/email/get', {
      page: receivedEmailCurrentPage.value,
      pageNum: receivedEmailPageSize.value
    })
    if (res.code === 200 && res.result?.list) {
      receivedEmailList.value = res.result.list
      receivedEmailTotal.value = res.result.total || 0
    } else {
      ElMessage({ message: res.message || '加载邮件列表失败', type: 'error' })
    }
  } catch (error) {
    console.error('加载邮件列表失败:', error)
    ElMessage({ message: '加载邮件列表失败', type: 'error' })
  } finally {
    receivedEmailLoading.value = false
  }
}

// 邮件分页变化
const handleReceivedEmailPageChange = (page: number) => {
  receivedEmailCurrentPage.value = page
  loadReceivedEmailList()
}

// 邮件每页条数变化
const handleReceivedEmailSizeChange = (size: number) => {
  receivedEmailPageSize.value = size
  receivedEmailCurrentPage.value = 1
  loadReceivedEmailList()
}

// 查看邮件详情
const handleViewEmailDetail = async (row: any) => {
  emailDetailDialogVisible.value = true
  emailDetailLoading.value = true
  currentEmailDetail.value = null
  // 重置AI分析状态
  aiAnalyzeLoading.value = false
  aiAnalyzeCompleted.value = false
  aiAnalyzeSteps.value = []
  aiAnalyzeResult.value = null

  try {
    const res = await request.post('http://localhost:8000/api/email/detail', { id: row.id })
    if (res.code === 200) {
      currentEmailDetail.value = res.result
    } else {
      ElMessage({ message: res.message || '获取邮件详情失败', type: 'error' })
    }
  } catch (error) {
    console.error('获取邮件详情失败:', error)
    ElMessage({ message: '获取邮件详情失败', type: 'error' })
  } finally {
    emailDetailLoading.value = false
  }
}

// 格式化邮件内容
const formatEmailContent = (content: string) => {
  if (!content) return ''

  // 如果内容包含HTML标签，直接返回
  if (content.includes('<html') || content.includes('<div') || content.includes('<p>')) {
    return content
  }

  // 否则将纯文本转换为HTML格式
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\s{2,}/g, (match) => '&nbsp;'.repeat(match.length))
}

// AI分析邮件
const handleAIAnalyzeEmail = (row: any) => {
  currentAnalyzeEmail.value = row
  aiAnalyzeDialogVisible.value = true
  aiAnalyzeLoading.value = false
  aiAnalyzeCompleted.value = false
  aiAnalyzeSteps.value = []
  aiAnalyzeResult.value = null
}

// 开始内联AI分析（在邮件详情弹窗内）
const startAIAnalyzeInline = () => {
  aiAnalyzeLoading.value = false
  aiAnalyzeCompleted.value = false
  aiAnalyzeSteps.value = []
  aiAnalyzeResult.value = null
  // 立即开始分析
  nextTick(() => {
    startAIAnalyze()
  })
}

// 关闭AI分析面板
const closeAIAnalyzePanel = () => {
  aiAnalyzeSteps.value = []
  aiAnalyzeResult.value = null
  aiAnalyzeLoading.value = false
}

// 开始AI分析
const startAIAnalyze = async () => {
  if (!currentEmailDetail.value) return

  aiAnalyzeLoading.value = true
  aiAnalyzeCompleted.value = false
  aiAnalyzeSteps.value = []
  aiAnalyzeResult.value = null

  // 添加第一步：获取邮件详情
  aiAnalyzeSteps.value.push({
    title: '获取邮件详情',
    description: '正在获取邮件完整内容...',
    status: 'process'
  })

  try {
    // 使用当前已有的邮件详情
    const emailDetail = currentEmailDetail.value

    aiAnalyzeSteps.value[0].status = 'success'
    aiAnalyzeSteps.value[0].description = '邮件详情获取成功'
    aiAnalyzeSteps.value[0].status = 'success'
    aiAnalyzeSteps.value[0].description = '邮件详情获取成功'

    // 添加第二步：AI分析
    aiAnalyzeSteps.value.push({
      title: 'AI分析邮件内容',
      description: '正在分析邮件内容...',
      status: 'process'
    })

    // 构建提示词
    const prompt = `分析这封邮件内容 如果是退稿的话 需要调用 solicitEmail\\delete  删除对应邮箱的
返回格式{
  action:""  有 delete 等
  content:""
}

如果是回复内容 需要提取邮件编辑的备注信息 作为当前邮件的 描述 调用 solicitEmail\\update

邮件信息：
主题：${emailDetail.subject}
发件人：${emailDetail.from_name} <${emailDetail.from_addr}>
内容：${emailDetail.content}`

    // 调用AI分析
    let aiResponse = ''
    const { fetchEventSource } = await import('@microsoft/fetch-event-source')
    const controller = new AbortController()

    const dsToken = dsCookies.value || await getCookieByUrl('ds')
    if (!dsToken) {
      ElMessage.error('未配置 DeepSeek Token')
      aiAnalyzeLoading.value = false
      return
    }

    await fetchEventSource('http://localhost:8000/api/ds/aichat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ prompt, token: dsToken }),
      signal: controller.signal,
      onopen: async (response) => {
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          return
        }
        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
        }
      },
      onmessage(event) {
        if (!event.data) return
        if (event.data === '[DONE]') {
          return
        }
        try {
          const data = JSON.parse(event.data)
          if (data.content && data.content !== 'FINISHED') {
            aiResponse += data.content
          }
        } catch (e) {
          aiResponse += event.data
        }
      },
      onclose: () => {
        // 流式传输完成
      },
      onerror(err) {
        console.error('AI分析失败:', err)
        throw err
      }
    })

    aiAnalyzeSteps.value[1].status = 'success'
    aiAnalyzeSteps.value[1].description = 'AI分析完成'

    // 解析AI返回结果
    let result: any = null
    try {
      // 尝试从返回内容中提取JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('解析AI返回结果失败:', e)
    }

    if (!result || !result.action) {
      aiAnalyzeSteps.value.push({
        title: '分析结果',
        description: '未识别到需要执行的操作',
        status: 'warning'
      })
      aiAnalyzeResult.value = {
        action: 'none',
        content: aiResponse
      }
      aiAnalyzeLoading.value = false
      aiAnalyzeCompleted.value = true
      return
    }

    aiAnalyzeResult.value = result

    // 根据action执行相应操作
    if (result.action === 'delete') {
      // 添加第三步：删除邮箱
      aiAnalyzeSteps.value.push({
        title: '删除征稿邮箱',
        description: '正在删除邮箱...',
        status: 'process'
      })

      // 从邮件地址中提取要删除的邮箱
      const emailToDelete = emailDetail.from_addr

      try {
        const deleteRes = await request.post('http://localhost:8000/api/solicitEmail/delete', {
          conditions: { email: emailToDelete }
        })

        if (deleteRes.code === 200) {
          aiAnalyzeSteps.value[2].status = 'success'
          aiAnalyzeSteps.value[2].description = `已删除邮箱：${emailToDelete}`
          ElMessage({ message: '删除成功', type: 'success' })
        } else {
          aiAnalyzeSteps.value[2].status = 'error'
          aiAnalyzeSteps.value[2].description = `删除失败：${deleteRes.message}`
        }
      } catch (error) {
        aiAnalyzeSteps.value[2].status = 'error'
        aiAnalyzeSteps.value[2].description = '删除操作失败'
      }
    } else if (result.action === 'update') {
      // 添加第三步：更新邮箱
      aiAnalyzeSteps.value.push({
        title: '更新征稿邮箱',
        description: '正在更新邮箱描述...',
        status: 'process'
      })

      const emailToUpdate = emailDetail.from_addr

      try {
        const updateRes = await request.post('http://localhost:8000/api/solicitEmail/update', {
          conditions: { email: emailToUpdate },
          data: { description: result.content }
        })

        if (updateRes.code === 200) {
          aiAnalyzeSteps.value[2].status = 'success'
          aiAnalyzeSteps.value[2].description = `已更新邮箱：${emailToUpdate}`
          ElMessage({ message: '更新成功', type: 'success' })
        } else {
          aiAnalyzeSteps.value[2].status = 'error'
          aiAnalyzeSteps.value[2].description = `更新失败：${updateRes.message}`
        }
      } catch (error) {
        aiAnalyzeSteps.value[2].status = 'error'
        aiAnalyzeSteps.value[2].description = '更新操作失败'
      }
    }

    aiAnalyzeCompleted.value = true
  } catch (error) {
    console.error('AI分析失败:', error)
    ElMessage({ message: 'AI分析失败', type: 'error' })
    if (aiAnalyzeSteps.value.length > 0) {
      aiAnalyzeSteps.value[aiAnalyzeSteps.value.length - 1].status = 'error'
    }
  } finally {
    aiAnalyzeLoading.value = false
  }
}


// AI处理
const handleAiProcess = async () => {
  if (!aiInputText.value.trim()) {
    ElMessage({ message: `请输入${aiSourceType.value === 'content' ? '邮箱内容' : 'URL链接'}`, type: 'warning' })
    return
  }

  aiLoading.value = true
  // 清空batchAddText并重置打字机
  batchAddText.value = ''
  batchTypewriterBuffer = ''
  stopBatchTypewriter()
  
  try {
    // 拼接提示词：用户输入 + 换行 + 提示词模板
    const prompt = aiInputText.value + '\n' + aiPromptText.value

    // 使用流式接口 /api/ds/aichat
    const { fetchEventSource } = await import('@microsoft/fetch-event-source')
    const controller = new AbortController()
    
    await fetchEventSource('http://localhost:8000/api/ds/aichat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ prompt, token: dsToken }),
      signal: controller.signal,
      onopen: async (response) => {
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          return
        }
        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
        }
      },
      onmessage: (event) => {
        if (!event.data) return
        if (event.data === '[DONE]') {
          return
        }

        try {
          const payload = JSON.parse(event.data)
          if (payload.content === 'FINISHED') {
            return
          }
          if (payload.error) {
            batchTypewriterBuffer += `\n${payload.error}`
          } else if (payload.content) {
            batchTypewriterBuffer += payload.content
          }
        } catch (e) {
          batchTypewriterBuffer += event.data
        }
        // 启动批量新增打字机（如果尚未运行）
        startBatchTypewriter()
      },
      onclose: () => {
        // 流式传输完成
        setTimeout(() => {
          stopBatchTypewriter()
          aiLoading.value = false
          ElMessage({ message: 'AI整理完成，结果已填入下方', type: 'success' })
        }, 100)
      },
      onerror: (error) => {
        console.error('AI流式处理失败:', error)
        stopBatchTypewriter()
        aiLoading.value = false
        ElMessage({ 
          message: `AI处理失败: ${error.message || '未知错误'}`,
          type: 'error' 
        })
        throw error
      }
    })
  } catch (error) {
    console.error('AI处理失败:', error)
    stopBatchTypewriter()
    aiLoading.value = false
    ElMessage({ 
      message: 'AI处理失败，请稍后重试', 
      type: 'error' 
    })
  }
}

// 批量新增邮箱
const handleBatchAdd = async () => {
  if (!batchAddText.value.trim()) {
    ElMessage({ message: '请输入要批量新增的数据', type: 'warning' })
    return
  }

  batchAddLoading.value = true
  try {
    const res = await request({
      url: '/api/solicitEmail/batchAdd',
      method: 'post',
      data: { text: batchAddText.value }
    })
    if (res.code === 200) {
      ElMessage({ message: res.message || '批量新增成功', type: 'success' })
      batchAddText.value = ''
      aiInputText.value = ''
      batchAddDialogVisible.value = false
      loadEmailList()
    } else {
      ElMessage({ message: res.message || '批量新增失败', type: 'error' })
    }
  } catch (error) {
    console.error('批量新增失败:', error)
    ElMessage({ message: '批量新增失败', type: 'error' })
  } finally {
    batchAddLoading.value = false
  }
}

// 公众号面板
const centerPanelVisible = ref(false)

// 自媒体账号数据
const mediaAccounts = ref([])
const mediaAccountsLoading = ref(false)

// 账号表单相关
const accountDialogVisible = ref(false)
const accountForm = ref({
  id: undefined,
  name: '',
  platform: '',
  account: '',
  password: '',
  cookie: '',
  status: '正常',
  remark: ''
})
const isEditAccount = ref(false)

const openAddAccountDialog = () => {
  isEditAccount.value = false
  accountForm.value = {
    id: undefined,
    name: '',
    platform: '',
    account: '',
    password: '',
    cookie: '',
    status: '正常',
    remark: ''
  }
  accountDialogVisible.value = true
}

const editMediaAccount = (row) => {
  isEditAccount.value = true
  accountForm.value = { ...row }
  accountDialogVisible.value = true
}

const handleAccountSubmit = async () => {
  if (!accountForm.value.name) {
    ElMessage.warning('请输入名称')
    return
  }
  try {
    const url = isEditAccount.value ? 'http://localhost:8000/api/write_account/update' : 'http://localhost:8000/api/write_account/add'
    const res = await request.post(url, accountForm.value)
    if (res.code === 200) {
      ElMessage.success(isEditAccount.value ? '更新成功' : '添加成功')
      accountDialogVisible.value = false
      loadMediaAccounts()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存账号失败:', error)
    ElMessage.error('保存失败')
  }
}

const deleteMediaAccount = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该账号吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await request.post('http://localhost:8000/api/write_account/delete', { id: row.id })
    if (res.code === 200) {
      ElMessage.success('删除成功')
      loadMediaAccounts()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const toggleCenterPanel = () => {
  centerPanelVisible.value = !centerPanelVisible.value
  if (centerPanelVisible.value) {
    loadMediaAccounts()
    loadPublishedNotes()
    loadUnpublishedNotes()
  }
}

// 左侧列表分页
const notesPage = ref(1)
const notesPageSize = ref(10)
const notesTotal = ref(0)

// 任务日志相关
const taskLogs = ref<{ time: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([])
const logContainerRef = ref<HTMLElement>()

// 添加日志的封装函数
const addTaskLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  taskLogs.value.push({
    time: timeStr,
    message,
    type
  })
  // 限制日志数量，最多保留100条
  if (taskLogs.value.length > 100) {
    taskLogs.value.shift()
  }
  // 自动滚动到底部
  nextTick(() => {
    if (logContainerRef.value) {
      logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
    }
  })
}

// 清空日志
const clearTaskLogs = () => {
  taskLogs.value = []
}

// 模拟任务执行（假数据测试）
const simulateTaskExecution = () => {
  addTaskLog('开始执行任务...', 'info')
  let count = 0
  const interval = setInterval(() => {
    count++
    const types: ('info' | 'success' | 'warning' | 'error')[] = ['info', 'success', 'warning', 'error']
    const type = types[Math.floor(Math.random() * types.length)]
    const messages = [
      '正在连接服务器...',
      '获取账号列表成功',
      '正在发布文章到头条',
      '发布成功: 文章《测试文章》',
      '等待下次发布...',
      '检查账号状态',
      '账号状态正常',
      '准备发布下一篇'
    ]
    const message = messages[Math.floor(Math.random() * messages.length)]
    addTaskLog(message, type)
    if (count >= 10) {
      clearInterval(interval)
      addTaskLog('任务执行完成', 'success')
    }
  }, 1000)
}

// 开始所有任务
const startAllTasks = () => {
  // 先添加一些初始日志
  addTaskLog('用户点击开始所有任务', 'info')
  addTaskLog('正在加载已保存的设置...', 'info')

  // 从缓存读取设置
  const savedAccounts = localStorage.getItem('selectedAccountIds')
  const savedPrompts = localStorage.getItem('selectedPromptIds')
  const savedInterval = localStorage.getItem('publishInterval')

  if (savedAccounts) {
    const accountIds = JSON.parse(savedAccounts)
    addTaskLog(`已选择 ${accountIds.length} 个账号`, 'info')
  } else {
    addTaskLog('未选择任何账号，请先设置', 'warning')
    return
  }

  if (savedPrompts) {
    const promptIds = JSON.parse(savedPrompts)
    addTaskLog(`已选择 ${promptIds.length} 个提示词`, 'info')
  }

  if (savedInterval) {
    addTaskLog(`发布间隔设置为 ${savedInterval} 秒`, 'info')
  }

  // 模拟任务执行
  simulateTaskExecution()
}

interface QuotedContent {
  text: string       // 选中的纯文本
  html: string       // 选中的 HTML
  startLine: number  // 起始行号
  endLine: number    // 结束行号
}

interface AskMessage {
  role: 'user' | 'assistant' | 'prompt'
  content: string
  prompts?: any[] // 勾选的提示词列表
  editorDone?: boolean // 编辑器渲染完成标记
  editorTotal?: number // 渲染的段落总数
  quoted?: QuotedContent | null // 引用的编辑器内容
}

const askMessages = ref<AskMessage[]>([
  { role: 'assistant', content: '你好' }
])
const askInput = ref('')
const askLoading = ref(false)
const askScrollRef = ref<HTMLElement | null>(null)

// 引用内容相关
const quotedContent = ref<QuotedContent | null>(null)

// Ctrl+L 获取编辑器选中内容
const handleCtrlL = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'l') {
    // 只在编辑弹窗打开时生效
    if (!editDialogVisible.value) return
    e.preventDefault()
    const editor = (editorRef.value as any)?.editor
    if (!editor) return

    const { from, to, empty } = editor.state.selection
    if (empty) return

    const selectedText = editor.state.doc.textBetween(from, to, '\n')
    if (!selectedText.trim()) return

    // 计算行号：遍历文档的顶层块节点确定 from/to 所在的行
    let lineCount = 0
    let startLine = 1
    let endLine = 1
    editor.state.doc.forEach((node: any, offset: number) => {
      lineCount++
      const nodeEnd = offset + node.nodeSize
      if (offset <= from && from < nodeEnd) {
        startLine = lineCount
      }
      if (offset < to && to <= nodeEnd) {
        endLine = lineCount
      }
    })

    quotedContent.value = {
      text: selectedText,
      html: '',
      startLine,
      endLine
    }

    // 聚焦到输入框
    nextTick(() => {
      const textarea = document.querySelector('.ask-input .el-textarea__inner') as HTMLTextAreaElement
      textarea?.focus()
    })
  }
}

// 清除引用
const clearQuote = () => {
  quotedContent.value = null
}

// 用于中断正在进行的 AI 请求
let currentAskController: AbortController | null = null

// 会话记录相关
interface ChatSession {
  id: number
  title: string
  messages: AskMessage[]
  createTime: string
}

const chatSessions = ref<ChatSession[]>([])
const currentSessionId = ref<number>(0)
const chatHistoryVisible = ref(false)

// 初始化第一个会话
const initFirstSession = () => {
  if (chatSessions.value.length === 0) {
    const firstSession: ChatSession = {
      id: Date.now(),
      title: '新会话',
      messages: [{ role: 'assistant', content: '你好' }],
      createTime: new Date().toLocaleString()
    }
    chatSessions.value.push(firstSession)
    currentSessionId.value = firstSession.id
  }
}

// 创建新会话
const createNewChat = () => {
  // 保存当前会话
  saveCurrentSession()

  // 创建新会话
  const newSession: ChatSession = {
    id: Date.now(),
    title: '新会话',
    messages: [{ role: 'assistant', content: '你好' }],
    createTime: new Date().toLocaleString()
  }

  chatSessions.value.unshift(newSession)
  currentSessionId.value = newSession.id
  askMessages.value = [...newSession.messages]

  ElMessage({ message: '已创建新会话', type: 'success' })
}

// 保存当前会话
const saveCurrentSession = () => {
  const currentSession = chatSessions.value.find(s => s.id === currentSessionId.value)
  if (currentSession) {
    currentSession.messages = [...askMessages.value]
    // 自动生成标题（取第一条用户消息的前20个字符）
    const firstUserMsg = askMessages.value.find(m => m.role === 'user')
    if (firstUserMsg && currentSession.title === '新会话') {
      currentSession.title = firstUserMsg.content.substring(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
    }
  }
}

// 切换会话
const switchSession = (sessionId: number) => {
  // 保存当前会话
  saveCurrentSession()

  // 切换到选中的会话
  const session = chatSessions.value.find(s => s.id === sessionId)
  if (session) {
    currentSessionId.value = sessionId
    askMessages.value = [...session.messages]
    chatHistoryVisible.value = false
    ElMessage({ message: '已切换会话', type: 'success' })
  }
}

// 删除会话
const deleteSession = (sessionId: number) => {
  const index = chatSessions.value.findIndex(s => s.id === sessionId)
  if (index !== -1) {
    chatSessions.value.splice(index, 1)

    // 如果删除的是当前会话，切换到第一个会话或创建新会话
    if (sessionId === currentSessionId.value) {
      if (chatSessions.value.length > 0) {
        const firstSession = chatSessions.value[0]
        currentSessionId.value = firstSession.id
        askMessages.value = [...firstSession.messages]
      } else {
        createNewChat()
      }
    }

    ElMessage({ message: '已删除会话', type: 'success' })
  }
}

// 编辑器渲染状态
const editorRendering = ref(false)
const editorRenderMsgIndex = ref(-1)
const editorRenderStatusText = ref('')

const scrollAskToBottom = () => {
  nextTick(() => {
    if (askScrollRef.value) {
      askScrollRef.value.scrollTop = askScrollRef.value.scrollHeight
    }
  })
}

// 打字机效果相关
let typewriterBuffer = '' // 待渲染的文字缓冲区
let typewriterTimer: number | null = null
let typewriterIndex = -1 // 当前打字机目标在 askMessages 中的索引
const typewriterSpeed = 20 // 每个字符的间隔(ms)

// 批量新增打字机效果相关
let batchTypewriterBuffer = '' // 批量新增待渲染的文字缓冲区
let batchTypewriterTimer: number | null = null
const batchTypewriterSpeed = 10 // 批量新增打字机速度，比普通打字机快一些

const startTypewriter = (targetIndex: number) => {
  typewriterIndex = targetIndex
  if (typewriterTimer) return // 已在运行
  const tick = () => {
    if (typewriterBuffer.length > 0 && typewriterIndex >= 0) {
      // 每次取出一个字符（处理多字节字符）
      const char = typewriterBuffer[0]
      typewriterBuffer = typewriterBuffer.slice(1)
      // 通过数组索引访问 Vue 响应式代理对象，确保触发视图更新
      askMessages.value[typewriterIndex].content += char
      scrollAskToBottom()
      typewriterTimer = window.setTimeout(tick, typewriterSpeed)
    } else {
      typewriterTimer = null
      // 缓冲区空了，如果流已结束则关闭loading
      if (!askLoading.value) {
        scrollAskToBottom()
      }
    }
  }
  tick()
}

// 批量新增打字机效果
const startBatchTypewriter = () => {
  if (batchTypewriterTimer) return // 已在运行
  const tick = () => {
    if (batchTypewriterBuffer.length > 0) {
      // 每次取出一个字符（处理多字节字符）
      const char = batchTypewriterBuffer[0]
      batchTypewriterBuffer = batchTypewriterBuffer.slice(1)
      // 将字符添加到batchAddText
      batchAddText.value += char
      batchTypewriterTimer = window.setTimeout(tick, batchTypewriterSpeed)
    } else {
      batchTypewriterTimer = null
    }
  }
  tick()
}

const stopBatchTypewriter = () => {
  // 把缓冲区剩余内容一次性输出
  if (batchTypewriterBuffer.length > 0) {
    batchAddText.value += batchTypewriterBuffer
    batchTypewriterBuffer = ''
  }
  if (batchTypewriterTimer) {
    clearTimeout(batchTypewriterTimer)
    batchTypewriterTimer = null
  }
}

const stopTypewriter = () => {
  // 把缓冲区剩余内容一次性输出
  if (typewriterIndex >= 0 && typewriterBuffer.length > 0) {
    askMessages.value[typewriterIndex].content += typewriterBuffer
    typewriterBuffer = ''
  }
  if (typewriterTimer) {
    clearTimeout(typewriterTimer)
    typewriterTimer = null
  }
  typewriterIndex = -1
  scrollAskToBottom()
}

// 编辑器打字机效果相关
let editorTypewriterBuffer = ''
let editorTypewriterTimer: number | null = null
const editorTypewriterSpeed = 20

const startEditorTypewriter = () => {
  if (editorTypewriterTimer) return
  const tick = () => {
    if (editorTypewriterBuffer.length > 0) {
      const char = editorTypewriterBuffer[0]
      editorTypewriterBuffer = editorTypewriterBuffer.slice(1)
      if (editorRef.value) {
        editorRef.value.insertContent(char)
      }
      editorTypewriterTimer = window.setTimeout(tick, editorTypewriterSpeed)
    } else {
      editorTypewriterTimer = null
    }
  }
  tick()
}

const stopEditorTypewriter = () => {
  if (editorTypewriterBuffer.length > 0 && editorRef.value) {
    editorRef.value.insertContent(editorTypewriterBuffer)
    editorTypewriterBuffer = ''
  }
  if (editorTypewriterTimer) {
    clearTimeout(editorTypewriterTimer)
    editorTypewriterTimer = null
  }
}

// 将 AI 返回的 JSON contents 渲染到编辑器（打字机效果）
const renderContentsToEditor = async (contents: any[], msgIndex: number) => {
  if (!currentNote.value) {
    ElMessage({ message: '请先选择或创建一个笔记', type: 'warning' })
    return
  }

  // 设置渲染状态
  editorRendering.value = true
  editorRenderMsgIndex.value = msgIndex
  editorRenderStatusText.value = '准备渲染...'
  scrollAskToBottom()

  // 清空编辑器
  if (editorRef.value) {
    editorRef.value.setContent('<p></p>')
  }
  await nextTick()

  let textCount = 0
  // 逐项处理 contents
  for (let i = 0; i < contents.length; i++) {
    const item = contents[i]
    if (item.type === 'img' && item.content) {
      await waitEditorTypewriterDone()
      editorRenderStatusText.value = `插入图片 ${i + 1}/${contents.length}...`
      scrollAskToBottom()
      if (editorRef.value) {
        editorRef.value.insertContent(`<img src="${item.content}" style="max-width:100%" />`)
        editorRef.value.insertContent('<p><br></p>')
      }
      await nextTick()
    } else if (item.type === 'text' && item.content) {
      textCount++
      editorRenderStatusText.value = `正在写入第 ${textCount} 段...`
      scrollAskToBottom()
      // 用打字机效果逐字渲染
      editorTypewriterBuffer += item.content
      startEditorTypewriter()
      await waitEditorTypewriterDone()
      // 段落结束加换行
      if (editorRef.value) {
        editorRef.value.insertContent('<p><br></p>')
      }
      await nextTick()
    }
  }

  // 渲染完成
  editorRendering.value = false
  editorRenderMsgIndex.value = -1
  // 更新消息状态为完成
  if (msgIndex >= 0 && askMessages.value[msgIndex]) {
    askMessages.value[msgIndex].editorDone = true
    askMessages.value[msgIndex].editorTotal = textCount
    askMessages.value[msgIndex].content = '' // 清空原始 JSON 内容
  }
  scrollAskToBottom()
}

// 等待编辑器打字机完成
const waitEditorTypewriterDone = () => {
  return new Promise<void>(resolve => {
    const check = () => {
      if (editorTypewriterBuffer.length === 0 && !editorTypewriterTimer) {
        resolve()
      } else {
        setTimeout(check, 50)
      }
    }
    check()
  })
}

// 尝试从 AI 回复中解析 JSON contents
const tryParseAndRenderToEditor = (fullText: string, msgIndex: number) => {
  try {
    let jsonStr = fullText.trim()
    // 尝试提取 markdown 代码块中的 JSON
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }
    // 尝试提取第一个 { 到最后一个 } 之间的内容（去掉前后杂质）
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (braceMatch) {
      jsonStr = braceMatch[0]
    }
    const parsed = JSON.parse(jsonStr)
    if (parsed && Array.isArray(parsed.contents)) {
      console.log('解析到 JSON contents，开始渲染到编辑器', parsed.contents.length, '项')
      renderContentsToEditor(parsed.contents, msgIndex)
      return true
    }
  } catch (e) {
    console.log('AI 回复不是 JSON 格式，跳过编辑器渲染', e)
  }
  return false
}

// 开始执行：随机选一个已选提示词填入输入框，0.5秒后自动发送
const executeRandomPrompt = () => {
  if (selectedPrompts.value.length === 0 || askLoading.value) return
  const randomIndex = Math.floor(Math.random() * selectedPrompts.value.length)
  const picked = selectedPrompts.value[randomIndex]
  askInput.value = stripHtml(picked.content)
  setTimeout(() => {
    sendAsk()
  }, 500)
}

// ========== 执行配置弹窗相关 ==========
const executeDialogVisible = ref(false)
const executeType = ref<'selfMedia' | 'submission' | ''>('') // 任务类型
const submissionStep = ref(0) // 投稿步骤
const selectedEmail = ref<any>(null) // 选中的投稿邮箱
const executeForm = ref({
  count: 1,
  titlePrompt: '',
  contentPrompt: ''
})

// 提示词选择器相关
const promptPickerVisible = ref(false)
const pickerSearchText = ref('')
const pickerPromptList = ref<any[]>([])
const pickerPage = ref(1)
const pickerPageSize = ref(10)
const pickerTotal = ref(0)
const pickerLoading = ref(false)
const pickerTarget = ref<'title' | 'content' | 'ask'>('title') // 当前选择器目标

const openExecuteDialog = (note?: Note) => {
  executeType.value = ''
  submissionStep.value = 0
  selectedEmail.value = null
  selectedEmails.value = []
  executeDialogVisible.value = true
  
  // 如果有传入笔记，保存到执行配置
  if (note) {
    console.log('有传入笔记，保存到执行配置',note)
    currentNoteForSubmission.value = note
  }
  
  // 重置筛选条件
  emailFilter.value = {
    email: '',
    editor: '',
    journal: ''
  }
  emailCurrentPageForSubmission.value = 1
  
  // 加载邮箱列表
  loadEmailListForSubmission()
}

// 选择任务类型
const selectTaskType = (type: 'selfMedia' | 'submission') => {
  executeType.value = type
  if (type === 'submission') {
    submissionStep.value = 0
    selectedEmail.value = null
    selectedEmails.value = []
    
    // 重置筛选条件
    emailFilter.value = {
      email: '',
      editor: '',
      journal: ''
    }
    emailCurrentPageForSubmission.value = 1
    
    // 加载邮箱列表
    loadEmailListForSubmission()
  }
}

// 重置弹窗状态
const resetExecuteDialog = () => {
  executeType.value = ''
  submissionStep.value = 0
  selectedEmail.value = null
  selectedEmails.value = []
  executeForm.value = {
    count: 1,
    titlePrompt: '',
    contentPrompt: ''
  }
}

// 选择投稿邮箱
const handleEmailSelect = (row: any) => {
  selectedEmail.value = row
}

// 投稿发送loading
const submissionLoading = ref(false)

// 确认投稿执行
const confirmSubmissionExecute = async () => {
  if (selectedEmails.value.length === 0) return
  
  // 使用已获取的笔记内容
  const noteData = currentNote.value
  if (!noteData) {
    ElMessage({ message: '笔记内容未加载，请重试', type: 'warning' })
    return
  }
  
  const title = noteData.title || ''
  const content = noteData.note || noteData.content || ''
  
  if (!title || !content) {
    ElMessage({ message: '笔记标题或内容为空', type: 'warning' })
    return
  }
  
  try {
    submissionLoading.value = true
    
    // 传递完整的邮箱对象数组（包含 email、journal 等信息）
    const emailList = selectedEmails.value.map(email => ({
      email: email.email,
      journal: email.journal || ''
    }))

    const welcomeTxt = `编辑老师您好：<br/>现投稿作品《${title}》，恳请审阅。
    <br/><br/>作者：刘学超
    <br/>地址：广州市增城区中新镇
    <br/>联系方式：13798425457 / 169336658@qq.com<br/>感谢您的时间！
    <br/><br/><br/><br/><br/>
    =========================以下是作品部分===================================
`

    const res = await request.post('http://localhost:8000/api/solicitEmail/batchSend', {
      email_list: emailList,
      article_title: title,
      author_name: '刘学超',
      welcomeTxt: welcomeTxt,
      content: content
    })
    
    if (res.code === 200) {
      ElMessage({ 
        message: `投稿发送完成！成功 ${res.data?.success_count || 0} 封，失败 ${res.data?.fail_count || 0} 封`, 
        type: 'success' 
      })
      executeDialogVisible.value = false
    } else {
      ElMessage({ 
        message: res.message || '投稿发送失败', 
        type: 'error' 
      })
    }
  } catch (error) {
    console.error('投稿发送失败:', error)
    ElMessage({ message: '投稿发送失败', type: 'error' })
  } finally {
    submissionLoading.value = false
  }
}

const openPromptPicker = (target: 'title' | 'content' | 'ask') => {
  pickerTarget.value = target
  pickerSearchText.value = ''
  pickerPage.value = 1
  promptPickerVisible.value = true
  loadPickerPrompts()
}

const loadPickerPrompts = async () => {
  try {
    pickerLoading.value = true
    const params = {
      page: pickerPage.value,
      pageNum: pickerPageSize.value,
      conditions: { type: 1 } as any,
      orderBy: { column: 'id', type: 'desc' }
    }
    if (pickerSearchText.value) {
      params.conditions.title = pickerSearchText.value
    }
    const res = await request.post('http://localhost:8000/api/prompt/get', params)
    if (res.code === 200 && res.result?.list) {
      pickerPromptList.value = res.result.list
      pickerTotal.value = res.result.pagination?.total || res.result.total || 0
    } else {
      pickerPromptList.value = []
    }
  } catch (e) {
    pickerPromptList.value = []
  } finally {
    pickerLoading.value = false
  }
}

let pickerSearchTimer: number | null = null
const searchPickerPrompts = () => {
  if (pickerSearchTimer) clearTimeout(pickerSearchTimer)
  pickerSearchTimer = setTimeout(() => {
    pickerPage.value = 1
    loadPickerPrompts()
  }, 500)
}

const pickPrompt = (row: any) => {
  const text = stripHtml(row.content || '')
  if (pickerTarget.value === 'title') {
    executeForm.value.titlePrompt = text
  } else if (pickerTarget.value === 'content') {
    executeForm.value.contentPrompt = text
  } else if (pickerTarget.value === 'ask') {
    askInput.value = text
  }
  promptPickerVisible.value = false
}

// 确定执行：循环发表次数，先生成标题再生成内容
const confirmExecute = async () => {
  if (!executeForm.value.titlePrompt || !executeForm.value.contentPrompt) return
  executeDialogVisible.value = false

  for (let i = 0; i < executeForm.value.count; i++) {
    // 如果不是第一次，先创建新笔记
    if (i > 0) {
      createEmptyNote()
      await nextTick()
    } else if (!currentNote.value) {
      createEmptyNote()
      await nextTick()
    }

    // 1. 发送标题提示词
    const titleResult = await sendAsk('title', executeForm.value.titlePrompt)
    if (!titleResult) continue

    await new Promise(resolve => setTimeout(resolve, 2000))

    // 2. 替换内容提示词中的 {{title}}
    const generatedTitle = currentNote.value?.title || ''
    const contentPrompt = executeForm.value.contentPrompt.replace(/\{\{title\}\}/g, generatedTitle)
    await sendAsk('content', contentPrompt)

    // 等待编辑器渲染完成
    await new Promise<void>(resolve => {
      const checkDone = () => {
        if (!editorRendering.value && editorTypewriterBuffer.length === 0 && !editorTypewriterTimer) {
          resolve()
        } else {
          setTimeout(checkDone, 500)
        }
      }
      setTimeout(checkDone, 1000)
    })

    // 5. 调用发表接口
    await publishNote().catch(() => {})

    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  ElMessage({ message: `已完成 ${executeForm.value.count} 次执行`, type: 'success' })
}

const sendAsk = async (type?: string, promptText?: string): Promise<string | null> => {
  const question = promptText || askInput.value.trim()
  if (!question) return null

  // 判断是否为程序调用（带有效 type 参数）
  const isAutoMode = type === 'title' || type === 'content'

  // 如果正在加载中，先停止之前的请求和打字机效果
  if (askLoading.value) {
    // 中断正在进行的请求
    if (currentAskController) {
      currentAskController.abort()
      currentAskController = null
    }
    // 停止打字机效果
    stopTypewriter()
    // 重置加载状态
    askLoading.value = false

    // 等待一小段时间确保之前的请求完全停止
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // 拼接已选提示词到 prompt
  let fullPrompt = question
  if (!isAutoMode && selectedPrompts.value.length > 0) {
    const promptTexts = selectedPrompts.value.map(p => p.content).join('\n\n')
    fullPrompt = promptTexts + '\n\n' + question
  }

  askMessages.value.push({ role: 'user', content: question, quoted: quotedContent.value ? { ...quotedContent.value } : undefined })
  askMessages.value.push({ role: 'assistant', content: '' })
  const assistantIndex = askMessages.value.length - 1
  if (!isAutoMode) askInput.value = ''
  // 将引用内容拼入 prompt
  if (quotedContent.value) {
    fullPrompt = `[引用内容（第${quotedContent.value.startLine}-${quotedContent.value.endLine}行）]:\n${quotedContent.value.text}\n\n[用户提问]:\n${fullPrompt}`
    quotedContent.value = null
  }
  askLoading.value = true
  typewriterBuffer = ''
  scrollAskToBottom()

  // 用于等待流式完成+后处理的 Promise
  return new Promise<string | null>(async (resolveStream) => {
    let streamDone = false

    const finishStream = () => {
      if (streamDone) return
      streamDone = true
      askLoading.value = false

      // 等聊天打字机完全输出完毕再处理
      const checkAndProcess = () => {
        if (typewriterBuffer.length > 0 || typewriterTimer !== null) {
          setTimeout(checkAndProcess, 200)
          return
        }
        const finalText = (askMessages.value[assistantIndex]?.content || '').replace(/FINISHED\s*$/i, '').trim()
        console.log('AI 回复完成，长度:', finalText.length)

        if (type === 'title' && isAutoMode) {
          // 标题模式：将生成内容填入标题
          const titleText = finalText.replace(/<[^>]+>/g, '').trim()
          if (currentNote.value) {
            currentNote.value.title = titleText
          }
          resolveStream(titleText)
        } else if (type === 'content' && isAutoMode) {
          // 内容模式：渲染到编辑器
          tryParseAndRenderToEditor(finalText, assistantIndex)
          resolveStream(finalText)
        } else {
          // 默认模式（手动发送）
          tryParseAndRenderToEditor(finalText, assistantIndex)
          resolveStream(finalText)
        }

        // 保存当前会话
        saveCurrentSession()
      }
      setTimeout(checkAndProcess, 300)
    }

    try {
      const { fetchEventSource } = await import('@microsoft/fetch-event-source')
      currentAskController = new AbortController()

      await fetchEventSource('http://localhost:8000/api/ds/aichat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ prompt: fullPrompt }),
        signal: currentAskController.signal,
        onopen: async (response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
            return
          }
          if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
          }
        },
        onmessage: (event) => {
          if (!event.data) return
          if (event.data === '[DONE]') {
            return
          }

          try {
            const payload = JSON.parse(event.data)
            if (payload.content === 'FINISHED') {
              return
            }

            if (payload.error) {
              typewriterBuffer += `\n${payload.error}`
            } else if (payload.content) {
              typewriterBuffer += payload.content
            }
          } catch (e) {
            typewriterBuffer += event.data
          }
          // 启动打字机（如果尚未运行）
          startTypewriter(assistantIndex)
        },
        onclose: () => {
          currentAskController = null
          finishStream()
        },
        onerror: (error) => {
          currentAskController = null
          throw error
        }
      })

      // fetchEventSource resolve 后如果还没 finish，兜底处理
      if (!streamDone) {
        currentAskController = null
        finishStream()
      }
    } catch (error: any) {
      console.error('AI 对话失败:', error)
      currentAskController = null
      stopTypewriter()

      // 如果是用户主动中断，不显示错误提示
      const isAborted = error?.name === 'AbortError' || error?.message?.includes('aborted')
      if (!isAborted) {
        ElMessage({
          message: 'AI 对话失败，请稍后重试',
          type: 'error'
        })
      }

      askLoading.value = false
      resolveStream(null)
    }
  })
}


// 停止当前的 AI 对话
const stopAsk = () => {
  if (askLoading.value) {
    // 中断正在进行的请求
    if (currentAskController) {
      currentAskController.abort()
      currentAskController = null
    }
    // 停止打字机效果
    stopTypewriter()
    // 重置加载状态
    askLoading.value = false

    ElMessage({ message: '已停止 AI 对话', type: 'info' })
  }
}

// 处理发送或停止（用于回车键）
const handleSendOrStop = (event?: KeyboardEvent) => {
  if (event) {
    event.preventDefault()
  }
  if (askLoading.value) {
    stopAsk()
  } else {
    sendAsk()
  }
}


// 复制消息内容到剪贴板
const copyMessageContent = async (content: string) => {
  try {
    // 移除 HTML 标签，只保留纯文本
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = md.render(content)
    const plainText = tempDiv.textContent || tempDiv.innerText || ''

    await navigator.clipboard.writeText(plainText)
    ElMessage({ message: '已复制到剪贴板', type: 'success' })
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage({ message: '复制失败', type: 'error' })
  }
}

// 覆盖内容到左侧编辑器
const overrideToEditor = (content: string) => {
  if (!currentNote.value) {
    ElMessage({ message: '请先选择或创建一个笔记', type: 'warning' })
    return
  }

  // 将 markdown 转换为 HTML 并设置到编辑器
  const htmlContent = md.render(content)
  currentNote.value.note = htmlContent
  ElMessage({ message: '内容已覆盖到编辑器', type: 'success' })
}

// 标题生成状态
const titleGenerating = ref(false)

// 根据内容生成标题
const generateTitleFromContent = async () => {
  if (!currentNote.value || !currentNote.value.note) {
    ElMessage({ message: '请先输入笔记内容', type: 'warning' })
    return
  }

  try {
    titleGenerating.value = true

    // 移除 HTML 标签，获取纯文本内容
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = currentNote.value.note
    const plainText = tempDiv.textContent || tempDiv.innerText || ''

    if (!plainText.trim()) {
      ElMessage({ message: '笔记内容为空', type: 'warning' })
      return
    }

    const prompt = `根据以下内容总结一个简洁的标题（不超过30字）：
    \n\n${plainText.substring(0, 1000)}
    \n\n只输出标题`

    const res = await request.post('http://localhost:8000/api/ds/aiAsk', { prompt, token: dsCookies.value || await getCookieByUrl('ds') })
    console.log('标题=====',res)
    if (res.code === 200 && res.data) {
      const generatedTitle = res.data
      currentNote.value.title = generatedTitle
      ElMessage({ message: '标题生成成功', type: 'success' })
    } else {
      ElMessage({ message: res.message || '标题生成异常', type: 'error' })
    }
  } catch (error) {
    ElMessage({ message: '生成标题异常', type: 'error' })
  } finally {
    titleGenerating.value = false
  }
}


// 中间面板相关变量
const centerPanelWidth = ref(0)
const activeTab = ref('published')
const publishedNotes = ref<Note[]>([])
const unpublishedNotes = ref<Note[]>([])

// 左侧面板折叠状态
const isPanelCollapsed = ref(false)

// 提示词弹窗相关变量
const promptDialogVisible = ref(false)
const promptWords = ref<any[]>([])
const promptSearchText = ref('')
const selectedPrompts = ref<any[]>([])
const promptsSectionCollapsed = ref(false)
const promptTableRef = ref(null)
const promptForm = ref({ id: null, title: '', content: '', type: 1 })

// 提示词勾选变化
const handlePromptSelectionChange = (selection: any[]) => {
  selectedPrompts.value = selection
}

// 去除 HTML 标签，只显示纯文本
const stripHtml = (html: string) => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}
// 添加防抖搜索变量
let promptSearchTimeout: number | null = null

// 添加分页相关变量
const promptPage = ref(1)
const promptPageSize = ref(10)
const promptTotal = ref(0)
const promptLoading = ref(false)
const promptNoMore = ref(false)

// 添加搜索提示词的函数
const searchPromptWords = () => {
  // 使用防抖处理，避免频繁请求
  if (promptSearchTimeout) {
    clearTimeout(promptSearchTimeout)
  }
  
  promptSearchTimeout = setTimeout(() => {
    // 重置分页
    promptPage.value = 1
    promptWords.value = []
    promptNoMore.value = false
    loadPromptWords()
  }, 500)
}

// 修改filteredPromptWords计算属性
const filteredPromptWords = computed(() => {
  return promptWords.value
})

// 切换提示词弹窗
const toggleCuewordPanel = () => {
  promptDialogVisible.value = !promptDialogVisible.value
  if (promptDialogVisible.value) {
    promptPage.value = 1
    promptWords.value = []
    promptNoMore.value = false
    loadPromptWords()
  }
}

// 设置抽屉相关
const settingDrawerVisible = ref(false)
const settingAccountTableRef = ref()
const settingPromptTableRef = ref()
const publishInterval = ref(60) // 默认60秒
const selectedSettingAccounts = ref<any[]>([])
const selectedSettingPrompts = ref<any[]>([])

// 打开设置抽屉
const toggleSettingDrawer = () => {
  settingDrawerVisible.value = !settingDrawerVisible.value
  if (settingDrawerVisible.value) {
    loadMediaAccounts()
    loadPromptWords()
    // 从缓存恢复选择状态
    nextTick(() => {
      const savedAccounts = localStorage.getItem('selectedAccountIds')
      const savedPrompts = localStorage.getItem('selectedPromptIds')
      const savedInterval = localStorage.getItem('publishInterval')

      if (savedInterval) {
        publishInterval.value = parseInt(savedInterval)
      }

      if (savedAccounts && settingAccountTableRef.value) {
        const accountIds = JSON.parse(savedAccounts)
        mediaAccounts.value.forEach((row: any) => {
          if (accountIds.includes(row.id)) {
            settingAccountTableRef.value.toggleRowSelection(row, true)
          }
        })
      }

      if (savedPrompts && settingPromptTableRef.value) {
        const promptIds = JSON.parse(savedPrompts)
        promptWords.value.forEach((row: any) => {
          if (promptIds.includes(row.id)) {
            settingPromptTableRef.value.toggleRowSelection(row, true)
          }
        })
      }
    })
  }
}

// 设置抽屉账号选择变化
const handleSettingAccountChange = (selection: any[]) => {
  selectedSettingAccounts.value = selection
}

// 设置抽屉提示词选择变化
const handleSettingPromptChange = (selection: any[]) => {
  selectedSettingPrompts.value = selection
}

// 保存设置到缓存
const saveSettings = () => {
  const accountIds = selectedSettingAccounts.value.map(item => item.id)
  const promptIds = selectedSettingPrompts.value.map(item => item.id)

  localStorage.setItem('selectedAccountIds', JSON.stringify(accountIds))
  localStorage.setItem('selectedPromptIds', JSON.stringify(promptIds))
  localStorage.setItem('publishInterval', publishInterval.value.toString())

  ElMessage.success('设置已保存')
  settingDrawerVisible.value = false
}

// 选中提示词行 -> 填充右侧表单
const handlePromptCurrentChange = (row: any) => {
  if (row) {
    promptForm.value = { id: row.id, title: row.title, content: row.content, type: row.type || 1 }
  }
}

// 分页切换
const handlePromptPageChange = (val: number) => {
  promptPage.value = val
  loadPromptWords()
}

const handlePromptSizeChange = (val: number) => {
  promptPageSize.value = val
  promptPage.value = 1
  loadPromptWords()
}

// 新建提示词
const createPromptWord = () => {
  promptForm.value = { id: null, title: '', content: '', type: 1 }
}

// 保存提示词（新增或更新）
const savePromptWord = async () => {
  if (!promptForm.value.title) {
    ElMessage({ message: '请输入标题', type: 'warning' })
    return
  }
  try {
    const data = { ...promptForm.value }
    let res
    if (data.id) {
      res = await request.post('http://localhost:8000/api/prompt/update', data)
    } else {
      delete data.id
      res = await request.post('http://localhost:8000/api/prompt/add', data)
    }
    if (res.code === 200) {
      ElMessage({ message: '保存成功', type: 'success' })
      loadPromptWords()
      if (!data.id && res.result?.data?.id) {
        promptForm.value.id = res.result.data.id
      }
    } else {
      ElMessage({ message: res.message || '保存失败', type: 'error' })
    }
  } catch (error) {
    console.error('保存提示词失败:', error)
    ElMessage({ message: '保存提示词失败', type: 'error' })
  }
}

// 删除提示词
const deletePromptWord = async () => {
  if (!promptForm.value.id) return
  try {
    await ElMessageBox.confirm('确定要删除这个提示词吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await request.post('http://localhost:8000/api/prompt/delete', { id: promptForm.value.id })
    if (res.code === 200) {
      ElMessage({ message: '删除成功', type: 'success' })
      promptForm.value = { id: null, title: '', content: '', type: 1 }
      loadPromptWords()
    } else {
      ElMessage({ message: res.message || '删除失败', type: 'error' })
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除提示词失败:', error)
      ElMessage({ message: '删除提示词失败', type: 'error' })
    }
  }
}

// 加载已发表的笔记
const loadPublishedNotes = async () => {
  try {
    const params = {
      page: 1,
      pageNum: 50,
      conditions: {
        status: 'published'
      },
      orderBy: {
        column: "update_time",
        type: "desc",
      },
    }
    
    const res = await request.post('http://localhost:8000/api/note/get', params)
    if (res.code === 200 && res.result && res.result.list) {
      publishedNotes.value = res.result.list
    } else {
      publishedNotes.value = []
    }
  } catch (error) {
    console.error('获取已发表笔记失败:', error)
    publishedNotes.value = []
  }
}

// 加载未发表的笔记
const loadUnpublishedNotes = async () => {
  try {
    const params = {
      page: 1,
      pageNum: 50,
      conditions: {
        status: 'draft'
      },
      orderBy: {
        column: "update_time",
        type: "desc",
      },
    }
    
    const res = await request.post('http://localhost:8000/api/note/get', params)
    if (res.code === 200 && res.result && res.result.list) {
      unpublishedNotes.value = res.result.list
    } else {
      unpublishedNotes.value = []
    }
  } catch (error) {
    console.error('获取未发表笔记失败:', error)
    unpublishedNotes.value = []
  }
}

// 加载提示词数据
const loadPromptWords = async () => {
  try {
    promptLoading.value = true
    
    const params = {
      page: promptPage.value,
      pageNum: promptPageSize.value,
      conditions: {
        type:1
      },
      orderBy: {
        column: "id",
        type: "desc",
      },
    }
    
    // 如果有搜索文本，添加到条件中
    if (promptSearchText.value) {
      params.conditions = {
        ...params.conditions,
        title: promptSearchText.value,
        content: promptSearchText.value
      }
    }
    
    const res = await request.post('http://localhost:8000/api/prompt/get', params)
    console.log('提示词数据:', res)
    if (res.code === 200 && res.result && res.result.list) {
      promptWords.value = res.result.list.filter((prompt: any) => !prompt.isTemp)
      
      if (res.result.pagination && res.result.pagination.total !== undefined) {
        promptTotal.value = res.result.pagination.total
      } else if (res.result.total !== undefined) {
        promptTotal.value = res.result.total
      }
      
      if (promptWords.value.length < promptPageSize.value) {
        promptNoMore.value = true
      }
    } else {
      promptWords.value = []
      promptNoMore.value = true
    }
  } catch (error) {
    console.error('获取提示词失败:', error)
    promptWords.value = []
    promptNoMore.value = true
    ElMessage({
      message: '获取提示词失败',
      type: 'warning'
    })
  } finally {
    promptLoading.value = false
  }
}

// 使用提示词
const usePromptWord = async (prompt: any) => {
  if (!currentNote.value) {
    ElMessage({
      message: '请先选择或创建一个笔记',
      type: 'warning'
    })
    return
  }
  
  try {
    // 首先复制内容到剪贴板
    copyPromptContent(prompt.content)
    
    // 获取完整的提示词内容
    const res = await request.get(`http://localhost:8000/api/prompt/content?id=${prompt.id}`)
    if (res.code === 200 && res.data) {
      console.log('获取提示词内容成功:', res.data)
      
      // 确保数据格式正确
      const promptData = res.data
      
      // 使用提示词内容
      if (editorRef.value) {
        editorRef.value.insertContent(promptData.content || prompt.content)
        ElMessage({
          message: '提示词已插入并复制到剪贴板',
          type: 'success'
        })
      }
    } else {
      // 如果获取失败，使用列表中的简要信息
      if (editorRef.value) {
        editorRef.value.insertContent(prompt.content)
        ElMessage({
          message: '提示词已插入并复制到剪贴板',
          type: 'success'
        })
      }
    }
  } catch (error) {
    console.error('获取提示词内容失败:', error)
    
    // 如果获取失败，使用列表中的简要信息
    if (editorRef.value) {
      editorRef.value.insertContent(prompt.content)
      ElMessage({
          message: '提示词已插入并复制到剪贴板',
          type: 'success'
        })
    }
  }
}

// 添加复制提示词内容功能
const copyPromptContent = (content: string) => {
  navigator.clipboard.writeText(content).then(() => {
    ElMessage({
      message: '提示词内容已复制到剪贴板',
      type: 'success'
    })
  }).catch(err => {
    console.error('复制失败:', err)
    ElMessage({
      message: '复制失败，请手动复制',
      type: 'error'
    })
  })
}

// 查看已发表笔记
const viewPublishedNote = (note: Note) => {
  selectNote(note)
}

// 查看未发表笔记
const viewUnpublishedNote = (note: Note) => {
  selectNote(note)
}

// 切换面板折叠状态
const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value
}

// ds cookie
const dsCookies = ref('')

// 通用方法：根据 url 获取 cookie
const getCookieByUrl = async (url: string): Promise<string> => {
  try {
    const res = await request.post('http://localhost:8000/api/token/getCookieByUrl', { url })
    if (res.code === 200 && res.data && res.data.cookie) {
      return res.data.cookie
    }
    return ''
  } catch (error) {
    console.log(`获取 ${url} cookie 失败:`, error)
    return ''
  }
}

const fetchDsCookie = async () => {
  const cookie = await getCookieByUrl('ds')
  if (cookie) {
    dsCookies.value = cookie
    console.log('已加载 ds Cookie')
  }
}

// 获取头条 Cookie
const fetchToutiaoCookie = async () => {
  const cookie = await getCookieByUrl('toutiao')
  if (cookie) {
    toutiaoCookies.value = cookie
    console.log('已加载头条 Cookie')
  }
}



// 保存头条 Cookie
const saveToutiaoCookie = async (cookie: string) => {
  try {
    // 先查询是否已存在
    const getRes = await request.post('http://localhost:8000/api/token/get', {
      page: 1,
      pageNum: 1,
      conditions: {
        url: 'mp.toutiao.com'
      }
    })
    
    if (getRes.code === 200 && getRes.result && getRes.result.list && getRes.result.list.length > 0) {
      await request.post('http://localhost:8000/api/token/update', {
        id: getRes.result.list[0].id,
        token: cookie
      })
    } else {
      await request.post('http://localhost:8000/api/token/add', {
        url: 'mp.toutiao.com',
        token: cookie
      })
    }
  } catch (error) {
    console.error('保存头条 Cookie 失败:', error)
  }
}

onMounted(() => {
  fetchNotes()
  fetchToutiaoCookie()
  initFirstSession()
  loadMediaAccounts()
  initChart()
  // 监听 Ctrl+L 快捷键
  window.addEventListener('keydown', handleCtrlL)
})





    // 从API获取笔记数据（使用 aiwrite 接口）
const fetchNotes = async () => {
  try {
    loading.value = true
    const params = {
      page: notesPage.value,
      pageNum: notesPageSize.value,
      conditions: {},
      orderBy: {
        column: "id",
        type: "desc",
      },
    }
    
    // 如果有搜索文本，添加到条件中
    if (searchText.value) {
      params.conditions = {
        ...params.conditions,
        title: searchText.value,
        content: searchText.value
      }
    }
    
    const res = await request.post('http://localhost:8000/api/aiwrite/get', params)
    console.log('res = ', res)
    if (res.code === 200 && res.result && res.result.list) {
      notes.value = res.result.list

      if (res.result.pagination && res.result.pagination.total !== undefined) {
        notesTotal.value = res.result.pagination.total
      }
    } else {
      notes.value = []
      notesTotal.value = 0
    }
  } catch (error) {
    console.error('获取笔记数据失败:', error)
    notes.value = []
    notesTotal.value = 0
    ElMessage({
      message: '获取笔记数据失败',
      type: 'warning'
    })
  } finally {
    loading.value = false
  }
}

// 左侧列表分页切换
const handleNotesPageChange = (val: number) => {
  notesPage.value = val
  fetchNotes()
}

const handleNotesSizeChange = (val: number) => {
  notesPageSize.value = val
  notesPage.value = 1
  fetchNotes()
}

// 搜索笔记
const searchNotes = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    notesPage.value = 1
    fetchNotes()
  }, 500)
}

let searchTimeout: number | null = null

// 编辑笔记 - 打开编辑弹窗
const handleEdit = async (note: Note) => {
  try {
    loading.value = true
    const res = await request.get(`http://localhost:8000/api/aiwrite/content?id=${note.id}`)
    if (res.code === 200 && res.data) {
      console.log('获取笔记内容成功:', res.data)
      if (!res.data.note && res.data.content) {
        res.data.note = res.data.content
      }
      currentNote.value = res.data
    } else {
      currentNote.value = { ...note }
      if (!currentNote.value.note && currentNote.value.content) {
        currentNote.value.note = currentNote.value.content
      }
      ElMessage({ message: '获取笔记内容失败', type: 'warning' })
    }
    editDialogVisible.value = true
  } catch (error) {
    console.error('获取笔记内容失败:', error)
    currentNote.value = { ...note }
    if (!currentNote.value.note && currentNote.value.content) {
      currentNote.value.note = currentNote.value.content
    }
    editDialogVisible.value = true
    ElMessage({ message: '获取笔记内容失败，请检查网络连接', type: 'warning' })
  } finally {
    loading.value = false
  }
}

// 处理投稿 - 打开执行配置弹窗
const handleSubmission = async (note: Note) => {
  // 先获取笔记内容
  await fetchNoteContent(note)
  // 打开执行配置弹窗并传入当前笔记
  openExecuteDialog(note)
}

// 选择笔记 (保留兼容)
const selectNote = (note: Note) => {
  handleEdit(note)
}

// 获取笔记内容
const fetchNoteContent = async (note: Note) => {
  if (!note.id) {
    return
  }
  
  try {
    const res = await request.get(`http://localhost:8000/api/aiwrite/content?id=${note.id}`)
    if (res.code === 200 && res.data) {
      console.log('获取笔记内容成功:', res.data)
      if (!res.data.note && res.data.content) {
        res.data.note = res.data.content
      }
      currentNote.value = res.data
    } else {
      currentNote.value = { ...note }
      if (!currentNote.value.note && currentNote.value.content) {
        currentNote.value.note = currentNote.value.content
      }
      ElMessage({ message: '获取笔记内容失败', type: 'warning' })
    }
  } catch (error) {
    console.error('获取笔记内容失败:', error)
    currentNote.value = { ...note }
    if (!currentNote.value.note && currentNote.value.content) {
      currentNote.value.note = currentNote.value.content
    }
    ElMessage({ message: '获取笔记内容失败，请检查网络连接', type: 'warning' })
  }
}

// 创建新笔记 - 打开编辑弹窗
const createNewNote = () => {
  createEmptyNote()
  editDialogVisible.value = true
}

// 创建空白笔记
const createEmptyNote = () => {
  const now = new Date()
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const tempNote = {
    id: -Date.now(),
    title: '新建内容',
    content: '<p></p>',
    note: '<p></p>',
    platform: 1,
    time: timeStr,
    isTemp: true
  }
  
  notes.value.unshift(tempNote)
  currentNote.value = tempNote
}

// 保存笔记
const saveNote = async () => {
  if (!currentNote.value) return Promise.reject('No current note')
  
  try {
    if (editorRef.value) {
      currentNote.value.note = editorRef.value.getContent();
    }
    
    const noteData = {
      ...currentNote.value,
      content: currentNote.value.note,
    }

    if (noteData.isTemp) {
      delete noteData.isTemp
    }
    
    if (noteData.id && noteData.id < 0) {
      delete noteData.id
    }
    
    console.log(noteData)
    let res
    if (noteData.id) {
      res = await request.post('http://localhost:8000/api/aiwrite/update', noteData)
    } else {
      res = await request.post('http://localhost:8000/api/aiwrite/add', noteData)
    }
    
    if (res.code === 200) {
      ElMessage({ message: '保存成功', type: 'success' })
      
      if (currentNote.value.isTemp) {
        currentNote.value.isTemp = false
      }
      
      fetchNotes()
      console.log('保存笔记-====',res)
      if ((!noteData.id || noteData.id < 0) && res.result) {
        currentNote.value.id = res.result.data.id
      }
      
      return Promise.resolve(res)
    } else {
      ElMessage({ message: res.message || '保存失败', type: 'error' })
      return Promise.reject(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存笔记失败:', error)
    ElMessage({ message: '保存笔记失败，请检查网络连接', type: 'error' })
    return Promise.reject(error)
  }
}

// 删除当前笔记
const deleteCurrentNote = async () => {
  if (!currentNote.value || !currentNote.value.id) return
  
  try {
    const result = await ElMessageBox.confirm('确定要删除这个笔记吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    if (result === 'confirm') {
      const res = await request.post('http://localhost:8000/api/aiwrite/delete', {
        id: currentNote.value.id
      })
      
      if (res.code === 200) {
        ElMessage({
          message: '删除成功',
          type: 'success'
        })
        
        // 清除当前笔记
        currentNote.value = null
        
        // 刷新笔记列表
        fetchNotes()
      } else {
        ElMessage({
          message: res.message || '删除失败',
          type: 'error'
        })
      }
    }
  } catch (error) {
    console.error('删除笔记失败:', error)
    ElMessage({
      message: '删除笔记失败，请检查网络连接',
      type: 'error'
    })
  }
}

// 删除指定笔记
const deleteNote = async (note: Note) => {
  if (!note || !note.id) return

  try {
    await ElMessageBox.confirm('确定要删除这个笔记吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await request.post('http://localhost:8000/api/aiwrite/delete', {
      id: note.id
    })
    
    if (res.code === 200) {
      ElMessage({ message: '删除成功', type: 'success' })
      if (currentNote.value && currentNote.value.id === note.id) {
        currentNote.value = null
      }
      fetchNotes()
    } else {
      ElMessage({ message: res.message || '删除失败', type: 'error' })
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除笔记失败:', error)
      ElMessage({ message: '删除笔记失败', type: 'error' })
    }
  }
}

// 处理投稿状态变化
const handleStatusChange = async (note: Note) => {
  if (!note || !note.id) return

  try {
    const res = await request.post('http://localhost:8000/api/aiwrite/update', {
      id: note.id,
      status: note.status
    })

    if (res.code === 200) {
      const statusText = ['未投稿', '已投稿', '已采用', '已退稿'][note.status || 0]
      ElMessage({ message: `状态已更新为：${statusText}`, type: 'success' })
      // 刷新列表以确保数据同步
      fetchNotes()
    } else {
      ElMessage({ message: res.message || '更新状态失败', type: 'error' })
      // 失败时刷新列表恢复原状态
      fetchNotes()
    }
  } catch (error) {
    console.error('更新状态失败:', error)
    ElMessage({ message: '更新状态失败', type: 'error' })
    // 失败时刷新列表恢复原状态
    fetchNotes()
  }
}

// 获取笔记内容预览
const getPreview = (content: string) => {
  if (!content) return ''
  
  // 创建临时元素来解析HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  
  return textContent.length > 50 ? textContent.substring(0, 50) + '...' : textContent
}

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return dateStr
  }
}

// 检查笔记是否有更改
const isNoteChanged = computed(() => {
  if (!currentNote.value || !currentNote.value.id) return false
  
  const originalNote = notes.value.find(note => note.id === currentNote.value?.id)
  if (!originalNote) return true
  
  return (
    originalNote.title !== currentNote.value.title ||
    originalNote.note !== currentNote.value.note
  )
})

// 头条 Cookie（从浏览器复制，可在设置中配置）
const toutiaoCookies = ref('')

// 发表笔记到头条号
const publishNote = async () => {
  if (!currentNote.value) return

  try {
    // 如果没有保存的 Cookie，弹窗让用户输入
    let cookieToUse = toutiaoCookies.value

    if (!cookieToUse || !cookieToUse.trim()) {
      const { value: cookies } = await ElMessageBox.prompt(
        '请粘贴头条号 Cookie（登录 mp.toutiao.com 后，F12 → Network → 任意请求 → Headers → Cookie）',
        '发表到头条号',
        {
          confirmButtonText: '发表',
          cancelButtonText: '取消',
          inputType: 'textarea',
          inputPlaceholder: '粘贴 Cookie...',
        }
      )

      if (!cookies || !cookies.trim()) {
        ElMessage({ message: '请输入有效的 Cookie', type: 'warning' })
        return
      }

      cookieToUse = cookies.trim()
      toutiaoCookies.value = cookieToUse
      // 保存到数据库
      saveToutiaoCookie(cookieToUse)
    }

    // 确保获取最新编辑器内容
    if (editorRef.value) {
      currentNote.value.note = editorRef.value.getContent()
    }

    const title = currentNote.value.title || '未命名文章'
    const content = currentNote.value.note || currentNote.value.content || ''

    if (!content || content === '<p></p>') {
      ElMessage({ message: '文章内容不能为空', type: 'warning' })
      return
    }

    ElMessage({ message: '正在发布到头条号...', type: 'info' })

    // 调用头条发布 API，传入 cookie（先保存草稿，头条对直接发布校验更严格）
    const res = await request.post('http://localhost:8000/api/toutiao/publish', {
      title,
      content,
      cookies: cookieToUse,  // 传入 cookie
      save_draft: true,
    })

    // 判断头条实际发布是否成功（data.success !== false 表示成功）
    if (res.code === 200 && res.data?.success !== false) {
      ElMessage({ message: '头条号发布成功', type: 'success' })

      const noteData = {
        ...currentNote.value,
        content: currentNote.value.note,
        status: 'published',
      }
      if (noteData.isTemp) delete noteData.isTemp
      if (noteData.id && noteData.id < 0) delete noteData.id

      if (noteData.id) {
        await request.post('http://localhost:8000/api/aiwrite/update', noteData).catch(() => {})
      } else {
        try {
          const addRes = await request.post('http://localhost:8000/api/aiwrite/add', noteData)
          if (addRes.code === 200 && addRes.result?.data?.id) {
            currentNote.value.id = addRes.result.data.id
          }
        } catch (e) {
          console.log('本地笔记保存跳过:', e)
        }
      }

      if (currentNote.value?.isTemp) currentNote.value.isTemp = false
      fetchNotes()
    } else {
      // 如果是 Cookie 问题，清空并提示重新输入
      if (res.message?.includes('Cookie')) {
        toutiaoCookies.value = ''
      }
      ElMessage({ message: res.message || '头条号发布失败', type: 'error' })
    }
  } catch (error: any) {
    if (error === 'cancel' || error?.message === 'cancel') return
    console.error('发布到头条号失败:', error)
    ElMessage({ message: error?.message || '发布到头条号失败，请检查网络连接', type: 'error' })
  }
}

onBeforeUnmount(() => {
  // 清理打字机定时器
  stopTypewriter()
  stopEditorTypewriter()
  stopBatchTypewriter()
  // 移除 Ctrl+L 快捷键监听
  window.removeEventListener('keydown', handleCtrlL)
})

// 组件销毁时清理资源
onUnmounted(() => {
})

// 复制内容到剪贴板
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage({
      message: '内容已复制到剪贴板',
      type: 'success'
    })
  }).catch(err => {
    console.error('复制失败:', err)
    ElMessage({
      message: '复制失败，请手动复制',
      type: 'error'
    })
  })
}
</script>

<style scoped>
.note-container {
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
  padding: 0 15px;
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #e8e4df;
  border-radius: 12px;
  margin-bottom: 16px;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

/* 编辑弹窗内容 */
.edit-dialog-content {
  height: calc(96vh - 80px);
  overflow: hidden;
  background: #f5f5f5;
}

.edit-dialog-content .write-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 公众号信息面板 */
.wechat-info {
  padding: 20px 0;
}

.wechat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
}

.wechat-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.wechat-logo {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: white;
  padding: 5px;
}

.wechat-title {
  font-size: 20px;
  font-weight: 600;
}

.wechat-stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

/* 提示词弹窗样式 */
.prompt-dialog-body {
  display: flex;
  gap: 20px;
  height: 65vh;
}

.prompt-dialog-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ebeef5;
  padding-right: 15px;
}

.prompt-dialog-search {
  margin-bottom: 10px;
}

.prompt-dialog-pagination {
  padding-top: 10px;
  display: flex;
  justify-content: center;
}

.prompt-dialog-right {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.prompt-form-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
}

.prompt-edit-form {
  flex: 1;
}

/* 提示词表格样式 */
.prompt-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.prompt-title {
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.prompt-content {
  font-size: 13px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

.publish-tabs {
  height: 100%;
  padding: 15px;
}

:deep(.publish-tabs .el-tabs__content) {
  height: calc(100% - 40px);
  overflow-y: auto;
}

/* 自定义表格样式 */
:deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
  margin-top: 10px;
  font-size: 18px;
  background-color: #fff;
  border-radius: 12px;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

:deep(.el-table .el-table__header th) {
  font-size: 18px;
  font-weight: 600;
  color: #6b6560;
  background-color: #f5f3f0 !important;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 0;
}

:deep(.el-table .cell) {
  font-size: 18px;
}

:deep(.el-table__row) {
  height: 50px !important;
  line-height: 50px !important;
  cursor: pointer;
}

:deep(.el-table__header-row) {
  height: 45px !important;
}

:deep(.el-tag) {
  font-size: 14px;
  border-radius: 8px;
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

:deep(.el-tag--primary) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
}

.search-input :deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
  padding: 0 0 0 8px;
  transition: all 0.3s;
}

.search-input :deep(.el-input__wrapper:hover) {
  border-color: #c4a882;
}

.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

.search-input :deep(.el-input__inner) {
  background-color: transparent;
  border: none;
  height: 40px;
  padding: 0 20px;
  transition: all 0.3s;
  outline: none !important;
}

/* 征稿邮箱工具栏 */
.email-dialog-toolbar {
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.email-search-bar {
  display: flex;
  align-items: center;
}

.email-action-buttons {
  display: flex;
  gap: 10px;
}

/* 征稿邮箱分页 */
.email-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.write-panel {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.write-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 8px;
}

.editor-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.note-toolbar {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  justify-content: space-between;
}

.left-buttons {
  display: flex;
  gap: 10px;
}

.right-buttons {
  display: flex;
  gap: 10px;
}

.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.editor-bottom-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 10px 0;
}


.title-input-wrapper {
  display: flex;
  gap: 10px;
}

.title-input {
  flex: 1;
  font-size: 24px;
  font-weight: 500;
}

:deep(.title-input .el-input__wrapper) {
  box-shadow: none !important;
  border-radius: 5px;
  padding:15px;
}

.note-meta-editor {
  display: flex;
  gap: 15px;
}

:deep(.note-meta-editor .el-select .el-input__inner) {
  font-size: 18px;
}

:deep(.el-select-dropdown__item) {
  font-size: 18px;
  padding: 12px 20px;
}

.tags-input {
  flex: 1;
}

.content-textarea {
  flex: 1;
}

.ask-panel {
  width: 490px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border-radius:8px;
}

.ask-panel-toolbar {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}

.ask-panel-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0px 6px 0px 6px;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 10px;
}

.ask-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.ask-subtitle {
  font-size: 12px;
  color: #909399;
}

.ask-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.ask-messages::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.ask-message {
  display: flex;
}

.ask-message.user {
  justify-content: flex-end;
}

.ask-message.assistant {
  justify-content: flex-start;
}

.ask-message.prompt {
  justify-content: stretch;
  width: 100%;
}

.ask-message.prompt .selected-prompts-section {
  width: 100%;
}

.ask-bubble {
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 18px;
  line-height: 1.9;
  word-break: break-word;
  overflow-wrap: break-word;
  overflow-x: hidden;
  box-sizing: border-box;
}

.ask-bubble .md-content {
  display: block;
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}

.ask-bubble .md-content p {
  margin: 0.4em 0;
}

.ask-bubble .md-content p:first-child {
  margin-top: 0;
}

.ask-bubble .md-content p:last-child {
  margin-bottom: 0;
}

.ask-bubble .md-content pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 10px 14px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 13px;
  max-width: 100%;
}

.ask-bubble .md-content code {
  background: #f0f0f0;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 13px;
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

.ask-bubble .md-content pre code {
  background: none;
  padding: 0;
}

.ask-bubble .md-content ul,
.ask-bubble .md-content ol {
  padding-left: 20px;
  margin: 6px 0;
}

.ask-bubble .md-content blockquote {
  border-left: 3px solid #409EFF;
  padding-left: 10px;
  margin: 8px 0;
  color: #606266;
}

.ask-bubble .md-content h1,
.ask-bubble .md-content h2,
.ask-bubble .md-content h3,
.ask-bubble .md-content h4 {
  margin: 8px 0 4px;
  line-height: 1.4;
}

.ask-bubble .md-content table {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
  max-width: 100%;
  display: block;
  overflow-x: auto;
}

.ask-bubble .md-content th,
.ask-bubble .md-content td {
  border: 1px solid #dcdfe6;
  padding: 6px 10px;
  text-align: left;
}

.ask-bubble .md-content th {
  background: #f5f7fa;
}

.ask-bubble .md-content a {
  color: #409EFF;
  text-decoration: none;
}

.ask-bubble .md-content a:hover {
  text-decoration: underline;
}

.ask-message.user .ask-bubble {
  background: #409eff;
  color: #fff;
}

.ask-message.assistant .ask-bubble {
  background: #f5f7fa;
  color: #303133;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e4e7ed;
}

.message-actions .el-button {
  font-size: 14px;
}

.ask-typing {
  color: #909399;
}

.editor-render-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409EFF;
  font-size: 14px;
}

.editor-render-status .is-loading {
  animation: rotating 1.5s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.editor-render-done {
  color: #67C23A;
  font-size: 14px;
}

.typing-cursor {
  display: inline;
  animation: blink 0.7s step-end infinite;
  color: #409EFF;
  font-weight: bold;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.chat-history-list {
  max-height: 500px;
  overflow-y: auto;
}

.chat-history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.chat-history-item:hover {
  background: #f5f7fa;
  border-color: #409eff;
}

.chat-history-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.chat-history-info {
  flex: 1;
}

.chat-history-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 5px;
}

.chat-history-time {
  font-size: 12px;
  color: #909399;
}

.selected-prompts-section {
  margin-bottom: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
}

.selected-prompts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  background: #f0f2f5;
  user-select: none;
}

.selected-prompts-header .el-icon {
  transition: transform 0.2s;
}

.selected-prompts-header .el-icon.is-rotate {
  transform: rotate(180deg);
}

.selected-prompts-list {
  padding: 6px 12px;
  max-height: 150px;
  overflow-y: auto;
}

.selected-prompt-item {
  padding: 4px 0;
  border-bottom: 1px dashed #ebeef5;
}

.selected-prompt-item:last-child {
  border-bottom: none;
}

.selected-prompt-title {
  font-size: 13px;
  font-weight: 700;
  color: #303133;
}

.selected-prompt-content {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.ask-input {
  margin-top: 12px;
  margin-left: 12px;
  margin-right: 12px;
  margin-bottom: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 16px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ask-input:focus-within {
  border-color: #409eff;
}

.ask-row-top {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.ask-row-top :deep(.el-textarea) {
  flex: 1;
}

.ask-row-top :deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  padding: 4px 0;
  background: transparent;
}

.ask-row-top .el-button {
  flex-shrink: 0;
}

.ask-row-bottom {
  display: flex;
  gap: 8px;
}

/* 引用内容块 - 输入框上方 */
.quoted-block {
  background: #f5f3f0;
  border-left: 3px solid #8b9a6d;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  position: relative;
}

.quoted-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.quoted-label {
  color: #8b9a6d;
  font-weight: 600;
  font-size: 12px;
}

.quoted-text {
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
  max-height: 80px;
  overflow-y: auto;
  font-size: 12px;
}

/* 消息中的引用块 */
.msg-quoted-block {
  background: rgba(139, 154, 109, 0.08);
  border-left: 3px solid #8b9a6d;
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.msg-quoted-label {
  color: #409eff;
  font-weight: 600;
  font-size: 11px;
  display: block;
  margin-bottom: 2px;
}

.msg-quoted-text {
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}

.note-rich-editor {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.ProseMirror) {
  min-height: 300px;
  padding: 16px;
  font-size: 16px;
  line-height: 1.6;
}

:deep(.el-textarea__inner) {
  font-size: 16px;
  line-height: 1.6;
  padding: 12px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

:deep(.el-textarea__inner::-webkit-scrollbar) {
  display: none; /* Chrome, Safari, Opera */
}

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #909399;
  font-size: 16px;
}

.no-notes {
  padding: 20px;
  text-align: center;
  color: #909399;
}

.notes-pagination {
  padding: 8px 0;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

/* 公众号信息样式 */
.wechat-info {
  height: 290px;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.wechat-card {
  width: 90%;
  max-width: 450px;
  padding: 25px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  overflow: hidden;
  position: relative;
}

.wechat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(176, 224, 230, 0.2), rgba(135, 206, 250, 0.2), rgba(147, 112, 219, 0.2));
  z-index: -1;
  border-radius: 16px;
}

.wechat-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.wechat-logo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 15px;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.wechat-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.wechat-content {
  color: #444;
}

.wechat-content p {
  margin-bottom: 20px;
  font-size: 16px;
  line-height: 1.6;
}

.wechat-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 25px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.collapse-btn {
  flex-shrink: 0;
}

.left-panel.collapsed .collapse-btn {
  width: 100%;
  justify-content: center;
}

.expand-btn-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
}

/* 全局滚动条隐藏，使用 :deep 代替 :global */
:deep(html),
:deep(body) {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

:deep(html::-webkit-scrollbar),
:deep(body::-webkit-scrollbar) {
  display: none; /* Chrome, Safari, Opera */
}





.copy-icon {
  margin-left: 5px;
  font-size: 16px;
  color: #909399;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-icon:hover {
  color: #409EFF;
  transform: scale(1.1);
}

.execute-form {
  padding: 0 10px;
}

.prompt-picker-body {
  display: flex;
  flex-direction: column;
}

/* 任务类型选择按钮 */
.task-type-selector {
  display: flex;
  gap: 30px;
  justify-content: center;
  padding: 40px 20px;
}

.task-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  border: 2px solid #dcdfe6;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.task-type-btn:hover {
  border-color: #409EFF;
  background: #ecf5ff;
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.2);
}

.task-type-btn .el-icon {
  color: #409EFF;
  margin-bottom: 15px;
}

.task-type-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.task-type-desc {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 0 10px;
}

/* 投稿步骤样式 */
.submission-step {
  min-height: 300px;
}

/* 查看邮件相关样式 */
.email-info {
  display: flex;
  flex-direction: column;
}

.email-subject {
  font-weight: bold;
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
}

.email-sender {
  font-size: 13px;
  color: rgb(189, 190, 192);
}

/* 邮件详情容器 - 左右分栏布局 */
.email-detail-container {
  display: flex;
  gap: 20px;
  min-height: 500px;
}

.email-detail-left {
  flex: 1;
  overflow-y: auto;
  max-height: 70vh;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.email-detail-left::-webkit-scrollbar {
  display: none;
}

.email-detail-right {
  width: 600px;
  border-left: 1px solid #e4e7ed;
  padding-left: 20px;
  overflow-y: auto;
  max-height: 70vh;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.email-detail-right::-webkit-scrollbar {
  display: none;
}

.email-detail {
  padding: 10px;
  line-height: 1.8;
}

.email-detail-subject {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
  line-height: 1.8;
}

.email-detail-info {
  margin-bottom: 15px;
  line-height: 2;
}

.email-detail-info .label {
  font-weight: bold;
  color: #606266;
}

.email-detail-info div {
  margin: 8px 0;
}

.email-attachments {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
}

.attachment-item {
  margin-right: 15px;
  margin-bottom: 5px;
  padding: 5px 10px;
  background-color: #e4e7ed;
  border-radius: 3px;
  display: flex;
  align-items: center;
}

.attachment-item i {
  margin-right: 5px;
}

.email-content {
  padding: 10px;
  background-color: #fff;
  border-radius: 4px;
  overflow-x: auto;
  line-height: 1.8;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: 14px;
  color: #303133;
}

.email-detail-error {
  text-align: center;
  padding: 30px;
  color: #909399;
}

/* AI分析邮件样式 */
.ai-analyze-content {
  padding: 10px;
}

.email-preview {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.email-preview h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
  line-height: 1.8;
}

.email-preview p {
  margin: 5px 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
}

.ai-steps {
  margin-top: 20px;
}

.ai-steps h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
  line-height: 1.8;
}

.ai-steps :deep(.el-step__description) {
  line-height: 1.8;
  padding-right: 10px;
}

.ai-steps :deep(.el-step__title) {
  line-height: 1.8;
}

.ai-result h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
  line-height: 1.8;
}

.ai-result :deep(.el-alert__description) {
  line-height: 1.8;
  word-wrap: break-word;
  word-break: break-all;
  overflow-wrap: break-word;
  max-width: 100%;
}

.ai-result :deep(.el-alert__description) div {
  max-width: 100%;
  overflow-x: auto;
}

.ai-result :deep(.el-alert__description) pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-width: 100%;
  overflow-x: auto;
}

.ai-result :deep(.el-alert__description) code {
  word-wrap: break-word;
  word-break: break-all;
  white-space: pre-wrap;
}

.ai-result :deep(.el-alert__description) p {
  line-height: 1.8;
  margin: 8px 0;
  word-wrap: break-word;
  word-break: break-all;
}

/* AI分析面板样式 */
.ai-analyze-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ai-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409EFF;
}

.ai-panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
  font-weight: 600;
}

.ai-panel-content {
  flex: 1;
  overflow-y: auto;
}

.ai-panel-content .email-preview {
  background-color: #f0f9ff;
  border-left: 3px solid #409EFF;
}

.ai-panel-content .email-preview h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
  line-height: 1.6;
}

.ai-panel-content .email-preview p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

/* 指标卡片样式 */
.metric-card {
  flex: 1;
  height: 100px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: #fff;
  transition: all 0.3s ease;
}


.metric-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  opacity: 0.9;
}

/* 渐变背景色 */
.blue-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.green-gradient {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.orange-gradient {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.purple-gradient {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.red-gradient {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

/* 设置抽屉样式 */
.setting-drawer-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-section {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.setting-footer {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

/* 任务日志样式 */
.log-item {
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 6px;
  background: #ffffff;
  transition: all 0.2s ease;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}



.log-item:last-child {
  margin-bottom: 0;
}

.log-time {
  color: #8c8c8c;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  white-space: nowrap;
  flex-shrink: 0;
  padding: 2px 6px;
}

.log-message {
  color: #262626;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
  flex: 1;
}

/* 日志类型样式 */
.log-info {
  border-left-color: #1890ff;
  background: linear-gradient(90deg, #e6f7ff 0%, #ffffff 100%);
}

.log-info .log-message {
  color: #096dd9;
}

.log-success {
  border-left-color: #52c41a;
  background: linear-gradient(90deg, #f6ffed 0%, #ffffff 100%);
}

.log-success .log-message {
  color: #389e0d;
}

.log-warning {
  border-left-color: #faad14;
  background: linear-gradient(90deg, #fffbe6 0%, #ffffff 100%);
}

.log-warning .log-message {
  color: #d48806;
}

.log-error {
  border-left-color: #ff4d4f;
  background: linear-gradient(90deg, #fff2f0 0%, #ffffff 100%);
}

.log-error .log-message {
  color: #cf1322;
  font-weight: 500;
}

/* 统一按钮样式 - 深绿色主题（排除 text 和 link 按钮） */
:deep(.el-button--primary:not(.el-button--text):not(.is-link)) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  border-radius: 10px;
}

:deep(.el-button--primary:not(.el-button--text):not(.is-link):hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

:deep(.el-button--primary:not(.el-button--text):not(.is-link):active) {
  background-color: #6b7a4d !important;
  border-color: #6b7a4d !important;
}

/* 默认按钮也使用深绿色（排除 text 和 link 按钮） */
:deep(.el-button--default:not(.el-button--text):not(.is-link)) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  color: #fff !important;
  border-radius: 10px;
}

:deep(.el-button--default:not(.el-button--text):not(.is-link):hover) {
  background-color: #7a895c !important;
  border-color: #7a895c !important;
}

/* 危险按钮保持红色（排除 text 和 link 按钮） */
:deep(.el-button--danger:not(.el-button--text):not(.is-link)) {
  border-radius: 10px;
}

/* 成功按钮 */
:deep(.el-button--success:not(.el-button--text):not(.is-link)) {
  background-color: #8b9a6d !important;
  border-color: #8b9a6d !important;
  border-radius: 10px;
}

/* 链接按钮 */
:deep(.el-button.is-link) {
  color: #8b9a6d !important;
}

:deep(.el-button.is-link:hover) {
  color: #7a895c !important;
}

/* 文字按钮 */
:deep(.el-button--text) {
  color: #8b9a6d !important;
}

:deep(.el-button--text:hover) {
  color: #7a895c !important;
}

:deep(.el-button--text.el-button--danger) {
  color: #F56C6C !important;
}

:deep(.el-button--text.el-button--danger:hover) {
  color: #f78989 !important;
}

/* 分页器 */
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

/* 抽屉样式 */
:deep(.el-drawer__header) {
  border-bottom: 1px solid #e8e4df;
  padding-bottom: 16px;
  color: #6b6560;
}

:deep(.el-drawer__body) {
  background-color: #faf8f5;
}

:deep(.el-form-item__label) {
  color: #6b6560;
  font-weight: 500;
}

/* 表单输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

/* 下拉选择框样式 */
:deep(.el-select .el-select__wrapper) {
  border-radius: 10px;
}

:deep(.el-select .el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-select .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

/* 开关样式 */
:deep(.el-switch) {
  --el-switch-on-color: #8b9a6d;
  --el-switch-off-color: #9a9590;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f5f3f0;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c4a882;
  border-radius: 3px;
  transition: background 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background: #b0946e;
}

/* 日志容器滚动条 */
[style*="overflow-y: auto"]::-webkit-scrollbar,
[style*="overflow: auto"]::-webkit-scrollbar {
  width: 6px;
}

[style*="overflow-y: auto"]::-webkit-scrollbar-thumb,
[style*="overflow: auto"]::-webkit-scrollbar-thumb {
  background: #c4a882;
  border-radius: 3px;
}

[style*="overflow-y: auto"]::-webkit-scrollbar-thumb:hover,
[style*="overflow: auto"]::-webkit-scrollbar-thumb:hover {
  background: #b0946e;
}

</style>

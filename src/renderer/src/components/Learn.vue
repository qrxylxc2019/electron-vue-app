<template>
  <div class="learn-container">
    <Effect v-if="showEffect" />
    <div v-if="showLeftPanel" :class="['button-section', {'button-section-hidden': isLeftHidden}, {'button-section-collapsed': isLeftCollapsed}]">
      <div v-if="isLeftCollapsed" class="collapsed-menu">
        <div class="collapsed-item" @click="toggleSubjectDrawer">
          <el-icon><Expand /></el-icon>
          <span>学科</span>
        </div>
        <div class="collapsed-item" @click="openPdfDrawer">
          <el-icon><Document /></el-icon>
          <span>添加题目</span>
        </div>
        <div class="collapsed-item" @click="showMultiSelectDialog">
          <el-icon><Document /></el-icon>
          <span>多选科目</span>
        </div>
        <div class="collapsed-item" @click="openSettingsDrawer">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </div>
        <div class="collapsed-item" @click="showWebView = !showWebView">
          <el-icon v-if="showWebView"><Expand /></el-icon>
          <el-icon v-else><Expand /></el-icon>
          <span>{{ showWebView ? '隐藏右侧' : '显示右侧' }}</span>
        </div>
        <div class="collapsed-item" @click="openExamPointDrawer">
          <el-icon><Aim /></el-icon>
          <span>考点</span>
        </div>
      </div>
      
      <div :class="['left-button-section', {'left-button-section-drawer': isLeftCollapsed, 'left-button-section-drawer-visible': subjectDrawerVisible}]">
        <!-- 抽屉模式下的头部 -->
        <div v-if="isLeftCollapsed && subjectDrawerVisible" class="subject-drawer-header">
          <el-button type="text" @click="closeSubjectDrawer">
            <el-icon><Fold /></el-icon>
          </el-button>
          <div class="subject-actions" style="display: flex; align-items: center;">
            <h3 style="margin: 0; margin-left: 10px;">学科</h3>
          </div>
        </div>
        <div class="left-button-section-content">
          <el-input
            v-model="searchSubject"
            placeholder="搜索科目"
            size="large"
            style="width: 300px"
            @input="handleSubjectSearch"
            clearable
          >
          </el-input>
          <div class="collapse-btn" @click="showAddSubjectDialog">
            <el-icon><Plus /></el-icon>
          </div>
          <div class="collapse-btn" @click="toggleLeftPanel" v-if="!isLeftCollapsed">
            <el-icon><Fold /></el-icon>
          </div>
        </div>
        <div class="subject-list">
          <div 
            v-for="row in filteredTreeData" 
            :key="row.id" 
            class="subject-row" 
            :class="{'selected-row': selectedSubjectIds.includes(row.id), 'disabled-row': row.children && row.children.length > 0}"
            @click="handleSubjectSelectMulti(row)"
          >
            {{row.title}}
            <span v-if="selectedSubjectIds.includes(row.id)" class="selected-icon">✓</span>
          </div>
        </div>
        <div class="learn-button-section">
          <div class="note-ai-container">
            <!-- 多选科目按钮 -->
            <div class="multi-select-container" style="flex: 1; width: 100%">
              <el-button
                type="primary"
                size="large"
                @click="confirmMultiSelect"
                style="width: 100%"
              >
                多选科目
                <span v-if="selectedSubjectIds.length > 0">
                  ({{ selectedSubjectIds.length }})
                </span>
              </el-button>
            </div>
            
            <!-- 笔记容器 -->
            <div class="note-container" style="flex: 1; width: 100%">
              <el-popover
                placement="top"
                title="笔记"
                width="1000"
                :visible="notePopoverVisible"
                trigger="manual"
              >
                <div class="note-editor-section">
                  <div class="note-section-left">
                    <!-- 笔记列表 -->
                    <el-table
                      :data="tableData"
                      style="width: 100%; margin-top: 10px; height: 90%"
                      size="large"
                      stripe
                      highlight-current-row
                      height="100%"
                      @row-click="handleNoteRowClick"
                    >
                      <el-table-column prop="note" label="笔记" min-width="180">
                        <template #default="{ row }">
                          <div class="note-content">
                            {{ row.title || `笔记${row.id}` }}
                          </div>
                        </template>
                      </el-table-column>
                      <el-table-column label="操作" width="100" fixed="right">
                        <template #default="{ row }">
                          <el-button
                            type="danger"
                            size="small"
                            @click.stop="handleNoteDelete(row)"
                            >删除</el-button
                          >
                        </template>
                      </el-table-column>
                    </el-table>
                    <el-pagination
                      background
                      class="pagination"
                      :current-page="currentPage"
                      :total="total"
                      layout="prev,pager,next"
                      @size-change="handleSizeChange"
                      @current-change="handleCurrentChange"
                    />
                  </div>

                  <div class="note-section-right">
                    <div class="title-input">
                      <span class="title-label">标题:</span>
                      <el-input
                        v-model="noteTitle"
                        size="large"
                        placeholder="请输入标题"
                      ></el-input>
                      <el-button
                        size="large"
                        type="success"
                        @click="handleNoteAdd"
                        >新增笔记</el-button
                      >
                      <el-button
                        type="success"
                        size="large"
                        @click="handleNoteSave"
                        >保存笔记</el-button
                      >
                    </div>

                    <!-- 笔记和解析区域 -->
                    <div class="notes-explain-container">
                      <!-- 解析编辑器 -->
                      <div
                        class="explain-editor"
                        style="width: 100%; height: 390px"
                      >
                        <div
                          ref="noteEditorContainer"
                          class="note-editor-container"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <template #reference>
                  <el-button
                    type="success"
                    size="large"
                    @click="toggleNotePopover"
                    style="width: 100%"
                  >
                    笔记
                  </el-button>
                </template>
              </el-popover>
            </div>
            
          </div>
        </div>
      </div>
      
      <div :class="['pdf-div', {'pdf-div-visible': pdfDrawerVisible}]">
        <div class="pdf-drawer-content">
          <div class="pdf-drawer-header">
            <el-button type="text" @click="closePdfDrawer">
              <el-icon><Fold /></el-icon>
            </el-button>
            <div class="pdf-actions" style="display: flex; align-items: center;">
               <h3 style="margin: 0; margin-left: 10px;">PDF</h3>
            </div>
          </div>
          <!-- 新增题目表单区域 -->
          <div class="add-question-form" style="padding: 10px; background: #f5f3f0; border-radius: 12px; border: 1px solid #e8e4df;">
            <div style="display: flex; gap: 20px;">
              <div class="add-button" style="flex: 1;height:500px">
                <RichEditor 
                  v-model:contentText="newQuestionContent" 
                  height="90%" 
                  :fontSize="20" 
                  :showMenuBar="false"
                  class="note-rich-editor"
                  placeholder="请输入题目内容"
                />
                <div style="height:10%;display: flex; gap: 10px; align-items: center;">
                  <el-input-number
                    v-model="addCount"
                    :min="1"
                    :max="100"
                    size="large"
                    style="width: 120px;"
                    placeholder="重复次数"
                  />
                  <el-select
                    v-model="addQuestionSubjectId"
                    placeholder="请选择科目"
                    size="large"
                    style="flex: 1"
                    filterable
                  >
                    <el-option
                      v-for="subject in filteredTreeData"
                      :key="subject.id"
                      :label="subject.title"
                      :value="subject.id"
                      :disabled="subject.children && subject.children.length > 0"
                    />
                  </el-select>
                  <el-button
                    size="large"
                    type="success"
                    @click="submitNewQuestion"
                    style="flex: 1"
                  >
                    确认添加
                  </el-button>
                  <el-button
                    size="large"
                    type="success"
                    @click="handleAddNonObjectiveQuestion"
                    style="flex: 1"
                  >
                    添加非客观题
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <el-tabs v-model="pdfActiveTab">
            <el-tab-pane label="提示词" name="addQuestion">
              <div>
                <el-button type="success" @click="openAddPromptDialog">新增提示词</el-button>
                <el-table 
                  :data="promptList" 
                  height="420px" 
                  stripe 
                  style="cursor: pointer;"
                >
                  <el-table-column prop="prompt" label="提示词">
                    <template #default="{ row }">
                      <div @click="copyPrompt(row.prompt)" class="prompt-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 15px;" v-html="row.prompt">
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="150" align="center">
                    <template #default="{ row }">
                      <el-button 
                        type="primary" 
                        @click.stop="openEditPromptDialog(row)"
                      >
                        编辑
                      </el-button>
                      <el-button 
                        type="danger" 
                        @click.stop="handleDeletePrompt(row)"
                      >
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
            <el-tab-pane label="资料地址" name="fileList">
              <div class="pdf-preview-container">
                <div class="pdf-preview-header">
                  <!-- 添加标签筛选器 -->
                  <el-select
                    v-model="selectedFileTag"
                    placeholder="选择标签"
                    class="file-tag-select"
                    size="large"
                    clearable
                    @change="handleFileTagChange"
                  >
                    <el-option
                      v-for="tag in fileTagList"
                      :key="tag.id"
                      :label="tag.tag"
                      :value="tag.id"
                    />
                  </el-select>
                </div>
                <el-table 
                  :show-header="false" 
                  :data="fileList" 
                  style="width: 100%;height:420px"
                  highlight-current-row
                  @current-change="handleFileRowChange"
                >
                  <!-- 单选列 -->
                  <el-table-column width="50">
                    <template #default="scope">
                      <el-checkbox 
                        :model-value="selectedFileId === scope.row.id"
                        @change="(val) => handleFileCheckboxChange(val, scope.row.id)"
                        @click.stop
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="pdf">
                    <template #default="scope">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <img 
                          :src="getFileIcon(scope.row.filename)" 
                          style="width: 24px; height: 24px;"
                          v-if="getFileIcon(scope.row.filename)"
                        />
                        <div style="font-size:19px">
                          <div>{{ scope.row.filename }}</div>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <!-- 添加操作列 -->
                  <el-table-column label="操作" width="350">
                    <template #default="scope">
                      <div class="operation-buttons" style="display: flex; gap: 8px;">
                        <el-button
                          type="warning"
                          size="large"
                          @click="handleSelectQuestionsByFile(scope.row)"
                        >
                          选择
                        </el-button>
                        <el-button
                          type="success"
                          size="large"
                          @click="handleOpenExternal(scope.row)"
                        >
                          打开文件
                        </el-button>
                        <el-button
                          type="primary"
                          size="large"
                          @click="handleOpenDirectory(scope.row)"
                        >
                          打开目录
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
                <!-- 添加分页组件 -->
                <div class="pagination-container">
                  <el-pagination
                    v-model:current-page="fileCurrentPage"
                    v-model:page-size="filePageSize"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="fileTotal"
                    layout="prev, pager, next"
                    @size-change="handleFileSizeChange"
                    @current-change="handleFileCurrentChange"
                  />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
      
      <div :class="['settings-div', {'settings-div-visible': settingsDrawerVisible}]">
        <div class="settings-drawer-content">
          <div class="settings-drawer-header">
            <el-button type="text" @click="closeSettingsDrawer">
              <el-icon><Fold /></el-icon>
            </el-button>
            <div class="settings-actions" style="display: flex; align-items: center;">
               <h3 style="margin: 0; margin-left: 10px;">数据库导出设置</h3>
            </div>
          </div>
          <div class="settings-content" style="padding: 20px;">
            <!-- 表格选择区域 -->
            <div style="margin-bottom: 20px;">
              <h4>选择要导出的数据表</h4>
              <el-table
                :data="dbTables"
                style="width: 100%"
                @selection-change="handleTableSelectionChange"
                max-height="400"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="name" label="表名" />
              </el-table>
            </div>
            
            <!-- 目标路径选择 -->
            <div style="margin-bottom: 20px;">
              <h4>选择导出目录</h4>
              <el-input
                v-model="exportTargetPath"
                placeholder="请选择导出目录"
                readonly
                style="margin-bottom: 10px;"
              >
                <template #append>
                  <el-button @click="selectExportDirectory">选择目录</el-button>
                </template>
              </el-input>
              <el-input
                v-model="exportFileName"
                placeholder="请输入导出文件名（不含扩展名）"
                style="margin-bottom: 10px;"
              />
            </div>
            
            <!-- 确定按钮 -->
            <div style="text-align: right;">
              <el-button type="primary" @click="handleExportDatabase" :loading="exportLoading">
                确定导出
              </el-button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 考点抽屉 -->
      <div :class="['exampoint-div', {'exampoint-div-visible': examPointDrawerVisible}]">
        <div class="exampoint-drawer-content">
          <div class="exampoint-drawer-header">
            <el-button type="text" @click="closeExamPointDrawer">
              <el-icon><Fold /></el-icon>
            </el-button>
            <div class="exampoint-actions" style="display: flex; align-items: center;">
              <h3 style="margin: 0; margin-left: 10px;">考点管理</h3>
            </div>
          </div>
          <div class="exampoint-content" style="padding: 10px;">
            <div style="margin-bottom: 10px; display: flex; gap: 10px;">
              <el-select
                v-model="examPointSubjectId"
                placeholder="请选择科目"
                size="large"
                style="width: 200px"
                filterable
                :teleported="true"
                popper-class="exampoint-select-popper"
                :loading="treeData.length === 0"
                loading-text="加载中..."
                no-data-text="暂无科目数据"
                :disabled="treeData.length === 0"
                @change="handleExamPointSubjectChange"
              >
                <el-option
                  v-for="subject in filteredTreeData"
                  :key="subject.id"
                  :label="subject.title"
                  :value="subject.id"
                  :disabled="subject.children && subject.children.length > 0"
                />
              </el-select>
              
            </div>
            <!-- 考点列表 -->
            <el-table
              :data="examPointList"
              style="width: 100%"
              height="500"
              v-loading="examPointLoading"
              @row-click="handleRowClick"
            >
              <el-table-column prop="point" label="考点" min-width="200">
                <template #default="{ row }">
                  <div v-if="row.isEditing">
                    <el-input v-model="row.editPoint" size="small" />
                  </div>
                  <div v-else>{{ row.point }}</div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="250" fixed="right">
                <template #default="{ row }">
                  <div v-if="row.isEditing" style="display: flex; gap: 5px;">
                    <el-button type="success" @click="handleSaveExamPoint(row)">保存</el-button>
                    <el-button @click="handleCancelEditExamPoint(row)">取消</el-button>
                  </div>
                  <div v-else style="display: flex; gap: 5px;">
                    <el-button type="warning" @click="handleAIGenerate(row)">AI</el-button>
                    <el-button type="primary" @click="handleEditExamPoint(row)">编辑</el-button>
                    <el-button type="danger" @click="handleDeleteExamPoint(row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            <!-- 分页 -->
            <div style="margin-top: 10px; display: flex; justify-content: center;">
              <el-pagination
                background
                :current-page="examPointCurrentPage"
                :page-size="examPointPageSize"
                :total="examPointTotal"
                layout="prev, pager, next"
                @current-change="handleExamPointPageChange"
              />
            </div>
            <!-- 添加考点表单 -->
            <div style="margin-top: 15px;">
              
              <div style="display:flex;flex-direction:column;gap:20px">
                <el-input
                  v-model="newExamPoint"
                  type="textarea"
                  placeholder="请输入考点内容"
                  :rows="5"
                  style="width: 100%"
                />
                <el-button style="width:100%" type="primary" size="large" @click="handleAddExamPoint">
                  添加
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div :class="['center-section', {'center-section-collapsed': isLeftCollapsed}, {'no-webview': !showWebView}]">
      <div class="print-header">
        <el-button v-if="selectionMode" type="primary" @click="handleBatchPrint">打印</el-button>
        <el-button v-if="selectionMode" type="primary" @click="handleBatchCopy">批量复制</el-button>
        <el-button type="primary" size="large" @click="openSettingsDialog">设置</el-button>
        <el-select
          v-model="selectedQuestionType"
          placeholder="题目类型"
          size="large"
          style="width: 100px"
          @change="handleQuestionTypeChange"
        >
          <el-option label="全部" value="全部"></el-option>
          <el-option label="单选题" value="单选题"></el-option>
          <el-option label="多选题" value="多选题"></el-option>
          <el-option label="主观题" value="主观题"></el-option>
          <el-option label="记忆题" value="记忆题"></el-option>
          <el-option label="非客观题" value="非客观题"></el-option>
        </el-select>
        <!-- 添加搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索题目"
          size="large"
          style="width: 150px"
          @input="handleSearch"
          clearable
        >
        </el-input>
        <el-button type="success" size="large" @click="toggleHandwritingBoard">
          <span>手写</span>
        </el-button>
        
        <el-select
          v-model="selectedAI"
          placeholder="选择AI"
          size="large"
          style="width: 150px"
          @change="loadAIUrl"
          multiple
          collapse-tags
          collapse-tags-tooltip
        >
          <el-option label="大模型问答" value="aichat"></el-option>
          <el-option label="元宝" value="yuanbao"></el-option>
          <el-option label="metaso" value="metaso"></el-option>
          <el-option label="deepseek" value="deepseek"></el-option>
          <el-option label="豆包" value="doubao"></el-option>
          <el-option label="claude" value="claude"></el-option>
          <el-option label="kimi" value="kimi"></el-option>
          <el-option label="chatgpt" value="chatgpt"></el-option>
        </el-select>
      </div>

      <div v-if="isEnglishSubject" class="english">
        <EnglishRead />
      </div>
      <div v-else class="otherSubject" style="position: relative;">
        <div v-if="questionMode === 'mutileWay'" class="mutileWay">
          <!-- 题目列表表格 -->
          <el-table
            :data="filteredQuestionList"
            style="width: 100%"
            v-loading="tableLoading"
            :height="showAddQuestionForm ? 'calc(100vh - 490px)' : 'calc(100vh - 100px)'"
            @selection-change="handleSelectionChange"
            :default-expand-all="true"
          >
            <el-table-column
              v-if="selectionMode"
              type="selection"
              width="55">
            </el-table-column>
            <el-table-column label="题目" min-width="300">
              <template #default="{ row, $index }">
                <div class="question-content" style="cursor: pointer;">
                  <div @click="copyToClipboard(row)" style="flex: 1;width:100%;">
                    <span>{{ (currentPage - 1) * pageSize + $index + 1 }}、【{{row.questiontype}}】</span>
                    <ContentEditor :content-html="row.question" :border="false" :padding="0" :editable="false" :font-size="35" />
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="question-detail">
                  <img v-if="showImages" :src="getRandomBackgroundImage(row.id)" class="background-image" alt="background" />
                  <!-- 非客观题显示 -->
                  <div v-if="row.questiontype === '非客观题'" class="non-objective-question">
                    <div class="non-objective-container">
                      <!-- 左侧答题区域 -->
                      <div class="answer-section">
                        <el-input
                          v-model="row.subjectiveAnswer"
                          type="textarea"
                          :rows="18"
                          placeholder="请输入答案..."
                          class="large-font-input"
                        />
                        <el-button type="danger" size="large" @click="row.subjectiveAnswer = ''" style="margin-top: 5px;">清空</el-button>
                      </div>
                      <!-- 右侧答案预览区域 -->
                      <div class="answer-preview-section">
                        <div class="answer-switch-header">
                          <span>显示答案</span>
                          <el-switch v-model="row.showAnswer" />
                          <el-button 
                            v-if="!row.isEditingAnswer"
                            type="primary" 
                            @click="handleEditNonObjectiveAnswer(row)"
                          >
                            编辑
                          </el-button>
                        </div>
                        <!-- 编辑模式 -->
                        <div v-if="row.isEditingAnswer" class="answer-edit-area">
                          <el-input
                            v-model="row.editAnswerContent"
                            type="textarea"
                            :rows="10"
                            placeholder="请输入答案..."
                          />
                          <el-button type="danger" size="large" @click="row.editAnswerContent = ''" style="margin-top: 5px;">清空</el-button>
                          <div class="answer-edit-buttons">
                            <el-button @click="handleCancelEditNonObjectiveAnswer(row)">取消</el-button>
                            <el-button type="primary" @click="handleSaveNonObjectiveAnswer(row)">保存</el-button>
                          </div>
                        </div>
                        <!-- 显示模式 -->
                        <div v-else class="answer-display-area">
                          <div v-html="renderMarkdown(row.showAnswer ? (row.explain || '暂无内容') : '暂无内容')"></div>
                        </div>
                      </div>
                    </div>
                    <!-- 操作按钮 -->
                    <div class="operation-buttons" style="margin-top: 10px;">
                      <el-button type="primary" size="large" @click="handleCopyQuestion(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <el-icon v-if="aiButtonStates[row.id]"><Check /></el-icon>
                        <span v-else>AI</span>
                      </el-button>
                      <el-button 
                        :type="row.iscollect == '1' ? 'warning' : 'info'" 
                        size="large" 
                        @click="storageQuestion(row)"
                        style="height: 45px; font-size: 16px; padding: 10px 20px;"
                      >
                        <el-icon><Star /></el-icon>
                        <span>{{ row.iscollect == '1' ? '已收藏' : '收藏' }}</span>
                      </el-button>
                      <el-button type="primary" size="large" @click="handleCopyQuestionSame(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <el-icon v-if="aiButtonSameStates[row.id]"><Check /></el-icon>
                        <span v-else>AI同类题</span>
                      </el-button>
                      <el-button type="warning" size="large" @click="openSimilarQuestionDialog(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <span>相似题({{ similarQuestionCounts[row.id] || 0 }})</span>
                      </el-button>
                      <el-button type="danger" size="large" @click="handleDeleteQuestion(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <div style="margin-top: 10px;">
                      <el-button type="danger" size="large"  @click="handleHideQuestion(row)">删除</el-button>
                    </div>
                  </div>
                  <!-- 主观题显示textarea -->
                  <div v-else-if="row.questiontype === '主观题'" class="subjective-answer">
                    <el-input
                      v-model="row.subjectiveAnswer"
                      type="textarea"
                      :rows="10"
                      placeholder="请输入答案..."
                      class="large-font-input"
                      style="width: 55%;"
                    />
                    <el-button type="danger" size="large" @click="row.subjectiveAnswer = ''" style="margin-left: 10px;">清空</el-button>
                    <div style="margin-top: 10px;">
                      <el-button type="primary" size="large" @click="handleCopyQuestion(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <el-icon v-if="aiButtonStates[row.id]"><Check /></el-icon>
                        <span v-else>AI</span>
                      </el-button>
                      
                      <el-button type="primary" size="large" @click="toggleExplain(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <span>{{ explainStates[row.id] ? '隐藏答案' : '查看答案' }}</span>
                      </el-button>
                      <el-button 
                        :type="row.iscollect == '1' ? 'warning' : 'info'" 
                        size="large" 
                        @click="storageQuestion(row)"
                        style="height: 45px; font-size: 16px; padding: 10px 20px;"
                      >
                        <el-icon><Star /></el-icon>
                        <span>{{ row.iscollect == '1' ? '已收藏' : '收藏' }}</span>
                      </el-button>
                      <el-button type="primary" size="large" @click="handleCopyQuestionSame(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <el-icon v-if="aiButtonSameStates[row.id]"><Check /></el-icon>
                        <span v-else>AI同类题</span>
                      </el-button>
                      <el-button type="warning" size="large" @click="openSimilarQuestionDialog(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <span>相似题({{ similarQuestionCounts[row.id] || 0 }})</span>
                      </el-button>
                      <el-button type="danger" size="large" @click="handleDeleteQuestion(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <div style="margin-top: 10px;">
                      <el-button type="danger" size="large"  @click="handleHideQuestion(row)">删除</el-button>
                    </div>
                    <!-- 解析显示区域 -->
                    <div v-if="explainStates[row.id]" class="explain-section" style="margin-top: 15px; padding: 15px; background-color: #f5f3f0;  border-left: 4px solid #8b9a6d;">
                      <div style="color: #606266; line-height: 1.6; font-size: 30px;">{{ row.explain || '暂无解析' }}</div>
                    </div>
                  </div>
                  <!-- 其他题型显示选项 -->
                  <div v-else-if="row.items" class="question-options">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                      <div style="flex: 1;" >
                        <div v-if="currentQuestion.questiontype == '单选题' || currentQuestion.questiontype === '多选题' || currentQuestion.questiontype == '单选' || currentQuestion.questiontype == '多选' || currentQuestion.questiontype == '判断题'">
                          <div v-for="option in getOptions(row.items)" :key="option.key" class="option" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <el-icon 
                              @click="toggleDeleteOption(row, option.key)" 
                              :style="{
                                cursor: 'pointer',
                                marginRight: '20px',
                                color: isOptionDeleted(row, option.key) ? '#e8686a' : '#9a9590',
                                fontSize: '25px',
                                flexShrink: 0
                              }"
                            >
                              <Delete />
                            </el-icon>
                            <!-- 选项内容 -->
                            <div style="flex: 1;">
                              <ContentEditor 
                                :content-html="option.key + ' ' + option.content" 
                                :border="false" 
                                :padding="0" 
                                :editable="false" 
                                :font-size="30" 
                                :is-deleted="isOptionDeleted(row, option.key)"
                              />
                            </div>
                            
                          </div>
                          <!-- 按钮组 A B C D -->
                          <div class="option-buttons" style="margin: 15px 0; display: flex; gap: 10px; align-items: center;">
                            <el-button 
                              v-for="option in getOptions(row.items)" 
                              :key="option.key"
                              v-show="!isOptionDeleted(row, option.key)"
                              :type="getOptionButtonType(row, option.key)" 
                              size="large" 
                              @click="selectOption(row, option.key)"
                              style="min-width: 60px; height: 45px; font-size: 18px; font-weight: bold;"
                            >
                              {{ option.key }}
                            </el-button>
                            <div>
                              <el-icon v-if="correctStatus[row.id] === true" class="correct-icon" style="color: red; font-size: 35px!important"><Check /></el-icon>
                              <el-icon v-if="correctStatus[row.id] === false" class="wrong-icon" style="color: red; font-size: 35px!important"><Close /></el-icon>
                            </div>
                          </div>
                        </div>
                        <el-input 
                          v-model="row.userAnswer" 
                          type="textarea"
                          :rows="2"
                          placeholder="请输入答案..." 
                          class="large-font-input"
                          style="width: 55%;"
                        />
                        <el-button type="danger" size="large" @click="row.userAnswer = ''" style="margin-left: 10px;">清空</el-button>
                        <div style="margin-top: 10px;">
                          <el-button type="primary" size="large" @click="handleCopyQuestion(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <el-icon v-if="aiButtonStates[row.id]"><Check /></el-icon>
                            <span v-else>AI</span>
                          </el-button>
                          <el-button type="primary" size="large" @click="toggleExplain(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <span>{{ explainStates[row.id] ? '隐藏答案' : '查看答案' }}</span>
                          </el-button>
                          <el-button 
                            :type="row.iscollect == '1' ? 'warning' : 'info'" 
                            size="large" 
                            @click="storageQuestion(row)"
                            style="height: 45px; font-size: 16px; padding: 10px 20px;"
                          >
                            <el-icon><Star /></el-icon>
                            <span>{{ row.iscollect == '1' ? '已收藏' : '收藏' }}</span>
                          </el-button>
                          <el-button type="primary" size="large" @click="handleCopyQuestionSame(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <el-icon v-if="aiButtonSameStates[row.id]"><Check /></el-icon>
                            <span v-else>AI同类题</span>
                          </el-button>
                          <el-button type="warning" size="large" @click="openSimilarQuestionDialog(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <span>相似题({{ similarQuestionCounts[row.id] || 0 }})</span>
                          </el-button>
                          <el-button type="danger" size="large" @click="handleDeleteQuestion(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;"><el-icon><Delete /></el-icon></el-button>
                        </div>
                        <div style="margin-top: 10px;">
                          <el-button type="danger" size="large"  @click="handleHideQuestion(row)">删除</el-button>
                        </div>
                        <!-- 解析显示区域 -->
                        <div v-if="explainStates[row.id]" class="explain-section" style="margin-top: 15px; padding: 15px; background-color: #f5f3f0; border-left: 4px solid #8b9a6d;">
                          <ContentEditor 
                            :content-html="row.explain || '暂无解析'" 
                            :border="false" 
                            :padding="0" 
                            :editable="false" 
                            :font-size="30"
                            style="color: #606266; line-height: 1.6;"
                          />
                        </div>
                      </div>
                    
                    </div>
                  </div>
                  <div v-else class="question-options">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                      <div style="flex: 1;" >
                        <div style="margin-top: 10px;">
                          <el-button type="primary" size="large" @click="handleCopyQuestion(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <el-icon v-if="aiButtonStates[row.id]"><Check /></el-icon>
                            <span v-else>AI</span>
                          </el-button>
                          <el-button type="primary" size="large" @click="toggleExplain(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <span>{{ explainStates[row.id] ? '隐藏答案' : '查看答案' }}</span>
                          </el-button>
                          <el-button 
                            :type="row.iscollect == '1' ? 'warning' : 'info'" 
                            size="large" 
                            @click="storageQuestion(row)"
                            style="height: 45px; font-size: 16px; padding: 10px 20px;"
                          >
                            <el-icon><Star /></el-icon>
                            <span>{{ row.iscollect == '1' ? '已收藏' : '收藏' }}</span>
                          </el-button>
                          <el-button type="primary" size="large" @click="handleCopyQuestionSame(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <el-icon v-if="aiButtonSameStates[row.id]"><Check /></el-icon>
                            <span v-else>AI同类题</span>
                          </el-button>
                          <el-button type="warning" size="large" @click="openSimilarQuestionDialog(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <span>相似题({{ similarQuestionCounts[row.id] || 0 }})</span>
                          </el-button>
                          <el-button type="success" size="large" @click="handleCopyQuestionData(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                            <el-icon><DocumentCopy /></el-icon>
                          </el-button>
                          <el-button type="danger" size="large" @click="handleDeleteQuestion(row)" style="height: 45px; font-size: 16px; padding: 10px 20px;"><el-icon><Delete /></el-icon></el-button>
                        </div>
                        
                        <div style="margin-top: 10px;">
                          <el-button type="danger" size="large"  @click="handleHideQuestion(row)">删除</el-button>
                        </div>
                        <!-- 解析显示区域 -->
                        <div v-if="explainStates[row.id]" class="explain-section" style="margin-top: 15px; padding: 15px; background-color: #f5f3f0; border-left: 4px solid #8b9a6d;">
                          <ContentEditor 
                            :content-html="row.explain || '暂无解析'" 
                            :border="false" 
                            :padding="0" 
                            :editable="false" 
                            :font-size="30"
                            style="color: #606266; line-height: 1.6;"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
          
          
        </div>

        <div v-if="questionMode === 'prenextWay'" class="prenextWay" style="">
          <!-- 单题显示模式 -->
          <div v-if="currentQuestion">
            <div class="question-header">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <el-button 
                  :type="currentQuestion.iscollect == '1' ? 'warning' : 'primary'" 
                  @click="storageQuestion(currentQuestion)"
                  style="padding: 10px 20px;margin-right:20px"
                >
                  <el-icon><Star /></el-icon>
                  <span>{{ currentQuestion.iscollect == '1' ? '已收藏' : '收藏' }}</span>
                </el-button>
                <div style="font-size: 24px; font-weight: bold;">
                  <span>第 {{ currentQuestionIndex + 1 }} 题 / 共 {{ questionList.length }} 题</span>
                  <span style="margin-left: 20px;">【{{ currentQuestion.questiontype }}】</span>
                </div>
                
              </div>
            </div>
            
            <div class="whole-question-content">
              <!-- 题目内容 -->
              <div class="question-content" @click="copyToClipboard(currentQuestion)" style="cursor: pointer;">
                <ContentEditor 
                  :content-html="currentQuestion.question" 
                  :border="false" 
                  :padding="0" 
                  :editable="false" 
                  :font-size="25" 
                />
              </div>

              <!-- 题目详情 -->
              <div class="question-detail">
                <img v-if="showImages" :src="getRandomBackgroundImage(currentQuestion.id)" class="background-image" alt="background" />
                
                <!-- 非客观题显示 -->
                <div v-if="currentQuestion.questiontype === '非客观题'" class="non-objective-question">
                  <!-- 如果有小题，显示小题列表 -->
                  <div v-if="currentQuestion.itemsDisplay && currentQuestion.itemsDisplay.length > 0" class="items-container">
                    <div v-for="(item, index) in currentQuestion.itemsDisplay" :key="item.id" class="item-wrapper" style="margin-bottom: 5px; padding: 5px;  border-radius: 8px;">
                      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;border-left:5px solid #eee;padding-left:8px">小题 {{ index + 1 }}</div>
                      <!-- 小题题目 -->
                      <div style="margin-bottom: 15px; ">
                        <ContentEditor 
                          :content-html="item.question" 
                          :border="false" 
                          :padding="0" 
                          :editable="false" 
                          :font-size="25" 
                        />
                      </div>
                      <div class="non-objective-container">
                        <!-- 右侧答案预览区域 -->
                        <div class="answer-preview-section">
                          <div class="answer-switch-header">
                            <span>显示答案</span>
                            <el-switch v-model="currentQuestion.showAnswer" />
                          </div>
                          <!-- 显示答案 -->
                          <div class="answer-display-area">
                            <div v-html="renderMarkdown(currentQuestion.showAnswer ? (item.answer || '暂无答案') : '暂无内容')"></div>
                          </div>
                        </div>
                        <!-- 左侧答题区域 -->
                        <div class="answer-section">
                          <div class="input-with-clear">
                            <el-input
                              v-model="item.subjectiveAnswer"
                              type="textarea"
                              :rows="10"
                              placeholder="请输入答案..."
                              class="large-font-input"
                            />
                            <el-button 
                              type="danger" 
                              size="large" 
                              @click="item.subjectiveAnswer = ''"
                              style="margin-top: 8px;"
                            >
                              清空
                            </el-button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 如果没有小题（未加载或加载中），显示加载提示 -->
                  <div v-else class="loading-items" style="text-align: center; padding: 40px; color: #999;">
                    <el-icon class="is-loading" style="font-size: 40px;"><Loading /></el-icon>
                    <div style="margin-top: 10px;">正在加载题目详情...</div>
                  </div>
                  <!-- 操作按钮 -->
                  <div class="operation-buttons" style="margin-top: 10px;">
                    <el-button type="primary" size="large" @click="handleCopyQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                      <el-icon v-if="aiButtonStates[currentQuestion.id]"><Check /></el-icon>
                      <span v-else>AI</span>
                    </el-button>
                    <el-button 
                      :type="currentQuestion.iscollect == '1' ? 'warning' : 'info'" 
                      size="large" 
                      @click="storageQuestion(currentQuestion)"
                      style="height: 45px; font-size: 16px; padding: 10px 20px;"
                    >
                      <el-icon><Star /></el-icon>
                      <span>{{ currentQuestion.iscollect == '1' ? '已收藏' : '收藏' }}</span>
                    </el-button>
                    <el-button type="primary" size="large" @click="handleCopyQuestionSame(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                      <el-icon v-if="aiButtonSameStates[currentQuestion.id]"><Check /></el-icon>
                      <span v-else>AI同类题</span>
                    </el-button>
                    <el-button type="warning" size="large" @click="openSimilarQuestionDialog(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                      <span>相似题({{ currentQuestion ? (similarQuestionCounts[currentQuestion.id] || 0) : 0 }})</span>
                    </el-button>
                    <el-button type="danger" size="large" @click="handleDeleteQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                  <div style="margin-top: 10px;">
                    <el-button type="danger" size="large"  @click="handleHideQuestion(currentQuestion)">删除</el-button>
                  </div>
                </div>
                <!-- 主观题显示textarea -->
                <div v-else-if="currentQuestion.questiontype === '主观题'" class="subjective-answer">
                  <div style="margin-top: 10px;">
                    <el-button type="primary" size="large" @click="handleCopyQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                      <el-icon v-if="aiButtonStates[currentQuestion.id]"><Check /></el-icon>
                      <span v-else>AI</span>
                    </el-button>
                    <el-button type="primary" size="large" @click="toggleExplain(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                      <span>{{ explainStates[currentQuestion.id] ? '隐藏答案' : '查看答案' }}</span>
                    </el-button>
                    <el-button 
                      :type="currentQuestion.iscollect == '1' ? 'warning' : 'info'" 
                      size="large" 
                      @click="storageQuestion(currentQuestion)"
                      style="height: 45px; font-size: 16px; padding: 10px 20px;"
                    >
                      <el-icon><Star /></el-icon>
                      <span>{{ currentQuestion.iscollect == '1' ? '已收藏' : '收藏' }}</span>
                    </el-button>
                    <el-button type="primary" size="large" @click="handleCopyQuestionSame(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                      <el-icon v-if="aiButtonSameStates[currentQuestion.id]"><Check /></el-icon>
                      <span v-else>AI同类题</span>
                    </el-button>
                    <el-button type="warning" size="large" @click="openSimilarQuestionDialog(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                      <span>相似题({{ currentQuestion ? (similarQuestionCounts[currentQuestion.id] || 0) : 0 }})</span>
                    </el-button>
                    <el-button type="danger" size="large" @click="handleDeleteQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;"><el-icon><Delete /></el-icon></el-button>
                  </div>
                  <div style="margin-top: 10px;">
                    <el-button type="danger" size="large" @click="handleHideQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">删除</el-button>
                  </div>
                  <!-- 解析显示区域 -->
                  <div v-if="explainStates[currentQuestion.id]" class="explain-section" style="margin-top: 15px; padding: 15px; background-color: #f5f3f0; border-left: 4px solid #8b9a6d;">
                    <ContentEditor 
                      :content-html="currentQuestion.explain || '暂无解析'" 
                      :border="false" 
                      :padding="0" 
                      :editable="false" 
                      :font-size="30"
                      style="color: #606266; line-height: 1.6;"
                    />
                  </div>
                  
                  <div class="input-with-clear" style="width: 55%;">
                    <el-input
                      v-model="currentQuestion.subjectiveAnswer"
                      type="textarea"
                      :rows="10"
                      placeholder="请输入答案..."
                      class="large-font-input"
                    />
                    <el-button 
                      type="danger" 
                      size="large" 
                      @click="currentQuestion.subjectiveAnswer = ''"
                      style="margin-top: 8px;"
                    >
                      清空
                    </el-button>
                  </div>
                </div>
                
                <!-- 其他题型显示选项 -->
                <div v-else-if="currentQuestion.items" class="question-options">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="flex: 1;">
                      <div v-if="currentQuestion.questiontype == '单选题' || currentQuestion.questiontype === '多选题' || currentQuestion.questiontype == '单选' || currentQuestion.questiontype == '多选' || currentQuestion.questiontype === '判断题'">
                        <div v-for="option in getOptions(currentQuestion.items)" :key="option.key" class="option" style="display: flex; align-items: center; margin-bottom: 8px;">
                          <el-button 
                            type="danger" 
                            @click="toggleDeleteOption(currentQuestion, option.key)"
                            :style="{ 
                              marginRight: '20px',
                              flexShrink: 0
                            }"
                          >
                            <el-icon><Delete /></el-icon>
                          </el-button>
                          <!-- 选项内容 -->
                          <div style="flex: 1;">
                            <ContentEditor 
                              :content-html="option.key + ' ' + option.content" 
                              :border="false" 
                              :padding="0" 
                              :editable="false" 
                              :font-size="30" 
                              :is-deleted="isOptionDeleted(currentQuestion, option.key)"
                            />
                          </div>
                        </div>
                      
                      
                        <!-- 按钮组 A B C D -->
                        <div class="option-buttons" style="margin: 15px 0; display: flex; gap: 10px; align-items: center;">
                          <el-button 
                            v-for="option in getOptions(currentQuestion.items)" 
                            :key="option.key"
                            v-show="!isOptionDeleted(currentQuestion, option.key)"
                            :type="getOptionButtonType(currentQuestion, option.key)" 
                            size="large" 
                            @click="selectOption(currentQuestion, option.key)"
                            style="min-width: 60px; height: 45px; font-size: 18px; font-weight: bold;"
                          >
                            {{ option.key }}
                          </el-button>
                          <div>
                            <el-icon v-if="correctStatus[currentQuestion.id] === true" class="correct-icon" style="color: red; font-size: 35px!important"><Check /></el-icon>
                            <el-icon v-if="correctStatus[currentQuestion.id] === false" class="wrong-icon" style="color: red; font-size: 35px!important"><Close /></el-icon>
                          </div>
                        </div>
                      </div>
                      
                      
                      <div style="margin-top: 10px;">
                        <el-button type="primary" size="large" @click="handleCopyQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <el-icon v-if="aiButtonStates[currentQuestion.id]"><Check /></el-icon>
                          <span v-else>AI</span>
                        </el-button>
                        <el-button type="primary" size="large" @click="toggleExplain(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <span>{{ explainStates[currentQuestion.id] ? '隐藏答案' : '查看答案' }}</span>
                        </el-button>
                        
                        <el-button type="primary" size="large" @click="handleCopyQuestionSame(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <el-icon v-if="aiButtonSameStates[currentQuestion.id]"><Check /></el-icon>
                          <span v-else>AI同类题</span>
                        </el-button>
                        <el-button type="warning" size="large" @click="openSimilarQuestionDialog(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <span>相似题({{ currentQuestion ? (similarQuestionCounts[currentQuestion.id] || 0) : 0 }})</span>
                        </el-button>
                        <el-button  type="warning" size="large" @click="handleCopyQuestionData(currentQuestion)" style="height: 45px; font-size: 16px;display:none">
                          <span>复制</span>
                        </el-button>
                        <el-button type="danger" size="large" @click="handleDeleteQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;"><el-icon><Delete /></el-icon></el-button>
                      </div>
                      <div style="margin-top: 10px;">
                        <el-button type="danger" size="large" @click="handleHideQuestion(currentQuestion)">删除</el-button>
                        <el-button type="warning" size="large" @click="openCorrectAnswerDialog(currentQuestion)">更正答案</el-button>
                      </div>
                      <div v-if="explainStates[currentQuestion.id]" class="explain-section" style="margin-top: 15px; padding: 15px; background-color: #f5f3f0; border-left: 4px solid #8b9a6d;">
                        <ContentEditor 
                          :content-html="currentQuestion.explain || '暂无解析'" 
                          :border="false" 
                          :padding="0" 
                          :editable="false" 
                          :font-size="30"
                          style="color: #606266; line-height: 1.6;"
                        />
                      </div>

                      <div style="display: flex; align-items: flex-start; gap: 10px; margin-top: 10px;">
                        <el-input 
                          v-model="currentQuestion.userAnswer" 
                          type="textarea"
                          :rows="2"
                          placeholder="请填写正确答案..." 
                          class="large-font-input"
                          style="width: 55%;"
                        />
                        <el-button type="danger" size="large" @click="currentQuestion.userAnswer = ''">清空</el-button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div v-else class="question-options">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="flex: 1;">
                      <div style="margin-top: 10px;">
                        <el-button type="primary" size="large" @click="handleCopyQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <el-icon v-if="aiButtonStates[currentQuestion.id]"><Check /></el-icon>
                          <span v-else>AI</span>
                        </el-button>
                        <el-button type="primary" size="large" @click="toggleExplain(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <span>{{ explainStates[currentQuestion.id] ? '隐藏答案' : '查看答案' }}</span>
                        </el-button>
                        <el-button 
                          :type="currentQuestion.iscollect == '1' ? 'warning' : 'info'" 
                          size="large" 
                          @click="storageQuestion(currentQuestion)"
                          style="height: 45px; font-size: 16px; padding: 10px 20px;"
                        >
                          <el-icon><Star /></el-icon>
                          <span>{{ currentQuestion.iscollect == '1' ? '已收藏' : '收藏' }}</span>
                        </el-button>
                        <el-button type="primary" size="large" @click="handleCopyQuestionSame(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <el-icon v-if="aiButtonSameStates[currentQuestion.id]"><Check /></el-icon>
                          <span v-else>AI同类题</span>
                        </el-button>
                        <el-button type="warning" size="large" @click="openSimilarQuestionDialog(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <span>相似题({{ currentQuestion ? (similarQuestionCounts[currentQuestion.id] || 0) : 0 }})</span>
                        </el-button>
                        <el-button type="success" size="large" @click="handleCopyQuestionData(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;">
                          <el-icon><DocumentCopy /></el-icon>
                        </el-button>
                      </div>
                      <div style="margin-top: 10px;">
                        <el-button type="danger" size="large" @click="handleDeleteQuestion(currentQuestion)" style="height: 45px; font-size: 16px; padding: 10px 20px;"><el-icon><Delete /></el-icon></el-button>
                      </div>
                      <!-- 解析显示区域 -->
                      <div v-if="explainStates[currentQuestion.id]" class="explain-section" style="margin-top: 15px; padding: 15px; background-color: #f5f3f0; border-left: 4px solid #8b9a6d;">
                        <ContentEditor 
                          :content-html="currentQuestion.explain || '暂无解析'" 
                          :border="false" 
                          :padding="0" 
                          :editable="false" 
                          :font-size="30"
                          style="color: #606266; line-height: 1.6;"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 没有题目时的提示 -->
          <div v-else style="padding: 0 50px; text-align: center; font-size: 20px; color: #909399;">
            暂无题目
          </div>
        </div>

        <!-- 手写板遮罩层 -->
        <div v-if="showHandwritingBoard" class="handwriting-overlay" @click.self="closeHandwritingBoard">
          <div class="handwriting-container">
            <div class="handwriting-header">
              <div class="toolbar-group">
                <div class="color-picker">
                  <div 
                    v-for="color in penColors" 
                    :key="color"
                    :style="{ backgroundColor: color }"
                    :class="['color-item', { active: currentColor === color }]"
                    @click="changeColor(color)"
                  ></div>
                </div>
              </div>
              <div class="toolbar-group">
                <el-button size="large" type="primary" @click="addNewPage">新增一页</el-button>
                <el-button size="large" @click="prevPage" :disabled="currentPageIndex === 0">
                  <el-icon><ArrowLeft /></el-icon>
                </el-button>
                <span style="margin: 0 10px;">{{ currentPageIndex + 1 }} / {{ canvasPages.length }}</span>
                <el-button size="large" @click="nextPage" :disabled="currentPageIndex === canvasPages.length - 1">
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
                <el-button size="large" type="warning" @click="deletePage" :disabled="canvasPages.length <= 1">删除</el-button>
                <el-button size="large" type="danger" @click="handleHideQuestion(currentQuestion)">隐藏题目</el-button>
              </div>
              <div class="handwriting-tools">
                <el-button size="large" @click="clearCanvas">清空</el-button>
                <el-button size="large" type="danger" @click="clearAllCanvas">清空所有</el-button>
              </div>
            </div>
            <canvas 
              ref="handwritingCanvas"
              class="handwriting-canvas"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart="startDrawing"
              @touchmove="draw"
              @touchend="stopDrawing"
            ></canvas>
          </div>
        </div>
      </div>
      <div class="pagination-container" style="display: flex; align-items: center; justify-content: space-between; ">
        <!-- 模式切换开关 -->
        <div class="prenextButton" v-if="questionMode == 'prenextWay'">
          <div class="prenextButton" style="display: flex; gap: 10px;">
            <el-button 
              type="primary" 
              size="large" 
              @click="goToPreviousQuestion"
              :disabled="currentQuestionIndex === 0"
              style="height: 45px; font-size: 16px;"
            >
              <el-icon><ArrowLeft /></el-icon>
              <span>上一题</span>
            </el-button>
            <el-button 
              type="primary" 
              size="large" 
              @click="goToNextQuestion"
              :disabled="currentQuestionIndex === questionList.length - 1"
              style="height: 45px; font-size: 16px;"
            >
              <span>下一题</span>
              <el-icon><ArrowRight /></el-icon>
            </el-button>
            <el-button 
              type="success" 
              size="large" 
              @click="loadQuestionList"
              style="height: 45px; font-size: 16px;"
            >
              <el-icon><Refresh /></el-icon>
              <span>刷新题目</span>
            </el-button>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 10px;">
          <el-switch
            v-if="questionMode !== 'prenextWay'"
            v-model="isSelectMode"
            active-text="选择"
            inactive-text="常规"
            :disabled="isCollect"
            style="--el-switch-on-color: #8b9a6d; --el-switch-off-color: #c4a882;"
          />
          <span v-if="isCollect && questionMode !== 'prenextWay'" style="font-size: 12px; color: #999;">收藏模式下只支持常规模式</span>
          <el-button
            v-if="isSelectMode && questionMode !== 'prenextWay'"
            type="warning"
            size="large"
            @click="selectRandomPage"
          >
            选择一页
          </el-button>
        </div>
        <!-- 选择模式显示选择一页按钮 -->
        <el-pagination
          v-if="questionMode !== 'prenextWay'"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />

        
      </div>


    </div>

    <!-- 右侧区域 (browser) -->
    <div class="right-section" v-show="showWebView" :style="{ width: rightSectionWidth }">
      <!-- 大模型问答容器 -->
      <div
        v-if="selectedAI.includes('aichat')"
        class="webpage-container aichat-container"
        ref="webpageContainer-aichat"
        id="webview-container-aichat"
      >
        <div class="aichat-panel">
          <div class="aichat-header">
            <span class="aichat-title">大模型问答</span>
          </div>
          <div class="aichat-messages" ref="aichatMessagesRef">
            <div
              v-for="(msg, index) in aichatMessages"
              :key="index"
              class="aichat-message"
              :class="msg.role"
            >
              <div class="aichat-bubble">
                <div class="md-content" v-html="md.render(cleanMessageContent(msg.content))"></div>
                <span v-if="msg.role === 'assistant' && aichatLoading && index === aichatMessages.length - 1" class="typing-cursor">|</span>
              </div>
            </div>
            <div v-if="aichatLoading && aichatMessages[aichatMessages.length - 1]?.content === ''" class="aichat-message assistant">
              <div class="aichat-bubble aichat-typing">AI 思考中...</div>
            </div>
          </div>
          <div class="aichat-input">
            <el-input
              v-model="aichatInput"
              type="textarea"
              :rows="2"
              placeholder="输入问题..."
              resize="none"
              @keydown.enter.exact.prevent="sendAichatMessage"
            />
            <el-button type="primary" size="large" @click="sendAichatMessage">发送</el-button>
          </div>
        </div>
      </div>
      <!-- 其他 AI 网页容器 -->
      <div
        v-for="ai in selectedAIFiltered"
        :key="ai"
        class="webpage-container"
        :ref="'webpageContainer-' + ai"
        :id="'webview-container-' + ai"
      ></div>
    </div>

    <!-- 添加打印题目弹窗 -->
    <el-dialog title="打印题目" v-model="printDialogVisible" width="39%" class="left-shifted-dialog">
      <div class="print-container">
        <el-tabs v-model="activePrintTab">
          <el-tab-pane label="全部题目" name="all">
            <div class="all-questions">
              <div v-for="(question,index) in printQuestions" :key="question.id" class="question-preview">
                <div class="question-title">第{{index + 1}}题：{{question.question}}</div>
                
                <div v-if="question.items" class="question-options">
                  <div v-for="option in getOptions(question.items)" :key="option.key" class="option">
                    <ContentEditor :content-html="option.key + '. ' + option.content" :border="false" :padding="0" :editable="false" :font-size="18" />
                  </div>
                </div>
                <div v-if="question.explain" class="explanation">
                  解析：{{question.explain}}
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="填写打印" name="custom">
            <div class="custom-print-container">
              <el-input
                v-model="customPrintContent"
                type="textarea"
                :rows="10"
                placeholder="请输入要打印的内容"
              ></el-input>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="large" @click="printDialogVisible = false">取消</el-button>
          <el-button size="large" type="primary" @click="handlePrint">打印</el-button>
        </div>
      </template>
    </el-dialog>

    
    <!-- 添加科目弹窗 -->
    <el-dialog
      v-model="addSubjectDialogVisible"
      title="科目管理"
      width="600px"
      append-to-body
      custom-class="left-shifted-dialog"
    >
      <!-- 科目表格 -->
      <el-table
        :data="filteredTreeData"
        style="width: 100%; margin-bottom: 20px;"
        height="300px"
        @row-click="handleSubjectRowClick"
        highlight-current-row
      >
        <el-table-column prop="title" label="科目名称" >
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              type="danger"
              @click.stop="handleDeleteSubject(row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 编辑表单 -->
      <el-form :model="subjectForm" label-width="60px">
        <el-form-item label="科目：">
          <el-input
            v-model="subjectForm.title"
            placeholder="请输入科目名称"
            size="large"
          ></el-input>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="handleAddSubject">
            <el-icon><Plus /></el-icon>
            添加
          </el-button>
          <el-button type="success" @click="handleUpdateSubject">
            <el-icon><Edit /></el-icon>
            编辑保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 批量复制弹窗 -->
    <el-dialog
      v-model="batchCopyDialogVisible"
      title="批量复制题目"
      width="600px"
      append-to-body
    >
      <!-- 题目范围选择 -->
      <el-form label-width="80px">
        <el-form-item label="题目范围:">
          <el-radio-group v-model="batchCopyActiveTab" direction="vertical">
            <el-radio label="selected">选中的题目</el-radio>
            <el-radio label="manual">手动填写范围</el-radio>
            <el-radio label="all">全部题目</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <!-- 根据选择显示不同内容 -->
      <div class="range-content">
        <!-- 选中的题目 -->
        <div v-if="batchCopyActiveTab === 'selected'" class="tab-content">
          <div class="info-text">
            <p>将复制当前已选中的 <strong>{{ selectedQuestions.length }}</strong> 道题目</p>
          </div>
        </div>
        
        <!-- 手动填写范围 -->
        <div v-if="batchCopyActiveTab === 'manual'" class="tab-content">
          <el-form label-width="80px">
            <el-form-item label="题目范围:">
              <div style="display: flex; align-items: center; gap: 10px;">
                <el-input-number
                  v-model="manualRangeMin"
                  :min="1"
                  :max="Math.max(maxQuestionNum || 1, 1)"
                  size="large"
                  placeholder="最小值"
                />
                <span>到</span>
                <el-input-number
                  v-model="manualRangeMax"
                  :min="manualRangeMin"
                  :max="Math.max(maxQuestionNum || 1, 1)"
                  size="large"
                  placeholder="最大值"
                />
              </div>
            </el-form-item>
            <div class="info-text">
              <p>题目范围：第 {{ manualRangeMin }} 题 到 第 {{ manualRangeMax }} 题</p>
              <p>总计：<strong>{{ manualRangeMax - manualRangeMin + 1 }}</strong> 道题目</p>
            </div>
          </el-form>
        </div>
        
        <!-- 全部题目 -->
        <div v-if="batchCopyActiveTab === 'all'" class="tab-content">
          <div class="info-text">
            <p>将复制当前科目的所有题目</p>
            <p>总计：<strong>{{ Math.max(maxQuestionNum || 0, 0) }}</strong> 道题目</p>
          </div>
        </div>
      </div>
      
      <!-- 复制次数设置 -->
      <div>
        <el-form label-width="80px">
          <el-form-item label="复制次数:">
            <el-input-number
              v-model="batchCopyCount"
              :min="1"
              :max="50"
              size="large"
              style="width: 150px;"
            />
            <span style="margin-left: 10px; color: #606266;">每道题目将复制 {{ batchCopyCount }} 次</span>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchCopyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleConfirmBatchCopy">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 多选科目弹窗 -->
    <el-dialog
      title="选择科目"
      v-model="multiSelectDialogVisible"
      width="50%"
      class="left-shifted-dialog"
    >
      <div class="multi-select-content">
        <div class="subject-checkbox-list" style="max-height: 400px; overflow-y: auto;">
          <el-checkbox-group v-model="selectedSubjectIds">
            <div 
              v-for="subject in filteredTreeData" 
              :key="subject.id"
              style="margin-bottom: 10px;"
            >
              <el-checkbox 
                :label="subject.id" 
                :disabled="subject.children && subject.children.length > 0"
              >
                {{ subject.title }}
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="multiSelectDialogVisible = false">取消</el-button>
          <el-button type="warning" @click="clearMultiSelect">清空选择</el-button>
          <el-button type="primary" @click="confirmMultiSelect">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 设置弹窗 -->
    <el-dialog title="设置" v-model="settingsDialogVisible" width="30%" class="left-shifted-dialog">
      
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="width: 200px; text-align: right; margin-right: 20px;">多道题模式</div>
        <el-switch
          v-model="questionMode"
          active-value="mutileWay"
          inactive-value="prenextWay"
        />
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="width: 200px; text-align: right; margin-right: 20px;">显示左侧</div>
        <el-switch
          v-model="showLeftPanel"
        />
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="width: 200px; text-align: right; margin-right: 20px;">显示勾选框</div>
        <el-switch
          v-model="selectionMode"
        />
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="width: 200px; text-align: right; margin-right: 20px;">显示图片</div>
        <el-switch
          v-model="showImages"
        />
      </div>
      <div style="display: flex; align-items: center; ">
        <div style="width: 200px; text-align: right; margin-right: 20px;">收藏</div>
        <el-switch
          v-model="isCollect"
          @change="handleCollectChange"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="settingsDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="settingsDialogVisible = false">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑提示词弹窗 -->
    <el-dialog
      :title="isAddPromptMode ? '新增提示词' : '编辑提示词'"
      v-model="editPromptDialogVisible"
      width="50%"
      class="left-shifted-dialog zindex-Top"
      :close-on-click-modal="false"
    >
      <div style="padding:10px;background:#f5f3f0;height:500px;border-radius:12px;border:1px solid #e8e4df;">
        <RichEditor 
          v-model:contentHtml="currentEditPrompt.content" 
          height="100%" 
          :fontSize="30" 
          :showMenuBar="false"
          class="note-rich-editor"
          placeholder="开始编写笔记内容..."
          ref="promptContentEditor"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editPromptDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveEditedPrompt">{{ isAddPromptMode ? '确认新增' : '确认编辑' }}</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 相似题弹窗 -->
    <el-dialog
      title="相似题管理"
      v-model="similarQuestionDialogVisible"
      width="56%"
      class="left-width-shifted-dialog"
      style="top:-100px"
    >
      <div style="margin-bottom: 20px;">
        <el-input
          v-model="similarQuestionContent"
          type="textarea"
          :rows="5"
          placeholder="请输入题目内容，格式为：&#10;【题目】&#10;【选项】&#10;【答案】&#10;【解析】&#10;&#10;题目与题目之间用===============分隔"
        />
        <div style="margin-top: 10px;">
          <el-button type="primary" size="large"  @click="saveRelateQuestions">保存题目</el-button>
          <el-button type="success" size="large"  @click="refreshSimilarQuestions">
            <el-icon><Refresh /></el-icon>
            刷新题目
          </el-button>
          <el-button type="success" size="large" @click="toggleHandwritingBoard">
            <span>手写笔记</span>
          </el-button>
        </div>
      </div>
      
      <div>
        <div v-if="similarQuestionList.length > 0" v-loading="similarQuestionLoading">
         

          <!-- 当前相似题显示 -->
          <div v-if="currentSimilarQuestion" class="similar-question-detail">
            <!-- 题目内容 -->
            <div class="question-content" style="margin: 20px 0;">
              <ContentEditor 
                :content-html="`【${currentSimilarQuestion.questiontype}】${currentSimilarQuestion.question}`" 
                :border="false" 
                :padding="0" 
                :editable="false" 
                :font-size="25" 
              />
            </div>

            <!-- 题目详情 -->
            <div class="question-detail">
              <!-- 非客观题显示 -->
              <div v-if="currentSimilarQuestion.questiontype === '非客观题'" class="non-objective-question">
                <div class="non-objective-container">
                  <div class="answer-section">
                    <el-input
                      v-model="currentSimilarQuestion.subjectiveAnswer"
                      type="textarea"
                      :rows="10"
                      placeholder="请输入答案..."
                      class="large-font-input"
                    />
                    <el-button type="danger" size="large" @click="currentSimilarQuestion.subjectiveAnswer = ''" style="margin-top: 5px;">清空</el-button>
                  </div>
                  <div class="answer-preview-section">
                    <div class="answer-switch-header">
                      <span>显示答案</span>
                      <el-switch v-model="currentSimilarQuestion.showAnswer" />
                    </div>
                    <div class="answer-display-area">
                      <div v-html="renderMarkdown(currentSimilarQuestion.showAnswer ? (currentSimilarQuestion.answer || '暂无答案') : '暂无内容')"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 主观题显示 -->
              <div v-else-if="currentSimilarQuestion.questiontype === '主观题'" class="subjective-answer">
                <el-input
                  v-model="currentSimilarQuestion.subjectiveAnswer"
                  type="textarea"
                  :rows="10"
                  placeholder="请输入答案..."
                  class="large-font-input"
                  style="width: 55%;"
                />
                <el-button type="danger" size="large" @click="currentSimilarQuestion.subjectiveAnswer = ''" style="margin-left: 10px;">清空</el-button>
                <div style="margin-top: 10px;">
                  <el-button type="primary" size="large" @click="toggleSimilarExplain(currentSimilarQuestion)">
                    <span>{{ similarExplainStates[currentSimilarQuestion.id] ? '隐藏答案' : '查看答案' }}</span>
                  </el-button>
                </div>
                <div v-if="similarExplainStates[currentSimilarQuestion.id]" class="explain-section" style="margin-top: 15px; padding: 15px; background-color: #f5f3f0; border-left: 4px solid #8b9a6d;">
                  <div style="color: #606266; line-height: 1.6; font-size: 30px;">{{ currentSimilarQuestion.explain || '暂无解析' }}</div>
                </div>
              </div>

              <!-- 其他题型显示选项 -->
              <div v-else-if="currentSimilarQuestion.items" class="question-options">
                <div v-for="option in getOptions(currentSimilarQuestion.items)" :key="option.key" class="option" style="display: flex; align-items: center; margin-bottom: 8px;">
                  <el-button 
                    type="danger" 
                    @click="toggleSimilarDeleteOption(currentSimilarQuestion, option.key)"
                    :style="{ 
                      marginRight: '20px',
                      flexShrink: 0
                    }"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                  <div style="flex: 1;">
                    <ContentEditor 
                      :content-html="option.key + ' ' + option.content" 
                      :border="false" 
                      :padding="0" 
                      :editable="false" 
                      :font-size="30" 
                      :is-deleted="isSimilarOptionDeleted(currentSimilarQuestion, option.key)"
                    />
                  </div>
                </div>
                
                <div class="option-buttons" style="margin: 15px 0; display: flex; gap: 10px; align-items: center;">
                  <el-button 
                    v-for="option in getOptions(currentSimilarQuestion.items)" 
                    :key="option.key"
                    v-show="!isSimilarOptionDeleted(currentSimilarQuestion, option.key)"
                    :type="getSimilarOptionButtonType(currentSimilarQuestion, option.key)" 
                    size="large" 
                    @click="selectSimilarOption(currentSimilarQuestion, option.key)"
                    style="min-width: 60px; height: 45px; font-size: 18px; font-weight: bold;"
                  >
                    {{ option.key }}
                  </el-button>
                  <div>
                    <el-icon v-if="similarCorrectStatus[currentSimilarQuestion.id] === true" class="correct-icon" style="color: red; font-size: 35px!important"><Check /></el-icon>
                    <el-icon v-if="similarCorrectStatus[currentSimilarQuestion.id] === false" class="wrong-icon" style="color: red; font-size: 35px!important"><Close /></el-icon>
                  </div>
                </div>
                <div style="margin-top: 10px;">
                  <el-button type="danger" size="large" @click="deleteSimilarQuestion(currentSimilarQuestion)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                  <el-button type="primary" size="large" @click="toggleSimilarExplain(currentSimilarQuestion)">
                    <span>{{ similarExplainStates[currentSimilarQuestion.id] ? '隐藏答案' : '查看答案' }}</span>
                  </el-button>
                </div>
                <div v-if="similarExplainStates[currentSimilarQuestion.id]" class="explain-section" style="margin-top: 15px; padding: 15px; background-color: #f5f3f0; border-left: 4px solid #8b9a6d;">
                  <ContentEditor 
                    :content-html="currentSimilarQuestion.explain || '暂无解析'" 
                    :border="false" 
                    :padding="0" 
                    :editable="false" 
                    :font-size="30"
                    style="color: #606266; line-height: 1.6;"
                  />
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
              <el-button type="danger" size="large" @click="delQuestionDb(currentSimilarQuestion)">
                <el-icon><Delete /></el-icon>
                删除此题
              </el-button>
              <el-button 
                type="primary" 
                size="large"
                @click="prevSimilarQuestion" 
                :disabled="currentSimilarQuestionIndex === 0"
              >
                <el-icon><ArrowLeft /></el-icon>
                上一题
              </el-button>
              <el-button 
                type="primary" 
                size="large"
                @click="nextSimilarQuestion" 
                :disabled="currentSimilarQuestionIndex === similarQuestionList.length - 1"
              >
                下一题
                <el-icon><ArrowRight /></el-icon>
              </el-button>
              <span style="font-size: 18px; font-weight: bold;">
                第 {{ currentSimilarQuestionIndex + 1 }} 题 / 共 {{ similarQuestionList.length }} 题
              </span>
            </div>
          </div>
        </div>

        <!-- 没有相似题时的提示 -->
        <div v-else style="text-align: center; padding: 40px; color: #909399;">
          暂无相似题
        </div>
      </div>
    </el-dialog>

    <!-- 更正答案弹窗 -->
    <el-dialog
      v-model="correctAnswerDialogVisible"
      title="更正答案"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="correctAnswerForm" label-width="80px">
        <el-form-item label="答案">
          <el-select v-model="correctAnswerForm.answer" placeholder="请选择答案" style="width: 100%;">
            <el-option v-for="opt in answerOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="解析">
          <el-input v-model="correctAnswerForm.explain" type="textarea" :rows="4" placeholder="请输入解析" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="correctAnswerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCorrectAnswer">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import WangEditor from "wangeditor";
import { ipcApiRoute } from "@/api/main";
import { Check, Close, Star, ArrowRight, ArrowLeft, Search, Fold, Expand, Menu, Document, Loading, View, Delete, FolderOpened,Folder, DocumentCopy, Plus, Edit, CircleClose, Setting, Refresh, Aim } from "@element-plus/icons-vue";
import Effect from "@/components/Effect.vue";
import ContentEditor from "@/components/ContentEditor.vue";
import RichEditor from "@/components/editor.vue";
import EnglishRead from "@/components/EnglishRead.vue";
import axios from 'axios';
import mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';
// 导入文件图标
import docxIcon from '@/assets/png/docx.png'
import htmlIcon from '@/assets/png/html.png'
import txtIcon from '@/assets/png/txt.png'
import xlsIcon from '@/assets/png/xls.png'
import pptIcon from '@/assets/png/ppt.png'
import pdfIcon from '@/assets/png/pdf.png'
import mp4Icon from '@/assets/png/mp4.png'
import jpegIcon from '@/assets/png/jpeg.png'




export default {
  name: "Learn",
  components: { Check, Close, Star, Effect, ContentEditor, RichEditor, EnglishRead, ArrowRight, ArrowLeft, Search, Fold, Expand, Menu, Document, Loading, View, Delete, FolderOpened,Folder, DocumentCopy, Plus, Edit, CircleClose, Setting, Refresh, Aim }, // 添加View和FolderOpened图标组件
  data() {
    return {
      // Markdown 解析器
      md: new MarkdownIt({ html: true, breaks: true, linkify: true }),
      // 更正答案弹窗相关
      correctAnswerDialogVisible: false,
      correctAnswerForm: {
        answer: '',
        explain: ''
      },
      answerOptions: ['A', 'B', 'C', 'D'],
      // PDF抽屉标签页
      pdfActiveTab: 'addQuestion',
      // 编辑器实例
      questionEditor: null,
      explainEditor: null,
      tableData: [],
      searchSubject:"",
      options: [], // 存储选项
      selectedAnswers: [], // 用于记录所有题型的选中答案
      correctAnswer: "", // 存储正确答案
      isCorrectAnswer: false, // 是否选择了正确答案
      excludedOptions: [], // 存储被排除的选项
      treeData: [], // 树形数据
      defaultProps: {
        children: "children",
        label: "title",
      },
      questionType: "", // 新增：存储题目类型
      
      direction: "ltr",
      aiPrompt:
        "根据这些材料，出5道关于考研的关于的比较基础的选择题。\n格式为\n【题目】\n【选项】\n【答案】\n【解析】。\n\n题目与题目之间用===============\n每个选项需要换行\n不是【题目1】这种 而是 每个题目都是【题目】",
      aiResponse: "",
      aiLoading: false,
      examRecords: [], // 存储考试记录
      currentQuestionId: null, // 添加当前题目ID
      questionCount: 5, // 添加默认值
      selectedQuestionPool: [], // 存储随机选择的题目池
      selectedTables: [], // 新增:存储选中的表名
      browserViewCreated: false, // 添加标记
      createdViews: null, // 存储已创建的 BrowserView ID
      selectedAnswer: "", // 单选题的选择

      // 大模型问答相关数据
      aichatMessages: [{ role: 'assistant', content: '你好！有什么问题可以问我。' }],
      aichatInput: '',
      aichatLoading: false,

      // 新增笔记相关数据
      noteEditor: null,
      noteTitle: "",
      currentNoteId: null,
      isNoteEdit: false,
      currentPage: 1,
      pageNum: 10,
      total: 0,
      addQuestionPopoverVisible: false,
      newQuestionContent: "", // 新增题目的内容
      startQuestionNum: 0,
      endQuestionNum: 0,
      maxQuestionNum: 0,
      selectedTable: null,
      selectedSubjectId: null,
      subjectid: null, // 新增科目ID变量
      // 多选科目相关
      multiSelectDialogVisible: false,
      selectedSubjectIds: [], // 多选的科目ID数组
      loading: false, // 添加 loading 状态
      addCount: 1, // 添加题目的重复次数，默认为5
      questionIds: [], // 新增: 存储当前科目的所有题目ID
      wrongQuestionsDialogVisible: false,
      showEffect: false,
      
      effectTimer: null, // 添加定时器变量
      promptList: [],
      notePopoverVisible: false, // 添加控制笔记弹出框显示的变量
      selectedAI: ["aichat"], // 加默认选中的AI模型（改为数组），默认选中大模型问答
      addQuestionSubjectId: null, // 添加题目时选择的科目ID
      aiUrls: {
        metaso: "https://metaso.cn/",
        deepseek: "https://chat.deepseek.com/",
        yuanbao: "https://yuanbao.tencent.com/",
        doubao: "http://www.doubao.com/",
        kimi: "https://kimi.moonshot.cn/",
        claude: "https://claude.ai/",
        chatgpt: "https://chatgpt.com/",
      },
      relatedQuestionVisible: false,
      relatedQuestionEditor: null,
      relatedExplainEditor: null,
      relatedQuestionType: "",
      relatedOptions: [],
      relatedSelectedAnswer: "",
      relatedSelectedAnswers: [],
      currentRelatedQuestionId: null,
      isRelatedQuestion: false, // 添加新的数据属性
      count: 0,
      questions: [], // 新增：存储查询出的题目数组
      pageSize: 20, // 新增：每次加载的题目数量
      currentLoadedQuestionNum: 0, // 新增：当前已加载的题目号
      startPool: false,
      resizeObserver: null, // 添加 ResizeObserver
      viewId: "learn-browser-view", // 添加固定的 viewId
      isManualRefresh: false, // 添加新的数据属性
      nextStartNum: 0, // 添加新的全局变量
      questionRefs: [],
      newRelatedQuestionContent: "", // 新增相似题目的内容
      axios: axios,
      
      printDialogVisible: false,
      activePrintTab: "all",
      printMinQuestionNum: 1,
      printMaxQuestionNum: 10,
      printQuestions: [],
      customPrintContent: "", // 新增自定义打印内容
      selectedQuestionType: "全部", // 新增：题目类型
      isLeftHidden: false, // 添加状态控制左侧是否隐藏
      isLeftCollapsed: true, // 默认折叠左侧面板 
      questionList: [], // 题目列表数据
      tableLoading: false, // 表格加载状态
      selectedQuestions: [], // 存储选中的题目
      searchKeyword: "", // 添加搜索关键词
      searchTimer: null, // 添加防抖定时器
      showAddQuestionForm: false, // 添加题目表单的显示与隐藏
      pdfDrawerVisible: false, // 添加PDF抽屉的显示状态
      subjectDrawerVisible: false, // 添加学科抽屉的显示状态
      settingsDrawerVisible: false, // 添加设置抽屉的显示状态
      examPointDrawerVisible: false, // 考点抽屉的显示状态
      examPointList: [], // 考点列表
      examPointLoading: false, // 考点加载状态
      examPointCurrentPage: 1, // 考点当前页
      examPointPageSize: 20, // 考点每页数量
      examPointTotal: 0, // 考点总数
      newExamPoint: '', // 新增考点内容
      examPointSubjectId: '', // 考点科目ID
      pdfLoading: false, // 添加PDF生成状态
      pdfUrl: "", // 存储PDF URL
      
      // 添加数据库导出相关数据
      dbTables: [], // 数据库表列表
      selectedTables: [], // 选中的表
      exportTargetPath: '', // 导出目标路径
      exportFileName: 'exported_db', // 导出文件名
      exportLoading: false, // 导出加载状态
      
      // 添加文件相关数据
      fileDialogVisible: false,
      fileList: [],
      fileCurrentPage: 1,
      filePageSize: 50,
      fileTotal: 0,
      previewFile: null,
      previewContent: '',
      selectedFileId: null, // 选中的文件ID（用于添加题目时关联文件）
      
      // 添加文件图标映射
      fileIcons: {
        'docx': docxIcon,
        'doc': docxIcon,
        'html': htmlIcon,
        'htm': htmlIcon,
        'txt': txtIcon,
        'xls': xlsIcon,
        'xlsx': xlsIcon,
        'ppt': pptIcon,
        'pptx': pptIcon,
        'pdf': pdfIcon,
        'mp4': mp4Icon,
        'jpg': jpegIcon,
        'jpeg': jpegIcon,
        'png': jpegIcon
      },
      selectionMode: false, // 新增选择模式
      isSelectMode: false, // 添加模式切换状态，默认选择模式
      showImages: false, // 新增显示图片开关，默认显示
      isCollect: false, // 新增查看收藏状态，默认不查看收藏
      showWebView: true, // 控制右侧webview显示状态，默认显示
      questionMode: 'prenextWay', // 题目显示模式：'mutileWay'多道题模式，'prenextWay'左右选择模式
      currentQuestionIndex: 0, // 当前题目索引
      
      // 背景图片数组
      backgroundImages: [],
      
      // 动态图片数组
      dynamicImages: [],
      
      // AI按钮状态映射
      aiButtonStates: {}, // 用于跟踪每个题目的AI按钮状态

      aiButtonSameStates: {}, // 用于跟踪每个题目的AI按钮状态
      
      // 解析显示状态映射
      explainStates: {}, // 用于跟踪每个题目的解析显示状态
      
      // 用户选择答案映射
      userAnswers: {}, // 用于存储每个题目的用户选择答案
      
      // 答题正确状态映射
      correctStatus: {}, // 用于存储每个题目的答题正确状态
      
      // 选项删除状态映射
      deletedOptions: {}, // 用于存储每个题目的选项删除状态
      
      // 添加科目相关数据
      addSubjectDialogVisible: false, // 控制添加科目弹窗显示
      subjectForm: {
        title: '' // 科目名称
      },
      isEditingSubject: false, // 是否正在编辑科目
      currentEditSubjectId: null, // 当前编辑的科目 ID
      
      // 批量复制弹窗相关数据
      batchCopyDialogVisible: false, // 控制批量复制弹窗显示
      batchCopyActiveTab: 'selected', // 当前激活的tab：'selected'、'manual'、'all'
      batchCopyCount: 5, // 复制次数，默认为5
      manualRangeMin: 1, // 手动填写范围的最小值
      manualRangeMax: 1, // 手动填写范围的最大值，初始值设为1避免min>max错误
      settingsDialogVisible: false,
      showLeftPanel: true,
      selectedFileTag: null, // 新增：用于存储选择的文件标签
      fileTagList: [], // 新增：用于存储文件标签列表
      
      // 手写板相关数据
      showHandwritingBoard: false, // 控制手写板显示
      isMouseDown: false, // 是否正在绘制
      canvasContext: null, // canvas上下文
      lastLoc: { x: 0, y: 0 }, // 上一个点的坐标
      lastTime: 0, // 上一次绘制的时间
      lastLineWidth: -1, // 上一次的线条宽度
      currentColor: '#FF0000', // 当前画笔颜色
      penWidth: 3, // 画笔最大粗细
      minPenWidth: 0.5, // 画笔最小粗细
      maxStrokeV: 10, // 最大运笔速度
      minStrokeV: 0.1, // 最小运笔速度
      isEraser: false, // 是否为橡皮擦模式
      penColors: ['#000000', '#FF0000', '#00FF00', '#0000FF'], // 可选颜色
      canvasPages: [], // 存储所有页面的数据
      currentPageIndex: 0, // 当前页面索引
      
      // 编辑提示词相关数据
      editPromptDialogVisible: false, // 控制编辑提示词弹窗显示
      isAddPromptMode: false, // 是否为新增模式
      currentEditPrompt: { // 当前编辑的提示词
        id: null,
        title: '',
        content: '',
        type: 2
      },
      
      // 相似题相关数据
      similarQuestionDialogVisible: false, // 控制相似题弹窗显示
      similarQuestionContent: '', // 相似题输入内容
      similarQuestionList: [], // 相似题列表
      similarQuestionLoading: false, // 相似题加载状态
      currentRelatedQuestionId: null, // 当前题目ID（用于关联相似题）
      currentSimilarQuestionIndex: 0, // 当前相似题索引
      similarExplainStates: {}, // 相似题解析显示状态
      similarCorrectStatus: {}, // 相似题答题正确状态
      similarDeletedOptions: {}, // 相似题选项删除状态
      similarQuestionCounts: {}, // 存储每道题的相似题数量
    };
  },

  computed: {
    // 过滤掉 aichat 的 AI 列表（用于网页容器渲染）
    selectedAIFiltered() {
      if (!this.selectedAI || !Array.isArray(this.selectedAI)) return [];
      return this.selectedAI.filter(ai => ai !== 'aichat');
    },
    // 当前显示的题目（用于左右选择模式）
    currentQuestion() {
      if (this.questionList && this.questionList.length > 0) {
        return this.questionList[this.currentQuestionIndex];
      }
      return null;
    },
    // 当前显示的相似题
    currentSimilarQuestion() {
      if (this.similarQuestionList && this.similarQuestionList.length > 0) {
        return this.similarQuestionList[this.currentSimilarQuestionIndex];
      }
      return null;
    },
    // 过滤后的题目列表（用于mutileWay模式，排除非客观题）
    filteredQuestionList() {
      // 在mutileWay模式下，过滤掉非客观题
      if (this.questionMode === 'mutileWay') {
        return this.questionList.filter(q => q.questiontype !== '非客观题');
      }
      // 在prenextWay模式下，显示所有题目
      return this.questionList;
    },
    // 计算未排除的选项
    activeOptions() {
      return this.options.filter(
        (opt) => !this.excludedOptions.includes(opt.key)
      );
    },
    // 修改这里：直接使用 excludedOptions 数组查找对应的选项
    excludedOptionsList() {
      return this.excludedOptions
        .map((key) => this.options.find((opt) => opt.key === key))
        .filter(Boolean);
    },
    choosedQuestionPool() {
      return this.selectedQuestionPool.map((question) => ({
        ...question,
        tableName: this.getTableNameById(question.subjectid),
      }));
    },
    questionEditorStyle() {
      // 如果题目包含图片，设置更大的高度
      return {
        width: "100%",
        height: "auto",
        // height: this.questionType?.includes("图片") ? "600px" : "300px",
      };
    },
    relatedQuestionEditorStyle() {
      return {
        height: this.relatedQuestionType?.includes("图片") ? "500px" : "200px",
      };
    },
    subjectStr() {
      // 如果没有选中任何科目，返回空字符串
      if (!this.selectedSubjectId) return "";

      // 从树形数据中查找对应的科目
      const findSubject = (nodes) => {
        for (const node of nodes) {
          if (node.id === this.selectedSubjectId) {
            return node.title;
          }
          if (node.children) {
            const found = findSubject(node.children);
            if (found) return found;
          }
        }
        return "";
      };

      return findSubject(this.treeData);
    },
    // 添加过滤后的树形数据计算属性
    filteredTreeData() {
      if (!this.searchSubject) {
        return this.treeData;
      }
      const searchText = this.searchSubject.toLowerCase();
      return this.treeData.filter(item => 
        item.title.toLowerCase().includes(searchText)
      );
    },
    // 判断当前选择的科目是否为英语
    isEnglishSubject() {
      if (!this.selectedSubjectId) return false;
      
      // 从树形数据中查找对应的科目
      const findSubject = (nodes) => {
        for (const node of nodes) {
          if (node.id === this.selectedSubjectId) {
            return node.title;
          }
          if (node.children) {
            const found = findSubject(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const subjectTitle = findSubject(this.treeData);
      return subjectTitle === '英语';
    },
    // 计算右侧区域宽度
    rightSectionWidth() {
      const hasAichat = this.selectedAI.includes('aichat');
      const aiCount = this.selectedAIFiltered.length;
      
      // 如果只有 aichat，宽度为 500px
      if (hasAichat && aiCount === 0) {
        return '500px';
      }
      // 如果有 aichat 和其他 AI，总宽度 = 其他 AI 数量 * 500 + 500（aichat）
      // 如果只有其他 AI，总宽度 = AI 数量 * 500（至少 500）
      const totalWidth = Math.max(aiCount, 1) * 500 + (hasAichat ? 500 : 0);
      return `${totalWidth}px`;
    },

  },

  methods: {
    // 清理消息内容，移除尾部的 FINISHED[DONE] 等标记
    cleanMessageContent(content) {
      if (!content) return '';
      // 移除 FINISHED[DONE]、FINISHED、[DONE] 等标记
      return content.replace(/FINISHED\s*\[DONE\]|FINISHED|\[DONE\]/gi, '').trim();
    },
    // 大模型问答发送消息
    async sendAichatMessage() {
      if (!this.aichatInput.trim() || this.aichatLoading) return;
      
      const userMessage = this.aichatInput.trim();
      this.aichatMessages.push({ role: 'user', content: userMessage });
      this.aichatInput = '';
      this.aichatLoading = true;
      
      // 滚动到底部
      this.$nextTick(() => {
        const container = this.$refs.aichatMessagesRef;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
      
      try {
        const { fetchEventSource } = await import('@microsoft/fetch-event-source');
        const controller = new AbortController();
        const tokenRes = await this.$axios.post('http://localhost:8000/api/token/getCookieByUrl', { url: 'ds' });
        const dsToken = tokenRes?.data?.data?.cookie || '';
        if (!dsToken) throw new Error('未配置 DeepSeek Token');

        // 添加空的助手消息用于流式输出
        this.aichatMessages.push({ role: 'assistant', content: '' });
        const assistantIndex = this.aichatMessages.length - 1;
        
        await fetchEventSource('http://localhost:8000/api/ds/aichat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({ prompt: userMessage, token: dsToken }),
          signal: controller.signal,
          onopen: async (response) => {
            if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
              return;
            }
            throw new Error('连接失败');
          },
          onmessage: (event) => {
            if (event.data) {
              try {
                const data = JSON.parse(event.data);
                if (data.content) {
                  this.aichatMessages[assistantIndex].content += data.content;
                  // 滚动到底部
                  this.$nextTick(() => {
                    const container = this.$refs.aichatMessagesRef;
                    if (container) {
                      container.scrollTop = container.scrollHeight;
                    }
                  });
                }
              } catch (e) {
                // 如果不是 JSON，直接追加文本
                this.aichatMessages[assistantIndex].content += event.data;
              }
            }
          },
          onerror: (error) => {
            console.error('SSE error:', error);
          },
          onclose: () => {
            this.aichatLoading = false;
          }
        });
      } catch (error) {
        console.error('发送消息失败:', error);
        this.aichatMessages.push({ role: 'assistant', content: '抱歉，发送消息失败，请稍后重试。' });
        this.aichatLoading = false;
      }
    },
    // 重置题目状态
    resetQuestionState(question) {
      if (!question) return;
      
      // 重置用户答案
      if (this.userAnswers[question.id]) {
        this.userAnswers[question.id] = [];
      }
      
      // 重置正确状态
      if (this.correctStatus[question.id] !== undefined) {
        delete this.correctStatus[question.id];
      }
      
      // 重置解析显示状态
      if (this.explainStates[question.id]) {
        this.explainStates[question.id] = false;
      }
      
      // 重置选项删除状态
      if (this.deletedOptions[question.id]) {
        this.deletedOptions[question.id] = {};
      }
      
      // 重置用户输入的答案（主观题、非客观题）
      if (question.userAnswer) {
        question.userAnswer = '';
      }
      if (question.subjectiveAnswer) {
        question.subjectiveAnswer = '';
      }
    },
    
    // 上一题
    goToPreviousQuestion() {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--;
        // 重置新题目的状态
        const currentQuestion = this.questionList[this.currentQuestionIndex];
        this.resetQuestionState(currentQuestion);
      }
    },
    // 下一题
    goToNextQuestion() {
      if (this.currentQuestionIndex < this.questionList.length - 1) {
        this.currentQuestionIndex++;
        // 重置新题目的状态
        const currentQuestion = this.questionList[this.currentQuestionIndex];
        this.resetQuestionState(currentQuestion);
      }
    },
    // 根据题目ID获取随机背景图片
    getRandomBackgroundImage(questionId) {
      // 优先使用动态图片数组，如果为空则使用默认背景图片
      const imageArray = this.dynamicImages;
      
      // 使用题目ID作为种子来确保同一题目总是显示相同的"随机"图片
      // 但不同题目会显示不同的图片
      const seed = questionId ? questionId.toString() : '0';
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      const index = Math.abs(hash) % imageArray.length;
      return imageArray[index];
    },
    
    // 获取图片目录
    async getPicDir() {
      try {
        const response = await this.$axios.get('http://localhost:8000/api/getPicDir');
        if (response.data.code === 200) {
          return response.data.data.directory;
        }
        return '';
      } catch (error) {
        console.error('获取图片目录失败:', error);
        return '';
      }
    },
    
    // 获取图片列表
    async getPic(directory, num = 0) {
      try {
        const response = await this.$axios.post('http://localhost:8000/api/getPic', {
          directory: directory,
          num: num
        });
        if (response.data.code === 200) {
          return response.data.data;
        }
        return [];
      } catch (error) {
        console.error('获取图片失败:', error);
        return [];
      }
    },
    
    // 加载动态图片
    async loadDynamicImages() {
      try {
        // 先获取图片目录
        const directory = await this.getPicDir();
        if (directory) {
          // 获取所有图片
          const images = await this.getPic(directory, 0);
          this.dynamicImages = images;
          console.log('加载动态图片成功:', images.length, '张');
        }
      } catch (error) {
        console.error('加载动态图片失败:', error);
      }
    },
    
    // 关闭PDF抽屉
    closePdfDrawer() {
      this.pdfDrawerVisible = false;
    },
    
    async handleNodeClick(data) {
      // 只处理叶子节点
      if (data.children && data.children.length > 0) {
        return;
      }

      this.loading = true;
      this.selectedSubjectId = data.id;
      this.subjectid = data.id; // 使用新的subjectid变量
      this.selectedSubjectIds = []; // 清空多选状态

      try {
        // 只查询 ID 字段以高性能
        const params = {
          conditions: {
            subjectid: this.subjectid
          },
          fields: ["id"], // 只查询 ID 字
          orderBy: {
            column: "id",
            type: "asc",
          },
        };

        const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);
        console.log("所有数据res=", res);
        this.loading = false;

        // 更新题目范围
        this.maxQuestionNum = res.data.result.list.length;
        this.endQuestionNum = this.maxQuestionNum;
        this.startQuestionNum = this.maxQuestionNum === 0 ? 0 : 1;
      } catch (error) {
        console.error("获取题目ID失败:", error);
        this.$message.error("获取题目错误");
      } finally {
        this.loading = false;
      }
    },

    async refreshQuestion() {
      console.log("refreshQuestion");
      if (!this.subjectid || !this.selectedSubjectId) {
        this.$message.warning("请先选择要练习的题目类型");
        return;
      }
      try {
        this.loading = true;
        this.startPool = true;
        this.isManualRefresh = true; // 添加标记
        // 重置数据
        this.questions = [];
        this.count = 0;
        this.currentLoadedQuestionNum = 0;

        // 触发首次加载
        await this.load();
        this.isManualRefresh = false; // 重置标记
      } catch (error) {
        this.loading = false;
        console.error("刷新题目错误:", error);
        this.$message.error("刷新题目错误");
      } finally {
        this.loading = false;
      }
    },

    toggleOption(key) {
      if (this.questionType.includes("多选")) {
        // 多选题逻辑
        if (this.selectedAnswers.includes(key)) {
          // 如果已选中，则取消选中并立即加入排除列表
          this.selectedAnswers = this.selectedAnswers.filter(
            (item) => item !== key
          );
          this.excludedOptions.push(key);
        } else if (this.excludedOptions.includes(key)) {
          // 如果在排除列表中，则移除并选中
          this.excludedOptions = this.excludedOptions.filter(
            (item) => item !== key
          );
          this.selectedAnswers.push(key);
        }
      } else if (this.questionType.includes("单选")) {
        console.log("this.selectedAnswers=", this.selectedAnswers, "key=", key);
        // 单选题逻辑
        if (this.selectedAnswers.includes(key)) {
          // 如果已选中，则取消选中并立即加入排除列表
          this.selectedAnswers = this.selectedAnswers.filter(
            (item) => item !== key
          );
          this.excludedOptions.push(key);
        } else if (this.excludedOptions.includes(key)) {
          // 如果在排除列表中，则移除并选中
          this.excludedOptions = this.excludedOptions.filter(
            (item) => item !== key
          );
          this.selectedAnswers.push(key);
        }
      }
      console.log("移动后的 this.selectedAnswers=", this.selectedAnswers);
      console.log("移动后的 this.excludedOptions=", this.excludedOptions);
    },
    // 获取科目树数据
    async fetchSubjectTree() {
      try {
        const params = {
          conditions: {
            isShow: 1,
            level: 0,
          },
          page: 1,
          pageNum: 100,
          orderBy: {}
        };
        

        const res = await this.$axios.post('http://localhost:8000/api/learn/subject/get', params);
        console.log("获取科目树数据:", res.data);
        const subjects = res.data.result.list;
        this.treeData = subjects.map((item) => ({
          ...item,
          children: [], // 清空子节点
        }));
      } catch (error) {
        console.error("获取科目树数据失败:", error);
        this.$message.error("获取科目树数据失败，请重试" + error.message);
      }
    },
    
    // 显示添加科目弹窗
    showAddSubjectDialog() {
      this.addSubjectDialogVisible = true;
      this.subjectForm.title = '';
      this.isEditingSubject = false;
      this.currentEditSubjectId = null;
    },
    
    // 处理添加科目
    async handleAddSubject() {
      if (!this.subjectForm.title.trim()) {
        this.$message.warning('请输入科目名称');
        return;
      }
      
      try {
        const params = {
          title: this.subjectForm.title,
          level: 0,
          isshow: 1,
        };
        
        const response = await this.$axios.post('http://localhost:8000/api/learn/subject/add', params);
        
        if (response.data.code === 200) {
          this.$message.success('科目添加成功');
          this.subjectForm.title = '';
          // 重新加载科目列表
          await this.fetchSubjectTree();
        } else {
          this.$message.error('添加失败：' + (response.data.message || '未知错误'));
        }
      } catch (error) {
        console.error('添加科目失败:', error);
        this.$message.error('添加科目失败：' + (error.message || '网络错误'));
      }
    },
    
    // 处理表格行点击（编辑）
    handleSubjectRowClick(row) {
      this.subjectForm.title = row.title;
      this.isEditingSubject = true;
      this.currentEditSubjectId = row.id;
    },
    
    // 处理更新科目
    async handleUpdateSubject() {
      if (!this.subjectForm.title.trim()) {
        this.$message.warning('请输入科目名称');
        return;
      }
      
      if (!this.currentEditSubjectId) {
        this.$message.warning('请选择要编辑的科目');
        return;
      }
      
      try {
        const params = {
          id: this.currentEditSubjectId,
          title: this.subjectForm.title,
          level: 0,
          isshow: 1,
        };
        
        const response = await this.$axios.post('http://localhost:8000/api/learn/subject/update', params);
        
        if (response.data.code === 200) {
          this.$message.success('科目更新成功');
          this.subjectForm.title = '';
          this.isEditingSubject = false;
          this.currentEditSubjectId = null;
          // 重新加载科目列表
          await this.fetchSubjectTree();
        } else {
          this.$message.error('更新失败：' + (response.data.message || '未知错误'));
        }
      } catch (error) {
        console.error('更新科目失败:', error);
        this.$message.error('更新科目失败：' + (error.message || '网络错误'));
      }
    },
    
    // 处理删除科目
    async handleDeleteSubject(row) {
      this.$confirm(`确定要删除科目"${row.title}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
      .then(async () => {
        try {
          const response = await this.$axios.post('http://localhost:8000/api/learn/subject/delete', {
            id: row.id
          });
          
          if (response.data.code === 200) {
            this.$message.success('科目删除成功');
            // 重新加载科目列表
            await this.fetchSubjectTree();
          } else {
            this.$message.error('删除失败：' + (response.data.message || '未知错误'));
          }
        } catch (error) {
          console.error('删除科目失败:', error);
          this.$message.error('删除科目失败：' + (error.message || '网络错误'));
        }
      })
      .catch(() => {
        this.$message.info('已取消删除');
      });
    },
    handleCheck(data, checked) {
      const checkedNodes = checked.checkedNodes;
      console.log("checkedNodes=", checkedNodes);

      this.selectedTables = checkedNodes
        .filter((node) => !node.children || node.children.length === 0)
        .map((node) => ({
          table: `txt_${node.table.toLowerCase()}`,
          subjectId: node.id, // 添加 subjectId
        }));

      console.log("选中的表:", this.selectedTables);
    },
    handleCorrectAnswer() {
      this.isCorrectAnswer = true;
      this.$message({
        message: "回答正确！",
        type: "success",
      });
    },
    addExamRecord(record) {
      this.examRecords.unshift(record); // 新记录添加到数组开头
      if (this.examRecords.length > 5) {
        // 保持最多显示5条记录
        this.examRecords.pop();
      }
    },

    displayQuestion(data) {
      this.questionType = data.questiontype;

      if (data.items) {
        const items = data.items.split("\n").filter((item) => item.trim());
        this.options = items.map((item) => {
          const key = item.charAt(0);
          const content = item.slice(1).trim();
          return { key, content };
        });

        this.selectedAnswers = this.options.map((opt) => opt.key);
      }

      const questionType = data.questiontype.replace(/\n/g, "<br>");
      const questionContent = data.question.replace(/\n/g, "<br>");
      this.$refs.questionEditor.html(`第${data.id}题：${questionContent}`);
      // this.$questionEditor.html(`第${data.id}题：${questionContent}`);

      const space = "&nbsp;".repeat(50); // 定义空格变量
      const explainContent =
        `题号：${data.id}${space}答案：${data.answer}${space}${data.explain}`.replace(
          /\n/g,
          "<br>"
        );
      this.explainEditor.txt.html(explainContent);

      this.correctAnswer = data.answer;
      this.isCorrectAnswer = false;
      this.excludedOptions = [];
      this.currentQuestionId = data.id;

      // 重置选择
      this.selectedAnswer = "";
      this.selectedAnswers = [];
    },
    getTableNameById(id) {
      console.log("id=", id);
      console.log("this.selectedTables=", this.selectedTables);
      // 从 selectedTables 中找到对应的表名
      const table = this.selectedTables.find((t) => id == t.subjectId);
      console.log("table=", table);
      return table ? table.table.replace("txt_", "") : "未知";
    },
    // 获取容器的位置和尺寸
    getContainerBounds(index = 0) {
      // 使用过滤后的 AI 列表（排除 aichat）
      const aiList = this.selectedAIFiltered;
      if (aiList.length > 0) {
        const ai = aiList[index];
        const container = this.$refs[`webpageContainer-${ai}`];
        const containerElement = Array.isArray(container) ? container[0] : container;
        
        if (!containerElement) {
          console.error(`找不到容器: webpageContainer-${ai}`);
          return null;
        }

        const rect = containerElement.getBoundingClientRect();
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
      }
      
      // 兼容旧代码
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

      // 更新所有 BrowserView 的位置和大小（跳过 aichat）
      const aiList = this.selectedAIFiltered;
      if (aiList.length > 0) {
        aiList.forEach((ai, index) => {
          const bounds = this.getContainerBounds(index);
          if (bounds) {
            this.$ipc.send("update-browser-view-bounds", {
              viewId: `${this.viewId}-${ai}`,
              bounds: bounds,
            });
          }
        });
      }
    },

    // 处理容器大小变化
    handleResize() {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }

      this.resizeTimeout = setTimeout(() => {
        // 更新所有 BrowserView 的位置和大小（跳过 aichat）
        const aiList = this.selectedAIFiltered;
        if (aiList.length > 0) {
          aiList.forEach((ai, index) => {
            const bounds = this.getContainerBounds(index);
            if (bounds) {
              this.$ipc.send("update-browser-view-bounds", {
                viewId: `${this.viewId}-${ai}`,
                bounds: bounds,
              });
            }
          });
        }
      }, 100);
    },

    // 初始化 BrowserView
    initBrowserView() {
      // 如果有选中的 AI，则加载它们的 URL
      if (this.selectedAI && this.selectedAI.length > 0) {
        // 等待 DOM 渲染完成后再尝试加载
        this.$nextTick(() => {
          this.waitForContainerAndLoad();
        });
      }
    },
    // 等待容器渲染完成后加载 webview
    waitForContainerAndLoad(retryCount = 0) {
      const maxRetries = 10;
      const retryDelay = 100;
      
      // 检查第一个 AI 的容器是否已渲染（使用过滤后的列表）
      const aiList = this.selectedAIFiltered;
      if (aiList.length === 0) {
        // 没有网页类 AI，直接返回
        return;
      }
      const firstAI = aiList[0];
      const container = this.$refs[`webpageContainer-${firstAI}`];
      const containerElement = Array.isArray(container) ? container[0] : container;
      
      if (containerElement) {
        const rect = containerElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // 容器已渲染完成，加载 URL
          this.loadAIUrl();
          return;
        }
      }
      
      // 容器未渲染完成，重试
      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.waitForContainerAndLoad(retryCount + 1);
        }, retryDelay);
      }
    },

    // 新增单选题选择处理方法
    async handleSingleSelect(value) {
      // 清除之前的定时器
      if (this.effectTimer) {
        clearTimeout(this.effectTimer);
        this.showEffect = false;
      }

      if (value === this.correctAnswer) {
        this.$message.success("回答正确！");

        // 保存新的定时器引用
        this.effectTimer = setTimeout(() => {
          this.showEffect = false;
          this.effectTimer = null;
        }, 6000);
      } else {
        this.$message.error("答案错误,请重新选择");
        this.addExamRecord({
          index: this.currentQuestionId,
          questionType: this.questionType,
          userAnswer: value,
          correctAnswer: this.correctAnswer,
          isCorrect: false,
        });
      }
    },

    // 新增笔记相关方法
    getAllNotes() {
      const params = {
        page: this.currentPage,
        pageNum: this.pageNum,
        orderBy: {
          column: "id",
          type: "desc",
        }
      };

      this.$axios.post('http://localhost:8000/api/learn/note/get', params)
        .then((res) => {
          this.tableData = res.data.result.list || [];
          this.total = res.data.result.pagination.total || 0;
        })
        .catch((error) => {
          console.error("获取笔记失败:", error);
          this.$message.error("获取笔记失败");
        });
    },

    handleNoteRowClick(row) {
      this.noteTitle = row.title || `笔记${row.id}`;
      if (this.noteEditor) {
        this.noteEditor.txt.html(row.note || "");
      }
      this.currentNoteId = row.id;
      this.isNoteEdit = true;
    },

    handleNoteSave() {
      // 添加表单验证
      if (!this.noteTitle.trim()) {
        this.$message.warning("请输入标题");
        return;
      }

      if (!this.noteEditor) {
        this.$message.warning("编辑器未初始化，请先展开左侧面板");
        return;
      }

      const editorContent = this.noteEditor.txt.html();
      if (!editorContent.trim()) {
        this.$message.warning("请输入内容");
        return;
      }

      if (this.isNoteEdit) {
        // 更新现有笔记
        const updateData = {
          id: this.currentNoteId,
          title: this.noteTitle,
          note: editorContent
        };

        this.$axios.post('http://localhost:8000/api/learn/note/update', updateData)
          .then((res) => {
            if (res.data) {
              this.$message.success("更新成功");
              this.getAllNotes();
              this.isNoteEdit = false;
              this.currentNoteId = null;
            } else {
              this.$message.error("更新失败");
            }
          })
          .catch((err) => {
            console.error("更新失败:", err);
            this.$message.error("更新失败");
          });
      } else {
        // 新增笔记
        const addData = {
          title: this.noteTitle,
          note: editorContent
        };

        this.$axios.post('http://localhost:8000/api/learn/note/add', addData)
          .then((res) => {
            if (res.data) {
              this.$message.success("保存成功");
              this.getAllNotes();
            } else {
              this.$message.error("保存失败");
            }
          })
          .catch((err) => {
            console.error("保存失败:", err);
            this.$message.error("保存失败");
          });
      }
    },

    deleteQuestion(question) {
      console.log("question=", question);
      this.$axios.post('http://localhost:8000/api/learn/question/delete', {
        id: question.id
      })
        .then(() => {
          // 从当前题目列表中移除该题目
          this.questions = this.questions.filter((q) => q.id !== question.id);

          // 更新题目总数
          this.endQuestionNum -= 1;

          // 如果当前没有题目了，重置起始题号
          if (this.endQuestionNum === 0) {
            this.startQuestionNum = 0;
          }

          // 更新科目表中的题目总数
          if (this.selectedSubjectId) {
            this.$axios.post('http://localhost:8000/api/learn/subject/update', {
              id: this.selectedSubjectId,
              total: this.endQuestionNum
            });
          }

          this.$message.success("删除成功");
        })
        .catch((error) => {
          console.error("删除题目失败:", error);
          this.$message.error("删除题目失败");
        });
    },
    showWrongQuestions() {
      this.wrongQuestionsDialogVisible = true;
    },

    toggleExcludeOption(key, question) {
      // 确保当前题目有 excludedOptions 数组
      if (!question.excludedOptions) {
        question.excludedOptions = [];
      }

      if (question.excludedOptions.includes(key)) {
        // 恢复选项
        question.excludedOptions = question.excludedOptions.filter(
          (k) => k !== key
        );
      } else {
        // 删除选项
        question.excludedOptions.push(key);
        // 如果该选项已被选中，则取消选中
        if (question.questiontype === "多选题") {
          question.selectedAnswers =
            question.selectedAnswers?.filter((k) => k !== key) || [];
        } else if (
          question.questiontype === "单选题" &&
          question.selectedAnswer === key
        ) {
          question.selectedAnswer = "";
        }
      }
    },
    async load() {
      if (!this.startPool) {
        return;
      }
      if (this.currentLoadedQuestionNum >= this.endQuestionNum) {
        return;
      }

      this.$message({
        message: "加载题目中...",
        type: "success",
      });

      try {
        this.nextStartNum =
          this.currentLoadedQuestionNum || this.startQuestionNum;
        const params = {
          conditions: {
            subjectid: this.subjectid
          },
          page: this.nextStartNum,
          pageNum: 10,
          orderBy: {
            column: "id",
            type: "desc",
          },
          conditions: {
            questiontype: this.selectedQuestionType
          }
        };

        console.log("【加载题目】params = ", JSON.stringify(params));

        const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);
        console.log("【加载题目】res = ", JSON.stringify(res));
        if (res.data.result.list && res.data.result.list.length > 0) {
          const questionsWithVisibility = res.data.result.list.map((q, index) => ({
            ...q,
            relatedQuestionVisible: false,
            // 修改页码计算逻辑
            questionPageNum: Math.floor((this.nextStartNum * 10 + index) / 10),
          }));
          this.questions.push(...questionsWithVisibility);
          this.count += res.data.result.list.length;
          this.currentLoadedQuestionNum = this.nextStartNum + 1;
        }
      } catch (error) {
        console.error("加载题目失败:", error);
        this.$message.error("加载题目失败");
      }
    },
    // 添加处理学科选择的方法
    async handleSubjectSelect(data) {
      console.log("【选择学科】data = ", JSON.stringify(data));
      // 只处理叶子节点
      if (data.children && data.children.length > 0) {
        return;
      }

      try {
        this.loading = true;
        this.startPool = false;
        this.selectedSubjectId = data.id;
        this.subjectid = data.id; // 使用新的subjectid变量
        this.selectedSubjectIds = []; // 清空多选状态
        
        // 重置分页数据
        this.currentPage = 1;
        this.pageSize = 50;
        
        // 加载题目列表
        await this.loadQuestionList();
        
        // 如果是选择模式，则调用随机选择页面
        if (this.isSelectMode) {
          this.selectRandomPage();
        }
        
        // 重新加载动态图片
        await this.loadDynamicImages();
      } catch (error) {
        console.error("选择科目失败:", error);
        this.$message.error("选择科目失败");
      } finally {
        this.loading = false;
      }
    },

    // 处理多选科目点击
    handleSubjectSelectMulti(data) {
      // 只处理叶子节点
      if (data.children && data.children.length > 0) {
        return;
      }

      const index = this.selectedSubjectIds.indexOf(data.id);
      if (index > -1) {
        // 已选中，则移除
        this.selectedSubjectIds.splice(index, 1);
      } else {
        // 未选中，则添加
        this.selectedSubjectIds.push(data.id);
      }
    },

    // 显示多选科目弹窗
    showMultiSelectDialog() {
      this.multiSelectDialogVisible = true;
      // 如果当前有选中的科目，将其添加到多选列表中
      if (this.selectedSubjectId) {
        this.selectedSubjectIds = [this.selectedSubjectId];
      }
    },

    // 确认多选科目
    async confirmMultiSelect() {
      if (this.selectedSubjectIds.length === 0) {
        this.$message.warning('请至少选择一个科目');
        return;
      }

      try {
        this.loading = true;
        this.startPool = false;
        
        // 设置多选的科目ID数组
        this.subjectid = this.selectedSubjectIds; // 使用数组格式
        
        // 重置分页数据
        this.currentPage = 1;
        this.pageSize = 50;
        
        // 加载题目列表
        await this.loadQuestionList();
        
        // 关闭弹窗
        this.multiSelectDialogVisible = false;
        
        this.$message.success(`已选择 ${this.selectedSubjectIds.length} 个科目`);
        
      } catch (error) {
        console.error("多选科目失败:", error);
        this.$message.error("多选科目失败");
      } finally {
        this.loading = false;
      }
    },

    // 清空多选
    clearMultiSelect() {
      this.selectedSubjectIds = [];
      this.subjectid = null;
      this.selectedSubjectId = null;
      this.multiSelectDialogVisible = false;
      this.$message.success('已清空科目选择');
    },

    // 加载题目列表
    async loadQuestionList() {
      // 检查是否有选中的科目（单个或数组）

      console.log('学科=======',this.subjectid)
      if (!this.subjectid || (Array.isArray(this.subjectid) && this.subjectid.length === 0)) return;

      try {
        this.tableLoading = true;
        this.currentQuestionIndex = 0; // 重置当前题号为第1题
        
        // 如果选择的是"非客观题"，使用 exam API
        if (this.selectedQuestionType === "非客观题") {
          await this.loadNonObjectiveQuestions();
          return;
        }
        
        const conditions = {
          question: this.searchKeyword, // 添加搜索关键词
          subjectid: this.subjectid // 使用subjectid作为查询条件（支持数组格式）
        };
        
        // 只有当不是"全部"时才添加 questiontype 条件
        if (this.selectedQuestionType !== "全部") {
          conditions.questiontype = this.selectedQuestionType;
        }
        
        // 根据isCollect状态添加收藏条件
        if (this.isCollect) {
          conditions.iscollect = '1'; // 查看收藏的题目
        }else{
          conditions.iscollect = '0'; // 查看收藏的题目
        }

        const params = {
          table: this.selectedTable,
          page: this.currentPage,
          pageNum: this.pageSize,
          orderBy: {
            column: "id",
            type: "desc",
          },
          conditions: conditions,
          isRandom: Array.isArray(this.subjectid) && this.subjectid.length > 1 // 多选科目时启用随机
        };

        // prenextWay模式：每个科目分别请求20道题，各重复5次
        if (this.questionMode === 'prenextWay') {
          const subjectIds = Array.isArray(this.subjectid) ? this.subjectid : [this.subjectid];
          const allQuestions = [];
          
          // 为每个科目分别请求20道题
          for (const subjectId of subjectIds) {
            const subjectParams = {
              ...params,
              page: 1,
              pageNum: 20,
              isRandom: true,
              conditions: {
                ...conditions,
                subjectid: subjectId // 单个科目ID
              }
            };
            
            const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', subjectParams);
            
            if (res.data.result && res.data.result.list) {
              const subjectQuestions = res.data.result.list.map(question => ({
                ...question,
                subjectiveAnswer: question.subjectiveAnswer || '',
                showAnswer: true,
                isEditingAnswer: false,
                editAnswerContent: ''
              }));
              
              // 每个科目的题目重复5次（20 * 5 = 100道）
              let repeatId = allQuestions.length + 1;
              for (let i = 0; i < 5; i++) {
                allQuestions.push(...subjectQuestions.map(item => ({
                  ...item,
                  repeatId: repeatId++
                })));
              }
            }
          }
          
          // 随机排布所有题目
          for (let i = allQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
          }
          
          this.questionList = allQuestions;
          this.total = allQuestions.length;
          this.userAnswers = {};
          this.explainStates = {};
          this.aiButtonStates = {};
          this.aiButtonSameStates = {};
          this.deletedOptions = {};
          this.tableLoading = false;
          return;
        }

        const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);
        
        if (res.data.result) {
          let questionList = (res.data.result.list || []).map(question => ({
            ...question,
            subjectiveAnswer: question.subjectiveAnswer || '', // 初始化主观题答案字段
            showAnswer: true, // 初始化显示答案状态
            isEditingAnswer: false, // 初始化编辑答案状态
            editAnswerContent: '' // 初始化编辑内容
          }));
          
          this.questionList = questionList;
          
          this.total = res.data.result.pagination.total || 0;
          
          this.userAnswers = {};
          this.explainStates = {};
          this.aiButtonStates = {};
          this.aiButtonSameStates = {};
          this.deletedOptions = {};
        }
      } catch (error) {
        this.$message.error("加载题目列表错误");
      } finally {
        this.tableLoading = false;
      }
    },

    // 加载非客观题列表（使用 exam API）
    async loadNonObjectiveQuestions() {
      try {
        this.tableLoading = true;
        
        // 调用 exam API 获取大题列表
        const response = await this.$axios.get('http://localhost:8000/api/exam/question/list', {
          params: {
            page: this.currentPage,
            pageSize: this.pageSize,
            subjectid: Array.isArray(this.subjectid) ? this.subjectid[0] : this.subjectid // 使用学科ID作为subjectid（如果是数组则取第一个）
          }
        });
        
        if (response.data && response.data.code === 200) {
          // 直接设置题目列表，初始化基本字段
          this.questionList = (response.data.data.list || []).map(question => ({
            ...question,
            questiontype: '非客观题',
            subjectiveAnswer: '',
            showAnswer: true,
            isEditingAnswer: false,
            editAnswerContent: '',
            items: [], // 用于存储小题列表
            detailLoaded: false // 标记是否已加载详情
          }));
          
          this.total = response.data.data.total || 0;
          
          if (this.questionList.length === 0) {
            this.$message.info('暂无非客观题');
          }
        }
      } catch (error) {
        console.error("加载非客观题列表失败:", error);
        this.$message.error("加载非客观题列表失败");
      } finally {
        this.tableLoading = false;
      }
    },

    // 加载非客观题详情
    async loadNonObjectiveQuestionDetail(questionId) {
      try {
        const response = await this.$axios.get(`http://localhost:8000/api/exam/question/detail/${questionId}`);
        
        if (response.data && response.data.code === 200) {
          const questionData = response.data.data.question;
          const items = response.data.data.items || [];
          
          // 找到当前题目在列表中的位置
          const questionIndex = this.questionList.findIndex(q => q.id === questionId);
          if (questionIndex !== -1) {
            // 将详情数据合并到当前题目对象中
            const currentQuestion = this.questionList[questionIndex];
            
            // Vue 3 中直接修改数组元素即可，不需要 $set
            this.questionList[questionIndex] = {
              ...currentQuestion,
              items: items, // 保存小题列表
              itemsDisplay: items.map(item => ({
                id: item.id,
                question: item.question,
                answer: item.answer || '',
                subjectiveAnswer: '', // 用户答案
              })),
              detailLoaded: true, // 标记已加载详情
              explain: items.map(item => item.answer || '').join('\n\n'), // 合并所有答案作为解析
            };
          }
        }
      } catch (error) {
        console.error("加载非客观题详情失败:", error);
        this.$message.error("加载非客观题详情失败");
      }
    },

    // 处理每页显示数量变化
    handleSizeChange(val) {
      this.pageSize = val;
      this.loadQuestionList();
    },

    // 处理页码变化
    handleCurrentChange(val) {
      this.currentPage = val;
      this.loadQuestionList();
    },

    // 查看题目详情
    handleViewQuestion(row) {
      console.log("查看:", row);
    },

    // 删除题目
    async handleDeleteQuestion(row) {
      try {

        await this.$axios.post('http://localhost:8000/api/learn/question/delete', {
          id: row.id
        });

        this.$message.success("删除成功");

        this.questionList = this.questionList.filter(item => item.id !== row.id);
        this.total = this.total - 1;
      } catch (error) {
        if (error !== 'cancel') {
          console.error("删除题目错误:", error);
          this.$message.error("删除题目错误");
        }
      }
    },

    async handleHideQuestion(row) {
      this.clearAllCanvas();
      const filterKey = row.repeatId ? 'repeatId' : 'id';
      const filterValue = row.repeatId || row.id;
      this.questionList = this.questionList.filter(item => item[filterKey] !== filterValue);
      this.resetQuestionState(row);
      this.total = this.total - 1;
      this.$message.success("已从列表中移除");
      
      // 获取新显示题目的相似题数量
      if (this.currentQuestion && this.currentQuestion.id) {
        await this.getSimilarQuestionCount(this.currentQuestion.id);
      }
    },

    // 打开更正答案弹窗
    openCorrectAnswerDialog(question) {
      this.correctAnswerForm.answer = question.answer || '';
      this.correctAnswerForm.explain = question.explain || '';
      this.correctAnswerDialogVisible = true;
    },

    // 保存更正答案
    async saveCorrectAnswer() {
      const question = this.currentQuestion;
      if (!question) {
        this.$message.error('未找到当前题目');
        return;
      }

      const updateData = {};
      if (this.correctAnswerForm.answer) {
        updateData.answer = this.correctAnswerForm.answer;
      }
      if (this.correctAnswerForm.explain) {
        updateData.explain = this.correctAnswerForm.explain;
      }

      if (Object.keys(updateData).length === 0) {
        this.$message.warning('请至少填写一项内容');
        return;
      }

      try {
        const response = await this.$axios.post('http://localhost:8000/api/learn/question/update', {
          id: question.id,
          data: updateData
        });

        if (response.data && response.data.code === 200) {
          // 更新本地数据
          if (updateData.answer) {
            question.answer = updateData.answer;
          }
          if (updateData.explain) {
            question.explain = updateData.explain;
          }
          this.$message.success('更正答案保存成功');
          this.correctAnswerDialogVisible = false;
        } else {
          this.$message.error(response.data.message || '保存失败');
        }
      } catch (error) {
        console.error('保存更正答案失败:', error);
        this.$message.error('保存失败');
      }
    },

    copyPrompt(prompt) {
      // 处理富文本格式
      let processedPrompt = prompt;
      
      // 创建临时DOM元素来解析HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedPrompt;
      
      // 替换<br>标签为换行符
      const brElements = tempDiv.querySelectorAll('br');
      for (let i = 0; i < brElements.length; i++) {
        brElements[i].replaceWith(document.createTextNode('\n'));
      }
      
      // 替换<p>和<div>标签为带换行的文本
      const pElements = tempDiv.querySelectorAll('p, div');
      for (let i = 0; i < pElements.length; i++) {
        const content = pElements[i].innerHTML;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = content;
        pElements[i].replaceWith(document.createTextNode(wrapper.textContent + '\n'));
      }
      
      // 获取处理后的文本，保留换行
      processedPrompt = tempDiv.textContent;
      
      // 复制到剪贴板
      navigator.clipboard
        .writeText(processedPrompt)
        .then(() => {
          this.$message.success("提示词已复制到剪贴板");
        })
        .catch(() => {
          this.$message.error("复制失败");
        });
    },
    
    // 获取提示词列表
    getPromptList() {
      this.$axios.post('http://localhost:8000/api/prompt/get', {
        conditions: {
          type: 2 // 获取类型为2的题目提示词
        }
      })
      .then(res => {
        if (res.data && res.data.result && res.data.result.list) {
          // 将返回的数据映射到需要的格式
          this.promptList = res.data.result.list.map(item => ({
            id: item.id,
            title: item.title,
            prompt: item.content,
            type: item.type
          }));
        }
      })
      .catch(error => {
        console.error('获取提示词列表失败:', error);
        this.$message.error('获取提示词列表失败');
      });
    },
    // 添加切换笔记弹出框显示的方法
    toggleNotePopover() {
      this.notePopoverVisible = !this.notePopoverVisible;
      if (this.notePopoverVisible) {
        this.getAllNotes(); // 示弹出框时刷新笔记列表
      }
    },
    async handleRelatedQuestion(question) {
      // 切换当前题目的相似题目显示状态
      question.relatedQuestionVisible = !question.relatedQuestionVisible;

      if (question.relatedQuestionVisible) {
        // 清空编辑器内容
        this.relatedQuestionEditor.txt.html("");
        this.relatedExplainEditor.txt.html("");

        // 重置选项和答案
        this.relatedOptions = [];
        this.relatedSelectedAnswer = "";
        this.relatedSelectedAnswers = [];

        const params = {
          conditions: {
            relatedId: question.id,
            subjectid: this.subjectid
          },
        };

        try {
          this.$message({
            message: "查询相似题目中...",
          });

          const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);
          console.log("res================", res.data.result.list);
          this.relatedQuestions = res.data.result.list;
          if (res.data.result.list.length === 0) {
            this.$message.warning("暂无相似题目");
            question.relatedQuestionVisible = false;
          }
        } catch (error) {
          console.error("获取相似题目失败:", error);
          this.$message.error("获取相似题目失败");
        }
      }
    },

    displayRelatedQuestion(data) {
      this.relatedQuestionType = data.questiontype;
      this.currentRelatedQuestionId = data.id;

      // 显示题目内容
      this.relatedQuestionEditor.txt.html(`第${data.id}题：${data.question}`);

      // 处理选项
      if (data.items) {
        const items = data.items.split("\n").filter((item) => item.trim());
        this.relatedOptions = items.map((item) => ({
          key: item.charAt(0),
          content: item.slice(1).trim(),
        }));
      }

      // 重置选择
      this.relatedSelectedAnswer = "";
      this.relatedSelectedAnswers = [];

      // 显示解析
      this.relatedExplainEditor.txt.html(
        `题号：${data.id}&nbsp;&nbsp;&nbsp;&nbsp;答案：${data.answer}&nbsp;&nbsp;&nbsp;&nbsp;${data.explain}`
      );
    },
    // 添加 getOptions 方法
    getOptions(items) {
      if (!items) return [];
      
      // 先尝试按换行符分割
      let lines = items.split("\n").filter((item) => item.trim());
      
      // 如果只有一行，尝试按空格分割（处理 A.正确 B.错误 格式）
      if (lines.length === 1) {
        // 匹配类似 "A.xxx B.xxx C.xxx D.xxx" 或 "A.xxx B.xxx" 的格式
        // 支持 A. A、A) A）等分隔符
        const optionPattern = /([A-D])[\.\.、)）]?\s*([^A-D]*)/g;
        const matches = [];
        let match;
        while ((match = optionPattern.exec(lines[0])) !== null) {
          matches.push({
            key: match[1],
            content: match[2].trim()
          });
        }
        if (matches.length > 0) {
          return matches;
        }
      }
      
      // 默认按行解析
      return lines.map((item) => ({
        key: item.charAt(0),
        content: item.slice(1).trim(),
      }));
    },
    // 添加单选答案处理方法
    handleSingleAnswer(value, question) {
      // 清除之前的定时器
      if (this.effectTimer) {
        clearTimeout(this.effectTimer);
        this.showEffect = false;
      }

      if (value === question.answer) {
        this.$message.success("回答正确！");

        // 添加到考试记录
        this.addExamRecord({
          index: question.id,
          questionType: question.questiontype,
          userAnswer: value,
          correctAnswer: question.answer,
          isCorrect: true,
        });

        // 延迟加载下一题
        setTimeout(() => {
          this.showEffect = false;
        }, 2000);
      } else {
        this.$message.error("答案错误,请重新选择");
        // 添加错误记录
        this.addExamRecord({
          index: question.id,
          questionType: question.questiontype,
          userAnswer: value,
          correctAnswer: question.answer,
          isCorrect: false,
        });
      }
    },
    loadAIUrl() {
      // 遍历所有选中的 AI，为每个加载对应的 URL（跳过 aichat）
      if (Array.isArray(this.selectedAI) && this.selectedAI.length > 0) {
        // 过滤掉 aichat，只处理网页类 AI
        const aiList = this.selectedAI.filter(ai => ai !== 'aichat');
        this.$nextTick(() => {
          aiList.forEach((ai, index) => {
            const url = this.aiUrls[ai];
            if (url) {
              const bounds = this.getContainerBounds(index);
              if (bounds) {
                const viewId = `${this.viewId}-${ai}`;
                
                // 检查是否已经创建过这个 BrowserView
                if (!this.createdViews) {
                  this.createdViews = new Set();
                }
                
                if (!this.createdViews.has(viewId)) {
                  // 先创建 BrowserView
                  this.$ipc.send("create-browser-view", {
                    viewId: viewId,
                    bounds: bounds,
                  });

                  // 等待创建完成后加载 URL
                  const readyHandler = (event, returnedViewId) => {
                    if (returnedViewId === viewId) {
                      this.$ipc.send("load-url", {
                        url: url,
                        viewId: viewId,
                        bounds: bounds,
                      });
                      this.createdViews.add(viewId);
                      // 使用 removeListener 代替 off
                      if (this.$ipc.removeListener) {
                        this.$ipc.removeListener('browser-view-ready', readyHandler);
                      }
                    }
                  };
                  this.$ipc.on('browser-view-ready', readyHandler);
                } else {
                  // 如果已经创建过，直接加载 URL 和更新位置
                  this.$ipc.send("load-url", {
                    url: url,
                    viewId: viewId,
                    bounds: bounds,
                  });
                }
              }
            }
          });
          this.browserViewCreated = true;
        });
      }
    },
    // 添加新方法处理无限滚动
    handleInfiniteScroll() {
      // 只有在startPool为true且不是手动刷新时才触发加载
      if (this.startPool && !this.isManualRefresh) {
        this.load();
      }
    },
    handleKeyPress(event) {
      const container = document.querySelector(".infinite-list");
      if (!container) return;

      if (event.key === "PageDown") {
        event.preventDefault();
        const currentScrollTop = container.scrollTop;
        const items = this.questionRefs;
        const offset = 22;

        // 找到下一个应该滚动到的题目
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.offsetTop > currentScrollTop + offset) {
            container.scrollTo({
              top: item.offsetTop - offset, // 减去偏移量使题目显示在更下方
              behavior: "smooth",
            });
            break;
          }
        }
      } else if (event.key === "PageUp") {
        event.preventDefault();
        const currentScrollTop = container.scrollTop;
        const items = this.questionRefs;

        // 找到上一个应该滚动到的题目
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          if (item.offsetTop < currentScrollTop - 1) {
            // 添加1px的容差
            container.scrollTo({
              top: item.offsetTop,
              behavior: "smooth",
            });
            break;
          }
        }
      }
    },
    handleCopyQuestion(question) {
      // 设置按钮状态为打钩
      this.aiButtonStates[question.id] = true;
      
      // 构建要复制的文本内容
      let copyText = `【${question.questiontype.replace(/\n/g, ' ')}】${question.question.replace(/\n/g, ' ')}`;

      // 添加选项
      if (question.items) {
        copyText += ` ${question.items.replace(/\n/g, ' ')}`;
      }
      copyText += "\n使用通俗的描述讲解，最好是有比喻，形象。"
      console.log('复制=========')
      this.handleFillForm(copyText)
      
      // 如果选中了 aichat，将内容填入 aichatInput 并发送
      if (this.selectedAI.includes('aichat')) {
        this.aichatInput = copyText;
        this.$nextTick(() => {
          this.sendAichatMessage();
        });
      }
      
      // 2秒后恢复按钮状态
      setTimeout(() => {
        this.aiButtonStates[question.id] = false;
      }, 2000);
    },

    handleCopyQuestionSame(question) {
      // 设置按钮状态为打钩
      this.aiButtonSameStates[question.id] = true;
      
      // 构建要复制的文本内容
      let copyText = `【${question.questiontype.replace(/\n/g, ' ')}】${question.question.replace(/\n/g, ' ')}`;

      // 添加选项
      if (question.items) {
        copyText += ` ${question.items.replace(/\n/g, ' ')}`;
      }

      copyText += `\n\n\n\n\n给5道相似题目，知识点类似，同类题
要求：
1 选项之间需要换行 比如：
A. 选项a
B.选项b
C. 选项a
D. 选项a
如果是有数学公式，需要使用mathtype格式
2 格式为
【题目】ha【/题目】
【选项】ha【/选项】
【答案】ha【/答案】
【解析】ha【/解析】。
3 需要加题号
4 题目与题目之间用===============
5 解析使用通俗的描述，形象的比喻
6 选项之间需要换行,不是【题目1】这种 而是 每个题目都是【题目】
7【特别重要！！！】每一项之间需要用闭合标签。
比如：【题目】ha【/题目】
【选项】ha【/选项】
【答案】ha【/答案】
【解析】ha【/解析】
`;
      this.handleFillForm(copyText)
      
      // 2秒后恢复按钮状态
      setTimeout(() => {
        this.aiButtonSameStates[question.id] = false;
      }, 2000);
    },

    // 非客观题 - 编辑答案
    handleEditNonObjectiveAnswer(question) {
      this.$set(question, 'isEditingAnswer', true);
      this.$set(question, 'editAnswerContent', question.explain || '');
    },

    // 非客观题 - 取消编辑答案
    handleCancelEditNonObjectiveAnswer(question) {
      this.$set(question, 'isEditingAnswer', false);
      this.$set(question, 'editAnswerContent', '');
    },

    // 非客观题 - 保存答案
    async handleSaveNonObjectiveAnswer(question) {
      if (!question.editAnswerContent.trim()) {
        this.$message.warning('请输入答案内容');
        return;
      }

      try {
        // 如果是非客观题，使用 exam API 更新
        if (question.questiontype === '非客观题' && question.examQuestionId) {
          const response = await this.$axios.post('http://localhost:8000/api/exam/item/update', {
            id: question.id,
            answer: question.editAnswerContent
          });
          
          if (response.data && response.data.code === 200) {
            this.$message.success('保存成功');
            question.explain = question.editAnswerContent;
            question.isEditingAnswer = false;
            question.editAnswerContent = '';
          } else {
            this.$message.error(response.data.message || '保存失败');
          }
        } else {
          // 其他题型使用原来的 API
          const response = await this.$axios.post('http://localhost:8000/api/learn/question/update', {
            id: question.id,
            data: {
              explain: question.editAnswerContent
            }
          });
          
          if (response.data && response.data.code === 200) {
            this.$message.success('保存成功');
            question.explain = question.editAnswerContent;
            question.isEditingAnswer = false;
            question.editAnswerContent = '';
          } else {
            this.$message.error(response.data.message || '保存失败');
          }
        }
      } catch (error) {
        this.$message.error('保存失败');
        console.error(error);
      }
    },

    // Markdown 渲染函数
    renderMarkdown(content) {
      if (!content) return '';
      // 简单的markdown渲染，可根据需要增强
      return content.replace(/\n/g, '<br>');
    },
    
    // 复制题目数据
    async handleCopyQuestionData(row) {
      try {
        const copyCount = 5; // 默认复制5次
        
        // 构造题目数据
        const questionData = {
          question: `${row.question}`,
          items: `${row.items || ''}`,
          answer: `${row.answer || ''}`,
          explain: `${row.explain || ''}`,
          questiontype: row.questiontype,
          subjectid: row.subjectid,
          iscollect: '0' // 新复制的题目默认不收藏
        };
        
        // 创建5次复制的Promise数组
        const savePromises = [];
        for (let i = 0; i < copyCount; i++) {
          savePromises.push(
            this.$axios.post('http://localhost:8000/api/learn/question/add', {
              conditions: questionData
            })
          );
        }
        
        // 并行执行所有复制操作
        await Promise.all(savePromises);
        
        this.$message.success(`题目复制成功（已复制 ${copyCount} 次）`);
        // 刷新题目列表
        await this.loadQuestionList();
      } catch (error) {
        console.error('复制题目错误:', error);
        this.$message.error('复制题目错误，请重试');
      }
    },
    
    // 切换解析显示状态
    toggleExplain(question) {
      // 切换当前题目的解析显示状态
      this.explainStates[question.id] = !this.explainStates[question.id];
    },
    
    // 选择选项
    selectOption(question, optionKey) {
      // 检查选项是否被删除
      if (this.isOptionDeleted(question, optionKey)) {
        this.$message.warning('该选项已被删除，无法选择');
        return;
      }
      
      // 初始化用户答案存储
      if (!this.userAnswers[question.id]) {
        this.userAnswers[question.id] = [];
      }
      
      const userAnswer = this.userAnswers[question.id];
      
      // 判断题目类型
      if (question.questiontype && question.questiontype.includes('多选')) {
        // 多选题逻辑
        const index = userAnswer.indexOf(optionKey);
        if (index > -1) {
          // 已选中，取消选中
          userAnswer.splice(index, 1);
        } else {
          // 未选中，添加选中
          userAnswer.push(optionKey);
        }
      } else {
        // 单选题逻辑（默认）
        if (userAnswer.includes(optionKey)) {
          // 已选中，取消选中
          this.userAnswers[question.id] = [];
        } else {
          // 未选中，选中当前选项（单选题只能选一个）
          this.userAnswers[question.id] = [optionKey];
        }
      }
      
      // 自动对比答案
      this.checkAnswer(question);
    },
    
    // 获取选项按钮类型
    getOptionButtonType(question, optionKey) {
      const userAnswer = this.userAnswers[question.id] || [];
      const isSelected = userAnswer.includes(optionKey);
      
      if (isSelected) {
        return 'primary'; // 已选中的按钮为蓝色
      } else {
        return 'default'; // 未选中的按钮为默认样式
      }
    },
    
    // 检查答案
    checkAnswer(question) {
      const userAnswer = this.userAnswers[question.id] || [];
      const correctAnswer = question.answer || '';
      
      if (userAnswer.length === 0) {
        // 没有选择答案，不进行对比
        return;
      }
      
      let isCorrect = false;
      
      if (question.questiontype && question.questiontype.includes('多选')) {
        // 多选题：排序后对比
        const userAnswerStr = userAnswer.sort().join('');
        const correctAnswerStr = correctAnswer.split('').sort().join('');
        isCorrect = userAnswerStr === correctAnswerStr;
      } else {
        // 单选题：直接对比
        isCorrect = userAnswer[0] === correctAnswer;
      }
      
      // 显示结果
      if (isCorrect) {
        this.$message.success('回答正确！');
        // 存储答题正确状态
        this.correctStatus[question.id] = true;
      } else {
        if (!question.questiontype.includes('多选')) {
          this.$axios.post('http://localhost:8000/api/learn/question/update', {
            id: question.id,
            data: {
              iscollect: "1"
            }
          });
          question.iscollect = "1";
          this.$message.success("收藏成功");
        }
        this.$message.error(`答案错误，正确答案是：${correctAnswer}`);
        // 存储答题错误状态
        this.correctStatus[question.id] = false;
      }
    },
    
    // 切换选项删除状态
    toggleDeleteOption(question, optionKey) {
      // 初始化题目的删除状态
      if (!this.deletedOptions[question.id]) {
        this.deletedOptions[question.id] = {};
      }
      
      // 切换当前选项的删除状态
      this.deletedOptions[question.id][optionKey] = !this.deletedOptions[question.id][optionKey];
      
      // 如果选项被删除，从用户答案中移除
      if (this.deletedOptions[question.id][optionKey]) {
        if (this.userAnswers[question.id]) {
          this.userAnswers[question.id] = this.userAnswers[question.id].filter(ans => ans !== optionKey);
        }
      }
    },
    
    // 检查选项是否被删除
    isOptionDeleted(question, optionKey) {
      return this.deletedOptions[question.id] && this.deletedOptions[question.id][optionKey];
    },
    
    // 复制到剪贴板的函数
    copyToClipboard(question) {
      let copyText = `【${question.questiontype}】${question.question}\n`;

      // 添加选项
      if (question.items) {
        copyText += `${question.items}\n`;
      }

      navigator.clipboard
        .writeText(copyText)
        .then(() => {
          this.$message.success("题目已复制到剪贴板");
        })
        .catch(() => {
          this.$message.error("复制错误");
        });
    },
    handleMultiAnswer(value, question) {
      // 清除之前的定时器
      if (this.effectTimer) {
        clearTimeout(this.effectTimer);
        this.showEffect = false;
      }

      // 将选中的答案和正确答案都转换为数组并排序
      const selectedArray = [...value].sort();
      const correctArray = question.answer.split("").sort();

      // 只有当选中的答案数量等于正确答案数量时才进行判断
      if (selectedArray.length === correctArray.length) {
        // 判断是否完全匹配
        const isCorrect = selectedArray.every(
          (value, index) => value === correctArray[index]
        );

        if (isCorrect) {
          this.$message.success("回答正确！");

          // 添加到考试记录
          this.addExamRecord({
            index: question.id,
            questionType: question.questiontype,
            userAnswer: selectedArray.join(""),
            correctAnswer: question.answer,
            isCorrect: true,
          });

          // 延迟隐藏特效
          setTimeout(() => {
            this.showEffect = false;
          }, 2000);
        } else {
          this.$message.error("答案错误，请重新选择");
          // 添加错误记录
          this.addExamRecord({
            index: question.id,
            questionType: question.questiontype,
            userAnswer: selectedArray.join(""),
            correctAnswer: question.answer,
            isCorrect: false,
          });
        }
      }
    },
    async handleSimilarQuestion(question) {
      // 设置当前题目ID
      this.currentQuestionId = question.id;

      question.relatedQuestionVisible = !question.relatedQuestionVisible;

      if (question.relatedQuestionVisible) {
        try {
          this.$message.warning("查询相似题目中...");
          await this.loadRelatedQuestions(question);
        } catch (error) {
          console.error("获取相似题目失败:", error);
          this.$message.error("获取相似题目失败");
          question.relatedQuestionVisible = false;
        }
      }
    },

    async loadRelatedQuestions(question) {
      this.loading = true;
      const params = {
        conditions: {
          relatedId: question.id,
          subjectid: this.subjectid
        },
        page: question.relatedQuestionsPage || 1,
        pageNum: question.relatedQuestionsPageSize || 10,
      };

      try {
        const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);
        if (res.data.result.list && res.data.result.list.length > 0) {
          // 将相似题目存储在当前题目对象中
          question.relatedQuestions = res.data.result.list.map((item) => ({
            ...item,
            options: this.getOptions(item.items),
            userAnswer: item.questiontype === "单选题" ? "" : [],
          }));
          question.relatedQuestionsTotal = res.data.result.pagination.total;
        } else {
          question.relatedQuestions = [];
          question.relatedQuestionsTotal = 0;
          this.$message.warning("暂无相似题目");
        }
      } catch (error) {
        console.error("加载相似题目失败:", error);
        this.$message.error("加载相似题目失败");
      } finally {
        this.loading = false;
      }
    },

    handleRelatedQuestionsSizeChange(val, question) {
      question.relatedQuestionsPageSize = val;
      this.loadRelatedQuestions(question);
    },

    handleRelatedQuestionsCurrentChange(val, question) {
      question.relatedQuestionsPage = val;
      this.loadRelatedQuestions(question);
    },

    // 处理相似题目的多选答案
    handleRelatedMultiAnswer(value, question) {
      // 将选中的答案和正确答案都转换为数组并排序
      const selectedArray = [...value].sort();
      const correctArray = question.answer.split("").sort();

      // 只有当选中的答案数量等于正确答案数量时才进行判断
      if (selectedArray.length === correctArray.length) {
        question.isCorrect = selectedArray.every(
          (val, index) => val === correctArray[index]
        );

        if (question.isCorrect) {
          this.$message.success("回答正确！");
        } else {
          this.$message.error("答案错误，请重新选择");
        }
      }
    },

    // 检查选项是否在答案中
    isOptionInAnswer(option, answer) {
      if (Array.isArray(answer)) {
        return answer.includes(option);
      }
      return answer === option;
    },
    async deleteRelatedQuestion(relatedQuestion) {
      try {
        await this.$axios.post('http://localhost:8000/api/learn/question/delete', {
          id: relatedQuestion.id
        });

        // 找到当前显示相似题目的问题
        const currentQuestion = this.questions.find(
          (q) => q.relatedQuestionVisible
        );
        if (currentQuestion && currentQuestion.relatedQuestions) {
          // 从列表中移除已删除的题目
          currentQuestion.relatedQuestions =
            currentQuestion.relatedQuestions.filter(
              (q) => q.id !== relatedQuestion.id
            );

          this.$message.success("删除成功");

          // 如果没有相似题目了，隐藏相似题目区域
          if (currentQuestion.relatedQuestions.length === 0) {
            currentQuestion.relatedQuestionVisible = false;
          }
        }
      } catch (error) {
        console.error("删除题目失败:", error);
        this.$message.error("删除题目失败");
      }
    },
    async addRelatedQuestions(question, content = null, relatedId = null) {
      const questionContent = content || this.newRelatedQuestionContent;
      const targetRelatedId = relatedId || this.currentQuestionId;

      if (!questionContent.trim()) {
        this.$message.warning("请输入题目内容");
        return;
      }

      // 将内容按分隔符分割成题目数组
      const questions = questionContent
        .split("===============")
        .filter((q) => q.trim());

      // 解析每个题目
      const parsedQuestions = questions
        .map((questionText) => {
          const parsedQuestion = {};

          // 提取题目、选项、答案和解析
          const titleMatch = questionText.match(
            /【题目】([\s\S]*?)(?=【)/
          );
          const optionsMatch = questionText.match(
            /【选项】([\s\S]*?)(?=【)/
          );
          const answerMatch = questionText.match(
            /【答案】([\s\S]*?)(?=【)/
          );
          const explainMatch = questionText.match(/【解析】([\s\S]*?)$/);

          if (titleMatch && optionsMatch && answerMatch && explainMatch) {
            parsedQuestion.question = titleMatch[1].trim();
            parsedQuestion.items = optionsMatch[1].trim();
            parsedQuestion.answer = answerMatch[1].trim();
            parsedQuestion.explain = explainMatch[1].trim();
            
            // 提取题型标记
            const questionTypeMatch = questionText.match(/【题型】([\s\S]*?)(?=【)/);
            
            // 如果有题型标记，使用标记中的题型；否则根据规则判断
            if (questionTypeMatch) {
              parsedQuestion.questiontype = questionTypeMatch[1].trim();
            } else {
              // 判断题目类型
              const answerStr = parsedQuestion.answer;
              if (answerStr.length > 1 && /^[A-Z]+$/.test(answerStr)) {
                parsedQuestion.questiontype = '多选题';
              } else if (!parsedQuestion.items.trim()) {
                parsedQuestion.questiontype = '主观题';
              } else {
                parsedQuestion.questiontype = parsedQuestion.items.split("\n").length > 2 ? "单选题" : "判断题";
              }
            }
            
            parsedQuestion.relatedId = targetRelatedId;
            parsedQuestion.subjectid = this.subjectid || this.selectedSubjectId;
            parsedQuestion.iscollect = '0';
            return parsedQuestion;
          }
          return null;
        })
        .filter((q) => q !== null);

      if (parsedQuestions.length === 0) {
        this.$message.error("未能正确解析题目，请检查格式是否正确");
        return;
      }

      try {
        // 保存所有题目
        const savePromises = parsedQuestions.map((q) => {
          return this.$axios.post('http://localhost:8000/api/learn/question/add', {
            conditions: q
          });
        });

        await Promise.all(savePromises);
        this.$message.success(`成功添加 ${parsedQuestions.length} 道相似题目`);

        // 清空输入内容（仅当使用默认内容时）
        if (!content) {
          this.newRelatedQuestionContent = "";
        }

        // 重新加载相似题目列表
        if (question) {
          await this.loadRelatedQuestions(question);
        }
      } catch (error) {
        console.error("保存题目失败:", error);
        this.$message.error("保存题目失败，请重试")
      }
    },
    async loadQuestions() {
      try {
        this.loading = true;

        // 构建请求参数
        const params = {
          conditions: {
            subjectid: this.subjectid
          },
          page: this.currentLoadedQuestionNum,
          pageNum: 10,
          orderBy: {
            column: "id",
            type: "asc",
          },
        };

        console.log("【加载题目】params = ", JSON.stringify(params));

        const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);

        if (res.data.result.list && res.data.result.list.length > 0) {
          const questionsWithVisibility = res.data.result.list.map((q, index) => ({
            ...q,
            relatedQuestionVisible: false,
            // 修改页码计算逻辑
            questionPageNum: Math.floor((this.nextStartNum * 10 + index) / 10),
          }));
          this.questions.push(...questionsWithVisibility);
          this.count += res.data.result.list.length;
          this.currentLoadedQuestionNum = this.nextStartNum + 1;
        }
      } catch (error) {
        console.error("加载题目失败:", error);
        this.$message.error("加载题目失败");
      } finally {
        this.loading = false;
      }
    },
    storageQuestion(question) {
      console.log("question=", question);
      if (question.iscollect == "1") {
        this.$axios.post('http://localhost:8000/api/learn/question/update', {
          id: question.id,
          data: {
            iscollect: "0"
          }
        });
        question.iscollect = "0";
        this.$message.success("取消收藏成功");
      } else {
        this.$axios.post('http://localhost:8000/api/learn/question/update', {
          id: question.id,
          data: {
            iscollect: "1"
          }
        });
        question.iscollect = "1";
        this.$message.success("收藏成功");
      }
    },
    handleNoteAdd() {
      this.noteTitle = "";
      if (this.noteEditor) {
        this.noteEditor.txt.html("");
      }
      this.currentNoteId = null;
      this.isNoteEdit = false;
    },

    handleNoteDelete(row) {
      this.$prompt("请输入以确认删除", "删除确认", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        inputPattern: /^6$/,
        inputErrorMessage: "请输入以确认删除",
        type: "warning",
      })
        .then(({ value }) => {
          this.$axios.post('http://localhost:8000/api/learn/note/delete', {
            id: row.id
          })
            .then((res) => {
              if (res.data) {
                this.$message.success("删除成功");
                this.getAllNotes();
                // 如果删除的是当前正在编辑的项，清空编辑器
                if (this.currentNoteId === row.id) {
                  this.handleNoteAdd();
                }
              } else {
                this.$message.error("删除失败");
              }
            })
            .catch((err) => {
              console.error("删除失败:", err);
              this.$message.error("删除失败");
            });
        })
        .catch(() => {});
    },

    addQuestion() {
      this.addQuestionPopoverVisible = !this.addQuestionPopoverVisible;
      this.selectedSubjectId = null;
      // 清空题目内容
      this.newQuestionContent = "";
    },

    async submitNewQuestion() {
      if (!this.newQuestionContent.trim()) {
        this.$message.warning("请输入题目内容");
        return;
      }

      if (!this.addQuestionSubjectId) {
        this.$message.warning("请先选择一个科目");
        return;
      }

      // 将内容按分隔符分割成题目数组
      const questions = this.newQuestionContent
        .split("===============")
        .filter((q) => q.trim());

      if (questions.length === 0) {
        this.$message.warning('未找到有效的题目');
        return;
      }

      // 解析每个题目
      const parsedQuestions = questions
        .map((questionText) => {
          const question = {};

          // 提取题目、选项、答案和解析
          const titleMatch = questionText.match(
            /【题目】([\s\S]*?)(?=【)/
          );
          const optionsMatch = questionText.match(
            /【选项】([\s\S]*?)(?=【)/
          );
          const answerMatch = questionText.match(
            /【答案】([\s\S]*?)(?=【)/
          );
          const explainMatch = questionText.match(/【解析】([\s\S]*?)$/);

          if (titleMatch && optionsMatch && answerMatch && explainMatch) {
            question.question = titleMatch[1].trim();
            question.items = optionsMatch[1].trim();
            question.answer = answerMatch[1].trim();
            question.explain = explainMatch[1].trim();
            
            // 提取题型标记
            const questionTypeMatch = questionText.match(/【题型】([\s\S]*?)(?=【)/);
            
            // 如果有题型标记，使用标记中的题型；否则根据规则判断
            if (questionTypeMatch) {
              question.questiontype = questionTypeMatch[1].trim();
            } else {
              const answerStr = question.answer;
              if (answerStr.length > 1 && /^[A-Z]+$/.test(answerStr)) {
                question.questiontype = '多选题';
              } else if (!question.items.trim()) {
                question.questiontype = '主观题';
              } else {
                question.questiontype = question.items.split("\n").length > 2 ? "单选题" : "判断题";
              }
            }
            
            question.iscollect = '0';
            // 如果是相似题目,添加 relatedId
            if (this.isRelatedQuestion && this.currentQuestionId) {
              question.relatedId = this.currentQuestionId;
            }
            console.log("question=", question);
            return question;
          }
          return null;
        })
        .filter((q) => q !== null);

      if (parsedQuestions.length === 0) {
        this.$message.error("未能正确解析题目，请检查格式是否正确");
        return;
      }

      // 根据addCount复制题目
      const duplicatedQuestions = [];
      for (let i = 0; i < this.addCount; i++) {
        duplicatedQuestions.push(...parsedQuestions);
      }

      // 保存所有题目到选中的科目
      const savePromises = duplicatedQuestions.map((question) => {
        const questionData = {
          ...question,
          subjectid: this.addQuestionSubjectId,
          relatedId: this.isRelatedQuestion ? this.currentQuestionId : null,
        };
        
        // 如果选中了文件，添加 fileId
        if (this.selectedFileId) {
          questionData.fileId = this.selectedFileId;
        }
        
        return this.$axios.post('http://localhost:8000/api/learn/question/add', {
          conditions: questionData
        });
      });

      try {
        await Promise.all(savePromises);
        this.$message.success(`成功添加 ${duplicatedQuestions.length} 道题目（${parsedQuestions.length} 道题目 × ${this.addCount} 次）`);
        this.newQuestionContent = "";
        this.addQuestionPopoverVisible = false;
        
        // 刷新题目列表
        await this.loadQuestionList();
      } catch (error) {
        console.error("有题目保存异常，请重试", error);
        this.$message.error("有题目保存异常，请重试");
      }
    },

    // 添加非客观题
    async handleAddNonObjectiveQuestion() {
      if (!this.newQuestionContent.trim()) {
        this.$message.warning("请输入题目内容");
        return;
      }

      if (!this.addQuestionSubjectId) {
        this.$message.warning("请先选择一个科目");
        return;
      }

      try {
        const response = await this.$axios.post('http://localhost:8000/api/exam/question/add', {
          question: this.newQuestionContent,
          subjectid: this.addQuestionSubjectId
        });
        
        if (response.data && response.data.code === 200) {
          this.$message.success('添加成功');
          this.newQuestionContent = "";
          
          if (this.selectedQuestionType === "非客观题") {
            await this.loadQuestionList();
          }
        } else {
          this.$message.error(response.data.message || '添加失败');
        }
      } catch (error) {
        console.error("添加非客观题失败:", error);
        this.$message.error("添加非客观题失败");
      }
    },

    handleSaveQuestion(question) {
      // 获取当前题目的解析内容（直接从question对象获取）

      // 准备更新参数
      const updateData = {
        id: question.id,
        data: {
          explain: question.explainStr
        }
      };
      
      console.log("updateData=", JSON.stringify(updateData));

      // 调用API更新
      this.$axios.post('http://localhost:8000/api/learn/question/update', updateData)
        .then((res) => {
          console.log("res=", res);
          if (res.data) {
            this.$message.success("保存成功");
          } else {
            this.$message.error("保存失败");
          }
        })
        .catch((err) => {
          console.error("保存失败:", err);
          this.$message.error("保存失败");
        });
    },
    handlePrint() {
      let printContent = '';
      
      
      // 使用已经填充好的printQuestions列表
      if (this.printQuestions.length === 0) {
        this.$message.warning("没有题目可打印");
        return;
      }
      
      // 构建打印内容
      printContent = `
        <html>
        <head>
          <title>打印题目</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              padding: 20px;
            }
            .question {
              margin-bottom: 10px;
              page-break-inside: avoid;
            }
            .question-title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 5px;
              color: #333;
            }
            .question-options {
            }
            .option {
              margin-bottom: 5px;
              font-size: 12px;
            }
            .answer {
              font-weight: bold;
              color: #e6a23c;
              font-size: 12px;
            }
            .explanation {
              border-left: 3px solid #eee;
              padding-left: 10px;
              background-color: #ecf5ff;
              font-size: 12px;
            }
            @media print {
              @page { margin: 0.5cm; }
              body { font-size: 10pt; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
      `;
      
      // 添加每道题目
      this.printQuestions.forEach(question => {
        printContent += `
          <div class="question">
            <div class="question-title">【${question.questiontype}】第${question.id}题：${question.question}</div>
        `;
        
        // 添加选项（如果有）
        if (question.items) {
          printContent += `<div class="question-options">`;
          const options = this.getOptions(question.items);
          options.forEach(option => {
            printContent += `<div class="option">${option.key}. ${option.content}</div>`;
          });
          printContent += `</div>`;
        }
        
        // 添加解析（如果有）
        if (question.explain) {
          printContent += `<div class="explanation">解析：${question.explain}</div>`;
        }
        
        printContent += `</div>`;
      });
      
      printContent += `
        </body>
        </html>
      `;
      const printWindow = window.open('', '_blank', 'width=1,height=1,left=-1000,top=-1000');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // 等待页面加载完成后打印
      printWindow.onload = function() {
        printWindow.print();
        printWindow.close(); // 打印完成后自动关闭窗口
      };
      
      this.printDialogVisible = false;
    },

    // 打开打印题目对话框
    printingQuestion() {
      this.printDialogVisible = true;
      // 初始化打印的最小和最大题号
      this.printMinQuestionNum = 1;
      this.printMaxQuestionNum = this.questions.length > 0 ? Math.max(...this.questions.map(q => q.id)) : 10;
      
      // 填充打印问题列表
      if (this.activePrintTab === 'all') {
        this.printQuestions = [...this.questions];
      } else {
        this.updatePrintQuestions();
      }
    },
    updatePrintQuestions() {
      this.printQuestions = this.questions.filter(question => 
        question.id >= this.printMinQuestionNum && question.id <= this.printMaxQuestionNum
      );
    },
    
    handleQuestionTypeChange(value) {
      this.selectedQuestionType = value;
      this.currentPage = 1; // 重置到第一页
      this.loadQuestionList();
    },
    
    // 处理收藏开关变化
    handleCollectChange() {
      // 当收藏状态变化时，重新刷新题目列表
      this.currentPage = 1; // 重置到第一页
      this.loadQuestionList();
    },
    selectRandomPage() {
      if (!this.subjectid) {
        this.$message.warning("请先选择要练习的题目类型");
        return;
      }
      
      // 计算总页数
      const totalPages = Math.ceil(this.total / this.pageSize);
      
      if (totalPages <= 1) {
        this.$message.info("只有一页题目");
        return;
      }
      
      const randomPage = Math.floor(Math.random() * totalPages) + 1;
      
      this.currentPage = randomPage;
      
      this.$message.success(`已选择第 ${randomPage} 页`);
      
      // 重新加载题目列表
      this.loadQuestionList();
    },
   
    // 处理表格选择变化
    handleSelectionChange(selection) {
      this.selectedQuestions = selection;
    },

    // 批量打印选中的题目
    handleBatchPrint() {
      if (this.selectedQuestions.length === 0) {
        this.$message.warning('请先选择要打印的题目');
        return;
      }

      // 将选中的题目添加到打印列表
      this.printQuestions = [...this.selectedQuestions];
      this.printDialogVisible = true;
    },

    // 批量复制选中的题目 - 打开弹窗
    handleBatchCopy() {
      console.log('批量复制按钮被点击了！');
      console.log('当前选中题目数量:', this.selectedQuestions.length);
      console.log('maxQuestionNum:', this.maxQuestionNum);
      
      // 初始化手动填写范围，确保不会出现 min > max 的情况
      const maxNum = Math.max(this.maxQuestionNum || 1, 1); // 确保最小为1
      this.manualRangeMin = 1;
      this.manualRangeMax = Math.min(10, maxNum); // 最大值取10和maxNum的较小值
      
      console.log('设置后的范围:', this.manualRangeMin, '-', this.manualRangeMax);
      
      // 如果没有选中任何题目，默认切换到手动填写选项卡
      if (this.selectedQuestions.length === 0) {
        this.batchCopyActiveTab = 'manual';
      } else {
        this.batchCopyActiveTab = 'selected';
      }
      
      console.log('准备打开弹窗，batchCopyDialogVisible 即将设为 true');
      // 打开弹窗
      this.batchCopyDialogVisible = true;
      console.log('弹窗状态已设置:', this.batchCopyDialogVisible);
    },

    // 确认批量复制
    async handleConfirmBatchCopy() {
      let targetQuestions = [];
      
      try {
        // 根据选择的范围获取要复制的题目
        if (this.batchCopyActiveTab === 'selected') {
          // 检查是否有选中题目
          if (this.selectedQuestions.length === 0) {
            this.$message.warning('请先选择要复制的题目');
            return;
          }
          // 使用已选中的题目
          targetQuestions = [...this.selectedQuestions];
        } else if (this.batchCopyActiveTab === 'manual') {
          // 手动填写范围 - 从当前加载的题目中筛选
          if (this.manualRangeMin > this.manualRangeMax) {
            this.$message.warning('最小值不能大于最大值');
            return;
          }
          
          // 需要获取指定范围的题目
          const params = {
            conditions: {
              subjectid: this.subjectid
            },
            page: Math.floor((this.manualRangeMin - 1) / 10) + 1,
            pageNum: this.manualRangeMax - this.manualRangeMin + 1,
            orderBy: {
              column: "id",
              type: "desc"
            }
          };
          
          const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);
          if (res.data.result.list && res.data.result.list.length > 0) {
            // 只取指定范围内的题目
            const startIndex = (this.manualRangeMin - 1) % 10;
            const endIndex = startIndex + (this.manualRangeMax - this.manualRangeMin);
            targetQuestions = res.data.result.list.slice(startIndex, endIndex + 1);
          }
        } else if (this.batchCopyActiveTab === 'all') {
          // 获取当前科目的所有题目
          const params = {
            conditions: {
              subjectid: this.subjectid
            },
            page: 1,
            pageNum: this.maxQuestionNum,
            orderBy: {
              column: "id",
              type: "desc"
            }
          };
          
          const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);
          if (res.data.result.list && res.data.result.list.length > 0) {
            targetQuestions = res.data.result.list;
          }
        }
        
        if (targetQuestions.length === 0) {
          this.$message.warning('没有找到要复制的题目');
          return;
        }
        
        // 关闭弹窗
        this.batchCopyDialogVisible = false;
        
        // 显示加载状态
        this.$message.info(`正在批量复制 ${targetQuestions.length} 道题目，每道题复制 ${this.batchCopyCount} 次...`);
        
        let successCount = 0;
        let failCount = 0;
        
        // 交替复制题目 (ABABAB模式而不是AAABBB模式)
        for (let i = 0; i < this.batchCopyCount; i++) {
          for (const question of targetQuestions) {
            try {
              // 按照指定格式构造数据
              const addData = {
                conditions: {
                  question: `${question.question}`,
                  items: `${question.items || ''}`,
                  answer: `${question.answer || ''}`,
                  explain: `${question.explain || ''}`,
                  questiontype: question.questiontype,
                  subjectid: question.subjectid,
                  iscollect: '0' // 新复制的题目默认不收藏
                }
              };
              
              // 调用API添加题目
              await this.$axios.post('http://localhost:8000/api/learn/question/add', addData);
              successCount++;
            } catch (error) {
              console.error('复制题目失败:', error);
              failCount++;
            }
          }
        }
        
        // 显示结果
        if (failCount === 0) {
          this.$message.success(`成功复制 ${successCount} 道题目`);
        } else {
          this.$message.warning(`复制完成：成功 ${successCount} 道，失败 ${failCount} 道`);
        }
        
        // 刷新题目列表
        await this.loadQuestionList();
        
      } catch (error) {
        console.error('批量复制题目错误:', error);
        this.$message.error('批量复制题目错误，请重试');
      }
    },

    // 填表功能
    handleFillForm(fillText) {
      if (!this.browserViewCreated || !this.selectedAI || this.selectedAI.length === 0) {
        this.$message.warning('请先在右侧打开网页');
        return;
      }

      // 显示加载状态
      this.$message({
        message: '正在填写内容...',
        type: 'info'
      });

      console.log('填表:', fillText)

      // 向所有选中的 AI 发送填表指令（跳过 aichat）
      this.selectedAIFiltered.forEach((ai) => {
        this.$ipc.send('fill-textarea', {
          viewId: `${this.viewId}-${ai}`,
          url: ai, // 使用 AI 的标识
          text: fillText
        });
      });
    },
    // 添加搜索处理方法
    handleSearch() {
      // 清除之前的定时器
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }
      
      // 设置新的定时器，300ms 后执行搜索
      this.searchTimer = setTimeout(() => {
        this.loadQuestionList();
      }, 300);
    },
    // 修改搜索处理方法
    handleSubjectSearch() {
      // 前端过滤，不需要调用后端
      // 直接使用计算属性 filteredTreeData
    },
    
    // 初始化笔记编辑器
    initNoteEditor() {
      if (this.noteEditor || !this.$refs.noteEditorContainer) {
        return; // 如果已经初始化或容器不存在，直接返回
      }
      this.$nextTick(() => {
        if (this.$refs.noteEditorContainer) {
          this.noteEditor = new WangEditor(this.$refs.noteEditorContainer);
          this.noteEditor.config.uploadImgShowBase64 = true;
          this.noteEditor.config.height = 390;
          this.noteEditor.config.placeholder = "请填写内容";
          this.noteEditor.create();
        }
      });
    },
    
    // 切换左侧面板折叠状态
    toggleLeftPanel() {
      this.isLeftCollapsed = !this.isLeftCollapsed;
      if (!this.isLeftCollapsed) {
        this.subjectDrawerVisible = false; // 展开时关闭抽屉
        // 展开时初始化笔记编辑器
        this.$nextTick(() => {
          this.initNoteEditor();
        });
      }
    },
    // 切换学科抽屉
    toggleSubjectDrawer() {
      if (this.isLeftCollapsed) {
        this.subjectDrawerVisible = !this.subjectDrawerVisible;
      } else {
        this.toggleLeftPanel();
      }
    },
    // 关闭学科抽屉
    closeSubjectDrawer() {
      this.subjectDrawerVisible = false;
    },
    openPdfDrawer() {
      this.pdfDrawerVisible = !this.pdfDrawerVisible;
      if(this.pdfDrawerVisible){
        this.getFileList();
        this.getFileTagList(); // 获取标签列表
      }
    },
    downloadPdf() {
      // 下载PDF的逻辑
      // 这里可以添加下载PDF的代码
      console.log('下载PDF');
    },
    // 打开设置抽屉
    async openSettingsDrawer() {
      this.settingsDrawerVisible = !this.settingsDrawerVisible;
      if (this.settingsDrawerVisible) {
        // 打开时加载数据库表列表
        await this.loadDbTables();
      }
    },
    // 关闭设置抽屉
    closeSettingsDrawer() {
      this.settingsDrawerVisible = false;
    },
    
    // 打开考点抽屉
    openExamPointDrawer() {
      this.examPointDrawerVisible = !this.examPointDrawerVisible;
      if (this.examPointDrawerVisible) {
        this.getExamPointList();
      }
    },
    // 关闭考点抽屉
    closeExamPointDrawer() {
      this.examPointDrawerVisible = false;
    },
    // 考点科目选择变化
    handleExamPointSubjectChange(subjectId) {
      this.examPointCurrentPage = 1;
      this.getExamPointList();
    },
    // 获取考点列表
    async getExamPointList() {
      this.examPointLoading = true;
      try {
        const res = await this.$axios.post('http://localhost:8000/api/examPoint/get', {
          page: this.examPointCurrentPage,
          pageNum: this.examPointPageSize,
          conditions: this.examPointSubjectId ? { subjectId: this.examPointSubjectId } : {},
          orderBy: { id: 'desc' }
        });
        if (res.data.code === 200) {
          this.examPointList = res.data.result.list.map(item => ({
            ...item,
            isEditing: false,
            editPoint: item.point
          }));
          this.examPointTotal = res.data.result.total;
        }
      } catch (error) {
        console.error('获取考点列表失败:', error);
        this.$message.error('获取考点列表失败');
      } finally {
        this.examPointLoading = false;
      }
    },
    // 添加考点
    async handleAddExamPoint() {
      if (!this.examPointSubjectId) {
        this.$message.warning('请先选择一个科目');
        return;
      }
      if (!this.newExamPoint.trim()) {
        this.$message.warning('请输入考点内容');
        return;
      }
      try {
        const res = await this.$axios.post('http://localhost:8000/api/examPoint/add', {
          point: this.newExamPoint.trim(),
          subjectId: this.examPointSubjectId
        });
        if (res.data.code === 200) {
          this.$message.success('添加成功');
          this.newExamPoint = '';
          this.getExamPointList();
        } else {
          this.$message.error(res.data.message || '添加失败');
        }
      } catch (error) {
        console.error('添加考点失败:', error);
        this.$message.error('添加考点失败');
      }
    },
    // 编辑考点
    handleEditExamPoint(row) {
      row.isEditing = true;
      row.editPoint = row.point;
    },
    // 取消编辑考点
    handleCancelEditExamPoint(row) {
      row.isEditing = false;
      row.editPoint = row.point;
    },
    // 保存考点
    async handleSaveExamPoint(row) {
      if (!row.editPoint.trim()) {
        this.$message.warning('考点内容不能为空');
        return;
      }
      try {
        const res = await this.$axios.post('http://localhost:8000/api/examPoint/update', {
          id: row.id,
          point: row.editPoint.trim()
        });
        if (res.data.code === 200) {
          this.$message.success('更新成功');
          row.point = row.editPoint;
          row.isEditing = false;
        } else {
          this.$message.error(res.data.message || '更新失败');
        }
      } catch (error) {
        console.error('更新考点失败:', error);
        this.$message.error('更新考点失败');
      }
    },
    // 删除考点
    async handleDeleteExamPoint(row) {
      try {
        const res = await this.$axios.post('http://localhost:8000/api/examPoint/delete', {
          id: row.id
        });
        if (res.data.code === 200) {
          this.$message.success('删除成功');
          this.getExamPointList();
        } else {
          this.$message.error(res.data.message || '删除失败');
        }
      } catch (error) {
        console.error('删除考点失败:', error);
        this.$message.error('删除考点失败');
      }
    },
    // 点击行复制考点到剪切板
    handleRowClick(row) {
      const text = row.point;
      navigator.clipboard.writeText(text).then(() => {
        this.$message.success('已复制到剪切板');
      }).catch(() => {
        this.$message.error('复制失败');
      });
    },
    // AI生成题目
    handleAIGenerate(row) {
      const prompt = `【提示词】根据这些考点，出20道关于考研的比较基础的选择题。
      格式为
      【题目】ha【/题目】
      【题型】单选题【/题型】
      【选项】ha【/选项】
      【答案】ha【/答案】
      【解析】ha【/解析】。
      
      【特别重要】每一项之间需要用闭合标签。
      比如：
      【题目】ha【/题目】
      【题型】单选题【/题型】
      【选项】ha【/选项】
      【答案】ha【/答案】
      【解析】ha【/解析】
      如果是有数学公式，需要使用mathtype格式需要加题号题目与题目之间用===============
      解析使用通俗的描述，形象的比喻选项之间需要换行,不是【题目1】这种 而是 每个题目都是【题目】题型有：单选题、多选题、主观题、判断题

考点：${row.point}`;
      
      // 向所有选中的 AI 发送填表指令（跳过 aichat）
      this.selectedAIFiltered.forEach((ai) => {
        this.$ipc.send('fill-textarea', {
          viewId: `${this.viewId}-${ai}`,
          url: ai,
          text: prompt
        });
      });
      this.$message.success('已发送提示词');
    },
    // 考点分页变化
    handleExamPointPageChange(page) {
      this.examPointCurrentPage = page;
      this.getExamPointList();
    },
    
    // 加载数据库表列表
    async loadDbTables() {
      try {
        const response = await this.$axios.get('http://localhost:8000/api/setting/checkAllDb');
        if (response.data.code === 200) {
          this.dbTables = response.data.data.tables.map(table => ({ name: table }));
        } else {
          this.$message.error('加载表列表失败');
        }
      } catch (error) {
        console.error('加载表列表失败:', error);
        this.$message.error('加载表列表失败');
      }
    },
    
    // 处理表格选择变化
    handleTableSelectionChange(selection) {
      this.selectedTables = selection.map(item => item.name);
    },
    
    // 选择导出目录
    async selectExportDirectory() {
      try {
        const result = await this.$ipc.invoke(ipcApiRoute.selectDirectory);
        console.log("选择目录结果:", result);
        if (result && !result.canceled && result.filePaths.length > 0) {
          this.exportTargetPath = result.filePaths[0];
        }
      } catch (error) {
        console.error('选择目录失败:', error);
        this.$message.error('选择目录失败');
      }
    },
    
    // 处理导出数据库
    async handleExportDatabase() {
      if (this.selectedTables.length === 0) {
        this.$message.warning('请至少选择一个表');
        return;
      }
      
      if (!this.exportTargetPath) {
        this.$message.warning('请选择导出目录');
        return;
      }
      
      if (!this.exportFileName) {
        this.$message.warning('请输入导出文件名');
        return;
      }
      
      this.exportLoading = true;
      
      try {
        // 构建完整的目标数据库路径
        const targetDb = `${this.exportTargetPath}\\${this.exportFileName}.db`;
        
        const response = await this.$axios.post('http://localhost:8000/api/setting/copyDb', {
          source_db: 'xuerui.db',
          target_db: targetDb,
          tables: this.selectedTables
        });
        
        if (response.data.code === 200) {
          this.$message.success(response.data.message);
          this.closeSettingsDrawer();
          // 重置表单
          this.selectedTables = [];
          this.exportTargetPath = '';
          this.exportFileName = 'exported_db';
        } else {
          this.$message.error(response.data.message || '导出失败');
        }
      } catch (error) {
        console.error('导出数据库失败:', error);
        this.$message.error('导出数据库失败');
      } finally {
        this.exportLoading = false;
      }
    },
    
    // 添加文件相关方法
    
    // 获取文件图标
    getFileIcon(filename) {
      if (!filename) return '';
      const extension = filename.split('.').pop().toLowerCase();
      return this.fileIcons[extension] || '';
    },
    
    // 判断是否为图片文件
    isImageFile(filename) {
      if (!filename) return false;
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      const extension = filename.split('.').pop().toLowerCase();
      return imageExtensions.includes(extension);
    },

    // 判断是否为Word文件
    isWordFile(filename) {
      if (!filename) return false;
      const wordExtensions = ['doc', 'docx'];
      const extension = filename.split('.').pop().toLowerCase();
      return wordExtensions.includes(extension);
    },

    // 判断是否为PDF文件
    isPdfFile(filename) {
      if (!filename) return false;
      const extension = filename.split('.').pop().toLowerCase();
      return extension === 'pdf';
    },
    
    // 获取文件列表
    getFileList() {
      try {
        const conditions = {};
        // 如果选择了标签，添加到筛选条件中
        if (this.selectedFileTag) {
          conditions.tag_id = this.selectedFileTag;
        }
        
        this.$axios.post('http://localhost:8000/api/files/get', {
          page: this.fileCurrentPage,
          pageNum: this.filePageSize,
          conditions: conditions,
          orderBy: {
            column: "id",
            type: "desc",
          },
        }).then(res => {
          console.log('文件列表res======', res);
          // 处理文件路径，提取文件名
          this.fileList = res.data.result.list.map(item => ({
            ...item,
            filename: item.filepath.split('\\').pop() // 从路径中提取文件名
          }));
          // 从pagination中获取总数
          this.fileTotal = res.data.result.pagination.total;
          // 更新当前页码
          this.fileCurrentPage = res.data.result.pagination.current;
          // 更新每页条数
          this.filePageSize = res.data.result.pagination.pageNum;
        });
      } catch (error) {
        console.log('error =====', error);
        this.$message.error('获取文件列表异常' + JSON.stringify(error));
      }
    },
    
    // 获取文件标签列表
    getFileTagList() {
      try {
        this.$axios.post('http://localhost:8000/api/files/tag/get', {
          page: 1,
          pageNum: 100,
          conditions: {},
          orderBy: {
            column: "id",
            type: "desc",
          },
        }).then(res => {
          this.fileTagList = res.data.result.list || [];
        });
      } catch (error) {
        console.error('获取文件标签列表异常:', error);
        this.$message.error('获取文件标签列表异常');
      }
    },
    
    // 处理每页条数变化
    handleFileSizeChange(val) {
      this.filePageSize = val;
      this.fileCurrentPage = 1; // 切换每页条数时重置为第一页
      this.getFileList();
    },

    // 处理页码变化
    handleFileCurrentChange(val) {
      this.fileCurrentPage = val;
      this.getFileList();
    },
    
    // 处理预览
    async handlePreview(row) {
      this.previewFile = row;
      this.fileDialogVisible = false; // 关闭文件选择弹窗
      
      if (this.isWordFile(row.filename)) {
        try {
          // 读取本地文件
          const response = await fetch(row.filepath);
          const arrayBuffer = await response.arrayBuffer();
          
          // 使用mammoth转换Word为HTML
          const result = await mammoth.convertToHtml({ arrayBuffer });
          this.previewContent = result.value;
        } catch (error) {
          console.error('预览Word文件异常:', error);
          this.$message.error('预览Word文件异常');
        }
      }
    },
    
    // 处理外部打开
    handleOpenExternal(row) {
      try {
        // 通过IPC调用主进程打开文件
        window.electronAPI.ipcRenderer.send('open-file', row.filepath);
        this.$message.success('正在打开文件...');
      } catch (error) {
        console.error('打开文件失败:', error);
        this.$message.error('打开文件失败');
      }
    },
    
    // 打开文件所在目录
    handleOpenDirectory(row) {
      try {
        // 通过IPC调用主进程打开文件所在目录
        window.electronAPI.ipcRenderer.send('open-file-location', row.filepath);
        this.$message.success('正在打开文件所在目录...');
      } catch (error) {
        console.error('打开文件所在目录失败:', error);
        this.$message.error('打开文件所在目录失败');
      }
    },
    
    // 文件行选中变化
    handleFileRowChange(row) {
      if (row) {
        this.selectedFileId = row.id;
      }
    },
    
    // 文件checkbox单选处理
    handleFileCheckboxChange(checked, fileId) {
      if (checked) {
        // 选中时，先取消所有，再设置当前选中
        this.selectedFileId = fileId;
      } else {
        // 取消选中
        this.selectedFileId = null;
      }
    },
    
    // 根据文件ID查询题目
    async handleSelectQuestionsByFile(row) {
      try {
        this.tableLoading = true;
        this.currentQuestionIndex = 0;
        
        const conditions = {
          fileId: row.id,
          question: this.searchKeyword
        };
        
        // 只有当不是"全部"时才添加 questiontype 条件
        if (this.selectedQuestionType !== "全部") {
          conditions.questiontype = this.selectedQuestionType;
        }
        
        const params = {
          table: this.selectedTable,
          page: this.currentPage,
          pageNum: 20,
          isRandom: true,
          orderBy: {
            column: "id",
            type: "desc",
          },
          conditions: conditions
        };

        const res = await this.$axios.post('http://localhost:8000/api/learn/question/get', params);
        
        if (res.data.result) {
          let questionList = (res.data.result.list || []).map(question => ({
            ...question,
            subjectiveAnswer: question.subjectiveAnswer || '',
            showAnswer: true,
            isEditingAnswer: false,
            editAnswerContent: ''
          }));
          
          // 将20道题重复5次
          if (this.questionMode === 'prenextWay') {
            const repeatedList = [];
            let repeatId = 1;
            for (let i = 0; i < 5; i++) {
              repeatedList.push(...questionList.map(item => ({
                ...item,
                repeatId: repeatId++
              })));
            }
            // 随机排布
            for (let i = repeatedList.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [repeatedList[i], repeatedList[j]] = [repeatedList[j], repeatedList[i]];
            }
            this.questionList = repeatedList;
          } else {
            this.questionList = questionList;
          }
          
          this.total = res.data.result.pagination.total || 0;
          
          this.userAnswers = {};
          this.explainStates = {};
          this.aiButtonStates = {};
          this.aiButtonSameStates = {};
          this.deletedOptions = {};
          
          this.$message.success(`已加载文件 "${row.filename}" 关联的 ${this.questionList.length} 道题目`);
        }
      } catch (error) {
        console.error('加载文件关联题目失败:', error);
        this.$message.error("加载文件关联题目失败");
      } finally {
        this.tableLoading = false;
      }
    },
    
    // 打开设置弹窗
    openSettingsDialog() {
      this.settingsDialogVisible = true;
    },
    handleFileTagChange(value) {
      this.selectedFileTag = value;
      this.getFileList();
    },
    
    // 手写板相关方法
    // 切换手写板显示
    toggleHandwritingBoard() {
      this.showHandwritingBoard = !this.showHandwritingBoard;
      if (this.showHandwritingBoard) {
        this.canvasPages = [null];
        this.currentPageIndex = 0;

        this.$nextTick(() => {
          this.initCanvas();
        });
      }
    },
    
    // 初始化canvas
    initCanvas() {
      const canvas = this.$refs.handwritingCanvas;
      if (!canvas) return;
      
      // 获取canvas的显示尺寸 - 基于handwriting-container
      const handwritingContainer = document.querySelector('.handwriting-container');
      let displayWidth, displayHeight;
      
      if (handwritingContainer) {
        const rect = handwritingContainer.getBoundingClientRect();
        displayWidth = rect.width; 
        displayHeight = rect.height + 200; 
      } else {
        displayWidth = 800;
        displayHeight = 800;
      }
      
      // 设置canvas尺寸
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
      
      this.canvasContext = canvas.getContext('2d');
      
      // 恢复当前页面的内容
      this.loadCurrentPage();
    },
    
    // 保存当前页面内容
    saveCurrentPage() {
      const canvas = this.$refs.handwritingCanvas;
      if (canvas && this.canvasContext) {
        this.canvasPages[this.currentPageIndex] = canvas.toDataURL('image/png');
      }
    },
    
    // 加载当前页面内容
    loadCurrentPage() {
      const canvas = this.$refs.handwritingCanvas;
      if (!canvas || !this.canvasContext) return;
      
      // 清空画布
      this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
      
      // 如果当前页面有内容，加载它
      if (this.canvasPages[this.currentPageIndex]) {
        const img = new Image();
        img.onload = () => {
          this.canvasContext.drawImage(img, 0, 0);
        };
        img.src = this.canvasPages[this.currentPageIndex];
      }
    },
    
    // 新增一页
    addNewPage() {
      // 保存当前页面
      this.saveCurrentPage();
      
      // 添加新页面
      this.canvasPages.push(null);
      this.currentPageIndex = this.canvasPages.length - 1;
      
      // 清空画布显示新页面
      this.loadCurrentPage();
      
      this.$message.success('已新增一页');
    },
    
    // 上一页
    prevPage() {
      if (this.currentPageIndex > 0) {
        // 保存当前页面
        this.saveCurrentPage();
        
        // 切换到上一页
        this.currentPageIndex--;
        this.loadCurrentPage();
      }
    },
    
    // 下一页
    nextPage() {
      if (this.currentPageIndex < this.canvasPages.length - 1) {
        // 保存当前页面
        this.saveCurrentPage();
        
        // 切换到下一页
        this.currentPageIndex++;
        this.loadCurrentPage();
      }
    },
    
    // 删除当前页
    deletePage() {
      if (this.canvasPages.length <= 1) {
        this.$message.warning('至少需要保留一页');
        return;
      }
      
    
      // 删除当前页
      this.canvasPages.splice(this.currentPageIndex, 1);
      
      // 调整当前页索引
      if (this.currentPageIndex >= this.canvasPages.length) {
        this.currentPageIndex = this.canvasPages.length - 1;
      }
      
      // 加载新的当前页
      this.loadCurrentPage();
      
      this.$message.success('已删除当前页');
    },
    
    // 绘制网格背景
    drawGrid() {
      const canvas = this.$refs.handwritingCanvas;
      const cxt = this.canvasContext;
      
      cxt.save();
      cxt.beginPath();
      cxt.moveTo(2, 2);
      cxt.lineTo(canvas.width - 3, 2);
      cxt.lineTo(canvas.width - 3, canvas.height - 3);
      cxt.lineTo(3, canvas.height - 3);
      cxt.lineTo(3, 3);
      cxt.lineWidth = 6;
      cxt.strokeStyle = 'red';
      cxt.closePath();
      cxt.stroke();
      cxt.restore();
      
      cxt.save();
      cxt.beginPath();
      cxt.moveTo(3, 3);
      cxt.lineTo(canvas.width, canvas.height);
      cxt.moveTo(canvas.width, 3);
      cxt.lineTo(3, canvas.height);
      cxt.moveTo(canvas.width / 2, 3);
      cxt.lineTo(canvas.width / 2, canvas.height);
      cxt.moveTo(3, canvas.height / 2);
      cxt.lineTo(canvas.width, canvas.height / 2);
      cxt.strokeStyle = 'red';
      cxt.lineWidth = 1;
      cxt.stroke();
      cxt.closePath();
      cxt.restore();
    },
    
    // 窗口坐标转换为canvas坐标
    windowToCanvas(x, y) {
      const canvas = this.$refs.handwritingCanvas;
      const box = canvas.getBoundingClientRect();
      return {
        x: x - box.left,
        y: y - box.top
      };
    },
    
    // 计算两点之间的距离
    calcDistance(loc1, loc2) {
      return Math.sqrt((loc1.x - loc2.x) * (loc1.x - loc2.x) + (loc1.y - loc2.y) * (loc1.y - loc2.y));
    },
    
    // 根据速度和距离计算线条宽度
    calcLineWidth(t, s) {
      const v = s / t;
      let resultLineWidth = 0;
      
      if (v <= this.minStrokeV) {
        resultLineWidth = this.penWidth;
      } else if (v >= this.maxStrokeV) {
        resultLineWidth = this.minPenWidth;
      } else {
        resultLineWidth = this.penWidth - ((v - this.minStrokeV) / (this.maxStrokeV - this.minStrokeV)) * (this.penWidth - this.minPenWidth);
      }
      
      if (this.lastLineWidth === -1) {
        return resultLineWidth;
      }
      return this.lastLineWidth * 2 / 3 + resultLineWidth * 1 / 3;
    },
    
    // 开始绘制
    beginStroke(point) {
      this.isMouseDown = true;
      this.lastLoc = this.windowToCanvas(point.x, point.y);
      this.lastTime = new Date().getTime();
    },
    
    // 结束绘制
    endStroke() {
      this.isMouseDown = false;
    },
    
    // 移动绘制
    moveStroke(point) {
      const curLoc = this.windowToCanvas(point.x, point.y);
      const curTime = new Date().getTime();
      const s = this.calcDistance(curLoc, this.lastLoc);
      const t = curTime - this.lastTime;
      const lineWidth = this.calcLineWidth(t, s);
      
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(this.lastLoc.x, this.lastLoc.y);
      this.canvasContext.lineTo(curLoc.x, curLoc.y);
      this.canvasContext.strokeStyle = this.isEraser ? '#ffffff' : this.currentColor;
      this.canvasContext.lineWidth = this.isEraser ? this.penWidth * 2 : lineWidth;
      this.canvasContext.lineCap = 'round';
      this.canvasContext.lineJoin = 'round';
      this.canvasContext.stroke();
      this.canvasContext.closePath();
      
      this.lastLoc = curLoc;
      this.lastTime = curTime;
      this.lastLineWidth = lineWidth;
    },
    
    // 开始绘制（事件处理）
    startDrawing(e) {
      e.preventDefault();
      if (e.type === 'touchstart') {
        const touch = e.touches[0];
        this.beginStroke({ x: touch.pageX, y: touch.pageY });
      } else {
        this.beginStroke({ x: e.clientX, y: e.clientY });
      }
    },
    
    // 绘制（事件处理）
    draw(e) {
      e.preventDefault();
      if (this.isMouseDown) {
        if (e.type === 'touchmove') {
          const touch = e.touches[0];
          this.moveStroke({ x: touch.pageX, y: touch.pageY });
        } else {
          this.moveStroke({ x: e.clientX, y: e.clientY });
        }
      }
    },
    
    // 停止绘制（事件处理）
    stopDrawing(e) {
      e.preventDefault();
      this.endStroke();
    },
    
    // 清空画布
    clearCanvas() {
      const canvas = this.$refs.handwritingCanvas;
      if (canvas && this.canvasContext) {
        this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        // 清空当前页面的保存数据
        this.canvasPages[this.currentPageIndex] = null;
      }
    },
    
    // 清空所有页面
    clearAllCanvas() {
     
      const canvas = this.$refs.handwritingCanvas;
      if (canvas && this.canvasContext) {
        // 清空当前画布显示
        this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        // 清空所有页面的保存数据
        this.canvasPages = this.canvasPages.map(() => null);
      }
      this.$message.success('已清空所有页面');
      
    },
    
    // 改变颜色
    changeColor(color) {
      this.currentColor = color;
      this.isEraser = false; // 切换颜色时退出橡皮擦模式
    },
    
    // 切换橡皮擦
    toggleEraser() {
      this.isEraser = !this.isEraser;
    },
    
    // 保存手写内容
    saveHandwriting() {
      const canvas = this.$refs.handwritingCanvas;
      if (!canvas) return;
      
      // 保存当前页面
      this.saveCurrentPage();
      
      // 保存所有页面
      this.canvasPages.forEach((pageData, index) => {
        if (pageData) {
          const link = document.createElement('a');
          link.download = `handwriting_page${index + 1}_${new Date().getTime()}.png`;
          link.href = pageData;
          link.click();
        }
      });
      
      this.$message.success(`已保存 ${this.canvasPages.filter(p => p).length} 页手写笔记`);
    },
    
    // 关闭手写板
    closeHandwritingBoard() {
      // 保存当前页面
      this.saveCurrentPage();
      this.showHandwritingBoard = false;
    },
    
    // 打开新增提示词弹窗
    openAddPromptDialog() {
      this.isAddPromptMode = true;
      this.currentEditPrompt = {
        id: null,
        title: '',
        content: '',
        type: 2
      };
      this.editPromptDialogVisible = true;
    },
    
    // 打开编辑提示词弹窗
    openEditPromptDialog(row) {
      this.isAddPromptMode = false;
      this.currentEditPrompt = {
        id: row.id,
        title: row.title,
        content: row.prompt,
        type: row.type || 2
      };
      this.editPromptDialogVisible = true;
    },
    
    // 保存编辑的提示词
    async saveEditedPrompt() {
      if (!this.currentEditPrompt) {
        this.$message.error('没有当前编辑的提示词');
        return;
      }
      
      try {
        // 获取RichEditor中的内容
        const contentEditor = this.$refs.promptContentEditor;
        let content = this.currentEditPrompt.content;
        
        if (contentEditor && contentEditor.getContent) {
          content = contentEditor.getContent();
        }
        
        // 准备提交的数据
        const noteData = {
          title: this.currentEditPrompt.title || '提示词',
          content: content,
          type: this.currentEditPrompt.type || 2,
        };
        
        // 根据模式选择API
        let apiUrl;
        if (this.isAddPromptMode) {
          apiUrl = 'http://localhost:8000/api/prompt/add';
        } else {
          noteData.id = this.currentEditPrompt.id;
          apiUrl = 'http://localhost:8000/api/prompt/update';
        }
        
        console.log('提交的数据:', noteData);
        
        // 调用API
        const res = await this.$axios.post(apiUrl, noteData);
        
        if (res.data && res.data.code === 200) {
          this.$message.success(this.isAddPromptMode ? '新增成功' : '保存成功');
          
          // 关闭弹窗
          this.editPromptDialogVisible = false;
          
          // 刷新提示词列表
          this.getPromptList();
        } else {
          this.$message.error(res.data?.message || (this.isAddPromptMode ? '新增失败' : '保存失败'));
        }
      } catch (error) {
        console.error('保存提示词失败:', error);
        this.$message.error('保存提示词失败，请检查网络连接');
      }
    },

    // 删除提示词
    handleDeletePrompt(row) {
      this.$confirm('确定要删除该提示词吗？', '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const res = await this.$axios.post('http://localhost:8000/api/prompt/delete', {
            id: row.id
          });
          if (res.data && res.data.code === 200) {
            this.$message.success('删除成功');
            this.getPromptList();
          } else {
            this.$message.error(res.data?.message || '删除失败');
          }
        } catch (error) {
          console.error('删除提示词失败:', error);
          this.$message.error('删除失败，请检查网络连接');
        }
      }).catch(() => {
        // 用户取消删除
      });
    },

    // 打开相似题弹窗
    async openSimilarQuestionDialog(row) {
      this.currentRelatedQuestionId = row.id;
      this.similarQuestionDialogVisible = true;
      this.similarQuestionContent = '';
      this.currentSimilarQuestionIndex = 0; // 重置索引
      
      // 加载相似题列表
      await this.loadSimilarQuestions(row.id);
    },

    // 重置相似题状态
    resetSimilarQuestionState(questionId) {
      // 重置解析显示状态
      if (this.similarExplainStates[questionId]) {
        delete this.similarExplainStates[questionId];
      }
      // 重置答题正确状态
      if (this.similarCorrectStatus[questionId]) {
        delete this.similarCorrectStatus[questionId];
      }
      // 重置选项删除状态
      if (this.similarDeletedOptions[questionId]) {
        delete this.similarDeletedOptions[questionId];
      }
      // 重置用户答案
      const question = this.similarQuestionList.find(q => q.id === questionId);
      if (question) {
        question.userAnswer = '';
        question.subjectiveAnswer = '';
        question.showAnswer = false;
      }
    },

    // 上一题（相似题）
    prevSimilarQuestion() {
      if (this.currentSimilarQuestionIndex > 0) {
        // 重置当前题目状态
        const currentQuestion = this.similarQuestionList[this.currentSimilarQuestionIndex];
        if (currentQuestion) {
          this.resetSimilarQuestionState(currentQuestion.id);
          this.similarCorrectStatus[currentQuestion.id] = "";
          this.similarExplainStates[currentQuestion.id] = "";
        }
        this.currentSimilarQuestionIndex--;
      }
      
    },

    // 下一题（相似题）
    nextSimilarQuestion() {
      if (this.currentSimilarQuestionIndex < this.similarQuestionList.length - 1) {
        // 重置当前题目状态
        const currentQuestion = this.similarQuestionList[this.currentSimilarQuestionIndex];
        if (currentQuestion) {
          this.resetSimilarQuestionState(currentQuestion.id);
          this.similarCorrectStatus[currentQuestion.id] = "";
          this.similarExplainStates[currentQuestion.id] = "";
        }
        this.currentSimilarQuestionIndex++;
      }
    },

    // 切换相似题解析显示
    toggleSimilarExplain(question) {
      this.similarExplainStates = {
        ...this.similarExplainStates,
        [question.id]: !this.similarExplainStates[question.id]
      };
    },

    // 选择相似题选项
    selectSimilarOption(question, optionKey) {
      // 检查选项是否被删除
      if (this.isSimilarOptionDeleted(question, optionKey)) {
        this.$message.warning('该选项已被删除，无法选择');
        return;
      }

      if (!question.userAnswer) {
        question.userAnswer = '';
      }
      
      if (question.questiontype === '多选题') {
        // 多选题逻辑
        if (question.userAnswer.includes(optionKey)) {
          question.userAnswer = question.userAnswer.replace(optionKey, '');
        } else {
          question.userAnswer += optionKey;
        }
        // 按字母顺序排序
        question.userAnswer = question.userAnswer.split('').sort().join('');
      } else {
        // 单选题逻辑
        question.userAnswer = optionKey;
      }
      
      // 检查答案
      this.checkSimilarAnswer(question);
    },

    // 检查相似题答案
    checkSimilarAnswer(question) {
      if (question.userAnswer && question.answer) {
        const isCorrect = question.userAnswer.toUpperCase() === question.answer.toUpperCase();
        this.similarCorrectStatus[question.id] = isCorrect;
        if (isCorrect) {
          this.$message.success("回答正确！");
        } else {
          this.$message.error("答案错误，请重新选择");
        }
      } else {
        this.similarCorrectStatus[question.id] = null;
      }
    },

    // 获取相似题选项按钮类型
    getSimilarOptionButtonType(question, optionKey) {
      if (!question.userAnswer) {
        return 'default';
      }
      
      if (question.userAnswer.includes(optionKey)) {
        return 'primary';
      }
      
      return 'default';
    },

    // 切换相似题选项删除状态
    toggleSimilarDeleteOption(question, optionKey) {
      // 初始化题目的删除状态
      if (!this.similarDeletedOptions[question.id]) {
        this.similarDeletedOptions[question.id] = {};
      }
      
      // 切换当前选项的删除状态
      this.similarDeletedOptions[question.id][optionKey] = !this.similarDeletedOptions[question.id][optionKey];
      
      // 如果选项被删除，从用户答案中移除
      if (this.similarDeletedOptions[question.id][optionKey]) {
        if (question.userAnswer) {
          question.userAnswer = question.userAnswer.replace(optionKey, '');
          // 重新检查答案
          this.checkSimilarAnswer(question);
        }
      }
    },

    // 检查相似题选项是否被删除
    isSimilarOptionDeleted(question, optionKey) {
      return this.similarDeletedOptions[question.id] && this.similarDeletedOptions[question.id][optionKey];
    },

    // 随机打乱数组
    shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    },

    // 获取相似题数量（不打开弹窗）
    async getSimilarQuestionCount(questionId) {
      try {
        const response = await this.$axios.post('http://localhost:8000/api/learn/question/get', {
          conditions: {
            relatedId: questionId
          }
        });
        
        if (response.data && response.data.code === 200) {
          const count = (response.data.result.list || []).length;
          this.similarQuestionCounts[questionId] = count;
          return count;
        }
        return 0;
      } catch (error) {
        console.error('获取相似题数量失败:', error);
        return 0;
      }
    },

    // 加载相似题列表
    async loadSimilarQuestions(questionId) {
      try {
        this.similarQuestionLoading = true;
        this.similarExplainStates = {}
        const response = await this.$axios.post('http://localhost:8000/api/learn/question/get', {
          conditions: {
            relatedId: questionId
          }
        });
        
        if (response.data && response.data.code === 200) {
          this.similarQuestionList = this.shuffleArray(response.data.result.list || []);
          this.similarQuestionList.forEach(question => {
            question.userAnswer = '';
          });
          // 同时更新相似题数量
          this.similarQuestionCounts[questionId] = this.similarQuestionList.length;
        } else {
          this.$message.error('加载相似题异常');
        }
      } catch (error) {
        this.$message.error('加载相似题异常，请检查网络连接');
      } finally {
        this.similarQuestionLoading = false;
      }
    },

    // 刷新相似题顺序
    refreshSimilarQuestions() {
      this.loadSimilarQuestions(this.currentRelatedQuestionId)
      this.similarCorrectStatus = {}; // 清除打钩状态
      this.similarDeletedOptions = {}; // 清除删除线状态
    },

    // 保存相似题
    async saveRelateQuestions() {
      if (!this.similarQuestionContent.trim()) {
        this.$message.warning('请输入题目内容');
        return;
      }

      try {
        // 解析题目内容
        const questions = this.similarQuestionContent.split('===============').filter(q => q.trim());
        
        if (questions.length === 0) {
          this.$message.warning('未找到有效的题目');
          return;
        }

        const parsedQuestions = questions.map((questionText) => {
          const question = {};

          // 提取题目、选项、答案和解析 - 支持两种标签格式
          let titleMatch = questionText.match(/【题目】([\s\S]*?)【\/题目】/);
          if (!titleMatch) {
            titleMatch = questionText.match(/【题目】([\s\S]*?)【 \/题目】/);
          }
          if (!titleMatch) {
            titleMatch = questionText.match(/【题目】([\s\S]*?)【\/ 题目】/);
          }
          if (!titleMatch) {
            titleMatch = questionText.match(/【题目】([\s\S]*?)【/);
          }

          let optionsMatch = questionText.match(/【选项】([\s\S]*?)【\/选项】/);
          if (!optionsMatch) {
            optionsMatch = questionText.match(/【选项】([\s\S]*?)【 \/选项】/);
          }
          if (!optionsMatch) {
            optionsMatch = questionText.match(/【选项】([\s\S]*?)【\/ 选项】/);
          }
          if (!optionsMatch) {
            optionsMatch = questionText.match(/【选项】([\s\S]*?)【/);
          }

          let answerMatch = questionText.match(/【答案】([\s\S]*?)【\/答案】/);
          if (!answerMatch) {
            answerMatch = questionText.match(/【答案】([\s\S]*?)【 \/答案】/);
          }
          if (!answerMatch) {
            answerMatch = questionText.match(/【答案】([\s\S]*?)【\/ 答案】/);
          }
          if (!answerMatch) {
            answerMatch = questionText.match(/【答案】([\s\S]*?)【/);
          }
          
          let explainMatch = questionText.match(/【解析】([\s\S]*?)【\/解析】/);
          if (!explainMatch) {
            explainMatch = questionText.match(/【解析】([\s\S]*?)【 \/解析】/);
          }
          if (!explainMatch) {
            explainMatch = questionText.match(/【解析】([\s\S]*?)【\/ 解析】/);
          }
          if (!explainMatch) {
            explainMatch = questionText.match(/【解析】([\s\S]*?)(?:={3,}|$)/);
          }

          question.question = titleMatch && titleMatch.length > 1 ? titleMatch[1].trim() : "题目";
          question.items = optionsMatch && optionsMatch.length > 1 ? optionsMatch[1].trim() : "选项";
          question.answer = answerMatch && answerMatch.length > 1 ? answerMatch[1].trim() : "答案";
          question.explain = explainMatch && explainMatch.length > 1 ? explainMatch[1].trim() : "解析";
          
          // 提取题型标记
          let questionTypeMatch = questionText.match(/【题型】([\s\S]*?)【\/题型】/);
          if (!questionTypeMatch) {
            questionTypeMatch = questionText.match(/【题型】([\s\S]*?)【 \/题型】/);
          }
          if (!questionTypeMatch) {
            questionTypeMatch = questionText.match(/【题型】([\s\S]*?)【\/ 题型】/);
          }
          if (!questionTypeMatch) {
            questionTypeMatch = questionText.match(/【题型】([\s\S]*?)【/);
          }
          
          // 如果有题型标记，使用标记中的题型；否则根据 answer 的长度自动设置
          if (questionTypeMatch && questionTypeMatch.length > 1) {
            question.questiontype = questionTypeMatch[1].trim();
          } else {
            const answerLength = question.answer ? question.answer.trim().length : 0;
            if (answerLength === 0) {
              question.questiontype = '主观题';
            } else if (answerLength === 1) {
              question.questiontype = '单选题';
            } else {
              question.questiontype = '多选题';
            }
          }
          
          question.subjectid = this.subjectid || this.selectedSubjectId;
          question.relatedId = this.currentRelatedQuestionId;
          question.iscollect = '0';
          
          return question;
        }).filter(q => q !== null);
        
        // 保存所有题目
        const savePromises = parsedQuestions.map((question) => {
          return this.$axios.post('http://localhost:8000/api/learn/question/add', {
            conditions: question
          });
        });
        
        await Promise.all(savePromises);
        
        this.$message.success(`成功添加 ${parsedQuestions.length} 道相似题`);
        this.similarQuestionContent = '';
        
        // 刷新相似题列表
        await this.loadSimilarQuestions(this.currentRelatedQuestionId);
      } catch (error) {
        console.error('保存相似题失败:', error);
        this.$message.error('保存相似题失败，请重试');
      }
    },

    // 删除相似题（仅从列表中移除，不调用接口）
    deleteSimilarQuestion(row) {
      const index = this.similarQuestionList.findIndex(q => q.id === row.id);
      if (index !== -1) {
        this.similarQuestionList.splice(index, 1);
        this.$message.success('已从列表中移除');
      }
    },

    // 删除题目（调用API从数据库删除）
    async delQuestionDb(row) {
      await this.$axios.post('http://localhost:8000/api/learn/question/delete', {
        id: row.id
      });
      const index = this.similarQuestionList.findIndex(q => q.id === row.id);
      if (index !== -1) {
        this.similarQuestionList.splice(index, 1);
      }
      this.$message.success('题目已删除');
    },
  },

  mounted() {
    // 初始化题目编辑器
    // this.questionEditor = new WangEditor(this.$refs.questionEditorContainer);
    // this.questionEditor.config.height = null;
    // this.questionEditor.config.uploadImgShowBase64 = true;
    // this.questionEditor.config.toolbarKeys = [];
    // this.questionEditor.config.placeholder = "请填写内容";
    // this.questionEditor.create();

    this.fetchSubjectTree();
    
    // 加载动态图片
    this.loadDynamicImages();

    // 初始化BrowserView
    this.initBrowserView();

    // 监听窗口大小变化
    window.addEventListener("resize", this.updateBrowserViewBounds);

    // 初始化笔记编辑器 - 只在元素存在时初始化
    this.initNoteEditor();

    this.getAllNotes();
    
    // 获取提示词列表
    this.getPromptList();

    // 初始化相似题目的编辑器

    // 添加容器大小变化监听
    this.resizeObserver = new ResizeObserver(this.handleResize);
    const container = this.$refs.webpageContainer;
    if (container) {
      this.resizeObserver.observe(container);
    }

    window.addEventListener("keydown", this.handleKeyPress);
    window.addEventListener("keyup", this.handleKeyUp); // 添加 keyup 监听
    
    // 添加监听填表结果的事件
    this.$ipc.on('textarea-filled', (event, { success, error, viewId }) => {
      if (success) {
        this.$message.success('内容已成功填写');
      } else {
        this.$message.error(`填表错误: ${error || '填表错误'}`);
      }
    });
  },

  // keep-alive 激活时显示 BrowserView
  activated() {
    if (this.showWebView) {
      if (this.browserViewCreated && this.createdViews && this.createdViews.size > 0) {
        // 已创建的 BrowserView，直接显示并更新位置
        this.createdViews.forEach((viewId) => {
          this.$ipc.send("show-browser-view", { viewId: viewId });
        });
        // 更新位置，因为窗口可能已经改变
        this.$nextTick(() => {
          this.updateBrowserViewBounds();
        });
      } else if (this.selectedAI && this.selectedAI.length > 0) {
        // BrowserView 未创建，重新初始化
        this.$nextTick(() => {
          this.waitForContainerAndLoad();
        });
      }
    }
  },

  // keep-alive 停用时隐藏 BrowserView
  deactivated() {
    if (this.browserViewCreated) {
      if (this.createdViews && this.createdViews.size > 0) {
        this.createdViews.forEach((viewId) => {
          this.$ipc.send("hide-browser-view", viewId);
        });
      } else if (this.viewId) {
        this.$ipc.send("hide-browser-view", this.viewId);
      }
    }
  },

  beforeUnmount() {
    // 组件销毁时销毁编辑器实例
    const editors = [this.explainEditor];
    editors.forEach((editor) => {
      if (editor == null) return;
      editor.destroy();
    });


    // 清理工作
    window.removeEventListener("resize", this.updateBrowserViewBounds);
    if (this.browserViewCreated) {
      // 先隐藏所有 BrowserView
      if (this.createdViews && this.createdViews.size > 0) {
        this.createdViews.forEach((viewId) => {
          this.$ipc.send("hide-browser-view", viewId);
        });
      }
      
      // 延迟销毁，确保隐藏操作完成
      setTimeout(() => {
        // 销毁所有创建的 BrowserView
        if (this.createdViews && this.createdViews.size > 0) {
          this.createdViews.forEach((viewId) => {
            this.$ipc.send("destroy-browser-view", viewId);
          });
          this.createdViews.clear();
        }
        // 兼容旧代码
        this.$ipc.send("destroy-browser-view", this.viewId);
      }, 100);
      
      this.browserViewCreated = false;
    }
    if (this.noteEditor) {
      this.noteEditor.destroy();
    }

    // 在组件销毁时清除定时器
    if (this.effectTimer) {
      clearTimeout(this.effectTimer);
    }

    // 清理 ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    window.removeEventListener("keydown", this.handleKeyPress);
    window.removeEventListener("keyup", this.handleKeyUp); // 移除 keyup 监听
    
    // 移除所有 IPC 事件监听
    if (this.$ipc.removeAllListeners) {
      this.$ipc.removeAllListeners('textarea-filled');
      this.$ipc.removeAllListeners('browser-view-ready');
    }
  },

  watch: {
    isCollect(newVal) {
      if (newVal) {
        this.isSelectMode = false;
      }
    },
    
    // 监听 selectedAI 变化，自动加载对应的 URL
    selectedAI: {
      handler(newVal, oldVal) {
        // 限制最多选择2个
        if (newVal && newVal.length > 2) {
          this.$message.warning('最多只能选择2个AI');
          this.$nextTick(() => {
            this.selectedAI = oldVal || [];
          });
          return;
        }
        
        if (newVal && newVal.length > 0) {
          // 销毁不再需要的 BrowserView（跳过 aichat）
          if (oldVal && oldVal.length > 0) {
            const removedAIs = oldVal.filter(ai => !newVal.includes(ai) && ai !== 'aichat');
            removedAIs.forEach((ai) => {
              const viewId = `${this.viewId}-${ai}`;
              this.$ipc.send("destroy-browser-view", viewId);
              if (this.createdViews) {
                this.createdViews.delete(viewId);
              }
            });
          }
          // 加载新选中的 AI
          this.loadAIUrl();
        } else {
          // 如果清空了选择，销毁所有 BrowserView（跳过 aichat）
          if (oldVal && oldVal.length > 0) {
            oldVal.filter(ai => ai !== 'aichat').forEach((ai) => {
              const viewId = `${this.viewId}-${ai}`;
              this.$ipc.send("destroy-browser-view", viewId);
              if (this.createdViews) {
                this.createdViews.delete(viewId);
              }
            });
          }
        }
      },
      deep: true
    },
    
    // 监听题目显示模式变化
    async questionMode(newMode) {
      // 当切换到prenextWay模式时，检查当前题目是否需要加载详情
      if (newMode === 'prenextWay' && this.questionList.length > 0) {
        const currentQuestion = this.questionList[this.currentQuestionIndex];
        if (currentQuestion && currentQuestion.questiontype === '非客观题' && !currentQuestion.detailLoaded) {
          await this.loadNonObjectiveQuestionDetail(currentQuestion.id);
        }
      }
    },
    
    // 监听当前题目索引变化，用于加载非客观题详情
    async currentQuestionIndex(newIndex) {
      // 只在prenextWay模式下处理
      if (this.questionMode === 'prenextWay' && this.questionList.length > 0) {
        const currentQuestion = this.questionList[newIndex];
        // 如果是非客观题且未加载详情，则加载详情
        if (currentQuestion && currentQuestion.questiontype === '非客观题' && !currentQuestion.detailLoaded) {
          await this.loadNonObjectiveQuestionDetail(currentQuestion.id);
        }
      }
    },
    
    // ... existing watchers ...
    
    activePrintTab(newVal) {
      // 当切换到"全部题目"tab时，不重新设置printQuestions
      // 保持原有的打印题目数据
      if (newVal === 'range') {
        this.updatePrintQuestions();
      }
      // 'all' tab和'custom' tab都不需要更新printQuestions
    },
    // 监听showWebView变化
    showWebView(newVal) {
      if (this.$refs.webpageContainer) {
        this.$refs.webpageContainer.style.display = newVal ? 'block' : 'none';
      }
      
      if (newVal) {
        // 显示所有已创建的 browser view
        if (this.createdViews && this.createdViews.size > 0) {
          this.createdViews.forEach((viewId) => {
            this.$ipc.send("show-browser-view", { viewId: viewId });
          });
        } else {
          // 兼容旧代码
          this.$ipc.send("show-browser-view", { viewId: this.viewId });
        }
      } else {
        // 隐藏所有已创建的 browser view
        if (this.createdViews && this.createdViews.size > 0) {
          this.createdViews.forEach((viewId) => {
            this.$ipc.send("hide-browser-view", viewId);
          });
        } else {
          // 兼容旧代码
          this.$ipc.send("hide-browser-view", this.viewId);
        }
      }
    }
  },
};
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

.learn-container {
  display: flex;
  height: 100%;
  gap: 5px;
  position: relative;
  background-color: #faf8f5;
  color: #1a1a1a;
}

/* 添加科目行样式 */
.subject-row {
  padding: 26px 15px;
  border-radius: 12px;
  background: linear-gradient(to right, #ffffff, rgba(139, 154, 109, 0.12));
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  width: 100%;
  border: 1px solid #e8e4df;
}

.subject-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(139, 154, 109, 0.05));
  z-index: -1;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.subject-row:hover {
  background: linear-gradient(to right, #ffffff, rgba(139, 154, 109, 0.22));
}

.subject-row:hover::before {
  opacity: 0.8;
}

/* 提示词文本样式 - 最多显示2行，超出显示省略号 */
.prompt-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  max-height: 2.8em; /* 2行的高度 */
  word-break: break-word;
}

.selected-row {
  background: linear-gradient(to right, #ffffff, rgba(139, 154, 109, 0.35));
  font-weight: bold;
}

.selected-row:hover {
  background: linear-gradient(to right, #ffffff, rgba(139, 154, 109, 0.45));
}

.disabled-row {
  opacity: 0.6;
  cursor: not-allowed;
  background: linear-gradient(to right, #ffffff, rgba(200, 200, 200, 0.15));
}

.selected-icon {
  color: #8b9a6d;
  font-size: 14px;
  font-weight: bold;
  padding: 4px 8px;
}

/* 修改表格样式，增加行间距 */
:deep(.el-table__row) {
  margin: 8px 0;
}

:deep(.el-table__body) {
  border-spacing: 0 8px;
}

:deep(.el-table__body td) {
  background: transparent;
  border: none;
}

:deep(.el-table__body tr) {
  background: transparent;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

:deep(.el-table) {
  background: transparent;
}

:deep(.el-table__body-wrapper) {
  background: transparent;
}

/* 设置大字体输入框样式 */
.large-font-input :deep(.el-textarea__inner) {
  font-size: 30px !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

.print-header {
  height:60px; 
  display: flex; 
  align-items: center; 
  gap:20px;
  padding: 0 10px;
}
.button-section {
  width: 320px;
  border-right:1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  position: relative;
  transition: transform 0.4s ease, width 0.4s ease, opacity 0.3s ease; /* 添加过渡效果 */
}

/* 隐藏状态的左侧区域 */
.button-section-hidden {
  transform: translateX(-320px);
  width: 0;
  opacity: 0;
  overflow: hidden;
}

/* 折叠状态的左侧区域 */
.button-section-collapsed {
  width: 70px;
  overflow: visible;
}

/* 折叠后的图标菜单 */
.collapsed-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  height: 100%;
}

.collapsed-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 0;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s ease;
}

.collapsed-item:hover {
  background-color: rgba(139, 154, 109, 0.1);
}

.collapsed-item .el-icon {
  font-size: 24px;
  margin-bottom: 5px;
  color: #8b9a6d;
}

.collapsed-item span {
  font-size: 12px;
  color: #606266;
}

/* 折叠按钮样式 */
.collapse-btn {
  cursor: pointer;
  width: 60px;
  height: 40px;
  align-items: center;
  justify-content: center;
  background-color: #f5f3f0;
  transition: all 0.3s ease;
  line-height: 40px;
  text-align: center;
  border-radius: 5px;
}

.collapse-btn:hover {
  background-color: #8b9a6d;
  color: white;
}

/* 展开按钮样式 */
.expand-button {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 0 4px 4px 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  padding: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.expand-button:hover {
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
}

.button-section::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.left-button-section {
  flex: 1;
  margin-bottom: 10px;
  transition: all 0.3s ease-in-out;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 抽屉模式样式 */
.left-button-section-drawer {
  position: fixed;
  top: 0;
  height: 100vh;
  width: 0;
  overflow: hidden;
  z-index: 1000;
  background: white;
  border-right: 1px solid #eaeaea;
  flex: none;
  margin-bottom: 0;
}

.left-button-section-drawer-visible {
  width: 320px;
}

/* 抽屉头部样式 */
.subject-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eaeaea;
  background: white;
}

.subject-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.left-button-section-content {
  height:60px; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  padding:0 10px;
  gap:5px;
}

.learn-button-section {
  flex: 2;
  padding:20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.center-section {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding:10px 0;
  transition: width 0.4s ease; /* 添加过渡效果 */
}

/* 左侧菜单折叠时的中间区域宽度 */
.center-section-collapsed {
  flex: 1;
  min-width: 0;
}

.center-section-collapsed.no-webview {
  width: calc(100% - 64px);
}

/* 左侧菜单展开时的中间区域宽度 */
.center-section-expanded {
  flex: 1;
  min-width: 0;
}

.center-section-expanded.no-webview {
  width: calc(100% - 64px - 320px);
}

.infinite-list {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.infinite-list::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.right-section {
  flex-shrink: 0;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: row;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
}


.notes-explain-container {
  display: flex;
  gap: 20px;
}

.question-editor {
  flex-shrink: 0; /* 防止编辑器被压缩 */
  transition: height 0.3s ease; /* 添加过渡效果 */
  width: 100%;
}

/* 确保编辑器在其他元素之上 */
:deep(.w-e-text-container),
:deep(.w-e-toolbar) {
  z-index: 100 !important;
}

:deep(.w-e-scroll) {
  height: 100% !important;
  overflow-y: auto !important;
}

/* 移除工具栏相关样式 */
:deep(.w-e-toolbar) {
  display: none !important;
}

/* 调整编辑区域样式 */
:deep(.w-e-text-container) {
  border-top: 1px solid #ccc !important;
}

.options-container {
  flex: 1; /* 选项区域填剩余空间 */
  overflow-y: auto; /* 内容过多时显示滚动条 */
  min-height: 0; /* 允许容器在flex布局中收缩 */
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-item {
  cursor: pointer;
  transition: all 0.3s;
}

.option-item:hover {
  opacity: 0.8;
}

.excluded-text {
  text-decoration: line-through;
  color: #909399;
}

/* 为每个选项设置不同的背景色 - 调整选择器 */
.option-bg-0 {
  background: linear-gradient(
    to right,
    #f0f9ea,
    #ffffff
  ) !important; /* 浅绿色渐变 */
}

.option-bg-1 {
  background: linear-gradient(
    to right,
    #f0f5ff,
    #ffffff
  ) !important; /* 浅蓝色渐变 */
}

.option-bg-2 {
  background: linear-gradient(
    to right,
    #fdf6ec,
    #ffffff
  ) !important; /* 浅橙色渐变 */
}

.option-bg-3 {
  background: linear-gradient(
    to right,
    #fef0f0,
    #ffffff
  ) !important; /* 浅红色渐变 */
}

/* 鼠标悬停效果 */
.option-bg-0:hover {
  background: linear-gradient(to right, #e4f3d9, #f5f5f5) !important;
}

.option-bg-1:hover {
  background: linear-gradient(to right, #e4edff, #f5f5f5) !important;
}

.option-bg-2:hover {
  background: linear-gradient(to right, #faecd8, #f5f5f5) !important;
}

.option-bg-3:hover {
  background: linear-gradient(to right, #fde2e2, #f5f5f5) !important;
}

/* 增加 radio 按钮和文字的可点击区域 */
:deep(.el-radio) {
  display: flex;
  align-items: center;
  height: 100%;
  cursor: pointer;
  font-weight: bold;
}

.correct-icon {
  margin-right: 5px;
}

/* 添加多选框式 */
:deep(.el-checkbox) {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 12px 8px;
  cursor: pointer;
  font-weight: bold;
  /* flex: initial !important; */
}

.option-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  min-height: 50px;
  line-height: 1.5;
  cursor: pointer;
  font-size: 49px;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.el-radio),
:deep(.el-checkbox) {
  margin-right: 0;
  margin-left: 0;
  flex: 1;
}

:deep(.el-button) {
  flex-shrink: 0;
}

:deep(.el-checkbox__label) {
  font-size: 26px;
}

:deep(.el-radio__label) {
  font-size: 26px;
}

.ai-input-container {
  margin-bottom: 10px;
}

:deep(.el-radio__inner),
:deep(.el-checkbox__inner) {
  width: 20px;
  height: 20px;
}

:deep(.el-checkbox__inner::after) {
  height: 10px; /* 减小对勾高度使其更协 */
  width: 4px; /* 调整对勾宽度 */
  left: 6px; /* 调整水平位置使其居中 */
  top: 2px; /* 调整垂直位置使其居中 */
}

:deep(.el-tree-node__content > label.el-checkbox) {
  margin: 0;
}

.options-divider {
  height: 2px;
  background-color: #dcdfe6;
  margin: 10px 0;
}

.options-title {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 10px;
}

.correct-txt {
  color: #e8686a;
  margin-left: 10px;
  font-size: 16px;
}

/* 调整题目编辑器的文本样式 */
:deep(.question-editor .w-e-text-container .w-e-text) {
  color: #e8686a !important;
}
:deep(.w-e-toolbar p, .w-e-text-container p, .w-e-menu-panel p) {
  font-size: 50px !important;
}

/* 调整树形结构的字体大小 */
:deep(.el-tree-node__label) {
  font-size: 20px; /* 调整树节点文字大小 */
}

:deep(.el-tree-node__content) {
  height: 26px; /* 加节点高度以适应更大的字体 */
  line-height: 26px;
}

:deep(.el-checkbox__label) {
  font-size: 20px; /* 调整复选框文字大小 */
}
:deep(.el-tree-node) {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

/* 添加新样式 */
.question-count-container {
  display: flex;
  flex-wrap: nowrap;
  flex-direction: column;
  gap: 10px;
}

.question-type {
  color: #e8686a;
  white-space: nowrap;
}

.exam-status {
  white-space: nowrap;
}

/* 修改按钮样式 */
:deep(.option-content .el-button) {
  height: 100%; /* 使按钮高度填满父容器 */
  width: 100px; /* 增加按钮宽度 */
  padding: 0; /* 移除内边距 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 调整图标大小 */
:deep(.option-content .el-button .el-icon) {
  font-size: 20px; /* 增加图标大小 */
}

.selected {
  color: #8b9a6d;
  font-weight: bold;
}

.option-item:hover {
  background-color: #f5f3f0;
}

.excluded .option-content {
  color: #909399;
  text-decoration: line-through;
  font-size: 26px;
}

/* 添加以下样式 */
:deep(.w-e-text-container .w-e-text) {
  font-size: 22px !important;
}

:deep(.w-e-text p) {
  font-size: 22px !important;
  line-height: 1.5;
}

:deep(.w-e-text-container) {
  max-width: 100% !important;
  overflow: hidden !important;
}

:deep(.w-e-text) {
  max-width: 100% !important;
  overflow-x: hidden !important;
}

:deep(.w-e-text img) {
  max-width: 100% !important;
  height: auto !important;
}

/* 添加样式 */
.webpage-container {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

/* 大模型问答面板样式 */
.aichat-container {
  display: flex;
  flex-direction: column;
}

.aichat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.aichat-header {
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  background: #f5f3f0;
}

.aichat-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.aichat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.aichat-messages::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.aichat-message {
  display: flex;
}

.aichat-message.user {
  justify-content: flex-end;
}

.aichat-message.assistant {
  justify-content: flex-start;
}

.aichat-bubble {
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 18px;
  line-height: 2;
  word-break: break-word;
}

.aichat-message.user .aichat-bubble {
  background: #8b9a6d;
  color: #fff;
}

.aichat-message.assistant .aichat-bubble {
  background: #f5f3f0;
  color: #303133;
}

.aichat-typing {
  color: #909399;
}

.aichat-input {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
  background: #fff;
}

.aichat-input .el-textarea {
  flex: 1;
}

/* Markdown 内容样式 */
.aichat-bubble .md-content {
  display: inline;
}

.aichat-bubble .md-content p {
  margin: 0.4em 0;
}

.aichat-bubble .md-content p:first-child {
  margin-top: 0;
}

.aichat-bubble .md-content p:last-child {
  margin-bottom: 0;
}

.aichat-bubble .md-content pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 10px 14px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 13px;
}

.aichat-bubble .md-content code {
  background: #f0f0f0;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 13px;
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

.aichat-bubble .md-content pre code {
  background: none;
  padding: 0;
}

.aichat-bubble .md-content ul,
.aichat-bubble .md-content ol {
  padding-left: 20px;
  margin: 6px 0;
}

.aichat-bubble .md-content blockquote {
  border-left: 3px solid #8b9a6d;
  padding-left: 10px;
  margin: 8px 0;
  color: #606266;
}

.aichat-bubble .md-content h1,
.aichat-bubble .md-content h2,
.aichat-bubble .md-content h3,
.aichat-bubble .md-content h4 {
  margin: 8px 0 4px;
  line-height: 1.4;
}

.aichat-bubble .md-content table {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
}

.aichat-bubble .md-content th,
.aichat-bubble .md-content td {
  border: 1px solid #dcdfe6;
  padding: 6px 10px;
  text-align: left;
}

.aichat-bubble .md-content th {
  background: #f5f3f0;
}

.aichat-bubble .md-content a {
  color: #8b9a6d;
  text-decoration: none;
}

.aichat-bubble .md-content a:hover {
  text-decoration: underline;
}

/* 打字光标动画 */
.typing-cursor {
  animation: blink 1s infinite;
  font-weight: bold;
  color: #8b9a6d;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

:deep(.el-radio-group) {
  display: block;
}

/* 调整笔记弹出框的样式 */
.note-editor-section {
  height: 600px; /* 增加高度 */
  display: flex;
  gap: 20px;
}

/* 批量复制弹窗样式 */

.info-text {
  background-color: #f5f3f0;
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
}

.info-text p {
  margin: 5px 0;
  color: #606266;
  font-size: 14px;
}

.info-text strong {
  color: #8b9a6d;
  font-weight: bold;
}

/* 范围内容样式 */
.range-content {
  margin: 10px 0;
}

/* 单选框组样式 */
:deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

:deep(.el-radio) {
  margin-right: 0;
  margin-bottom: 0;
  align-items: center;
}

:deep(.el-radio__label) {
  font-size: 14px !important;
  font-weight: normal !important;
  padding-left: 8px;
}

:deep(.el-radio__input) {
  line-height: 1;
}

.note-section-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 300px; /* 设置最小宽度 */
  max-width: 400px; /* 设置最大宽度 */
}

.note-section-right {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.title-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.note-editor-container {
  flex: 1;
  min-height: 0;
}

/* 调整分页样式 */
.pagination {
  margin-top: 10px;
  text-align: center;
  margin: 0 auto;
}

.note-content {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
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

:deep(.el-pager li) {
  min-width: 29px !important;
}

.option-item {
  display: flex;
}
.option-item button {
  height: inherit;
}

.option-disabled label {
  opacity: 0;
}

/* 添加表格行的鼠标手型样式 */
:deep(.el-table tbody tr) {
  cursor: pointer;
}

.note-ai-container {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.note-ai-container > * {
  width: 100%;
}

.note-container {
  flex: 1;
  min-width: 0; /* 防止内容溢出 */
  width: 100%;
}

.note-ai-select {
  flex: 1;
  min-width: 0; /* 防止内容溢出 */
  width: 100%;
}

.related-question-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.infinite-list-item {
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  background: rgba(139, 154, 109, 0.1);
  position: relative;
  border: 1px solid #e8e4df;
}

/* 添加收藏图标样式 */
.collect-icon {
  position: absolute;
  top: -2px;
  left: 20px;
  width: 40px;
  height: 40px;
  z-index: 1;
}

.infinite-list-item:hover {
  /* 悬停时增强阴影效果 */
  /* box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); */
  /* transform: translateY(-2px); */
}

.question-editor {
  background: #fff;
  border-radius: 8px;
}

.wrong-questions-btn {
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  padding: 10px;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: linear-gradient(to right, rgba(139, 154, 109, 0.2), #ffffff);
  box-shadow: 0 2px 8px rgba(139, 154, 109, 0.15);
  width: 100%;
  justify-content: space-between;
  border: 1px solid #e8e4df;
}

.wrong-questions-btn:hover {
  box-shadow: 0 4px 12px rgba(139, 154, 109, 0.25);
  transform: translateY(-1px);
}

.wrong-questions-info {
  display: flex;
  flex-direction: column;
}

.wrong-title {
  font-size: 20px;
}

.wrong-count {
  font-size: 12px;
  color: #909399;
}

.wrong-icon {
  width: 49px;
  height: 49px;
}

.related-questions {
  margin-top: 20px;
  padding: 15px;
  border-top: 1px solid #eee;
}

.related-questions-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
}

.question-item {
  margin-bottom: 20px;
}

.question-content {
  font-size: 20px;
  width:100%
}

/* 添加题目分隔线样式 */
.question-divider {
  border-top: 2px dashed #dcdfe6;
  margin: 20px 0; /* 增加上下间距 */
}

/* 最后一个题目项不需要下边距 */
.question-item:last-child {
  margin-bottom: 0;
}

.answer-status {
  margin-left: 10px;
  font-weight: bold;
}

.answer-status.correct {
  color: #8b9a6d;
}

.answer-status.wrong {
  color: #e8686a;
}

.correct-icon {
  margin-right: 5px;
  font-size: 16px;
}

.option-content {
  display: flex;
  align-items: center;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 2px dotted #8b9a6d;
}

.question-content {
  display: flex;
  align-items: center; /* 添加垂直居中对齐 */
  flex: 1; /* 让内容占据剩余空间 */
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

:deep(.el-button--small) {
  padding: 8px 15px;
  font-size: 14px;
}
.delete-container {
  margin-top: 10px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

:deep(.el-pagination) {
  font-size: 16px;
}

:deep(.el-pagination .el-select .el-input) {
  width: 110px;
}

.add-related-question-section {
  background: #f5f3f0;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

:deep(.el-textarea__inner) {
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
}

.print-info {
  padding: 20px;
  font-size: 16px;
  text-align: center;
}

.print-form {
  padding: 20px;
  font-size: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.range-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.all-questions {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}


.question-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.question-options {
  margin-bottom: 5px;
}

.answer {
  font-weight: bold;
  margin-top: 5px;
}

.explanation {
  padding-left: 10px;
  background-color: #ecf5ff;
}

.print-container {
  max-height: 70vh;
  overflow-y: auto;
  padding: 10px;
}

.range-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f3f0;
  border-radius: 4px;
}

.all-questions {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.question-preview {
  border-radius: 4px;
  background: #fff;
}

.question-title {
  font-weight: bold;
  margin-bottom: 10px;
  color: #303133;
}

.question-options {
}

.option {
  margin-bottom: 8px;
}

.answer {
  font-weight: bold;
  margin-top: 10px;
  color: #eee;
  padding: 5px 0;
}

.explanation {
  border-left: 3px solid #eee;
  padding: 8px 15px;
  background-color: #ecf5ff;
  border-radius: 0 4px 4px 0;
}

.custom-print-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.custom-print-container textarea {
  width: 100%;
  height: 100px;
  padding: 10px;
  margin-bottom: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 16px;
}

/* 添加题目内容样式 */
.question-content {
  display: flex;
  align-items: center;
  line-height: 1.5;
  word-break: break-all;
}

/* 展开行的样式 */
.question-detail {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  padding: 15px;
  background-color: #f9f9f9;
}

.background-image {
  position: absolute;
  height: 100%;
  bottom: 0;
  right: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5; 
}

.question-options {
  margin-bottom: 15px;
  position: relative;
}

.options-title, .answer-title, .explain-title {
  font-weight: bold;
  margin-bottom: 5px;
  color: #1a1a1a;
}

.option {
  padding: 5px 0;
}

.question-answer {
  margin-bottom: 15px;
}

.answer-content {
  color: #8b9a6d;
  font-weight: bold;
  margin-left: 20px;
}

.question-explain {
  border-left: 3px solid #8b9a6d;
  padding-left: 15px;
  background-color: #f5f3f0;
  border-radius: 0 4px 4px 0;
}

.explain-content {
  margin-left: 20px;
  padding: 5px 0;
}

/* 确保表格内容垂直居中 */
:deep(.el-table .cell) {
  display: flex;
  align-items: center;
  height: 100%;
}

/* 添加搜索框样式 */
:deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border-radius: 10px;
  box-shadow: none !important;
  transition: all 0.3s ease;
  border: 1px solid #e8e4df !important;
}

:deep(.el-input__wrapper:hover) {
  border-color: #c4a882 !important;
  box-shadow: none !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882 !important;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

:deep(.el-input__inner) {
  font-size: 16px;
}

:deep(.el-input__prefix) {
  color: #909399;
}

.subject-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 10px;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.subject-list::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}



.pdf-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.pdf-preview-container {
  display: flex;
  justify-content: center;
  height: 300px;
  gap: 5px;
  margin-top:20px
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pdf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.pdf-empty .el-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

/* 添加文件预览相关样式 */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding:10px;
  border-bottom: 1px solid #eaeaea;
  font-weight: bold;
  width: 100%;
}

.preview-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.preview-placeholder {
  color: #909399;
  font-size: 16px;
  text-align: center;
}

/* 添加Word预览相关样式 */
.word-preview {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
}

.word-preview :deep(img) {
  max-width: 100%;
  height: auto;
}

.word-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
}

.word-preview :deep(td),
.word-preview :deep(th) {
  border: 1px solid #ddd;
  padding: 8px;
}

.word-preview :deep(p) {
  margin: 10px 0;
  line-height: 1.6;
}

/* Add this to ensure ContentEditor displays properly */
:deep(.content-editor-container) {
  display: inline-block;
  width: 100%;
}

:deep(.content-html-display) {
  display: inline-block;
  width: 100%;
}

/* 添加PDF预览相关样式 */
.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

/* 操作按钮样式 */
.operation-buttons {
  display: flex;
  gap: 2px;
  justify-content: center;
}

/* 文件选择弹窗样式 */
.pdf-div {
  position: absolute;
  width: 0;
  height: 100%;
  overflow: hidden;
  transition: width 0.3s ease-in-out;
  background:#fff;
  z-index: 100;
}

.pdf-div-visible {
  width: 800px;
  border-right: 2px solid #eaeaea;
}

.pdf-drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 20px;
  gap:5px;
}

.pdf-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaeaea;
}

.pdf-drawer-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.pdf-preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: calc(100% - 19px);
}

/* 设置抽屉样式 */
.settings-div {
  position: absolute;
  width: 0;
  height: 100%;
  overflow: hidden;
  transition: width 0.3s ease-in-out;
  background:#fff;
  z-index: 9999;
}

.settings-div-visible {
  width: 600px;
  border-right: 2px solid #eaeaea;
}

/* 考点抽屉样式 */
.exampoint-div {
  position: absolute;
  width: 0;
  height: 100%;
  overflow: hidden;
  transition: width 0.3s ease-in-out;
  background: #fff;
  z-index: 9999;
}

.exampoint-div-visible {
  width: 600px;
  border-right: 2px solid #eaeaea;
}

.exampoint-drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 5px;
}

.exampoint-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaeaea;
}

.exampoint-drawer-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.exampoint-content {
  flex: 1;
  overflow-y: auto;
}

/* 考点科目选择下拉框样式 - 需要全局样式因为teleported到body */
</style>

<style>
.exampoint-select-popper {
  z-index: 99999 !important;
}
</style>

<style scoped>
.settings-drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 5px;
}

.settings-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaeaea;
}

.settings-drawer-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.settings-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 弹窗左移样式 */
:deep(.left-shifted-dialog) {
  margin-left: 10% !important;
}

:deep(.left-width-shifted-dialog) {
  margin-left: 5% !important;
}

/* 统一调大所有按钮中的图标大小 */
:deep(.el-button .el-icon) {
  font-size: 20px !important;
}

/* 题目选项删除图标样式 */
.option .el-icon {
  font-size: 24px !important;
}

/* 操作按钮区域的图标 */
.question-detail .el-icon {
  font-size: 20px !important;
}

/* 当PDF抽屉可见时，center-section的宽度调整为300px */
.center-section-pdf-visible {
  width: 500px !important;
}

/* 操作按钮区域的图标 */

/* 文件标签选择器样式 */
.file-tag-select {
  width: 200px;
  margin-right: 10px;
}

.file-tag-select :deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
  padding: 0;
  transition: all 0.3s;
}

.file-tag-select :deep(.el-input__wrapper:hover) {
  border-color: #c4a882 !important;
  box-shadow: none !important;
}

.file-tag-select :deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882 !important;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

.file-tag-select :deep(.el-input__inner) {
  background-color: transparent;
  border: none;
  height: 40px;
  padding: 0 20px;
  transition: all 0.3s;
  outline: none !important;
}

.whole-question-content {
  padding: 5px 0;
  height: calc(100vh - 260px);
  overflow-y: auto;
}

.whole-question-content::-webkit-scrollbar {
  width: 8px;
}

.whole-question-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.whole-question-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
  transition: background 0.3s ease;
}

.whole-question-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Firefox 滚动条样式 */
.whole-question-content {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

/* mutileWay 需要相对定位以便手写板正确覆盖 */
.mutileWay {
  position: relative;
}

/* 手写板样式 */
.handwriting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000000;
}

.handwriting-container {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.handwriting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding:0 10px;
}

.handwriting-tools {
  display: flex;
  gap: 10px;
}

.handwriting-toolbar {
  display: flex;
  gap: 30px;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f3f0;
  border-radius: 4px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
}

.color-picker {
  display: flex;
  gap: 8px;
}

.color-item {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.color-item:hover {
  transform: scale(1.1);
}

.color-item.active {
  border: 2px solid #8b9a6d;
  box-shadow: 0 0 8px rgba(139, 154, 109, 0.5);
}

.handwriting-canvas {
  cursor: crosshair;
  background: rgba(255, 255, 255, 0.5);
  border-radius:5px;
}

/* 非客观题样式 */
.non-objective-question {
  position: relative;
  z-index: 1;
}

.non-objective-container {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}

.answer-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.answer-section :deep(.el-textarea) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.answer-section :deep(.el-textarea__inner) {
  font-size: 25px !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  border-radius: 9px;
  flex: 1;
  height: 100% !important;
  resize: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.answer-section :deep(.el-textarea__inner)::-webkit-scrollbar {
  width: 6px;
}

.answer-section :deep(.el-textarea__inner)::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.answer-section :deep(.el-textarea__inner)::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.3s;
}

.answer-section :deep(.el-textarea__inner)::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.answer-preview-section {
  flex: 1;
  padding: 16px;
  background-color: #ffffff;
  border-radius: 9px;
  font-size: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 500px;
}

.answer-switch-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.answer-switch-header span {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.answer-edit-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.answer-edit-area :deep(.el-textarea__inner) {
  font-size: 25px !important;
  border-radius: 9px;
  flex: 1;
  height: 100% !important;
  resize: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.answer-edit-buttons {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.answer-display-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  line-height: 1.8;
  color: #606266;
  font-size: 20px;
}

.answer-display-area::-webkit-scrollbar {
  width: 6px;
}

.answer-display-area::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.answer-display-area::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.3s;
}

.answer-display-area::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.zindex-Top{
  z-index:10000!important;
}
</style>

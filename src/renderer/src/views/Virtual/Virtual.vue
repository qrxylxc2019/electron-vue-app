<template>
  <div class="virtual-container">
    <!-- 左右布局 -->
    <div class="virtual-main-layout">
      <!-- 左侧：原有内容 -->
      <div class="virtual-left-section">
    <!-- Tab切换 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="未优化" name="1">
        <div class="header">
          <div class="header-actions">
            <el-button type="primary" @click="handleAdd">
              新增资料
            </el-button>
            <el-button type="danger" @click="handleBatchDelete" :disabled="selectedRows.length === 0">
              批量删除 ({{ selectedRows.length }})
            </el-button>
            <el-button type="primary" @click="handleCrawl" :loading="crawling">
              爬取商品
            </el-button>
            <el-button type="primary" @click="handleBatchOptimize" :loading="batchOptimizing">
              一键优化
            </el-button>
            <el-button v-if="batchOptimizing" type="danger" @click="handleStopBatchOptimize">
              停止优化
            </el-button>
            <span v-if="batchOptimizing" style="margin-left: 10px; color: #409eff; font-weight: 600;">
              优化进度: {{ batchProgress.current }}/{{ batchProgress.total }} ({{ batchProgressPercent }}%)
            </span>
            <el-button @click="showSettingsModal = true">
              设置
            </el-button>
            <el-button type="primary" @click="showExamDrawer = true">
              考试汇总
            </el-button>
            <el-input
              v-model="searchKeyword"
              placeholder="搜索资料名称或网盘地址"
              clearable
              style="width: 300px;"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="已优化" name="2">
        <div class="header">
          <div class="header-actions">
            <el-button type="danger" @click="handleBatchDelete" :disabled="selectedRows.length === 0">
              批量删除 ({{ selectedRows.length }})
            </el-button>
            <el-button type="primary" @click="handlePublish" :loading="publishing">
              一键发布
            </el-button>
            <el-button @click="showPublishSettingsModal = true">
              设置
            </el-button>
            <el-button type="primary" @click="showExamDrawer = true">
              考试汇总
            </el-button>
            <el-input
              v-model="searchKeyword"
              placeholder="搜索资料名称或网盘地址"
              clearable
              style="width: 300px;"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 资料列表 -->
    <el-table
      ref="materialTable"
      :data="paginatedList"
      v-loading="loading"
      stripe
      @selection-change="handleSelectionChange"
      :row-key="getRowKey"
    >
      <el-table-column type="selection" width="50" :reserve-selection="true" />
      <el-table-column type="index" label="序号" width="100" :index="getTableIndex" />
      <el-table-column prop="name" label="资料名" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.name || row.material_name }}
        </template>
      </el-table-column>
      <el-table-column prop="name" label="原来标题" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.origin_title }}
        </template>
      </el-table-column>
      <el-table-column v-if="activeTab === '1'" label="优化状态" >
        <template #default="{ row }">
          <el-tag v-if="batchItemStatus[row.id] === 'processing'" type="warning" size="small">优化中</el-tag>
          <el-tag v-else-if="batchItemStatus[row.id] === 'done'" type="success" size="small">已完成</el-tag>
          <span v-else style="color:#999">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="price" label="价格" >
        <template #default="{ row }">
          ¥{{ row.price }}
        </template>
      </el-table-column>
      <el-table-column prop="price" label="原价" >
        <template #default="{ row }">
          ¥{{ row.old_price }}
        </template>
      </el-table-column>
      <el-table-column label="图片" >
        <template #default="{ row }">
          <span v-if="getFirstPic(row.pic)" class="pic-link" @click="showPicPreview(row)">
            查看图片({{ getAllPics(row.pic).length }}张)
          </span>
          <span v-else style="color:#999">无图片</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" >
        <template #default="{ row }">
          <el-button type="primary" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button type="warning" @click="copyToClipboard(row)">
            复制
          </el-button>
          <el-button type="danger" @click="handleDeleteMaterial(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredMaterialList.length"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增/编辑资料弹窗 -->
    <el-dialog
      v-model="showAddModal"
      :title="materialForm.id ? '编辑资料' : '新增资料'"
      width="1500px"
      align-center
    >
      <el-form :model="materialForm" label-width="120px">
        <el-form-item label="Virtual ID" v-if="materialForm.virtual_id">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input v-model="materialForm.virtual_id" placeholder="Virtual ID" style="flex: 1;" readonly />
            <el-button type="primary" @click="copyVirtualId" :disabled="!materialForm.virtual_id">
              复制
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="原来标题">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input v-model="materialForm.origin_title" placeholder="原来标题" style="flex: 1;" />
            <el-button type="warning" @click="handleAiOptimize" :loading="aiOptimizing" :disabled="!materialForm.origin_title">
              AI优化标题
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="资料名称" required>
          <el-input v-model="materialForm.material_name" placeholder="请输入资料名称" />
        </el-form-item>

        <el-form-item label="描述">
          <div style="display: flex; gap: 8px; width: 100%; align-items: flex-start;">
            <el-input
              v-model="materialForm.desc"
              type="textarea"
              :rows="3"
              placeholder="请输入资料描述"
              style="flex: 1;"
            />
            <el-button type="success" @click="handleAiDesc" :loading="aiDescLoading" :disabled="!materialForm.material_name">
              AI生成描述
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="类型" required>
          <el-select v-model="materialForm.type" placeholder="请选择类型" style="width: 100%;">
            <el-option label="电子资料" value="电子资料" />
            <el-option label="设计素材/源文件" value="设计素材/源文件" />
            <el-option label="学习资料定制" value="学习资料定制" />
            <el-option label="其他闲置" value="其他闲置" />
          </el-select>
        </el-form-item>

        <el-form-item label="宝贝图片">
          <div style="width: 100%;">
            <div style="margin-bottom: 8px;">
              <el-button type="primary" @click="openImageFolder" :disabled="!materialForm.virtual_id">
                打开图片目录
              </el-button>
            </div>
            <div class="image-upload-area">
            <div class="image-preview-list">
              <div class="image-preview-item" v-for="(img, index) in uploadedImages" :key="index">
                <img :src="img.url" alt="预览图" @click="previewUploadImage(index)" style="cursor: pointer;" />
                <div class="image-remove" @click="removeImage(index)">
                  <el-icon><Delete /></el-icon>
                </div>
              </div>
              <el-upload
                class="image-uploader-card"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleImageChange"
                accept="image/png,image/jpg,image/jpeg,image/webp"
                multiple
              >
                <div class="upload-placeholder">
                  <el-icon class="upload-icon"><Plus /></el-icon>
                  <span class="upload-text">{{ uploadedImages.length === 0 ? '添加首图' : '添加图片' }}</span>
                </div>
              </el-upload>
              <el-button type="success" @click="handleGenerateImage" :loading="generatingImage" :disabled="!materialForm.material_name" style="height: 120px;">
                AI生成图片
              </el-button>
            </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="价格" required>
          <el-input v-model="materialForm.price" placeholder="0.00">
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>

        <el-form-item label="原价">
          <el-input v-model="materialForm.original_price" placeholder="0.00">
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>

        <el-form-item label="发货设置">
          <el-radio-group v-model="materialForm.way">
            <el-radio :value="0">包邮</el-radio>
            <el-radio :value="2">一口价</el-radio>
            <el-radio :value="3">无需邮寄</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="网盘地址">
          <div style="display: flex; gap: 8px;width:100%">
            <el-input
              v-model="materialForm.online_url"
              type="textarea"
              :rows="2"
              placeholder="请输入网盘地址"
              style="flex: 1;"
            />
            <el-button
              type="primary"
              @click="copyOnlineUrl"
              :disabled="!materialForm.online_url"
            >
              复制
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="采购地址">
          <el-input
            v-model="materialForm.buy_url"
            type="textarea"
            :rows="4"
            placeholder="请输入采购地址"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddModal = false">取消</el-button>
        <el-button type="warning" @click="handleAiOneClick" :loading="aiOneClickLoading" :disabled="!materialForm.origin_title">
          一键优化
        </el-button>
        <el-button type="info" @click="showChatModal = true">
          豆包聊天
        </el-button>
        <el-button type="primary" @click="saveVirtual" :loading="submitting">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 豆包聊天弹窗 -->
    <el-dialog v-model="showChatModal" title="豆包聊天" width="700px" align-center>
      <div class="chat-messages" ref="chatMessages">
        <div v-for="(msg, index) in chatMessages" :key="index" :class="['chat-msg', msg.role]">
          <div class="chat-msg-role">{{ msg.role === 'user' ? '我' : '豆包' }}</div>
          <div class="chat-msg-content" style="white-space: pre-wrap;">{{ msg.content }}</div>
        </div>
        <div v-if="chatLoading" class="chat-msg assistant">
          <div class="chat-msg-role">豆包</div>
          <div class="chat-msg-content">思考中...</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <el-input
          v-model="chatInput"
          type="textarea"
          :rows="2"
          placeholder="输入消息..."
          style="flex: 1;"
          @keydown.ctrl.enter="handleChatSend"
        />
        <el-button type="primary" @click="handleChatSend" :loading="chatLoading" style="height: auto;">
          发送
        </el-button>
      </div>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="showPicModal" title="图片预览" align-center class="pic-dialog">
      <div class="pic-preview-grid">
        <div v-for="(url, index) in previewPics" :key="index" class="pic-preview-box">
          <img :src="url" alt="图片" />
        </div>
      </div>
    </el-dialog>

    <!-- 上传图片大图预览 -->
    <teleport to="body">
      <div v-if="showUploadPreview" class="custom-image-viewer" @click.self="showUploadPreview = false">
        <div class="viewer-close" @click="showUploadPreview = false">
          <el-icon :size="28" color="#fff"><Close /></el-icon>
        </div>
        <div class="viewer-arrow left" @click.stop="uploadPreviewIndex = (uploadPreviewIndex - 1 + uploadedImages.length) % uploadedImages.length" v-if="uploadedImages.length > 1">
          <el-icon :size="36" color="#fff"><ArrowLeft /></el-icon>
        </div>
        <img :src="uploadedImages[uploadPreviewIndex]?.url" class="viewer-img" @click.stop />
        <div class="viewer-arrow right" @click.stop="uploadPreviewIndex = (uploadPreviewIndex + 1) % uploadedImages.length" v-if="uploadedImages.length > 1">
          <el-icon :size="36" color="#fff"><ArrowRight /></el-icon>
        </div>
      </div>
    </teleport>

    <!-- 设置弹窗 -->
    <el-dialog v-model="showSettingsModal" title="优化设置" width="500px" align-center>
      <el-form label-width="150px">
        <el-form-item label="优化间隔时间(秒)">
          <el-input-number v-model="optimizeInterval" :min="5" :max="120" :step="5" />
          <div style="color: #999; font-size: 12px; margin-top: 5px;">
            每条数据优化完成后等待的时间，避免请求过快
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettingsModal = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>

    <!-- 发布设置弹窗 -->
    <el-dialog v-model="showPublishSettingsModal" title="发布设置" width="500px" align-center>
      <el-form label-width="120px">
        <el-form-item label="发布模式">
          <el-radio-group v-model="publishSettings.mode">
            <el-radio :value="1">逆向</el-radio>
            <el-radio :value="2">JS填表</el-radio>
            <el-radio :value="3">Python填表</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="发布平台">
          <el-checkbox-group v-model="publishSettings.platforms">
            <el-checkbox :value="1">闲鱼</el-checkbox>
            <el-checkbox :value="2">淘宝</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="发布间隔时间(秒)">
          <el-input-number v-model="publishSettings.interval" :min="5000" :max="60000" :step="1000" />
          <div style="color: #999; font-size: 12px; margin-top: 5px;">
            每条数据发布完成后等待的时间，避免请求过快（单位：毫秒，1000毫秒=1秒）
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPublishSettingsModal = false">取消</el-button>
        <el-button type="primary" @click="savePublishSettings">保存</el-button>
      </template>
    </el-dialog>

    <!-- 考试汇总抽屉 -->
    <el-drawer
      v-model="showExamDrawer"
      title="考试汇总"
      direction="rtl"
      size="80%"
    >
      <ExamTime />
    </el-drawer>
      </div>
      <!-- 右侧：大模型 AI 对话 -->
      <div class="virtual-right-section">
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
                <div class="md-content" v-html="renderMarkdown(cleanMessageContent(msg.content))"></div>
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
    </div>

    <!-- JS填表发布弹窗 -->
    <el-dialog
      v-model="showPublishDialog"
      title="一键发布"
      width="95%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      align-center
      @close="handleClosePublishDialog"
    >
      <div class="publish-dialog-content">
        <div class="publish-control-bar">
          <div class="publish-info">
            <span class="publish-progress-text">
              发布进度: {{ publishProgress.current }}/{{ publishProgress.total }}
            </span>
          </div>
          <div class="publish-log">
            <div class="publish-log-title">发布日志:</div>
            <div class="publish-log-content" ref="publishLogContainer">
              <div
                v-for="(log, index) in publishLogs"
                :key="index"
                :class="['publish-log-item', log.type]"
              >
                {{ log.text }}
              </div>
            </div>
          </div>
          <div class="publish-actions">
            <el-button
              v-if="!publishStarted"
              type="primary"
              size="large"
              @click="handleStartPublish"
              :disabled="!publishBrowserViewCreated"
            >
              {{ publishBrowserViewCreated ? '开始发布' : '加载中...' }}
            </el-button>
            <div class="publish-actions-row" v-if="publishStarted">
              <el-button
                type="warning"
                size="large"
                @click="stopPublish"
              >
                暂停发布
              </el-button>
              <el-button
                type="danger"
                size="large"
                @click="handleClosePublishDialog"
              >
                停止并关闭
              </el-button>
            </div>
          </div>
        </div>
        <div class="browser-view-container">
          <div
            class="webpage-container"
            ref="publishWebpageContainer"
            id="webview-container-publish"
          ></div>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import { Search, Delete, Plus, Download, Close, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import ExamTime from '@/views/ExamTime/ExamTime.vue';

export default {
  components: {
    Search,
    Delete,
    Plus,
    Download,
    Close,
    ArrowLeft,
    ArrowRight,
    ExamTime
  },
  data() {
    return {
      showAddModal: false,
      loading: false,
      submitting: false,
      materialList: [],
      materialForm: {
        id: null,
        virtual_id: "",
        material_name: "",
        origin_title: "",
        online_url: "",
        buy_url: "",
        desc: "",
        pic: "",
        price: "",
        original_price: "",
        way: 3,
        selfPickup: false,
        type: ""
      },
      aiOptimizing: false,
      aiDescLoading: false,
      aiOneClickLoading: false,
      searchKeyword: "",
      filteredMaterialList: [],
      uploadedImages: [],
      currentPage: 1,
      pageSize: 20,
      crawling: false,
      generatingImage: false,
      showPicModal: false,
      previewPics: [],
      showChatModal: false,
      chatMessages: [],
      chatInput: "",
      chatLoading: false,
      showUploadPreview: false,
      uploadPreviewIndex: 0,
      // 批量优化相关
      batchOptimizing: false,
      batchFinished: false,
      batchProgress: { running: false, total: 0, current: 0, finished: false },
      batchItemStatus: {},
      batchWs: null,
      doubaoCookie: '',  // 改为 doubaoCookie，更准确地表示存储的是完整 Cookie
      selectedRows: [],
      activeTab: '1',
      publishing: false,
      showSettingsModal: false,
      showPublishSettingsModal: false,
      publishSettings: {
        mode: 1, // 1: 逆向, 2: JS填表, 3: Python填表
        platforms: [1], // 1: 闲鱼, 2: 淘宝
        interval: 10000 // 发布间隔时间（毫秒），默认10秒
      },
      optimizeInterval: 1000,
      // JS填表相关
      showPublishDialog: false,
      publishViewId: "virtualPublishView",
      publishBrowserViewCreated: false,
      publishTimer: null,
      publishFillTimer: null,
      publishIndex: 0,
      publishList: [],
      publishProgress: { current: 0, total: 0 },
      publishStarted: false, // 是否已开始发布
      publishProcessing: false, // 是否正在处理当前条目
      publishedHandler: null, // 发布完成事件处理器
      filledHandler: null, // 填表完成事件处理器
      publishLogs: [], // 发布日志
      showExamDrawer: false,
      // 大模型问答相关数据
      aichatMessages: [{ role: 'assistant', content: '你好！有什么问题可以问我。' }],
      aichatInput: '',
      aichatLoading: false,
    };
  },
  computed: {
    paginatedList() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredMaterialList.slice(start, end);
    },
    batchProgressPercent() {
      if (!this.batchProgress.total) return 0;
      return Math.round((this.batchProgress.current / this.batchProgress.total) * 100);
    }
  },
  async mounted() {
    this.loadMaterialList();
    this.doubaoCookie = await this.getCookieByUrl('doubao');

    // 加载保存的设置
    const savedInterval = localStorage.getItem('optimizeInterval');
    if (savedInterval) {
      this.optimizeInterval = parseInt(savedInterval);
    }

    // 加载发布设置
    const savedPublishSettings = localStorage.getItem('publishSettings');
    if (savedPublishSettings) {
      try {
        this.publishSettings = JSON.parse(savedPublishSettings);
      } catch (e) {
        console.error('加载发布设置失败:', e);
      }
    }
  },
  methods: {
    async getCookieByUrl(url) {
      try {
        const res = await this.$axios.post('http://localhost:8000/api/token/getCookieByUrl', { url });
        if (res.data && res.data.code === 200 && res.data.data && res.data.data.cookie) {
          return res.data.data.cookie;
        }
        return '';
      } catch (error) {
        console.error(`获取 ${url} cookie 失败:`, error);
        return '';
      }
    },

    async loadMaterialList() {
      this.loading = true;
      try {
        const params = {
          page: 1,
          pageNum: 9999,
          conditions: {},
          orderBy: {
            column: "id",
            type: "desc",
          },
          optimize_status: this.activeTab  // 1: 未优化, 2: 已优化
        };
        const res = await this.$axios.post('http://localhost:8000/api/virtual/get', params);
        this.materialList = res.data.result.list || [];
        this.filteredMaterialList = this.materialList;
        this.selectedRows = [];  // 切换tab时清空选中
      } catch (error) {
        console.error("Failed to load material list:", error);
      } finally {
        this.loading = false;
      }
    },

    handleTabChange(tab) {
      this.activeTab = tab;
      this.currentPage = 1;
      this.loadMaterialList();
    },

    handleAdd() {
      this.resetForm();
      this.showAddModal = true;
    },

    async handleEdit(row) {
      try {
        const res = await this.$axios.post('http://localhost:8000/api/virtual/detail', { id: row.id });
        if (res.data && res.data.code === 200 && res.data.data) {
          const detail = res.data.data;
          this.materialForm = {
            id: detail.id,
            virtual_id: detail.virtual_id || "",
            material_name: detail.name || detail.material_name || "",
            origin_title: detail.origin_title || "",
            online_url: detail.online_url || "",
            buy_url: detail.buy_url || "",
            desc: detail.desc || "",
            pic: detail.pic || "",
            price: detail.price || "",
            original_price: detail.old_price || detail.original_price || "",
            way: detail.post_way === '包邮' ? 0 : (detail.post_way === '一口价' ? 2 : 3),
            selfPickup: detail.selfPickup ?? false,
            type: detail.type || ""
          };

          // 解析图片
          this.uploadedImages = [];
          if (detail.pic) {
            console.log('原始 pic 字段:', detail.pic);
            const pics = detail.pic.split(',').filter(p => p.trim());
            console.log('分割后的图片数组:', pics);
            pics.forEach(picPath => {
              const trimmedPath = picPath.trim();
              const url = this.getLocalFileUrl(trimmedPath);
              console.log('图片路径:', trimmedPath, '-> URL:', url);
              this.uploadedImages.push({
                path: trimmedPath,
                url: url,
                name: trimmedPath.split('\\').pop() || trimmedPath.split('/').pop()
              });
            });
            console.log('最终 uploadedImages:', this.uploadedImages);
          }

          this.showAddModal = true;
        } else {
          this.$message.error(res.data?.message || '获取详情失败');
        }
      } catch (error) {
        console.error('获取详情失败:', error);
        this.$message.error('获取详情失败: ' + error.message);
      }
    },

    resetForm() {
      this.materialForm = {
        id: null,
        virtual_id: "",
        material_name: "",
        origin_title: "",
        online_url: "",
        buy_url: "",
        desc: "",
        pic: "",
        price: "2",
        original_price: "200",
        way: 3,
        selfPickup: false,
        type: "电子资料"
      };
      this.uploadedImages = [];
    },

    async handleDeleteMaterial(row) {
      try {
        await this.$confirm('确定要删除这条记录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const params = { id: row.id };
        const res = await this.$axios.post('http://localhost:8000/api/virtual/delete', params);
        if (res.data && res.data.code === 200) {
          this.$message.success("删除成功");
          this.loadMaterialList();
        } else {
          this.$message.error("删除失败");
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error("删除资料失败:", error);
          this.$message.error("删除失败: " + error.message);
        }
      }
    },

    async handleBatchDelete() {
      if (this.selectedRows.length === 0) {
        this.$message.warning('请先选择要删除的记录');
        return;
      }

      try {
        await this.$confirm(`确定要删除选中的 ${this.selectedRows.length} 条记录吗？`, '批量删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const ids = this.selectedRows.map(row => row.id);
        const res = await this.$axios.post('http://localhost:8000/api/virtual/batch_delete', { ids });

        if (res.data && res.data.code === 200) {
          this.$message.success(`成功删除 ${res.data.result.success} 条记录`);
          this.selectedRows = [];
          this.loadMaterialList();
        } else {
          this.$message.error(res.data?.message || "批量删除失败");
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error("批量删除失败:", error);
          this.$message.error("批量删除失败: " + error.message);
        }
      }
    },

    handleSelectionChange(selection) {
      this.selectedRows = selection;
    },

    getRowKey(row) {
      return row.id;
    },

    async saveVirtual() {
      // 验证必填字段
      if (!this.materialForm.material_name) {
        this.$message.error('请输入资料名称');
        return;
      }
      if (!this.materialForm.type) {
        this.$message.error('请选择类型');
        return;
      }
      if (!this.materialForm.price) {
        this.$message.error('请输入价格');
        return;
      }

      this.submitting = true;
      try {
        // 处理图片路径
        const picPaths = this.uploadedImages.map(img => img.path).join(',');

        // 处理发货方式
        const postWayMap = {
          0: '包邮',
          2: '一口价',
          3: '无需邮寄'
        };

        const params = {
          name: this.materialForm.material_name,
          online_url: this.materialForm.online_url || '',
          buy_url: this.materialForm.buy_url || '',
          pic: picPaths,
          desc: this.materialForm.desc || '',
          type: this.materialForm.type,
          price: this.materialForm.price,
          old_price: this.materialForm.original_price || '',
          post_way: postWayMap[this.materialForm.way]
        };

        let res;
        if (this.materialForm.id) {
          // 编辑
          params.id = this.materialForm.id;
          res = await this.$axios.post('http://localhost:8000/api/virtual/update', params);
        } else {
          // 新增
          res = await this.$axios.post('http://localhost:8000/api/virtual/add', params);
        }

        if (res.data && res.data.code === 200) {
          this.$message.success(this.materialForm.id ? '编辑成功' : '新增成功');
          this.showAddModal = false;
          this.resetForm();
          this.loadMaterialList();
        } else {
          this.$message.error(res.data?.message || '保存失败');
        }
      } catch (error) {
        console.error('保存资料失败:', error);
        this.$message.error('保存失败: ' + error.message);
      } finally {
        this.submitting = false;
      }
    },

    async copyToClipboard(row) {
      try {
        const textToCopy = `【${row.name || row.material_name}】\n${row.online_url}`;
        await navigator.clipboard.writeText(textToCopy);
        this.$message.success("已复制到剪贴板");
      } catch (error) {
        console.error("复制失败:", error);
        this.$message.error("复制失败");
      }
    },

    async copyOnlineUrl() {
      try {
        if (!this.materialForm.online_url) {
          this.$message.warning("网盘地址为空");
          return;
        }
        await navigator.clipboard.writeText(this.materialForm.online_url);
        this.$message.success("已复制网盘地址");
      } catch (error) {
        console.error("复制失败:", error);
        this.$message.error("复制失败");
      }
    },

    async copyVirtualId() {
      try {
        if (!this.materialForm.virtual_id) {
          this.$message.warning("Virtual ID 为空");
          return;
        }
        await navigator.clipboard.writeText(this.materialForm.virtual_id);
        this.$message.success("已复制 Virtual ID");
      } catch (error) {
        console.error("复制失败:", error);
        this.$message.error("复制失败");
      }
    },

    async openImageFolder() {
      try {
        if (!this.materialForm.virtual_id) {
          this.$message.warning("Virtual ID 为空，无法打开目录");
          return;
        }
        const folderPath = `D:\\虚拟资料\\${this.materialForm.virtual_id}`;
        const res = await this.$axios.post('http://localhost:8000/api/open-folder', {
          folder_path: folderPath
        });
        if (res.data && res.data.status === 'success') {
          this.$message.success("已打开图片目录");
        } else {
          this.$message.error(res.data?.message || "打开目录失败");
        }
      } catch (error) {
        console.error("打开目录失败:", error);
        this.$message.error("打开目录失败: " + error.message);
      }
    },

    handleImageChange(file) {
      if (file.raw) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.uploadedImages.push({
            path: file.raw.path,
            url: e.target.result,
            name: file.name
          });
        };
        reader.readAsDataURL(file.raw);
      }
    },

    async removeImage(index) {
      const img = this.uploadedImages[index];
      // 如果是已保存的记录（有id），调用后端删除本地文件
      if (this.materialForm.id && img.path && !img.path.startsWith('data:')) {
        try {
          const res = await this.$axios.post('http://localhost:8000/api/virtual/delete_image', {
            id: this.materialForm.id,
            image_path: img.path
          });
          if (res.data && res.data.code === 200) {
            this.$message.success('图片已删除');
          } else {
            this.$message.warning(res.data?.message || '删除本地图片失败，仅从列表移除');
          }
        } catch (error) {
          console.error('删除图片失败:', error);
          this.$message.warning('删除本地图片失败，仅从列表移除');
        }
      }
      this.uploadedImages.splice(index, 1);
    },

    previewUploadImage(index) {
      this.uploadPreviewIndex = index;
      this.showUploadPreview = true;
    },

    getLocalFileUrl(filePath) {
      if (!filePath) return '';
      if (filePath.startsWith('data:') || filePath.startsWith('http') || filePath.startsWith('file:')) {
        return filePath;
      }
      return 'file:///' + filePath.replace(/\\/g, '/');
    },

    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
    },

    handleCurrentChange(val) {
      this.currentPage = val;
    },

    getFirstPic(pic) {
      if (!pic) return '';
      const first = pic.split(',').filter(p => p.trim())[0];
      return first ? this.getLocalFileUrl(first.trim()) : '';
    },

    getAllPics(pic) {
      if (!pic) return [];
      return pic.split(',').filter(p => p.trim()).map(p => this.getLocalFileUrl(p.trim()));
    },

    getTableIndex(index) {
      return (this.currentPage - 1) * this.pageSize + index + 1;
    },

    showPicPreview(row) {
      this.previewPics = this.getAllPics(row.pic);
      this.showPicModal = true;
    },

    async handleAiOptimize() {
      if (!this.materialForm.origin_title) {
        this.$message.warning('请先输入原来标题');
        return;
      }
      this.aiOptimizing = true;
      try {
        const prompt = `请将以下淘宝虚拟商品标题优化为更适合发布的标题。
要求：
1. 保留核心关键词
2. 语句通顺，吸引人
3. 长度在30-60字
4. 返回JSON格式：{"origin_title": "原标题", "name": "优化后的标题"}
5. 可以添加一些修饰语
原标题：${this.materialForm.origin_title}

只返回JSON，不要其他内容。`;

        const dsToken = await this.getCookieByUrl('ds');
        if (!dsToken) throw new Error('未配置 DeepSeek Token');

        const res = await this.$axios.post('http://localhost:8000/api/ds/aiAsk', { prompt, token: dsToken });
        if (res.data && res.data.code === 200 && res.data.data) {
          let result = res.data.data;
          if (typeof result === 'string') {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            }
          }
          if (result.name) {
            this.materialForm.material_name = result.name;
            this.$message.success('AI优化标题成功');
          } else {
            this.$message.warning('AI未返回有效标题');
          }
        } else {
          this.$message.error('AI优化失败');
        }
      } catch (error) {
        console.error('AI优化标题失败:', error);
        this.$message.error('AI优化失败: ' + error.message);
      } finally {
        this.aiOptimizing = false;
      }
    },

    async handleAiDesc() {
      if (!this.materialForm.material_name) {
        this.$message.warning('请先输入资料名称');
        return;
      }
      this.aiDescLoading = true;
      try {
        const name = this.materialForm.material_name;
        const type = this.materialForm.type || '虚拟商品';
        const prompt = `你是一位资深的淘宝电商文案策划师，擅长撰写高转化率的商品描述。请根据以下商品信息，生成一段专业、有吸引力的淘宝商品描述。

商品名称：${name}
商品类型：${type}

要求：
1. 描述要突出商品的核心卖点和价值，让买家感受到物超所值
2. 语言简洁有力，善用数字和具体细节增强说服力
3. 包含适当的情感驱动词汇，激发购买欲望
4. 适合淘宝/闲鱼平台的风格，接地气但是也需专业感
5. 描述在100-200字
6. 同时生成一个优化后的标题（30-60字，包含核心搜索关键词）
7. 不要有emoji表情，需要分点，比如 1、描述1 换行（用换行符） 2、描述2

请严格按照以下JSON格式返回，不要返回其他任何内容：
{"title":"优化后的标题","desc":"商品描述"}`;

        const dsToken = await this.getCookieByUrl('ds');
        if (!dsToken) throw new Error('未配置 DeepSeek Token');

        const res = await this.$axios.post('http://localhost:8000/api/ds/aiAsk', { prompt, token: dsToken });
        if (res.data && res.data.code === 200 && res.data.data) {
          let result = res.data.data;
          if (typeof result === 'string') {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            }
          }
          if (result.desc) {
            this.materialForm.desc = result.desc;
            this.$message.success('AI生成描述成功');
          }
        } else {
          this.$message.error('AI生成描述失败');
        }
      } catch (error) {
        console.error('AI生成描述失败:', error);
        this.$message.error('AI生成描述失败: ' + error.message);
      } finally {
        this.aiDescLoading = false;
      }
    },

    async handleAiOneClick() {
      if (!this.materialForm.origin_title) {
        this.$message.warning('请先输入原来标题');
        return;
      }
      this.aiOneClickLoading = true;
      try {
        // 1. 先AI优化标题
        await this.handleAiOptimize();
        // 2. 再AI生成描述（依赖优化后的标题）
        await this.handleAiDesc();
        this.$message.success('一键优化完成');
      } catch (error) {
        console.error('一键优化失败:', error);
        this.$message.error('一键优化失败: ' + error.message);
      } finally {
        this.aiOneClickLoading = false;
      }
    },

    async handleChatSend() {
      if (!this.chatInput.trim()) return;
      const userMsg = this.chatInput.trim();
      this.chatMessages.push({ role: 'user', content: userMsg });
      this.chatInput = "";
      this.chatLoading = true;
      try {
        if (!this.doubaoCookie) {
          this.chatMessages.push({ role: 'assistant', content: '获取豆包 Cookie 失败，请检查配置' });
          this.chatLoading = false;
          return;
        }
        const res = await this.$axios.post('http://localhost:8000/ai/doubao/chat/completions', {
          cookie: this.doubaoCookie,  // 改为 cookie 参数
          messages: this.chatMessages.map(m => ({ role: m.role, content: m.content })),
        });
        if (res.data && res.data.code === 200 && res.data.data) {
          const content = res.data.data.choices?.[0]?.message?.content || '无回复';
          this.chatMessages.push({ role: 'assistant', content });
        } else {
          this.chatMessages.push({ role: 'assistant', content: '请求失败: ' + (res.data?.message || '未知错误') });
        }
      } catch (error) {
        this.chatMessages.push({ role: 'assistant', content: '请求异常: ' + error.message });
      } finally {
        this.chatLoading = false;
        this.$nextTick(() => {
          const el = this.$refs.chatMessages;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
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
        const tokenRes = await this.$axios.post('http://localhost:8000/api/token/getCookieByUrl', { url: 'ds' });
        const dsToken = tokenRes?.data?.data?.cookie || '';
        if (!dsToken) throw new Error('未配置 DeepSeek Token');

        // 添加空的助手消息用于流式输出
        this.aichatMessages.push({ role: 'assistant', content: '' });
        const assistantIndex = this.aichatMessages.length - 1;

        const { fetchEventSource } = await import('@microsoft/fetch-event-source');
        await fetchEventSource('http://localhost:8000/api/ds/aichat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dsToken}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userMessage }],
            stream: true
          }),
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
    // 清理消息内容中的标记
    cleanMessageContent(content) {
      if (!content) return '';
      // 移除 FINISHED[DONE]、FINISHED、[DONE] 等标记
      return content.replace(/FINISHED\s*\[DONE\]|FINISHED|\[DONE\]/gi, '').trim();
    },
    // 渲染 Markdown（简单实现）
    renderMarkdown(content) {
      if (!content) return '';
      // 简单的 markdown 渲染：代码块、行内代码、粗体、斜体、链接、换行
      let html = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // 代码块
      html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      // 行内代码
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      // 粗体
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // 斜体
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // 链接
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      // 换行
      html = html.replace(/\n/g, '<br>');
      return html;
    },

    async handleGenerateImage() {
      if (!this.materialForm.material_name) {
        this.$message.warning('请先输入资料名称');
        return;
      }
      this.generatingImage = true;
      try {
        if (!this.doubaoCookie) {
          this.$message.error('获取豆包 Cookie 失败，请检查配置');
          this.generatingImage = false;
          return;
        }
        const prompt = `帮我生成图片：${this.materialForm.material_name}\n生成一张淘宝商品主图`;
        const res = await this.$axios.post('http://localhost:8000/ai/doubao/images/generations', {
          cookie: this.doubaoCookie,  // 改为 cookie 参数
          prompt: prompt,
          material_name: this.materialForm.virtual_id || this.materialForm.material_name,
          ratio: '1:1',
          style: ''
        });
        if (res.data && res.data.code === 200 && res.data.data) {
          const savedPaths = res.data.data.saved_paths || [];
          if (savedPaths.length > 0) {
            savedPaths.forEach(p => {
              this.uploadedImages.push({
                path: p,
                url: 'file:///' + p.replace(/\\/g, '/'),
                name: p.split('\\').pop() || p.split('/').pop()
              });
            });

            // 如果是编辑模式（有id），立即更新数据库中的图片字段
            if (this.materialForm.id) {
              try {
                const picPaths = this.uploadedImages.map(img => img.path).join(',');
                await this.$axios.post('http://localhost:8000/api/virtual/update', {
                  id: this.materialForm.id,
                  pic: picPaths
                });

                // 更新列表中对应行的数据
                const item = this.materialList.find(m => m.id === this.materialForm.id);
                if (item) {
                  item.pic = picPaths;
                }

                this.$message.success('AI图片生成成功并已保存');
              } catch (error) {
                console.error('保存图片路径失败:', error);
                this.$message.success('AI图片生成成功（请手动保存）');
              }
            } else {
              this.$message.success('AI图片生成成功');
            }
          } else if (res.data.data.images && res.data.data.images.length > 0) {
            res.data.data.images.forEach(imgUrl => {
              this.uploadedImages.push({
                path: imgUrl,
                url: imgUrl,
                name: 'ai_generated.png'
              });
            });
            this.$message.success('AI图片生成成功（未保存到本地）');
          } else {
            this.$message.warning('AI未返回图片');
          }
        } else {
          this.$message.error(res.data?.message || 'AI生成图片失败');
        }
      } catch (error) {
        console.error('AI生成图片失败:', error);
        this.$message.error('AI生成图片失败: ' + error.message);
      } finally {
        this.generatingImage = false;
      }
    },

    async handleCrawl() {
      try {
        await this.$confirm('确定要开始爬取商品吗？将爬取所有页面，这可能需要较长时间。', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        this.crawling = true;

        const res = await this.$axios.post('http://localhost:8000/api/virtual/crawl_tbxnc', {
          max_pages: null  // null 表示爬取所有页
        });

        if (res.data && res.data.code === 200) {
          const result = res.data.result;
          this.$message.success(`爬取完成！总计: ${result.total}, 成功: ${result.success}, 失败: ${result.failed}, 跳过: ${result.skipped}`);
          this.loadMaterialList();
        } else {
          this.$message.error(res.data?.message || '爬取失败');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('爬取失败:', error);
          this.$message.error('爬取失败: ' + error.message);
        }
      } finally {
        this.crawling = false;
      }
    },

    async handlePublish() {
      try {
        // 检查发布模式
        if (this.publishSettings.mode === 2) {
          // 获取勾选的数据列表
          this.publishList = [...this.selectedRows];

          if (this.publishList.length === 0) {
            this.$message.warning('请先勾选要发布的数据');
            return;
          }

          this.publishProgress = { current: 0, total: this.publishList.length };
          this.publishIndex = 0;
          this.publishStarted = false; // 初始化为未开始
          this.showPublishDialog = true;

          // 等待弹窗渲染完成后初始化BrowserView
          this.$nextTick(() => {
            this.initPublishBrowserView();
          });
        } else {
          // 其他模式
          await this.$confirm('确定要开始一键发布吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          });

          this.$message.info('该发布模式开发中...');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('发布失败:', error);
          this.$message.error('发布失败: ' + error.message);
        }
      }
    },

    async handleBatchOptimize() {
      if (!this.doubaoCookie) {
        this.$message.error('获取豆包 Cookie 失败，请检查配置');
        return;
      }

      this.batchOptimizing = true;
      this.batchFinished = false;
      this.batchProgress = { running: true, total: 0, current: 0, finished: false };
      this.batchItemStatus = {};

      try {
        const res = await this.$axios.post('http://localhost:8000/api/virtual/batch_optimize', {
          optimize_interval: this.optimizeInterval,
          optimize_status: '1',  // 只优化未优化的数据
          cookie: this.doubaoCookie  // 改为 cookie 参数
        });
        if (res.data && res.data.code === 200) {
          this.$message.success('批量优化任务已启动');
          this.connectBatchWs();
        } else {
          this.$message.error(res.data?.message || '启动失败');
          this.batchOptimizing = false;
        }
      } catch (error) {
        console.error('启动批量优化失败:', error);
        this.$message.error('启动批量优化失败: ' + error.message);
        this.batchOptimizing = false;
      }
    },

    saveSettings() {
      localStorage.setItem('optimizeInterval', this.optimizeInterval);
      this.$message.success('设置已保存');
      this.showSettingsModal = false;
    },

    savePublishSettings() {
      localStorage.setItem('publishSettings', JSON.stringify(this.publishSettings));
      this.$message.success('发布设置已保存');
      this.showPublishSettingsModal = false;
    },

    // 初始化发布BrowserView
    initPublishBrowserView() {
      const bounds = this.getPublishContainerBounds();
      if (!bounds) return;

      this.$ipc.send("create-browser-view", {
        viewId: this.publishViewId,
        bounds: bounds,
      });

      const readyHandler = (event, returnedViewId) => {
        if (returnedViewId === this.publishViewId) {
          // 立即移除监听，防止重复触发
          if (this.$ipc.removeListener) {
            this.$ipc.removeListener('browser-view-ready', readyHandler);
          }

          // 根据选择的平台加载对应的URL
          let url = 'https://www.goofish.com/publish'; // 默认闲鱼
          if (this.publishSettings.platforms.includes(2)) {
            url = 'https://myseller.taobao.com/home.htm/QnworkbenchHome/';
          }

          this.$ipc.send("load-url", {
            url: url,
            viewId: this.publishViewId,
            bounds: bounds,
          });
          this.publishBrowserViewCreated = true;
        }
      };
      this.$ipc.on('browser-view-ready', readyHandler);
    },

    // 获取发布容器的位置和尺寸
    getPublishContainerBounds() {
      const container = this.$refs.publishWebpageContainer;
      if (!container) {
        console.error("找不到发布容器");
        return null;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.error("发布容器尺寸无效");
        return null;
      }

      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    },

    // 开始发布循环
    startPublishLoop() {
      if (!this.publishBrowserViewCreated) {
        this.$message.warning("浏览器视图未初始化");
        return;
      }

      if (this.publishProcessing) {
        console.log('上一条正在处理中，跳过重复调用');
        return;
      }

      if (this.publishIndex >= this.publishList.length) {
        this.$message.success('所有数据发布完成！');
        this.stopPublish();
        return;
      }

      this.publishProcessing = true;
      const currentItem = this.publishList[this.publishIndex];
      this.publishProgress.current = this.publishIndex + 1;

      // 添加日志
      this.addPublishLog(`正在发布: ${currentItem.name || currentItem.material_name}`, 'info');

      // 填表
      this.fillPublishForm(currentItem);
    },

    // 添加发布日志
    addPublishLog(text, type = 'info') {
      this.publishLogs.push({
        text: `[${new Date().toLocaleTimeString()}] ${text}`,
        type
      });
      // 自动滚动到底部
      this.$nextTick(() => {
        const container = this.$refs.publishLogContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },

    // 手动开始发布
    handleStartPublish() {
      if (!this.publishBrowserViewCreated) {
        this.$message.warning("浏览器视图未初始化，请稍候");
        return;
      }

      // 清理旧的监听器
      if (this.publishedHandler) {
        this.$ipc.removeListener('virtual-published', this.publishedHandler);
      }

      // 只注册一次监听器，在整个发布过程中复用
      this.publishedHandler = (event, data) => {
        if (data.viewId === this.publishViewId) {
          if (data.success) {
            this.addPublishLog('发布成功', 'success');
            console.log(`发布完成，等待 ${this.publishSettings.interval}ms 后执行下一条`);
            this.publishTimer = setTimeout(() => {
              this.publishProcessing = false;
              this.publishIndex++;
              this.startPublishLoop();
            }, this.publishSettings.interval);
          } else {
            // 发布失败（超时或异常），停止发布
            console.error('发布失败:', data.error);
            this.addPublishLog(`发布失败: ${data.error === 'timeout' ? '等待发布按钮超时' : data.error}`, 'error');
            this.$message.error(`发布失败: ${data.error === 'timeout' ? '等待发布按钮超时' : data.error}`);
            this.publishProcessing = false;
            this.publishing = false;
            this.publishStarted = false;
          }
        }
      };
      this.$ipc.on('virtual-published', this.publishedHandler);

      this.publishStarted = true;
      this.publishing = true;
      this.addPublishLog('开始发布...', 'info');
      this.$message.success('开始发布...');
      this.startPublishLoop();
    },

    // 填写发布表单
    fillPublishForm(item) {
      if (!this.publishBrowserViewCreated) {
        this.$message.warning("浏览器视图未初始化");
        return;
      }

      // 解析图片路径
      const pics = item.pic ? item.pic.split(',').map(p => p.trim()).filter(p => p) : [];

      // 先跳转到发布页面
      this.$ipc.send("load-url", {
        url: "https://www.goofish.com/publish",
        viewId: this.publishViewId,
        bounds: this.getPublishContainerBounds(),
      });

      // 清理旧的监听器
      if (this.filledHandler) {
        this.$ipc.removeListener('virtual-filled', this.filledHandler);
      }

      // 取消之前的延迟填表定时器，避免重复
      if (this.publishFillTimer) {
        clearTimeout(this.publishFillTimer);
        this.publishFillTimer = null;
      }

      // 延迟填表，等页面加载完
      this.publishFillTimer = setTimeout(() => {
        this.$ipc.send("fill-virtual", {
          viewId: this.publishViewId,
          desc: item.desc || "",
          price: item.price || "",
          oldPrice: item.old_price || "",
          pics: pics,
          way: item.post_way === '包邮' ? 0 : (item.post_way === '一口价' ? 2 : 3),
          selfPickup: item.selfPickup ?? false,
          type: item.type || ""
        });

        // 监听填写结果（只打印日志，不弹提示，避免刷屏）
        this.filledHandler = (event, result) => {
          if (result.viewId === this.publishViewId) {
            if (result.success) {
              console.log(`${item.name || item.material_name} 填表成功`);
            } else {
              this.$message.error(`${item.name || item.material_name} 填表失败: ` + (result.error || "未知错误"));
            }
          }
        };
        this.$ipc.on('virtual-filled', this.filledHandler);
      }, 5000);
    },

    // 停止发布
    stopPublish() {
      if (this.publishTimer) {
        clearTimeout(this.publishTimer);
        this.publishTimer = null;
      }
      if (this.publishFillTimer) {
        clearTimeout(this.publishFillTimer);
        this.publishFillTimer = null;
      }
      this.publishing = false;
    },

    // 关闭发布弹窗
    handleClosePublishDialog() {
      this.stopPublish();

      // 清理事件监听器
      if (this.publishedHandler) {
        this.$ipc.removeListener('virtual-published', this.publishedHandler);
        this.publishedHandler = null;
      }
      if (this.filledHandler) {
        this.$ipc.removeListener('virtual-filled', this.filledHandler);
        this.filledHandler = null;
      }

      if (this.publishBrowserViewCreated) {
        this.$ipc.send("hide-browser-view", { viewId: this.publishViewId });
        this.$ipc.send("destroy-browser-view", this.publishViewId);
        this.publishBrowserViewCreated = false;
      }
      this.showPublishDialog = false;
      this.publishList = [];
      this.publishIndex = 0;
      this.publishProgress = { current: 0, total: 0 };
      this.publishStarted = false;
      this.publishProcessing = false;
      this.publishLogs = [];
    },

    async handleStopBatchOptimize() {
      // 通过 WebSocket 发送 stop 指令
      if (this.batchWs && this.batchWs.readyState === WebSocket.OPEN) {
        this.batchWs.send('stop');
        this.$message.success('已发送停止请求');
      } else {
        // fallback 用 HTTP
        try {
          await this.$axios.post('http://localhost:8000/api/virtual/batch_optimize_stop', {});
          this.$message.success('已发送停止请求');
        } catch (error) {
          this.$message.error('停止失败: ' + error.message);
        }
      }
    },

    connectBatchWs() {
      if (this.batchWs) {
        this.batchWs.close();
        this.batchWs = null;
      }

      const ws = new WebSocket('ws://localhost:8000/ws/batch_optimize');

      ws.onopen = () => {
        console.log('批量优化 WebSocket 已连接');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'init') {
            // 初始化状态
            this.batchProgress = {
              running: msg.running,
              total: msg.total,
              current: msg.current,
              logs: msg.logs || [],
              finished: msg.finished,
            };
            if (msg.item_status) {
              this.batchItemStatus = { ...msg.item_status };
            }
            if (msg.finished) {
              this.batchOptimizing = false;
              this.batchFinished = true;
            }
          } else if (msg.type === 'log') {
            this.batchProgress.logs.push(msg.message);
            this.$nextTick(() => {
              const el = this.$refs.batchLogContainer;
              if (el) el.scrollTop = el.scrollHeight;
            });
          } else if (msg.type === 'item_status') {
            this.batchItemStatus = { ...this.batchItemStatus, [msg.id]: msg.status };
          } else if (msg.type === 'progress') {
            this.batchProgress.current = msg.current;
            this.batchProgress.total = msg.total;
          } else if (msg.type === 'item_updated') {
            // 更新列表中对应的数据
            const item = this.materialList.find(m => m.id === msg.id);
            if (item) {
              if (msg.name) item.name = msg.name;
              if (msg.desc) item.desc = msg.desc;
              if (msg.pic) item.pic = msg.pic;
            }
          } else if (msg.type === 'finished') {
            this.batchOptimizing = false;
            this.batchFinished = true;
            this.batchProgress.current = msg.current;
            this.batchProgress.total = msg.total;
            this.batchProgress.finished = true;
            this.$message.success('批量优化已完成');
            this.loadMaterialList();
          }
        } catch (e) {
          console.error('解析 WebSocket 消息失败:', e);
        }
      };

      ws.onclose = () => {
        console.log('批量优化 WebSocket 已断开');
      };

      ws.onerror = (err) => {
        console.error('批量优化 WebSocket 错误:', err);
      };

      this.batchWs = ws;
    }
  },

  beforeUnmount() {
    if (this.batchWs) {
      this.batchWs.close();
      this.batchWs = null;
    }
    // 清理发布BrowserView
    if (this.publishBrowserViewCreated) {
      this.$ipc.send("hide-browser-view", { viewId: this.publishViewId });
      this.$ipc.send("destroy-browser-view", this.publishViewId);
      this.publishBrowserViewCreated = false;
    }
    if (this.publishTimer) {
      clearTimeout(this.publishTimer);
      this.publishTimer = null;
    }
  },

  watch: {
    searchKeyword(newVal) {
      this.filteredMaterialList = this.materialList.filter(item => {
        const name = item.name || item.material_name || '';
        const url = item.online_url || '';
        return name.toLowerCase().includes(newVal.toLowerCase()) ||
               url.toLowerCase().includes(newVal.toLowerCase());
      });
      this.currentPage = 1; // 搜索后重置到第一页
    }
  }
};
</script>

<style scoped>
.virtual-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

/* 左右布局 */
.virtual-main-layout {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.virtual-left-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.virtual-right-section {
  width: 450px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
  overflow: hidden;
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

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.search-input {
  width: 300px;
}

.header :deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
  transition: all 0.3s;
}

.header :deep(.el-input__wrapper:hover) {
  border-color: #c4a882;
}

.header :deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
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

.header .el-button--danger {
  background-color: #e8686a;
  border-color: #e8686a;
  border-radius: 10px;
}

.header .el-button--danger:hover {
  background-color: #d8585a;
  border-color: #d8585a;
}

.header .el-button--default {
  background-color: #f5f3f0;
  border-color: #e8e4df;
  color: #6b6560;
  border-radius: 10px;
}

.header .el-button--default:hover {
  background-color: #e8e4df;
  border-color: #d8d4cf;
  color: #5b5650;
}

/* 图片上传相关样式 */
.image-upload-area {
  width: 100%;
}

.image-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.image-preview-item {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: #f5f5f5;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 12px;
  transition: all 0.2s;
}

.image-remove:hover {
  background: rgba(245, 108, 108, 0.9);
}

.image-uploader-card {
  width: 120px;
  height: 120px;
}

.image-uploader-card :deep(.el-upload) {
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  width: 120px;
  height: 120px;
  background: #f5f5f5;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-placeholder:hover {
  background: #ebebeb;
}

.upload-icon {
  font-size: 24px;
  color: #c0c4cc;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  color: #c0c4cc;
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

.pic-link {
  color: #8b9a6d;
  cursor: pointer;
}
.pic-link:hover {
  text-decoration: underline;
}

:deep(.pic-dialog .el-dialog__body) {
  height: 500px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pic-preview-grid {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.pic-preview-box {
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}
.pic-preview-box img {
  height: 100%;
  width: auto;
  display: block;
  object-fit: contain;
}

/* 分页样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
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

/* 警告按钮 */
:deep(.el-button--warning) {
  background-color: #e6a23c;
  border-color: #e6a23c;
  border-radius: 10px;
}

:deep(.el-button--warning:hover) {
  background-color: #d4a03c;
  border-color: #d4a03c;
}

/* 信息按钮 */
:deep(.el-button--info) {
  background-color: #909399;
  border-color: #909399;
  border-radius: 10px;
}

:deep(.el-button--info:hover) {
  background-color: #808389;
  border-color: #808389;
}

/* 成功按钮 */
:deep(.el-button--success) {
  background-color: #67c23a;
  border-color: #67c23a;
  border-radius: 10px;
}

:deep(.el-button--success:hover) {
  background-color: #5cb32f;
  border-color: #5cb32f;
}

/* 抽屉样式优化 */
:deep(.el-drawer) {
  background-color: #faf8f5;
}

:deep(.el-drawer__header) {
  margin-bottom: 20px;
  padding: 20px;
  border-bottom: 1px solid #e8e4df;
}

:deep(.el-drawer__title) {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

:deep(.el-drawer__body) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  color: #3d3d3a;
}

:deep(.el-input__inner) {
  font-size: 16px;
}

:deep(.el-textarea__inner) {
  font-size: 16px;
  border-radius: 10px;
}

/* 大模型问答样式 */
.aichat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.aichat-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e4df;
  background: #f5f3f0;
}

.aichat-title {
  font-size: 16px;
  font-weight: 600;
  color: #6b6560;
}

.aichat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.aichat-messages::-webkit-scrollbar {
  display: none;
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
  color: #1a1a1a;
}

.aichat-typing {
  color: #8e8b82;
}

.aichat-input {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #e8e4df;
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
  color: #6b6560;
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
  border: 1px solid #e8e4df;
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

/* 聊天样式 */
.chat-messages {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 8px;
}
.chat-msg {
  margin-bottom: 12px;
}
.chat-msg.user .chat-msg-role {
  color: #409eff;
  font-weight: 600;
}
.chat-msg.assistant .chat-msg-role {
  color: #67c23a;
  font-weight: 600;
}
.chat-msg-content {
  margin-top: 4px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
}
.chat-msg.user .chat-msg-content {
  background: #ecf5ff;
}

/* 自定义图片预览 */
.custom-image-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.viewer-img {
  max-height: 90vh;
  max-width: 90vw;
  object-fit: contain;
  border-radius: 8px;
  cursor: default;
}
.viewer-close {
  position: absolute;
  top: 16px;
  right: 16px;
  cursor: pointer;
  z-index: 10;
}
.viewer-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  background: rgba(0,0,0,0.4);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-arrow.left { left: 24px; }
.viewer-arrow.right { right: 24px; }
.viewer-arrow:hover { background: rgba(0,0,0,0.6); }

/* 批量优化日志 */
.batch-log-container {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
}
.batch-log-item {
  color: #d4d4d4;
  padding: 2px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  word-break: break-all;
}

/* 发布弹窗内容布局 */
.publish-dialog-content {
  display: flex;
  gap: 20px;
  height: 85vh;
  min-height: 700px;
}

/* 发布控制栏样式 */
.publish-control-bar {
  flex: 0 0 320px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.publish-info {
  padding: 15px;
  background: #fff;
  border-radius: 6px;
}

.publish-progress-text {
  font-weight: 600;
  font-size: 18px;
  color: #409eff;
  display: block;
}

.publish-log {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.publish-log-title {
  padding: 10px 15px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.publish-log-content {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  max-height: 400px;
  font-size: 13px;
  line-height: 1.6;
}

.publish-log-item {
  padding: 6px 10px;
  margin-bottom: 4px;
  border-radius: 4px;
  word-break: break-all;
}

.publish-log-item.info {
  color: #606266;
  background: #f4f4f5;
}

.publish-log-item.success {
  color: #67c23a;
  background: #f0f9ff;
}

.publish-log-item.error {
  color: #f56c6c;
  background: #fef0f0;
}

.publish-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.publish-actions-row {
  display: flex;
  gap: 12px;
}

.publish-actions-row .el-button {
  flex: 1;
}

.publish-actions .el-button {
  width: 100%;
  font-size: 15px;
  padding: 14px 24px;
}

.publish-tip {
  color: #909399;
  font-size: 14px;
  line-height: 1.5;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

/* 发布弹窗样式 */
.browser-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
}

.webpage-container {
  flex: 1;
  width: 100%;
  height: 100%;
}
</style>






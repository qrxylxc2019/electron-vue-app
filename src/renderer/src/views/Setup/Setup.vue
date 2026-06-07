<template>
  <div class="setup-container">
    <el-tabs v-model="activeTab">
      <!-- 图片压缩标签页 -->

      <el-tab-pane label="代理设置" name="proxy">
        <div class="proxy-settings">
          <el-button type="primary" @click="closeProxy">关闭代理</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="图片压缩" name="compress">
        <div class="pic-zip">
          <div class="upload-area">
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              ref="fileInput"
            />
            <div v-if="imageInfo" class="image-info">
              <img :src="previewUrl" class="preview-image" />
              <p>原始大小: {{ formatFileSize(imageInfo.size) }}</p>
            </div>
          </div>

          <div v-if="imageInfo" class="compress-controls">
            <div class="input-group">
              <el-input
                v-model="targetSize"
                type="number"
                placeholder="输入目标大小(KB)"
              >
                <template #append>KB</template>
              </el-input>
            </div>
            <el-button type="primary" @click="compressImage"
              >压缩图片</el-button
            >
          </div>
        </div>
      </el-tab-pane>

      

      <el-tab-pane label="新建项目" name="new_project">
        <div class="project-form">
          <div class="form-item">
            <span class="label">项目名称:</span>
            <el-input v-model="projectName" placeholder="请输入项目名称" />
          </div>

          <div class="form-item">
            <span class="label">项目类型:</span>
            <el-select v-model="projectType" placeholder="请选择项目类型">
              <el-option label="react-h5" value="react_h5" />
              <el-option label="taro" value="taro" />
              <el-option label="vue" value="vue" />
            </el-select>
          </div>

          <div class="form-item">
            <span class="label">项目目录:</span>
            <div class="directory-selector">
              <el-input
                v-model="projectDirectory"
                placeholder="项目保存路径"
                readonly
              />
              <el-button @click="selectDirectory">选择目录</el-button>
            </div>
          </div>

          <div class="form-actions">
            <el-button type="primary" @click="createProject"
              >新建项目</el-button
            >
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="清空回收站" name="clear_recycle">
        <div class="project-manage">
          <el-button type="primary" @click="clearRecycle" :loading="recycleLoading"
            >清空回收站</el-button
          >
        </div>
      </el-tab-pane>

      <el-tab-pane label="脚本" name="script">
        <div class="script-container">
          <el-button type="primary" @click="runScript">运行脚本</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="图片地址设置" name="pic_dir">
        <div class="pic-dir-container">
          <div class="form-item">
            <span class="label">图片存储目录:</span>
            <div class="directory-selector">
              <el-input
                v-model="picDirectory"
                placeholder="请选择图片存储目录"
                readonly
              />
              <el-button @click="selectPicDirectory">选择文件夹</el-button>
            </div>
          </div>
          <div class="form-actions">
            <el-button type="primary" @click="setupPicDir">确定</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="PDF" name="pdf">
        <div class="pdf-container">
          <div class="form-item">
            <div class="file-selector">
              <el-upload
                ref="pdfUpload"
                class="upload-demo"
                action="#"
                :auto-upload="false"
                :show-file-list="true"
                :limit="1"
                accept=".pdf"
                :on-change="handlePdfChange"
                :on-remove="handlePdfRemove"
                :before-upload="resetPdfState"
              >
                <el-button slot="trigger" type="primary" @click="resetPdfState">选择PDF文件</el-button>
                <div slot="tip" class="el-upload__tip">只能传PDF，大小小于100M</div>
              </el-upload>
            </div>
          </div>
          
          <div v-if="selectedPdfPath" class="pdf-info">
            <p><strong>选择的文件:</strong> {{ selectedPdfPath }}</p>
          </div>
          
          <div class="form-actions pdf-actions">
            <el-button 
              type="primary" 
              @click="dealPdf" 
              :disabled="!selectedPdfPath"
              :loading="pdfLoading"
            >
              确定
            </el-button>
          </div>
          
          <div v-if="pdfResult" class="result-container">
            <div class="result-title">拆分结果:</div>
            <div class="result-content">
              <p><strong>原始文件:</strong> {{ pdfResult.original_file }}</p>
              <p><strong>总页数:</strong> {{ pdfResult.original_pages }}</p>
              <p><strong>输出目录:</strong> {{ pdfResult.output_directory }}</p>
              <p><strong>生成文件数:</strong> {{ pdfResult.total_files }}</p>
              
              <div class="files-list">
                <h4>生成的文件:</h4>
                <div v-for="(file, index) in pdfResult.created_files" :key="index" class="file-item">
                  <span class="file-name">{{ file.filename }}</span>
                  <span class="file-pages">({{ file.pages }}页)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    
      <el-tab-pane label="JSON" name="json">
        <div class="json-container">
          <div class="json-editor">
            <div class="json-input">
              <el-input
                type="textarea"
                v-model="jsonInput"
                placeholder="请输入JSON字符串"
                style="height: 900px;"
                @input="formatJson"
              />
              <div v-if="jsonError" class="error-message">
                {{ jsonError }}
              </div>
            </div>
            <div class="json-output">
              <div v-if="treeData" class="tree-container">
                <el-tree
                  :data="treeNodes"
                  :props="treeProps"
                  node-key="id"
                  default-expand-all
                  :highlight-current="true"
                >
                  <template #default="{ node, data }">
                    <span class="custom-tree-node">
                      <span class="tree-label" >{{ node.label }}</span>
                      <span v-if="data.value" class="tree-value">: {{ data.value }}</span>
                    </span>
                  </template>
                </el-tree>
              </div>
              <div v-else class="tree-placeholder">
                树状结构将在这里显示
              </div>
            </div>
          </div>
          <div class="json-actions">
            <el-button type="primary" @click="formatJson">格式化</el-button>
            <el-button @click="clearJson">清空</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="数据库复制" name="copy_db">
        <div class="copy-db-container">
          <div class="form-item">
            <span class="label">源数据库路径:</span>
            <div class="directory-selector">
              <el-input
                v-model="sourceDbPath"
                placeholder="选择数据库文件路径"
                readonly
              />
              <el-button @click="selectSourceDbFile">选择文件</el-button>
            </div>
          </div>
          <div v-if="sourceDbInfo" class="db-info">
            <el-alert
              :title="'文件大小: ' + formatDbSize(sourceDbInfo.file_size)"
              type="success"
              :closable="false"
              show-icon
            />
          </div>
          <div class="form-item">
            <span class="label">目标目录:</span>
            <div class="directory-selector">
              <el-input
                v-model="targetDbDir"
                placeholder="选择复制到的目标目录"
                readonly
              />
              <el-button @click="selectTargetDbDir">选择文件夹</el-button>
            </div>
          </div>
          <div class="form-actions">
            <el-button 
              type="primary" 
              @click="copyDbFile" 
              :loading="copyDbLoading"
              :disabled="!sourceDbPath || !targetDbDir"
            >
              复制数据库
            </el-button>
          </div>
          <div v-if="copyDbResult" class="copy-result">
            <el-alert
              :title="'复制成功！'"
              type="success"
              :closable="false"
              show-icon
            >
              <template #default>
                <p>目标路径: {{ copyDbResult.target_db_path }}</p>
                <p>文件大小: {{ formatDbSize(copyDbResult.file_size) }}</p>
              </template>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="计划表显示设置" name="plan_display">
        <div class="plan-display-settings">
          <div class="form-item">
            <span class="label">计划表显示方式:</span>
            <el-radio-group v-model="planDisplayMode" @change="savePlanDisplayMode">
              <el-radio :label="'drawer'">抽屉显示</el-radio>
              <el-radio :label="'window'">弹出新窗口</el-radio>
            </el-radio-group>
          </div>
          <div class="setting-tip">
            <el-alert
              title="提示"
              type="info"
              description="选择'弹出新窗口'后，计划表将以窗口形式打开"
              :closable="false"
              show-icon
            />
          </div>
        </div>
      </el-tab-pane>

    </el-tabs>
    
  </div>
</template>

<script>
import imageCompression from "browser-image-compression";
import { ipcApiRoute } from "@/api/main";
import CryptoJS from "crypto-js";

export default {
  name: "Setup",
  data() {
    return {
      activeTab: "proxy",
      imageInfo: null,
      previewUrl: "",
      targetSize: null,
      deleteAccount: true,
      showBrowser: true,
      emailType: "163",
      emailAddress: "",
      emailPassword: "",
      pop3Server: "pop.163.com",
      projectName: "",
      projectType: "vue",
      projectDirectory: "",
      logMessages: [],
      socket: null,
      recycleLoading: false,
      tableData: [],
      showPasswords: false,
      currentPage: 1,
      pageNum: 10,
      total: 0,
      searchUrl: "",
      verifyForm: {
        password: "",
      },
      masterPassword: "619619", // 主密码
      debounceTimer: null,
      picDirectory: "", // 图片目录
      selectedPdfPath: "", // 选择的PDF文件路径
      pdfLoading: false, // PDF处理加载状态
      pdfResult: null, // PDF处理结果
      jsonInput: "", // JSON输入
      formattedJson: "", // 格式化后的JSON
      jsonError: "", // JSON错误信息
      treeData: null, // 树状结构数据
      treeNodes: [], // el-tree节点数据
      treeProps: { // el-tree配置
        children: 'children',
        label: 'label'
      },
      planDisplayMode: 'drawer', // 计划表显示方式：drawer-抽屉，window-新窗口
      sourceDbPath: 'D:\\学瑞软件\\out\\fastapi\\数据\\xuerui.db', // 源数据库路径
      targetDbDir: '', // 目标目录
      sourceDbInfo: null, // 源数据库文件信息
      copyDbLoading: false, // 复制数据库加载状态
      copyDbResult: null, // 复制结果
    };
  },
  methods: {
    async clearRecycle() {
      this.recycleLoading = true;
      try {
        const res = await this.$axios.get("http://localhost:8000/api/clear_recycle");
        console.log(res);
        if (res.data.code === 200) {
          this.$message.success(res.data.message);
        } else {
          this.$message.error(res.data.message);
        }
      } catch (error) {
        this.$message.error("清空回收站失败");
      } finally {
        this.recycleLoading = false;
      }
    },
    async changeCursorId() {
      const params = {};
      console.log(params);
      await this.$axios.post("http://localhost:8000/api/change_cursor_id", params);
    },
    async registerCursor() {
      this.logMessages = []; // 清空之前的日志
      
      // 连接WebSocket
      this.connectWebSocket();
      
      const params = {
        deleteAccount: this.deleteAccount,
        showBrowser: this.showBrowser,
        email_address: this.emailAddress,
        password: this.emailPassword,
        pop3_server: this.pop3Server
      };
      console.log(params);
      await this.$axios.post("http://localhost:8000/api/registerCursor", params);
    },
    async stopCursorId() {
      this.logMessages = []; // 清空之前的日志
      
      // 连接WebSocket
      this.connectWebSocket();
      
      await this.$axios.get("http://localhost:8000/api/stop_cursor_id");
    },
    async resetCursorId() {
      this.logMessages = []; // 清空之前的日志
      
      // 连接WebSocket
      this.connectWebSocket();
      
      await this.$axios.post("http://localhost:8000/api/reset_cursor_id");
    },
    // 连接WebSocket方法
    connectWebSocket() {
      // 关闭已存在的连接
      if (this.socket) {
        this.socket.close();
      }
      
      // 创建新的WebSocket连接
      this.socket = new WebSocket("ws://localhost:8000/ws");
      
      // 连接成功回调
      this.socket.onopen = () => {
        console.log("WebSocket连接已建立");
        this.logMessages.push("WebSocket连接已建立");
      };
      
      // 接收消息回调
      this.socket.onmessage = (event) => {
        // 追加新消息到日志
        const messages = event.data.split('\n').filter(msg => msg.trim() !== '');
        for (const msg of messages) {
          this.logMessages.push(msg);
        }
        
        // 自动滚动到底部
        this.$nextTick(() => {
          if (this.$refs.logContent) {
            this.$refs.logContent.scrollTop = this.$refs.logContent.scrollHeight;
          }
        });
      };
      
      // 连接关闭回调
      this.socket.onclose = () => {
        console.log("WebSocket连接已关闭");
        this.logMessages.push("WebSocket连接已关闭");
      };
      
      // 错误处理
      this.socket.onerror = (error) => {
        console.error("WebSocket错误:", error);
        this.logMessages.push("WebSocket连接出错");
      };
    },
    handleFileChange(e) {
      const file = e.target.files[0];
      if (file) {
        this.imageInfo = file;
        this.previewUrl = URL.createObjectURL(file);
      }
    },
    formatFileSize(bytes) {
      const kb = bytes / 1024;
      if (kb < 1024) {
        return kb.toFixed(2) + " KB";
      }
      return (kb / 1024).toFixed(2) + " MB";
    },
    async compressImage() {
      if (!this.imageInfo || !this.targetSize) return;

      try {
        const options = {
          maxSizeMB: this.targetSize / 1024,
          useWebWorker: true,
        };

        const compressedFile = await imageCompression(this.imageInfo, options);

        // 创建下载链接
        const link = document.createElement("a");
        link.href = URL.createObjectURL(compressedFile);
        link.download = "compressed_" + this.imageInfo.name;
        link.click();
      } catch (error) {
        console.error("压缩失败:", error);
        alert("图片压缩失败，请重试");
      }
    },
    async closeProxy() {
      await this.$axios.get("http://localhost:8000/api/close_proxy");
    },
    async selectDirectory() {
      try {
        const result = await this.$ipc.invoke(ipcApiRoute.selectDirectory);
        console.log("result============", result);
        if (result && !result.canceled) {
          this.projectDirectory = result.filePaths[0];
        }
      } catch (error) {
        this.$message.error("选择目录失败：" + error.message);
      }
    },
    async createProject() {
      if (!this.projectName) {
        this.$message.warning("请输入项目名称");
        return;
      }

      if (!this.projectDirectory) {
        this.$message.warning("请选择项目目录");
        return;
      }

      const params = {
        projectName: this.projectName,
        projectType: this.projectType,
        projectDirectory: this.projectDirectory,
      };

      await this.$axios.get("http://localhost:8000/api/new_project", {
        params,
      });

      try {
        this.$message.success("项目新建成功");
        this.projectName = "";
      } catch (error) {
        this.$message.error("创建项目失败：" + error.message);
      }
    },
    async runScript() {
      try {
        await this.$axios.get("http://localhost:8000/api/run_script");
        this.$message.success("脚本执行成功");
      } catch (error) {
        this.$message.error("脚本执行失败：" + error.message);
      }
    },
    async selectPicDirectory() {
      try {
        const result = await this.$ipc.invoke(ipcApiRoute.selectDirectory);
        console.log("选择图片目录结果:", result);
        if (result && !result.canceled) {
          this.picDirectory = result.filePaths[0];
        }
      } catch (error) {
        this.$message.error("选择目录失败：" + error.message);
      }
    },
    async setupPicDir() {
      if (!this.picDirectory) {
        this.$message.warning("请选择图片目录");
        return;
      }

      try {
        const response = await this.$axios.post("http://localhost:8000/api/setPicDir", {
          directory: this.picDirectory
        });
        
        if (response.data.code === 200) {
          this.$message.success("图片目录设置成功");
        } else {
          this.$message.error(response.data.message || "设置失败");
        }
      } catch (error) {
        this.$message.error("设置图片目录失败：" + error.message);
      }
    },
    async getCurrentPicDir() {
      try {
        const response = await this.$axios.get("http://localhost:8000/api/getPicDir");
        if (response.data.code === 200) {
          this.picDirectory = response.data.data.directory;
        }
      } catch (error) {
        console.error("获取当前图片目录失败:", error);
      }
    },
    getPasswordList() {
      const params = {
        conditions: {
          url: this.searchUrl
        },
        page: this.currentPage,
        pageNum: this.pageNum,
        orderBy: {
          column: "id",
          type: "desc",
        },
      };

      this.$axios.post(`http://localhost:8000/api/password/get`, params)
        .then((res) => {
          if (res.data.code === 200) {
            this.tableData = (res.data.result?.list || []).map((item, index) => ({
              ...item,
              index: (this.currentPage - 1) * this.pageNum + index + 1,
              password: this.decryptPassword(item.password)
            }));
            this.total = res.data.result?.pagination?.total || 0;
          } else {
            this.$message.error(res.data.message || "获取数据失败");
          }
        })
        .catch((error) => {
          console.error("获取数据失败:", error);
          this.$message.error("获取数据失败，请稍后重试");
        });
    },
    
    decryptPassword(encryptedPassword) {
      try {
        const bytes = CryptoJS.AES.decrypt(
          encryptedPassword,
          "your-secret-key-123"
        );
        return bytes.toString(CryptoJS.enc.Utf8);
      } catch (error) {
        console.error("解密失败:", error);
        return encryptedPassword;
      }
    },
    
    copyToCursorForm(row) {
      if (!this.showPasswords) {
        this.$message.warning('请先验证主密码查看密码');
        return;
      }
      
      this.emailAddress = row.account;
      this.emailPassword = row.password;
      this.$message.success('已复制到右侧表单');
    },
    handleCurrentChange(val) {
      this.currentPage = val;
      this.getPasswordList();
    },
    // 创建验证密码的防抖函数
    debounce(fn, delay) {
      return (...args) => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          fn.apply(this, args);
        }, delay);
      };
    },
    
    verifyViewPassword() {
      if (this.verifyForm.password === this.masterPassword) {
        this.showPasswords = true;
        this.$message.success("验证成功");
      } else {
        this.showPasswords = false;
        this.$message.error("验证失败");
      }
    },
    
    // PDF处理相关方法
    resetPdfState() {
      // 重置所有PDF相关状态
      this.selectedPdfPath = "";
      this.pdfResult = null;
      this.pdfLoading = false;
      
      // 清空上传组件的文件列表
      if (this.$refs.pdfUpload) {
        this.$refs.pdfUpload.clearFiles();
      }
    },
    
    handlePdfChange(file, fileList) {
      console.log('选择的PDF文件:', file);
      console.log('文件列表:', fileList);
      
      // 如果是新选择的文件，先清空之前的状态
      if (fileList.length > 0) {
        // 重置所有PDF相关状态
        this.selectedPdfPath = "";
        this.pdfResult = null;
        this.pdfLoading = false;
        
        if (file.raw) {
          // 获取文件的本地路径（如果可能）
          // 注意：在浏览器中无法直接获取文件的完整路径，需要用户手动输入
          this.selectedPdfPath = file.raw.path || file.name;
        }
      }
    },
    
    handlePdfRemove(file, fileList) {
      console.log('移除PDF文件:', file);
      this.selectedPdfPath = "";
      this.pdfResult = null;
    },
    
    async dealPdf() {
      if (!this.selectedPdfPath) {
        this.$message.warning("请先选择PDF文件");
        return;
      }
      
      // 如果只是文件名，提示用户输入完整路径
      if (!this.selectedPdfPath.includes('\\') && !this.selectedPdfPath.includes('/')) {
        const fullPath = await this.promptForFullPath();
        if (!fullPath) {
          return;
        }
        this.selectedPdfPath = fullPath;
      }
      
      this.pdfLoading = true;
      
      try {
        const response = await this.$axios.post("http://localhost:8000/api/pdf/deal", {
          pdf_path: this.selectedPdfPath
        });
        
        if (response.data.code === 200) {
          this.$message.success(response.data.message);
          this.pdfResult = response.data.data;
        } else {
          this.$message.error(response.data.message || "PDF处理失败");
        }
      } catch (error) {
        console.error('PDF处理错误:', error);
        this.$message.error("处理PDF文件失败：" + (error.response?.data?.detail || error.message));
      } finally {
        this.pdfLoading = false;
      }
    },
    
    async promptForFullPath() {
      return new Promise((resolve) => {
        this.$prompt('请输入PDF文件的完整路径:', '路径输入', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: this.selectedPdfPath,
          inputPlaceholder: '例如: D:\\documents\\example.pdf'
        }).then(({ value }) => {
          resolve(value);
        }).catch(() => {
          resolve(null);
        });
      });
    },

    // JSON格式化方法
    formatJson() {
      this.jsonError = "";
      this.formattedJson = "";
      
      if (!this.jsonInput.trim()) {
        return;
      }
      
      try {
        // 尝试解析JSON
        const jsonObj = JSON.parse(this.jsonInput);
        // 格式化输出，使用2个空格缩进
        this.formattedJson = JSON.stringify(jsonObj, null, 2);
        // 生成树状结构显示
        this.generateTreeView(jsonObj);
      } catch (error) {
        // 如果解析失败，尝试修复常见的JSON格式问题
        try {
          const fixedJson = this.fixJsonString(this.jsonInput);
          const jsonObj = JSON.parse(fixedJson);
          this.formattedJson = JSON.stringify(jsonObj, null, 2);
          this.generateTreeView(jsonObj);
        } catch (fixError) {
          this.jsonError = "JSON格式错误: " + error.message;
          this.formattedJson = "";
        }
      }
    },
    
    // 修复常见的JSON格式问题
    fixJsonString(jsonString) {
      // 处理缺少引号的属性名（如 {name: "value"} -> {"name": "value"}）
      let fixed = jsonString.replace(/([\w]+)(\s*:)/g, '"$1"$2');
      // 处理缺少引号的字符串值（如 : value -> : "value"）
      fixed = fixed.replace(/(:\s*)([^\s"'{}\[\],]+)(?=\s*[,}])/g, '$1"$2"');
      return fixed;
    },
    
    // 生成树状结构显示
    generateTreeView(jsonObj) {
      // 设置树状结构数据并转换为el-tree格式
      this.treeData = jsonObj;
      this.treeNodes = this.convertToTreeNodes(jsonObj);
    },
    
    // 将JSON对象转换为el-tree节点格式
    convertToTreeNodes(obj, parentPath = '') {
      const nodes = [];
      let idCounter = 0;
      
      const processValue = (value, key, path) => {
        const id = `${path}-${idCounter++}`;
        
        if (typeof value === 'object' && value !== null) {
          // 对象或数组
          const children = this.convertToTreeNodes(value, path);
          return {
            id,
            label: key,
            children
          };
        } else {
          // 基本类型值
          return {
            id,
            label: key,
            value: this.formatValue(value)
          };
        }
      };
      
      if (Array.isArray(obj)) {
        // 处理数组
        obj.forEach((item, index) => {
          const node = processValue(item, `[${index}]`, `${parentPath}[${index}]`);
          nodes.push(node);
        });
      } else if (typeof obj === 'object' && obj !== null) {
        // 处理对象
        Object.keys(obj).forEach(key => {
          const node = processValue(obj[key], key, `${parentPath}.${key}`);
          nodes.push(node);
        });
      }
      
      return nodes;
    },
    
    // 格式化值显示
    formatValue(value) {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'string') return `"${value}"`;
      return String(value);
    },
    
    // 清空JSON内容
    clearJson() {
      this.jsonInput = "";
      this.formattedJson = "";
      this.jsonError = "";
      this.treeData = null;
      this.treeNodes = [];
    },
    
    // 数据库复制相关方法
    async selectSourceDbFile() {
      try {
        const result = await this.$ipc.invoke(ipcApiRoute.selectDirectory);
        console.log('选择源数据库目录结果:', result);
        if (result && !result.canceled) {
          const dir = result.filePaths[0];
          // 在目录下找 .db 文件
          this.sourceDbPath = dir;
          // 查询默认路径信息
          this.checkSourceDb();
        }
      } catch (error) {
        this.$message.error('选择目录失败：' + error.message);
      }
    },
    async selectTargetDbDir() {
      try {
        const result = await this.$ipc.invoke(ipcApiRoute.selectDirectory);
        console.log('选择目标目录结果:', result);
        if (result && !result.canceled) {
          this.targetDbDir = result.filePaths[0];
        }
      } catch (error) {
        this.$message.error('选择目录失败：' + error.message);
      }
    },
    async checkSourceDb() {
      try {
        const response = await this.$axios.get('http://localhost:8000/api/setting/getDefaultDbPath');
        if (response.data.code === 200) {
          this.sourceDbInfo = response.data.data;
          // 如果后端返回的路径存在，更新为后端返回的路径
          if (this.sourceDbInfo.exists) {
            this.sourceDbPath = this.sourceDbInfo.db_path;
          }
        }
      } catch (error) {
        console.error('获取数据库路径信息失败:', error);
      }
    },
    async copyDbFile() {
      if (!this.sourceDbPath) {
        this.$message.warning('请选择源数据库路径');
        return;
      }
      if (!this.targetDbDir) {
        this.$message.warning('请选择目标目录');
        return;
      }
      
      this.copyDbLoading = true;
      this.copyDbResult = null;
      
      try {
        const response = await this.$axios.post('http://localhost:8000/api/setting/copyDbFile', {
          source_db_path: this.sourceDbPath,
          target_dir: this.targetDbDir
        });
        
        if (response.data.code === 200) {
          this.$message.success(response.data.message);
          this.copyDbResult = response.data.data;
        } else {
          this.$message.error(response.data.message || '复制失败');
        }
      } catch (error) {
        console.error('复制数据库失败:', error);
        this.$message.error('复制数据库失败：' + (error.response?.data?.detail || error.message));
      } finally {
        this.copyDbLoading = false;
      }
    },
    formatDbSize(bytes) {
      if (!bytes) return '0 B';
      const kb = bytes / 1024;
      if (kb < 1024) {
        return kb.toFixed(2) + ' KB';
      }
      const mb = kb / 1024;
      if (mb < 1024) {
        return mb.toFixed(2) + ' MB';
      }
      return (mb / 1024).toFixed(2) + ' GB';
    },
    
    // 保存计划表显示设置到 localStorage
    savePlanDisplayMode() {
      console.log('保存计划表显示设置:', this.planDisplayMode);
      localStorage.setItem('planDisplayMode', this.planDisplayMode);
      this.$message.success('设置已保存');
    },
    
    // 从 localStorage 读取计划表显示设置
    loadPlanDisplayMode() {
      const savedMode = localStorage.getItem('planDisplayMode');
      console.log('读取计划表显示设置:', savedMode);
      if (savedMode) {
        this.planDisplayMode = savedMode;
      }
    },
  },
  watch: {
    emailType(newType) {
      // 根据选择的邮箱类型自动设置POP3服务器
      if (newType === '163') {
        this.pop3Server = 'pop.163.com';
      } else if (newType === 'qq') {
        this.pop3Server = 'pop.qq.com';
      }
    }
  },
  mounted() {
    // 初始化获取密码列表
    this.getPasswordList();
    // 创建验证密码的防抖函数
    this.debouncedVerifyPassword = this.debounce(this.verifyViewPassword, 500);
    // 获取当前图片目录
    this.getCurrentPicDir();
    // 获取默认数据库路径信息
    this.checkSourceDb();
    // 读取计划表显示设置
    this.loadPlanDisplayMode();
  },
  // 组件销毁时关闭WebSocket连接
  beforeDestroy() {
    if (this.socket) {
      this.socket.close();
    }
    // 清除定时器
    clearTimeout(this.debounceTimer);
  }
};
</script>

<style scoped>
.setup-container {
  padding: 16px;
}

.pic-zip {
  padding: 20px;
}

.upload-area {
  margin-bottom: 20px;
}

.preview-image {
  max-width: 300px;
  max-height: 300px;
  margin: 10px 0;
}

.image-info {
  margin-top: 10px;
}

.compress-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

input[type="number"] {
  width: 120px;
  padding: 5px;
}

button {
  padding: 5px 15px;
  cursor: pointer;
}

.proxy-settings {
  padding: 20px 0;
}
.switch-group {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 15px;
}

.email-settings {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  min-width: 180px;
  text-align: right;
}

.button-group {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.project-form {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  width: 800px;
  gap: 20px;
}

.directory-selector {
  display: flex;
  flex: 1;
  gap: 10px;
}

.form-actions {
  margin-top: 10px;
  padding-left: 90px;
}

.pdf-actions {
  padding-left: 0;
}

.output {
  background: #eee;
  color: #000;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 20px;
}

.output pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-container {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.log-title {
  font-weight: bold;
  margin-bottom: 10px;
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
}

.log-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.content-layout {
  display: flex;
  gap: 20px;
}

.table-container {
  flex: 1;
  width: 50%;
}

.form-container {
  flex: 1;
  width: 50%;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eaeaea;
}

.account-password-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.account-password-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.account {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 4px;
}

.password {
  font-size: 12px;
  color: #909399;
}

:deep(.el-table) {
  font-size: 16px;
}

:deep(.el-table__header-wrapper th) {
  background-color: #e6f1fc !important;
}

.operation-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.pic-dir-container {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  width: 800px;
  gap: 20px;
}

.pdf-container {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  width: 800px;
  gap: 20px;
}

.file-selector {
  display: flex;
  flex: 1;
  gap: 10px;
}

.pdf-info {
  background-color: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
}

.pdf-info p {
  margin: 5px 0;
}

.tip-text {
  color: #6b7280;
  font-size: 14px;
  font-style: italic;
}

.result-container {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: #f9fafb;
}

.result-title {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
  color: #374151;
}

.result-content p {
  margin: 8px 0;
  color: #4b5563;
}

.files-list {
  margin-top: 15px;
}

.files-list h4 {
  margin: 10px 0;
  color: #374151;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin: 5px 0;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.file-name {
  font-weight: 500;
  color: #1f2937;
}

.file-pages {
  color: #6b7280;
  font-size: 14px;
}



.json-editor {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.json-input,
.json-output {
  flex: 1;
  width: 50%;
  min-width: 0; /* 允许flex项目缩小到内容宽度以下 */
}

.json-output {
  height:985px
}

.json-input h4,
.json-output h4 {
  margin-bottom: 10px;
  color: #303133;
}

.json-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.error-message {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 5px;
}

.tree-view {
  margin-top: 20px;
}

.tree-container {
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  padding: 10px;
  background-color: #f9f9f9;
  height: 985px;
  overflow-y: auto;
}

.custom-tree-node {
  display: flex;
  align-items: flex-start;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 25px;
  width: 100%;
  flex-wrap: wrap; /* 允许换行 */
  line-height: 1.4; /* 设置行高 */
  padding: 2px 0; /* 增加上下间距 */
}

.tree-label {
  color: #881391;
  font-weight: 500;
  flex-shrink: 0; /* 防止label被压缩 */
}

.tree-value {
  color: #1a1a1a;
  margin-left: 5px;
  word-break: break-all; /* 长单词或URL会自动换行 */
  white-space: pre-wrap; /* 保留空格并允许换行 */
  overflow-wrap: break-word; /* 在必要时断词 */
  flex: 1; /* 占据剩余空间 */
  min-width: 0; /* 允许缩小 */
}

.tree-placeholder {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* el-tree 自定义样式 */
:deep(.el-tree) {
  background: transparent;
}

:deep(.el-tree-node__content) {
  min-height: 35px;
  height: auto; /* 自适应高度 */
  padding: 8px 0; /* 增加上下内边距 */
  line-height: 1.4; /* 设置行高 */
}

:deep(.el-tree-node:focus > .el-tree-node__content) {
  background-color: #f0f7ff;
}
:deep(.el-textarea__inner){
  height: 985px!important;
  font-size: 25px;
}

.copy-db-container {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  width: 800px;
  gap: 20px;
}

.copy-db-container .db-info {
  padding-left: 190px;
}

.copy-db-container .copy-result p {
  margin: 5px 0;
  font-size: 14px;
}

</style>

<template>
  <div class="virtual-container">
    <div class="material-content-wrapper">
      <div class="list-container">
        <el-tabs v-model="activeTabName" class="material-tabs">
          <el-tab-pane label="资料列表" name="list">
            <div class="top-div">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索"
                class="search-input"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="material-list">
              <el-table
                :data="filteredMaterialList"
                highlight-current-row
                height="900px"
                :show-header="false"
              >
                <el-table-column>
                  <template #default="scope">
                    <div class="item-card">
                      <!-- 图片展示区域 -->
                      <div v-if="scope.row.pic" class="pic-preview-area">
                        <div class="pic-thumb-list">
                          <div 
                            v-for="(img, idx) in scope.row.pic.split(',')" 
                            :key="idx"
                            class="pic-thumb-item"
                            :class="{ active: (scope.row.activeImgIdx || 0) === idx }"
                            @mouseenter="scope.row.activeImgIdx = idx"
                          >
                            <img :src="getLocalFileUrl(img.trim())" alt="" />
                          </div>
                        </div>
                        <div class="pic-main-view">
                          <img :src="getLocalFileUrl(scope.row.pic.split(',')[scope.row.activeImgIdx || 0].trim())" alt="" />
                        </div>
                      </div>
                      <!-- 价格行 -->
                      <div class="price-line">
                        <span class="current-price">¥<span class="price-num">{{scope.row.price || '0'}}</span></span>
                        <span v-if="scope.row.old_price" class="original-price">原价¥{{scope.row.old_price}}</span>
                        <span v-if="scope.row.post_way !== undefined && scope.row.post_way !== null" class="shipping-tag">
                          {{scope.row.post_way }}
                        </span>
                        <span class="condition-tag">{{scope.row.type || "虚拟资料"}}</span>

                      </div>
                      <!-- 标题 -->
                      <div class="item-title">{{scope.row.name || scope.row.material_name}}</div>
                      <!-- 描述 -->
                      <div v-if="scope.row.desc" class="item-desc">{{scope.row.desc}}</div>
                      <!-- 网盘地址 -->
                      <div v-if="scope.row.online_url" class="item-url">{{scope.row.online_url}}</div>
                      <!-- 操作按钮 -->
                      <div class="action-bar">
                        <div class="action-btn-group">
                          <div 
                            class="action-btn copy-btn" 
                            @click.stop="copyToClipboard(scope.row, $event)" 
                          >
                            <el-icon v-if="!scope.row.copied"><Document /></el-icon>
                            <el-icon v-else><Check /></el-icon>
                            <span>{{scope.row.copied ? '已复制' : '复制'}}</span>
                          </div>
                          <el-popconfirm
                            title="确定要删除这条记录吗？"
                            confirm-button-text="确定"
                            cancel-button-text="取消"
                            width="300"
                            @confirm="handleDeleteMaterial(scope.row)"
                          >
                            <template #reference>
                              <div class="action-btn delete-btn" @click.stop>
                                <el-icon><Delete /></el-icon>
                                <span>删除</span>
                              </div>
                            </template>
                          </el-popconfirm>
                        </div>
                        <div class="action-btn fill-btn" @click.stop="handleEdit(scope.row)">
                          <span>编辑</span>
                        </div>
                        <div class="action-btn fill-btn" @click.stop="fillVirtualFromRow(scope.row)">
                          <span>填表</span>
                        </div>
                      </div>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
          <el-tab-pane label="添加资料" name="add">
            <div class="add-material">
          <el-form :model="materialForm" label-position="top">
            <el-form-item>
              <div class="form-header">
                <span class="form-label">虚拟资料名</span>
                <el-button type="primary"  @click="resetForm">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
              <el-input size="large" v-model="materialForm.material_name" class="full-width-input"></el-input>
            </el-form-item>

            <div class="dotted-line"></div>
            
            <el-form-item>
              <div class="form-label">描述</div>
              <el-input
                type="textarea"
                size="large"
                :rows="4"
                v-model="materialForm.desc"
                class="full-width-input"
                placeholder="请输入资料描述"
              ></el-input>
            </el-form-item>

            <el-form-item >
              <div class="form-label">类型<span class="required">*</span></div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <el-select v-model="materialForm.type" placeholder="请选择类型" style="width: 236px;">
                  <el-option label="电子资料" value="电子资料" />
                  <el-option label="设计素材/源文件" value="设计素材/源文件" />
                  <el-option label="学习资料定制" value="学习资料定制" />
                  <el-option label="其他闲置" value="其他闲置" />
                </el-select>
                <el-button type="primary" @click="fillSelect">手动选择类型</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <div class="form-label">宝贝图片<span class="required">*</span></div>
              <div class="image-upload-area">
                <div class="image-preview-list">
                  <div class="image-preview-item" v-for="(img, index) in uploadedImages" :key="index">
                    <img :src="img.url" alt="预览图" />
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
                </div>
              </div>
            </el-form-item>

            <el-form-item>
              <div class="price-row">
                <div class="price-item">
                  <div class="form-label"><span class="required">*</span>价格</div>
                  <el-input
                    size="large"
                    v-model="materialForm.price"
                    class="full-width-input"
                    placeholder="0.00"
                  >
                    <template #prefix>¥</template>
                  </el-input>
                </div>
                <div class="price-item">
                  <div class="form-label">原价</div>
                  <el-input
                    size="large"
                    v-model="materialForm.original_price"
                    class="full-width-input"
                    placeholder="0.00"
                  >
                    <template #prefix>¥</template>
                  </el-input>
                </div>
              </div>
            </el-form-item>

            <el-form-item>
              <div class="form-label">发货设置</div>
              <div class="shipping-row">
                <el-radio-group v-model="materialForm.way">
                  <el-radio :value="0">包邮</el-radio>
                  <el-radio :value="2">一口价</el-radio>
                  <el-radio :value="3">无需邮寄</el-radio>
                </el-radio-group>
                <div class="self-pickup">
                  <span class="pickup-label">支持自提</span>
                  <el-switch v-model="materialForm.selfPickup" size="small" />
                </div>
              </div>
            </el-form-item>

            <div class="dotted-line"></div>

            <el-form-item>
              <div class="form-label">网盘地址</div>
              <el-input
                type="textarea"
                :rows="2"
                v-model="materialForm.online_url"
                class="full-width-input"
              ></el-input>
            </el-form-item>
            
            <el-form-item>
              <div style="display: flex; gap: 10px; width: 100%;">
                <el-button style="flex: 1; width: 50%;" size="large" type="primary" class="gradient-save-btn" @click="saveVirtual">保存</el-button>
                
              </div>
            </el-form-item>

          </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="shop-management">
        <div class="shop-top">
          <el-radio-group v-model="selectedPlatform" @change="handlePlatformChange">
            <el-radio value="goofish">闲鱼</el-radio>
            <el-radio value="taobao">淘宝</el-radio>
            <el-radio value="pinduoduo">拼多多</el-radio>
            <el-radio value="amazon">亚马逊</el-radio>
            <el-radio value="xiaohongshu">小红书</el-radio>
          </el-radio-group>
        </div>
        <!-- 浏览器视图区域 -->
        <div class="browser-view-container">
          <div
            class="webpage-container"
            ref="webpageContainer"
            id="webview-container-doubao"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Search, Delete, Plus, Document, Check, Picture, Edit } from '@element-plus/icons-vue';

export default {
  components: {
    Search,
    Delete,
    Plus,
    Document,
    Check,
    Picture,
    Edit
  },
  data() {
    return {
      activeTab: "1",
      activeTabName: "list",
      // 平台选择
      selectedPlatform: "goofish",
      platformUrls: {
        goofish: "https://www.goofish.com",
        taobao: "https://myseller.taobao.com/home.htm/QnworkbenchHome/",
        pinduoduo: "https://www.pinduoduo.com",
        amazon: "https://www.amazon.com",
        xiaohongshu: "https://www.xiaohongshu.com/explore"
      },
      // BrowserView 相关
      viewId: "virtualDoubaoView",
      browserViewCreated: false,
      materialList: [], // 资料列表
      materialForm: {
        material_name: "",
        online_url: "",
        desc: "",
        pic: "",
        price: "",
        original_price: "",
        way: 3,
        selfPickup: false,
        type: ""
      },
      searchKeyword: "",
      filteredMaterialList: [],
      // 图片上传相关
      uploadedImages: [], // 存储上传的图片路径
      // 本地图片缓存
      localImageCache: {},
    };
  },
  mounted() {
    this.loadMaterialList();
    // 初始化 BrowserView
    this.$nextTick(() => {
      this.initBrowserView();
    });
    // 监听窗口大小变化
    window.addEventListener("resize", this.updateBrowserViewBounds);
  },
  beforeRouteLeave(to, from, next) {
    // 路由离开前销毁 BrowserView
    if (this.browserViewCreated) {
      this.$ipc.send("hide-browser-view", { viewId: this.viewId });
      this.$ipc.send("destroy-browser-view", this.viewId);
      this.browserViewCreated = false;
    }
    next();
  },
  beforeUnmount() {
    // 清理工作
    window.removeEventListener("resize", this.updateBrowserViewBounds);
    if (this.browserViewCreated) {
      this.$ipc.send("hide-browser-view", { viewId: this.viewId });
      setTimeout(() => {
        this.$ipc.send("destroy-browser-view", this.viewId);
        this.browserViewCreated = false;
      }, 100);
    }
  },
  methods: {
    // 获取本地文件 URL
    getLocalFileUrl(filePath) {
      if (!filePath) return '';
      // 已经是 URL 格式直接返回
      if (filePath.startsWith('data:') || filePath.startsWith('http') || filePath.startsWith('file:')) {
        return filePath;
      }
      // 本地磁盘路径转为 file:// 协议
      return 'file:///' + filePath.replace(/\\/g, '/');
    },
    async loadMaterialList() {
      console.log("loadMaterialList");
      try {
        const params = {
          page: 1,
          pageNum: 100,
          conditions: {},
          orderBy: {
            column: "id",
            type: "desc",
          },
        };
        const res = await this.$axios.post('http://localhost:8000/api/virtual/get', params);
        console.log("res = ", res);
        this.materialList = res.data.result.list || [];
        this.filteredMaterialList = this.materialList;
      } catch (error) {
        console.error("Failed to load material list:", error);
      }
    },
    // 预加载所有图片
    async preloadAllImages() {
      const allPaths = new Set();
      this.materialList.forEach(item => {
        if (item.pic) {
          item.pic.split(',').forEach(p => {
            const path = p.trim();
            if (path && !path.startsWith('data:') && !path.startsWith('http')) {
              allPaths.add(path);
            }
          });
        }
      });
      // 并行加载所有图片
      await Promise.all([...allPaths].map(path => this.loadLocalImage(path)));
    },
    
    // 初始化 BrowserView
    initBrowserView() {
      const bounds = this.getContainerBounds();
      if (!bounds) return;

      this.$ipc.send("create-browser-view", {
        viewId: this.viewId,
        bounds: bounds,
      });

      const readyHandler = (event, returnedViewId) => {
        if (returnedViewId === this.viewId) {
          this.$ipc.send("load-url", {
            url: this.platformUrls[this.selectedPlatform],
            viewId: this.viewId,
            bounds: bounds,
          });
          this.browserViewCreated = true;
          if (this.$ipc.removeListener) {
            this.$ipc.removeListener('browser-view-ready', readyHandler);
          }
        }
      };
      this.$ipc.on('browser-view-ready', readyHandler);
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
    // 切换平台
    handlePlatformChange(platform) {
      if (!this.browserViewCreated) return;
      
      const url = this.platformUrls[platform];
      if (url) {
        this.$ipc.send("load-url", {
          url: url,
          viewId: this.viewId,
          bounds: this.getContainerBounds(),
        });
      }
    },
    handleMaterialClick(row) {
      this.materialForm = { 
        id: row.id,
        material_name: row.material_name,
        online_url: row.online_url,
        desc: row.desc || "",
        pic: row.pic || ""
      };
    },
    handleCopy(row) {
      // 将选中行的数据反显到表单
      this.materialForm = { 
        id: row.id,
        material_name: row.name || row.material_name,
        online_url: row.online_url,
        desc: row.desc || "",
        pic: row.pic || "",
        price: row.price || "",
        original_price: row.old_price || row.original_price || "",
        way: row.post_way === '包邮' ? 0 : (row.post_way === '一口价' ? 2 : 3),
        selfPickup: row.selfPickup ?? false,
        type: row.type || ""
      };
      // 如果有图片，解析并显示到上传区域
      this.uploadedImages = [];
      if (row.pic) {
        const pics = row.pic.split(',').filter(p => p.trim());
        pics.forEach(picPath => {
          this.uploadedImages.push({
            path: picPath.trim(),
            url: this.getLocalFileUrl(picPath.trim()),
            name: picPath.split('\\').pop() || picPath.split('/').pop()
          });
        });
      }
    },
    handleEdit(row) {
      this.handleCopy(row);
      this.activeTabName = "add";
    },
    resetForm() {
      // 清空表单
      this.materialForm = {
        material_name: "",
        online_url: "",
        desc: "",
        pic: "",
        price: "",
        original_price: "",
        way: 0,
        selfPickup: false,
        type: ""
      };
      // 清空上传的图片
      this.uploadedImages = [];
    },
    async handleDeleteMaterial(row) {
      try {
        const params = {
          id: row.id
        };
        const res = await this.$axios.post('http://localhost:8000/api/virtual/delete', params);
        if (res.data && res.data.code === 200) {
          this.$message.success("删除成功");
          this.loadMaterialList(); // 重新加载列表
        } else {
          this.$message.error("删除失败");
        }
      } catch (error) {
        console.error("删除资料失败:", error);
        this.$message.error("删除失败: " + error.message);
      }
    },
    async saveVirtual() {
      try {
        // 获取图片路径，用逗号拼接（本地磁盘地址）
        const picPaths = this.uploadedImages.map(img => img.path).join(',');
        // 如果有已存在的 pic 且没有新上传的图片，保留原有的
        const finalPic = picPaths || this.materialForm.pic || '';
        
        // 如果是更新操作，使用 update 接口
        if (this.materialForm.id) {
          const updateParams = {
            id: this.materialForm.id,
            name: this.materialForm.material_name,
            online_url: this.materialForm.online_url,
            desc: this.materialForm.desc,
            pic: finalPic,
            price: this.materialForm.price,
            old_price: this.materialForm.original_price,
            type: this.materialForm.type,
            post_way: this.materialForm.way === 0 ? '包邮' : (this.materialForm.way === 2 ? '一口价' : '无需邮寄')
          };
          
          const result = await this.$axios.post(
            'http://localhost:8000/api/virtual/update',
            updateParams
          );
          
          console.log("更新资料结果:", result);
          
          if (result.data && result.data.code === 200) {
            this.$message.success("更新成功");
            this.loadMaterialList(); // 重新加载列表
            this.resetForm();
            this.uploadedImages = []; // 清空上传的图片
            this.activeTabName = 'list'; // 切换到资料列表tab
          } else {
            this.$message.error("更新失败");
          }
        } else {
          // 新增操作
          const params = {
            name: this.materialForm.material_name,
            online_url: this.materialForm.online_url,
            desc: this.materialForm.desc,
            pic: finalPic,
            price: this.materialForm.price,
            old_price: this.materialForm.original_price,
            type: this.materialForm.type,
            post_way: this.materialForm.way === 0 ? '包邮' : (this.materialForm.way === 2 ? '一口价' : '无需邮寄')
          };

          const result = await this.$axios.post(
            'http://localhost:8000/api/virtual/add',
            params
          );

          console.log("保存资料结果:", result);

          if (result.data && result.data.code === 200) {
            this.$message.success("新增成功");
            this.loadMaterialList(); // 重新加载列表
            this.resetForm();
            this.uploadedImages = []; // 清空上传的图片
          } else {
            this.$message.error("新增失败");
          }
        }
      } catch (error) {
        console.error("保存资料失败:", error);
        this.$message.error("操作失败: " + error.message);
      }
    },
    async copyToClipboard(row, event) {
      if (row.copied) return;
      
      try {
        const textToCopy = `【${row.material_name}】\n${row.online_url}`;
        await navigator.clipboard.writeText(textToCopy);
        
        // 设置复制状态
        row.copied = true;
        
        // 2秒后恢复状态
        setTimeout(() => {
          row.copied = false;
        }, 2000);
        
        this.$message.success("已复制到剪贴板");
      } catch (error) {
        console.error("复制失败:", error);
        this.$message.error("复制失败");
      }
    },
    // 图片选择处理
    handleImageChange(file) {
      if (file.raw) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.uploadedImages.push({
            path: file.raw.path, // 本地文件路径
            url: e.target.result, // base64 预览
            name: file.name
          });
        };
        reader.readAsDataURL(file.raw);
      }
    },
    // 移除图片
    removeImage(index) {
      this.uploadedImages.splice(index, 1);
    },
    // 从列表行填表 - 先跳转到发布页再填写
    fillVirtualFromRow(row) {
      if (!this.browserViewCreated) {
        this.$message.warning("浏览器视图未初始化");
        return;
      }

      // 解析行数据中的图片路径
      const pics = row.pic ? row.pic.split(',').map(p => p.trim()).filter(p => p) : [];
      
      // 至少需要有一项内容
      if (!row.desc && !row.price && !row.old_price && pics.length === 0) {
        this.$message.warning("该条记录没有可填写的内容");
        return;
      }

      // 先跳转到发布页面
      this.$ipc.send("load-url", {
        url: "https://www.goofish.com/publish",
        viewId: this.viewId,
        bounds: this.getContainerBounds(),
      });

      // 延迟一段时间等待页面加载后再填表
      setTimeout(() => {
        // 发送 IPC 消息填写闲鱼表单
        this.$ipc.send("fill-virtual", {
          viewId: this.viewId,
          desc: row.desc || "",
          price: row.price || "",
          oldPrice: row.old_price || "",
          pics: pics,
          way: row.post_way === '包邮' ? 0 : (row.post_way === '一口价' ? 2 : 3),
          selfPickup: row.selfPickup ?? false,
          type: row.type || ""
        });

        // 监听填写结果
        const resultHandler = (event, result) => {
          if (result.viewId === this.viewId) {
            if (result.success) {
              this.$message.success("填表成功");
            } else {
              this.$message.error("填表失败: " + (result.error || "未知错误"));
            }
            if (this.$ipc.removeListener) {
              this.$ipc.removeListener('virtual-filled', resultHandler);
            }
          }
        };
        this.$ipc.on('virtual-filled', resultHandler);
      }, 2000); // 等待2秒让页面加载
    },
    // 填表功能 - 填写闲鱼发布页面的描述
    fillVirtual() {
      if (!this.browserViewCreated) {
        this.$message.warning("浏览器视图未初始化");
        return;
      }
      
      // 至少需要填写一项内容
      if (!this.materialForm.desc && !this.materialForm.price && !this.materialForm.original_price && this.uploadedImages.length === 0) {
        this.$message.warning("请先填写描述、价格、原价或选择图片");
        return;
      }

      // 获取图片路径数组
      const pics = this.uploadedImages.map(img => img.path);

      // 发送 IPC 消息填写闲鱼表单
      this.$ipc.send("fill-virtual", {
        viewId: this.viewId,
        desc: this.materialForm.desc,
        price: this.materialForm.price,
        oldPrice: this.materialForm.original_price,
        pics: pics,
        way: this.materialForm.way,
        selfPickup: this.materialForm.selfPickup,
        type: this.materialForm.type
      });

      // 监听填写结果
      const resultHandler = (event, result) => {
        if (result.viewId === this.viewId) {
          if (result.success) {
            this.$message.success("填表成功");
          } else {
            this.$message.error("填表失败: " + (result.error || "未知错误"));
          }
          // 移除监听器
          if (this.$ipc.removeListener) {
            this.$ipc.removeListener('virtual-filled', resultHandler);
          }
        }
      };
      this.$ipc.on('virtual-filled', resultHandler);
    },
    // 模拟填写分类下拉框
    fillSelect() {
      if (!this.browserViewCreated) {
        this.$message.warning("浏览器视图未初始化");
        return;
      }
      
      if (!this.materialForm.type) {
        this.$message.warning("请先选择分类");
        return;
      }

      // 发送 IPC 消息填写分类
      this.$ipc.send("fill-select", {
        viewId: this.viewId,
        type: this.materialForm.type
      });

      // 监听填写结果
      const resultHandler = (event, result) => {
        if (result.viewId === this.viewId) {
          if (result.success) {
            this.$message.success("分类填写成功");
          } else {
            this.$message.error("分类填写失败: " + (result.error || "未知错误"));
          }
          // 移除监听器
          if (this.$ipc.removeListener) {
            this.$ipc.removeListener('select-filled', resultHandler);
          }
        }
      };
      this.$ipc.on('select-filled', resultHandler);
    },
  },
  watch: {
    searchKeyword(newVal) {
      this.filteredMaterialList = this.materialList.filter(item =>
        item.material_name.toLowerCase().includes(newVal.toLowerCase()) ||
        item.online_url.toLowerCase().includes(newVal.toLowerCase())
      );
    },
  },
};
</script>

<style scoped>
.virtual-container {
  width: 100%;
  height: 100%;
}

.shop-management {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.browser-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.webpage-container {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.operation-bar {
  margin-bottom: 20px;
}

.image-editor {
}

.editor-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 50px);
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.right-panel {
  width: 300px;
  padding: 20px;
  border-left: 1px solid #eee;
  background-color: #f9f9f9;
}

.template-form {
  margin-top: 20px;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}

.canvas-container {
  border: 1px solid #ddd;
  border-radius: 5px;
  background: #f5f5f5;
  height: 100%;
}

.canvas-wrap {
  width: 100%;
  height: 100%;
  margin: 0 auto;
  position: relative;
}

canvas {
  display: block;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.size-wrap {
  display: flex;
  gap: 10px;
  align-items: center;
}

.template-list-panel {
  width: 200px;
  border-right: 1px solid #eee;
  padding: 20px;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.template-item {
  cursor: pointer;
  padding: 10px;
  border: 1px solid #ddd;
  margin-bottom: 10px;
  border-radius: 4px;
  transition: all 0.3s;
}

.template-item:hover {
  background-color: #f0f0f0;
}

.template-item.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.template-preview {
  height: 100px;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.template-info {
  text-align: center;
  font-size: 12px;
}

.template-name {
  text-align: center;
  font-size: 14px;
}

.text-setup {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.material-management {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.material-content-wrapper {
  display: flex;
  height: 100%;
}
.list-container {
  width: 500px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #eee;
  background: #f9f9f9;
  padding:20px;
  height:100%;
  overflow: hidden;
}
.material-list{
  flex: 1;
  overflow: auto;
}
.add-material {
  padding: 10px;
  border-radius: 8px;
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.add-material::-webkit-scrollbar {
  width: 6px;
}

.add-material::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 3px;
}

.add-material::-webkit-scrollbar-thumb:hover {
  background-color: #909399;
}

.add-material::-webkit-scrollbar-track {
  background-color: transparent;
}

.form-label {
  font-weight: bold;
  margin-bottom: 5px;
}

.full-width-input {
  width: 100%;
}

:deep(.el-table__header-wrapper th) {
  background-color: #ecf5ff !important;
}

/* 禁用表格行悬停高亮效果 */
:deep(.el-table__body tr:hover > td) {
  background-color: transparent !important;
}

:deep(.el-table__body tr.hover-row > td) {
  background-color: transparent !important;
}

/* 移除选中行的持久高亮背景 */
:deep(.el-table__body tr.current-row > td) {
  background-color: transparent !important;
}

.top-div {
  padding: 0 10px;
  height: 50px;
  display: flex;
  align-items: center;
  background-color: #fff;
}

.search-input {
  width: 100%;
}

:deep(.search-input .el-input__wrapper) {
  background-color: #f5f5f5;
  box-shadow: none !important;
  border-radius: 4px;
}

:deep(.search-input .el-input__inner) {
  background-color: #f5f5f5;
}

:deep(.full-width-input .el-input__wrapper) {
  box-shadow: none !important;
}

:deep(.full-width-input .el-textarea__inner) {
  box-shadow: none !important;
  border: none;
  width: 100%;
  margin: 0 auto;
}

:deep(.el-textarea__inner::-webkit-scrollbar) {
  width: 6px;
}

:deep(.el-textarea__inner::-webkit-scrollbar-thumb) {
  background-color: #c0c4cc;
  border-radius: 3px;
}

:deep(.el-textarea__inner::-webkit-scrollbar-track) {
  background-color: #f5f7fa;
}

.shop-top {
  height: 50px;
  display: flex;
  align-items: center;
  padding-left: 10px;
}

.shop-title {
  font-weight: bold;
  font-size: 16px;
}

.url-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: #909399;
  font-size: 12px;
}

/* 闲鱼风格卡片样式 */
.item-card {
  padding: 20px;
  background: linear-gradient(135deg, #fbefb1ff 0%, #fbf8e6ff 100%);
  border-radius:20px;
}

/* 图片预览区域样式 */
.pic-preview-area {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  height: 120px;
}

.pic-thumb-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  width: 50px;
  flex-shrink: 0;
}

.pic-thumb-list::-webkit-scrollbar {
  width: 4px;
}

.pic-thumb-list::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 2px;
}

.pic-thumb-item {
  width: 46px;
  height: 46px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
  transition: border-color 0.2s;
}

.pic-thumb-item.active {
  border-color: #409eff;
}

.pic-thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pic-main-view {
  flex: 1;
  height: 120px;
  border-radius: 20px;
  overflow: hidden;
  background: #f5f5f5;
}

.pic-main-view img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.current-price {
  color: #ff5500;
  font-size: 14px;
  font-weight: bold;
}

.current-price .price-num {
  font-size: 24px;
}

.original-price {
  color: #999;
  font-size: 12px;
}

.shipping-tag {
  color: #999;
  font-size: 12px;
  padding-left: 8px;
  border-left: 1px solid #e5e5e5;
}

.condition-tag {
  background: #ff5500;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 8px;
  margin-left: auto;
}

.item-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-url {
  font-size: 12px;
  font-weight:800;
  color: #999;
  padding: 6px 0px;
  border-radius: 4px;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 10px;
}

.action-btn-group {
  display: flex;
}

.action-left {
  display: flex;
}

.action-right {
  margin-left: 10px;
}

.gradient-fill-btn {
  background: #409eff;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
}

.gradient-fill-btn:hover {
  background: #66b1ff;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 24px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn {
  background: #ffd300;
  color: #333;
  border-radius: 25px 0 0 25px;
  font-weight: 500;
}

.copy-btn:hover {
  background: #e6be00;
}

.copy-btn.copied {
  background: #67c23a;
  color: #fff;
  cursor: not-allowed;
}

.delete-btn {
  background: #3d3d3d;
  color: #fff;
  border-radius: 0 25px 25px 0;
}

.delete-btn:hover {
  background: #555;
}

.fill-btn {
  background: #f5f5f5;
  color: #333;
  border-radius: 25px;
  font-weight: 500;
}

.fill-btn:hover {
  background: #e8e8e8;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.info-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.type-tag {
  background-color: #ecf5ff;
  color: #409eff;
}

.price-tag {
  background-color: #fef0f0;
  color: #f56c6c;
  font-weight: bold;
}

.old-price-tag {
  background-color: #f5f5f5;
  color: #909399;
  text-decoration: line-through;
}

.way-tag {
  background-color: #f0f9eb;
  color: #67c23a;
}

.desc-text {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap:20px;
}

.copy-btn-container {
  margin-top: 5px;
  display: flex;
  align-items: center;
}

.copy-icon {
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-icon:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.copy-icon.copied {
  cursor: not-allowed;
  color: #67C23A;
}

.delete-icon {
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #F56C6C;
}

.delete-icon:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

:deep(.copy-btn-container .el-button--small) {
  padding: 5px 10px;
  font-size: 12px;
}
:deep(.el-table .el-table__cell) {
  z-index:0!important;
}
.el-table--border .el-table__inner-wrapper:after, .el-table--border:after, .el-table--border:before, .el-table__inner-wrapper:before{
   z-index:0!important;
}

.price-row {
  display: flex;
  gap: 20px;
  width: 100%;
}

.price-item {
  flex: 1;
}

.price-item .form-label {
  margin-bottom: 8px;
}

.price-item :deep(.el-input__prefix) {
  margin-right: 4px;
}

.required {
  color: #F56C6C;
  margin-right: 2px;
}

.dotted-line {
  border-top: 1px dotted #409EFF;
  margin: 10px 0;
}

.shipping-row {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
}

.self-pickup {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pickup-label {
  font-size: 14px;
  color: #606266;
}

/* 保存按钮渐变效果 - 从左到右变浅 */
.gradient-save-btn {
  background: linear-gradient(to right, #409EFF, #79bbff) !important;
  border: none !important;
  transition: all 0.3s ease;
}

.gradient-save-btn:hover {
  background: linear-gradient(to right, #337ecc, #66b1ff) !important;
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


</style>






<template>
  <div class="virtual-container">
    <el-tabs v-model="activeTab" @tab-click="handleClick">
      <el-tab-pane label="图片处理" name="1"></el-tab-pane>
      <el-tab-pane label="资料处理" name="2"></el-tab-pane>
    </el-tabs>
    <div v-show="activeTab === '1'" class="image-editor">
      <div class="editor-layout">
        <div class="left-panel">
          <div class="toolbar">
            <!-- <el-button type="primary" @click="importImage">导入图片</el-button>
            <el-button type="primary" @click="addTextBox">添加内容</el-button> -->
            <el-button type="primary" @click="exportImage">导出图片</el-button>
            <!-- <div class="size-wrap">
              <el-input-number
                v-model="canvasWidth"
                :min="100"
                :max="2000"
                @change="updateCanvasSize"
                size="small"
                placeholder="宽度"
              >
                <template #prefix>宽</template>
              </el-input-number>
              <el-input-number
                v-model="canvasHeight"
                :min="100"
                :max="2000"
                @change="updateCanvasSize"
                size="small"
                placeholder="高度"
              >
                <template #prefix>高</template>
              </el-input-number>
              <el-button type="primary" @click="updateCanvasSize"
                >应用尺寸</el-button
              > 
            </div> -->
            <input
              type="file"
              ref="fileInput"
              @change="handleFileSelect"
              accept="image/*"
              style="display: none"
            />
          </div>
          <div class="canvas-container">
            <div class="canvas-wrap">
              <canvas
                ref="canvas"
                @mousedown="startDragging"
                @mousemove="drag"
                @mouseup="stopDragging"
              ></canvas>
            </div>
          </div>
        </div>
        <div class="right-panel">
          <h3>模板内容</h3>
          <div class="template-form">
            <el-form label-width="80px">
              <el-form-item label="内容1">
                <el-input v-model="templateForm.content1"></el-input>
              </el-form-item>
              <el-form-item label="内容2">
                <el-input v-model="templateForm.content2"></el-input>
              </el-form-item>
              <el-form-item label="内容3">
                <el-input v-model="templateForm.content3"></el-input>
              </el-form-item>
              <el-form-item label="内容4">
                <el-input v-model="templateForm.content4"></el-input>
              </el-form-item>
              <el-form-item label="内容5">
                <el-input v-model="templateForm.content5"></el-input>
              </el-form-item>

              <el-form-item label="背景颜色">
                <el-color-picker v-model="templateForm.bgColor" />
              </el-form-item>
            </el-form>
          </div>
        </div>
        <div class="template-list-panel">
          <h3>模板列表</h3>
          <el-scrollbar height="flex:1;padding-top: 20px;">
            <div
              class="template-item"
              v-for="(template, index) in templateList"
              :key="index"
              @click="selectTemplate(template)"
              :class="{ active: currentTemplateIndex === index }"
            >
              <div class="template-preview">
                <img :src="template.preview" v-if="template.preview" />
                <div class="template-info" v-else>
                  <div>{{ template.mainTitle }}</div>
                  <div>{{ template.subTitle }}</div>
                </div>
              </div>
              <div class="template-name">{{ template.name }}</div>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </div>
    <div v-show="activeTab === '2'" class="material-management">
      <div class="material-content-wrapper">
        <div class="material-list-container">
          <div class="material-list">
            <el-table
              :data="materialList"
              @row-click="handleCopy"
              stripe
              highlight-current-row
              height="220px"
              :show-header="false"
            >
              <el-table-column>
                <template #default="scope">
                  <div style="display: flex; flex-direction: column;">
                    <div style="font-size: 16px; font-weight: bold;">{{scope.row.material_name}}</div>
                    <div>{{scope.row.online_url}}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button
                    type="primary"
                    size="large"
                    @click.stop="handleDeleteMaterial(scope.row)"
                    >删除</el-button
                  >
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="add-material">
            <el-form :model="materialForm" label-position="top">
              <el-form-item>
                <template #label>
                  <div class="form-label">虚拟资料名</div>
                </template>
                <el-input v-model="materialForm.material_name" class="full-width-input"></el-input>
              </el-form-item>
              <el-form-item>
                <template #label>
                  <div class="form-label">在线URL</div>
                </template>
                <el-input
                  type="textarea"
                  :rows="2"
                  v-model="materialForm.online_url"
                  class="full-width-input"
                ></el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveMaterial">保存</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="shop-management">
          <!-- 左侧表格区域 -->
          <div class="shop-list-container">
            <div class="operation-bar">
              <el-button type="primary" @click="handleAdd">新增店铺</el-button>
            </div>
            <el-table
              :data="shopList"
              @row-click="handleRowClick"
              highlight-current-row
              height="calc(100%)"
            >
              <el-table-column prop="name" label="店铺名称" />
              <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button
                    type="text"
                    size="small"
                    @click.stop="handleEdit(scope.row)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click.stop="handleDelete(scope.row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 右侧浏览器视图 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import html2canvas from "html2canvas";

export default {
  data() {
    return {
      activeTab: "1",
      shopList: [],
      selectedShop: null,
      dialogVisible: false,
      dialogType: "add", // 'add' 或 'edit'
      shopForm: {
        name: "",
        address: "",
        phone: "",
      },
      rules: {
        name: [{ required: true, message: "请输入店铺名称", trigger: "blur" }],
        address: [{ required: true, message: "请输入地址", trigger: "blur" }],
        phone: [{ required: true, message: "请输入联系电话", trigger: "blur" }],
      },
      canvas: null,
      ctx: null,
      backgroundImage: null,
      textBoxes: [],
      isDragging: false,
      selectedBox: null,
      startX: 0,
      startY: 0,
      canvasWidth: 600,
      canvasHeight: 600,
      templateForm: {
        mainTitle: "考研英语",
        subTitle: "大纲词汇",
        bgColor: "#FF0000",
        textColor: "#FFFFFF",
      },
      currentTemplateIndex: -1,
      templateList: [
        {
          name: "模板1",
          content: `
            <div class="template-content" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: {{bgColor}};">
              <div style="width: 90%; height: 90%; border: 2px solid #ddd; border-radius: 10px; padding: 20px;">
                <div style="font-size: 100px; color: #000; text-align: center; margin-top:10px">{{content1}}</div>
                <div style="font-size: 50px; color: #FFD700; text-align: center; margin: 22px 0 0 0;">{{content2}}</div>
                <div style="font-size: 39px; color: #000; text-align: center; margin: 22px 0 0 0;">{{content3}}</div>
                <div style="font-size: 39px; color: #000; text-align: center; margin: 22px 0 0 0;">{{content4}}</div>
                <div style="font-size: 39px; color: #000; text-align: center; margin: 22px 0 0 0;">{{content5}}</div>
              </div>
            </div>
          `,
          bgColor: "#FF0000",
          preview: "",
        },
        {
          name: "模板2",
          content: `
            <div class="template-content" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: {{bgColor}};">
              <div style="width: 90%; height: 90%; border: 2px solid #ddd; border-radius: 10px; padding: 20px;">
                <div style="font-size: 100px; color: #000; text-align: center; margin-top:10px">{{content1}}</div>
                <div style="font-size: 50px; color: #FFD700; text-align: center; margin: 22px 0 0 0;">{{content2}}</div>
                <div style="font-size: 39px; color: #000; text-align: center; margin: 22px 0 0 0;">{{content3}}</div>
                <div style="font-size: 39px; color: #000; text-align: center; margin: 22px 0 0 0;">{{content4}}</div>
                <div style="font-size: 39px; color: #000; text-align: center; margin: 22px 0 0 0;">{{content5}}</div>
              </div>
            </div>
          `,
          bgColor: "#0000FF",
          preview: "",
        },
      ],
      debounceTimer: null,
      materialList: [], // 资料列表
      materialForm: {
        material_name: "",
        online_url: "",
      },
      viewId: "virtualView", // 添加viewId用于标识BrowserView
      browserViewInitialized: false,
    };
  },
  mounted() {
    if (this.activeTab == "1") {
      this.initCanvas();
    }
  },
  async beforeDestroy() {
    // 清理BrowserView
    await this.$axios.post("http://localhost:8000/api/virtual/browser/destroy", { viewId: this.viewId });
    window.removeEventListener("resize", this.updateBrowserViewBounds);
  },
  async beforeRouteLeave(to, from, next) {
    // 路由离开前销毁BrowserView
    await this.$axios.post("http://localhost:8000/api/virtual/browser/destroy", { viewId: this.viewId });
    next();
  },
  methods: {
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
      } catch (error) {
        console.error("Failed to load material list:", error);
      }
    },
    handleClick(tab) {
      if (tab.paneName === "1") {
        this.$nextTick(() => {
          this.initCanvas();
        });
      } else if (tab.paneName === "2") {
        this.loadMaterialList();
      }
    },
    handleAdd() {
      this.dialogType = "add";
      this.shopForm = {
        name: "",
        address: "",
        phone: "",
      };
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.dialogType = "edit";
      this.shopForm = { ...row };
      this.dialogVisible = true;
    },
    handleDelete(row) {
      this.$confirm("确认删除该店铺吗？", "提示", {
        type: "warning",
      })
        .then(() => {
          // TODO: 调用删除API
          this.$message.success("删除成功");
        })
        .catch(() => {});
    },
    handleRowClick(row) {
      this.selectedShop = row;
    },
    submitForm() {
      this.$refs.shopForm.validate((valid) => {
        if (valid) {
          // TODO: 调用新增或编辑API
          this.dialogVisible = false;
          this.$message.success(
            this.dialogType === "add" ? "新增成功" : "编辑成功"
          );
        }
      });
    },
    initCanvas() {
      this.canvas = this.$refs.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
      this.draw();
    },
    importImage() {
      this.$refs.fileInput.click();
    },
    handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          this.backgroundImage = img;
          this.draw();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    },
    addTextBox() {
      const newBox = {
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        text: "点击编辑文本",
        isEditing: false,
      };
      this.textBoxes.push(newBox);
      this.draw();
    },
    startDragging(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.textBoxes.forEach((box) => {
        if (
          x >= box.x &&
          x <= box.x + box.width &&
          y >= box.y &&
          y <= box.y + box.height
        ) {
          this.isDragging = true;
          this.selectedBox = box;
          this.startX = x - box.x;
          this.startY = y - box.y;
        }
      });
    },
    drag(e) {
      if (!this.isDragging || !this.selectedBox) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.selectedBox.x = x - this.startX;
      this.selectedBox.y = y - this.startY;
      this.draw();
    },
    stopDragging() {
      this.isDragging = false;
      this.selectedBox = null;
    },
    draw() {
      // 清空画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 绘制背景颜色
      this.ctx.fillStyle = this.templateForm.bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // 绘制背景图片
      if (this.backgroundImage) {
        this.ctx.drawImage(
          this.backgroundImage,
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );
      }

      // 绘制文本框
      this.textBoxes.forEach((box) => {
        // 设置文本样式
        this.ctx.font = `${box.fontSize || 16}px Arial`;
        this.ctx.fillStyle = box.color || "#000";
        this.ctx.textAlign = box.textAlign || "left";

        // 计算文本位置
        const textX =
          box.textAlign === "center" ? box.x + box.width / 2 : box.x + 10;
        const textY = box.y + box.height / 2 + box.fontSize / 3;

        // 绘制文本
        this.ctx.fillText(box.text, textX, textY);
      });
    },
    updateCanvasSize() {
      // 获取容器尺寸
      const container = this.$refs.canvas.parentElement;
      const maxWidth = container.clientWidth;
      const maxHeight = container.clientHeight;

      // 限制画布尺寸不超过容器
      this.canvasWidth = Math.min(this.canvasWidth, maxWidth);
      this.canvasHeight = Math.min(this.canvasHeight, maxHeight);

      // 更新画布尺寸
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;

      // 更新画布样式，使其居中
      this.canvas.style.position = "absolute";
      this.canvas.style.left = "50%";
      this.canvas.style.top = "50%";
      this.canvas.style.transform = "translate(-50%, -50%)";

      this.draw(); // 重新绘制画布内容
    },
    exportImage() {
      // 创建一个临时链接
      const link = document.createElement("a");
      // 获取画布的图片数据
      const image = this.canvas.toDataURL("image/png");
      link.download = "导出图片.png";
      link.href = image;
      // 触发下载
      link.click();
    },
    applyTemplate() {
      // 清空画布
      this.ctx.fillStyle = this.templateForm.bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const tempDiv = document.createElement("div");
      tempDiv.style.width = this.canvasWidth + "px";
      tempDiv.style.height = this.canvasHeight + "px";

      // 获取当前模板的HTML内容
      let templateContent =
        this.templateList[this.currentTemplateIndex]?.content || "";

      // 替换模板中的变量
      templateContent = templateContent
        .replace("{{bgColor}}", this.templateForm.bgColor)
        .replace("{{content1}}", this.templateForm.content1 || "内容1")
        .replace("{{content2}}", this.templateForm.content2 || "内容2")
        .replace("{{content3}}", this.templateForm.content3 || "内容3")
        .replace("{{content4}}", this.templateForm.content4 || "内容4")
        .replace("{{content5}}", this.templateForm.content5 || "内容5");

      tempDiv.innerHTML = templateContent;
      document.body.appendChild(tempDiv);

      // 使用html2canvas将HTML转换为图片
      html2canvas(tempDiv, {
        backgroundColor: null,
        width: this.canvasWidth,
        height: this.canvasHeight,
      }).then((canvas) => {
        this.ctx.drawImage(canvas, 0, 0, this.canvas.width, this.canvas.height);
        document.body.removeChild(tempDiv); // 清理临时元素
      });
    },
    selectTemplate(template) {
      this.templateForm = {
        content: template.content,
        bgColor: template.bgColor,
      };
      this.currentTemplateIndex = this.templateList.findIndex(
        (t) => t.name === template.name
      );
      this.applyTemplate();
    },
    debounceApplyTemplate(delay = 300) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.applyTemplate();
      }, delay);
    },
    handleMaterialClick(row) {
      this.materialForm = { ...row };
    },
    handleCopy(row) {
      // 组合复制内容
      const copyText = `【资料名】${row.material_name}\n【地址】${row.online_url}`;

      // 复制到剪贴板
      navigator.clipboard
        .writeText(copyText)
        .then(() => {
          // 复制成功后显示提示
          this.$message({
            message: "复制成功",
            type: "success",
          });
        })
        .catch((err) => {
          // 复制失败显示错误提示
          this.$message({
            message: "复制失败",
            type: "error",
          });
          console.error("复制失败:", err);
        });
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
    async saveMaterial() {
      try {
        // 如果是更新操作，使用 update 接口
        if (this.materialForm.id) {
          const updateParams = {
            id: this.materialForm.id,
            material_name: this.materialForm.material_name,
            online_url: this.materialForm.online_url
          };
          
          const result = await this.$axios.post(
            'http://localhost:8000/api/virtual/update',
            updateParams
          );
          
          console.log("更新资料结果:", result);
          
          if (result.data && result.data.code === 200) {
            this.$message.success("更新成功");
            this.loadMaterialList(); // 重新加载列表
            this.materialForm = {
              // 清空表单
              material_name: "",
              online_url: "",
            };
          } else {
            this.$message.error("更新失败");
          }
        } else {
          // 新增操作
          const params = {
            material_name: this.materialForm.material_name,
            online_url: this.materialForm.online_url
          };

          const result = await this.$axios.post(
            'http://localhost:8000/api/virtual/add',
            params
          );

          console.log("保存资料结果:", result);

          if (result.data && result.data.code === 200) {
            this.$message.success("新增成功");
            this.loadMaterialList(); // 重新加载列表
            this.materialForm = {
              // 清空表单
              material_name: "",
              online_url: "",
            };
          } else {
            this.$message.error("新增失败");
          }
        }
      } catch (error) {
        console.error("保存资料失败:", error);
        this.$message.error("操作失败: " + error.message);
      }
    },
    // 初始化BrowserView
    async initBrowserView() {
      if (this.browserViewInitialized) {
        await this.$axios.post("http://localhost:8000/api/virtual/browser/show", { viewId: this.viewId });
        return;
      }
      const bounds = this.getContainerBounds();
      await this.$axios.post("http://localhost:8000/api/virtual/browser/create", {
        bounds,
        viewId: this.viewId,
      });
      window.addEventListener("resize", this.updateBrowserViewBounds);

      // 使用轮询方式检查浏览器视图是否准备好
      const checkBrowserReady = async () => {
        const res = await this.$axios.post("http://localhost:8000/api/virtual/browser/status", { viewId: this.viewId });
        if (res.data.status === "ready") {
          this.loadTaobaoUrl();
          this.browserViewInitialized = true;
        } else {
          setTimeout(checkBrowserReady, 500);
        }
      };
      
      checkBrowserReady();
    },

    // 获取容器的位置和尺寸
    getContainerBounds() {
      const container = this.$refs.browserContainer;
      const rect = container.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    },

    // 更新BrowserView的大小和位置
    async updateBrowserViewBounds() {
      await this.$axios.post("http://localhost:8000/api/virtual/browser/update", {
        bounds: this.getContainerBounds(),
        viewId: this.viewId,
      });
    },

    // 加载淘宝URL
    async loadTaobaoUrl() {
      console.log("加载淘宝URL");
      const url = "https://myseller.taobao.com/home.htm/QnworkbenchHome/";
      await this.$axios.post("http://localhost:8000/api/virtual/browser/load", {
        url,
        bounds: this.getContainerBounds(),
        viewId: this.viewId,
      });
    },
  },
  watch: {
    async activeTab(newVal) {
      if (newVal === "1") {
        this.$nextTick(() => {
          this.initCanvas();
        });
      }
      if (newVal === "2") {
        await this.initBrowserView();
      } else {
        await this.$axios.post("http://localhost:8000/api/virtual/browser/hide", { viewId: this.viewId });
        window.removeEventListener("resize", this.updateBrowserViewBounds);
      }
    },
    templateForm: {
      handler(newVal) {
        if (this.canvas) {
          this.debounceApplyTemplate();
        }
      },
      deep: true,
    },
  },
};
</script>

<style scoped>
.virtual-container {
  width: 100%;
  height: 100%;
  padding: 10px;
}

.shop-management {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.shop-list-container {
  flex: 0 0 290px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.browser-container {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
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
  gap: 10px;
  height: 100%;
}
.material-list-container {
  width: 290px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-right: 1px solid #eee;
}

.add-material {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
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
</style>






<template>
  <div class="ai-container">
    <!-- 添加弹窗按钮 -->
    <!-- <div class="popup-button-container">
      <el-button type="primary" @click="openInNewWindow">弹窗显示</el-button>
    </div> -->
    <div
      class="item-list"
      v-infinite-scroll="load"
      infinite-scroll-distance="10"
      style="overflow-y: scroll; height: 100vh"
      @scroll="handleScroll"
    >
      <div v-for="(item, index) in items" :key="index" class="list-item">
        <div class="column-item">
          <div class="webview-container" :id="`left-browser-${index}`"></div>
        </div>
        <div class="column-item">
          <div class="webview-container" :id="`right-browser-${index}`"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ArrowLeft, Refresh } from "@element-plus/icons-vue";

export default {
  name: "Ai",
  components: { ArrowLeft, Refresh },
  data() {
    return {
      items: [],
      loading: false,
      page: 1,
      selectedItemId: null,
      webviewUrl: "https://www.doubao.com",
      url: "www.doubao.com",
      urls: [
        "https://www.doubao.com",
        "https://felo.ai/search",
        "https://metaso.cn/",
        "https://m.sogou.com/",
        "https://kimi.moonshot.cn/",
        "https://www.bing.com/",
        "https://www.google.com/",
        "https://www.baidu.com/",
        "https://tongyi.aliyun.com/",
        "https://chatgpt.com/",
        "https://claude.ai",
      ],
      resizeObserver: null,
    };
  },
  created() {
    // 初始加载5条数据
    this.loadInitialData();
  },
  mounted() {
    this.items.forEach((_, index) => {
      // 添加错误检查
      const leftBounds = this.getContainerBounds(`left-browser-${index}`);
      const rightBounds = this.getContainerBounds(`right-browser-${index}`);

      // 确保获取到了有效的边界值
      if (!leftBounds || !rightBounds) {
        console.error(`无法获取容器 ${index} 的边界值`);
        return;
      }
      this.$ipc.send("create-browser-view", {
        viewId: `left-browser-${index}`,
        bounds: leftBounds,
      });

      this.$ipc.send("create-browser-view", {
        viewId: `right-browser-${index}`,
        bounds: rightBounds,
      });
    });
    this.$nextTick(() => {
      this.loadUrl();
    });

    // 添加容器宽度变化监听
    this.resizeObserver = new ResizeObserver(this.handleResize);
    const container = document.querySelector(".ai-container");
    if (container) {
      this.resizeObserver.observe(container);
    }
  },
  beforeDestroy() {
    // 清理 BrowserView
    this.items.forEach((_, index) => {
      this.$ipc.send("hide-browser-view", `left-browser-${index}`);
      this.$ipc.send("hide-browser-view", `right-browser-${index}`);
    });
  },
  beforeUnmount() {
    // 清理 BrowserView
    this.items.forEach((_, index) => {
      this.$ipc.send("hide-browser-view", `left-browser-${index}`);
      this.$ipc.send("hide-browser-view", `right-browser-${index}`);
    });

    // 清理 ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  methods: {
    loadInitialData() {
      // 修改为2列布局的行数计算
      const rowCount = Math.ceil(this.urls.length / 2);
      this.items = Array(rowCount)
        .fill()
        .map((_, index) => ({
          id: index + 1,
          title: `标题 ${index + 1}`,
          description: `这是第 ${index + 1} 个项目的描述`,
        }));
    },
    loadUrl() {
      this.items.forEach((_, index) => {
        // 修改为2列的URL索引计算
        const rowStartIndex = index * 2;

        // 左列
        if (this.urls[rowStartIndex]) {
          this.$ipc.send("load-url", {
            viewId: `left-browser-${index}`,
            url: this.urls[rowStartIndex],
            bounds: this.getContainerBounds(`left-browser-${index}`),
          });
        }

        // 右列
        if (this.urls[rowStartIndex + 1]) {
          this.$ipc.send("load-url", {
            viewId: `right-browser-${index}`,
            url: this.urls[rowStartIndex + 1],
            bounds: this.getContainerBounds(`right-browser-${index}`),
          });
        }
      });
    },
    goBack() {
      this.items.forEach((_, index) => {
        this.$ipc.send("browser-go-back", `left-browser-${index}`);
        this.$ipc.send("browser-go-back", `right-browser-${index}`);
      });
    },
    getContainerBounds(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`找不到容器: ${containerId}`);
        return null;
      }

      const rect = container.getBoundingClientRect();
      // 确保所有值都是有效的数字
      if (rect.width === 0 || rect.height === 0) {
        console.error(`容器 ${containerId} 的尺寸无效`);
        return null;
      }

      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    },
    handleScroll() {
      this.items.forEach((_, index) => {
        const leftBounds = this.getContainerBounds(`left-browser-${index}`);
        const rightBounds = this.getContainerBounds(`right-browser-${index}`);

        if (leftBounds && rightBounds) {
          this.$ipc.send("update-browser-view-bounds", {
            viewId: `left-browser-${index}`,
            bounds: leftBounds,
          });
          this.$ipc.send("update-browser-view-bounds", {
            viewId: `right-browser-${index}`,
            bounds: rightBounds,
          });
        }
      });
    },
    handleResize() {
      // 延迟执行以防止过于频繁的更新
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }

      this.resizeTimeout = setTimeout(() => {
        this.items.forEach((_, index) => {
          const leftBounds = this.getContainerBounds(`left-browser-${index}`);
          const rightBounds = this.getContainerBounds(`right-browser-${index}`);

          if (leftBounds && rightBounds) {
            this.$ipc.send("update-browser-view-bounds", {
              viewId: `left-browser-${index}`,
              bounds: leftBounds,
            });
            this.$ipc.send("update-browser-view-bounds", {
              viewId: `right-browser-${index}`,
              bounds: rightBounds,
            });
          }
        });
      }, 100); // 100ms 的防抖延迟
    },
    openInNewWindow() {
      // 创建一个只包含简单数据类型的配置对象
      const windowConfig = {
        urls: this.urls.map((url) => String(url)), // 确保所有 URL 都是字符串
        bounds: {
          width: Number(1200),
          height: Number(800),
        },
      };

      console.log("openInNewWindow", windowConfig);
      this.$ipc.send("create-popup-window", windowConfig);
    },
  },
};
</script>

<style scoped>
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  height: 800px;
  gap: 5px;
}

.column-item {
  flex: 1;
  height: 100%;
}

button {
  padding: 8px 15px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

.webview-container {
  width: 100%;
  height: 100%;
  background: white;
  z-index: 1000;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 10px;
}

.webview {
  width: 100%;
  height: calc(100% - 40px);
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #ff4444;
}

.close-button:hover {
  background-color: #cc0000;
}

.column-item {
  flex: 1;
  height: 100%;
  position: relative;
  padding: 10px;
}

.url-container {
  height: 40px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.url-button {
  flex-shrink: 0;
  height: 40px;
  padding: 0 15px;
}

/* 添加新的样式 */
.popup-button-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1001;
}
</style>

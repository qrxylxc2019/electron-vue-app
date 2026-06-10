<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2023-09-29 08:15:30
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-11-11 08:30:29
 * @FilePath: \eletron\frontend\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="app-container">
    <!-- Loading overlay that shows while FastAPI is starting -->
    <div class="loading-overlay" v-if="isLoading">
      <div class="loading-content">
        <div v-if="!showPasswordInput">
          <div class="spinner"></div>
          <h2>正在启动服务</h2>
          <p>{{ loadingStatus }}</p>
          <div class="error-message" v-if="errorMessage">{{ errorMessage }}</div>
        </div>
        <!-- Password input div that appears after FastAPI starts -->
        <div class="password-container" v-if="showPasswordInput">
          <div class="password-inputs">
            <input 
              v-for="i in 6" 
              :key="i"
              ref="passwordInputs"
              type="password" 
              maxlength="1"
              v-model="passwordDigits[i-1]"
              @input="handlePasswordInput(i-1, $event)"
              @keydown="handlePasswordKeydown(i-1, $event)"
              class="password-digit"
            />
          </div>
          <div class="numeric-keypad">
            <button 
              v-for="num in 6" 
              :key="num"
              @click="appendPasswordDigit(num)"
              class="keypad-btn"
              :disabled="isPasswordComplete"
            >{{ num }}</button>
            <button 
              v-for="num in [7, 8, 9]" 
              :key="num"
              @click="appendPasswordDigit(num)"
              class="keypad-btn"
              :disabled="isPasswordComplete"
            >{{ num }}</button>
            <button @click="clearPassword" class="keypad-btn clear-btn">清除</button>
            <button 
              v-for="num in [0]" 
              :key="num"
              @click="appendPasswordDigit(num)"
              class="keypad-btn"
              :disabled="isPasswordComplete"
            >{{ num }}</button>
            <button @click="submitPassword"  class="keypad-btn submit-btn">确认</button>
          </div>
          <div class="password-error" v-if="passwordError">{{ passwordError }}</div>
        </div>
      </div>
    </div>
    <template v-else>
      <leftMenu class="left-menu" v-if="!isRightOpenWindow" />
      <div class="main-content" :class="{ 'full-width': isRightOpenWindow }">
        <router-view v-slot="{ Component }">
          <keep-alive :include="['Xuexi', 'Virtual', 'Learn', 'Solicit']">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </template>
  </div>
</template>

<script>
import leftMenu from "./components/LeftMenu.vue";
import MusicPlayer from "./components/Music.vue";
import { ipc, isEE, safeIpc } from './utils/ipcRenderer';
import axios from 'axios';

export default {
  name: "App",
  components: {
    leftMenu,
    MusicPlayer
  },
  data() {
    return {
      isLoading: true,
      loadingStatus: "正在启动FastAPI服务...",
      errorMessage: "",
      loadingDots: 0,
      dotInterval: null,
      devMode: process.env.NODE_ENV === 'development',
      ipcListenerAdded: false,
      picDirectory: "", // 图片目录
      isRightOpenWindow: false, // 是否为右键打开的新窗口
      showPasswordInput: false, // 是否显示密码输入框
      passwordDigits: Array(6).fill(''), // 密码输入框的值
      passwordError: "", // 密码错误提示
      currentPasswordInputIndex: 0 // 当前聚焦的密码输入框索引
    };
  },
  computed: {
    isPasswordComplete() {
      return this.passwordDigits.every(digit => digit !== '');
    }
  },
  mounted() {
    // 检查是否为右键打开的新窗口
    this.checkRightOpenWindow();
    
    // Start the animation for the loading text
    this.dotInterval = setInterval(() => {
      this.loadingDots = (this.loadingDots + 1) % 4;
      this.loadingStatus = "正在启动FastAPI服务" + ".".repeat(this.loadingDots);
    }, 500);
    
    // Check FastAPI status once
    this.checkFastApiRunning();
  },
  methods: {
    checkRightOpenWindow() {
      // 检查URL参数中是否包含rightOpen=true
      // 在hash路由模式下，查询参数在hash之后，需要从hash中解析
      let urlParams;
      const hash = window.location.hash;
      
      if (hash.includes('?')) {
        // 从hash中提取查询参数部分
        const queryString = hash.split('?')[1];
        urlParams = new URLSearchParams(queryString);
      } else {
        // 如果hash中没有查询参数，尝试从search中获取（兼容性处理）
        urlParams = new URLSearchParams(window.location.search);
      }
      
      this.isRightOpenWindow = urlParams.get('rightOpen') === 'true';
    },
    async checkFastApiRunning() {
      console.log("检查FastAPI是否运行中...");
      try {
        // Try to connect to a FastAPI endpoint to see if it's already running
        const response = await axios.get('http://localhost:8000/api/ping', { 
          timeout: 2000
        });
        
        if (response.status === 200) {
          this.loadingStatus = "FastAPI服务已运行";
          clearInterval(this.dotInterval);
          this.showPasswordInput = true; // 显示密码输入框
          return;
        }
      } catch (error) {
      }

      // If we get here, FastAPI isn't running, so try to start it via IPC
      this.startFastApi();
    },
    setupIpcListener() {
      // Avoid adding duplicate listeners
      if (this.ipcListenerAdded) return;
      
      // Only add listener if ipc exists and has the on method
      if (safeIpc && typeof safeIpc.on === 'function') {
        console.log("Adding IPC listener for fastapi-status");
        this.ipcListenerAdded = true;
        
        // 确保清除之前可能存在的监听器，防止重复
        //  safeIpc.removeAllListeners('fastapi-status');
        
        safeIpc.on('fastapi-status', (event, data) => {
          console.log("收到fastapi-status消息:", data);
          
          if (data.status === 'started') {
            // FastAPI started successfully
            console.log("FastAPI started successfully, proceeding to app");
            this.loadingStatus = "FastAPI服务启动成功，正在加载应用...";
            setTimeout(() => {
              this.isLoading = false;
              clearInterval(this.dotInterval);
              this.showPasswordInput = true; // 显示密码输入框
            }, 1000);
          } else if (data.status === 'error') {
            // FastAPI failed to start
            console.error("FastAPI failed to start:", data.message);
            this.errorMessage = `启动错误: ${data.message}`;
            this.loadingStatus = "服务启动失败";
            // Still show the error for a while, then load the app anyway
            setTimeout(() => {
              this.isLoading = false;
              clearInterval(this.dotInterval);
            }, 5000);
          } else if (data.status === 'check') {
            // Received a request to check if FastAPI is running
            console.log("Received request to check FastAPI status");
            this.checkApiStatus();
          }
        });
      } else {
        console.error("IPC not available or missing 'on' method");
        // 如果没有有效的IPC，也设置超时自动继续
        setTimeout(() => {
          this.isLoading = false;
          clearInterval(this.dotInterval);
        }, 5000);
      }
    },
    async checkApiStatus() {
      try {
        const response = await axios.get('http://localhost:8000/api/ping', { 
          timeout: 2000
        });
        
        if (response.status === 200) {
          console.log("FastAPI is now running");
          // Send success response to main process if ipc is available
          if (safeIpc && typeof safeIpc.send === 'function') {
            safeIpc.send('fastapi-check-result', { running: true });
          }
          
          this.loadingStatus = "FastAPI服务已运行，正在加载应用...";
          setTimeout(() => {
            this.isLoading = false;
            clearInterval(this.dotInterval);
            this.showPasswordInput = true; // 显示密码输入框
          }, 1000);
        }
      } catch (error) {
        console.log("FastAPI still not running in check", error);
        // Send failure response to main process if ipc is available
        if (safeIpc && typeof safeIpc.send === 'function') {
          safeIpc.send('fastapi-check-result', { running: false });
        }
      }
    },
    startFastApi() {
      // Check if IPC is available (running in Electron) and has the required methods
      if (safeIpc && typeof safeIpc.send === 'function') {
        console.log("Electron IPC available, sending start-fastapi message");
        
        // Set up the IPC listener first
        this.setupIpcListener();

        // Then tell the main process we're ready to start FastAPI
        try {
          console.log("Sending start-fastapi message");
          safeIpc.send('start-fastapi');
          
          // 设置超时保护，防止IPC消息丢失
          setTimeout(() => {
            if (this.isLoading) {
              console.log("No response to start-fastapi after timeout, proceeding anyway");
              this.isLoading = false;
              this.showPasswordInput = true; // 显示密码输入框
              clearInterval(this.dotInterval);
            }
          }, 30000); // 30秒超时保护
        } catch (error) {
          console.error("Error sending IPC message:", error);
          this.loadingStatus = "IPC通信错误，尝试自动继续";
          setTimeout(() => {
            this.isLoading = false;
            this.showPasswordInput = true; // 显示密码输入框
            clearInterval(this.dotInterval);
          }, 3000);
        }
      } else {
        // In development without electron or with incomplete IPC implementation
        console.log("Electron IPC not available or incomplete, automatically proceeding to app");
        this.loadingStatus = "开发模式：跳过FastAPI启动";
        setTimeout(() => {
          this.isLoading = false;
          this.showPasswordInput = true; // 显示密码输入框
          clearInterval(this.dotInterval);
        }, 2000);
      }
    },
    handlePasswordInput(index, event) {
      const input = event.target;
      const value = input.value;
      if (value.length > 1) {
        input.value = value.slice(-1); // 只保留最后一个字符
      }

      if (value && index < 5) {
        this.$nextTick(() => {
          this.$refs.passwordInputs[index + 1].focus();
        });
      }
      if(index === 5){
        this.submitPassword()
      }
    },
    handlePasswordKeydown(index, event) {
      if (event.key === 'Backspace') {
        if (index > 0) {
          this.$nextTick(() => {
            this.$refs.passwordInputs[index - 1].focus();
          });
        }
      } else if (event.key === 'ArrowLeft') {
        if (index > 0) {
          this.$nextTick(() => {
            this.$refs.passwordInputs[index - 1].focus();
          });
        }
      } else if (event.key === 'ArrowRight') {
        if (index < 5) {
          this.$nextTick(() => {
            this.$refs.passwordInputs[index + 1].focus();
          });
        }
      }
    },
    appendPasswordDigit(num) {
      // 总是设置当前输入框的值
      this.passwordDigits[this.currentPasswordInputIndex] = num;

      console.log(`${JSON.stringify(this.passwordDigits)}`);
      
      // 如果当前不是最后一个输入框，则聚焦到下一个
      if (this.currentPasswordInputIndex < 5) {
        this.currentPasswordInputIndex++;
        this.$nextTick(() => {
          this.$refs.passwordInputs[this.currentPasswordInputIndex].focus();
        });
      }else{
        this.submitPassword()
      }
    },
    clearPassword() {
      if(this.currentPasswordInputIndex >= 1){
        this.passwordDigits[this.currentPasswordInputIndex] = "";
        this.currentPasswordInputIndex--;
        this.$nextTick(() => {
          this.$refs.passwordInputs[this.currentPasswordInputIndex].focus();
        });
      }else{
        this.passwordDigits[0] = "";
        this.$refs.passwordInputs[0].focus();
      }
      
    },
    async submitPassword() {
      const enteredPassword = this.passwordDigits.join('');
      if (enteredPassword === '619619') {
        console.log("密码正确，继续加载应用");
        this.passwordError = "";
        this.showPasswordInput = false;
        this.passwordDigits = Array(6).fill('');
        this.currentPasswordInputIndex = 0;
        this.isLoading = false;
        clearInterval(this.dotInterval);
        // 继续加载应用的逻辑
      } else {
        console.log("密码错误，请重试");
        this.passwordError = "密码错误，请重试";
        this.passwordDigits = Array(6).fill('');
        this.currentPasswordInputIndex = 0;
        this.$nextTick(() => {
          this.$refs.passwordInputs[0].focus();
        });
      }
    }
  },
  watch: {
    '$route'() {
      // 当路由变化时重新检查rightOpen参数
      this.checkRightOpenWindow();
    }
  },
  beforeUnmount() {
    if (this.dotInterval) {
      clearInterval(this.dotInterval);
    }
  }
};
</script>
<style lang="less">
.app-container {
  display: flex;
  height: 100%;
  
  .loading-overlay {
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.95);
    z-index: 1000;
    
    .loading-content {
      text-align: center;
      border-radius: 8px;
      height:100%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .spinner {
        width: 60px;
        height: 60px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        margin: 0 auto 20px;
        animation: spin 2s linear infinite;
      }
      
      h2 {
        margin-bottom: 10px;
        color: #333;
      }
      
      p {
        color: #666;
        margin: 5px 0;
      }
      
      .error-message {
        color: #e74c3c;
        margin-top: 15px;
        font-weight: bold;
      }
      
      .skip-button {
        margin-top: 20px;
        padding: 8px 16px;
        background-color: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        &:hover {
          background-color: #2980b9;
        }
      }

      .password-container {
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        width:50%;

        .password-inputs {
          display: flex;
          gap:10px;
          width:100%;

          .password-digit {
            flex:1;
            height: 80px;
            text-align: center;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 0;
            font-size: 24px;
            box-sizing: border-box;
            min-width: 0; /* 添加这个属性防止flex item溢出 */
            &:focus {
              outline: none;
              border-color: #3498db;
              box-shadow: 0 0 5px rgba(52, 152, 219, 0.5);
            }
          }
        }

        .numeric-keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          width:100%;
          margin-top: 15px;

          .keypad-btn {
            width: 100%;
            height: 100px;
            font-size: 20px;
            background-color: #eee;
            border: 1px solid #ccc;
            border-radius: 5px;
            cursor: pointer;
            &:hover {
              background-color: #ddd;
            }
            &.clear-btn {
              background-color: #f44336;
              color: white;
              &:hover {
                background-color: #d32f2f;
              }
            }
            &.submit-btn {
              background-color: #4CAF50;
              color: white;
              &:hover {
                background-color: #388e3c;
              }
            }
          }
        }

        .password-error {
          color: #f44336;
          margin-top: 15px;
          font-weight: bold;
        }
      }
    }
  }

  .left-menu {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    &.collapsed {
      width: 64px;
    }
  }

  .main-content {
    flex: 1;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;
    
    &.full-width {
      width: 100%;
      margin-left: 0;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

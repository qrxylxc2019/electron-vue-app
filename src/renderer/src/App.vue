<template>
  <div id="app" class="app-layout">
    <!-- 密码输入遮罩层 -->
    <div class="password-overlay" v-if="showPasswordInput">
      <div class="password-container">
        <h2 class="password-title">请输入密码</h2>
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
            readonly
          />
        </div>
        <div class="numeric-keypad">
          <button
            v-for="num in 9"
            :key="num"
            @click="appendPasswordDigit(num)"
            class="keypad-btn"
            :disabled="isPasswordComplete"
          >{{ num }}</button>
          <button @click="clearPassword" class="keypad-btn clear-btn">清除</button>
          <button
            @click="appendPasswordDigit(0)"
            class="keypad-btn"
            :disabled="isPasswordComplete"
          >0</button>
          <button @click="submitPassword" class="keypad-btn submit-btn">确认</button>
        </div>
        <div class="password-error" v-if="passwordError">{{ passwordError }}</div>
      </div>
    </div>

    <template v-else>
      <LeftMenu @collapseChange="onMenuCollapse" />
      <div class="main-content" :class="{ collapsed: isMenuCollapsed }">
        <router-view />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import LeftMenu from './components/LeftMenu.vue'

const isMenuCollapsed = ref(false)
const onMenuCollapse = (collapsed: boolean) => {
  isMenuCollapsed.value = collapsed
}

// 密码输入相关
const showPasswordInput = ref(true)
const passwordDigits = ref(Array(6).fill(''))
const passwordError = ref('')
const currentPasswordInputIndex = ref(0)
const passwordInputs = ref<HTMLInputElement[]>([])

const isPasswordComplete = computed(() => {
  return passwordDigits.value.every(digit => digit !== '')
})

const handlePasswordInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value
  if (value.length > 1) {
    input.value = value.slice(-1)
    passwordDigits.value[index] = input.value
  }

  if (value && index < 5) {
    nextTick(() => {
      passwordInputs.value[index + 1]?.focus()
    })
  }
  if (index === 5) {
    submitPassword()
  }
}

const handlePasswordKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace') {
    if (index > 0) {
      nextTick(() => {
        passwordInputs.value[index - 1]?.focus()
      })
    }
  } else if (event.key === 'ArrowLeft') {
    if (index > 0) {
      nextTick(() => {
        passwordInputs.value[index - 1]?.focus()
      })
    }
  } else if (event.key === 'ArrowRight') {
    if (index < 5) {
      nextTick(() => {
        passwordInputs.value[index + 1]?.focus()
      })
    }
  }
}

const appendPasswordDigit = (num: number) => {
  passwordDigits.value[currentPasswordInputIndex.value] = String(num)

  if (currentPasswordInputIndex.value < 5) {
    currentPasswordInputIndex.value++
    nextTick(() => {
      passwordInputs.value[currentPasswordInputIndex.value]?.focus()
    })
  } else {
    submitPassword()
  }
}

const clearPassword = () => {
  if (currentPasswordInputIndex.value >= 1) {
    passwordDigits.value[currentPasswordInputIndex.value] = ''
    currentPasswordInputIndex.value--
    nextTick(() => {
      passwordInputs.value[currentPasswordInputIndex.value]?.focus()
    })
  } else {
    passwordDigits.value[0] = ''
    passwordInputs.value[0]?.focus()
  }
}

const submitPassword = () => {
  const enteredPassword = passwordDigits.value.join('')
  if (enteredPassword === '619619') {
    passwordError.value = ''
    showPasswordInput.value = false
    passwordDigits.value = Array(6).fill('')
    currentPasswordInputIndex.value = 0
  } else {
    passwordError.value = '密码错误，请重试'
    passwordDigits.value = Array(6).fill('')
    currentPasswordInputIndex.value = 0
    nextTick(() => {
      passwordInputs.value[0]?.focus()
    })
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 18px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #faf8f5;
  min-height: 100vh;
  color: #1a1a1a;
}

#app {
  min-height: 100vh;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

/* 密码输入遮罩层 */
.password-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #faf8f5;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-container {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 1px solid #e8e4df;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  width: 420px;
  max-width: 90vw;
}

.password-title {
  font-size: 22px;
  font-weight: 600;
  color: #3d3d3a;
  margin-bottom: 24px;
}

.password-inputs {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-bottom: 24px;
}

.password-digit {
  flex: 1;
  height: 56px;
  text-align: center;
  border: 2px solid #e8e4df;
  border-radius: 10px;
  padding: 0;
  font-size: 24px;
  font-weight: 600;
  color: #3d3d3a;
  background-color: #f5f0e8;
  box-sizing: border-box;
  min-width: 0;
  transition: all 0.2s ease;
}

.password-digit:focus {
  outline: none;
  border-color: #cc785c;
  box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.15);
  background-color: #fff;
}

.numeric-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}

.keypad-btn {
  width: 100%;
  height: 56px;
  font-size: 20px;
  font-weight: 500;
  background-color: #f5f0e8;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  cursor: pointer;
  color: #3d3d3a;
  transition: all 0.2s ease;
}

.keypad-btn:hover:not(:disabled) {
  background-color: #efe9de;
  border-color: #cc785c;
}

.keypad-btn:active:not(:disabled) {
  background-color: #e8e0d2;
  transform: scale(0.98);
}

.keypad-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.keypad-btn.clear-btn {
  background-color: #e8686a;
  color: white;
  border-color: #e8686a;
}

.keypad-btn.clear-btn:hover {
  background-color: #d8585a;
  border-color: #d8585a;
}

.keypad-btn.submit-btn {
  background-color: #8b9a6d;
  color: white;
  border-color: #8b9a6d;
}

.keypad-btn.submit-btn:hover {
  background-color: #7a895c;
  border-color: #7a895c;
}

.password-error {
  color: #e8686a;
  margin-top: 16px;
  font-weight: 500;
  font-size: 14px;
}

.main-content {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
  margin-left: 200px;
  transition: margin-left 0.3s ease;
}

.main-content.collapsed {
  margin-left: 64px;
}
</style>

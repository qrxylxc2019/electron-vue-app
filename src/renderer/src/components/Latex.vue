<template>
  <span class="latex-content" v-html="renderedHtml"></span>
</template>

<script setup>
import { computed } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

// 匹配 \( ... \) 行内公式、\[ ... \] 块级公式、$...$ 行内公式、$$...$$ 块级公式
const inlineRegex = /\\\((.*?)\\\)/gs
const blockRegex = /\\\[(.*?)\\\]/gs
const dollarInlineRegex = /(?<!\$)\$(?!\$)(.*?)\$(?!\$)/gs
const dollarBlockRegex = /\$\$(.*?)\$\$/gs

const renderedHtml = computed(() => {
  let html = props.content || ''

  // 先处理 $$...$$ 块级公式
  html = html.replace(dollarBlockRegex, (match, equation) => {
    try {
      return katex.renderToString(equation.trim(), {
        throwOnError: false,
        displayMode: true
      })
    } catch (e) {
      console.error('KaTeX $$ block error:', e)
      return match
    }
  })

  // 处理 \[ ... \] 块级公式
  html = html.replace(blockRegex, (match, equation) => {
    try {
      return katex.renderToString(equation.trim(), {
        throwOnError: false,
        displayMode: true
      })
    } catch (e) {
      console.error('KaTeX block error:', e)
      return match
    }
  })

  // 处理 $...$ 行内公式（要在 \( 之前处理，避免冲突）
  html = html.replace(dollarInlineRegex, (match, equation) => {
    try {
      return katex.renderToString(equation.trim(), {
        throwOnError: false,
        displayMode: false
      })
    } catch (e) {
      console.error('KaTeX $ inline error:', e)
      return match
    }
  })

  // 处理 \( ... \) 行内公式
  html = html.replace(inlineRegex, (match, equation) => {
    try {
      return katex.renderToString(equation.trim(), {
        throwOnError: false,
        displayMode: false
      })
    } catch (e) {
      console.error('KaTeX inline error:', e)
      return match
    }
  })

  return html
})
</script>

<style scoped>
.latex-content {
  display: inline;
}
.latex-content :deep(.katex) {
  font-size: 1.1em;
}
.latex-content :deep(.katex-display) {
  margin: 12px 0;
}
</style>

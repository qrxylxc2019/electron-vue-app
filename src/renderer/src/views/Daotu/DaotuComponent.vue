<template>
  <div class="daotu-canvas-container" ref="containerRef">
    <canvas
      ref="canvasRef"
      @click="handleCanvasClick"
      @dblclick="handleCanvasDblClick"
      @mousemove="handleMouseMove"
      @contextmenu.prevent="handleContextMenu"
      :style="{ cursor: hoverNode ? 'pointer' : 'default' }"
    ></canvas>
    
    <!-- 编辑输入框 -->
    <textarea
      v-if="editingNode"
      ref="editInputRef"
      v-model="editingText"
      @blur="handleEditBlur"
      @keyup.enter.ctrl="handleEditBlur"
      class="edit-input"
      :style="{
        left: editInputPosition.x + 'px',
        top: editInputPosition.y + 'px',
        width: editInputPosition.width + 'px',
        minHeight: editInputPosition.height + 'px',
        backgroundColor: isRootNode(editingNode) ? '#4caf50' : '#e8f5e9',
        color: isRootNode(editingNode) ? '#fff' : '#333'
      }"
    ></textarea>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:data']);

const containerRef = ref(null);
const canvasRef = ref(null);
const editInputRef = ref(null);
const editingNode = ref(null);
const editingText = ref('');
const editInputPosition = ref({ x: 0, y: 0, width: 0, height: 0 });
const hoverNode = ref(null);
const collapsedNodes = ref(new Set()); // 存储折叠的节点

let ctx = null;
let canvasWidth = 0;
let canvasHeight = 0;
let nodePositions = []; // 存储所有节点的位置信息

// 检查节点是否为根节点
const isRootNode = (node) => {
  return node === props.data;
};

// 节点样式配置
const nodeStyle = {
  fontSize: 20,
  padding: 15,
  borderRadius: 20,
  rootBgColor: '#4caf50',
  rootTextColor: '#fff',
  childBgColor: '#e8f5e9',
  childTextColor: '#333',
  lineColor: '#4caf50',
  lineWidth: 2,
  minWidth: 140,
  minHeight: 55,
  maxWidth: 500,
  verticalGap: 50,
  horizontalGap: 100,
  addIconSize: 24,
  lineHeight: 1.4
};

// 初始化 Canvas
const initCanvas = () => {
  if (!canvasRef.value || !containerRef.value) return;
  
  const container = containerRef.value;
  const dpr = window.devicePixelRatio || 1;
  
  // 计算需要的画布尺寸（考虑树的大小）
  const minWidth = container.clientWidth;
  const minHeight = container.clientHeight;
  
  // 给画布更大的尺寸以容纳整个树
  canvasWidth = Math.max(minWidth, 2000);
  canvasHeight = Math.max(minHeight, 1500);
  
  // 设置实际画布尺寸（考虑设备像素比）
  canvasRef.value.width = canvasWidth * dpr;
  canvasRef.value.height = canvasHeight * dpr;
  
  // 设置显示尺寸
  canvasRef.value.style.width = canvasWidth + 'px';
  canvasRef.value.style.height = canvasHeight + 'px';
  
  ctx = canvasRef.value.getContext('2d');
  
  // 缩放画布以匹配设备像素比
  ctx.scale(dpr, dpr);
  
  ctx.font = `${nodeStyle.fontSize}px Arial`;
  ctx.textBaseline = 'middle';
  
  drawTree();
};

// 计算文本宽度
const measureText = (text) => {
  if (!ctx) {
    // 如果 ctx 还未初始化，使用临时 canvas 测量
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${nodeStyle.fontSize}px Arial`;
    return tempCtx.measureText(text).width;
  }
  ctx.font = `${nodeStyle.fontSize}px Arial`;
  const metrics = ctx.measureText(text);
  return metrics.width;
};

// 将文本分行
const wrapText = (text, maxWidth) => {
  const words = text.split('');
  const lines = [];
  let currentLine = '';
  
  for (let char of words) {
    const testLine = currentLine + char;
    const testWidth = measureText(testLine);
    
    if (testWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
};

// 计算节点尺寸
const calculateNodeSize = (label) => {
  const maxTextWidth = nodeStyle.maxWidth - nodeStyle.padding * 2;
  const textWidth = measureText(label);
  
  let width, height;
  
  if (textWidth > maxTextWidth) {
    // 需要换行
    const lines = wrapText(label, maxTextWidth);
    const lineHeight = nodeStyle.fontSize * nodeStyle.lineHeight;
    height = Math.max(lines.length * lineHeight + nodeStyle.padding * 2, nodeStyle.minHeight);
    
    // 计算实际最大宽度
    let maxLineWidth = 0;
    for (let line of lines) {
      maxLineWidth = Math.max(maxLineWidth, measureText(line));
    }
    width = Math.min(maxLineWidth + nodeStyle.padding * 2, nodeStyle.maxWidth);
    width = Math.max(width, nodeStyle.minWidth);
  } else {
    // 不需要换行
    width = Math.max(textWidth + nodeStyle.padding * 2, nodeStyle.minWidth);
    width = Math.min(width, nodeStyle.maxWidth);
    height = nodeStyle.minHeight;
  }
  
  return { width, height };
};

// 计算子树的高度
const calculateTreeHeight = (node) => {
  const nodeSize = calculateNodeSize(node.label);
  
  if (!node.children || node.children.length === 0) {
    return nodeSize.height;
  }
  
  let totalHeight = 0;
  for (let child of node.children) {
    totalHeight += calculateTreeHeight(child);
  }
  
  totalHeight += (node.children.length - 1) * nodeStyle.verticalGap;
  
  return Math.max(totalHeight, nodeSize.height);
};

// 绘制圆角矩形
const drawRoundedRect = (x, y, width, height, radius, fillColor, strokeColor) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  
  ctx.fillStyle = fillColor;
  ctx.fill();
  
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

// 绘制节点
const drawNode = (node, x, y, isRoot = false) => {
  const { width, height } = calculateNodeSize(node.label);
  
  // 保存节点位置信息（不直接修改原始节点对象，避免触发 watch）
  const nodeInfo = {
    node,
    position: { x, y, width, height },
    isRoot,
    addIconPosition: null,
    collapseIconPosition: null
  };
  
  // 绘制节点背景
  const bgColor = isRoot ? nodeStyle.rootBgColor : nodeStyle.childBgColor;
  const strokeColor = hoverNode.value === node ? '#2196F3' : null;
  drawRoundedRect(x, y, width, height, nodeStyle.borderRadius, bgColor, strokeColor);
  
  // 绘制文本（支持多行）
  ctx.fillStyle = isRoot ? nodeStyle.rootTextColor : nodeStyle.childTextColor;
  ctx.textAlign = 'center';
  
  const maxTextWidth = nodeStyle.maxWidth - nodeStyle.padding * 2;
  const textWidth = measureText(node.label);
  
  if (textWidth > maxTextWidth) {
    // 多行文本
    const lines = wrapText(node.label, maxTextWidth);
    const lineHeight = nodeStyle.fontSize * nodeStyle.lineHeight;
    const totalTextHeight = lines.length * lineHeight;
    const startY = y + (height - totalTextHeight) / 2 + lineHeight / 2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, x + width / 2, startY + index * lineHeight);
    });
  } else {
    // 单行文本
    ctx.fillText(node.label, x + width / 2, y + height / 2);
  }
  
  // 检查节点是否有子节点
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedNodes.value.has(node);
  
  // 绘制折叠按钮（如果有子节点）
  if (hasChildren) {
    const collapseIconX = x + width + 20;
    const collapseIconY = y + height / 2;
    const collapseIconRadius = nodeStyle.addIconSize / 2;
    
    // 保存折叠按钮位置
    nodeInfo.collapseIconPosition = { x: collapseIconX, y: collapseIconY, radius: collapseIconRadius };
    
    // 绘制圆形背景
    ctx.beginPath();
    ctx.arc(collapseIconX, collapseIconY, collapseIconRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff9800';
    ctx.fill();
    
    // 绘制折叠/展开图标
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    if (isCollapsed) {
      // 绘制展开图标（>）
      ctx.beginPath();
      ctx.moveTo(collapseIconX - 4, collapseIconY - 6);
      ctx.lineTo(collapseIconX + 4, collapseIconY);
      ctx.lineTo(collapseIconX - 4, collapseIconY + 6);
      ctx.stroke();
    } else {
      // 绘制折叠图标（v）
      ctx.beginPath();
      ctx.moveTo(collapseIconX - 6, collapseIconY - 3);
      ctx.lineTo(collapseIconX, collapseIconY + 4);
      ctx.lineTo(collapseIconX + 6, collapseIconY - 3);
      ctx.stroke();
    }
  }
  
  // 绘制添加按钮（圆形加号）
  const addIconOffset = hasChildren ? 50 : 20; // 如果有折叠按钮，添加按钮向右偏移，保持间距
  const addIconX = x + width + addIconOffset;
  const addIconY = y + height / 2;
  const addIconRadius = nodeStyle.addIconSize / 2;
  
  // 保存添加按钮位置
  nodeInfo.addIconPosition = { x: addIconX, y: addIconY, radius: addIconRadius };
  
  // 将节点信息保存到数组
  nodePositions.push(nodeInfo);
  
  // 绘制圆形背景
  ctx.beginPath();
  ctx.arc(addIconX, addIconY, addIconRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#4caf50';
  ctx.fill();
  
  // 绘制加号
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(addIconX - 7, addIconY);
  ctx.lineTo(addIconX + 7, addIconY);
  ctx.moveTo(addIconX, addIconY - 7);
  ctx.lineTo(addIconX, addIconY + 7);
  ctx.stroke();
  
  return { width, height };
};

// 绘制连接线（带圆角效果）
const drawLine = (x1, y1, x2, y2) => {
  ctx.strokeStyle = nodeStyle.lineColor;
  ctx.lineWidth = nodeStyle.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  
  // 绘制平滑的贝塞尔曲线
  const controlPointOffset = (x2 - x1) * 0.5;
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(
    x1 + controlPointOffset, y1,
    x2 - controlPointOffset, y2,
    x2, y2
  );
  ctx.stroke();
};

// 绘制横线（用于连接节点和按钮）
const drawHorizontalLine = (x1, y1, x2, y2) => {
  ctx.strokeStyle = nodeStyle.lineColor;
  ctx.lineWidth = nodeStyle.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

// 递归绘制树
const drawTreeNode = (node, x, y, isRoot = false) => {
  if (!node) return 0;
  
  // 先计算节点尺寸
  const nodeSize = calculateNodeSize(node.label);
  const nodeHeight = nodeSize.height;
  
  // 绘制节点
  const { width, height } = drawNode(node, x, y - nodeHeight / 2, isRoot);
  
  // 检查节点是否有子节点和折叠状态
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedNodes.value.has(node);
  
  // 计算按钮位置
  const nodeRightX = x + width;
  const nodeRightY = y;
  const collapseIconX = nodeRightX + 20;
  const addIconOffset = hasChildren ? 50 : 20;
  const addIconX = nodeRightX + addIconOffset;
  
  // 绘制从节点右侧到折叠按钮的横线（如果有子节点）
  if (hasChildren) {
    drawHorizontalLine(nodeRightX, nodeRightY, collapseIconX, nodeRightY);
  }
  
  // 绘制从折叠按钮（或节点右侧）到添加按钮的横线
  const lineStartX = hasChildren ? collapseIconX : nodeRightX;
  drawHorizontalLine(lineStartX, nodeRightY, addIconX, nodeRightY);
  
  if (node.children && node.children.length > 0 && !isCollapsed) {
    const treeHeight = calculateTreeHeight(node);
    let currentY = y - treeHeight / 2;
    
    for (let child of node.children) {
      const childHeight = calculateTreeHeight(child);
      const childY = currentY + childHeight / 2;
      
      // 绘制从添加按钮右侧到子节点的连接线
      const startX = addIconX;
      const startY = nodeRightY;
      const endX = x + width + nodeStyle.horizontalGap;
      const endY = childY;
      
      drawLine(startX, startY, endX, endY);
      
      // 递归绘制子节点
      drawTreeNode(child, x + width + nodeStyle.horizontalGap, childY);
      
      currentY += childHeight + nodeStyle.verticalGap;
    }
  }
  
  return height;
};

// 绘制整棵树
const drawTree = () => {
  if (!ctx || !props.data) {
    return;
  }
  
  try {
    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // 清空节点位置数组
    nodePositions = [];
    
    // 从左侧中间位置开始绘制
    const startX = 50;
    const startY = canvasHeight / 2;
    
    drawTreeNode(props.data, startX, startY, true);
  } catch (error) {
    console.error('绘制思维导图时出错:', error);
  }
};

// 查找点击的节点
const findNodeAtPosition = (x, y) => {
  for (let i = nodePositions.length - 1; i >= 0; i--) {
    const nodeInfo = nodePositions[i];
    const pos = nodeInfo.position;
    
    if (x >= pos.x && x <= pos.x + pos.width &&
        y >= pos.y && y <= pos.y + pos.height) {
      return nodeInfo.node;
    }
  }
  return null;
};

// 查找点击的添加按钮
const findAddIconAtPosition = (x, y) => {
  for (let i = nodePositions.length - 1; i >= 0; i--) {
    const nodeInfo = nodePositions[i];
    const addIcon = nodeInfo.addIconPosition;
    
    if (!addIcon) continue;
    
    const distance = Math.sqrt(
      Math.pow(x - addIcon.x, 2) + Math.pow(y - addIcon.y, 2)
    );
    
    if (distance <= addIcon.radius + 5) {
      return nodeInfo.node;
    }
  }
  return null;
};

// 查找点击的折叠按钮
const findCollapseIconAtPosition = (x, y) => {
  for (let i = nodePositions.length - 1; i >= 0; i--) {
    const nodeInfo = nodePositions[i];
    const collapseIcon = nodeInfo.collapseIconPosition;
    
    if (!collapseIcon) continue;
    
    const distance = Math.sqrt(
      Math.pow(x - collapseIcon.x, 2) + Math.pow(y - collapseIcon.y, 2)
    );
    
    if (distance <= collapseIcon.radius + 5) {
      return nodeInfo.node;
    }
  }
  return null;
};

// Canvas 点击事件
const handleCanvasClick = (event) => {
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // 检查是否点击了折叠按钮
  const collapseIconNode = findCollapseIconAtPosition(x, y);
  if (collapseIconNode) {
    handleToggleCollapse(collapseIconNode);
    return;
  }
  
  // 检查是否点击了添加按钮
  const addIconNode = findAddIconAtPosition(x, y);
  if (addIconNode) {
    handleAddChild(addIconNode);
    return;
  }
};

// Canvas 双击事件（编辑节点）
const handleCanvasDblClick = (event) => {
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const node = findNodeAtPosition(x, y);
  if (node) {
    startEditNode(node);
  }
};

// 鼠标移动事件
const handleMouseMove = (event) => {
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const node = findNodeAtPosition(x, y);
  const addIconNode = findAddIconAtPosition(x, y);
  const collapseIconNode = findCollapseIconAtPosition(x, y);
  
  if (node || addIconNode || collapseIconNode) {
    hoverNode.value = node || addIconNode || collapseIconNode;
    drawTree();
  } else if (hoverNode.value) {
    hoverNode.value = null;
    drawTree();
  }
};

// 开始编辑节点
const startEditNode = (node) => {
  // 查找节点信息
  const nodeInfo = nodePositions.find(info => info.node === node);
  if (!nodeInfo) return;
  
  editingNode.value = node;
  editingText.value = node.label;
  
  const pos = nodeInfo.position;
  editInputPosition.value = {
    x: pos.x,
    y: pos.y,
    width: pos.width,
    height: pos.height
  };
  
  nextTick(() => {
    if (editInputRef.value) {
      editInputRef.value.focus();
      editInputRef.value.select();
    }
  });
};

// 完成编辑
const handleEditBlur = () => {
  if (editingNode.value) {
    editingNode.value.label = editingText.value || '未命名';
    editingNode.value = null;
    
    // 触发数据更新
    emit('update:data', props.data);
    
    drawTree();
  }
};

// 切换折叠状态
const handleToggleCollapse = (node) => {
  if (collapsedNodes.value.has(node)) {
    collapsedNodes.value.delete(node);
  } else {
    collapsedNodes.value.add(node);
  }
  drawTree();
};

// 添加子节点
const handleAddChild = (parentNode) => {
  if (!parentNode.children) {
    parentNode.children = [];
  }
  
  const newNode = {
    label: '新节点',
    children: []
  };
  
  parentNode.children.push(newNode);
  
  // 触发数据更新
  emit('update:data', props.data);
  
  drawTree();
};

// 删除节点
const deleteNode = (nodeToDelete, parentNode = null) => {
  if (!parentNode) {
    // 尝试在整个树中查找并删除节点
    const deleteFromTree = (node, target) => {
      if (!node.children) return false;
      
      const index = node.children.findIndex(child => child === target);
      if (index !== -1) {
        node.children.splice(index, 1);
        return true;
      }
      
      for (let child of node.children) {
        if (deleteFromTree(child, target)) {
          return true;
        }
      }
      return false;
    };
    
    deleteFromTree(props.data, nodeToDelete);
  } else {
    const index = parentNode.children.indexOf(nodeToDelete);
    if (index !== -1) {
      parentNode.children.splice(index, 1);
    }
  }
  
  // 触发数据更新
  emit('update:data', props.data);
  drawTree();
};

// 右键菜单处理
const handleContextMenu = (event) => {
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const node = findNodeAtPosition(x, y);
  if (node && !isRootNode(node)) {
    // 只允许删除非根节点
    if (confirm(`确定要删除节点"${node.label}"吗？`)) {
      deleteNode(node);
    }
  }
};

// 窗口大小改变时重新绘制
const handleResize = () => {
  initCanvas();
};

// 监听数据变化
watch(() => props.data, () => {
  nextTick(() => {
    drawTree();
  });
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    try {
      initCanvas();
      window.addEventListener('resize', handleResize);
    } catch (error) {
      console.error('Canvas 初始化失败:', error);
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// 暴露方法给父组件
defineExpose({
  redraw: drawTree
});
</script>

<style scoped>
.daotu-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: rgb(244, 249, 244);
  overflow: auto;
}

canvas {
  display: block;
}

.edit-input {
  position: absolute;
  border: 2px solid #2196F3;
  border-radius: 20px;
  padding: 12px;
  font-size: 20px;
  text-align: center;
  outline: none;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  resize: vertical;
  line-height: 1.4;
  font-family: Arial, sans-serif;
  overflow-wrap: break-word;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.edit-input:focus {
  border-color: #1976D2;
}
</style>


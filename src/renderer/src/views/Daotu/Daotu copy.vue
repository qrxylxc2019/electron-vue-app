<template>
  <div class="daotu-container">
    <div class="left-panel">
      <el-table 
        :show-header="false" 
        :data="tableData" 
        style="width: 100%;" 
        class="custom-table"
        :row-style="{ height: '80px' }"
        :border="false"
        @row-click="handleRowClick">
        <el-table-column>
          <template #default="scope">
            <div class="table-item" :class="{ 'table-item-active': scope.row.isSelected }">
              <div class="item-left">
                <img src="@/assets/png/pdf.png" style="width: 30px; height: 30px;" />
              </div>
              <div class="item-right">
                <div class="item-name">{{ scope.row.name }}</div>
                <div class="item-time">{{ scope.row.time || '2025-07-04' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="add-button-container">
        <el-button type="success" @click="createNewDaotu">新建导图</el-button>
      </div>
    </div>
    <div class="right-panel">
      <div class="button-bar">
        <el-input v-model="currentDaotu.name" placeholder="导图名称" style="width: 200px; margin-right: 10px;"></el-input>
        <el-button type="primary" @click="saveTreeData">保存</el-button>
      </div>
      <div class="tree-container">
        <vue3-tree-org
          :data="treeData"
          :props="defaultProps"
          :horizontal="true"
          :center="true"
          :default-expand-level="999"
          collapsable
          style="background-color:rgb(244, 249, 244);"
          @node-click="handleNodeClick"
        >
          <template #default="{ node }">
            <div class="custom-node" @click="handleNodeClick(node)">
              <el-input 
                v-if="editingNode === node"
                v-model="node.label" 
                @blur="handleBlur"
                @keyup.enter="handleBlur"
                size="large"
                autofocus
                :style="{
                  fontSize: '16px',
                  backgroundColor: node.label === '根节点' ? '#4caf50' : '#e8f5e9',
                  color: node.label === '根节点' ? '#fff' : '#333'
                }"
              />
              <div 
                v-else
                class="node-text"
                :style="{
                  backgroundColor: node.label === '根节点' ? '#4caf50' : '#e8f5e9',
                  color: node.label === '根节点' ? '#fff' : '#333'
                }"
              >
                {{ node.label }}
              </div>
            </div>
          </template>
        </vue3-tree-org>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import "vue3-tree-org/lib/vue3-tree-org.css";
import { Vue3TreeOrg } from "vue3-tree-org";
import { ElMessage } from "element-plus";
import request from '@/utils/request';

// 树形数据
const treeData = ref({
  label: "根节点",
  children: [
    {
      label: "子节点1",
      children: [
        { label: "子节点1-1" },
        { label: "子节点1-2" },
      ],
    },
    {
      label: "子节点2",
      children: [{ label: "子节点2-1" }],
    },
  ],
});

// 表格数据
const tableData = ref([]);

// 当前选中的导图
const currentDaotu = ref({
  id: null,
  name: '新思维导图',
  content: null
});

// 当前编辑的节点
const editingNode = ref(null);

const defaultProps = ref({
  label: "label",
  children: "children",
});

// 获取导图列表
const getDaotuList = async () => {
  try {
    const response = await request.post('/api/daotu/list', {});
    console.log('获取导图列表成功:', response);
    if (response.code === 200) {
      tableData.value = response.result.list;
    }
  } catch (error) {
    console.error('获取导图列表失败:' + JSON.stringify(error));
    ElMessage.error('获取导图列表失败' + JSON.stringify(error));
  }
};

// 获取导图详情
const getDaotuDetail = async (id) => {
  console.log('getDaotuDetail =============')
  const response = await request.get(`/api/daotu/detail?id=${id}`);
  try {
    if (response.code === 200) {
      const data = response.data;
      currentDaotu.value = {
        id: data.id,
        name: data.name || '未命名导图',
        content: data.content
      };
      
      if (data.content) {
        treeData.value = JSON.parse(data.content);
      }
    }
  } catch (error) {
    console.error('获取导图详情失败:', error);
    ElMessage.error('获取导图详情失败');
  }
};

// 节点点击事件处理
const handleNodeClick = (node) => {
  console.log("点击节点:", node);
  // 设置当前节点为编辑状态
  editingNode.value = node;
};

// 失去焦点时取消编辑状态
const handleBlur = () => {
  editingNode.value = null;
};

// 表格行点击事件
const handleRowClick = (row) => {
  // 清除其他行的选中效果
  tableData.value.forEach(item => {
    item.isSelected = false;
  });
  // 设置当前行为选中状态
  row.isSelected = true;
  getDaotuDetail(row.id);
};

// 添加子节点的方法
const addChildNode = (node) => {
  if (!node.children) {
    node.children = [];
  }
  node.children.push({
    label: "新节点",
    children: [],
  });
};

// 创建新导图
const createNewDaotu = () => {
  currentDaotu.value = {
    id: null,
    name: '新思维导图',
    content: null
  };
  
  treeData.value = {
    label: "根节点",
    children: []
  };
};

// 保存树形数据
const saveTreeData = async () => {
  try {
    const content = JSON.stringify(treeData.value);
    const params = {
      name: currentDaotu.value.name,
      content
    };
    
    let response;
    if (currentDaotu.value.id) {
      // 如果有ID，说明是编辑现有导图
      params.id = currentDaotu.value.id;
      response = await request.post('/api/daotu/update', params);
    } else {
      // 如果没有ID，说明是新建导图
      response = await request.post('/api/daotu/save', params);
    }
    
    if (response.code === 200) {
      ElMessage.success('保存成功');
      // 更新当前导图ID（新建时需要）
      if (!currentDaotu.value.id && response.data && response.data.id) {
        currentDaotu.value.id = response.data.id;
      }
      // 刷新列表
      getDaotuList();
    } else {
      ElMessage.error(response.data.message || '保存失败');
    }
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败');
  }
};

// 页面加载时获取导图列表
onMounted(() => {
  getDaotuList();
});
</script>

<style scoped>
.daotu-container {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: rgb(244, 249, 244);
}

.left-panel {
  width: 300px;
  padding: 20px 0px;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
}

.add-button-container {
  padding: 10px;
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.right-panel {
  flex: 1;
  overflow: auto;
  position: relative;
}

.tree-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.button-bar {
  position: absolute;
  width: 80%;
  left: 50%;
  transform: translateX(-50%);
  top: 10px;
  padding: 10px;
  background-color: rgb(255, 255, 255);
  border-radius: 9px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  z-index: 10;
}

:deep(.org-tree-node-label) {
  background-color: #e8f5e9;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 8px;
}

:deep(.org-tree-node-children) {
  padding-top: 20px;
}

:deep(.tree-org-node__content) {
  max-width: 800px;
  min-width: 200px;
}

:deep(.tree-org-node__inner) {
  border-radius: 15px;
  color: #333;
  box-shadow: none;
  background-color: #e8f5e9;
  border: 2px solid rgb(187, 232, 191);
}

.custom-node {
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
  cursor: pointer;
  min-width: 150px;
}

.node-text {
  padding: 8px 16px;
  border-radius: 15px;
  font-size: 16px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-word;
  transition: all 0.3s ease;
}

.node-text:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.custom-node .el-input__wrapper) {
  border-radius: 15px;
  box-shadow: none;
  border: none;
}

:deep(.custom-node .el-input__inner) {
  text-align: center;
  border-radius: 15px;
}

.add-btn {
  padding: 2px 8px;
  background-color: #218ee8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  z-index: 2;
}

:deep(.custom-table) {
  background-color: transparent;
}

:deep(.el-table__row) {
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

:deep(.el-table__cell) {
  border: none !important;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell) {
  background: none;
}

.table-item {
  display: flex;
  align-items: center;
  padding:10px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f5e9 100%);
  border-radius: 8px!important;
}

:deep(.el-table td.el-table__cell div){
  border-radius: 8px!important;
}


.table-item:hover {
  background: linear-gradient(135deg, #f0f7ff 0%,rgb(197, 247, 201) 100%);
}

.table-item-active {
  background: linear-gradient(135deg, #f0f7ff 0%,rgb(197, 247, 201) 100%) !important;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
}

.item-left {
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  padding: 5px;
}

.item-right {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 16px;
  font-weight: 800;
  color: #333;
  margin-bottom: 6px;
}

.item-time {
  font-size: 12px;
  color: #999;
}
</style>

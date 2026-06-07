<template>
  <div class="daotu-container">
    <div class="left-panel">
      <!-- 新建导图按钮 -->
      <div class="add-button-container">
        <el-button size="large" type="success" @click="createNewDaotu" :icon="Plus">
        </el-button>
      </div>
      
      <el-table 
        :show-header="false" 
        :data="tableData" 
        height="calc(100vh - 220px)"
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
      
      <!-- 分页组件 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :small="true"
          layout="total, prev, pager, next"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
    <div class="right-panel">
      <div class="button-bar">
        <el-input v-model="currentDaotu.name" placeholder="导图名称" style="width: 200px; margin-right: 10px;"></el-input>
        <el-button type="primary" @click="saveTreeData">保存</el-button>
        <el-button type="warning" @click="deleteTreeData">删除</el-button>
      </div>
      <div class="tree-container" v-if="treeData">
        <DaotuComponent 
          :data="treeData"
          @update:data="handleTreeDataUpdate"
        />
      </div>
      <div v-else class="loading-container">
        <p>加载中...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Plus } from '@element-plus/icons-vue';
import request from '@/utils/request';
import DaotuComponent from './DaotuComponent.vue';

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

// 分页数据
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
});

// 当前选中的导图
const currentDaotu = ref({
  id: null,
  name: '新思维导图',
  content: null
});

// 处理树数据更新
const handleTreeDataUpdate = (newData) => {
  treeData.value = newData;
};

// 获取导图列表
const getDaotuList = async () => {
  try {
    const response = await request.post('/api/daotu/list', {
      page: pagination.value.page,
      pageNum: pagination.value.pageSize
    });
    console.log('获取导图列表成功:', response);
    if (response.code === 200) {
      tableData.value = response.result.list;
      // 从 pagination 对象中获取 total
      pagination.value.total = response.result.pagination?.total || 0;
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

// 删除导图
const deleteTreeData = async () => {
  try {
    // 检查是否选中了导图
    if (!currentDaotu.value.id) {
      ElMessage.warning('请先选择要删除的导图');
      return;
    }
    
    // 调用删除接口
    const response = await request.post('/api/daotu/delete', {
      id: currentDaotu.value.id
    });
    
    if (response.code === 200) {
      ElMessage.success('删除成功');
      // 重置当前导图
      currentDaotu.value = {
        id: null,
        name: '新思维导图',
        content: null
      };
      // 重置树形数据
      treeData.value = {
        label: "根节点",
        children: []
      };
      // 刷新列表
      getDaotuList();
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败');
  }
};

// 分页大小改变事件
const handleSizeChange = (val) => {
  pagination.value.pageSize = val;
  pagination.value.page = 1; // 重置到第一页
  getDaotuList();
};

// 当前页改变事件
const handleCurrentChange = (val) => {
  pagination.value.page = val;
  getDaotuList();
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

.pagination-container {
  padding: 10px;
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.add-button-container {
  padding: 10px;
  display: flex;
}

.right-panel {
  flex: 1;
  position: relative;
}

.tree-container {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: scroll;
  width: 100%;
}

/* 自定义滚动条样式 */
.tree-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tree-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.tree-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
  transition: background 0.3s;
}

.tree-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 左侧面板滚动条样式 */
.left-panel::-webkit-scrollbar {
  width: 6px;
}

.left-panel::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.left-panel::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 3px;
  transition: background 0.3s;
}

.left-panel::-webkit-scrollbar-thumb:hover {
  background: #b0b0b0;
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
  padding:10px 0;
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

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 18px;
  color: #666;
}

:deep(.el-table .el-table__cell){
  padding: 0;
}
</style>

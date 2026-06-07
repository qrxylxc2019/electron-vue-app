<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2024-07-05 00:00:00
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-07-05 00:00:00
 * @FilePath: \eletron\frontend\src\views\OrderManagement\OrderManagement.vue
 * @Description: 订单管理组件，用于程序员项目接单
-->
<template>
  <div class="order-container">
    <div class="content">
      <!-- 筛选和搜索 -->
      <div class="filter-container">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <el-form-item label="技术类型" style="width: 180px;">
            <el-select v-model="filterForm.techType" placeholder="选择" size="large">
              <el-option label="全部" value="" />
              <el-option label="自研" :value="1" />
              <el-option label="产品" :value="2" />
              <el-option label="订单" :value="3" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-input 
              v-model="filterForm.keyword" 
              placeholder="搜索订单关键词" 
              clearable
              prefix-icon="Search"
              size="large"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchOrders" size="large">搜索</el-button>
            <el-button @click="resetFilter" size="large">重置</el-button>
            <el-button type="primary" @click="createNewOrder" size="large">新建订单</el-button>
          </el-form-item>
        </el-form>
      </div>
      <!-- 表格区域 -->
      <div>
        <el-table
          v-loading="tableLoading"
          :data="orderList"
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="编号" width="100">
            <template #default="scope">
              {{ (currentPage - 1) * pageSize + scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="projectName" label="项目名称" />
          <el-table-column prop="customerName" label="客户名称" />
          <el-table-column prop="amount" label="价格" sortable>
            <template #default="scope">
              <span class="amount">¥ {{ scope.row.amount.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="techType" label="技术类型" >
            <template #default="scope">
              <el-tag :type="getTechTagType(scope.row.techType)">
                {{ getTechTypeName(scope.row.techType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="progress" label="进度">
            <template #default="scope">
              <el-progress 
                :percentage="scope.row.progress" 
                :status="getProgressStatus(scope.row.progress)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="290">
            <template #default="scope">
              <el-button 
                type="primary" 
                @click="editOrder(scope.row)"
              >编辑</el-button>
              <el-button 
                type="danger" 
                @click="deleteOrder(scope.row)"
              >删除</el-button>
              <el-dropdown style="margin-left:10px" trigger="click" @command="(command) => handleCommand(command, scope.row)">
                <el-button type="primary">
                  更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="communicate">沟通记录</el-dropdown-item>
                    <el-dropdown-item command="files">文件管理</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 30, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalOrders"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
    
    <!-- 订单表单对话框 -->
    <el-dialog
      v-model="orderDialogVisible"
      :title="orderFormTitle"
      width="50%"
      destroy-on-close
    >
      <el-form
        :model="orderForm"
        :rules="orderRules"
        ref="orderFormRef"
        label-width="100px"
        label-position="right"
        style="padding:0 50px"
      >
        <el-form-item label="客户名称" prop="customerName">
          <el-input v-model="orderForm.customerName" placeholder="请输入客户名称" size="large" />
        </el-form-item>
        
        <el-form-item label="项目名称" prop="projectName">
          <el-input v-model="orderForm.projectName" placeholder="请输入项目名称" size="large" />
        </el-form-item>
        
        <el-form-item label="技术类型" prop="techType">
          <el-select v-model="orderForm.techType" placeholder="选择技术类型" style="width: 100%" size="large">
            <el-option label="自研" :value="1" />
            <el-option label="产品" :value="2" />
            <el-option label="订单" :value="3" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="订单金额" >
          <el-input-number v-model="orderForm.amount" :min="0" :precision="2" :step="100" style="width: 100%" size="large" />
        </el-form-item>
        
        <el-form-item label="项目详情" >
          <el-input 
            v-model="orderForm.description" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入项目详情描述" 
            size="large"
          />
        </el-form-item>
        

        
        <el-form-item label="完成进度" prop="progress">
          <el-slider v-model="orderForm.progress" :step="5" show-input size="large" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="orderDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitOrderForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  List, Timer, Loading, CircleCheckFilled, CircleCloseFilled, 
  DataAnalysis, Setting, Search, ArrowDown 
} from '@element-plus/icons-vue'
import request from '@/utils/request'

// 数据定义
const activeMenu = ref('all')
const tableLoading = ref(false)
const orderList = ref([])
const selectedOrders = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalOrders = ref(0)
const orderDialogVisible = ref(false)
const isEditMode = ref(false)
const orderFormRef = ref(null)

// 菜单标题映射
const menuTitles = {
  'all': '所有订单',
  'pending': '待接单',
  'in-progress': '进行中',
  'completed': '已完成',
  'cancelled': '已取消',
  'statistics': '统计分析',
  'settings': '订单设置'
}

// 筛选条件
const filterForm = reactive({
  dateRange: [],
  minAmount: null,
  maxAmount: null,
  techType: '',
  keyword: ''
})

// 订单表单
const orderForm = reactive({
  id: null,
  orderNo: '',
  customerName: '',
  customerContact: '',
  projectName: '',
  techType: '',
  amount: 0,
  startDate: '',
  deadline: '',
  description: '',

  progress: 0,
})

// 表单验证规则
const orderRules = {
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  customerContact: [{ required: true, message: '请输入联系方式', trigger: 'blur' }],
  projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  techType: [{ required: true, message: '请选择技术类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入订单金额', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止日期', trigger: 'change' }],
  description: [{ required: true, message: '请输入项目详情', trigger: 'blur' }],
}

// 计算订单表单标题
const orderFormTitle = computed(() => {
  return isEditMode.value ? '编辑订单' : '新建订单'
})

// 生命周期
onMounted(() => {
  fetchOrders()
})

// 方法定义
const handleMenuSelect = (key) => {
  activeMenu.value = key
  currentPage.value = 1
  fetchOrders()
}

const fetchOrders = async () => {
  tableLoading.value = true
  try {
    // 构建查询条件
    const conditions = {}
    
    // 根据菜单选项设置状态过滤
    if (activeMenu.value !== 'all' && activeMenu.value !== 'statistics' && activeMenu.value !== 'settings') {
      if (activeMenu.value === 'pending') {
        conditions.progress = 0
      } else if (activeMenu.value === 'in-progress') {
        // 进行中: 进度大于0且小于100
      } else if (activeMenu.value === 'completed') {
        conditions.progress = 100
      }
    }
    
    // 添加搜索关键词
    if (filterForm.keyword) {
      conditions.name = filterForm.keyword
    }
    
    // 添加金额范围
    if (filterForm.minAmount !== null) {
      conditions.minAmount = filterForm.minAmount
    }
    if (filterForm.maxAmount !== null) {
      conditions.maxAmount = filterForm.maxAmount
    }
    
    // 添加技术类型
    if (filterForm.techType) {
      conditions.type = filterForm.techType
    }
    
    // 调用API获取软件数据
    const res = await request.post('http://localhost:8000/api/software/get', {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: conditions,
      orderBy: {
        column: "id",
        type: "desc"
      }
    })
    console.log('软件列表res======', res);
    if (res.code === 200) {
      // 转换数据格式以匹配表格需求
      const softwareData = res.result.list || []
      
      orderList.value = softwareData.map(item => ({
        id: item.id,
        customerName: item.client || '未指定',
        projectName: item.name || '未命名项目',
        amount: item.amount || 0,
        techType: item.type,
        progress: item.progress || 0,
        description: item.description || '',
        dir: item.dir || ''
      }))
      
      totalOrders.value = res.result.pagination?.total || 0
    } else {
      ElMessage.error(res.message || '获取数据失败')
      orderList.value = []
      totalOrders.value = 0
    }
  } catch (error) {
    console.error('获取订单数据失败:', error)
    ElMessage.error('获取订单数据失败')
  } finally {
    tableLoading.value = false
  }
}

const searchOrders = () => {
  currentPage.value = 1
  fetchOrders()
}

const resetFilter = () => {
  filterForm.dateRange = []
  filterForm.minAmount = null
  filterForm.maxAmount = null
  filterForm.techType = ''
  filterForm.keyword = ''
  searchOrders()
}

const handleSelectionChange = (selection) => {
  selectedOrders.value = selection
}

const handleSizeChange = (size) => {
  pageSize.value = size
  fetchOrders()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  fetchOrders()
}

const createNewOrder = () => {
  // 重置表单
  Object.keys(orderForm).forEach(key => {
    if (key !== 'progress') {
      orderForm[key] = key === 'amount' ? 0 : ''
    }
  })
  orderForm.progress = 0
  orderForm.startDate = new Date().toISOString().split('T')[0]
  
  isEditMode.value = false
  orderDialogVisible.value = true
}

const editOrder = (row) => {
  // 填充表单数据
  Object.keys(orderForm).forEach(key => {
    if (key in row) {
      // 确保技术类型是数字类型
      if (key === 'techType') {
        orderForm[key] = Number(row[key])
      } else {
        orderForm[key] = row[key]
      }
    }
  })
  
  isEditMode.value = true
  orderDialogVisible.value = true
}

const submitOrderForm = async () => {
  if (!orderFormRef.value) return
  
  await orderFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 将表单数据转换为API所需格式
        const softwareData = {
          name: orderForm.projectName,
          description: orderForm.description,
          amount: orderForm.amount,
          client: orderForm.customerName,
          type: orderForm.techType, // techType 现在已经是数字类型
          progress: orderForm.progress,
          dir: '' // 可以根据需要设置
        }
        
        let res
        if (isEditMode.value) {
          // 更新软件
          res = await request.post('http://localhost:8000/api/software/update', {
            id: orderForm.id,
            ...softwareData
          })
        } else {
          // 添加软件
          res = await request.post('http://localhost:8000/api/software/add', softwareData)
        }
        
        if (res.code === 200) {
          ElMessage.success(isEditMode.value ? '订单更新成功' : '订单创建成功')
          orderDialogVisible.value = false
          fetchOrders() // 刷新订单列表
        } else {
          ElMessage.error(res.message || '保存失败')
        }
      } catch (error) {
        console.error('保存订单失败:', error)
        ElMessage.error('保存订单失败: ' + (error.response?.data?.message || error.message))
      }
    }
  })
}

const viewOrder = (row) => {
  // 查看订单详情
  ElMessageBox.alert(`订单 ${row.orderNo} 的详细信息`, '订单详情', {
    confirmButtonText: '确定'
  })
}

const handleCommand = (command, row) => {
  switch (command) {
    case 'communicate':
      ElMessage.info(`查看与 ${row.customerName} 的沟通记录`)
      break
    case 'files':
      ElMessage.info(`管理 ${row.projectName} 的文件`)
      break
    case 'invoice':
      ElMessage.info(`为 ${row.projectName} 生成发票`)
      break
    case 'delete':
      deleteOrder(row)
      break
  }
}

const deleteOrder = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除订单吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 调用API删除软件
    const res = await request.post('http://localhost:8000/api/software/delete', { 
      id: row.id 
    })
    
    if (res.code === 200) {
      ElMessage.success('订单删除成功')
      fetchOrders() // 刷新订单列表
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除订单失败:', error)
    ElMessage.error('删除订单失败: ' + (error.response?.data?.message || error.message))
  }
}

const batchDelete = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择要删除的订单')
    return
  }
  
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedOrders.value.length} 个订单吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 逐个删除选中的订单
    const deletePromises = selectedOrders.value.map(item => 
      request.post('http://localhost:8000/api/software/delete', { id: item.id })
    )
    
    const results = await Promise.all(deletePromises)
    const failedCount = results.filter(res => !res.data || res.data.code !== 200).length
    
    if (failedCount === 0) {
      ElMessage.success('批量删除成功')
    } else {
      ElMessage.warning(`删除完成，但有 ${failedCount} 个订单删除失败`)
    }
    
    fetchOrders() // 刷新订单列表
  } catch (error) {
    if (error === 'cancel') return
    console.error('批量删除失败:', error)
    ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message))
  }
}

const exportOrders = () => {
  ElMessage.success('订单数据导出成功')
}

// 获取技术类型标签样式
const getTechTagType = (type) => {
  const types = {
    '1': 'success',
    '2': 'warning',
    '3': 'danger',
  }
  return types[type] || 'info'
}

// 获取技术类型名称
const getTechTypeName = (type) => {
  const names = {
    1: '自研',
    2: '产品',
    3:'订单'
  }
  return names[type] || type
}



// 获取进度条状态
const getProgressStatus = (progress) => {
  if (progress < 30) return 'exception'
  if (progress < 70) return 'warning'
  return 'success'
}
</script>

<style scoped>
.order-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

.header {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
}

.header h1 {
  font-size: 24px;
  color: #1a1a1a;
}
.line{
  height: 2px;
  background-color: #e8e4df;
  margin: 30px 0;
}
.content {
  height: calc(100% - 76px);
}

/* Commerce 风格表格 */
:deep(.el-table) {
  --el-table-border-color: #e8e4df;
  --el-table-header-bg-color: #f5f3f0;
  --el-table-row-hover-bg-color: #faf8f5;
  font-size: 16px;
  background-color: #fff;
  border-radius: 12px;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

:deep(.el-table__body) {
  background-color: #fff;
}

:deep(.el-table .el-table__header th) {
  font-size: 16px;
  font-weight: 600;
  color: #6b6560;
  background-color: #f5f3f0 !important;
  padding: 12px 16px;
}

:deep(.el-table .cell) {
  font-size: 16px;
  color: #1a1a1a;
  line-height: 1.5;
}

:deep(.el-table__row) {
  background-color: #fff;
  height: 50px !important;
  line-height: 50px !important;
}

:deep(.el-table__row:hover) {
  background-color: #faf8f5 !important;
}

:deep(.el-table__cell) {
  padding: 8px 16px !important;
}

:deep(.el-tag) {
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  padding: 4px 10px;
}

/* 分页按钮样式 */
:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next) {
  background-color: #1a1a1a;
  color: white;
  border-radius: 8px;
  padding: 0 15px;
  height: 32px;
  line-height: 32px;
  margin: 0 5px;
}

:deep(.el-pagination button:disabled) {
  background-color: #c0c4cc;
  color: white;
}

/* 主要按钮样式 - 深绿色 */
:deep(.el-button--primary) {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  border-radius: 10px;
}

:deep(.el-button--primary:hover) {
  background-color: #7a895c;
  border-color: #7a895c;
}

/* link 类型按钮 */
:deep(.el-button--primary.is-link) {
  background-color: transparent;
  border-color: transparent;
  color: #8b9a6d;
}

:deep(.el-button--primary.is-link:hover) {
  color: #7a895c;
  background-color: rgba(139, 154, 109, 0.1);
}

/* 危险/删除按钮样式 */
:deep(.el-button--danger) {
  background-color: #e8686a;
  border-color: #e8686a;
  border-radius: 10px;
}

:deep(.el-button--danger:hover) {
  background-color: #d8585a;
  border-color: #d8585a;
}

/* link 类型危险按钮 */
:deep(.el-button--danger.is-link) {
  background-color: transparent;
  border-color: transparent;
  color: #e8686a;
}

:deep(.el-button--danger.is-link:hover) {
  color: #d8585a;
  background-color: rgba(232, 104, 106, 0.1);
}

/* 信息按钮样式 */
:deep(.el-button--info) {
  background-color: #9a9590;
  border-color: #9a9590;
  border-radius: 10px;
}

:deep(.el-button--info:hover) {
  background-color: #8a8580;
  border-color: #8a8580;
}

/* 警告按钮样式 */
:deep(.el-button--warning) {
  background-color: #c4a882;
  border-color: #c4a882;
  border-radius: 10px;
  color: #fff;
}

:deep(.el-button--warning:hover) {
  background-color: #b59872;
  border-color: #b59872;
  color: #fff;
}

/* 默认按钮样式 */
:deep(.el-button--default) {
  background-color: #f5f3f0;
  border-color: #e8e4df;
  color: #6b6560;
  border-radius: 10px;
}

:deep(.el-button--default:hover) {
  background-color: #e8e4df;
  border-color: #d8d4cf;
  color: #5b5650;
}

/* 输入框样式 */
:deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  border-color: #c4a882;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}

/* 表单标签字体大小 */
:deep(.el-form-item__label) {
  font-size: 16px;
  color: #3d3d3a;
}

/* 下拉菜单选项字体大小 */
:deep(.el-select-dropdown__item) {
  font-size: 16px;
}

.menu-card {
  margin-bottom: 20px;
  background-color: #fff;
  border-radius: 12px;
  border: 1px solid #e8e4df;
}

.menu-header {
  font-size: 18px;
  font-weight: 500;
  padding: 10px 0;
  border-bottom: 1px solid #e8e4df;
  margin-bottom: 10px;
  color: #1a1a1a;
}

.order-menu {
  border-right: none;
}

.filter-card {
  margin-bottom: 20px;
  background-color: #fff;
  border-radius: 12px;
  border: 1px solid #e8e4df;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.range-separator {
  margin: 0 8px;
  color: #8e8b82;
}

.table-card {
  margin-bottom: 20px;
  background-color: #fff;
  border-radius: 12px;
  border: 1px solid #e8e4df;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 20px;
  font-weight: 500;
  color: #1a1a1a;
}

.actions {
  display: flex;
  gap: 10px;
}

.amount {
  color: #5db872;
  font-weight: 500;
  font-size: 16px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
}

/* 弹窗标题字体大小 */
:deep(.el-dialog__title) {
  font-size: 20px;
  color: #1a1a1a;
}

:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-table .el-table__cell) {
  z-index:0!important;
}
.el-table--border .el-table__inner-wrapper:after, .el-table--border:after, .el-table--border:before, .el-table__inner-wrapper:before{
   z-index:0!important;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
}
</style>
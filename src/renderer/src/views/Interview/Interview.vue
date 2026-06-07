<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2025-07-16 08:15:30
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2025-07-16 08:15:30
 * @FilePath: \eletron\frontend\src\views\Interview\Interview.vue
 * @Description: 前端面试组件
-->
<template>
  <div class="interview-container">
    <div class="header-actions">
      <el-radio-group v-model="activeTab" class="mode-selector">
        <el-radio label="interview">面试题</el-radio>
        <el-radio label="addr">面试地址</el-radio>
        <el-radio label="job51">前程无忧</el-radio>
      </el-radio-group>
      
      <div class="action-buttons">
        <template v-if="activeTab === 'interview' && !isTraining">
          <el-button type="primary" @click="startTraining">模拟训练</el-button>
          <el-button type="success" @click="toggleLeftPanel">添加面试题</el-button>
        </template>
        <template v-else-if="activeTab === 'addr'">
          <el-button type="success" @click="toggleAddrLeftPanel">添加地址</el-button>
        </template>
      </div>
    </div>

    <!-- 面试题管理区域 -->
    <div class="interview-wrap-container" v-if="activeTab === 'interview'">
      <div class="interview-left-container" :class="{ 'show-panel': showLeftPanel }">
        <div class="left-panel-content">
          <h3>{{ dialogType === 'add' ? '添加面试题' : '编辑面试题' }}</h3>
          <el-form :model="form" label-width="50px">
            <el-form-item label="内容">
              <el-input 
                type="textarea"
                :rows="10" 
                v-model="form.content" 
                placeholder="请按照格式输入题目和答案" />
            </el-form-item>
            
            <div class="format-example">
              <h4>格式示例：</h4>
              <pre>【题目】这是一个题目【/题目】
【答案】这是答案内容【/答案】
=======================
【题目】这是第二个题目【/题目】
【答案】这是第二个答案【/答案】</pre>
            </div>
            
            <el-form-item>
              <el-button @click="toggleLeftPanel">取消</el-button>
              <el-button type="primary" @click="submitForm">确定</el-button>
              <el-button type="success" @click="submitBatchForm">批量添加</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
      <div class="interview-right-container">
        <!-- 面试题列表 -->
        <div v-if="!isTraining" class="interview-table-container">
          <el-table :data="tableData" style="width: 100%" :row-style="{ height: '60px' }">
            <el-table-column label="序号" width="100">
              <template #default="scope">
                {{ (currentPage - 1) * pageSize + scope.$index + 1 }}
              </template>
            </el-table-column>
            <el-table-column prop="title" label="题目" />
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button  type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                <el-button  type="danger" @click="handleDelete(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, prev, pager, next, jumper"
              :total="total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>

        <!-- 模拟训练界面 -->
        <div v-else class="training-container">
          <div class="training-header">
            <h2>前端面试模拟训练</h2>
            <div class="training-info">
              <span>题目 {{ currentQuestionIndex + 1 }}/{{ trainingQuestions.length }}</span>
              <el-button type="primary" @click="endTraining">结束训练</el-button>
            </div>
          </div>
          
          <div class="question-container" v-if="currentQuestion">
            <h3>{{ currentQuestion.title }}</h3>
            
            <div class="answer-container">
              <el-input
                v-model="userAnswer"
                type="textarea"
                :rows="6"
                placeholder="请输入您的答案..."
              />
            </div>
            
            <div class="action-buttons">
              <el-button @click="showAnswer" type="info">查看答案</el-button>
              <el-button @click="nextQuestion" type="primary">下一题</el-button>
            </div>
            
            <div v-if="showAnswerFlag" class="standard-answer">
              <h4>参考答案：</h4>
              <div class="answer-content">{{ currentQuestion.answer }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 面试地址管理区域 -->
    <div class="addr-container" v-if="activeTab === 'addr'">
      <div class="addr-left-container" :class="{ 'show-panel': showAddrLeftPanel }">
        <div class="left-panel-content">
          <h3>{{ addrDialogType === 'add' ? '添加面试地址' : '编辑面试地址' }}</h3>
          <el-form :model="addrForm" label-width="80px">
            <el-form-item label="公司名称">
              <el-input size="large" v-model="addrForm.company" placeholder="请输入公司名称" />
            </el-form-item>
            
            <el-form-item label="面试地址">
              <el-input
                v-model="addrForm.address"
                type="textarea"
                :rows="3"
                placeholder="请输入详细地址"
              />
            </el-form-item>
            <el-form-item label="联系人">
              <el-input v-model="addrForm.contact" placeholder="请输入联系人姓名" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="addrForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item label="面试时间">
              <el-date-picker
                v-model="addrForm.interviewTime"
                type="datetime"
                placeholder="选择面试时间"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="备注">
              <el-input
                v-model="addrForm.remark"
                type="textarea"
                :rows="3"
                placeholder="其他备注信息"
              />
            </el-form-item>
            <el-form-item>
              <el-button @click="toggleAddrLeftPanel">取消</el-button>
              <el-button type="primary" @click="submitAddrForm">确定</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
      <div class="addr-right-container">
        <div class="addr-table-container">
          <el-table :data="addrTableData" style="width: 100%" :row-style="{ height: '60px' }">
            <el-table-column label="序号" width="60">
              <template #default="scope">
                {{ (addrCurrentPage - 1) * addrPageSize + scope.$index + 1 }}
              </template>
            </el-table-column>
            <el-table-column prop="company" label="公司名称" show-overflow-tooltip />
            <el-table-column prop="address" label="面试地址" show-overflow-tooltip />
            <el-table-column prop="interviewTime" label="面试时间" width="180" />
            <el-table-column label="操作" width="180">
              <template #default="scope">
                <el-button type="primary" @click="handleAddrEdit(scope.row)">编辑</el-button>
                <el-button type="danger" @click="handleAddrDelete(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="addrCurrentPage"
              v-model:page-size="addrPageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, prev, pager, next, jumper"
              :total="addrTotal"
              @size-change="handleAddrSizeChange"
              @current-change="handleAddrCurrentChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 前程无忧岗位搜索区域 -->
    <div class="job51-container" v-if="activeTab === 'job51'">
      <div class="job51-search-bar">
        <el-input v-model="jobSearchForm.keyword" placeholder="搜索关键词，如：前端、Java" style="width: 200px" />
        <el-select v-model="jobSearchForm.jobArea" placeholder="选择地区" style="width: 140px">
          <el-option label="广州" value="030200" />
        </el-select>
        <el-button type="primary" @click="fetchJobData" :loading="jobLoading">搜索</el-button>
      </div>

      <div class="job51-table-container">
        <el-table :data="jobTableData" style="width: 100%" height="680px" :row-style="{ height: '60px' }" v-loading="jobLoading">
          <el-table-column label="序号" width="60" type="index" :index="(i) => (jobCurrentPage - 1) * jobPageSize + i + 1" />
          <el-table-column prop="jobName" label="职位" show-overflow-tooltip />
          <el-table-column prop="fullCompanyName" label="公司名称"  show-overflow-tooltip />
          <el-table-column prop="provideSalaryString" label="薪资" width="130" />
          <el-table-column prop="jobAreaString" label="地点" width="120" show-overflow-tooltip />
          <el-table-column prop="workYearString" label="经验要求" width="100" />
          <el-table-column prop="degreeString" label="学历要求" width="90" />
          <el-table-column prop="companyTypeString" label="类型" width="110" show-overflow-tooltip />
          <el-table-column prop="companySizeString" label="规模" width="110" show-overflow-tooltip />
          <el-table-column prop="issueDateString" label="发布日期" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="scope">
              <el-button type="primary" size="small" @click="openJobLink(scope.row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="jobCurrentPage"
            v-model:page-size="jobPageSize"
            :page-sizes="[10, 20, 50]"
            layout="total, prev, pager, next, jumper"
            :total="jobTotal"
            @size-change="handleJobSizeChange"
            @current-change="handleJobCurrentChange"
          />
        </div>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加面试题' : '编辑面试题'"
      width="50%"
    >
      <el-form :model="form" label-width="50px">
        <el-form-item label="内容">
          <el-input 
            type="textarea"
            :rows="10" 
            v-model="form.content" 
            placeholder="请按照格式输入题目和答案" />
        </el-form-item>
        <div class="format-example">
          <h4>格式示例：</h4>
          <pre>【题目】这是一个题目【/题目】
【答案】这是答案内容【/答案】
=======================
【题目】这是第二个题目【/题目】
【答案】这是第二个答案【/答案】</pre>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';

// 表格数据
const tableData = ref([]);
const addrTableData = ref([]);

// 分页相关
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

// 地址分页相关
const addrCurrentPage = ref(1);
const addrPageSize = ref(10);
const addrTotal = ref(0);

// 模拟训练相关
const isTraining = ref(false);
const trainingQuestions = ref([]);
const currentQuestionIndex = ref(0);
const currentQuestion = ref(null);
const userAnswer = ref('');
const showAnswerFlag = ref(false);

// 表单相关
const dialogVisible = ref(false);
const dialogType = ref('add'); // 'add' 或 'edit'
const form = reactive({
  id: '',
  content: '',
  items: '',
  answer: '',
  category: '',
  difficulty: '中等',
});

// 地址表单相关
const addrDialogType = ref('add'); // 'add' 或 'edit'
const addrForm = reactive({
  id: '',
  company: '',
  address: '',
  contact: '',
  phone: '',
  interviewTime: '',
  remark: '',
});

// 左侧面板控制
const showLeftPanel = ref(false);
const showAddrLeftPanel = ref(false);

// 前程无忧相关
const jobTableData = ref([]);
const jobCurrentPage = ref(1);
const jobPageSize = ref(20);
const jobTotal = ref(0);
const jobLoading = ref(false);
const jobSearchForm = reactive({
  keyword: '前端',
  jobArea: '030200',
  workYear: '',
  degree: '',
});

// 容器显示控制
const activeTab = ref('interview');

// 这些函数已不再需要，因为我们使用了单选组来控制显示
// const interviewAddr = () => {
//   showAddrContainer.value = true;
// };

// const backToInterview = () => {
//   showAddrContainer.value = false;
// };

const toggleLeftPanel = () => {
  showLeftPanel.value = !showLeftPanel.value;
  
  // 获取右侧容器元素并添加/移除narrow类
  const rightContainer = document.querySelector('.interview-right-container');
  if (rightContainer) {
    if (showLeftPanel.value) {
      rightContainer.classList.add('narrow');
    } else {
      rightContainer.classList.remove('narrow');
    }
  }
  
  if (showLeftPanel.value) {
    dialogType.value = 'add';
    resetForm();
  }
};

// 切换地址左侧面板
const toggleAddrLeftPanel = () => {
  showAddrLeftPanel.value = !showAddrLeftPanel.value;
  
  // 获取右侧容器元素并添加/移除narrow类
  const rightContainer = document.querySelector('.addr-right-container');
  if (rightContainer) {
    if (showAddrLeftPanel.value) {
      rightContainer.classList.add('narrow');
    } else {
      rightContainer.classList.remove('narrow');
    }
  }
  
  if (showAddrLeftPanel.value) {
    addrDialogType.value = 'add';
    resetAddrForm();
  }
};

// 获取难度对应的标签类型
const getDifficultyType = (difficulty) => {
  switch (difficulty) {
    case '简单':
      return 'success';
    case '中等':
      return 'warning';
    case '困难':
      return 'danger';
    default:
      return 'info';
  }
};

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchData();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchData();
};

// 地址分页处理
const handleAddrSizeChange = (val) => {
  addrPageSize.value = val;
  fetchAddrData();
};

const handleAddrCurrentChange = (val) => {
  addrCurrentPage.value = val;
  fetchAddrData();
};

// 获取面试题数据
const fetchData = async () => {
  try {
    const params = {
      page: currentPage.value,
      pageNum: pageSize.value,
      conditions: {},
      orderBy: {
        column: "id",
        type: "desc",
      },
    };
    
    const response = await request.post('/api/interview/items/get', params);
    
    if (response.code === 200) {
      // 将后端数据字段映射到前端字段
      tableData.value = (response.result.list || []).map(item => ({
        id: item.id,
        title: item.items, // 保持title作为显示字段
        answer: item.answer || '',
        category: item.category || '未分类',
        difficulty: item.difficulty || '中等'
      }));
      total.value = response.result.pagination?.total || 0;
    } else {
      ElMessage.error(response.message || '获取面试题数据失败');
    }
  } catch (error) {
    console.error('获取面试题数据失败:', error);
    ElMessage.error('获取面试题数据失败，请稍后重试');
  }
};

// 获取地址数据
const fetchAddrData = async () => {
  try {
    const params = {
      page: addrCurrentPage.value,
      pageNum: addrPageSize.value,
      conditions: {},
      orderBy: {
        column: "id",
        type: "desc",
      },
    };
    
    const response = await request.post('/api/interview/addr/get', params);
    
    if (response.code === 200) {
      // 将后端数据字段映射到前端字段
      addrTableData.value = (response.result.list || []).map(item => ({
        id: item.id,
        company: item.company,
        address: item.addr,
        remark: item.desc,
        interviewTime: item.interviewTime || '',
        contact: item.contact || '',
        phone: item.phone || ''
      }));
      addrTotal.value = response.result.pagination?.total || 0;
    } else {
      ElMessage.error(response.message || '获取面试地址数据失败');
    }
  } catch (error) {
    console.error('获取面试地址数据失败:', error);
    ElMessage.error('获取面试地址数据失败，请稍后重试');
  }
};

// 添加面试题
const showAddDialog = () => {
  dialogType.value = 'add';
  resetForm();
  dialogVisible.value = true;
};

// 编辑面试题
const handleEdit = (row) => {
  dialogType.value = 'edit';
  form.id = row.id;
  
  // 构建格式化内容
  form.content = `【题目】${row.title}【/题目】\n【答案】${row.answer || ''}【/答案】`;
  
  form.items = row.title;
  form.answer = row.answer || '';
  form.category = row.category || '';
  form.difficulty = row.difficulty || '中等';
  
  showLeftPanel.value = true;
  
  // 获取右侧容器元素并添加narrow类
  const rightContainer = document.querySelector('.interview-right-container');
  if (rightContainer) {
    rightContainer.classList.add('narrow');
  }
};

// 删除面试题
const handleDelete = async (row) => {
  try {
    const response = await request.post('/api/interview/items/delete', { id: row.id });
    
    if (response.code === 200) {
      ElMessage.success('删除成功');
      fetchData(); // 重新获取数据
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error) {
    console.error('删除面试题失败:', error);
    ElMessage.error('删除失败，请稍后重试');
  }
};

// 编辑地址
const handleAddrEdit = (row) => {
  addrDialogType.value = 'edit';
  addrForm.id = row.id;
  addrForm.company = row.company;
  addrForm.address = row.address;
  addrForm.contact = row.contact || '';
  addrForm.phone = row.phone || '';
  addrForm.interviewTime = row.interviewTime || '';
  addrForm.remark = row.remark || '';
  
  showAddrLeftPanel.value = true;
  
  // 获取右侧容器元素并添加narrow类
  const rightContainer = document.querySelector('.addr-right-container');
  if (rightContainer) {
    rightContainer.classList.add('narrow');
  }
};

// 删除地址
const handleAddrDelete = async (row) => {
  try {
    const response = await request.post('/api/interview/addr/delete', { id: row.id });
    
    if (response.code === 200) {
      ElMessage.success('删除成功');
      fetchAddrData(); // 重新获取数据
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error) {
    console.error('删除面试地址失败:', error);
    ElMessage.error('删除失败，请稍后重试');
  }
};

// 重置表单
const resetForm = () => {
  form.id = '';
  form.content = '';
  form.items = '';
  form.answer = '';
  form.category = '';
  form.difficulty = '中等';
};

// 重置地址表单
const resetAddrForm = () => {
  addrForm.id = '';
  addrForm.company = '';
  addrForm.address = '';
  addrForm.contact = '';
  addrForm.phone = '';
  addrForm.interviewTime = '';
  addrForm.remark = '';
};

// 解析内容提取题目和答案
const parseContent = (content) => {
  const titleRegex = /【题目】([\s\S]*?)【\/题目】/g;
  const answerRegex = /【答案】([\s\S]*?)【\/答案】/g;
  
  const titles = [];
  const answers = [];
  
  let titleMatch;
  while ((titleMatch = titleRegex.exec(content)) !== null) {
    titles.push(titleMatch[1].trim());
  }
  
  let answerMatch;
  while ((answerMatch = answerRegex.exec(content)) !== null) {
    answers.push(answerMatch[1].trim());
  }
  
  const result = [];
  for (let i = 0; i < Math.min(titles.length, answers.length); i++) {
    result.push({
      items: titles[i],
      answer: answers[i]
    });
  }
  
  return result;
};

// 提交表单
const submitForm = async () => {
  if (!form.content) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  try {
    let response;
    // 解析内容获取第一个题目和答案
    const parsedItems = parseContent(form.content);
    
    if (parsedItems.length === 0) {
      ElMessage.warning('未找到有效的题目和答案，请检查格式');
      return;
    }
    
    const formData = parsedItems[0];
    
    if (dialogType.value === 'add') {
      // 添加新题目
      response = await request.post('/api/interview/items/add', formData);
    } else {
      // 编辑现有题目
      response = await request.post('/api/interview/items/update', {
        where: { id: form.id },
        data: formData
      });
    }
    
    if (response.code === 200) {
      ElMessage.success(dialogType.value === 'add' ? '添加成功' : '更新成功');
      fetchData(); // 重新获取数据
      showLeftPanel.value = false;
      
      // 获取右侧容器元素并移除narrow类
      const rightContainer = document.querySelector('.interview-right-container');
      if (rightContainer) {
        rightContainer.classList.remove('narrow');
      }
    } else {
      ElMessage.error(response.message || (dialogType.value === 'add' ? '添加失败' : '更新失败'));
    }
  } catch (error) {
    console.error('保存面试题失败:', error);
    ElMessage.error('保存失败，请稍后重试');
  }
};

// 批量提交表单
const submitBatchForm = async () => {
  if (!form.content) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  try {
    // 解析内容获取所有题目和答案
    const parsedItems = parseContent(form.content);
    
    if (parsedItems.length === 0) {
      ElMessage.warning('未找到有效的题目和答案，请检查格式');
      return;
    }
    
    // 调用批量添加API
    const response = await request.post('/api/interview/items/batch/add', {
      items: parsedItems
    });
    
    if (response.code === 200) {
      ElMessage.success(`批量添加成功，共添加${parsedItems.length}条数据`);
      fetchData(); // 重新获取数据
      showLeftPanel.value = false;
      
      // 获取右侧容器元素并移除narrow类
      const rightContainer = document.querySelector('.interview-right-container');
      if (rightContainer) {
        rightContainer.classList.remove('narrow');
      }
    } else {
      ElMessage.error(response.message || '批量添加失败');
    }
  } catch (error) {
    console.error('批量添加面试题失败:', error);
    ElMessage.error('批量添加失败，请稍后重试');
  }
};

// 提交地址表单
const submitAddrForm = async () => {
  if (!addrForm.company || !addrForm.address) {
    ElMessage.warning('请填写公司名称、面试地址');
    return;
  }

  try {
    let response;
    const formData = {
      company: addrForm.company,
      addr: addrForm.address,
      desc: addrForm.remark
    };
    
    if (addrDialogType.value === 'add') {
      // 添加新地址
      response = await request.post('/api/interview/addr/add', formData);
    } else {
      // 编辑现有地址
      response = await request.post('/api/interview/addr/update', {
        where: { id: addrForm.id },
        data: formData
      });
    }
    
    if (response.code === 200) {
      ElMessage.success(addrDialogType.value === 'add' ? '添加成功' : '更新成功');
      fetchAddrData(); // 重新获取数据
      showAddrLeftPanel.value = false;
      
      // 获取右侧容器元素并移除narrow类
      const rightContainer = document.querySelector('.addr-right-container');
      if (rightContainer) {
        rightContainer.classList.remove('narrow');
      }
    } else {
      ElMessage.error(response.message || (addrDialogType.value === 'add' ? '添加失败' : '更新失败'));
    }
  } catch (error) {
    console.error('保存面试地址失败:', error);
    ElMessage.error('保存失败，请稍后重试');
  }
};

// 开始模拟训练
const startTraining = () => {
  if (tableData.value.length === 0) {
    ElMessage.warning('没有可用的面试题');
    return;
  }
  
  // 随机选择题目进行训练
  trainingQuestions.value = [...tableData.value]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(10, tableData.value.length));
  
  currentQuestionIndex.value = 0;
  currentQuestion.value = trainingQuestions.value[0];
  userAnswer.value = '';
  showAnswerFlag.value = false;
  
  // 确保左侧面板收起
  if (showLeftPanel.value) {
    showLeftPanel.value = false;
    
    // 获取右侧容器元素并移除narrow类
    const rightContainer = document.querySelector('.interview-right-container');
    if (rightContainer) {
      rightContainer.classList.remove('narrow');
    }
  }
  
  isTraining.value = true;
};

// 结束训练
const endTraining = () => {
  isTraining.value = false;
};

// 显示答案
const showAnswer = () => {
  showAnswerFlag.value = true;
};

// 下一题
const nextQuestion = () => {
  if (currentQuestionIndex.value < trainingQuestions.value.length - 1) {
    currentQuestionIndex.value++;
    currentQuestion.value = trainingQuestions.value[currentQuestionIndex.value];
    userAnswer.value = '';
    showAnswerFlag.value = false;
  } else {
    ElMessageBox.alert('恭喜你，已完成所有题目！', '训练完成', {
      confirmButtonText: '返回列表',
      callback: () => {
        isTraining.value = false;
      }
    });
  }
};

// 前程无忧搜索
const fetchJobData = async () => {
  jobLoading.value = true;
  try {
    const params = {
      keyword: jobSearchForm.keyword,
      jobArea: jobSearchForm.jobArea,
      page: jobCurrentPage.value,
      pageSize: jobPageSize.value,
      workYear: jobSearchForm.workYear,
      degree: jobSearchForm.degree,
    };
    const response = await request.post('/api/job/search', params);
    if (response.code === 200) {
      jobTableData.value = response.result.list || [];
      jobTotal.value = response.result.pagination?.total || 0;
    } else {
      ElMessage.error(response.message || '搜索失败');
    }
  } catch (error) {
    console.error('搜索前程无忧失败:', error);
    ElMessage.error('搜索失败，请稍后重试');
  } finally {
    jobLoading.value = false;
  }
};

const handleJobSizeChange = (val) => {
  jobPageSize.value = val;
  fetchJobData();
};

const handleJobCurrentChange = (val) => {
  jobCurrentPage.value = val;
  fetchJobData();
};

const openJobLink = (row) => {
  const href = row.jobHref || '';
  if (href) {
    window.open(href, '_blank');
  } else {
    ElMessage.warning('暂无职位链接');
  }
};

onMounted(() => {
  fetchData();
  fetchAddrData();
});
</script>

<style scoped>
.interview-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

.interview-container.wide-mode {
  padding: 20px;
}

/* 前程无忧tab时容器更宽以适配多列表格 */
.job51-container {
  width: 100%;
}

.job51-container :deep(.el-table) {
  font-size: 14px;
}

.job51-container :deep(.el-table th) {
  font-size: 14px;
  background-color: #f5f3f0 !important;
  color: #6b6560;
  padding: 10px 0;
}

.job51-container :deep(.el-table td) {
  padding: 8px 0;
}

.job51-container :deep(.el-tag) {
  border-radius: 8px;
  font-size: 12px;
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

/* 成功按钮样式 */
:deep(.el-button--success) {
  background-color: #5db872;
  border-color: #5db872;
  border-radius: 10px;
}

:deep(.el-button--success:hover) {
  background-color: #4da862;
  border-color: #4da862;
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

.header-actions {
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

.mode-selector {
  margin-right: auto;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.interview-wrap-container,
.addr-container {
  width: 100%;
  position: relative;
  display: flex;
  overflow: hidden;
}

.interview-left-container,
.addr-left-container {
  width: 0;
  z-index: 1000;
  transition: all 0.3s ease-in-out;
  overflow-y: auto;
  transform: translateX(-100%);
  flex-shrink: 0;
}

.interview-left-container.show-panel,
.addr-left-container.show-panel {
  transform: translateX(0);
  width: 50%;
  border-right: 2px solid #e8e4df;
}

.left-panel-content {
  padding: 20px;
}

.interview-right-container,
.addr-right-container {
  width: 100%;
  transition: all 0.3s ease-in-out;
  flex: 1;
}

.interview-right-container.narrow,
.addr-right-container.narrow {
  width: 50%;
}

.interview-table-container,
.addr-table-container {
  background-color: #fff;
  border-radius: 12px;
}

.addr-header-actions {
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

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
}

/* 训练模式样式 */
.training-container {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
}

.training-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #e8e4df;
  padding-bottom: 15px;
}

.training-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.question-container {
  padding: 10px 0;
}

.question-content {
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f3f0;
  border-radius: 8px;
  line-height: 1.6;
}

.answer-container {
  margin: 20px 0;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 20px 0;
}

.standard-answer {
  margin-top: 30px;
  padding: 15px;
  background-color: #f0f9eb;
  border-radius: 8px;
  border-left: 4px solid #5db872;
}

.answer-content {
  white-space: pre-line;
  line-height: 1.6;
  height: 200px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 8px;
}

.format-example {
  background-color: #f5f3f0;
  padding: 10px;
  margin: 10px 0;
  border-radius: 8px;
  border-left: 4px solid #8b9a6d;
}

.format-example pre {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
}

/* 前程无忧样式 */
.job51-search-bar {
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

.job51-table-container {
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.job51-table-container :deep(.el-table__row:hover > td) {
  background-color: #faf8f5;
}
</style>
<template>
  <div class="resume-container">
    <!-- 左侧简历列表 -->
    <div class="left-panel">
      <div class="search-box">
        <el-input
          v-model="searchText"
          placeholder="搜索简历"
          class="search-input"
          clearable
          @input="searchResumes"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="resume-list">
        <div
          v-for="resume in filteredResumeList"
          :key="resume.id"
          class="resume-item"
          :class="{ 'active': currentResume && currentResume.id === resume.id }"
          @click="selectResume(resume)"
        >
          <div class="resume-item-content">
            <div class="resume-icon">
              <el-icon size="30"><Document /></el-icon>
            </div>
            <div class="resume-info">
              <div class="resume-title">{{ resume.title }}</div>
              <div class="resume-name">{{ resume.name }}</div>
              <div class="resume-time">{{ resume.updateTime }}</div>
            </div>
          </div>
        </div>
        <div v-if="filteredResumeList.length === 0" class="no-resumes">
          <p>暂无简历</p>
        </div>
      </div>
    </div>

    <!-- 右侧简历编辑区域 -->
    <div class="right-panel">
      <div class="resume-toolbar">
        <el-button @click="createNewResume" type="primary" size="large">
          新建简历
        </el-button>
        <el-button @click="saveResume" type="success" size="large" :disabled="!currentResume">
          保存简历
        </el-button>
        <el-button @click="deleteCurrentResume" type="danger" size="large" :disabled="!currentResume">
          删除简历
        </el-button>
      </div>

      <div v-if="currentResume" class="resume-editor">
        <!-- 简历名称 -->
        <div class="form-item">
          <label class="form-label">简历名称：</label>
          <el-input
            v-model="currentResume.title"
            placeholder="请输入简历名称"
            class="title-input"
            size="large"
          ></el-input>
        </div>

        <div class="section-divider">
          <span class="divider-text">基本信息</span>
        </div>

        <!-- 姓名和求职意向 -->
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">姓名：</label>
            <el-input
              v-model="currentResume.name"
              placeholder="请输入姓名"
              class="name-input"
              size="large"
            ></el-input>
          </div>

          <div class="form-item">
            <label class="form-label">求职意向：</label>
            <el-input
              v-model="currentResume.jobIntention"
              placeholder="请输入求职意向"
              class="job-intention-input"
              size="large"
            ></el-input>
          </div>
        </div>

        <!-- 手机和邮箱 -->
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">手机：</label>
            <el-input
              v-model="currentResume.phone"
              placeholder="请输入手机号码"
              class="phone-input"
              size="large"
            ></el-input>
          </div>

          <div class="form-item">
            <label class="form-label">邮箱：</label>
            <el-input
              v-model="currentResume.email"
              placeholder="请输入邮箱地址"
              class="email-input"
              size="large"
            ></el-input>
          </div>
        </div>

        <div class="section-divider">
          <span class="divider-text">专业技能</span>
        </div>

        <!-- 技能 -->
        <div class="form-item">
          <label class="form-label">技能：</label>
          <el-input
            v-model="currentResume.skills"
            type="textarea"
            :rows="4"
            placeholder="请输入技能（每行一个技能）"
            class="skills-textarea"
          ></el-input>
        </div>

        <div class="section-divider">
          <span class="divider-text">教育经历</span>
        </div>

        <div class="form-item education-section">
          <label class="form-label">教育经历：</label>
          <div class="list-container">
            <div v-for="(education, index) in currentResume.education" :key="index" class="education-item">
              <div class="education-header">
                <span class="education-number">教育经历 {{ index + 1 }}</span>
                <el-button 
                  link 
                  type="danger" 
                  @click="removeEducation(index)"
                  :icon="Delete"
                >
                  删除
                </el-button>
              </div>
              <div class="education-row">
                <el-input
                  v-model="education.school"
                  placeholder="学校名称"
                  size="large"
                  class="education-school-input"
                ></el-input>
                <el-input
                  v-model="education.major"
                  placeholder="专业"
                  size="large"
                  class="education-major-input"
                ></el-input>
                <el-input
                  v-model="education.degree"
                  placeholder="学历（如：本科、硕士等）"
                  size="large"
                  class="education-degree-input"
                ></el-input>
                <el-input
                  v-model="education.time"
                  placeholder="时间（如：2018-2022）"
                  size="large"
                  class="education-time-input"
                ></el-input>
              </div>
            </div>
            <el-button 
              @click="addEducation" 
              type="primary" 
              :icon="Plus"
              size="large"
              class="add-button"
            >
              添加教育经历
            </el-button>
          </div>
        </div>

        <!-- 分隔符 -->
        <div class="section-divider">
          <span class="divider-text">项目经历</span>
        </div>

        <!-- 项目 -->
        <div class="form-item projects-section">
          <label class="form-label">项目：</label>
          <div class="list-container">
            <div v-for="(project, index) in currentResume.projects" :key="index" class="project-item">
              <div class="project-header">
                <span class="project-number">项目 {{ index + 1 }}</span>
                <el-button 
                  link 
                  type="danger" 
                  @click="removeProject(index)"
                  :icon="Delete"
                >
                  删除
                </el-button>
              </div>
              <el-input
                v-model="project.name"
                placeholder="项目名称"
                size="large"
                class="project-name-input"
              ></el-input>
              <el-input
                v-model="project.description"
                type="textarea"
                :rows="3"
                placeholder="项目描述"
                class="project-description-input"
              ></el-input>
            </div>
            <el-button 
              @click="addProject" 
              type="primary" 
              :icon="Plus"
              size="large"
              class="add-button"
            >
              添加项目
            </el-button>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <p>选择一个简历或创建新简历</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Document, Plus, Delete } from '@element-plus/icons-vue'

// 数据定义
const resumeList = ref([])
const currentResume = ref(null)
const searchText = ref('')

// 初始化示例数据
const initData = () => {
  resumeList.value = [
    {
      id: 1,
      title: '前端工程师简历',
      name: '张三',
      jobIntention: '高级前端工程师',
      phone: '13800138000',
      email: 'zhangsan@example.com',
      skills: 'Vue.js\nReact\nTypeScript\nNode.js',
      education: [
        { 
          school: '北京大学', 
          major: '计算机科学与技术', 
          degree: '本科',
          time: '2015-2019'
        }
      ],
      projects: [
        { name: '企业管理系统', description: '负责前端架构设计和核心功能开发，使用 Vue3 + Element Plus' },
        { name: '电商平台前端', description: '开发商品展示、购物车、订单管理等核心模块' }
      ],
      updateTime: '2025-10-18'
    }
  ]
}

// 搜索过滤
const filteredResumeList = computed(() => {
  if (!searchText.value) {
    return resumeList.value
  }
  return resumeList.value.filter(resume => 
    resume.title.includes(searchText.value) || 
    resume.name.includes(searchText.value) ||
    resume.description.includes(searchText.value)
  )
})

// 搜索简历
const searchResumes = () => {
  // 搜索逻辑已通过 computed 实现
}

// 选择简历
const selectResume = (resume) => {
  // 检查是否有未保存的新建简历
  if (currentResume.value && currentResume.value.isTemp) {
    ElMessageBox.confirm('您有未保存的新建简历，是否先保存？', '提示', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      type: 'warning'
    }).then(() => {
      // 用户选择保存
      saveResume().then(() => {
        // 保存成功后，加载选中的简历
        currentResume.value = { ...resume }
      })
    }).catch(() => {
      // 用户选择不保存，移除临时简历
      resumeList.value = resumeList.value.filter(r => !r.isTemp)
      currentResume.value = { ...resume }
    })
  } else {
    currentResume.value = { ...resume }
  }
}

// 创建新简历
const createNewResume = () => {
  // 检查是否已有未保存的临时简历
  if (currentResume.value && currentResume.value.isTemp) {
    ElMessageBox.confirm('您有未保存的新建简历，是否先保存？', '提示', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      type: 'warning'
    }).then(() => {
      // 用户选择保存
      saveResume().then(() => {
        // 保存成功后，创建新简历
        createEmptyResume()
      })
    }).catch(() => {
      // 用户选择不保存，直接创建新简历
      createEmptyResume()
    })
  } else {
    // 没有未保存的新建简历，直接创建
    createEmptyResume()
  }
}

// 创建空白简历
const createEmptyResume = () => {
  const currentTime = new Date().toISOString().split('T')[0]
  const tempResume = {
    id: -Date.now(), // 使用负数时间戳作为临时ID
    title: '新建简历',
    name: '',
    jobIntention: '',
    phone: '',
    email: '',
    skills: '',
    education: [],
    projects: [],
    updateTime: currentTime,
    isTemp: true // 标记为临时简历
  }
  
  // 将临时简历添加到简历列表的最前面
  resumeList.value.unshift(tempResume)
  
  // 设置当前简历为新创建的临时简历
  currentResume.value = tempResume
}

// 保存简历
const saveResume = async () => {
  if (!currentResume.value) return Promise.reject('没有当前简历')
  
  if (!currentResume.value.title || !currentResume.value.name) {
    ElMessage.warning('请填写简历标题和姓名')
    return Promise.reject('信息不完整')
  }

  const currentTime = new Date().toISOString().split('T')[0]
  
  try {
    if (currentResume.value.isTemp || currentResume.value.id < 0) {
      // 新增简历
      const newResume = {
        ...currentResume.value,
        id: Date.now(),
        updateTime: currentTime,
        isTemp: false
      }
      
      // 移除临时简历
      resumeList.value = resumeList.value.filter(r => !r.isTemp && r.id >= 0)
      
      // 添加新简历
      resumeList.value.unshift(newResume)
      currentResume.value = newResume
      
      ElMessage.success('添加成功')
    } else {
      // 更新现有简历
      const index = resumeList.value.findIndex(item => item.id === currentResume.value.id)
      if (index !== -1) {
        resumeList.value[index] = {
          ...currentResume.value,
          updateTime: currentTime
        }
        ElMessage.success('保存成功')
      }
    }
    
    return Promise.resolve('保存成功')
  } catch (error) {
    console.error('保存简历失败:', error)
    ElMessage.error('保存失败')
    return Promise.reject(error)
  }
}

// 添加教育经历
const addEducation = () => {
  if (!currentResume.value.education) {
    currentResume.value.education = []
  }
  currentResume.value.education.push({ school: '', major: '', degree: '', time: '' })
}

// 删除教育经历
const removeEducation = (index) => {
  currentResume.value.education.splice(index, 1)
}

// 添加项目
const addProject = () => {
  if (!currentResume.value.projects) {
    currentResume.value.projects = []
  }
  currentResume.value.projects.push({ name: '', description: '' })
}

// 删除项目
const removeProject = (index) => {
  currentResume.value.projects.splice(index, 1)
}

// 删除当前简历
const deleteCurrentResume = async () => {
  if (!currentResume.value || !currentResume.value.id) return
  
  try {
    await ElMessageBox.confirm('确定要删除这份简历吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    resumeList.value = resumeList.value.filter(item => item.id !== currentResume.value.id)
    currentResume.value = null
    
    ElMessage.success('删除成功')
  } catch {
    ElMessage.info('已取消删除')
  }
}

// 组件挂载时初始化数据
onMounted(() => {
  initData()
  // 默认选择第一个简历
  if (resumeList.value.length > 0) {
    currentResume.value = { ...resumeList.value[0] }
  }
})
</script>

<style scoped>
.resume-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.left-panel {
  width: 350px;
  border-right: 1px solid #e0e6ed;
  display: flex;
  flex-direction: column;
  background: white;
}

.search-box {
  padding: 10px;
}

.search-input {
  width: 100%;
}

:deep(.search-input .el-input__wrapper) {
  background-color: #f5f5f5;
  box-shadow: none !important;
  border-radius: 5px;
}

:deep(.search-input .el-input__inner) {
  background-color: #f5f5f5;
}

.resume-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.resume-list::-webkit-scrollbar {
  display: none;
}

.resume-item {
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, rgba(236, 245, 255, 0.9), rgba(224, 224, 211, 0.8));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
}

.resume-item:hover {
}

.resume-item.active {
  background: linear-gradient(135deg, rgba(236, 245, 255, 0.9), rgba(177, 206, 244, 0.8));
}

.resume-item-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.resume-icon {
  min-width: 40px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #409eff, #66b1ff);
  border-radius: 8px;
  color: white;
  flex-shrink: 0;
}

.resume-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.resume-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resume-name {
  font-size: 14px;
  color: #606266;
  margin-bottom: 3px;
}

.resume-time {
  font-size: 12px;
  color: #909399;
}

.right-panel {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.resume-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.resume-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 150px);
  overflow-y: auto;
  padding-right: 10px;
}

.resume-editor::-webkit-scrollbar {
  width: 6px;
}

.resume-editor::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.resume-editor::-webkit-scrollbar-track {
  background: #f5f7fa;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-item {
  flex: 1;
}

.form-label {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  padding-left: 4px;
}

.title-input,
.name-input,
.job-intention-input {
  font-size: 16px;
}

:deep(.title-input .el-input__wrapper),
:deep(.name-input .el-input__wrapper),
:deep(.job-intention-input .el-input__wrapper),
:deep(.phone-input .el-input__wrapper),
:deep(.email-input .el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset !important;
  border-radius: 6px;
  transition: all 0.3s;
}

:deep(.title-input .el-input__wrapper:hover),
:deep(.name-input .el-input__wrapper:hover),
:deep(.job-intention-input .el-input__wrapper:hover),
:deep(.phone-input .el-input__wrapper:hover),
:deep(.email-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset !important;
}

:deep(.title-input .el-input__wrapper.is-focus),
:deep(.name-input .el-input__wrapper.is-focus),
:deep(.job-intention-input .el-input__wrapper.is-focus),
:deep(.phone-input .el-input__wrapper.is-focus),
:deep(.email-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset !important;
}

.skills-textarea {
  font-size: 15px;
}

:deep(.skills-textarea .el-textarea__inner) {
  font-size: 15px;
  line-height: 1.6;
  padding: 12px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.3s;
}

:deep(.skills-textarea .el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

:deep(.skills-textarea .el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #409eff inset;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.add-button {
  width: 100%;
  border-style: dashed;
}

.education-section {
  flex: 1;
}

.education-item {
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
}

.education-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.education-number {
  font-size: 14px;
  font-weight: 600;
  color: #67c23a;
}

.education-row {
  display: flex;
  gap: 10px;
}

.education-school-input,
.education-major-input,
.education-degree-input,
.education-time-input {
  font-size: 15px;
}

:deep(.education-school-input .el-input__wrapper),
:deep(.education-major-input .el-input__wrapper),
:deep(.education-degree-input .el-input__wrapper),
:deep(.education-time-input .el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset !important;
  border-radius: 6px;
  background: white;
  transition: all 0.3s;
}

:deep(.education-school-input .el-input__wrapper:hover),
:deep(.education-major-input .el-input__wrapper:hover),
:deep(.education-degree-input .el-input__wrapper:hover),
:deep(.education-time-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset !important;
}

:deep(.education-school-input .el-input__wrapper.is-focus),
:deep(.education-major-input .el-input__wrapper.is-focus),
:deep(.education-degree-input .el-input__wrapper.is-focus),
:deep(.education-time-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset !important;
}

.projects-section {
  flex: 1;
}

.project-item {
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.project-number {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.project-name-input {
  font-size: 15px;
  font-weight: 500;
}

:deep(.project-name-input .el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset !important;
  border-radius: 6px;
  background: white;
  transition: all 0.3s;
}

:deep(.project-name-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset !important;
}

:deep(.project-name-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset !important;
}

.project-description-input {
  font-size: 14px;
}

:deep(.project-description-input .el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
  padding: 10px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.3s;
}

:deep(.project-description-input .el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

:deep(.project-description-input .el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #409eff inset;
}

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #909399;
  font-size: 18px;
}

.no-resumes {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 16px;
}

/* 分隔符样式 */
.section-divider {
  position: relative;
  height: 200px;
  display: flex;
  align-items: center;
  margin: 25px 0;
  overflow: visible;
}

.section-divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 300px;
  height: 39px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  clip-path: polygon(0 0, 100% 0, calc(100% - 30px) 100%, 0 100%);
  z-index: 1;
}

.section-divider::after {
  content: '';
  position: absolute;
  left: 280px;
  bottom: -8px;
  width: calc(100% - 270px);
  height: 20px;
  background: #e4e7ed;
  clip-path: polygon(16px 0, 100% 0, 100% 100%, 0 100%);
  z-index: 0;
}

.divider-text {
  position: relative;
  font-size: 18px;
  font-weight: 600;
  color: white;
  letter-spacing: 1px;
  z-index: 2;
  padding-left: 25px;
}
</style>


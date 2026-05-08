<template>
  <div class="directory-list">
    <div class="header">
      <h1>选择科目</h1>
      <el-button class="add-btn" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>新增科目
      </el-button>
    </div>
    <div class="directory-grid">
      <div
        v-for="dir in directories"
        :key="dir.id"
        class="directory-card"
        @click="enterQuiz(dir.id)"
      >
        <div class="card-content">
          <el-icon size="56" color="#c4a882"><Folder /></el-icon>
          <span class="directory-name">{{ dir.name }}</span>
          <span class="directory-count">{{ getQuestionCount(dir.id) }} 题</span>
        </div>
      </div>
    </div>
    <el-empty v-if="directories.length === 0" description="暂无科目，请添加数据" />

    <!-- 新增科目对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="新增科目"
      width="400px"
      class="warm-dialog"
    >
      <el-form :model="newDirectory" label-width="80px">
        <el-form-item label="科目名称">
          <el-input v-model="newDirectory.name" placeholder="请输入科目名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button class="add-btn" @click="addDirectory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Directory } from '../types';

const router = useRouter();
const directories = ref<Directory[]>([]);
const questionCounts = ref<Record<number, number>>({});
const showAddDialog = ref(false);
const newDirectory = ref({ name: '' });

const loadDirectories = async () => {
  try {
    const dirs = await window.electronAPI.getDirectories();
    directories.value = dirs;

    // 获取每个目录的题目数量
    for (const dir of dirs) {
      const questions = await window.electronAPI.getQuestions(dir.id);
      questionCounts.value[dir.id] = questions.length;
    }
  } catch (error) {
    ElMessage.error('加载目录失败');
    console.error(error);
  }
};

const getQuestionCount = (dirId: number) => {
  return questionCounts.value[dirId] || 0;
};

const enterQuiz = (directoryId: number) => {
  if (getQuestionCount(directoryId) === 0) {
    ElMessage.warning('该科目暂无题目');
    return;
  }
  router.push({ name: 'Quiz', params: { directoryId: directoryId.toString() } });
};

const addDirectory = async () => {
  if (!newDirectory.value.name.trim()) {
    ElMessage.warning('请输入科目名称');
    return;
  }
  try {
    const result = await window.electronAPI.addDirectory(newDirectory.value.name.trim());
    if (result) {
      ElMessage.success('添加成功');
      showAddDialog.value = false;
      newDirectory.value.name = '';
      await loadDirectories();
    } else {
      ElMessage.error('添加失败');
    }
  } catch (error) {
    ElMessage.error('添加失败');
    console.error(error);
  }
};

onMounted(() => {
  loadDirectories();
});
</script>

<style scoped>
.directory-list {
  padding: 40px 4vw;
  width: 100%;
  margin: 0 auto;
  max-width: 1200px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

h1 {
  color: #1a1a1a;
  margin: 0;
  font-size: 36px;
  font-weight: 500;
  letter-spacing: -0.5px;
}

.add-btn {
  background-color: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 14px 28px;
  font-size: 16px;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background-color: #333;
  transform: translateY(-1px);
}

.directory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 28px;
}

.directory-card {
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 20px;
  padding: 40px 28px;
}

.directory-card:hover {
  transform: translateY(-4px);
  border-color: #c4a882;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.directory-name {
  font-size: 20px;
  font-weight: 500;
  color: #1a1a1a;
}

.directory-count {
  font-size: 15px;
  color: #9a9590;
}
</style>

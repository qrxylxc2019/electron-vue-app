<template>
  <div class="exe-container">
    <div class="exe-header">
      <h2>外部应用启动器</h2>
    </div>
    
    <div class="exe-content">
      <div class="exe-form">
        <el-form :model="exeForm" label-width="120px">
          <el-form-item label="应用路径">
            <div class="path-input-group">
              <el-input 
                v-model="exeForm.path" 
                placeholder="请EXE文件例如: D:\豆包\Doubao\Doubao.exe"
                clearable
              />
              <el-button @click="browseExeFile">浏览...</el-button>
            </div>
          </el-form-item>
          
          <el-form-item label="窗口位置和大小">
            <div class="window-settings">
              <el-input-number v-model="exeForm.x" :min="0" :max="3000" placeholder="X坐标" label="X坐标" />
              <el-input-number v-model="exeForm.y" :min="0" :max="3000" placeholder="Y坐标" label="Y坐标" />
              <el-input-number v-model="exeForm.width" :min="100" :max="3000" placeholder="宽度" label="宽度" />
              <el-input-number v-model="exeForm.height" :min="100" :max="3000" placeholder="高度" label="高度" />
            </div>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="launchExe">启动应用</el-button>
            <el-button @click="saveToFavorites" :disabled="!exeForm.path">保存到收藏</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <div class="exe-favorites">
        <h3>收藏的应用</h3>
        <el-empty v-if="favorites.length === 0" description="暂无收藏的应用"></el-empty>
        <el-table v-else :data="favorites" style="width: 100%">
          <el-table-column prop="name" label="名称" width="180" />
          <el-table-column prop="path" label="路径" />
          <el-table-column fixed="right" label="操作" width="200">
            <template #default="scope">
              <el-button 
                size="small" 
                type="primary" 
                @click="launchFavorite(scope.row)"
              >
                启动
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click="removeFavorite(scope.$index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="exe-log">
        <h3>操作日志</h3>
        <div class="log-content">
          <p v-for="(log, index) in logs" :key="index" :class="{ 'error-log': log.type === 'error' }">
            {{ log.time }} - {{ log.message }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'Exe',
  data() {
    return {
      exeForm: {
        path: '',
        args: '',
        hidden: false,
        x: 50,
        y: 50,
        width: 800,
        height: 600
      },
      favorites: [],
      logs: []
    }
  },
  created() {
    // 加载收藏的应用列表
    this.loadFavorites();
  },
  methods: {
    browseExeFile() {
      // Use dialog service to select a file
      // This would need to be implemented using a FastAPI endpoint
      // For now, just prompt the user to manually enter the path
      this.addLog('请手动输入应用路径');
    },
    
    async launchExe() {
      if (!this.exeForm.path) {
        this.addLog('请输入有效的应用路径', 'error');
        return;
      }
      
      try {
        // 调用FastAPI接口来启动应用
        const response = await axios.post('http://localhost:8000/api/open-exe', {
          exe_path: this.exeForm.path,
          x: this.exeForm.x,
          y: this.exeForm.y,
          width: this.exeForm.width,
          height: this.exeForm.height
        });
        
        if (response.data.status === 'success') {
          this.addLog(`应用启动成功: ${this.exeForm.path}`);
        } else {
          this.addLog(`应用启动失败: ${response.data.message}`, 'error');
        }
      } catch (error) {
        this.addLog(`应用启动失败: ${error.message || error}`, 'error');
      }
    },
    
    saveToFavorites() {
      if (!this.exeForm.path) return;
      
      // 提示用户输入名称
      this.$prompt('请输入应用名称', '保存收藏', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: this.getFileNameFromPath(this.exeForm.path),
        inputValidator: (value) => {
          return !!value.trim() || '名称不能为空';
        }
      }).then(({ value }) => {
        const favorite = {
          name: value,
          path: this.exeForm.path,
          args: this.exeForm.args,
          hidden: this.exeForm.hidden,
          x: this.exeForm.x,
          y: this.exeForm.y,
          width: this.exeForm.width,
          height: this.exeForm.height
        };
        
        this.favorites.push(favorite);
        this.saveFavorites();
        this.addLog(`已保存到收藏: ${value}`);
      }).catch(() => {
        // 用户取消，不做任何操作
      });
    },
    
    async launchFavorite(favorite) {
      try {
        // 调用FastAPI接口来启动应用
        const response = await axios.post('http://localhost:8000/api/open-exe', {
          exe_path: favorite.path,
          x: favorite.x || 50,
          y: favorite.y || 50,
          width: favorite.width || 800,
          height: favorite.height || 600
        });
        
        if (response.data.status === 'success') {
          this.addLog(`应用启动成功: ${favorite.name}`);
        } else {
          this.addLog(`应用启动失败: ${response.data.message}`, 'error');
        }
      } catch (error) {
        this.addLog(`应用启动失败: ${error.message || error}`, 'error');
      }
    },
    
    removeFavorite(index) {
      this.$confirm('确定要删除这个收藏吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const removed = this.favorites.splice(index, 1)[0];
        this.saveFavorites();
        this.addLog(`已从收藏中删除: ${removed.name}`);
      }).catch(() => {
        // 用户取消，不做任何操作
      });
    },
    
    loadFavorites() {
      const saved = localStorage.getItem('exe-favorites');
      this.favorites = saved ? JSON.parse(saved) : [];
    },
    
    saveFavorites() {
      localStorage.setItem('exe-favorites', JSON.stringify(this.favorites));
    },
    
    getFileNameFromPath(path) {
      const parts = path.split('\\');
      const filename = parts[parts.length - 1];
      return filename.split('.')[0]; // 去掉扩展名
    },
    
    addLog(message, type = 'info') {
      const now = new Date();
      const time = now.toLocaleTimeString();
      this.logs.unshift({ time, message, type });
      
      // 限制日志数量
      if (this.logs.length > 50) {
        this.logs.pop();
      }
    }
  }
}
</script>

<style scoped>
.exe-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.exe-header {
  margin-bottom: 20px;
}

.exe-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.exe-form {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 20px;
}

.path-input-group {
  display: flex;
  gap: 10px;
}

.path-input-group .el-input {
  flex: 1;
}

.window-settings {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.window-settings .el-input-number {
  width: 120px;
}

.exe-favorites {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 20px;
}

.exe-log {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 20px;
  flex: 1;
  min-height: 200px;
}

.log-content {
  height: 200px;
  overflow-y: auto;
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
}

.error-log {
  color: #f56c6c;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
}
</style>

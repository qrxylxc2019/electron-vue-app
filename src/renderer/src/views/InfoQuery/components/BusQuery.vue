<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2024-07-05 00:00:00
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-07-05 00:00:00
 * @FilePath: \eletron\frontend\src\views\InfoQuery\components\BusQuery.vue
 * @Description: 公交信息查询组件
-->
<template>
  <div class="bus-query-container">
    <!-- 搜索区域 -->
    <div class="search-area">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="城市">
          <el-select v-model="searchForm.city" placeholder="选择城市">
            <el-option v-for="city in cities" :key="city.value" :label="city.label" :value="city.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="查询类型">
          <el-radio-group v-model="searchForm.type">
            <el-radio-button label="line">线路查询</el-radio-button>
            <el-radio-button label="station">站点查询</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-input 
            v-model="searchForm.keyword" 
            :placeholder="searchForm.type === 'line' ? '请输入线路名称或编号，如: 10路, 301' : '请输入站点名称，如: 人民广场'" 
            clearable
          >
            <template #append>
              <el-button @click="searchBusInfo">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 结果展示区域 -->
    <div v-loading="loading" class="result-area">
      <div v-if="!searchStarted" class="welcome-tip">
        <el-empty description="输入关键词开始查询公交信息" :image-size="200">
          <template #image>
            <el-icon class="welcome-icon"><Van /></el-icon>
          </template>
        </el-empty>
      </div>
      
      <div v-else-if="searchResults.length === 0" class="no-result">
        <el-empty description="未找到相关公交信息" />
      </div>
      
      <div v-else class="result-list">
        <template v-if="searchForm.type === 'line'">
          <!-- 线路查询结果 -->
          <el-card v-for="(line, index) in searchResults" :key="index" class="result-card line-card">
            <template #header>
              <div class="card-header">
                <span class="line-name">{{ line.name }}</span>
                <el-tag size="small" type="success">{{ line.type }}</el-tag>
              </div>
            </template>
            <div class="card-body">
              <div class="line-info">
                <div class="info-item">
                  <span class="info-label">运行时间:</span>
                  <span>{{ line.runTime }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">票价:</span>
                  <span>{{ line.fare }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">首末站:</span>
                  <span>{{ line.startStation }} - {{ line.endStation }}</span>
                </div>
              </div>
              
              <div class="station-list">
                <div class="direction">
                  <div class="direction-label">
                    <el-tag size="small">上行</el-tag>
                  </div>
                  <div class="stations">
                    <div v-for="(station, idx) in line.stations.up" :key="idx" class="station">
                      <div class="station-dot"></div>
                      <div class="station-name">{{ station }}</div>
                    </div>
                  </div>
                </div>
                
                <div class="direction">
                  <div class="direction-label">
                    <el-tag size="small" type="warning">下行</el-tag>
                  </div>
                  <div class="stations">
                    <div v-for="(station, idx) in line.stations.down" :key="idx" class="station">
                      <div class="station-dot"></div>
                      <div class="station-name">{{ station }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </template>
        
        <template v-else>
          <!-- 站点查询结果 -->
          <el-card v-for="(station, index) in searchResults" :key="index" class="result-card station-card">
            <template #header>
              <div class="card-header">
                <span class="station-name">{{ station.name }}</span>
                <el-tag size="small" type="info">{{ station.type }}</el-tag>
              </div>
            </template>
            <div class="card-body">
              <div class="station-info">
                <div class="info-item">
                  <span class="info-label">地址:</span>
                  <span>{{ station.address }}</span>
                </div>
              </div>
              
              <div class="line-list">
                <div class="lines-title">途经线路:</div>
                <div class="lines">
                  <el-tag v-for="(line, idx) in station.lines" :key="idx" class="line-tag">
                    {{ line }}
                  </el-tag>
                </div>
              </div>
              
              <div v-if="station.realTimeInfo.length > 0" class="real-time-info">
                <div class="real-time-title">实时到站信息:</div>
                <el-table :data="station.realTimeInfo" style="width: 100%">
                  <el-table-column prop="lineName" label="线路" width="100" />
                  <el-table-column prop="direction" label="方向" width="150" />
                  <el-table-column prop="status" label="状态">
                    <template #default="scope">
                      <span class="real-time-status">{{ scope.row.status }}</span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-card>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Van, Search } from '@element-plus/icons-vue'

// 状态定义
const loading = ref(false)
const searchStarted = ref(false)
const searchResults = ref([])

// 城市数据
const cities = [
  { label: '广州', value: 'guangzhou' },
  { label: '深圳', value: 'shenzhen' },
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '杭州', value: 'hangzhou' },
  { label: '成都', value: 'chengdu' }
]

// 搜索表单
const searchForm = reactive({
  city: 'guangzhou',
  type: 'line',
  keyword: ''
})

// 查询公交信息
const searchBusInfo = async () => {
  if (!searchForm.keyword) {
    ElMessage.warning('请输入查询关键词')
    return
  }
  
  loading.value = true
  searchStarted.value = true
  searchResults.value = []
  
  try {
    // 在实际应用中，这里应该调用API获取公交信息
    // const res = await request.post('http://localhost:8000/api/bus/query', searchForm)
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟数据
    if (searchForm.type === 'line') {
      if (searchForm.keyword.includes('10') || searchForm.keyword.toLowerCase().includes('十')) {
        searchResults.value = [
          {
            name: '10路公交',
            type: '普通公交',
            runTime: '6:00-22:00',
            fare: '2元/人次',
            startStation: '火车东站',
            endStation: '大学城',
            stations: {
              up: ['火车东站', '东风路口', '人民广场', '市中心', '体育西路', '华师', '大学城'],
              down: ['大学城', '华师', '体育西路', '市中心', '人民广场', '东风路口', '火车东站']
            }
          }
        ]
      } else if (searchForm.keyword.includes('301')) {
        searchResults.value = [
          {
            name: '301路公交',
            type: '快速公交',
            runTime: '6:30-21:30',
            fare: '3元/人次',
            startStation: '机场',
            endStation: '南站',
            stations: {
              up: ['机场', '机场路口', '科技园', '会展中心', '城市广场', '南站'],
              down: ['南站', '城市广场', '会展中心', '科技园', '机场路口', '机场']
            }
          }
        ]
      }
    } else {
      if (searchForm.keyword.includes('广场')) {
        searchResults.value = [
          {
            name: '人民广场站',
            type: '公交站',
            address: '市中心人民路123号',
            lines: ['10路', '301路', '25路', '44路', '102路', '高峰快线1号'],
            realTimeInfo: [
              { lineName: '10路', direction: '大学城方向', status: '即将到站' },
              { lineName: '301路', direction: '南站方向', status: '距离2站，约5分钟' },
              { lineName: '44路', direction: '火车站方向', status: '距离3站，约8分钟' }
            ]
          }
        ]
      } else if (searchForm.keyword.includes('大学')) {
        searchResults.value = [
          {
            name: '大学城站',
            type: '公交站',
            address: '大学城环城南路456号',
            lines: ['10路', 'B12路', '夜20线'],
            realTimeInfo: [
              { lineName: '10路', direction: '火车东站方向', status: '距离1站，约3分钟' },
              { lineName: 'B12路', direction: '南湖方向', status: '即将到站' }
            ]
          }
        ]
      }
    }
  } catch (error) {
    console.error('查询公交信息失败:', error)
    ElMessage.error('查询公交信息失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.bus-query-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-area {
  margin-bottom: 20px;
}

.result-area {
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
}

.welcome-tip, .no-result {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-icon {
  font-size: 80px;
  color: #909399;
}

.result-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.line-name, .station-name {
  font-size: 16px;
  font-weight: 600;
}

.line-info, .station-info {
  margin-bottom: 20px;
}

.info-item {
  margin-bottom: 8px;
}

.info-label {
  font-weight: 500;
  margin-right: 8px;
}

.station-list {
  display: flex;
  gap: 20px;
}

.direction {
  flex: 1;
}

.direction-label {
  margin-bottom: 12px;
}

.stations {
  position: relative;
  padding-left: 15px;
  border-left: 2px dashed #DCDFE6;
}

.station {
  position: relative;
  padding: 8px 0;
}

.station-dot {
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background-color: #409EFF;
  border-radius: 50%;
  z-index: 1;
}

.station-name {
  font-size: 14px;
}

.lines-title, .real-time-title {
  font-weight: 500;
  margin-bottom: 12px;
}

.lines {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.line-tag {
  margin-right: 0;
}

.real-time-status {
  color: #F56C6C;
  font-weight: 500;
}
</style> 
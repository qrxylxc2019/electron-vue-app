<!--
 * @Author: xuechao 3283726232@qq.com
 * @Date: 2024-07-05 00:00:00
 * @LastEditors: xuechao 3283726232@qq.com
 * @LastEditTime: 2024-07-05 00:00:00
 * @FilePath: \eletron\frontend\src\views\InfoQuery\components\FoodDelivery.vue
 * @Description: 外卖信息查询组件
-->
<template>
  <div class="food-delivery-container">
    <!-- 搜索区域 -->
    <div class="search-area">
      <el-form :inline="true" :model="searchForm" class="search-form">
        
        <el-form-item label="价格区间">
          <el-select v-model="searchForm.priceRange" placeholder="选择价格区间">
            <el-option label="全部" value="" />
            <el-option label="20元以下" value="0-20" />
            <el-option label="20-40元" value="20-40" />
            <el-option label="40-60元" value="40-60" />
            <el-option label="60-80元" value="60-80" />
            <el-option label="80元以上" value="80-999" />
          </el-select>
        </el-form-item>
        <el-form-item label="美食分类">
          <el-select v-model="searchForm.category" placeholder="选择美食分类">
            <el-option label="全部" value="" />
            <el-option label="快餐便当" value="fast_food" />
            <el-option label="特色小吃" value="snack" />
            <el-option label="甜品饮品" value="dessert" />
            <el-option label="米粉面馆" value="noodle" />
            <el-option label="地方菜系" value="cuisine" />
            <el-option label="炸鸡汉堡" value="burger" />
            <el-option label="火锅烧烤" value="hot_pot" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input 
            v-model="searchForm.keyword" 
            placeholder="搜索店铺名称、美食名称" 
            clearable
          >
            <template #append>
              <el-button @click="searchFood">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 筛选项 -->
    <div class="filter-options">
      <el-radio-group v-model="filterOption" size="small" @change="applyFilter">
        <el-radio-button label="default">默认排序</el-radio-button>
        <el-radio-button label="distance">距离最近</el-radio-button>
        <el-radio-button label="sales">销量最高</el-radio-button>
        <el-radio-button label="rating">评分最高</el-radio-button>
      </el-radio-group>
      
      <div class="delivery-options">
        <el-checkbox v-model="deliveryOptions.onlyDiscount" @change="applyFilter">优惠活动</el-checkbox>
        <el-checkbox v-model="deliveryOptions.noDeliveryFee" @change="applyFilter">免配送费</el-checkbox>
      </div>
    </div>
    
    <!-- 结果展示区域 -->
    <div v-loading="loading" class="result-area">
      <div v-if="!searchStarted" class="welcome-tip">
        <el-empty description="输入关键词开始查询外卖信息" :image-size="200">
          <template #image>
            <el-icon class="welcome-icon"><Food /></el-icon>
          </template>
        </el-empty>
      </div>
      
      <div v-else-if="foodStores.length === 0" class="no-result">
        <el-empty description="未找到相关外卖信息" />
      </div>
      
      <div v-else class="store-list">
        <el-card v-for="(store, index) in foodStores" :key="index" class="store-card" shadow="hover">
          <div class="store-info">
            <div class="store-image">
              <el-image :src="store.image" fit="cover" lazy>
                <template #error>
                  <div class="image-placeholder">
                    <el-icon><Food /></el-icon>
                  </div>
                </template>
              </el-image>
              <div v-if="store.discount" class="discount-badge">
                <el-tag type="danger" size="small">{{ store.discount }}</el-tag>
              </div>
            </div>
            
            <div class="store-detail">
              <div class="store-header">
                <div class="store-name">{{ store.name }}</div>
                <div class="store-rating">
                  <el-rate 
                    v-model="store.rating" 
                    disabled 
                    :max="5"
                    :colors="['#F7BA2A', '#F7BA2A', '#F7BA2A']"
                    :score-template="store.rating + ''"
                  />
                  <span class="rating-value">{{ store.rating }}</span>
                  <span class="sales-count">月售{{ store.salesCount }}单</span>
                </div>
              </div>
              
              <div class="store-meta">
                <div class="delivery-info">
                  <span class="delivery-time">
                    <el-icon><Timer /></el-icon>
                    {{ store.deliveryTime }}分钟
                  </span>
                  <span class="delivery-distance">{{ store.distance }}km</span>
                  <span class="delivery-fee">
                    配送费¥{{ store.deliveryFee }}
                    <span v-if="store.deliveryFee === 0" class="free-delivery">免配送费</span>
                  </span>
                </div>
                <div class="average-price">人均¥{{ store.averagePrice }}</div>
              </div>
              
              <div class="food-tags">
                <el-tag 
                  v-for="(tag, idx) in store.tags" 
                  :key="idx"
                  size="small"
                  class="food-tag"
                  :type="getTagType(idx)"
                >
                  {{ tag }}
                </el-tag>
              </div>
              
              <div class="popular-items">
                <div class="popular-title">热门菜品:</div>
                <div class="popular-list">
                  <span v-for="(item, idx) in store.popularItems" :key="idx" class="popular-item">
                    {{ item.name }} ¥{{ item.price }}
                    <el-divider direction="vertical" v-if="idx < store.popularItems.length - 1" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="store-footer">
            <div class="promotion" v-if="store.promotions && store.promotions.length > 0">
              <div v-for="(promo, idx) in store.promotions" :key="idx" class="promo-item">
                <el-tag size="small" :type="getPromoType(promo.type)">{{ promo.type }}</el-tag>
                <span class="promo-desc">{{ promo.description }}</span>
              </div>
            </div>
            
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="viewStore(store)">查看菜单</el-button>
            </div>
          </div>
        </el-card>
      </div>
      
      <!-- 分页 -->
      <div class="pagination-container" v-if="foodStores.length > 0">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          layout="prev, pager, next"
          :total="totalStores"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Food, Search, Timer } from '@element-plus/icons-vue'

// 状态定义
const loading = ref(false)
const searchStarted = ref(false)
const foodStores = ref([])
const filterOption = ref('default')
const currentPage = ref(1)
const pageSize = ref(10)
const totalStores = ref(0)

// 搜索表单
const searchForm = reactive({
  priceRange: '',
  category: '',
  keyword: ''
})

// 配送选项
const deliveryOptions = reactive({
  onlyDiscount: false,
  noDeliveryFee: false
})

// 查询外卖信息
const searchFood = async () => {
  loading.value = true
  searchStarted.value = true
  currentPage.value = 1
  
  try {
    // 在实际应用中，这里应该调用API获取外卖信息
    // const res = await request.post('http://localhost:8000/api/food/query', {
    //   ...searchForm,
    //   ...deliveryOptions,
    //   sort: filterOption.value,
    //   page: currentPage.value,
    //   pageSize: pageSize.value
    // })
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟数据
    const mockStores = [
      {
        id: 1,
        name: '黄焖鸡米饭',
        image: 'https://img.yzcdn.cn/vant/cat.jpeg',
        rating: 4.7,
        salesCount: 2352,
        deliveryTime: 30,
        distance: 1.2,
        deliveryFee: 5,
        averagePrice: 22,
        discount: '满20减5',
        tags: ['中式快餐', '特色小吃', '米饭'],
        popularItems: [
          { name: '黄焖鸡米饭', price: 18 },
          { name: '黄焖排骨米饭', price: 22 },
          { name: '黄焖鸭肉米饭', price: 20 }
        ],
        promotions: [
          { type: '满减', description: '满20减5，满30减8，满40减12' },
          { type: '特价', description: '10:00-14:00点餐享受9折优惠' }
        ]
      },
      {
        id: 2,
        name: '正宗兰州拉面',
        image: 'https://img.yzcdn.cn/vant/cat.jpeg',
        rating: 4.5,
        salesCount: 1980,
        deliveryTime: 25,
        distance: 0.8,
        deliveryFee: 0,
        averagePrice: 18,
        discount: '首单减8元',
        tags: ['拉面', '面馆', '西北菜'],
        popularItems: [
          { name: '牛肉拉面', price: 16 },
          { name: '大盘鸡拌面', price: 28 },
          { name: '清汤牛肉拉面', price: 18 }
        ],
        promotions: [
          { type: '首单', description: '新用户下单立减8元' },
          { type: '免配送', description: '本店全天免配送费' }
        ]
      },
      {
        id: 3,
        name: '川湘菜馆',
        image: 'https://img.yzcdn.cn/vant/cat.jpeg',
        rating: 4.8,
        salesCount: 3102,
        deliveryTime: 40,
        distance: 2.5,
        deliveryFee: 6,
        averagePrice: 45,
        discount: '满50减12',
        tags: ['川菜', '湘菜', '下饭菜'],
        popularItems: [
          { name: '回锅肉', price: 38 },
          { name: '剁椒鱼头', price: 58 },
          { name: '麻婆豆腐', price: 22 }
        ],
        promotions: [
          { type: '满减', description: '满50减12，满80减20，满100减30' },
          { type: '折扣', description: '下单满3个菜品享受9.5折' }
        ]
      },
      {
        id: 4,
        name: '吉野家',
        image: 'https://img.yzcdn.cn/vant/cat.jpeg',
        rating: 4.4,
        salesCount: 5280,
        deliveryTime: 28,
        distance: 1.5,
        deliveryFee: 4,
        averagePrice: 30,
        discount: '满30减8',
        tags: ['快餐', '牛肉饭', '日式'],
        popularItems: [
          { name: '牛肉饭', price: 27 },
          { name: '鳗鱼饭', price: 45 },
          { name: '猪肉饭', price: 23 }
        ],
        promotions: [
          { type: '满减', description: '满30减8，满50减15' },
          { type: '套餐', description: '饭+汤+小菜仅需36元' }
        ]
      },
      {
        id: 5,
        name: '沙县小吃',
        image: 'https://img.yzcdn.cn/vant/cat.jpeg',
        rating: 4.2,
        salesCount: 6721,
        deliveryTime: 20,
        distance: 0.6,
        deliveryFee: 0,
        averagePrice: 15,
        discount: '',
        tags: ['小吃', '快餐', '面食'],
        popularItems: [
          { name: '三丁肉丝面', price: 14 },
          { name: '蒸饺', price: 12 },
          { name: '扁肉汤', price: 13 }
        ],
        promotions: [
          { type: '免配送', description: '本店全天免配送费' }
        ]
      }
    ]
    
    // 应用筛选
    let filteredStores = [...mockStores]
    
    if (searchForm.keyword) {
      const keyword = searchForm.keyword.toLowerCase()
      filteredStores = filteredStores.filter(store => 
        store.name.toLowerCase().includes(keyword) || 
        store.tags.some(tag => tag.toLowerCase().includes(keyword)) ||
        store.popularItems.some(item => item.name.toLowerCase().includes(keyword))
      )
    }
    
    if (deliveryOptions.onlyDiscount) {
      filteredStores = filteredStores.filter(store => store.discount)
    }
    
    if (deliveryOptions.noDeliveryFee) {
      filteredStores = filteredStores.filter(store => store.deliveryFee === 0)
    }
    
    // 排序
    if (filterOption.value === 'distance') {
      filteredStores.sort((a, b) => a.distance - b.distance)
    } else if (filterOption.value === 'sales') {
      filteredStores.sort((a, b) => b.salesCount - a.salesCount)
    } else if (filterOption.value === 'rating') {
      filteredStores.sort((a, b) => b.rating - a.rating)
    }
    
    totalStores.value = filteredStores.length
    foodStores.value = filteredStores
  } catch (error) {
    console.error('查询外卖信息失败:', error)
    ElMessage.error('查询外卖信息失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 应用筛选
const applyFilter = () => {
  if (searchStarted.value) {
    searchFood()
  }
}

// 查看店铺
const viewStore = (store) => {
  ElMessage.info(`查看 ${store.name} 的菜单`)
}

// 处理页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  searchFood()
}

// 获取标签类型
const getTagType = (index) => {
  const types = ['', 'success', 'warning', 'info', 'danger']
  return types[index % types.length]
}

// 获取促销类型
const getPromoType = (type) => {
  switch (type) {
    case '满减':
      return 'danger'
    case '首单':
      return 'warning'
    case '免配送':
      return 'success'
    case '折扣':
      return 'info'
    case '特价':
      return 'primary'
    default:
      return ''
  }
}
</script>

<style scoped>
.food-delivery-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-area {
  margin-bottom: 15px;
}

.filter-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.delivery-options {
  display: flex;
  gap: 15px;
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

.store-card {
  margin-bottom: 20px;
}

.store-info {
  display: flex;
  gap: 15px;
}

.store-image {
  width: 120px;
  height: 120px;
  position: relative;
  flex-shrink: 0;
}

.store-image .el-image {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  color: #909399;
  font-size: 40px;
}

.discount-badge {
  position: absolute;
  top: 8px;
  left: 0;
}

.store-detail {
  flex: 1;
}

.store-header {
  margin-bottom: 10px;
}

.store-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 5px;
  color: #303133;
}

.store-rating {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.rating-value {
  margin-left: 5px;
  margin-right: 10px;
  color: #F7BA2A;
  font-weight: bold;
}

.store-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
  color: #606266;
}

.delivery-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.delivery-time {
  display: flex;
  align-items: center;
  gap: 5px;
}

.free-delivery {
  color: #67c23a;
  margin-left: 5px;
}

.food-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}

.food-tag {
  margin-right: 0;
}

.popular-items {
  font-size: 12px;
  color: #606266;
}

.popular-title {
  margin-bottom: 5px;
}

.popular-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.popular-item {
  color: #F56C6C;
}

.store-footer {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #EBEEF5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.promotion {
  flex: 1;
}

.promo-item {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.promo-desc {
  font-size: 12px;
  color: #606266;
}

.action-buttons {
  margin-left: 15px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style> 
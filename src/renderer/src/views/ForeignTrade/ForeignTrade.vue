<template>
  <div class="solicit-container">
    <div class="top-content">
      <!-- 左侧：店铺列表 -->
      <div class="shop-section">
        <div class="shop-header">
          <span class="shop-title">店铺管理</span>
          <el-button type="primary" @click="openShopDialog">
            <el-icon><Plus /></el-icon>新增店铺
          </el-button>
        </div>
        <el-table
          :data="shopList"
          v-loading="shopLoading"
          stripe
          style="width: 100%; flex: 1;"
          size="small"
          :header-cell-style="{ fontSize: '12px' }"
          :cell-style="{ fontSize: '12px' }"
        >
          <el-table-column type="index" label="序号" width="100" />
          <el-table-column prop="name" label="店铺名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="platform" label="平台" width="80" />
          <el-table-column prop="account" label="账号" min-width="100" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === '正常' ? 'success' : row.status === '异常' ? 'danger' : 'info'" size="small">
                {{ row.status || '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="editShop(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="deleteShop(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <!-- 右侧：ECharts 柱状图 -->
      <div class="chart-section">
        <div class="chart-title">店铺销售额统计</div>
        <div ref="shopChartRef" class="shop-chart"></div>
      </div>
    </div>
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="亚马逊" name="amazon" />
      <el-tab-pane label="Temu" name="temu" />
      <el-tab-pane label="速卖通" name="aliexpress" />
      <el-tab-pane label="1688" name="1688" />
      <el-tab-pane label="希音" name="shein" />
      <el-tab-pane label="资讯" name="news" />
      <el-tab-pane label="tkshop" name="tk" />
    </el-tabs>

    <!-- 模块切换 -->
    <div class="module-tabs" v-if="activeTab !== 'news'">
      <el-radio-group v-model="activeModule" size="large" @change="handleModuleChange">
        <el-radio-button label="selection">选品</el-radio-button>
        <el-radio-button label="customer">客户</el-radio-button>
        <el-radio-button label="order">订单</el-radio-button>
        <el-radio-button label="logistics">物流</el-radio-button>
        <el-radio-button label="converter">单位换算</el-radio-button>
      </el-radio-group>
    </div>

    <div class="tab-content">
      <!-- 资讯模块 -->
      <div v-if="activeTab === 'news'" class="news-container">
        <el-table
          v-loading="newsLoading"
          :data="newsData"
          stripe
          style="width: 100%"
          :height="tableHeight"
        >
          <el-table-column type="index" label="序号" width="100" />
          <el-table-column prop="title" label="标题" min-width="400" show-overflow-tooltip>
            <template #default="scope">
              <a :href="scope.row.link" target="_blank" class="news-link">
                {{ scope.row.title }}
                <el-tag v-if="scope.row.isHot" type="warning" size="small" style="margin-left: 8px;">热</el-tag>
              </a>
            </template>
          </el-table-column>
          <el-table-column prop="replies" label="回复数" width="160" align="center" />
          <el-table-column prop="time" label="时间" width="150" />
        </el-table>
      </div>

      <!-- 单位换算模块 -->
      <div v-if="activeModule === 'converter'" class="converter-container">
        <el-tabs v-model="converterTab" type="border-card">
          <!-- 长度重量单位换算 -->
          <el-tab-pane label="长度重量单位换算" name="lengthWeight">
            <div class="converter-grid">
              <!-- 长度单位换算 -->
              <div class="converter-section">
                <div class="section-header">
                  <h3>长度单位换算</h3>
                  <span class="section-subtitle">常用单位</span>
                  <el-button type="primary" link @click="resetLength">数据重置</el-button>
                </div>
                <div class="converter-items">
                  <div class="converter-item" v-for="unit in lengthUnits.common" :key="unit.key">
                    <label>{{ unit.label }}</label>
                    <el-input v-model="lengthValues[unit.key]" @input="convertLength(unit.key)" />
                  </div>
                </div>
                <div class="section-header">
                  <span class="section-subtitle">非常用单位</span>
                </div>
                <div class="converter-items">
                  <div class="converter-item" v-for="unit in lengthUnits.uncommon" :key="unit.key">
                    <label>{{ unit.label }}</label>
                    <el-input v-model="lengthValues[unit.key]" @input="convertLength(unit.key)" />
                  </div>
                </div>
              </div>

              <!-- 重量单位换算 -->
              <div class="converter-section">
                <div class="section-header">
                  <h3>重量单位换算</h3>
                  <span class="section-subtitle">常用单位</span>
                  <el-button type="primary" link @click="resetWeight">数据重置</el-button>
                </div>
                <div class="converter-items">
                  <div class="converter-item" v-for="unit in weightUnits.common" :key="unit.key">
                    <label>{{ unit.label }}</label>
                    <el-input v-model="weightValues[unit.key]" @input="convertWeight(unit.key)" />
                  </div>
                </div>
                <div class="section-header">
                  <span class="section-subtitle">非常用单位</span>
                </div>
                <div class="converter-items">
                  <div class="converter-item" v-for="unit in weightUnits.uncommon" :key="unit.key">
                    <label>{{ unit.label }}</label>
                    <el-input v-model="weightValues[unit.key]" @input="convertWeight(unit.key)" />
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 面积体积单位换算 -->
          <el-tab-pane label="面积体积单位换算" name="areaVolume">
            <div class="converter-grid">
              <!-- 面积单位换算 -->
              <div class="converter-section">
                <div class="section-header">
                  <h3>面积单位换算</h3>
                  <span class="section-subtitle">常用单位</span>
                  <el-button type="primary" link @click="resetArea">数据重置</el-button>
                </div>
                <div class="converter-items">
                  <div class="converter-item" v-for="unit in areaUnits" :key="unit.key">
                    <label>{{ unit.label }}</label>
                    <el-input v-model="areaValues[unit.key]" @input="convertArea(unit.key)" />
                  </div>
                </div>
              </div>

              <!-- 体积单位换算 -->
              <div class="converter-section">
                <div class="section-header">
                  <h3>体积单位换算</h3>
                  <span class="section-subtitle">常用单位</span>
                  <el-button type="primary" link @click="resetVolume">数据重置</el-button>
                </div>
                <div class="converter-items">
                  <div class="converter-item" v-for="unit in volumeUnits" :key="unit.key">
                    <label>{{ unit.label }}</label>
                    <el-input v-model="volumeValues[unit.key]" @input="convertVolume(unit.key)" />
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 汇率换算 -->
          <el-tab-pane label="汇率换算" name="exchangeRate">
            <div class="exchange-container">
              <div class="exchange-left">
                <div class="currency-row" :class="{ 'base-currency': currency.code === 'CNY' }" v-for="currency in currencies" :key="currency.code">
                  <div class="currency-code-box">
                    <div class="code-large">{{ currency.code.substring(0, 2) }}</div>
                  </div>
                  <div class="currency-info">
                    <div class="currency-name">{{ currency.name }}</div>
                    <div class="currency-code-small">{{ currency.code }}</div>
                  </div>
                  <div class="currency-rate" v-if="currency.code !== 'CNY'">
                    <span style="color: #8b9a6d;">汇率 {{ currency.rate }}</span>
                  </div>
                  <div class="currency-input">
                    <span class="currency-symbol">{{ currency.symbol }}</span>
                    <el-input
                      v-model="exchangeValues[currency.code]"
                      @input="convertExchange(currency.code)"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div v-if="activeModule !== 'converter' && activeTab !== 'news'" class="header">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入搜索关键词"
          class="search-input"
          size="large"
          clearable
          @input="debouncedSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterStatus" placeholder="状态" size="large" clearable @change="handleSearch" style="width: 150px">
          <el-option label="全部" value="" />
          <el-option v-for="item in currentStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-date-picker
          v-model="filterDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="large"
          clearable
          @change="handleSearch"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
        <el-button type="primary" size="large" @click="showAddDialog">
          <el-icon><Plus /></el-icon>新增
        </el-button>
      </div>

      <!-- 选品模块 -->
      <el-table v-if="activeModule === 'selection' && activeTab !== 'news'" :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
        <el-table-column type="index" label="序号" width="100" />
        <el-table-column prop="productName" label="产品名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="category" label="品类" width="120" />
        <el-table-column prop="supplier" label="供应商" min-width="130" show-overflow-tooltip />
        <el-table-column prop="costPrice" label="成本价(¥)" width="200" />
        <el-table-column prop="sellPrice" label="售价(USD)" width="200" />
        <el-table-column prop="profitRate" label="利润率" width="200">
          <template #default="scope">
            <span :style="{ color: parseFloat(scope.row.profitRate) > 30 ? '#67c23a' : '#f56c6c' }">{{ scope.row.profitRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">{{ getStatusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 客户模块 -->
      <el-table v-if="activeModule === 'customer' && activeTab !== 'news'" :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="customerName" label="客户名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="country" label="国家/地区" width="120" />
        <el-table-column prop="contactEmail" label="联系邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column prop="contactPhone" label="联系电话" width="150" />
        <el-table-column prop="source" label="客户来源" width="120" />
        <el-table-column prop="createTime" label="创建时间" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">{{ getStatusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 订单模块 -->
      <el-table v-if="activeModule === 'order' && activeTab !== 'news'" :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="orderNo" label="订单号" width="160" show-overflow-tooltip />
        <el-table-column prop="customerName" label="客户" min-width="130" show-overflow-tooltip />
        <el-table-column prop="productName" label="产品" min-width="130" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="amount" label="金额(USD)" width="120" />
        <el-table-column prop="createTime" label="下单时间" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">{{ getStatusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 物流模块 -->
      <el-table v-if="activeModule === 'logistics' && activeTab !== 'news'" :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="trackingNo" label="物流单号" width="180" show-overflow-tooltip />
        <el-table-column prop="orderNo" label="关联订单" width="160" show-overflow-tooltip />
        <el-table-column prop="carrier" label="物流商" width="130" />
        <el-table-column prop="destination" label="目的地" width="120" />
        <el-table-column prop="weight" label="重量(kg)" width="100" />
        <el-table-column prop="shippingFee" label="运费(¥)" width="100" />
        <el-table-column prop="createTime" label="发货时间" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">{{ getStatusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="activeModule !== 'converter' && activeTab !== 'news'" class="pagination-container">
        <el-pagination background v-model:current-page="currentPage" v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </div>
    </div>

    <!-- 店铺新增/编辑弹窗 -->
    <el-dialog
      v-model="shopDialogVisible"
      :title="isEditShop ? '编辑店铺' : '新增店铺'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="shopForm" label-width="80px">
        <el-form-item label="店铺名称" required>
          <el-input v-model="shopForm.name" placeholder="请输入店铺名称" />
        </el-form-item>
        <el-form-item label="平台">
          <el-select v-model="shopForm.platform" placeholder="请选择平台" style="width: 100%">
            <el-option label="亚马逊" value="亚马逊" />
            <el-option label="Temu" value="Temu" />
            <el-option label="速卖通" value="速卖通" />
            <el-option label="1688" value="1688" />
            <el-option label="希音" value="希音" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="shopForm.account" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="shopForm.password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="店铺链接">
          <el-input v-model="shopForm.shop_url" placeholder="请输入店铺链接" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="shopForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="正常" value="正常" />
            <el-option label="异常" value="异常" />
            <el-option label="停用" value="停用" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单数">
          <el-input v-model="shopForm.sales_count" type="number" placeholder="请输入订单数" />
        </el-form-item>
        <el-form-item label="销售额">
          <el-input v-model="shopForm.sales_amount" type="number" placeholder="请输入销售额" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="shopForm.remark" placeholder="请输入备注" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shopDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleShopSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑抽屉 -->
    <el-drawer v-model="dialogVisible" :title="isEdit ? '编辑' : '新增'" direction="rtl" size="500px" @close="resetForm">
      <el-form :model="form" label-width="90px" size="large">
        <!-- 选品表单 -->
        <template v-if="activeModule === 'selection'">
          <el-form-item label="产品名称"><el-input v-model="form.productName" placeholder="请输入产品名称" /></el-form-item>
          <el-form-item label="品类"><el-input v-model="form.category" placeholder="请输入品类" /></el-form-item>
          <el-form-item label="供应商"><el-input v-model="form.supplier" placeholder="请输入供应商" /></el-form-item>
          <el-form-item label="成本价(¥)"><el-input v-model="form.costPrice" type="number" placeholder="请输入成本价" /></el-form-item>
          <el-form-item label="售价(USD)"><el-input v-model="form.sellPrice" type="number" placeholder="请输入售价" /></el-form-item>
          <el-form-item label="利润率(%)"><el-input v-model="form.profitRate" type="number" placeholder="请输入利润率" /></el-form-item>
        </template>
        <!-- 客户表单 -->
        <template v-if="activeModule === 'customer'">
          <el-form-item label="客户名称"><el-input v-model="form.customerName" placeholder="请输入客户名称" /></el-form-item>
          <el-form-item label="国家/地区"><el-input v-model="form.country" placeholder="请输入国家/地区" /></el-form-item>
          <el-form-item label="联系邮箱"><el-input v-model="form.contactEmail" placeholder="请输入联系邮箱" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="form.contactPhone" placeholder="请输入联系电话" /></el-form-item>
          <el-form-item label="客户来源"><el-input v-model="form.source" placeholder="请输入客户来源" /></el-form-item>
        </template>
        <!-- 订单表单 -->
        <template v-if="activeModule === 'order'">
          <el-form-item label="订单号"><el-input v-model="form.orderNo" placeholder="请输入订单号" /></el-form-item>
          <el-form-item label="客户"><el-input v-model="form.customerName" placeholder="请输入客户名称" /></el-form-item>
          <el-form-item label="产品"><el-input v-model="form.productName" placeholder="请输入产品名称" /></el-form-item>
          <el-form-item label="数量"><el-input v-model="form.quantity" type="number" placeholder="请输入数量" /></el-form-item>
          <el-form-item label="金额(USD)"><el-input v-model="form.amount" type="number" placeholder="请输入金额" /></el-form-item>
        </template>
        <!-- 物流表单 -->
        <template v-if="activeModule === 'logistics'">
          <el-form-item label="物流单号"><el-input v-model="form.trackingNo" placeholder="请输入物流单号" /></el-form-item>
          <el-form-item label="关联订单"><el-input v-model="form.orderNo" placeholder="请输入关联订单号" /></el-form-item>
          <el-form-item label="物流商"><el-input v-model="form.carrier" placeholder="请输入物流商" /></el-form-item>
          <el-form-item label="目的地"><el-input v-model="form.destination" placeholder="请输入目的地" /></el-form-item>
          <el-form-item label="重量(kg)"><el-input v-model="form.weight" type="number" placeholder="请输入重量" /></el-form-item>
          <el-form-item label="运费(¥)"><el-input v-model="form.shippingFee" type="number" placeholder="请输入运费" /></el-form-item>
        </template>
        <!-- 公共字段 -->
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option v-for="item in currentStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="4" placeholder="请输入备注" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script>
import { Search, Plus, Edit, Delete, Refresh, ChatDotRound, View } from "@element-plus/icons-vue";
import { debounce } from "lodash";
import * as echarts from 'echarts';
import request from '@/utils/request';

// 各模块假数据
const mockData = {
  amazon: {
    selection: [
      { id: 1, productName: "蓝牙耳机", category: "电子产品", supplier: "深圳科技", costPrice: "45", sellPrice: "29.99", profitRate: "38", createTime: "2026-03-01", status: "1", remark: "热销品", platform: "amazon" },
      { id: 2, productName: "手机壳", category: "配件", supplier: "义乌百货", costPrice: "5", sellPrice: "12.99", profitRate: "55", createTime: "2026-02-28", status: "2", remark: "多款式", platform: "amazon" },
      { id: 3, productName: "瑜伽垫", category: "运动", supplier: "杭州体育", costPrice: "30", sellPrice: "25.99", profitRate: "25", createTime: "2026-02-25", status: "1", remark: "环保材质", platform: "amazon" },
    ],
    customer: [
      { id: 1, customerName: "John Smith", country: "美国", contactEmail: "john@example.com", contactPhone: "+1-555-0101", source: "亚马逊站内", createTime: "2026-03-01", status: "1", remark: "大客户" },
      { id: 2, customerName: "Emily Davis", country: "英国", contactEmail: "emily@example.com", contactPhone: "+44-20-1234", source: "展会", createTime: "2026-02-15", status: "2", remark: "复购客户" },
      { id: 3, customerName: "Hans Mueller", country: "德国", contactEmail: "hans@example.com", contactPhone: "+49-30-5678", source: "LinkedIn", createTime: "2026-02-10", status: "1", remark: "" },
    ],
    order: [
      { id: 1, orderNo: "AMZ-2026030101", customerName: "John Smith", productName: "蓝牙耳机", quantity: "200", amount: "5998", createTime: "2026-03-01", status: "1", remark: "首单" },
      { id: 2, orderNo: "AMZ-2026022801", customerName: "Emily Davis", productName: "手机壳", quantity: "500", amount: "6495", createTime: "2026-02-28", status: "2", remark: "加急" },
      { id: 3, orderNo: "AMZ-2026022001", customerName: "Hans Mueller", productName: "LED台灯", quantity: "100", amount: "3299", createTime: "2026-02-20", status: "3", remark: "" },
    ],
    logistics: [
      { id: 1, trackingNo: "SF1234567890", orderNo: "AMZ-2026030101", carrier: "顺丰国际", destination: "美国", weight: "150", shippingFee: "2800", createTime: "2026-03-02", status: "1", remark: "空运" },
      { id: 2, trackingNo: "DHL9876543210", orderNo: "AMZ-2026022801", carrier: "DHL", destination: "英国", weight: "80", shippingFee: "1500", createTime: "2026-03-01", status: "2", remark: "快递" },
    ],
  },
  temu: {
    selection: [
      { id: 1, productName: "收纳盒套装", category: "家居", supplier: "台州塑料", costPrice: "8", sellPrice: "6.99", profitRate: "42", createTime: "2026-03-02", status: "1", remark: "爆款潜力", platform: "temu" },
      { id: 2, productName: "化妆刷套装", category: "美妆", supplier: "深圳美妆", costPrice: "12", sellPrice: "9.99", profitRate: "35", createTime: "2026-02-26", status: "2", remark: "12件套", platform: "temu" },
      { id: 3, productName: "儿童玩具车", category: "玩具", supplier: "汕头玩具", costPrice: "15", sellPrice: "11.99", profitRate: "28", createTime: "2026-02-22", status: "1", remark: "", platform: "temu" },
    ],
    customer: [
      { id: 1, customerName: "Temu Official", country: "美国", contactEmail: "buyer@temu.com", contactPhone: "+1-555-0202", source: "平台对接", createTime: "2026-03-01", status: "1", remark: "平台买手" },
      { id: 2, customerName: "Sarah Johnson", country: "加拿大", contactEmail: "sarah@example.com", contactPhone: "+1-416-7890", source: "Temu站内", createTime: "2026-02-20", status: "2", remark: "" },
    ],
    order: [
      { id: 1, orderNo: "TEMU-2026030201", customerName: "Temu Official", productName: "收纳盒套装", quantity: "1000", amount: "6990", createTime: "2026-03-02", status: "1", remark: "大批量" },
      { id: 2, orderNo: "TEMU-2026022601", customerName: "Sarah Johnson", productName: "化妆刷套装", quantity: "300", amount: "2997", createTime: "2026-02-26", status: "2", remark: "" },
    ],
    logistics: [
      { id: 1, trackingNo: "YT2026030201", orderNo: "TEMU-2026030201", carrier: "云途物流", destination: "美国", weight: "500", shippingFee: "4500", createTime: "2026-03-03", status: "1", remark: "海运" },
    ],
  },
  aliexpress: {
    selection: [
      { id: 1, productName: "智能手表", category: "电子产品", supplier: "深圳智能", costPrice: "80", sellPrice: "49.99", profitRate: "30", createTime: "2026-03-01", status: "1", remark: "多功能", platform: "aliexpress" },
      { id: 2, productName: "汽车配件", category: "汽配", supplier: "广州汽配", costPrice: "25", sellPrice: "19.99", profitRate: "33", createTime: "2026-02-18", status: "2", remark: "", platform: "aliexpress" },
    ],
    customer: [
      { id: 1, customerName: "Ahmed Ali", country: "沙特", contactEmail: "ahmed@example.com", contactPhone: "+966-50-1234", source: "速卖通站内", createTime: "2026-02-28", status: "1", remark: "中东客户" },
      { id: 2, customerName: "Maria Garcia", country: "西班牙", contactEmail: "maria@example.com", contactPhone: "+34-91-5678", source: "Google广告", createTime: "2026-02-15", status: "2", remark: "" },
    ],
    order: [
      { id: 1, orderNo: "AE-2026030101", customerName: "Ahmed Ali", productName: "智能手表", quantity: "50", amount: "2499.50", createTime: "2026-03-01", status: "1", remark: "" },
    ],
    logistics: [
      { id: 1, trackingNo: "CNE2026030101", orderNo: "AE-2026030101", carrier: "菜鸟国际", destination: "沙特", weight: "25", shippingFee: "800", createTime: "2026-03-02", status: "1", remark: "标准物流" },
    ],
  }
};

// 各模块状态选项
const statusOptionsMap = {
  selection: [
    { label: "调研中", value: "1" }, { label: "已选定", value: "2" }, { label: "已上架", value: "3" }, { label: "已淘汰", value: "4" },
  ],
  customer: [
    { label: "待跟进", value: "1" }, { label: "已成交", value: "2" }, { label: "已流失", value: "3" },
  ],
  order: [
    { label: "待付款", value: "1" }, { label: "已付款", value: "2" }, { label: "已发货", value: "3" }, { label: "已完成", value: "4" },
  ],
  logistics: [
    { label: "待发货", value: "1" }, { label: "运输中", value: "2" }, { label: "已签收", value: "3" }, { label: "异常", value: "4" },
  ],
};

export default {
  name: "ForeignTrade",
  components: { Search, Plus, Edit, Delete, Refresh, ChatDotRound, View },
  data() {
    return {
      activeTab: "amazon",
      activeModule: "selection",
      newsData: [],
      newsLoading: false,
      allData: JSON.parse(JSON.stringify(mockData)),
      loading: false,
      searchKeyword: "",
      filterStatus: "",
      filterDateRange: null,
      currentPage: 1,
      pageSize: 20,
      dialogVisible: false,
      isEdit: false,
      nextId: 100,
      form: {},
      // 店铺管理
      shopList: [],
      shopLoading: false,
      shopDialogVisible: false,
      isEditShop: false,
      shopForm: {
        id: undefined,
        name: '',
        platform: '',
        account: '',
        password: '',
        shop_url: '',
        status: '正常',
        remark: '',
        sales_count: 0,
        sales_amount: 0
      },
      shopChart: null,
      // 单位换算
      converterTab: "lengthWeight",
      lengthValues: {},
      weightValues: {},
      areaValues: {},
      volumeValues: {},
      exchangeValues: { CNY: 1 },
      quickAmounts: [1, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000],
      currencies: [
        { code: "CNY", name: "人民币", symbol: "¥", flag: "🇨🇳", rate: 1 },
        { code: "USD", name: "美元", symbol: "$", flag: "🇺🇸", rate: 6.8829 },
        { code: "GBP", name: "英镑", symbol: "£", flag: "🇬🇧", rate: 9.1594 },
        { code: "EUR", name: "欧元", symbol: "€", flag: "🇪🇺", rate: 7.9106 },
        { code: "JPY", name: "日元", symbol: "¥", flag: "🇯🇵", rate: 0.0432 },
        { code: "AUD", name: "澳大利亚元", symbol: "$A.", flag: "🇦🇺", rate: 4.8765 },
        { code: "CAD", name: "加元", symbol: "Can.$", flag: "🇨🇦", rate: 5.0303 },
        { code: "HKD", name: "港币", symbol: "HK$", flag: "🇭🇰", rate: 0.8789 },
        { code: "SGD", name: "新加坡元", symbol: "S.$", flag: "🇸🇬", rate: 5.3845 },
      ],
      lengthUnits: {
        common: [
          { key: "cm", label: "厘米(cm)", toMeter: 0.01 },
          { key: "in", label: "英寸(in)", toMeter: 0.0254 },
          { key: "m", label: "米(m)", toMeter: 1 },
          { key: "ft", label: "英尺(ft)", toMeter: 0.3048 },
          { key: "km", label: "公里(km)", toMeter: 1000 },
        ],
        uncommon: [
          { key: "mm", label: "毫米(mm)", toMeter: 0.001 },
          { key: "um", label: "微米(μm)", toMeter: 0.000001 },
          { key: "li", label: "里", toMeter: 500 },
          { key: "zhang", label: "丈", toMeter: 3.333 },
          { key: "chi", label: "尺", toMeter: 0.333 },
          { key: "cun", label: "寸", toMeter: 0.0333 },
          { key: "fen", label: "分", toMeter: 0.00333 },
          { key: "li2", label: "厘", toMeter: 0.000333 },
          { key: "mi", label: "英里(mi)", toMeter: 1609.344 },
          { key: "fur", label: "弗隆(fur)", toMeter: 201.168 },
          { key: "dm", label: "分米(dm)", toMeter: 0.1 },
        ],
      },
      weightUnits: {
        common: [
          { key: "kg", label: "公斤(kg)", toKg: 1 },
          { key: "oz", label: "盎司(oz)", toKg: 0.0283495 },
          { key: "g", label: "克(g)", toKg: 0.001 },
          { key: "lb", label: "磅(lb)", toKg: 0.453592 },
          { key: "ton", label: "吨", toKg: 1000 },
        ],
        uncommon: [
          { key: "shijin", label: "市斤", toKg: 0.5 },
          { key: "dan", label: "担", toKg: 50 },
          { key: "liang", label: "两", toKg: 0.05 },
          { key: "qian", label: "钱", toKg: 0.005 },
          { key: "troy_lb", label: "金衡磅", toKg: 0.373242 },
          { key: "troy_oz", label: "金衡盎司", toKg: 0.0311035 },
          { key: "dwt", label: "英钱(dwt)", toKg: 0.00155517 },
          { key: "grain", label: "金衡格令", toKg: 0.0000648 },
          { key: "long_ton", label: "(英制)长吨", toKg: 1016.05 },
          { key: "short_ton", label: "(美制)短吨", toKg: 907.185 },
          { key: "cwt", label: "英担(cwt)", toKg: 50.8023 },
        ],
      },
      areaUnits: [
        { key: "km2", label: "平方公里(km²)", toM2: 1000000 },
        { key: "ha", label: "公顷(ha)", toM2: 10000 },
        { key: "mu", label: "市亩", toM2: 666.667 },
        { key: "m2", label: "平方米(m²)", toM2: 1 },
        { key: "dm2", label: "平方分米(dm²)", toM2: 0.01 },
        { key: "cm2", label: "平方厘米(cm²)", toM2: 0.0001 },
        { key: "mm2", label: "平方毫米(mm²)", toM2: 0.000001 },
        { key: "sq_mi", label: "平方英里(sq mi)", toM2: 2589988.11 },
        { key: "acre", label: "英亩", toM2: 4046.86 },
        { key: "sq_rd", label: "平方竿(sq rd)", toM2: 25.2929 },
        { key: "sq_yd", label: "平方码(sq yd)", toM2: 0.836127 },
      ],
      volumeUnits: [
        { key: "m3", label: "立方米(m³)", toM3: 1 },
        { key: "hl", label: "公石(hl)", toM3: 0.1 },
        { key: "dal", label: "十升(dal)", toM3: 0.01 },
        { key: "l", label: "立方分米(dm³)=升(l)", toM3: 0.001 },
        { key: "dl", label: "分升(dl)", toM3: 0.0001 },
        { key: "cl", label: "厘升(cl)", toM3: 0.00001 },
        { key: "ml", label: "立方厘米(cm³)=毫升(ml)", toM3: 0.000001 },
        { key: "mm3", label: "立方毫米(mm³)", toM3: 0.000000001 },
        { key: "barrel", label: "桶", toM3: 0.158987 },
        { key: "bu", label: "蒲式耳(bu)", toM3: 0.0352391 },
        { key: "pk", label: "配克(pk)", toM3: 0.00880977 },
        { key: "qt", label: "夸脱(qt)", toM3: 0.000946353 },
      ],
    };
  },
  computed: {
    tableHeight() { return "calc(100vh - 270px)"; },
    currentStatusOptions() { return statusOptionsMap[this.activeModule] || []; },
    tableData() {
      return this.allData[this.activeTab]?.[this.activeModule] || [];
    },
    filteredData() {
      let data = [...this.tableData];
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.trim().toLowerCase();
        data = data.filter((item) => Object.values(item).some((v) => typeof v === "string" && v.toLowerCase().includes(kw)));
      }
      if (this.filterStatus) {
        data = data.filter((item) => item.status === this.filterStatus);
      }
      if (this.filterDateRange && this.filterDateRange.length === 2) {
        const [start, end] = this.filterDateRange;
        data = data.filter((item) => item.createTime >= start && item.createTime <= end);
      }
      return data;
    },
    total() { return this.filteredData.length; },
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 300);
    this.loadShopList();
  },
  mounted() {
    this.$nextTick(() => {
      this.initShopChart();
    });
  },
  beforeUnmount() {
    this.debouncedSearch?.cancel();
    if (this.shopChart) {
      this.shopChart.dispose();
      this.shopChart = null;
    }
  },
  methods: {
    // 店铺管理方法
    async loadShopList() {
      this.shopLoading = true;
      try {
        const res = await request.post('http://localhost:8000/api/foreigntradeshop/get', {
          page: 1,
          pageNum: 1000,
          conditions: {},
          orderBy: { column: "id", type: "desc" }
        });
        if (res.code === 200 && res.result) {
          this.shopList = res.result.list || [];
          this.$nextTick(() => {
            this.updateShopChart();
          });
        }
      } catch (error) {
        console.error('获取店铺列表失败:', error);
      } finally {
        this.shopLoading = false;
      }
    },
    openShopDialog() {
      this.isEditShop = false;
      this.shopForm = {
        id: undefined,
        name: '',
        platform: '',
        account: '',
        password: '',
        shop_url: '',
        status: '正常',
        remark: '',
        sales_count: 0,
        sales_amount: 0
      };
      this.shopDialogVisible = true;
    },
    editShop(row) {
      this.isEditShop = true;
      this.shopForm = { ...row };
      this.shopDialogVisible = true;
    },
    async handleShopSubmit() {
      if (!this.shopForm.name) {
        this.$message.warning('请输入店铺名称');
        return;
      }
      try {
        const url = this.isEditShop ? 'http://localhost:8000/api/foreigntradeshop/update' : 'http://localhost:8000/api/foreigntradeshop/add';
        const res = await request.post(url, this.shopForm);
        if (res.code === 200) {
          this.$message.success(this.isEditShop ? '更新成功' : '添加成功');
          this.shopDialogVisible = false;
          this.loadShopList();
        } else {
          this.$message.error(res.message || '保存失败');
        }
      } catch (error) {
        console.error('保存店铺失败:', error);
        this.$message.error('保存失败');
      }
    },
    async deleteShop(row) {
      try {
        await this.$confirm('确定要删除该店铺吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        const res = await request.post('http://localhost:8000/api/foreigntradeshop/delete', { id: row.id });
        if (res.code === 200) {
          this.$message.success('删除成功');
          this.loadShopList();
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除失败');
        }
      }
    },
    // 初始化店铺销售额图表
    initShopChart() {
      if (!this.$refs.shopChartRef) return;
      this.shopChart = echarts.init(this.$refs.shopChartRef);
      this.updateShopChart();
      window.addEventListener('resize', this.handleChartResize);
    },
    updateShopChart() {
      if (!this.shopChart) return;
      const data = this.shopList.filter(item => item.sales_amount > 0);
      const names = data.map(item => item.name);
      const amounts = data.map(item => item.sales_amount);
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: names,
          axisLabel: {
            rotate: 30,
            fontSize: 11
          }
        },
        yAxis: {
          type: 'value',
          name: '销售额'
        },
        series: [{
          name: '销售额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ])
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#2378f7' },
                { offset: 0.7, color: '#2378f7' },
                { offset: 1, color: '#83bff6' }
              ])
            }
          }
        }]
      };
      this.shopChart.setOption(option);
    },
    handleChartResize() {
      if (this.shopChart) {
        this.shopChart.resize();
      }
    },
    handleTabChange() {
      this.resetFilters();
      if (this.activeTab === 'news' && this.newsData.length === 0) {
        this.fetchNewsData();
      }
    },
    handleModuleChange() { this.resetFilters(); },
    async fetchNewsData() {
      this.newsLoading = true;
      try {
        // TODO: Replace with actual API endpoint
        // const response = await fetch('/api/scrape-news');
        // this.newsData = await response.json();

        // Mock data based on actual wearesellers.com structure
        this.newsData = [
          {
            id: 117122,
            title: "多智能体 · 企业元年：如何在AI与OpenClaw的持续狂热中保持理性？AI将如何影响甚至取代现有工作？",
            link: "https://www.wearesellers.com/question/117122",
            author: "管理员大V",
            avatar: "https://wearesellers.oss-cn-shenzhen.aliyuncs.com/avatar/000/01/49/85_avatar_max.jpg",
            tags: ["社区指南"],
            replies: 1,
            views: 693,
            time: "23 小时前",
            isHot: true
          },
          {
            id: 115629,
            title: "本周五，共同探讨聚焦：AI员工、Rufus推荐流量、合规获评、SPV转化核心、美国5H严查、税务新风向......",
            link: "https://www.wearesellers.com/question/115629",
            author: "管理员大V",
            avatar: "https://wearesellers.oss-cn-shenzhen.aliyuncs.com/avatar/000/01/49/85_avatar_max.jpg",
            tags: ["社区指南"],
            replies: 3,
            views: 16428,
            time: "2026-03-07 10:12",
            isHot: true
          },
          {
            id: 103592,
            title: "发布帖子赢众多好礼，72 小时分级定奖 + 动态倍率计酬，奖励可累积自由兑换，让优质知识分享收获匹配价值",
            link: "https://www.wearesellers.com/question/103592",
            author: "管理员小知",
            avatar: "https://wearesellers.oss-cn-shenzhen.aliyuncs.com/avatar/000/00/00/01_avatar_max.jpg",
            tags: ["社区指南"],
            replies: 12,
            views: 6586,
            time: "7 小时前",
            isHot: true
          },
          {
            id: 117049,
            title: "​我做了大件板式家具3年，作为坚持白帽的家具卖家，面对同行刷评占位、退货标识异常，是否真要放弃熟悉领域转型小件？我的困境究竟该如何破局？",
            link: "https://www.wearesellers.com/question/117049",
            author: "南城旧事",
            avatar: "https://wearesellers.oss-cn-shenzhen.aliyuncs.com/avatar/000/24/21/53_avatar_max.jpg",
            tags: ["Amazon"],
            replies: 27,
            views: 3114,
            time: "1 小时前",
            isHot: true
          },
          {
            id: 117124,
            title: "# 运营案例分析 # 跨境小白盲打乱打关键词自然位，广告预算被几个小词锁死，降预算就掉排名，该如何打破这种僵局并有效进攻大词来提升自然流量？",
            link: "https://www.wearesellers.com/question/117124",
            author: "回家回家",
            avatar: "https://wearesellers.oss-cn-shenzhen.aliyuncs.com/avatar/000/30/10/99_avatar_max.jpg",
            tags: ["Amazon"],
            replies: 12,
            views: 1183,
            time: "8 分钟前",
            isHot: true
          },
          {
            id: 117081,
            title: "抛开产品供应链，亚马逊运营本身靠什么吃饭？",
            link: "https://www.wearesellers.com/question/117081",
            author: "王牌飞行员",
            avatar: "https://wearesellers.oss-cn-shenzhen.aliyuncs.com/common/avatar-max-img.png",
            tags: ["Amazon"],
            replies: 36,
            views: 4454,
            time: "29 分钟前",
            isHot: true
          },
          {
            id: 117134,
            title: "亚马逊广告第三弹-被你忽略但很重要的数据：广告跳出率",
            link: "https://www.wearesellers.com/question/117134",
            author: "撕磕贝索斯",
            avatar: "https://wearesellers.oss-cn-shenzhen.aliyuncs.com/avatar/000/10/41/79_avatar_max.jpg",
            tags: ["Amazon"],
            replies: 3,
            views: 1091,
            time: "5 小时前",
            isHot: true
          },
          {
            id: 117065,
            title: "# 运营案例分析 # 亚马逊美国站红海类目，ABA前100，头部产品，预算烧不完，CPC高，为什么呢？",
            link: "https://www.wearesellers.com/question/117065",
            author: "阿猪米德",
            avatar: "https://wearesellers.oss-cn-shenzhen.aliyuncs.com/common/avatar-max-img.png",
            tags: ["Amazon"],
            replies: 10,
            views: 1812,
            time: "2 小时前",
            isHot: true
          }
        ];
      } catch (error) {
        console.error('Failed to fetch news:', error);
        this.$message.error('获取资讯失败');
      } finally {
        this.newsLoading = false;
      }
    },
    resetFilters() {
      this.searchKeyword = "";
      this.filterStatus = "";
      this.filterDateRange = null;
      this.currentPage = 1;
    },
    handleSearch() { this.currentPage = 1; },
    showAddDialog() {
      this.isEdit = false;
      this.form = { status: "1", remark: "" };
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.isEdit = true;
      this.form = { ...row };
      this.dialogVisible = true;
    },
    handleSubmit() {
      if (this.isEdit) {
        const list = this.allData[this.activeTab][this.activeModule];
        const idx = list.findIndex((item) => item.id === this.form.id);
        if (idx !== -1) list.splice(idx, 1, { ...this.form });
        this.$message.success("更新成功");
      } else {
        this.form.id = this.nextId++;
        this.form.createTime = new Date().toISOString().slice(0, 10);
        this.allData[this.activeTab][this.activeModule].unshift({ ...this.form });
        this.$message.success("新增成功");
      }
      this.dialogVisible = false;
    },
    handleDelete(row) {
      this.$confirm("确认删除该记录吗？", "提示", { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" })
        .then(() => {
          const list = this.allData[this.activeTab][this.activeModule];
          const idx = list.findIndex((item) => item.id === row.id);
          if (idx !== -1) list.splice(idx, 1);
          this.$message.success("删除成功");
        }).catch(() => {});
    },
    handleSizeChange(val) { this.pageSize = val; this.currentPage = 1; },
    handleCurrentChange(val) { this.currentPage = val; },
    resetForm() { this.form = { status: "1", remark: "" }; },
    getStatusLabel(status) {
      const opt = this.currentStatusOptions.find((o) => o.value === status);
      return opt ? opt.label : "未知";
    },
    getStatusTagType(status) {
      const map = { "1": "warning", "2": "primary", "3": "success", "4": "info" };
      return map[status] || "info";
    },
    // 单位换算方法
    convertLength(sourceKey) {
      const value = parseFloat(this.lengthValues[sourceKey]);
      if (isNaN(value)) {
        this.resetLength();
        return;
      }
      const allUnits = [...this.lengthUnits.common, ...this.lengthUnits.uncommon];
      const sourceUnit = allUnits.find(u => u.key === sourceKey);
      const meters = value * sourceUnit.toMeter;
      allUnits.forEach(unit => {
        if (unit.key !== sourceKey) {
          this.lengthValues[unit.key] = (meters / unit.toMeter).toFixed(8).replace(/\.?0+$/, '');
        }
      });
    },
    convertWeight(sourceKey) {
      const value = parseFloat(this.weightValues[sourceKey]);
      if (isNaN(value)) {
        this.resetWeight();
        return;
      }
      const allUnits = [...this.weightUnits.common, ...this.weightUnits.uncommon];
      const sourceUnit = allUnits.find(u => u.key === sourceKey);
      const kg = value * sourceUnit.toKg;
      allUnits.forEach(unit => {
        if (unit.key !== sourceKey) {
          this.weightValues[unit.key] = (kg / unit.toKg).toFixed(8).replace(/\.?0+$/, '');
        }
      });
    },
    convertArea(sourceKey) {
      const value = parseFloat(this.areaValues[sourceKey]);
      if (isNaN(value)) {
        this.resetArea();
        return;
      }
      const sourceUnit = this.areaUnits.find(u => u.key === sourceKey);
      const m2 = value * sourceUnit.toM2;
      this.areaUnits.forEach(unit => {
        if (unit.key !== sourceKey) {
          this.areaValues[unit.key] = (m2 / unit.toM2).toFixed(8).replace(/\.?0+$/, '');
        }
      });
    },
    convertVolume(sourceKey) {
      const value = parseFloat(this.volumeValues[sourceKey]);
      if (isNaN(value)) {
        this.resetVolume();
        return;
      }
      const sourceUnit = this.volumeUnits.find(u => u.key === sourceKey);
      const m3 = value * sourceUnit.toM3;
      this.volumeUnits.forEach(unit => {
        if (unit.key !== sourceKey) {
          this.volumeValues[unit.key] = (m3 / unit.toM3).toFixed(8).replace(/\.?0+$/, '');
        }
      });
    },
    resetLength() {
      this.lengthValues = {};
    },
    resetWeight() {
      this.weightValues = {};
    },
    resetArea() {
      this.areaValues = {};
    },
    resetVolume() {
      this.volumeValues = {};
    },
    // 汇率换算
    convertExchange(sourceCode) {
      const value = parseFloat(this.exchangeValues[sourceCode]);
      if (isNaN(value)) {
        this.resetExchange();
        return;
      }
      const sourceCurrency = this.currencies.find(c => c.code === sourceCode);
      const cnyValue = value * sourceCurrency.rate;

      this.currencies.forEach(currency => {
        if (currency.code !== sourceCode) {
          this.exchangeValues[currency.code] = (cnyValue / currency.rate).toFixed(3);
        }
      });
    },
    setQuickAmount(amount) {
      this.exchangeValues.CNY = amount;
      this.convertExchange('CNY');
    },
    resetExchange() {
      this.exchangeValues = { CNY: 1 };
      this.currencies.forEach(currency => {
        if (currency.code !== 'CNY') {
          this.exchangeValues[currency.code] = '';
        }
      });
    },
  },
};
</script>

<style scoped>
  /* Claude Design System - Colors */
  :root {
    --claude-primary: #cc785c;
    --claude-primary-active: #a9583e;
    --claude-primary-disabled: #e6dfd8;
    --claude-ink: #141413;
    --claude-body: #3d3d3a;
    --claude-body-strong: #252523;
    --claude-muted: #6c6a64;
    --claude-muted-soft: #8e8b82;
    --claude-hairline: #e6dfd8;
    --claude-hairline-soft: #ebe6df;
    --claude-canvas: #faf9f5;
    --claude-surface-soft: #f5f0e8;
    --claude-surface-card: #efe9de;
    --claude-surface-cream-strong: #e8e0d2;
    --claude-success: #5db872;
    --claude-error: #c64545;
  }

.solicit-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

/* 顶部内容区域 - 左右两列布局 */
.top-content {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  height: 350px;
}

/* 左侧店铺列表 */
.shop-section {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-bottom: 1px solid #e8e4df;
  padding: 16px;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
}

.shop-title {
  font-size: 16px;
  font-weight: 600;
  color: #6b6560;
  border-left: 4px solid #8b9a6d;
  padding-left: 8px;
}

/* 右侧图表区域 */
.chart-section {
  width: 450px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #e8e4df;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #6b6560;
  margin-bottom: 10px;
  border-left: 4px solid #8b9a6d;
  padding-left: 8px;
}

.shop-chart {
  flex: 1;
  min-height: 280px;
}

.module-tabs {
  margin-bottom: 15px;
}
.tab-content {
  display: flex;
  flex-direction: column;
  flex: 1;
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

.header .el-button--primary {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  color: #fff;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.header .el-button--primary:hover {
  background-color: #7a895c;
  border-color: #7a895c;
}

.search-input {
  width: 300px;
}

.header :deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
  transition: all 0.3s;
}

.header :deep(.el-input__wrapper:hover) {
  border-color: #c4a882;
}

.header :deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
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

/* 单位换算样式 */
.converter-container {
  flex: 1;
  overflow: auto;
}

.converter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;
}

.converter-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid #e8e4df;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e8e4df;
}

.section-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #6b6560;
}

.section-subtitle {
  font-size: 16px;
  color: #8e8b82;
  font-weight: 500;
}

.converter-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.converter-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.converter-item label {
  font-size: 14px;
  color: #6b6560;
  font-weight: 500;
}

.converter-item :deep(.el-input__wrapper) {
  font-size: 16px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
}

:deep(.el-tabs--border-card) {
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-tabs--border-card > .el-tabs__header) {
  background-color: #f5f3f0;
  border-bottom: 2px solid #e8e4df;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-tabs--border-card > .el-tabs__content) {
  padding: 0;
}

/* 抽屉样式优化 */
:deep(.el-drawer) {
  background-color: #faf8f5;
}

:deep(.el-drawer__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #e8e4df;
}

:deep(.el-drawer__title) {
  color: #6b6560;
  font-weight: 500;
  font-size: 18px;
}

/* 表单输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
}

:deep(.el-textarea__inner) {
  border-radius: 10px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  box-shadow: none !important;
  color: #1a1a1a;
}

:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #c4a882 inset !important;
  border-color: #c4a882 !important;
}

:deep(.el-select .el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
}

:deep(.el-date-editor.el-input__wrapper) {
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
  box-shadow: none !important;
}

/* 弹窗样式 */
:deep(.el-dialog) {
  border-radius: 12px;
  background-color: #faf8f5;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #e8e4df;
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: #6b6560;
  font-weight: 500;
  font-size: 18px;
}

:deep(.el-dialog__body) {
  padding: 20px 24px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #e8e4df;
  padding: 16px 24px;
}

/* 汇率换算样式 */
.exchange-container {
  display: flex;
  gap: 30px;
  padding: 20px;
  height: calc(100vh - 300px);
  overflow: hidden;
}

.exchange-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
  padding-right: 10px;
}

.exchange-left::-webkit-scrollbar {
  width: 8px;
}

.exchange-left::-webkit-scrollbar-track {
  background: #f5f3f0;
  border-radius: 4px;
}

.exchange-left::-webkit-scrollbar-thumb {
  background: #c4a882;
  border-radius: 4px;
}

.exchange-left::-webkit-scrollbar-thumb:hover {
  background: #b59872;
}

.currency-row {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #fff;
  border: 2px solid #e8e4df;
  border-radius: 12px;
  transition: all 0.3s;
  flex-shrink: 0;
}

.currency-row:hover {
  border-color: #c4a882;
  box-shadow: 0 2px 8px rgba(196, 168, 130, 0.2);
}

.base-currency {
  border-color: #8b9a6d;
  background: #f5f3f0;
}

.currency-code-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: #f5f3f0;
  border-radius: 10px;
  flex-shrink: 0;
}

.code-large {
  font-size: 24px;
  font-weight: 700;
  color: #6b6560;
}

.currency-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.currency-name {
  font-size: 16px;
  font-weight: 600;
  color: #6b6560;
}

.currency-code-small {
  font-size: 13px;
  color: #8e8b82;
}

.currency-rate {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  text-align: center;
}

.currency-input {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
}

.currency-symbol {
  font-size: 20px;
  font-weight: 600;
  color: #6b6560;
  min-width: 60px;
  text-align: right;
}

.currency-input :deep(.el-input__wrapper) {
  font-size: 18px;
  font-weight: 500;
  padding: 8px 15px;
  height: 45px;
  background-color: #f5f3f0;
  border: 1px solid #e8e4df;
  border-radius: 10px;
}

.currency-input :deep(.el-input__inner) {
  text-align: left;
}

/* 资讯模块样式 */
.news-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.news-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.news-link {
  color: #1a1a1a;
  text-decoration: none;
  transition: color 0.3s;
  display: inline-flex;
  align-items: center;
}

.news-link:hover {
  color: #8b9a6d;
}
</style>
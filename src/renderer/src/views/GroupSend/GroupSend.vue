<template>
  <div class="groupsend-container">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="抖音" name="douyin">
        <div class="tab-content">
          <div class="header">
            <el-input v-model="searchKeyword" placeholder="请输入搜索关键词" class="search-input" size="large" clearable>
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="filterStatus" placeholder="发送状态" size="large" clearable style="width: 150px">
              <el-option label="全部" value="" />
              <el-option label="待发送" value="0" />
              <el-option label="已发送" value="1" />
              <el-option label="发送失败" value="2" />
            </el-select>
            <el-button type="primary" size="large" @click="showAddDialog">
              <el-icon><Plus /></el-icon>新增
            </el-button>
          </div>
          <el-table :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
            <el-table-column type="index" label="序号" width="100" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="account" label="账号" width="150" />
            <el-table-column prop="sendTime" label="发送时间" width="200" />
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :type="statusTagType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250" >
              <template #default="scope">
                <el-button type="primary"  @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
                <el-button type="danger"  @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="邮箱" name="email">
        <div class="tab-content">
          <div class="header">
            <el-input v-model="searchKeyword" placeholder="请输入搜索关键词" class="search-input" size="large" clearable>
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="filterStatus" placeholder="发送状态" size="large" clearable style="width: 150px">
              <el-option label="全部" value="" />
              <el-option label="待发送" value="0" />
              <el-option label="已发送" value="1" />
              <el-option label="发送失败" value="2" />
            </el-select>
            <el-button type="primary" size="large" @click="showAddDialog">
              <el-icon><Plus /></el-icon>新增
            </el-button>
          </div>
          <el-table :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
            <el-table-column type="index" label="序号" width="100" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="account" label="账号" width="150" />
            <el-table-column prop="sendTime" label="发送时间" width="200" />
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :type="statusTagType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250" >
              <template #default="scope">
                <el-button type="primary"  @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
                <el-button type="danger"  @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="微博" name="weibo">
        <div class="tab-content">
          <div class="header">
            <el-input v-model="searchKeyword" placeholder="请输入搜索关键词" class="search-input" size="large" clearable>
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="filterStatus" placeholder="发送状态" size="large" clearable style="width: 150px">
              <el-option label="全部" value="" />
              <el-option label="待发送" value="0" />
              <el-option label="已发送" value="1" />
              <el-option label="发送失败" value="2" />
            </el-select>
            <el-button type="primary" size="large" @click="showAddDialog">
              <el-icon><Plus /></el-icon>新增
            </el-button>
          </div>
          <el-table :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
            <el-table-column type="index" label="序号" width="100" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="account" label="账号" width="150" />
            <el-table-column prop="sendTime" label="发送时间" width="280" />
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :type="statusTagType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250" >
              <template #default="scope">
                <el-button type="primary" @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
                <el-button type="danger"  @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="小红书" name="xiaohongshu">
        <div class="tab-content">
          <div class="header">
            <el-input v-model="searchKeyword" placeholder="请输入搜索关键词" class="search-input" size="large" clearable>
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="filterStatus" placeholder="发送状态" size="large" clearable style="width: 150px">
              <el-option label="全部" value="" />
              <el-option label="待发送" value="0" />
              <el-option label="已发送" value="1" />
              <el-option label="发送失败" value="2" />
            </el-select>
            <el-button type="primary" size="large" @click="showAddDialog">
              <el-icon><Plus /></el-icon>新增
            </el-button>
          </div>
          <el-table :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
            <el-table-column type="index" label="序号" width="100" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="account" label="账号" width="150" />
            <el-table-column prop="sendTime" label="发送时间" width="180" />
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :type="statusTagType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250" >
              <template #default="scope">
                <el-button type="primary" @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
                <el-button type="danger"  @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="微信" name="wechat">
        <div class="tab-content">
          <div class="header">
            <el-input v-model="searchKeyword" placeholder="请输入搜索关键词" class="search-input" size="large" clearable>
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="filterStatus" placeholder="发送状态" size="large" clearable style="width: 150px">
              <el-option label="全部" value="" />
              <el-option label="待发送" value="0" />
              <el-option label="已发送" value="1" />
              <el-option label="发送失败" value="2" />
            </el-select>
            <el-button type="primary" size="large" @click="showAddDialog">
              <el-icon><Plus /></el-icon>新增
            </el-button>
          </div>
          <el-table :data="filteredData" v-loading="loading" stripe style="width: 100%" :height="tableHeight">
            <el-table-column type="index" label="序号" width="100" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="account" label="账号" width="150" />
            <el-table-column prop="sendTime" label="发送时间" width="180" />
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :type="statusTagType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250" >
              <template #default="scope">
                <el-button type="primary" @click="handleEdit(scope.row)"><el-icon><Edit /></el-icon>编辑</el-button>
                <el-button type="danger"  @click="handleDelete(scope.row)"><el-icon><Delete /></el-icon>删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑抽屉 -->
    <el-drawer v-model="dialogVisible" :title="isEdit ? '编辑' : '新增'" direction="rtl" size="500px" @close="resetForm">
      <el-form :model="form" label-width="80px" size="large">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入内容" />
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="form.account" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="发送时间">
          <el-date-picker v-model="form.sendTime" type="datetime" placeholder="选择发送时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待发送" value="0" />
            <el-option label="已发送" value="1" />
            <el-option label="发送失败" value="2" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script>
import { Search, Plus, Edit, Delete } from "@element-plus/icons-vue";

// 假数据
const mockData = {
  douyin: [
    { id: 3, title: "产品测评", content: "最新产品深度测评", account: "抖音号A", sendTime: "2026-03-04 15:30:00", status: "1" },
  ],
  email: [
    { id: 1, title: "月度报告", content: "尊敬的客户，以下是您的月度使用报告...", account: "[email]", sendTime: "2026-03-01 08:00:00", status: "1" },
    { id: 2, title: "促销通知", content: "限时特惠，全场商品8折起", account: "[email]", sendTime: "2026-03-05 10:00:00", status: "0" },
    { id: 3, title: "系统升级通知", content: "系统将于本周六凌晨进行升级维护", account: "[email]", sendTime: "2026-03-03 14:00:00", status: "1" },
  ],
  weibo: [
    { id: 1, title: "热点话题", content: "#春日好时光# 分享你的春日穿搭", account: "微博号A", sendTime: "2026-03-05 12:00:00", status: "1" },
    { id: 2, title: "品牌联动", content: "与@品牌B 联名款即将发售", account: "微博号A", sendTime: "2026-03-06 18:00:00", status: "0" },
    { id: 3, title: "粉丝互动", content: "转发抽奖，送出限量周边", account: "微博号B", sendTime: "2026-03-04 16:00:00", status: "2" },
  ],
  xiaohongshu: [
    { id: 1, title: "好物分享", content: "最近入手的宝藏好物，每一件都超好用", account: "小红书号A", sendTime: "2026-03-05 11:00:00", status: "1" },
    { id: 2, title: "穿搭日记", content: "一周穿搭不重样，上班族必看", account: "小红书号B", sendTime: "2026-03-06 09:00:00", status: "0" },
  ],
  wechat: [
    { id: 1, title: "公众号推文", content: "本周精选文章推荐，干货满满", account: "公众号A", sendTime: "2026-03-05 08:00:00", status: "1" },
    { id: 2, title: "社群通知", content: "本周三晚8点线上分享会，欢迎参加", account: "企业微信A", sendTime: "2026-03-07 20:00:00", status: "0" },
    { id: 3, title: "客户回访", content: "感谢您的购买，请对我们的服务进行评价", account: "企业微信B", sendTime: "2026-03-03 10:00:00", status: "1" },
  ],
};

export default {
  name: "GroupSend",
  components: { Search, Plus, Edit, Delete },
  data() {
    return {
      activeTab: "douyin",
      loading: false,
      searchKeyword: "",
      filterStatus: "",
      dialogVisible: false,
      isEdit: false,
      form: { id: null, title: "", content: "", account: "", sendTime: "", status: "0" },
    };
  },
  computed: {
    tableHeight() {
      return "calc(100vh - 230px)";
    },
    filteredData() {
      let data = mockData[this.activeTab] || [];
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.trim().toLowerCase();
        data = data.filter(item => item.title.toLowerCase().includes(kw) || item.content.toLowerCase().includes(kw));
      }
      if (this.filterStatus) {
        data = data.filter(item => item.status === this.filterStatus);
      }
      return data;
    },
  },
  methods: {
    handleTabChange() {
      this.searchKeyword = "";
      this.filterStatus = "";
    },
    statusLabel(status) {
      return { "0": "待发送", "1": "已发送", "2": "发送失败" }[status] || "未知";
    },
    statusTagType(status) {
      return { "0": "warning", "1": "success", "2": "danger" }[status] || "info";
    },
    showAddDialog() {
      this.isEdit = false;
      this.form = { id: null, title: "", content: "", account: "", sendTime: "", status: "0" };
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.isEdit = true;
      this.form = { ...row };
      this.dialogVisible = true;
    },
    handleSubmit() {
      if (!this.form.title) {
        this.$message.warning("请输入标题");
        return;
      }
      this.$message.success(this.isEdit ? "编辑成功" : "新增成功");
      this.dialogVisible = false;
    },
    handleDelete(row) {
      this.$confirm("确认删除该记录吗？", "提示", { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" })
        .then(() => this.$message.success("删除成功"))
        .catch(() => {});
    },
    resetForm() {
      this.form = { id: null, title: "", content: "", account: "", sendTime: "", status: "0" };
    },
  },
};
</script>

<style scoped>
.groupsend-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}
.tab-content {
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-self: flex-start;
}
.search-input {
  width: 300px;
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

/* 危险按钮样式 */
:deep(.el-button--danger) {
  background-color: #e8686a;
  border-color: #e8686a;
  border-radius: 10px;
}

:deep(.el-button--danger:hover) {
  background-color: #d8585a;
  border-color: #d8585a;
}

/* 搜索输入框样式 */
:deep(.el-input__wrapper) {
  background-color: #f5f3f0;
  border-radius: 10px;
  box-shadow: none !important;
  border: 1px solid #e8e4df !important;
}

:deep(.el-input__wrapper:hover) {
  border-color: #c4a882 !important;
  box-shadow: none !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #c4a882 !important;
  box-shadow: 0 0 0 2px rgba(196, 168, 130, 0.2) !important;
}
</style>
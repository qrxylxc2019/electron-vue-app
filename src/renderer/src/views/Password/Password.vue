<template>
  <div class="password-container">
    <div class="operation-bar">
      <el-input
        v-model="verifyForm.password"
        placeholder="输入主密码"
        style="width: 200px"
        clearable
        size="large"
        @input="debouncedVerifyPassword"
      />

      <el-input
        v-model="searchUrl"
        placeholder="输入URL搜索"
        style="width: 200px"
        clearable
        @input="handleSearch"
        size="large"
      />
      
      <el-button type="primary" size="large" @click="showAddDialog">
        新增密码
      </el-button>
    </div>

    <div class="content-layout">
      <!-- 左侧表格 -->
      <div class="table-container">
        <el-table :data="tableData" style="width: 100%; height: 600px;" size="large">
          <el-table-column prop="index" label="ID" width="80" />
          <el-table-column prop="url" label="url" min-width="400" show-overflow-tooltip/>
          <el-table-column prop="account" label="账号" min-width="250" show-overflow-tooltip/>
          <el-table-column label="密码" min-width="200">
            <template #default="{ row }">
              <div class="password-container-cell">
                <span v-if="showPasswords" class="password-text" :title="row.password">{{ row.password }}</span>
                <span v-else class="password-mask">******</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <div class="button-group">
                <el-button
                  type="primary"
                  size="default"
                  @click="copyAccountPassword(row)"
                  :disabled="!showPasswords"
                  >复制</el-button
                >
                <el-button
                  type="primary"
                  size="default"
                  @click="handleEdit(row)"
                  :disabled="!showPasswords"
                  >编辑</el-button
                >
                <el-button
                  type="danger"
                  size="default"
                  @click="handleDelete(row)"
                  >删除</el-button
                >
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="pagination"
          :current-page="currentPage"
          :total="total"
          background
          :page-size="pageNum"
          layout="prev, pager, next"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <el-dialog
      :title="isEdit ? '编辑密码' : '新增密码'"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form :model="form" ref="dialogFormRef" :rules="rules" label-width="80px">
        <el-form-item label="URL" prop="url">
          <el-input v-model="form.url" size="large" />
        </el-form-item>
        <el-form-item label="账号" prop="account">
          <el-input v-model="form.account" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <div style="display: flex; align-items: center;">
            <el-input v-model="form.password" :type="passwordFieldType" size="large" style="flex: 1;" />
            <el-button @click="togglePasswordVisibility" type="primary"  style="margin-left: 10px;">
              {{ passwordVisible ? '隐藏' : '显示' }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false" size="large">取消</el-button>
        <el-button type="primary" @click="handleSave" size="large">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ipcApiRoute } from "@/api/main";
import CryptoJS from "crypto-js";

export default {
  data() {
    return {
      tableData: [],
      currentPage: 1,
      pageNum: 10,
      total: 0,
      dialogVisible: false,
      isEdit: false,
      currentId: null,
      form: {
        url: "",
        account: "",
        password: "",
      },
      rules: {
        url: [{ required: true, message: "请输入URL", trigger: "blur" }],
        account: [{ required: true, message: "请输入账号", trigger: "blur" }],
        password: [{ required: true, message: "请输入密码", trigger: "blur" }],
      },
      encryptionKey: "your-secret-key-123",
      verifyDialogVisible: false,
      verifyForm: {
        password: "",
      },
      showPasswords: false,
      masterPassword: "619619", // 主密码
      searchUrl: "", // 添加搜索关键词
      debounceTimer: null,
      passwordVisible: true, // 默认显示密码
    };
  },
  computed: {
    passwordFieldType() {
      return this.passwordVisible ? "text" : "password";
    }
  },
  mounted() {
    this.getPasswordList();
    // 创建验证密码的防抖函数
    this.debouncedVerifyPassword = this.debounce(this.verifyViewPassword, 500);
  },
  methods: {
    // 防抖函数
    debounce(fn, delay) {
      return (...args) => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          fn.apply(this, args);
        }, delay);
      };
    },
    
    resetForm() {
      this.form = {
        url: "",
        account: "",
        password: "",
      };
      this.isEdit = false;
      this.currentId = null;
      this.dialogVisible = false;
    },
    handleSearch() {
      this.currentPage = 1; // 重置页码
      this.getPasswordList();
    },
    getPasswordList() {
      const params = {
        conditions: {
          url: this.searchUrl
        },
        page: this.currentPage,
        pageNum: this.pageNum,
        orderBy: {
          column: "id",
          type: "desc",
        },
      };
      console.log("params = ", params);

      this.$axios.post(`http://localhost:8000/api/password/get`, params)
        .then((res) => {
          if (res.data.code === 200) {
            this.tableData = (res.data.result?.list || []).map((item, index) => ({
              ...item,
              index: (this.currentPage - 1) * this.pageNum + index + 1,
              password: this.decryptPassword(item.password)
            }));
            this.total = res.data.result?.pagination?.total || 0;
            this.loading = false;
          } else {
            this.$message.error(res.data.message || "获取数据失败");
            this.loading = false;
          }
        })
        .catch((error) => {
          console.error("获取数据失败:", error);
          this.$message.error("获取数据失败，请稍后重试");
          this.loading = false;
        });
    },

    async encryptPassword(password) {
      try {
        return CryptoJS.AES.encrypt(password, this.encryptionKey).toString();
      } catch (error) {
        console.error("加密失败:", error);
        throw error;
      }
    },

    decryptPassword(encryptedPassword) {
      try {
        const bytes = CryptoJS.AES.decrypt(
          encryptedPassword,
          this.encryptionKey
        );
        return bytes.toString(CryptoJS.enc.Utf8);
      } catch (error) {
        console.error("解密失败:", error);
        return encryptedPassword;
      }
    },

    handleSave() {
      this.$refs.dialogFormRef.validate(async (valid) => {
        if (valid) {
          try {
            const encryptedPassword = await this.encryptPassword(
              this.form.password
            );

            const params = {
              url: this.form.url,
              account: this.form.account,
              password: encryptedPassword,
            };

            if (this.isEdit) {
              params.id = this.currentId

              this.$axios.post(`http://localhost:8000/api/password/update`, params)
              .then((res) => {
                if (res.data.code === 200) {
                  this.$message.success("更新成功");
                  this.resetForm();
                  this.getPasswordList();
                } else {
                  this.$message.error("更新失败");
                }
              })
              .catch((err) => {
                console.error("更新失败:", err);
                this.$message.error("更新失败");
              });
            } else {
              // 新增记录
              this.$axios.post(`http://localhost:8000/api/password/add`, params)
                .then((res) => {
                  if (res.data.code === 200) {
                    this.$message.success("保存成功");
                    this.resetForm();
                    this.getPasswordList();
                  } else {
                    this.$message.error("保存失败");
                  }
                })
                .catch((err) => {
                  console.error("保存失败:", err);
                  this.$message.error("保存失败");
                });
            }
          } catch (error) {
            console.error("处理过程中出错:", error);
            this.$message.error(this.isEdit ? "更新失败" : "保存失败");
          }
        }
      });
    },

    handleDelete(row) {
      this.$confirm("确认删除该密码记录?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          const params = {
            id: row.id,
          };

          this.$axios.post(`http://localhost:8000/api/password/delete`, params)
            .then((res) => {
              if (res.data.code === 200) {
                this.$message.success("删除成功");
                this.getPasswordList();
              } else {
                this.$message.error("删除失败");
              }
            })
            .catch((err) => {
              console.error("删除失败:", err);
              this.$message.error("删除失败");
            });
        })
        .catch(() => {});
    },

    handleCurrentChange(val) {
      this.currentPage = val;
      this.getPasswordList();
    },

    showAddDialog() {
      this.isEdit = false;
      this.currentId = null;
      this.form = {
        url: "",
        account: "",
        password: "",
      };
      this.dialogVisible = true;
    },
    
    handleEdit(row) {
      this.isEdit = true;
      this.currentId = row.id;
      this.form = {
        url: row.url,
        account: row.account,
        password: row.password,
      };
      this.dialogVisible = true;
    },

    verifyViewPassword() {
      if (this.verifyForm.password === this.masterPassword) {
        this.showPasswords = true;
        this.$message.success("验证成功");
      } else {
        this.showPasswords = false;
        this.$message.error("验证失败");
      }
    },

    async updatePassword() {
      try {
        // 首先获取所有密码记录
        const getAllParams = {
          action: "get",
          table: "password",
          pageNum: 999999, // 获取所有记录
        };

        const result = await this.$axios.post(`http://localhost:8000/api/password/get`, getAllParams);
        const allPasswords = result.data.result?.list || [];

        // 遍历所有密码记录并更新
        for (const record of allPasswords) {
          // 先解密当前密码
          const decryptedPassword = record.password;
          // 重新加密
          const newEncryptedPassword = await this.encryptPassword(
            decryptedPassword
          );

          // 更新数据库记录
          const updateParams = {
            action: "update",
            table: "password",
            conditions: {
              password: newEncryptedPassword,
            },
            where: {
              id: record.id,
            },
          };

          await this.$axios.post(`http://localhost:8000/api/password/operate`, updateParams);
        }

        this.$message.success("所有密码已更新完成");
        this.getPasswordList(); // 刷新列表
      } catch (error) {
        console.error("更新密码失败:", error);
        this.$message.error("更新密码失败");
      }
    },

    copyAccountPassword(row) {
      if (!this.showPasswords) {
        this.$message.warning('请先验证主密码查看密码');
        return;
      }
      
      const textToCopy = `${row.account}--${row.password}`;
      
      // 创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      
      // 选择文本并复制
      textArea.select();
      document.execCommand('copy');
      
      // 移除临时元素
      document.body.removeChild(textArea);
      
      this.$message.success('账号密码已复制到剪贴板');
    },

    togglePasswordVisibility() {
      this.passwordVisible = !this.passwordVisible;
    },
  },
  beforeUnmount() {
    // 组件销毁前清除定时器
    clearTimeout(this.debounceTimer);
  },
};
</script>

<style scoped>
.password-container {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #faf8f5;
  color: #1a1a1a;
}

.operation-bar {
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

.content-layout {
  display: flex;
  gap: 20px;
  flex: 1;
}

.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
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

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
  color: #1a1a1a;
}

:deep(.el-form-item) {
  width: 100%;
  margin-bottom: 20px;
}

:deep(.el-input) {
  width: 100%;
}

.password-container-cell {
  display: flex;
  align-items: center;
}

.password-text {
  font-size: 16px;
  color: #3d3d3a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.password-mask {
  font-size: 16px;
  color: #8e8b82;
  letter-spacing: 2px;
}

.button-group {
  display: flex;
  gap: 8px;
}
:deep(.el-table .el-table__cell) {
  z-index:0!important;
}
.el-table--border .el-table__inner-wrapper:after, .el-table--border:after, .el-table--border:before, .el-table__inner-wrapper:before{
   z-index:0!important;
}
</style>

<template>
  <div class="card-notes">
    <!-- 左侧笔记列表 -->
    <div class="notes-list">
      <el-table
        :data="notes"
        style="width: 100%"
        height="100%"
        @row-click="handleRowClick"
      >
        <el-table-column label="标题">
          <template #default="scope">
            <div class="content-cell">
              <div class="note-title" v-html="scope.row.note"></div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button
              type="danger"
              size="large"
              @click="deleteNote(scope.row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 右侧编辑器 -->
    <div class="editor-section">
      <editor
        ref="editor"
        @save="saveNote"
        :height="500"
        v-model="currentNote"
      />
      <div class="editor-actions">
        <el-button size="large" type="primary" @click="addNote"
          >新增笔记</el-button
        >
        <el-button size="large" type="primary" @click="saveNote"
          >保存</el-button
        >
      </div>
    </div>
  </div>
</template>

<script>
import { ipcApiRoute } from "@/api/main";
import Editor from "@/components/editor.vue";

export default {
  name: "CardNotes",
  components: {
    Editor,
  },
  data() {
    return {
      chapters: [],
      notes: [],
      currentChapter: null,
      currentPage: 1,
      pageNum: 20,
      total: 0,
      src: "https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg",
      loading: false,
      hasMore: true,
      currentNote: "",
      currentNoteId: null,
    };
  },
  methods: {
    addNote() {
      this.currentNote = "";
      this.currentNoteId = null;
    },
    selectChapter(chapterId) {
      this.currentChapter = chapterId;
      this.fetchNotes();
    },
    handlePageChange(page) {
      this.currentPage = page;
      this.fetchChapters();
    },
    async fetchChapters() {
      // TODO: 调用API获取章节列表
    },
    async fetchNotes(loadMore = false) {
      if (this.loading || (!loadMore && !this.hasMore)) return;
      this.loading = true;
      const params = {
        action: "get",
        table: "note",
        conditions: {},
        page: this.currentPage,
        pageNum: this.pageNum,
        orderBy: {
          column: "id",
          type: "desc",
        },
      };

      try {
        const res = await this.$ipc.invoke(
          ipcApiRoute.sqlitedbOperation,
          params
        );
        console.log("笔记 = ", res);
        if (loadMore) {
          this.notes = [...this.notes, ...res.result.list];
        } else {
          this.notes = res.result.list;
        }

        this.hasMore = res.result.list.length === this.pageNum;
        if (this.hasMore) {
          this.currentPage += 1;
        }
      } catch (error) {
        console.error("获取笔记失败", error);
      } finally {
        this.loading = false;
      }
    },
    async saveNote() {
      try {
        const params = {
          action: this.currentNoteId ? "update" : "add",
          table: "note",
          conditions: {
            note: this.$refs.editor.getContent(),
          },
        };

        if (this.currentNoteId) {
          params.where = {
            id: this.currentNoteId,
          };
        }

        await this.$ipc.invoke(ipcApiRoute.sqlitedbOperation, params);

        // 保存成功后刷新笔记列表
        this.currentPage = 1;
        await this.fetchNotes();

        this.$message({
          type: "success",
          message: "笔记保存成功",
        });
      } catch (error) {
        console.error("保存笔记失败", error);
        this.$message({
          type: "error",
          message: "保存笔记失败",
        });
      }
    },
    handleScroll(e) {
      const element = e.target;
      if (
        element.scrollHeight - element.scrollTop - element.clientHeight <
        50
      ) {
        this.fetchNotes(true);
      }
    },
    handleRowClick(row) {
      this.currentNote = row.note;
      this.currentNoteId = row.id;
    },
    async deleteNote(noteId) {
      try {
        const params = {
          action: "delete",
          table: "note",
          where: {
            id: noteId,
          },
        };

        await this.$ipc.invoke(ipcApiRoute.sqlitedbOperation, params);

        // 删除成功后刷新笔记列表
        this.currentPage = 1;
        await this.fetchNotes();

        // 显示成功提示
        this.$message({
          type: "success",
          message: "笔记删除成功",
        });

        // 如果删除的是当前正在编辑的笔记，清空编辑器
        if (this.currentNote) {
          this.currentNote = "";
        }
      } catch (error) {
        console.error("删除笔记失败", error);
        this.$message({
          type: "error",
          message: "删除笔记失败",
        });
      }
    },
  },
  created() {
    this.fetchNotes();
  },
};
</script>

<style scoped>
.card-notes {
  display: flex;
  height: 100%;
  width: 100%;
  gap: 20px;
  padding: 20px 0;
}

.notes-list {
  flex: 0 0 400px;
  height: 100%;
}

.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
}

.content-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-table__header-wrapper th) {
  background-color: #e6f3ff !important; /* 浅蓝色 */
}

:deep(.el-table__header-wrapper th:hover) {
  background-color: #e6f3ff !important;
}

:deep(.el-table__body tr) {
  cursor: pointer;
}
</style>

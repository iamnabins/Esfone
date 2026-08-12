<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { createBook, deleteBook, getBooks } from "../../api/books";
import { verifyAdminToken } from "../../api/admin";
import {
  approveSubmission,
  getSubmission,
  getSubmissions,
  rejectSubmission,
} from "../../api/submissions";
import { useAdminStore } from "../../stores/admin";
import defaultCover from "../../assets/default-cover.png";
import { useThemeStore } from "../../stores/theme";

const admin = useAdminStore();
const theme = useThemeStore();
const router = useRouter();

const books = ref([]);
const loading = ref(true);
const adminTokenInput = ref("");
const activeTab = ref("books");

const subList = ref([]);
const subLoading = ref(false);
const subPage = ref(1);
const subPerPage = ref(10);
const subTotal = ref(0);
const subStatus = ref("pending");
const tableRef = ref(null);

const form = ref({ title: "", author: "", cover: "", description: "" });
const submitting = ref(false);

onMounted(loadBooks);

async function loadBooks() {
  loading.value = true;
  try {
    const data = await getBooks();
    books.value = data.books || [];
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false;
  }
}

async function saveToken() {
  if (!adminTokenInput.value.trim()) {
    ElMessage.warning("请输入管理员口令");
    return;
  }
  admin.setToken(adminTokenInput.value);
  try {
    await verifyAdminToken();
    ElMessage.success("口令已保存");
    adminTokenInput.value = "";
  } catch {
    // 拦截器已提示错误并自动清除口令，输入框保留供修改
  }
}

async function submitBook() {
  if (!form.value.title.trim() || !form.value.author.trim()) {
    ElMessage.warning("书名和作者不能为空");
    return;
  }
  submitting.value = true;
  try {
    await createBook({
      title: form.value.title.trim(),
      author: form.value.author.trim(),
      cover: form.value.cover.trim(),
      description: form.value.description.trim(),
    });
    ElMessage.success("书籍添加成功");
    form.value = { title: "", author: "", cover: "", description: "" };
    await loadBooks();
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}

async function removeBook(book) {
  try {
    await ElMessageBox.confirm(`确定删除《${book.title}》及其全部章节吗？`, "删除书籍", {
      type: "warning",
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await deleteBook(book.id);
    ElMessage.success("已删除");
    await loadBooks();
  } catch {
    // 拦截器已提示
  }
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function statusLabel(status) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待审核";
}

async function loadSubmissions(page = 1) {
  subLoading.value = true;
  try {
    const data = await getSubmissions({
      page,
      per_page: subPerPage.value,
      status: subStatus.value,
    });
    subList.value = data.submissions || [];
    subTotal.value = data.total || 0;
    subPage.value = data.page || page;
  } catch {
    // 拦截器已提示
  } finally {
    subLoading.value = false;
  }
}

function onStatusChange() {
  subPage.value = 1;
  loadSubmissions(1);
}

async function toggleExpand(row) {
  tableRef.value?.toggleRowExpansion(row);
  if (row._detail || row._loading) return;
  row._loading = true;
  try {
    const data = await getSubmission(row.id);
    row._detail = data.submission;
  } catch {
    // 拦截器已提示
  } finally {
    row._loading = false;
  }
}

async function approveSubmissionRow(row) {
  try {
    await ElMessageBox.confirm(
      `通过后《${row.title}》将立即上架到书籍列表，确定通过吗？`,
      "通过投稿",
      {
        type: "success",
        confirmButtonText: "通过",
        cancelButtonText: "取消",
      }
    );
  } catch {
    return;
  }
  try {
    await approveSubmission(row.id);
    ElMessage.success("已通过，书籍已上架");
    await loadSubmissions(subPage.value);
  } catch {
    // 拦截器已提示
  }
}

async function rejectSubmissionRow(row) {
  try {
    await ElMessageBox.confirm(
      `确定拒绝《${row.title}》的投稿吗？拒绝后不会展示。`,
      "拒绝投稿",
      {
        type: "warning",
        confirmButtonText: "拒绝",
        cancelButtonText: "取消",
      }
    );
  } catch {
    return;
  }
  try {
    await rejectSubmission(row.id);
    ElMessage.success("已拒绝");
    await loadSubmissions(subPage.value);
  } catch {
    // 拦截器已提示
  }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">管理后台</h1>

    <div class="card">
      <div v-if="!admin.token" class="admin-gate">
        <el-input
          v-model="adminTokenInput"
          type="password"
          show-password
          placeholder="输入管理员口令以开启管理功能"
          class="token-input"
          @keyup.enter="saveToken"
        />
        <el-button type="primary" @click="saveToken">保存口令</el-button>
      </div>
      <div v-else class="admin-toolbar">
        <span class="admin-hint">管理员模式已开启</span>
        <el-button link type="primary" @click="admin.clearToken()">清除口令并退出</el-button>
      </div>
    </div>

    <el-tabs v-if="admin.token" v-model="activeTab" class="admin-tabs">
      <el-tab-pane label="书籍管理" name="books">
        <div class="card">
          <h2 class="form-title">添加新书</h2>
          <el-form label-width="70px">
            <el-form-item label="书名" required>
              <el-input v-model="form.title" placeholder="书名" maxlength="200" />
            </el-form-item>
            <el-form-item label="作者" required>
              <el-input v-model="form.author" placeholder="作者" maxlength="100" />
            </el-form-item>
            <el-form-item label="封面图">
              <el-input v-model="form.cover" placeholder="封面图片链接（可空）" maxlength="500" />
            </el-form-item>
            <el-form-item label="简介">
              <el-input v-model="form.description" type="textarea" :rows="4" placeholder="书籍简介（可空）" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="submitBook">添加书籍</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div v-loading="loading" class="card">
          <h2 class="form-title">书籍列表</h2>
          <el-empty v-if="!loading && books.length === 0" description="还没有书籍" :image-size="80" />
          <div v-for="book in books" :key="book.id" class="book-row">
            <img
              v-if="book.cover || !theme.dark"
              :src="book.cover || defaultCover"
              :alt="book.title"
              class="thumb"
            />
            <div v-else class="thumb thumb-fallback"></div>
            <div class="book-main">
              <p class="book-title">{{ book.title }}</p>
              <p class="book-sub">作者：{{ book.author }} · 共 {{ book.chapter_count }} 章</p>
              <p class="book-sub">{{ formatTime(book.created_at) }}</p>
            </div>
            <div class="book-ops">
              <el-button size="small" @click="router.push(`/book/${book.id}`)">查看</el-button>
              <el-button size="small" type="danger" plain @click="removeBook(book)">删除</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="投稿审核" name="submissions">
        <div v-loading="subLoading" class="card">
          <div class="sub-toolbar">
            <el-radio-group v-model="subStatus" @change="onStatusChange">
              <el-radio-button value="pending">待审核</el-radio-button>
              <el-radio-button value="approved">已通过</el-radio-button>
              <el-radio-button value="rejected">已拒绝</el-radio-button>
              <el-radio-button value="">全部</el-radio-button>
            </el-radio-group>
          </div>

          <el-table ref="tableRef" :data="subList" row-key="id" class="sub-table">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div v-if="row._loading" class="sub-detail-loading">加载章节内容…</div>
                <div v-else-if="row._detail" class="sub-detail">
                  <p class="sub-desc">{{ row._detail.description }}</p>
                  <div v-for="(ch, i) in row._detail.chapters" :key="i" class="sub-chapter">
                    <p class="sub-ch-title">{{ i + 1 }}. {{ ch.title }}</p>
                    <pre class="sub-ch-content">{{ ch.content }}</pre>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="书名" min-width="200">
              <template #default="{ row }">
                <el-link type="primary" :underline="false" @click="toggleExpand(row)">
                  {{ row.title }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="author" label="作者" width="130" />
            <el-table-column label="投稿人" width="130">
              <template #default="{ row }">{{ row.nickname || "—" }}</template>
            </el-table-column>
            <el-table-column label="投稿时间" width="170">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="章节数" width="90">
              <template #default="{ row }">{{ row.chapter_count }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'info' : 'warning'"
                >
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 'pending'">
                  <el-button size="small" type="success" @click="approveSubmissionRow(row)">通过</el-button>
                  <el-button size="small" type="danger" plain @click="rejectSubmissionRow(row)">拒绝</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!subLoading && subList.length === 0" description="暂无投稿" :image-size="80" />
          <div v-if="subTotal > subPerPage" class="sub-pager">
            <el-pagination
              background
              layout="prev, pager, next, total"
              :total="subTotal"
              :page-size="subPerPage"
              :current-page="subPage"
              @current-change="loadSubmissions"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.admin-gate {
  display: flex;
  gap: 12px;
}

.token-input {
  max-width: 340px;
}

.admin-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-hint {
  color: var(--text-light);
  font-size: 13px;
}

.form-title {
  margin: 0 0 16px;
  font-size: 17px;
}

.book-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.book-row:last-child {
  border-bottom: none;
}

.thumb {
  flex: none;
  width: 52px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 6px;
  background: var(--cover-bg);
}

.thumb-fallback {
  background: var(--cover-bg);
}

.book-main {
  flex: 1;
  min-width: 0;
}

.book-title {
  margin: 0 0 4px;
  font-weight: 600;
}

.book-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-light);
}

.book-ops {
  flex: none;
}

.admin-tabs {
  margin-top: 18px;
}

.sub-toolbar {
  margin-bottom: 16px;
}

.sub-table {
  width: 100%;
}

.sub-detail-loading {
  padding: 18px;
  color: var(--text-light);
}

.sub-detail {
  padding: 14px 18px 18px;
}

.sub-desc {
  margin: 0 0 16px;
  color: var(--text-light);
  white-space: pre-wrap;
}

.sub-chapter {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 12px;
  background: var(--hover-bg);
}

.sub-ch-title {
  margin: 0 0 8px;
  font-weight: 600;
}

.sub-ch-content {
  margin: 0;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  line-height: 1.7;
  color: var(--text);
}

.sub-pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>

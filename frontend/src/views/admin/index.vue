<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { createBook, deleteBook, getBooks } from "../../api/books";
import { verifyAdminToken } from "../../api/admin";
import { useAdminStore } from "../../stores/admin";
import defaultCover from "../../assets/default-cover.png";
import { useThemeStore } from "../../stores/theme";

const admin = useAdminStore();
const theme = useThemeStore();
const router = useRouter();

const books = ref([]);
const loading = ref(true);
const adminTokenInput = ref("");

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

    <div v-if="admin.token" class="card">
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
</style>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { addChapter, deleteBook, getBook } from "../../api/books";
import { verifyAdminToken } from "../../api/admin";
import { useAdminStore } from "../../stores/admin";
import defaultCover from "../../assets/default-cover.png";
import { useThemeStore } from "../../stores/theme";

const route = useRoute();
const router = useRouter();
const admin = useAdminStore();
const theme = useThemeStore();

const bookId = Number(route.params.id);
const book = ref(null);
const loading = ref(true);

const chapterTitle = ref("");
const chapterContent = ref("");
const submitting = ref(false);
const adminTokenInput = ref("");

onMounted(loadBook);

async function loadBook() {
  loading.value = true;
  try {
    const data = await getBook(bookId);
    book.value = data.book;
  } catch {
    book.value = null;
  } finally {
    loading.value = false;
  }
}

const isAdminReady = computed(() => Boolean(admin.token));

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

async function submitChapter() {
  if (!chapterTitle.value.trim() || !chapterContent.value.trim()) {
    ElMessage.warning("章节标题和正文不能为空");
    return;
  }
  submitting.value = true;
  try {
    await addChapter(bookId, {
      title: chapterTitle.value.trim(),
      content: chapterContent.value,
    });
    ElMessage.success("章节添加成功");
    chapterTitle.value = "";
    chapterContent.value = "";
    await loadBook();
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}

async function removeBook() {
  try {
    await ElMessageBox.confirm("删除后书籍及其所有章节将无法恢复，确定删除？", "删除书籍", {
      type: "warning",
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await deleteBook(bookId);
    ElMessage.success("已删除");
    router.push("/");
  } catch {
    // 拦截器已提示
  }
}

function readChapter(chapter) {
  router.push(`/read/${bookId}/${chapter.id}`);
}
</script>

<template>
  <div class="page-container">
    <div v-loading="loading" class="card">
      <template v-if="book">
        <div class="book-head">
          <div class="cover-wrap">
            <img
              v-if="book.cover || !theme.dark"
              :src="book.cover || defaultCover"
              :alt="book.title"
              class="cover"
            />
            <div v-else class="cover cover-fallback"></div>
          </div>
          <div class="book-meta">
            <h1 class="book-title">{{ book.title }}</h1>
            <p class="book-author">作者：{{ book.author }}</p>
            <p v-if="book.description" class="book-desc">{{ book.description }}</p>
            <div class="book-actions">
              <el-button v-if="isAdminReady" type="danger" plain size="small" @click="removeBook">
                删除本书
              </el-button>
            </div>
          </div>
        </div>

        <el-divider content-position="left">章节列表（共 {{ book.chapters.length }} 章）</el-divider>

        <el-empty v-if="book.chapters.length === 0" description="暂无章节" :image-size="80" />
        <div v-else class="chapter-list">
          <div v-for="chapter in book.chapters" :key="chapter.id" class="chapter-item" @click="readChapter(chapter)">
            <span class="chapter-order">第 {{ chapter.order }} 章</span>
            <span class="chapter-title">{{ chapter.title }}</span>
          </div>
        </div>

        <el-divider content-position="left">管理区域</el-divider>

        <div v-if="!isAdminReady" class="admin-gate">
          <el-input
            v-model="adminTokenInput"
            type="password"
            show-password
            placeholder="输入管理员口令以管理章节"
            class="token-input"
            @keyup.enter="saveToken"
          />
          <el-button type="primary" @click="saveToken">保存口令</el-button>
        </div>
        <div v-else class="admin-panel">
          <div class="admin-toolbar">
            <span class="admin-hint">管理员口令已生效</span>
            <el-button link type="primary" @click="admin.clearToken()">清除口令</el-button>
          </div>
          <h3 class="form-title">添加章节</h3>
          <el-input v-model="chapterTitle" placeholder="章节标题" class="field" maxlength="300" />
          <el-input v-model="chapterContent" type="textarea" :rows="8" placeholder="正文内容" class="field" />
          <el-button type="primary" :loading="submitting" @click="submitChapter">添加章节</el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.book-head {
  display: flex;
  gap: 22px;
}

.cover-wrap {
  flex: none;
  width: 160px;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  overflow: hidden;
  background: var(--cover-bg);
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-fallback {
  background: var(--cover-bg);
}

.book-meta {
  flex: 1;
  min-width: 0;
}

.book-title {
  margin: 0 0 8px;
  font-size: 24px;
}

.book-author {
  margin: 0 0 12px;
  color: var(--text-light);
}

.book-desc {
  margin: 0 0 12px;
  line-height: 1.7;
  color: var(--text-light);
  white-space: pre-wrap;
}

.book-actions {
  margin-top: 8px;
}

.chapter-list {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.chapter-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
}

.chapter-item:last-child {
  border-bottom: none;
}

.chapter-item:hover {
  background: var(--hover-bg);
}

.chapter-order {
  flex: none;
  color: var(--primary);
  font-size: 13px;
  width: 64px;
}

.chapter-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-gate {
  display: flex;
  gap: 12px;
}

.token-input {
  max-width: 320px;
}

.admin-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.admin-hint {
  color: var(--text-light);
  font-size: 13px;
}

.form-title {
  margin: 8px 0 12px;
}

.field {
  margin-bottom: 12px;
}
</style>

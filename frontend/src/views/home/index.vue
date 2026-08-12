<script setup>
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useRoute } from "vue-router";
import { getBooks } from "../../api/books";
import defaultCover from "../../assets/default-cover.png";
import { useThemeStore } from "../../stores/theme";
import ThumbIcon from "../../components/ThumbIcon.vue";

const router = useRouter();
const route = useRoute();
const theme = useThemeStore();
const books = ref([]);
const loading = ref(true);
const keyword = ref("");

async function loadBooks() {
  loading.value = true;
  keyword.value = route.query.q || "";
  try {
    const data = await getBooks(keyword.value || undefined);
    books.value = data.books || [];
  } catch {
    // 错误提示由拦截器统一处理
  } finally {
    loading.value = false;
  }
}

onMounted(loadBooks);
watch(() => route.query.q, loadBooks);

function clearSearch() {
  router.push({ path: "/" });
}

function openBook(book) {
  router.push(`/book/${book.id}`);
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">
      {{ keyword ? `搜索“${keyword}”的结果` : "全部书籍" }}
      <el-button v-if="keyword" link type="primary" class="clear-search" @click="clearSearch">
        清除搜索
      </el-button>
    </h1>

    <div v-loading="loading" class="book-grid">
      <div v-for="book in books" :key="book.id" class="book-card" @click="openBook(book)">
        <div class="cover-wrap">
          <img
            v-if="book.cover || !theme.dark"
            :src="book.cover || defaultCover"
            :alt="book.title"
            class="cover"
            loading="lazy"
          />
          <div v-else class="cover cover-fallback"></div>
        </div>
        <div class="book-info">
          <p class="book-title">{{ book.title }}</p>
          <p class="book-latest">最新章节：{{ book.latest_chapter || "暂无" }}</p>
          <p class="book-author">{{ book.author }}</p>
          <p class="book-likes">
            <ThumbIcon />
            <span>{{ book.likes || 0 }}</span>
          </p>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && books.length === 0" description="还没有书籍，去管理后台添加第一本吧" />
  </div>
</template>

<style scoped>
.clear-search {
  font-size: 14px;
  margin-left: 10px;
  vertical-align: 3px;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 28px;
}

.book-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(91, 77, 191, 0.14);
}

.cover-wrap {
  aspect-ratio: 3 / 4;
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

.book-info {
  padding: 10px 12px 14px;
}

.book-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-latest {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-author {
  margin: 0;
  font-size: 13px;
  color: var(--text-light);
}

.book-likes {
  margin: 6px 0 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-light);
}
</style>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getChapter } from "../../api/books";

const route = useRoute();
const router = useRouter();

const bookId = Number(route.params.bookId);
const chapterId = Number(route.params.chapterId);
const chapter = ref(null);
const loading = ref(true);

onMounted(loadChapter);

async function loadChapter() {
  loading.value = true;
  try {
    const data = await getChapter(chapterId);
    chapter.value = data.chapter;
  } catch {
    chapter.value = null;
  } finally {
    loading.value = false;
  }
}

function goTo(id) {
  if (id) router.push(`/read/${bookId}/${id}`);
}
</script>

<template>
  <div class="page-container reader-container">
    <div v-loading="loading" class="card">
      <template v-if="chapter">
        <div class="reader-head">
          <router-link :to="`/book/${chapter.book_id}`" class="back-link">
            ← 返回《{{ chapter.book_title }}》
          </router-link>
          <h1 class="chapter-title">{{ chapter.title }}</h1>
        </div>

        <div class="chapter-content">{{ chapter.content }}</div>

        <div class="reader-nav">
          <el-button :disabled="!chapter.prev" @click="goTo(chapter.prev?.id)">上一章</el-button>
          <el-button :disabled="!chapter.next" type="primary" @click="goTo(chapter.next?.id)">
            下一章
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.reader-container {
  max-width: 760px;
}

.reader-head {
  text-align: center;
  margin-bottom: 28px;
}

.back-link {
  display: inline-block;
  color: var(--text-light);
  font-size: 13px;
  margin-bottom: 14px;
}

.back-link:hover {
  color: var(--primary);
}

.chapter-title {
  margin: 0;
  font-size: 24px;
}

.chapter-content {
  white-space: pre-wrap;
  line-height: 1.9;
  font-size: 17px;
  color: var(--reader-text);
  font-family: "Songti SC", "Noto Serif SC", "SimSun", Georgia, serif;
  word-break: break-word;
}

.reader-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 36px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
</style>

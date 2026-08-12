<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Tickets, Top, ZoomIn, ZoomOut } from "@element-plus/icons-vue";
import { getChapter } from "../../api/books";

const route = useRoute();
const router = useRouter();

const bookId = computed(() => Number(route.params.bookId));
const chapterId = computed(() => Number(route.params.chapterId));
const chapter = ref(null);
const loading = ref(true);
const fontSize = ref(17);
const blankLine = ref(false);

const paragraphs = computed(() => {
  const content = chapter.value?.content ?? "";
  return content
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
});

function changeFontSize(delta) {
  fontSize.value = Math.min(24, Math.max(14, fontSize.value + delta));
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadChapter() {
  loading.value = true;
  window.scrollTo({ top: 0 });
  try {
    const data = await getChapter(chapterId.value);
    chapter.value = data.chapter;
  } catch {
    chapter.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(loadChapter);
// 在同一本书内切换上一章/下一章时，路由参数变化但组件会复用，需要监听并重新加载
watch([bookId, chapterId], loadChapter);

function goTo(id) {
  if (id) router.push(`/read/${bookId.value}/${id}`);
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

        <div
          class="chapter-content"
          :class="{ 'with-blank': blankLine }"
          :style="{ fontSize: fontSize + 'px' }"
        >
          <p v-for="(p, i) in paragraphs" :key="i" class="paragraph">{{ p }}</p>
        </div>

        <div class="reader-nav">
          <el-button :disabled="!chapter.prev" @click="goTo(chapter.prev?.id)">上一章</el-button>
          <el-button :disabled="!chapter.next" type="primary" @click="goTo(chapter.next?.id)">
            下一章
          </el-button>
        </div>
      </template>
    </div>

    <div class="reader-tools">
      <el-tooltip content="减小字号" placement="left">
        <el-button class="tool-btn" circle @click="changeFontSize(-1)">
          <el-icon><ZoomOut /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="增大字号" placement="left">
        <el-button class="tool-btn" circle @click="changeFontSize(1)">
          <el-icon><ZoomIn /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="段落间加空行" placement="left">
        <el-button
          class="tool-btn"
          :class="{ active: blankLine }"
          circle
          @click="blankLine = !blankLine"
        >
          <el-icon><Tickets /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="回到顶部" placement="left">
        <el-button class="tool-btn" circle @click="scrollTop">
          <el-icon><Top /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped>
.reader-container {
  max-width: 760px;
}

.reader-head {
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
  text-align: center;
}

.chapter-content {
  line-height: 1.9;
  color: var(--reader-text);
  font-family: "Songti SC", "Noto Serif SC", "SimSun", Georgia, serif;
  word-break: break-word;
}

.paragraph {
  margin: 0;
  white-space: pre-wrap;
}

.with-blank .paragraph + .paragraph {
  margin-top: 1em;
}

.reader-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 36px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.reader-tools {
  position: fixed;
  right: 16px;
  bottom: 96px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 40;
}

.tool-btn {
  width: 40px;
  height: 40px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  color: var(--text);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.tool-btn.active {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
}
</style>

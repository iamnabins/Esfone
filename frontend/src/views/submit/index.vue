<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { submitSubmission } from "../../api/submissions";
import { useAuthStore } from "../../stores/auth";
import { supabase } from "../../lib/supabase";

const router = useRouter();
const auth = useAuthStore();

const form = ref({ title: "", author: "", description: "" });
const fullText = ref("");
const parsedChapters = ref([]);
const parseHint = ref("");
const coverUrl = ref("");
const coverUploading = ref(false);
const submitting = ref(false);
const submitted = ref(false);

const MAX_CHAPTERS = 500;
const MAX_CHAPTER_CHARS = 100000;

const HEADING_RE = /^\s*(第[0-9零一二三四五六七八九十百千万两]+[章节回卷篇])(.*)$/;
const MARKDOWN_RE = /^\s*#\s+(.+)$/;

onMounted(async () => {
  if (!auth.initialized) await auth.init();
});

const loggedIn = computed(() => auth.isLoggedIn);

function parseChapters(text) {
  const lines = text.split(/\r?\n/);
  const list = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const head = line.match(HEADING_RE);
    const md = line.match(MARKDOWN_RE);
    if (head || md) {
      if (current) list.push(current);
      const title = head ? line.trim() : md ? md[1].trim() : "";
      current = { title: title || `第${list.length + 1}章`, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) list.push(current);
  if (list.length === 0 && text.trim()) {
    list.push({ title: "第一章", lines: text.trim().split(/\r?\n/) });
  }
  return list
    .map((c) => ({ title: c.title.trim(), content: c.lines.join("\n").trim() }))
    .filter((c) => c.title && c.content);
}

function doParse() {
  const text = fullText.value;
  if (!text.trim()) {
    ElMessage.warning("请先粘贴全文或上传 .txt 文件");
    return;
  }
  const chapters = parseChapters(text);
  if (chapters.length === 0) {
    parsedChapters.value = [];
    parseHint.value = "未能识别到章节内容，请检查文本格式";
    return;
  }
  if (chapters.length > MAX_CHAPTERS) {
    parsedChapters.value = [];
    parseHint.value = `章节数超过上限（${MAX_CHAPTERS} 章），请拆分后再投稿`;
    return;
  }
  const overLong = chapters.find((c) => c.content.length > MAX_CHAPTER_CHARS);
  if (overLong) {
    parsedChapters.value = [];
    parseHint.value = `《${overLong.title}》正文超过单章 ${MAX_CHAPTER_CHARS} 字上限，请拆分`;
    return;
  }
  parsedChapters.value = chapters;
  parseHint.value = "";
  ElMessage.success(`解析完成，共识别到 ${chapters.length} 章`);
}

function onTxtPick(options) {
  const file = options.file;
  if (!/\.txt$/i.test(file.name)) {
    ElMessage.warning("请选择 .txt 文本文件");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    fullText.value = String(reader.result ?? "");
    doParse();
  };
  reader.onerror = () => ElMessage.error("文件读取失败");
  reader.readAsText(file, "utf-8");
}

async function onCoverPick(options) {
  const file = options.file;
  if (!file.type.startsWith("image/")) {
    ElMessage.warning("请选择图片文件");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning("封面图不能超过 5MB");
    return;
  }
  coverUploading.value = true;
  try {
    const ext = (file.name.match(/\.\w+$/) || [""])[0].toLowerCase();
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const { error } = await supabase.storage.from("covers").upload(path, file);
    if (error) throw new Error(error.message);
    coverUrl.value = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
    ElMessage.success("封面上传成功");
  } catch (e) {
    ElMessage.error("封面上传失败：" + (e.message || "请重试"));
  } finally {
    coverUploading.value = false;
  }
}

function clearCover() {
  coverUrl.value = "";
}

async function submit() {
  if (!form.value.title.trim() || !form.value.author.trim() || !form.value.description.trim()) {
    ElMessage.warning("请填写书名、作者和书籍简介");
    return;
  }
  if (!parsedChapters.value.length) {
    ElMessage.warning("请先填写全文并解析出章节");
    return;
  }
  submitting.value = true;
  try {
    await submitSubmission({
      title: form.value.title.trim(),
      author: form.value.author.trim(),
      description: form.value.description.trim(),
      cover: coverUrl.value,
      chapters: parsedChapters.value,
    });
    submitted.value = true;
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}

function resetAll() {
  form.value = { title: "", author: "", description: "" };
  fullText.value = "";
  parsedChapters.value = [];
  parseHint.value = "";
  coverUrl.value = "";
  submitted.value = false;
}
</script>

<template>
  <div class="page-container">
    <div v-if="!loggedIn" class="card">
      <h1 class="page-title">投稿</h1>
      <p class="guest-tip">投稿功能需要登录后使用。</p>
      <el-button type="primary" @click="router.push('/auth')">去登录 / 注册</el-button>
    </div>

    <template v-else>
      <div v-if="submitted" class="card submit-success">
        <el-result
          icon="success"
          title="投稿成功，等待管理员审核"
          sub-title="审核通过后，你的作品会自动上架到书籍列表"
        >
          <template #extra>
            <el-button type="primary" @click="resetAll">再投一篇</el-button>
            <el-button @click="router.push('/')">返回首页</el-button>
          </template>
        </el-result>
      </div>

      <div v-else class="card">
        <h1 class="page-title">投稿</h1>
        <p class="page-sub">填写书籍信息并上传全文，审核通过后自动上架。</p>

        <el-form label-width="90px" class="submit-form">
          <el-form-item label="书名" required>
            <el-input v-model="form.title" placeholder="书名" maxlength="200" />
          </el-form-item>
          <el-form-item label="作者" required>
            <el-input v-model="form.author" placeholder="作者" maxlength="100" />
          </el-form-item>
          <el-form-item label="书籍简介" required>
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="4"
              placeholder="一句话介绍这本书"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="封面图">
            <div class="cover-row">
              <img v-if="coverUrl" :src="coverUrl" alt="封面预览" class="cover-preview" />
              <div v-else class="cover-preview cover-empty">暂无封面</div>
              <div class="cover-ops">
                <el-upload
                  :show-file-list="false"
                  accept="image/*"
                  :http-request="onCoverPick"
                  :disabled="coverUploading"
                >
                  <el-button :loading="coverUploading">选择图片</el-button>
                </el-upload>
                <el-button v-if="coverUrl" link type="danger" @click="clearCover">移除</el-button>
              </div>
            </div>
          </el-form-item>

          <el-divider content-position="left">全文上传</el-divider>

          <el-form-item label="粘贴全文">
            <el-input
              v-model="fullText"
              type="textarea"
              :rows="10"
              placeholder="粘贴整本小说文本，每章以「第X章 / 第X回 / 第X节 / # 标题」开头，即可自动切分章节"
            />
          </el-form-item>
          <el-form-item label="或上传文件">
            <el-upload :show-file-list="false" accept=".txt,text/plain" :http-request="onTxtPick">
              <el-button>选择 .txt 文件</el-button>
            </el-upload>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="doParse">解析章节</el-button>
          </el-form-item>

          <div v-if="parseHint" class="parse-hint">{{ parseHint }}</div>

          <div v-if="parsedChapters.length" class="parse-preview">
            <p class="parse-count">
              共识别到 <strong>{{ parsedChapters.length }}</strong> 章
            </p>
            <div class="parse-list">
              <div v-for="(ch, i) in parsedChapters" :key="i" class="parse-item">
                <span class="parse-order">{{ i + 1 }}.</span>
                <span class="parse-title">{{ ch.title }}</span>
                <span class="parse-len">{{ ch.content.length }} 字</span>
              </div>
            </div>
          </div>

          <el-form-item class="submit-row">
            <el-button type="primary" size="large" :loading="submitting" @click="submit">
              提交投稿
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-title {
  margin: 0 0 8px;
}

.page-sub {
  margin: 0 0 24px;
  color: var(--text-light);
}

.guest-tip {
  margin: 12px 0 20px;
  color: var(--text-light);
}

.submit-form {
  max-width: 720px;
}

.cover-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.cover-preview {
  width: 96px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--cover-bg);
}

.cover-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  font-size: 12px;
}

.cover-ops {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.parse-hint {
  margin: 0 0 16px;
  color: var(--danger);
}

.parse-preview {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 18px;
  background: var(--card-bg);
}

.parse-count {
  margin: 0 0 10px;
  font-weight: 600;
}

.parse-list {
  max-height: 280px;
  overflow-y: auto;
  border-top: 1px solid var(--border);
}

.parse-item {
  display: flex;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

.parse-order {
  flex: none;
  color: var(--primary);
}

.parse-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.parse-len {
  flex: none;
  color: var(--text-light);
  font-size: 12px;
}

.submit-row {
  margin-top: 8px;
}

.submit-success {
  padding: 40px 20px;
}
</style>

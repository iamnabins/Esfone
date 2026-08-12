<script setup>
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import Cropper from "cropperjs";
import { submitSubmission } from "../../api/submissions";
import { useAuthStore } from "../../stores/auth";
import { supabase } from "../../lib/supabase";

const router = useRouter();
const auth = useAuthStore();

const form = ref({ title: "", author: "", description: "" });
const fullText = ref("");
const parsedChapters = ref([]);
const parseMethodLabel = ref("");
const parseHint = ref("");
const expectedChapters = ref(null);
const coverUrl = ref("");
const coverUploading = ref(false);
const cropDialogVisible = ref(false);
const cropImageUrl = ref("");
const cropImgRef = ref(null);
let cropper = null;
const submitting = ref(false);
const submitted = ref(false);

const MAX_CHAPTERS = 500;
const MAX_CHAPTER_CHARS = 100000;

onMounted(async () => {
  if (!auth.initialized) await auth.init();
  if (!auth.isLoggedIn) {
    router.replace("/auth");
    return;
  }
});

// 停留在投稿页时退出登录，自动跳回登录页
watch(
  () => auth.isLoggedIn,
  (val) => {
    if (!val) router.replace("/auth");
  }
);

const PARSERS = [
  {
    label: "章节词（第X章/回/节/卷/篇）",
    parse: (text) =>
      splitByHeadings(
        text,
        /^\s*(第[0-9零一二三四五六七八九十百千万两]+[章节回卷篇])(.*)$/,
        (line) => line.trim()
      ),
  },
  {
    label: "Markdown 标题（#）",
    parse: (text) =>
      splitByHeadings(text, /^\s*#\s+(.+)$/, (_line, m) => m[1].trim()),
  },
  {
    label: "章节词或 Markdown 标题",
    parse: (text) =>
      splitByHeadings(
        text,
        /^\s*(?:#\s+)?(第[0-9零一二三四五六七八九十百千万两]+[章节回卷篇])(.*)$/,
        (line) => line.trim()
      ),
  },
  {
    label: "分隔线（--- / ===）",
    parse: parseBySeparator,
  },
];

function splitByHeadings(text, re, titleOf) {
  const lines = text.split(/\r?\n/);
  const list = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const m = line.match(re);
    if (m) {
      if (current) list.push(current);
      current = { title: titleOf(line, m) || `第${list.length + 1}章`, lines: [] };
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

function parseBySeparator(text) {
  const SEP_RE = /^\s*(?:-{3,}|={3,})\s*$/;
  const blocks = [];
  let current = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (SEP_RE.test(line)) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const result = [];
  blocks.forEach((block, i) => {
    const lines = block.map((s) => s.trimEnd());
    const first = lines.findIndex((l) => l.trim());
    if (first === -1) return;
    const title = lines[first].trim();
    const content = lines.slice(first + 1).join("\n").trim();
    if (title && content) result.push({ title, content });
  });
  return result;
}

function doParse() {
  const text = fullText.value;
  if (!text.trim()) {
    ElMessage.warning("请先粘贴全文或上传 .txt 文件");
    return;
  }
  const expected = expectedChapters.value ? Number(expectedChapters.value) : null;
  const candidates = PARSERS.map((p) => ({
    label: p.label,
    chapters: p.parse(text),
  })).filter((c) => c.chapters.length > 0);

  let chosen = null;
  if (expected && candidates.length) {
    for (const c of candidates) {
      const diff = Math.abs(c.chapters.length - expected);
      if (!chosen || diff < chosen.diff) {
        chosen = { ...c, diff };
      }
    }
  } else {
    chosen = candidates[0] || null;
  }

  if (!chosen) {
    parsedChapters.value = [];
    parseMethodLabel.value = "";
    parseHint.value = "未能识别到章节内容，请检查文本格式";
    return;
  }
  if (chosen.chapters.length > MAX_CHAPTERS) {
    parsedChapters.value = [];
    parseMethodLabel.value = "";
    parseHint.value = `章节数超过上限（${MAX_CHAPTERS} 章），请拆分后再投稿`;
    return;
  }
  const overLong = chosen.chapters.find((c) => c.content.length > MAX_CHAPTER_CHARS);
  if (overLong) {
    parsedChapters.value = [];
    parseMethodLabel.value = "";
    parseHint.value = `《${overLong.title}》正文超过单章 ${MAX_CHAPTER_CHARS} 字上限，请拆分`;
    return;
  }
  parsedChapters.value = chosen.chapters;
  parseMethodLabel.value = chosen.label;
  parseHint.value = "";
  const closest = expected ? "（与填写章节数最接近）" : "";
  ElMessage.success(`解析完成，共识别到 ${chosen.chapters.length} 章，按「${chosen.label}」解析${closest}`);
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
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.warning("封面图不能超过 20MB");
    return;
  }
  cropImageUrl.value = URL.createObjectURL(file);
  cropDialogVisible.value = true;
}

// 裁剪弹窗打开、DOM 挂载完成后初始化裁剪器
watch(cropDialogVisible, (visible) => {
  if (visible) {
    requestAnimationFrame(() => initCropper());
  }
});

function drawToCanvas(img, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

/** 把裁剪后的画布压缩到 500KB 以内：逐级缩小尺寸、逐步降低质量 */
async function compressCanvas(source) {
  const maxBytes = 500 * 1024;
  const sizes = [1200, 960, 760, 560, 400, 300];
  for (const maxSide of sizes) {
    const canvas = drawToCanvas(source, maxSide);
    let quality = 0.85;
    while (quality >= 0.3) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= maxBytes) return blob;
      quality -= 0.1;
    }
  }
  return await canvasToBlob(drawToCanvas(source, 240), 0.5);
}

function initCropper() {
  destroyCropper();
  const img = cropImgRef.value;
  if (!img) return;
  const start = () => {
    cropper = new Cropper(img, {
      aspectRatio: 3 / 4,
      viewMode: 1,
      dragMode: "move",
      autoCropArea: 1,
      background: false,
      checkOrientation: true,
    });
  };
  if (img.complete) {
    start();
  } else {
    img.onload = start;
  }
}

function destroyCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

function cancelCrop() {
  cropDialogVisible.value = false;
  destroyCropper();
  if (cropImageUrl.value) URL.revokeObjectURL(cropImageUrl.value);
  cropImageUrl.value = "";
}

async function confirmCrop() {
  if (!cropper) return;
  coverUploading.value = true;
  try {
    const source = cropper.getCroppedCanvas({ maxWidth: 900, maxHeight: 1200 });
    const blob = await compressCanvas(source);
    if (!blob) throw new Error("图片压缩失败");
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage
      .from("covers")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw new Error(error.message);
    coverUrl.value = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
    const sizeKB = Math.round(blob.size / 1024);
    ElMessage.success(`封面上传成功（已裁剪为 3:4，${sizeKB} KB）`);
    cancelCrop();
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
  parseMethodLabel.value = "";
  parseHint.value = "";
  expectedChapters.value = null;
  coverUrl.value = "";
  submitted.value = false;
}
</script>

<template>
  <div class="page-container">
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
                <span class="cover-tip">支持 jpg / png / webp，自动按 3:4 裁剪并压缩到 500KB 以内</span>
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
          <el-form-item label="当前本书已有章节数">
            <el-input-number v-model="expectedChapters" :min="1" :max="10000" />
            <span class="field-hint">选填。本书一共有多少章？填上后会自动选择章节数最接近的解析方式</span>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="doParse">解析章节</el-button>
          </el-form-item>

          <div v-if="parseHint" class="parse-hint">{{ parseHint }}</div>

          <div v-if="parsedChapters.length" class="parse-preview">
            <p class="parse-count">
              共识别到 <strong>{{ parsedChapters.length }}</strong> 章
            </p>
            <p v-if="parseMethodLabel" class="parse-method">解析方式：{{ parseMethodLabel }}</p>
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

    <el-dialog
      v-model="cropDialogVisible"
      title="裁剪封面（3:4）"
      width="min(560px, 92vw)"
      align-center
      :close-on-click-modal="false"
      @closed="cancelCrop"
    >
      <div class="crop-wrap">
        <img ref="cropImgRef" :src="cropImageUrl" alt="待裁剪封面" class="crop-image" />
      </div>
      <template #footer>
        <el-button :disabled="coverUploading" @click="cancelCrop">取消</el-button>
        <el-button type="primary" :loading="coverUploading" @click="confirmCrop">
          确定裁剪
        </el-button>
      </template>
    </el-dialog>
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

.cover-tip {
  color: var(--text-light);
  font-size: 12px;
}

.crop-wrap {
  max-height: 62vh;
  display: flex;
  justify-content: center;
}

.crop-image {
  display: block;
  max-width: 100%;
  max-height: 62vh;
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

.parse-method {
  margin: 0 0 10px;
  color: var(--primary);
  font-size: 13px;
}

.field-hint {
  margin-left: 12px;
  color: var(--text-light);
  font-size: 12px;
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

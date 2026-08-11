<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { createMessage, deleteMessage, getMessages } from "../../api/messages";
import { verifyAdminToken } from "../../api/admin";
import { useAdminStore } from "../../stores/admin";

const admin = useAdminStore();
const messages = ref([]);
const loading = ref(true);

const nickname = ref("");
const content = ref("");
const submitting = ref(false);
const adminTokenInput = ref("");
const expanded = ref({});
const hasMore = ref({});
const contentRefs = ref({});

onMounted(loadMessages);

async function loadMessages() {
  loading.value = true;
  try {
    const data = await getMessages();
    messages.value = data.messages || [];
    await nextTick();
    checkOverflow();
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false;
  }
}

function checkOverflow() {
  const next = {};
  for (const message of messages.value) {
    const el = contentRefs.value[message.id];
    if (el) {
      next[message.id] = el.scrollHeight > el.clientHeight + 1;
    }
  }
  hasMore.value = next;
}

function toggleMessage(id) {
  expanded.value[id] = !expanded.value[id];
}

async function submitMessage() {
  if (!content.value.trim()) {
    ElMessage.warning("留言内容不能为空");
    return;
  }
  if (content.value.trim().length > 500) {
    ElMessage.warning("留言内容不能超过 500 字");
    return;
  }
  submitting.value = true;
  try {
    await createMessage({
      nickname: nickname.value.trim(),
      content: content.value.trim(),
    });
    ElMessage.success("留言成功");
    nickname.value = "";
    content.value = "";
    await loadMessages();
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}

const canDelete = computed(() => Boolean(admin.token));

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

async function removeMessage(message) {
  try {
    await ElMessageBox.confirm("确定删除这条留言吗？", "删除留言", {
      type: "warning",
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await deleteMessage(message.id);
    ElMessage.success("已删除");
    await loadMessages();
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
  <div class="page-container message-page">
    <h1 class="page-title">留言板</h1>

    <div class="card">
      <h2 class="form-title">发表留言</h2>
      <el-input v-model="nickname" placeholder="昵称（可选）" maxlength="50" class="field" />
      <el-input
        v-model="content"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        placeholder="想说的话（500 字以内）"
        class="field"
      />
      <el-button type="primary" :loading="submitting" @click="submitMessage">发布留言</el-button>

      <el-divider />

      <div v-if="!canDelete" class="admin-gate">
        <el-input
          v-model="adminTokenInput"
          type="password"
          show-password
          placeholder="管理员口令（用于删除留言）"
          class="token-input"
          @keyup.enter="saveToken"
        />
        <el-button @click="saveToken">保存口令</el-button>
      </div>
      <div v-else class="admin-toolbar">
        <span class="admin-hint">管理员口令已生效，留言旁会显示删除按钮</span>
        <el-button link type="primary" @click="admin.clearToken()">清除口令</el-button>
      </div>
    </div>

    <div v-loading="loading">
      <el-empty v-if="!loading && messages.length === 0" description="还没有留言，来说点什么吧" />
      <div v-for="message in messages" :key="message.id" class="card message-item">
        <div class="message-head">
          <span class="message-nickname">{{ message.nickname }}</span>
          <span class="message-time">{{ formatTime(message.created_at) }}</span>
          <el-button
            v-if="canDelete"
            link
            type="danger"
            size="small"
            class="delete-btn"
            @click="removeMessage(message)"
          >
            删除
          </el-button>
        </div>
        <p
          :ref="(el) => (contentRefs[message.id] = el)"
          class="message-content"
          :class="{ expanded: expanded[message.id] }"
        >
          {{ message.content }}
        </p>
        <el-button
          v-if="hasMore[message.id]"
          link
          type="primary"
          size="small"
          class="toggle-btn"
          @click="toggleMessage(message.id)"
        >
          {{ expanded[message.id] ? "收起" : "查看全部" }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-page {
  max-width: 760px;
}

.form-title {
  margin: 0 0 14px;
  font-size: 17px;
}

.field {
  margin-bottom: 12px;
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
}

.admin-hint {
  color: var(--text-light);
  font-size: 13px;
}

.message-item {
  padding: 16px 20px;
}

.message-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.message-nickname {
  font-weight: 600;
  font-size: 15px;
}

.message-time {
  color: var(--text-light);
  font-size: 12px;
}

.delete-btn {
  margin-left: auto;
}

.message-content {
  margin: 0;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.message-content.expanded {
  -webkit-line-clamp: unset;
}

.toggle-btn {
  margin-top: 6px;
  padding: 0;
}
</style>

<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { createMessage, deleteMessage, getMessages } from "../../api/messages";
import { useAdminStore } from "../../stores/admin";

const admin = useAdminStore();
const messages = ref([]);
const loading = ref(true);

const nickname = ref("");
const content = ref("");
const submitting = ref(false);
const adminTokenInput = ref("");

onMounted(loadMessages);

async function loadMessages() {
  loading.value = true;
  try {
    const data = await getMessages();
    messages.value = data.messages || [];
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false;
  }
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

function saveToken() {
  if (!adminTokenInput.value.trim()) {
    ElMessage.warning("请输入管理员口令");
    return;
  }
  admin.setToken(adminTokenInput.value);
  adminTokenInput.value = "";
  ElMessage.success("口令已保存");
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
        <p class="message-content">{{ message.content }}</p>
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
}
</style>

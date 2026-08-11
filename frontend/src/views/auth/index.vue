<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "../../stores/auth";

const router = useRouter();
const auth = useAuthStore();

const mode = ref("login");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const nickname = ref("");
const submitting = ref(false);

onMounted(() => {
  if (auth.isLoggedIn) router.replace("/");
});

function friendlyError(message) {
  const text = String(message || "");
  if (/invalid login credentials/i.test(text)) return "邮箱或密码错误";
  if (/already registered/i.test(text)) return "该邮箱已注册";
  if (/password should be at least/i.test(text)) return "密码至少需要 6 位";
  if (/valid email/i.test(text)) return "邮箱格式不正确";
  return text || "操作失败，请稍后重试";
}

async function submit() {
  if (!email.value.trim() || !password.value) {
    ElMessage.warning("请输入邮箱和密码");
    return;
  }
  if (mode.value === "register" && password.value !== confirmPassword.value) {
    ElMessage.warning("两次输入的密码不一致");
    return;
  }
  submitting.value = true;
  try {
    if (mode.value === "login") {
      await auth.signIn({ email: email.value.trim(), password: password.value });
      ElMessage.success("登录成功");
    } else {
      await auth.signUp({
        email: email.value.trim(),
        password: password.value,
        nickname: nickname.value.trim(),
      });
      ElMessage.success("注册成功，已自动登录");
    }
    router.push("/");
  } catch (error) {
    ElMessage.error(friendlyError(error.message));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="page-container auth-page">
    <div class="card auth-card">
      <h1 class="page-title auth-title">{{ mode === "login" ? "登录" : "注册" }}</h1>

      <el-tabs v-model="mode" class="auth-tabs">
        <el-tab-pane label="登录" name="login" />
        <el-tab-pane label="注册" name="register" />
      </el-tabs>

      <el-form label-position="top" @submit.prevent>
        <el-form-item v-if="mode === 'register'" label="昵称（可选）">
          <el-input v-model="nickname" placeholder="展示用的昵称" maxlength="30" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="email" placeholder="you@example.com" type="email" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            show-password
            placeholder="至少 6 位"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item v-if="mode === 'register'" label="确认密码">
          <el-input
            v-model="confirmPassword"
            type="password"
            show-password
            placeholder="再次输入密码"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button type="primary" class="submit-btn" :loading="submitting" @click="submit">
          {{ mode === "login" ? "登录" : "注册并登录" }}
        </el-button>
      </el-form>

      <router-link to="/" class="back-home">← 返回首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  max-width: 440px;
}

.auth-card {
  padding: 28px 32px 24px;
}

.auth-title {
  text-align: center;
  margin-top: 0;
}

.auth-tabs {
  margin-bottom: 18px;
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
}

.back-home {
  display: block;
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-light);
}

.back-home:hover {
  color: var(--primary);
}
</style>

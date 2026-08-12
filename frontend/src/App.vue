<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Moon, Search, Sunny, User } from "@element-plus/icons-vue";
import { useThemeStore } from "./stores/theme";
import { useAuthStore } from "./stores/auth";

const route = useRoute();
const router = useRouter();
const theme = useThemeStore();
const auth = useAuthStore();
const searchKeyword = ref("");
const searchOpen = ref(false);
const searchInputRef = ref(null);
const announcementVisible = ref(false);
const loginDialogVisible = ref(false);

const navs = computed(() => [
  { name: "home", label: "首页", path: "/" },
  { name: "message-board", label: "留言板", path: "/message-board" },
  { name: "admin", label: "管理后台", path: "/admin" },
]);

onMounted(() => {
  auth.init();
});

function doSearch() {
  const q = searchKeyword.value.trim();
  router.push({ path: "/", query: q ? { q } : {} });
}

async function toggleSearch() {
  searchOpen.value = !searchOpen.value;
  if (searchOpen.value) {
    await nextTick();
    searchInputRef.value?.focus();
  }
}

function formatCreatedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN");
}

async function handleLogout() {
  await auth.signOut();
  ElMessage.success("已退出登录");
}

function openSubmit() {
  if (auth.isLoggedIn) {
    router.push("/submit");
  } else {
    loginDialogVisible.value = true;
  }
}

function goLogin() {
  loginDialogVisible.value = false;
  router.push("/auth");
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/" class="brand">
          <span class="brand-e">E</span>sfone
        </router-link>
        <nav class="nav-anchor">
          <router-link
            v-for="item in navs"
            :key="item.name"
            :to="item.path"
            class="nav-link"
            :class="{ active: route.path === item.path }"
          >
            {{ item.label }}
          </router-link>
          <button
            class="nav-link nav-btn"
            :class="{ active: route.path === '/submit' }"
            @click="openSubmit"
          >
            投稿
          </button>
          <button
            class="nav-link nav-btn"
            :class="{ active: announcementVisible }"
            @click="announcementVisible = true"
          >
            公告
          </button>
        </nav>
        <div class="header-right">
          <div class="search-box" :class="{ open: searchOpen }">
            <div class="search-field">
              <el-input
                v-model="searchKeyword"
                ref="searchInputRef"
                placeholder="搜索书名 / 作者"
                clearable
                @keyup.enter="doSearch"
                @clear="doSearch"
              />
            </div>
            <el-button
              class="search-toggle"
              circle
              :aria-label="searchOpen ? '收起搜索框' : '展开搜索框'"
              :title="searchOpen ? '收起搜索框' : '展开搜索框'"
              @click="toggleSearch"
            >
              <el-icon :size="18">
                <Search />
              </el-icon>
            </el-button>
          </div>
          <el-popover
            v-if="auth.isLoggedIn"
            placement="bottom"
            :width="260"
            trigger="hover"
          >
            <template #reference>
              <el-button class="user-toggle" circle :title="auth.nickname || auth.user?.email">
                <el-icon :size="18">
                  <User />
                </el-icon>
              </el-button>
            </template>
            <div class="user-info">
              <p class="user-nickname">{{ auth.nickname || "未设置昵称" }}</p>
              <p class="user-email">{{ auth.user?.email }}</p>
              <p class="user-meta">注册于 {{ formatCreatedAt(auth.user?.created_at) }}</p>
              <el-button type="danger" plain size="small" class="logout-btn" @click="handleLogout">
                退出登录
              </el-button>
            </div>
          </el-popover>
          <el-button
            v-else
            class="user-toggle"
            circle
            title="登录 / 注册"
            aria-label="登录 / 注册"
            @click="router.push('/auth')"
          >
            <el-icon :size="18">
              <User />
            </el-icon>
          </el-button>
          <el-button
            class="theme-toggle"
            circle
            :aria-label="theme.dark ? '切换到白天模式' : '切换到黑夜模式'"
            :title="theme.dark ? '切换到白天模式' : '切换到黑夜模式'"
            @click="theme.toggle()"
          >
            <el-icon :size="16">
              <Sunny v-if="theme.dark" />
              <Moon v-else />
            </el-icon>
          </el-button>
        </div>
      </div>
    </header>

    <main>
      <router-view />
    </main>

    <footer class="site-footer">
      <p>© 2026 Esfone · Made with ❤</p>
    </footer>

    <el-dialog
      v-model="announcementVisible"
      title="公告"
      width="min(520px, 92vw)"
      align-center
      class="announcement-dialog"
    >
      <div class="announcement-body">
        <p>欢迎来到 Esfone！</p>
        <p>这里是一个个人小说站：你可以自由浏览书籍、在线阅读，也可以在留言板写下想说的话。</p>
        <p>网站由站长个人维护，目前仍在持续完善中，后续会陆续带来更多书籍和功能。</p>
        <p>如果遇到问题或有任何建议，欢迎到留言板告诉我们。</p>
        <p style="margin-top: 16px; color: var(--text-light)">—— Esfone 敬上</p>
        </div>
    </el-dialog>

    <el-dialog
      v-model="loginDialogVisible"
      title="登录提示"
      width="min(420px, 92vw)"
      align-center
      class="login-dialog"
    >
      <p class="login-dialog-body">投稿功能需要登录后使用，是否前往登录？</p>
      <template #footer>
        <el-button @click="loginDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="goLogin">去登录</el-button>
      </template>
    </el-dialog>
    </div>
  </template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
}

.header-inner {
  width: 100%;
  min-height: 110px;
  display: grid;
  grid-template-columns: 1fr minmax(0, 1080px) 1fr;
  align-items: center;
}

.brand {
  justify-self: start;
  margin-left: 44px;
  color: #fff;
  font-family: Georgia, "Times New Roman", "Songti SC", serif;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: 2px;
  line-height: 1;
}

.brand-e {
  font-size: 1.35em;
  font-style: italic;
  background: linear-gradient(135deg, #ffe08a, #ff9f43);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nav-anchor {
  justify-self: start;
  display: flex;
  gap: 10px;
  padding-left: 16px;
}

.nav-anchor .nav-link {
  color: rgba(255, 255, 255, 0.82);
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 17px;
  transition: all 0.2s;
}

.nav-anchor .nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
}

.nav-anchor .nav-link.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.nav-anchor .nav-btn {
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  line-height: 1.4;
}

.header-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 28px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-field {
  position: absolute;
  right: 52px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 0;
  overflow: hidden;
  transition: width 0.25s ease;
}

.search-box.open .search-field {
  width: 200px;
}

.search-field .el-input {
  width: 100%;
  --el-input-bg-color: rgba(255, 255, 255, 0.12);
  --el-input-border-color: rgba(255, 255, 255, 0.35);
  --el-input-hover-border-color: rgba(255, 255, 255, 0.55);
  --el-input-focus-border-color: #ffffff;
  --el-input-text-color: #ffffff;
  --el-input-placeholder-color: rgba(255, 255, 255, 0.65);
  --el-input-icon-color: rgba(255, 255, 255, 0.75);
}

.search-toggle {
  flex: none;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.12);
  border-color: transparent;
  color: #fff;
}

.search-toggle:hover {
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
}

.user-toggle {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.12);
  border-color: transparent;
  color: #fff;
}

.user-toggle:hover {
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
}

.theme-toggle {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.12);
  border-color: transparent;
  color: #fff;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
}

main {
  flex: 1;
}

.site-footer {
  border-top: 1px solid var(--border);
  background: var(--card-bg);
  text-align: center;
  padding: 18px;
  color: var(--text-light);
  font-size: 13px;
}

.site-footer p {
  margin: 0;
}

@media (max-width: 1111px) {
  .header-inner {
    min-height: 88px;
    padding: 12px 14px 12px 24px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 10px 14px;
  }

  .brand {
    margin-left: 0;
  }

  .nav-anchor {
    order: 3;
    width: 100%;
    padding-left: 2px;
  }

  .header-right {
    margin-right: 0;
  }

  .search-box.open .search-field {
    width: 150px;
  }
}

@media (max-width: 720px) {
  .header-inner {
    min-height: 80px;
  }

  .brand {
    font-size: 30px;
  }

  .nav-anchor {
    gap: 6px;
  }

  .nav-anchor .nav-link {
    font-size: 15px;
    padding: 6px 12px;
  }

  .theme-toggle {
    width: 38px;
    height: 38px;
  }

  .search-box.open .search-field {
    width: 130px;
  }

  .search-toggle {
    width: 38px;
    height: 38px;
  }

  .user-toggle {
    width: 38px;
    height: 38px;
  }

}

.login-dialog-body {
  margin: 0;
  line-height: 1.9;
}
</style>

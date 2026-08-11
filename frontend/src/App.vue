<script setup>
import { useRoute } from "vue-router";
import { Moon, Sunny } from "@element-plus/icons-vue";
import { useThemeStore } from "./stores/theme";

const route = useRoute();
const theme = useThemeStore();

const navs = [
  { name: "home", label: "首页", path: "/" },
  { name: "message-board", label: "留言板", path: "/message-board" },
  { name: "admin", label: "管理后台", path: "/admin" },
];
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/" class="brand">
          <span class="brand-e">E</span>sfone
        </router-link>
        <div class="header-right">
          <nav class="nav">
            <router-link
              v-for="item in navs"
              :key="item.name"
              :to="item.path"
              class="nav-link"
              :class="{ active: route.path === item.path }"
            >
              {{ item.label }}
            </router-link>
          </nav>
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
  max-width: 1080px;
  margin: 0 auto;
  padding: 18px 24px;
  min-height: 110px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand {
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

.nav {
  display: flex;
  gap: 10px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.82);
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 17px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
}

.nav-link.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
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

@media (max-width: 720px) {
  .header-inner {
    min-height: 88px;
    padding: 12px 14px;
  }

  .brand {
    font-size: 30px;
  }

  .nav {
    gap: 6px;
  }

  .nav-link {
    font-size: 15px;
    padding: 6px 12px;
  }

  .header-right {
    gap: 10px;
  }

  .theme-toggle {
    width: 38px;
    height: 38px;
  }
}
</style>

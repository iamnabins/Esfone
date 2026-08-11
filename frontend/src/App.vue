<script setup>
import { nextTick, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Moon, Search, Sunny } from "@element-plus/icons-vue";
import { useThemeStore } from "./stores/theme";

const route = useRoute();
const router = useRouter();
const theme = useThemeStore();
const searchKeyword = ref("");
const searchOpen = ref(false);
const searchInputRef = ref(null);

const navs = [
  { name: "home", label: "首页", path: "/" },
  { name: "message-board", label: "留言板", path: "/message-board" },
  { name: "admin", label: "管理后台", path: "/admin" },
];

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
}
</style>

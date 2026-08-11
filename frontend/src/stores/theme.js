import { defineStore } from "pinia";

const STORAGE_KEY = "novel_theme";

export const useThemeStore = defineStore("theme", {
  state: () => ({
    // 初始值由 index.html 中的内联脚本根据本地存储/系统偏好提前设置
    dark: document.documentElement.classList.contains("dark"),
  }),
  actions: {
    toggle() {
      this.dark = !this.dark;
      this.apply();
    },
    apply() {
      const root = document.documentElement;
      // 切换主题时短暂开启全局过渡，让颜色渐变而非瞬间跳变
      root.classList.add("theme-transition");
      window.setTimeout(() => root.classList.remove("theme-transition"), 350);
      root.classList.toggle("dark", this.dark);
      localStorage.setItem(STORAGE_KEY, this.dark ? "dark" : "light");
    },
  },
});

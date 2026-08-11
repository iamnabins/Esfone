import { defineStore } from "pinia";

const STORAGE_KEY = "novel_admin_token";

export const useAdminStore = defineStore("admin", {
  state: () => ({
    token: localStorage.getItem(STORAGE_KEY) || "",
  }),
  actions: {
    setToken(token) {
      this.token = (token || "").trim();
      if (this.token) {
        localStorage.setItem(STORAGE_KEY, this.token);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    clearToken() {
      this.token = "";
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

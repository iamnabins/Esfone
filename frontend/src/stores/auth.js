import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    initialized: false,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.user),
    nickname: (state) => state.user?.user_metadata?.nickname || "",
  },
  actions: {
    async init() {
      try {
        // 校验当前会话是否仍然有效（过期/失效的会话会返回错误，自动清除）
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          this.user = null;
          await supabase.auth.signOut();
        } else {
          this.user = data?.user ?? null;
        }
      } catch {
        this.user = null;
      }
      supabase.auth.onAuthStateChange((_event, session) => {
        this.user = session?.user ?? null;
      });
      this.initialized = true;
    },
    async signUp({ email, password, nickname }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } },
      });
      if (error) throw new Error(error.message);
      if (data?.user) this.user = data.user;
      return data;
    },
    async signIn({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      this.user = data.user;
      return data;
    },
    async signOut() {
      await supabase.auth.signOut();
      this.user = null;
    },
  },
});

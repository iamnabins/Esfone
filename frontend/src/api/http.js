import axios from "axios";
import { ElMessage } from "element-plus";
import { useAdminStore } from "../stores/admin";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "",
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const admin = useAdminStore();
  if (admin.token) {
    config.headers["X-Admin-Token"] = admin.token;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || "网络异常，请稍后重试";
    if (status === 401) {
      useAdminStore().clearToken();
    }
    ElMessage.error(message);
    return Promise.reject(new Error(message));
  }
);

export default http;

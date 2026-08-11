import http from "./http";

export function verifyAdminToken() {
  return http.post("/api/admin/verify");
}

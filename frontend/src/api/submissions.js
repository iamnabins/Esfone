import http from "./http";
import { supabase } from "../lib/supabase";

async function withUserToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function submitSubmission(data) {
  const headers = await withUserToken();
  return http.post("/api/submissions", data, { headers });
}

export function getSubmissions(params) {
  return http.get("/api/submissions", { params });
}

export function getSubmission(id) {
  return http.get(`/api/submissions/${id}`);
}

export function approveSubmission(id) {
  return http.post(`/api/submissions/${id}/approve`);
}

export function rejectSubmission(id) {
  return http.post(`/api/submissions/${id}/reject`);
}

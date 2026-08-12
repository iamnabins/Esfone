import http from "./http";
import { supabase } from "../lib/supabase";

async function userHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getBooks(q) {
  return http.get("/api/books", { params: q ? { q } : {} });
}

export async function getBook(bookId) {
  const headers = await userHeaders();
  return http.get(`/api/books/${bookId}`, { headers });
}

export function createBook(data) {
  return http.post("/api/books", data);
}

export function deleteBook(bookId) {
  return http.delete(`/api/books/${bookId}`);
}

export function getChapter(chapterId) {
  return http.get(`/api/chapters/${chapterId}`);
}

export function addChapter(bookId, data) {
  return http.post(`/api/books/${bookId}/chapters`, data);
}

export async function likeBook(bookId) {
  const headers = await userHeaders();
  return http.post(`/api/books/${bookId}/like`, {}, { headers });
}

export async function unlikeBook(bookId) {
  const headers = await userHeaders();
  return http.delete(`/api/books/${bookId}/like`, { headers });
}

export async function favoriteBook(bookId) {
  const headers = await userHeaders();
  return http.post(`/api/books/${bookId}/favorite`, {}, { headers });
}

export async function unfavoriteBook(bookId) {
  const headers = await userHeaders();
  return http.delete(`/api/books/${bookId}/favorite`, { headers });
}

export async function getFavorites() {
  const headers = await userHeaders();
  return http.get("/api/favorites", { headers });
}

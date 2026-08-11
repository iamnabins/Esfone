import http from "./http";

export function getBooks(q) {
  return http.get("/api/books", { params: q ? { q } : {} });
}

export function getBook(bookId) {
  return http.get(`/api/books/${bookId}`);
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

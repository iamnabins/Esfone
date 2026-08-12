import http from "./http";

export function getMessages(category) {
  return http.get("/api/messages", { params: category ? { category } : {} });
}

export function createMessage(data) {
  return http.post("/api/messages", data);
}

export function deleteMessage(messageId) {
  return http.delete(`/api/messages/${messageId}`);
}

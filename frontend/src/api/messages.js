import http from "./http";

export function getMessages() {
  return http.get("/api/messages");
}

export function createMessage(data) {
  return http.post("/api/messages", data);
}

export function deleteMessage(messageId) {
  return http.delete(`/api/messages/${messageId}`);
}

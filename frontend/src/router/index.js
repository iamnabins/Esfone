import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/home/index.vue"),
  },
  {
    path: "/book/:id",
    name: "book-detail",
    component: () => import("../views/book-detail/index.vue"),
  },
  {
    path: "/read/:bookId/:chapterId",
    name: "reader",
    component: () => import("../views/reader/index.vue"),
  },
  {
    path: "/message-board",
    name: "message-board",
    component: () => import("../views/message-board/index.vue"),
  },
  {
    path: "/admin",
    name: "admin",
    component: () => import("../views/admin/index.vue"),
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;

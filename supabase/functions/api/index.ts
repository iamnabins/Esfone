// Esfone 后端 API（Supabase Edge Function 版本）
// 原 Flask 后端的云函数等价实现：路由 /api/*，返回结构与 Flask 版完全一致。

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN") ?? "";

// 数据库操作使用 service_role 密钥（仅存在于云函数环境变量中，不对外暴露）
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
// 用户令牌校验使用 anon 密钥
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const MAX_CONTENT_LENGTH = 500;
const POST_COOLDOWN_SECONDS = 30;
const MAX_SUBMISSION_CHAPTERS = 500;
const MAX_CHAPTER_CHARS = 100000;
const SUBMISSION_COOLDOWN_SECONDS = 60;

// 简易频率限制：记录每个 IP 最近一次发言时间（单实例内存，与 Flask 版行为一致）
const lastPostAt = new Map<string, number>();
const lastSubmissionAt = new Map<string, number>();

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

function serverError(error: unknown): Response {
  console.error("[api] db error:", error);
  return json({ error: "服务器内部错误" }, 500);
}

function isAdmin(req: Request): boolean {
  const token = req.headers.get("X-Admin-Token") ?? "";
  return Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN;
}

function adminRequired(req: Request): Response | null {
  return isAdmin(req)
    ? null
    : json({ error: "管理员验证失败：口令错误或未设置" }, 401);
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  if (forwarded) return forwarded.split(",")[0].trim();
  return "";
}

/** 校验登录用户令牌，返回用户信息（与 /api/auth/verify 同一套校验） */
async function requireUser(
  req: Request,
): Promise<
  | { ok: true; user: { id: string; email: string; nickname: string } }
  | { ok: false; response: Response }
> {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return { ok: false, response: json({ error: "请先登录后再投稿" }, 401) };
  }
  const token = header.slice(7).trim();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) {
    return {
      ok: false,
      response: json({ error: "访问令牌无效或已过期，请重新登录" }, 401),
    };
  }
  const meta = data.user.user_metadata ?? {};
  const email = data.user.email ?? "";
  const nickname = String(meta.nickname ?? "").trim() ||
    email.split("@")[0] ||
    "匿名用户";
  return { ok: true, user: { id: data.user.id, email, nickname } };
}

type BookRow = {
  id: number;
  title: string;
  author: string;
  cover: string | null;
  description: string | null;
  created_at: string | null;
};

type ChapterRow = {
  id: number;
  book_id: number;
  title: string;
  order: number;
};

/** 按书聚合章节，计算章节数与最新章节标题（与 Flask 的 to_summary 一致） */
async function buildBookSummaries(rows: BookRow[]): Promise<unknown[]> {
  if (!rows.length) return [];
  const ids = rows.map((b) => b.id);
  const { data: chapters, error } = await db
    .from("chapters")
    .select("id, book_id, title, order")
    .in("book_id", ids);
  if (error) throw error;

  const byBook = new Map<number, ChapterRow[]>();
  for (const c of (chapters ?? []) as ChapterRow[]) {
    const list = byBook.get(c.book_id) ?? [];
    list.push(c);
    byBook.set(c.book_id, list);
  }

  return rows.map((b) => {
    const chs = (byBook.get(b.id) ?? []).sort(
      (a, c) => a.order - c.order || a.id - c.id,
    );
    const latest = chs[chs.length - 1];
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      cover: b.cover ?? "",
      description: b.description ?? "",
      chapter_count: chs.length,
      latest_chapter: latest ? latest.title : null,
      created_at: b.created_at,
    };
  });
}

function messageToDict(m: {
  id: number;
  nickname: string | null;
  content: string;
  category: string | null;
  created_at: string | null;
}): unknown {
  return {
    id: m.id,
    nickname: (m.nickname ?? "").trim() || "匿名",
    content: m.content,
    category: m.category ?? "forum",
    created_at: m.created_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  // 兼容两种路径：平台已剥离 /functions/v1/<slug> 前缀，或保留完整路径
  let path = url.pathname.replace(/^\/functions\/v1\/[^/]+/, "") || "/";
  // 若平台只剥离了 /functions/v1 而保留 slug，会出现 /api/api/... 双前缀
  if (path.startsWith("/api/api/")) path = path.slice(4);
  if (!path.startsWith("/api")) {
    return json({ error: "接口不存在" }, 404);
  }

  // ---------- 书籍 ----------
  const listMatch = path.match(/^\/api\/books\/?$/);
  if (listMatch && req.method === "GET") {
    try {
      const q = (url.searchParams.get("q") ?? "").trim();
      let query = db.from("books").select("*");
      if (q) {
        query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%`);
      }
      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (error) return serverError(error);
      const books = await buildBookSummaries((data ?? []) as BookRow[]);
      return json({ books });
    } catch (e) {
      return serverError(e);
    }
  }

  if (listMatch && req.method === "POST") {
    const denied = adminRequired(req);
    if (denied) return denied;
    try {
      const data = await readJson(req);
      const title = String(data.title ?? "").trim();
      const author = String(data.author ?? "").trim();
      if (!title || !author) {
        return json({ error: "书名和作者不能为空" }, 400);
      }
      const { data: book, error } = await db
        .from("books")
        .insert({
          title,
          author,
          cover: String(data.cover ?? "").trim(),
          description: String(data.description ?? "").trim(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return serverError(error);
      const books = await buildBookSummaries([book as BookRow]);
      return json({ book: books[0] }, 201);
    } catch (e) {
      return serverError(e);
    }
  }

  const bookDetailMatch = path.match(/^\/api\/books\/(\d+)$/);
  if (bookDetailMatch && req.method === "GET") {
    try {
      const id = Number(bookDetailMatch[1]);
      const { data: book, error } = await db
        .from("books")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) return serverError(error);
      if (!book) return json({ error: "书籍不存在" }, 404);

      const { data: chapters, error: chErr } = await db
        .from("chapters")
        .select("id, book_id, title, order")
        .eq("book_id", id)
        .order("order", { ascending: true })
        .order("id", { ascending: true });
      if (chErr) return serverError(chErr);

      const books = await buildBookSummaries([book as BookRow]);
      const summary = books[0] as Record<string, unknown>;
      return json({
        book: {
          ...summary,
          chapters: chapters ?? [],
        },
      });
    } catch (e) {
      return serverError(e);
    }
  }

  if (bookDetailMatch && req.method === "DELETE") {
    const denied = adminRequired(req);
    if (denied) return denied;
    try {
      const id = Number(bookDetailMatch[1]);
      const { data, error } = await db
        .from("books")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) return serverError(error);
      if (!data || !data.length) return json({ error: "书籍不存在" }, 404);
      return json({ ok: true });
    } catch (e) {
      return serverError(e);
    }
  }

  const addChapterMatch = path.match(/^\/api\/books\/(\d+)\/chapters$/);
  if (addChapterMatch && req.method === "POST") {
    const denied = adminRequired(req);
    if (denied) return denied;
    try {
      const bookId = Number(addChapterMatch[1]);
      const { data: book, error: bookErr } = await db
        .from("books")
        .select("id")
        .eq("id", bookId)
        .maybeSingle();
      if (bookErr) return serverError(bookErr);
      if (!book) return json({ error: "书籍不存在" }, 404);

      const data = await readJson(req);
      const title = String(data.title ?? "").trim();
      const content = String(data.content ?? "").trim();
      if (!title || !content) {
        return json({ error: "章节标题和正文不能为空" }, 400);
      }

      const { data: maxRow } = await db
        .from("chapters")
        .select("order")
        .eq("book_id", bookId)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const maxOrder = (maxRow as { order: number } | null)?.order ?? 0;

      const { data: chapter, error } = await db
        .from("chapters")
        .insert({
          book_id: bookId,
          title,
          content,
          order: maxOrder + 1,
          created_at: new Date().toISOString(),
        })
        .select("id, book_id, title, order")
        .single();
      if (error) return serverError(error);
      return json({ chapter }, 201);
    } catch (e) {
      return serverError(e);
    }
  }

  // ---------- 章节 ----------
  const chapterMatch = path.match(/^\/api\/chapters\/(\d+)$/);
  if (chapterMatch && req.method === "GET") {
    try {
      const chapterId = Number(chapterMatch[1]);
      const { data: chapter, error } = await db
        .from("chapters")
        .select("id, book_id, title, content, order")
        .eq("id", chapterId)
        .maybeSingle();
      if (error) return serverError(error);
      if (!chapter) return json({ error: "章节不存在" }, 404);

      const { data: book } = await db
        .from("books")
        .select("title")
        .eq("id", chapter.book_id)
        .maybeSingle();

      const { data: siblings, error: sibErr } = await db
        .from("chapters")
        .select("id, title, order")
        .eq("book_id", chapter.book_id)
        .order("order", { ascending: true })
        .order("id", { ascending: true });
      if (sibErr) return serverError(sibErr);

      const list = (siblings ?? []) as { id: number; title: string }[];
      const index = list.findIndex((c) => c.id === chapterId);
      const prev = index > 0
        ? { id: list[index - 1].id, title: list[index - 1].title }
        : null;
      const next = index >= 0 && index < list.length - 1
        ? { id: list[index + 1].id, title: list[index + 1].title }
        : null;

      return json({
        chapter: {
          id: chapter.id,
          book_id: chapter.book_id,
          book_title: (book as { title: string } | null)?.title ?? "",
          title: chapter.title,
          content: chapter.content,
          order: chapter.order,
          prev,
          next,
        },
      });
    } catch (e) {
      return serverError(e);
    }
  }

  // ---------- 投稿 ----------
  const submissionsMatch = path.match(/^\/api\/submissions\/?$/);
  const approveMatch = path.match(/^\/api\/submissions\/(\d+)\/approve$/);
  const rejectMatch = path.match(/^\/api\/submissions\/(\d+)\/reject$/);
  const submissionDetailMatch = path.match(/^\/api\/submissions\/(\d+)$/);

  if (submissionsMatch && req.method === "POST") {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    try {
      const ip = clientIp(req);
      const now = Date.now() / 1000;
      const key = auth.user.id || ip;
      if (
        now - (lastSubmissionAt.get(key) ?? 0) <
        SUBMISSION_COOLDOWN_SECONDS
      ) {
        return json({ error: "投稿过于频繁，请稍后再试" }, 429);
      }
      lastSubmissionAt.set(key, now);

      const data = await readJson(req);
      const title = String(data.title ?? "").trim();
      const author = String(data.author ?? "").trim();
      const description = String(data.description ?? "").trim();
      if (!title || !author || !description) {
        return json({ error: "书名、作者和书籍简介不能为空" }, 400);
      }

      const rawChapters = Array.isArray(data.chapters) ? data.chapters : [];
      if (!rawChapters.length) {
        return json({ error: "请至少上传一个章节" }, 400);
      }
      if (rawChapters.length > MAX_SUBMISSION_CHAPTERS) {
        return json(
          { error: `单次投稿最多 ${MAX_SUBMISSION_CHAPTERS} 章` },
          400,
        );
      }

      const chapters: { title: string; content: string }[] = [];
      for (const item of rawChapters) {
        const c = (item ?? {}) as Record<string, unknown>;
        const t = String(c.title ?? "").trim();
        const content = String(c.content ?? "").trim();
        if (!t || !content) {
          return json({ error: "章节标题和正文不能为空" }, 400);
        }
        if (content.length > MAX_CHAPTER_CHARS) {
          return json(
            { error: `单章正文不能超过 ${MAX_CHAPTER_CHARS} 字` },
            400,
          );
        }
        chapters.push({ title: t, content });
      }

      const { data: row, error } = await db
        .from("submissions")
        .insert({
          title,
          author,
          description,
          cover: String(data.cover ?? "").trim(),
          user_id: auth.user.id,
          nickname: auth.user.nickname,
          chapters,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) return serverError(error);
      return json({ ok: true, id: (row as { id: number }).id }, 201);
    } catch (e) {
      return serverError(e);
    }
  }

  if (submissionsMatch && req.method === "GET") {
    const denied = adminRequired(req);
    if (denied) return denied;
    try {
      const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
      const per = Math.min(
        20,
        Math.max(1, Number(url.searchParams.get("per_page") ?? "10") || 10),
      );
      const status = (url.searchParams.get("status") ?? "").trim();
      let query = db
        .from("submissions")
        .select("id, title, author, nickname, status, created_at, chapters", {
          count: "exact",
        });
      if (status) query = query.eq("status", status);
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range((page - 1) * per, page * per - 1);
      if (error) return serverError(error);
      const rows = (data ?? []) as Array<{
        id: number;
        title: string;
        author: string;
        nickname: string | null;
        status: string;
        created_at: string | null;
        chapters: unknown[];
      }>;
      return json({
        submissions: rows.map((r) => ({
          id: r.id,
          title: r.title,
          author: r.author,
          nickname: (r.nickname ?? "").trim() || null,
          status: r.status,
          created_at: r.created_at,
          chapter_count: Array.isArray(r.chapters) ? r.chapters.length : 0,
        })),
        total: count ?? rows.length,
        page,
        per_page: per,
      });
    } catch (e) {
      return serverError(e);
    }
  }

  if (submissionDetailMatch && req.method === "GET") {
    const denied = adminRequired(req);
    if (denied) return denied;
    try {
      const id = Number(submissionDetailMatch[1]);
      const { data: sub, error } = await db
        .from("submissions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) return serverError(error);
      if (!sub) return json({ error: "投稿不存在" }, 404);
      const chapters = Array.isArray(sub.chapters) ? sub.chapters : [];
      return json({
        submission: {
          ...sub,
          chapter_count: chapters.length,
        },
      });
    } catch (e) {
      return serverError(e);
    }
  }

  if (approveMatch && req.method === "POST") {
    const denied = adminRequired(req);
    if (denied) return denied;
    try {
      const id = Number(approveMatch[1]);
      const { data: sub, error } = await db
        .from("submissions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) return serverError(error);
      if (!sub) return json({ error: "投稿不存在" }, 404);
      if (sub.status !== "pending") {
        return json({ error: "该投稿已处理" }, 400);
      }

      const chapters = Array.isArray(sub.chapters) ? sub.chapters : [];
      const { data: book, error: bookErr } = await db
        .from("books")
        .insert({
          title: sub.title,
          author: sub.author,
          cover: sub.cover ?? "",
          description: sub.description ?? "",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (bookErr) return serverError(bookErr);

      const chapterRows = chapters.map(
        (c: unknown, i: number) => {
          const item = (c ?? {}) as Record<string, unknown>;
          return {
            book_id: (book as { id: number }).id,
            title: String(item.title ?? "").trim(),
            content: String(item.content ?? "").trim(),
            order: i + 1,
            created_at: new Date().toISOString(),
          };
        },
      );
      const { error: chErr } = await db.from("chapters").insert(chapterRows);
      if (chErr) {
        // 章节写入失败时回滚已创建的书籍，避免残留空书
        await db.from("books").delete().eq("id", (book as { id: number }).id);
        return serverError(chErr);
      }

      const { error: upErr } = await db
        .from("submissions")
        .update({
          status: "approved",
          approved_book_id: (book as { id: number }).id,
        })
        .eq("id", id);
      if (upErr) return serverError(upErr);
      return json({ ok: true, book_id: (book as { id: number }).id });
    } catch (e) {
      return serverError(e);
    }
  }

  if (rejectMatch && req.method === "POST") {
    const denied = adminRequired(req);
    if (denied) return denied;
    try {
      const id = Number(rejectMatch[1]);
      const { data: sub, error } = await db
        .from("submissions")
        .select("id, status")
        .eq("id", id)
        .maybeSingle();
      if (error) return serverError(error);
      if (!sub) return json({ error: "投稿不存在" }, 404);
      if (sub.status !== "pending") {
        return json({ error: "该投稿已处理" }, 400);
      }
      const { error: upErr } = await db
        .from("submissions")
        .update({ status: "rejected" })
        .eq("id", id);
      if (upErr) return serverError(upErr);
      return json({ ok: true });
    } catch (e) {
      return serverError(e);
    }
  }

  // ---------- 留言 ----------
  const messagesMatch = path.match(/^\/api\/messages\/?$/);
  if (messagesMatch && req.method === "GET") {
    try {
      const category = (url.searchParams.get("category") ?? "").trim();
      if (category && category !== "forum" && category !== "feedback") {
        return json({ error: "留言分类不正确" }, 400);
      }
      let query = db
        .from("messages")
        .select("id, nickname, content, category, created_at")
        .eq("is_deleted", false);
      if (category) query = query.eq("category", category);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (error) return serverError(error);
      return json({ messages: (data ?? []).map(messageToDict) });
    } catch (e) {
      return serverError(e);
    }
  }

  if (messagesMatch && req.method === "POST") {
    try {
      const data = await readJson(req);
      const content = String(data.content ?? "").trim();
      if (!content) return json({ error: "留言内容不能为空" }, 400);
      if (content.length > MAX_CONTENT_LENGTH) {
        return json(
          { error: `留言内容不能超过 ${MAX_CONTENT_LENGTH} 字` },
          400,
        );
      }

      const nickname = String(data.nickname ?? "").trim().slice(0, 50);
      const categoryRaw = String(data.category ?? "").trim();
      const category = categoryRaw === "feedback" ? "feedback" : "forum";
      const ip = clientIp(req);
      const now = Date.now() / 1000;
      if (ip && now - (lastPostAt.get(ip) ?? 0) < POST_COOLDOWN_SECONDS) {
        return json({ error: "发布过于频繁，请稍后再试" }, 429);
      }
      lastPostAt.set(ip, now);

      const { data: message, error } = await db
        .from("messages")
        .insert({
          nickname,
          content,
          ip,
          is_deleted: false,
          category,
          created_at: new Date().toISOString(),
        })
        .select("id, nickname, content, category, created_at")
        .single();
      if (error) return serverError(error);
      return json({ message: messageToDict(message as never) }, 201);
    } catch (e) {
      return serverError(e);
    }
  }

  const deleteMessageMatch = path.match(/^\/api\/messages\/(\d+)$/);
  if (deleteMessageMatch && req.method === "DELETE") {
    const denied = adminRequired(req);
    if (denied) return denied;
    try {
      const id = Number(deleteMessageMatch[1]);
      const { data, error } = await db
        .from("messages")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("is_deleted", false)
        .select("id");
      if (error) return serverError(error);
      if (!data || !data.length) return json({ error: "留言不存在" }, 404);
      return json({ ok: true });
    } catch (e) {
      return serverError(e);
    }
  }

  // ---------- 管理员 ----------
  if (path === "/api/admin/verify" && req.method === "POST") {
    const denied = adminRequired(req);
    if (denied) return denied;
    return json({ ok: true });
  }

  // ---------- 用户认证 ----------
  if (path === "/api/auth/verify" && req.method === "POST") {
    try {
      const header = req.headers.get("Authorization") ?? "";
      if (!header.startsWith("Bearer ")) {
        return json({ error: "缺少访问令牌" }, 401);
      }
      const token = header.slice(7).trim();
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data?.user) {
        return json({ error: "访问令牌无效或已过期" }, 401);
      }
      const meta = data.user.user_metadata ?? {};
      return json({
        ok: true,
        user: {
          id: data.user.id,
          email: data.user.email ?? "",
          nickname: meta.nickname ?? "",
        },
      });
    } catch (e) {
      return serverError(e);
    }
  }

  return json({ error: "接口不存在" }, 404);
});

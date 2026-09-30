// AI-GEN-BEGIN
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, SessionPayload, SiteSettings } from "./types";
import {
  authSecret,
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "./auth";
import {
  createCategory,
  createPost,
  deleteCategory,
  deletePost,
  ensureBootstrap,
  findUserByUsername,
  getCategoryById,
  getPostById,
  getSiteSettings,
  listAllPosts,
  listCategories,
  setPostStatus,
  setSetting,
  updateCategory,
  updatePassword,
  updatePost,
} from "./db";
import { normalizeTheme } from "./themes";
import { sanitizePostHtml, slugify } from "./utils";
import {
  clientIp,
  rateLimit,
  rateLimitedHtml,
  verifyTurnstile,
} from "./security";
import {
  generateSite,
  serveSiteNotFound,
  serveSiteOrBootstrap,
} from "./static-site";
import { notFoundPage, postPage } from "./templates/blog";
import {
  categoriesPage,
  dashboardPage,
  editorPage,
  loginPage,
  passwordPage,
  settingsPage,
} from "./templates/admin";

type AppVars = {
  Variables: {
    session: SessionPayload;
  };
};

const app = new Hono<{ Bindings: Env } & AppVars>();
const COOKIE = "cms_session";

function turnstileSiteKey(env: Env): string {
  return (env.TURNSTILE_SITE_KEY || "").trim();
}

async function requireAuth(c: any, next: () => Promise<void>) {
  const token = getCookie(c, COOKIE);
  const secret = authSecret(c.env.AUTH_SECRET);
  const session = token ? await verifySessionToken(token, secret) : null;
  if (!session) {
    return c.redirect("/x/admin/login");
  }
  c.set("session", session);
  await next();
}

async function settings(c: { env: Env }): Promise<SiteSettings> {
  try {
    return await getSiteSettings(c.env.DB);
  } catch {
    return {
      ui_theme: "leuc",
      weather_effect: "overcast",
      cursor_effect: "whirlwind",
      click_effect: "water",
    };
  }
}

app.use("*", async (c, next) => {
  try {
    await ensureBootstrap(c.env);
  } catch {
    // 本地未 migrate 时先放行
  }
  await next();
});

// 全站软限流：每 IP 每分钟 300 次，减轻 Free 日配额被刷穿
app.use("*", async (c, next) => {
  // AI-GEN-BEGIN
  const path = c.req.path;
  if (path.startsWith("/static/")) {
    await next();
    return;
  }
  const ip = clientIp(c.req.raw);
  const limited = await rateLimit("site", ip, 300, 60);
  if (!limited.ok) return rateLimitedHtml(limited.retryAfter);
  await next();
  // AI-GEN-END
});

// 后台更严：每 IP 每分钟 90 次
app.use("/x/admin", async (c, next) => {
  // AI-GEN-BEGIN
  const ip = clientIp(c.req.raw);
  const limited = await rateLimit("admin", ip, 90, 60);
  if (!limited.ok) return rateLimitedHtml(limited.retryAfter);
  await next();
  // AI-GEN-END
});
app.use("/x/admin/*", async (c, next) => {
  // AI-GEN-BEGIN
  const ip = clientIp(c.req.raw);
  const limited = await rateLimit("admin", ip, 90, 60);
  if (!limited.ok) return rateLimitedHtml(limited.retryAfter);
  await next();
  // AI-GEN-END
});

app.get("/static/*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

function edgeCacheCtx(c: {
  req: { raw: Request };
  executionCtx: { waitUntil: (p: Promise<unknown>) => void };
}) {
  // AI-GEN-BEGIN
  return {
    request: c.req.raw,
    waitUntil: (p: Promise<unknown>) => c.executionCtx.waitUntil(p),
  };
  // AI-GEN-END
}

// 前台读 SITE R2；桶为空时自动整站生成一次；边缘缓存降低 Free 日请求与 R2 读
app.get("/", async (c) =>
  serveSiteOrBootstrap(c.env, "index.html", edgeCacheCtx(c))
);

app.get("/category/:slug", async (c) => {
  const slug = c.req.param("slug");
  return serveSiteOrBootstrap(c.env, `category/${slug}.html`, edgeCacheCtx(c));
});

app.get("/post/:slug", async (c) => {
  const slug = c.req.param("slug");
  return serveSiteOrBootstrap(c.env, `post/${slug}.html`, edgeCacheCtx(c));
});

app.get("/x/admin/login", async (c) => {
  const s = await settings(c);
  const token = getCookie(c, COOKIE);
  const secret = authSecret(c.env.AUTH_SECRET);
  if (token && (await verifySessionToken(token, secret))) {
    return c.redirect("/x/admin");
  }
  return c.html(loginPage(c.env.SITE_NAME, s, "", turnstileSiteKey(c.env)));
});

app.post("/x/admin/login", async (c) => {
  // AI-GEN-BEGIN
  const s = await settings(c);
  const ip = clientIp(c.req.raw);
  // 登录更严：15 分钟内最多 8 次
  const limited = await rateLimit("login", ip, 8, 15 * 60);
  if (!limited.ok) return rateLimitedHtml(limited.retryAfter);

  const body = await c.req.parseBody();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const cfToken = String(body["cf-turnstile-response"] || "");

  const turnstileSecret = (c.env.TURNSTILE_SECRET_KEY || "").trim();
  if (turnstileSecret) {
    const ts = await verifyTurnstile(cfToken, turnstileSecret, ip);
    if (!ts.ok) {
      return c.html(
        loginPage(c.env.SITE_NAME, s, ts.message, turnstileSiteKey(c.env)),
        400
      );
    }
  }

  const user = await findUserByUsername(c.env.DB, username);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.html(
      loginPage(c.env.SITE_NAME, s, "用户名或密码错误", turnstileSiteKey(c.env)),
      401
    );
  }
  const secret = authSecret(c.env.AUTH_SECRET);
  const token = await createSessionToken(
    { uid: user.id, username: user.username },
    secret
  );
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: new URL(c.req.url).protocol === "https:",
    maxAge: 60 * 60 * 24 * 7,
  });
  return c.redirect("/x/admin");
  // AI-GEN-END
});

app.post("/x/admin/logout", requireAuth, async (c) => {
  deleteCookie(c, COOKIE, { path: "/" });
  return c.redirect("/x/admin/login");
});

app.get("/x/admin", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const posts = await listAllPosts(c.env.DB);
  const msg = c.req.query("msg") || "";
  return c.html(dashboardPage(c.env.SITE_NAME, session.username, posts, s, msg));
});

app.post("/x/admin/rebuild", requireAuth, async (c) => {
  const result = await generateSite(c.env);
  const msg = `整站更新完成：写入 ${result.pages} 页，清理 ${result.deleted} 个旧文件`;
  return c.redirect(`/x/admin?msg=${encodeURIComponent(msg)}`);
});

app.get("/x/admin/posts/:id/preview", requireAuth, async (c) => {
  const s = await settings(c);
  const id = Number(c.req.param("id"));
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.html(notFoundPage(c.env.SITE_NAME, s), 404);
  return c.html(postPage(c.env.SITE_NAME, post, s));
});

app.get("/x/admin/posts/new", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const categories = await listCategories(c.env.DB);
  return c.html(editorPage(c.env.SITE_NAME, session.username, null, categories, s));
});

app.get("/x/admin/posts/:id", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const id = Number(c.req.param("id"));
  const [post, categories] = await Promise.all([
    getPostById(c.env.DB, id),
    listCategories(c.env.DB),
  ]);
  if (!post) return c.html(notFoundPage(c.env.SITE_NAME, s), 404);
  return c.html(editorPage(c.env.SITE_NAME, session.username, post, categories, s));
});

/** 封面 / 正文图片上限 2MB，避免 R2 存储与流量失控 */
const MAX_COVER_BYTES = 2 * 1024 * 1024;
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

async function uploadCover(env: Env, file: File | undefined): Promise<string | null> {
  // AI-GEN-BEGIN
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_COVER_BYTES) {
    throw new Error("封面不能超过 2MB（控制 R2 免费额度）");
  }
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const key = `covers/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return `/media/${key}`;
  // AI-GEN-END
}

async function uploadInlineImage(env: Env, file: File | undefined): Promise<string> {
  // AI-GEN-BEGIN
  if (!file || typeof file === "string" || file.size === 0) {
    throw new Error("请选择图片文件");
  }
  if (file.size > MAX_INLINE_IMAGE_BYTES) {
    throw new Error("图片不能超过 2MB（控制 R2 免费额度）");
  }
  const type = (file.type || "").toLowerCase();
  if (type && !ALLOWED_IMAGE_TYPES.has(type)) {
    throw new Error("仅支持 JPG / PNG / GIF / WebP");
  }
  const extFromName = (file.name.split(".").pop() || "").toLowerCase();
  const ext =
    extFromName && ["jpg", "jpeg", "png", "gif", "webp"].includes(extFromName)
      ? extFromName === "jpeg"
        ? "jpg"
        : extFromName
      : type === "image/png"
        ? "png"
        : type === "image/gif"
          ? "gif"
          : type === "image/webp"
            ? "webp"
            : "jpg";
  const key = `posts/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: type || `image/${ext === "jpg" ? "jpeg" : ext}` },
  });
  return `/media/${key}`;
  // AI-GEN-END
}

function parseCategoryId(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

app.get("/media/*", async (c) => {
  // AI-GEN-BEGIN
  const cache = caches.default;
  const cacheKey = c.req.raw;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const key = c.req.path.replace(/^\/media\//, "");
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  const res = new Response(obj.body, { headers });
  c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
  // AI-GEN-END
});

app.post("/x/admin/media", requireAuth, async (c) => {
  // AI-GEN-BEGIN
  try {
    const body = await c.req.parseBody();
    const url = await uploadInlineImage(c.env, body.file as File | undefined);
    return c.json({ ok: true, url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "上传失败";
    return c.json({ ok: false, error: msg }, 400);
  }
  // AI-GEN-END
});

app.post("/x/admin/posts", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const categories = await listCategories(c.env.DB);
  const body = await c.req.parseBody();
  const title = String(body.title || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  const content = sanitizePostHtml(String(body.content || ""));
  const status = body.status === "published" ? "published" : "draft";
  const category_id = parseCategoryId(body.category_id);
  let slug = String(body.slug || "").trim() || slugify(title);
  let cover_url = String(body.cover_url || "").trim();

  try {
    const uploaded = await uploadCover(c.env, body.cover_file as File | undefined);
    if (uploaded) cover_url = uploaded;
    if (!title) {
      return c.html(
        editorPage(c.env.SITE_NAME, session.username, null, categories, s, "标题不能为空"),
        400
      );
    }
    await createPost(c.env.DB, {
      title,
      slug,
      excerpt,
      content,
      cover_url,
      category_id,
      status,
    });
    return c.redirect("/x/admin");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return c.html(
      editorPage(c.env.SITE_NAME, session.username, null, categories, s, msg),
      400
    );
  }
});

app.post("/x/admin/posts/:id", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const id = Number(c.req.param("id"));
  const [existing, categories] = await Promise.all([
    getPostById(c.env.DB, id),
    listCategories(c.env.DB),
  ]);
  if (!existing) return c.html(notFoundPage(c.env.SITE_NAME, s), 404);

  const body = await c.req.parseBody();
  const title = String(body.title || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  const content = sanitizePostHtml(String(body.content || ""));
  const status = body.status === "published" ? "published" : "draft";
  const category_id = parseCategoryId(body.category_id);
  let slug = String(body.slug || "").trim() || slugify(title);
  let cover_url = String(body.cover_url || "").trim();

  try {
    const uploaded = await uploadCover(c.env, body.cover_file as File | undefined);
    if (uploaded) cover_url = uploaded;
    await updatePost(c.env.DB, id, {
      title,
      slug,
      excerpt,
      content,
      cover_url,
      category_id,
      status,
    });
    return c.redirect("/x/admin");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return c.html(
      editorPage(c.env.SITE_NAME, session.username, existing, categories, s, msg),
      400
    );
  }
});
app.post("/x/admin/posts/:id/status", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.parseBody();
  const status = body.status === "published" ? "published" : "draft";
  await setPostStatus(c.env.DB, id, status);
  return c.redirect("/x/admin");
});

app.post("/x/admin/posts/:id/delete", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  await deletePost(c.env.DB, id);
  return c.redirect("/x/admin");
});

app.get("/x/admin/categories", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const categories = await listCategories(c.env.DB);
  return c.html(categoriesPage(c.env.SITE_NAME, session.username, categories, s));
});

app.post("/x/admin/categories", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const body = await c.req.parseBody();
  const name = String(body.name || "").trim();
  let slug = String(body.slug || "").trim() || slugify(name);
  const sort_order = Number(body.sort_order || 0) || 0;
  try {
    if (!name) throw new Error("名称不能为空");
    await createCategory(c.env.DB, { name, slug, sort_order });
    return c.redirect("/x/admin/categories");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "创建失败";
    const categories = await listCategories(c.env.DB);
    return c.html(
      categoriesPage(c.env.SITE_NAME, session.username, categories, s, msg),
      400
    );
  }
});

app.post("/x/admin/categories/:id", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const id = Number(c.req.param("id"));
  const body = await c.req.parseBody();
  const name = String(body.name || "").trim();
  let slug = String(body.slug || "").trim() || slugify(name);
  const sort_order = Number(body.sort_order || 0) || 0;
  try {
    if (!name) throw new Error("名称不能为空");
    if (!(await getCategoryById(c.env.DB, id))) throw new Error("分类不存在");
    await updateCategory(c.env.DB, id, { name, slug, sort_order });
    return c.redirect("/x/admin/categories");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "更新失败";
    const categories = await listCategories(c.env.DB);
    return c.html(
      categoriesPage(c.env.SITE_NAME, session.username, categories, s, msg),
      400
    );
  }
});

app.post("/x/admin/categories/:id/delete", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  await deleteCategory(c.env.DB, id);
  return c.redirect("/x/admin/categories");
});

app.get("/x/admin/settings", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  return c.html(settingsPage(c.env.SITE_NAME, session.username, s));
});

app.post("/x/admin/settings", requireAuth, async (c) => {
  const session = c.get("session");
  const body = await c.req.parseBody();
  const theme = normalizeTheme(String(body.ui_theme || "leuc"));
  const weather = String(body.weather_effect || "none");
  const cursor = String(body.cursor_effect || "none");
  const click = String(body.click_effect || "none");
  const weatherOk = ["none", "snow", "rain", "overcast", "fog", "wind"].includes(weather);
  const cursorOk = ["none", "whirlwind", "animal"].includes(cursor);
  const clickOk = ["none", "water", "boom", "glass", "nuke"].includes(click);

  await setSetting(c.env.DB, "ui_theme", theme);
  await setSetting(c.env.DB, "weather_effect", weatherOk ? weather : "none");
  await setSetting(c.env.DB, "cursor_effect", cursorOk ? cursor : "none");
  await setSetting(c.env.DB, "click_effect", clickOk ? click : "none");

  // 外观改动立即刷新静态站，避免前台仍是旧特效配置
  try {
    await generateSite(c.env);
  } catch {
    // 生成失败不阻断保存
  }

  const s = await settings(c);
  return c.html(settingsPage(c.env.SITE_NAME, session.username, s, "设置已保存并已更新静态站"));
});

app.get("/x/admin/password", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  return c.html(passwordPage(c.env.SITE_NAME, session.username, s));
});

app.post("/x/admin/password", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const body = await c.req.parseBody();
  const current = String(body.current || "");
  const next = String(body.next || "");
  const confirm = String(body.confirm || "");

  const user = await findUserByUsername(c.env.DB, session.username);
  if (!user || !(await verifyPassword(current, user.password_hash))) {
    return c.html(
      passwordPage(c.env.SITE_NAME, session.username, s, "", "当前密码不正确"),
      400
    );
  }
  if (next.length < 8) {
    return c.html(
      passwordPage(c.env.SITE_NAME, session.username, s, "", "新密码至少 8 位"),
      400
    );
  }
  if (next !== confirm) {
    return c.html(
      passwordPage(c.env.SITE_NAME, session.username, s, "", "两次新密码不一致"),
      400
    );
  }

  await updatePassword(c.env.DB, user.id, await hashPassword(next));
  return c.html(
    passwordPage(c.env.SITE_NAME, session.username, s, "密码已更新", "")
  );
});

app.notFound(async (c) => {
  // 后台路径仍用模板 404；前台走静态 404.html
  if (c.req.path.startsWith("/x/")) {
    const s = await settings(c);
    return c.html(notFoundPage(c.env.SITE_NAME, s), 404);
  }
  return serveSiteNotFound(c.env.SITE, edgeCacheCtx(c));
});

export default app;
// AI-GEN-END

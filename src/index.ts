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
import { slugify } from "./utils";
import { generateSite, serveSiteNotFound, serveSiteOr404 } from "./static-site";
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

app.get("/static/*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

// 前台只读 SITE R2 预渲染 HTML，不查 D1
app.get("/", async (c) => serveSiteOr404(c.env.SITE, "index.html"));

app.get("/category/:slug", async (c) => {
  const slug = c.req.param("slug");
  return serveSiteOr404(c.env.SITE, `category/${slug}.html`);
});

app.get("/post/:slug", async (c) => {
  const slug = c.req.param("slug");
  return serveSiteOr404(c.env.SITE, `post/${slug}.html`);
});

app.get("/x/admin/login", async (c) => {
  const s = await settings(c);
  const token = getCookie(c, COOKIE);
  const secret = authSecret(c.env.AUTH_SECRET);
  if (token && (await verifySessionToken(token, secret))) {
    return c.redirect("/x/admin");
  }
  return c.html(loginPage(c.env.SITE_NAME, s));
});

app.post("/x/admin/login", async (c) => {
  const s = await settings(c);
  const body = await c.req.parseBody();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const user = await findUserByUsername(c.env.DB, username);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.html(loginPage(c.env.SITE_NAME, s, "用户名或密码错误"), 401);
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

async function uploadCover(env: Env, file: File | undefined): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const key = `covers/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return `/media/${key}`;
}

function parseCategoryId(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

app.get("/media/*", async (c) => {
  const key = c.req.path.replace(/^\/media\//, "");
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});

app.post("/x/admin/posts", requireAuth, async (c) => {
  const session = c.get("session");
  const s = await settings(c);
  const categories = await listCategories(c.env.DB);
  const body = await c.req.parseBody();
  const title = String(body.title || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  const content = String(body.content || "");
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
    const id = await createPost(c.env.DB, {
      title,
      slug,
      excerpt,
      content,
      cover_url,
      category_id,
      status,
    });
    return c.redirect(`/x/admin/posts/${id}`);
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
  const content = String(body.content || "");
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
    return c.redirect(`/x/admin/posts/${id}`);
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
  const weatherOk = ["none", "snow", "rain", "overcast", "fog", "wind"].includes(weather);
  const cursorOk = ["none", "whirlwind", "animal"].includes(cursor);

  await setSetting(c.env.DB, "ui_theme", theme);
  await setSetting(c.env.DB, "weather_effect", weatherOk ? weather : "none");
  await setSetting(c.env.DB, "cursor_effect", cursorOk ? cursor : "none");

  const s = await settings(c);
  return c.html(settingsPage(c.env.SITE_NAME, session.username, s, "设置已保存"));
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
  return serveSiteNotFound(c.env.SITE);
});

export default app;
// AI-GEN-END

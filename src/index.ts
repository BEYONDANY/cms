// AI-GEN-BEGIN
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, SessionPayload } from "./types";
import {
  authSecret,
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "./auth";
import {
  createPost,
  deletePost,
  ensureBootstrap,
  findUserByUsername,
  getPostById,
  getPostBySlug,
  listAllPosts,
  listPublishedPosts,
  updatePassword,
  updatePost,
} from "./db";
import { slugify } from "./utils";
import { homePage, notFoundPage, postPage } from "./templates/blog";
import {
  dashboardPage,
  editorPage,
  loginPage,
  passwordPage,
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

app.use("*", async (c, next) => {
  try {
    await ensureBootstrap(c.env);
  } catch {
    // 本地未 migrate 时先放行，具体路由再报错
  }
  await next();
});

app.get("/static/*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

app.get("/", async (c) => {
  const posts = await listPublishedPosts(c.env.DB);
  return c.html(homePage(c.env.SITE_NAME, posts));
});

app.get("/post/:slug", async (c) => {
  const post = await getPostBySlug(c.env.DB, c.req.param("slug"), true);
  if (!post) return c.html(notFoundPage(c.env.SITE_NAME), 404);
  return c.html(postPage(c.env.SITE_NAME, post));
});

app.get("/x/admin/login", async (c) => {
  const token = getCookie(c, COOKIE);
  const secret = authSecret(c.env.AUTH_SECRET);
  if (token && (await verifySessionToken(token, secret))) {
    return c.redirect("/x/admin");
  }
  return c.html(loginPage(c.env.SITE_NAME));
});

app.post("/x/admin/login", async (c) => {
  const body = await c.req.parseBody();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const user = await findUserByUsername(c.env.DB, username);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.html(loginPage(c.env.SITE_NAME, "用户名或密码错误"), 401);
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
  const posts = await listAllPosts(c.env.DB);
  return c.html(dashboardPage(c.env.SITE_NAME, session.username, posts));
});

app.get("/x/admin/posts/new", requireAuth, async (c) => {
  const session = c.get("session");
  return c.html(editorPage(c.env.SITE_NAME, session.username, null));
});

app.get("/x/admin/posts/:id", requireAuth, async (c) => {
  const session = c.get("session");
  const id = Number(c.req.param("id"));
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.html(notFoundPage(c.env.SITE_NAME), 404);
  return c.html(editorPage(c.env.SITE_NAME, session.username, post));
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
  const body = await c.req.parseBody();
  const title = String(body.title || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  const content = String(body.content || "");
  const status = body.status === "published" ? "published" : "draft";
  let slug = String(body.slug || "").trim() || slugify(title);
  let cover_url = String(body.cover_url || "").trim();

  try {
    const uploaded = await uploadCover(c.env, body.cover_file as File | undefined);
    if (uploaded) cover_url = uploaded;

    if (!title) {
      return c.html(
        editorPage(c.env.SITE_NAME, session.username, null, "标题不能为空"),
        400
      );
    }

    const id = await createPost(c.env.DB, {
      title,
      slug,
      excerpt,
      content,
      cover_url,
      status,
    });
    return c.redirect(`/x/admin/posts/${id}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return c.html(editorPage(c.env.SITE_NAME, session.username, null, msg), 400);
  }
});

app.post("/x/admin/posts/:id", requireAuth, async (c) => {
  const session = c.get("session");
  const id = Number(c.req.param("id"));
  const existing = await getPostById(c.env.DB, id);
  if (!existing) return c.html(notFoundPage(c.env.SITE_NAME), 404);

  const body = await c.req.parseBody();
  const title = String(body.title || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  const content = String(body.content || "");
  const status = body.status === "published" ? "published" : "draft";
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
      status,
    });
    return c.redirect(`/x/admin/posts/${id}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return c.html(
      editorPage(c.env.SITE_NAME, session.username, existing, msg),
      400
    );
  }
});

app.post("/x/admin/posts/:id/delete", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  await deletePost(c.env.DB, id);
  return c.redirect("/x/admin");
});

app.get("/x/admin/password", requireAuth, async (c) => {
  const session = c.get("session");
  return c.html(passwordPage(c.env.SITE_NAME, session.username));
});

app.post("/x/admin/password", requireAuth, async (c) => {
  const session = c.get("session");
  const body = await c.req.parseBody();
  const current = String(body.current || "");
  const next = String(body.next || "");
  const confirm = String(body.confirm || "");

  const user = await findUserByUsername(c.env.DB, session.username);
  if (!user || !(await verifyPassword(current, user.password_hash))) {
    return c.html(
      passwordPage(c.env.SITE_NAME, session.username, "", "当前密码不正确"),
      400
    );
  }
  if (next.length < 8) {
    return c.html(
      passwordPage(c.env.SITE_NAME, session.username, "", "新密码至少 8 位"),
      400
    );
  }
  if (next !== confirm) {
    return c.html(
      passwordPage(c.env.SITE_NAME, session.username, "", "两次新密码不一致"),
      400
    );
  }

  await updatePassword(c.env.DB, user.id, await hashPassword(next));
  return c.html(
    passwordPage(c.env.SITE_NAME, session.username, "密码已更新", "")
  );
});

app.notFound(async (c) => c.html(notFoundPage(c.env.SITE_NAME), 404));

export default app;
// AI-GEN-END

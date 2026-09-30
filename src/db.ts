// AI-GEN-BEGIN
import type { Category, Env, Post, SiteSettings, User } from "./types";
import { hashPassword } from "./auth";
import { normalizeTheme } from "./themes";

export async function ensureBootstrap(env: Env): Promise<void> {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = ?"
  )
    .bind("bootstrapped")
    .first<{ value: string }>();

  if (row?.value === "1") {
    await ensureDefaultSettings(env.DB);
    return;
  }

  const exists = await env.DB.prepare("SELECT id FROM users LIMIT 1").first();
  if (!exists) {
    const passwordHash = await hashPassword("admin123");
    await env.DB.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)"
    )
      .bind("admin", passwordHash)
      .run();
  }

  await ensureDefaultSettings(env.DB);
  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  )
    .bind("bootstrapped", "1")
    .run();
}

async function ensureDefaultSettings(db: D1Database): Promise<void> {
  const defaults: [string, string][] = [
    ["ui_theme", "leuc"],
    ["weather_effect", "overcast"],
    ["cursor_effect", "whirlwind"],
  ];
  for (const [key, value] of defaults) {
    await db
      .prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
      .bind(key, value)
      .run();
  }
}

export async function getSiteSettings(db: D1Database): Promise<SiteSettings> {
  const keys = ["ui_theme", "weather_effect", "cursor_effect"];
  const map: Record<string, string> = {};
  for (const key of keys) {
    const row = await db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .bind(key)
      .first<{ value: string }>();
    if (row) map[key] = row.value;
  }
  return {
    ui_theme: normalizeTheme(map.ui_theme),
    weather_effect: map.weather_effect || "overcast",
    cursor_effect: map.cursor_effect || "whirlwind",
  };
}

export async function setSetting(
  db: D1Database,
  key: string,
  value: string
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, value)
    .run();
}

export async function findUserByUsername(
  db: D1Database,
  username: string
): Promise<User | null> {
  return (
    (await db
      .prepare("SELECT * FROM users WHERE username = ?")
      .bind(username)
      .first<User>()) ?? null
  );
}

const POST_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id`;

export async function listPublishedPosts(
  db: D1Database,
  opts: { limit?: number; categoryId?: number | null } = {}
): Promise<Post[]> {
  const limit = opts.limit ?? 100;
  if (opts.categoryId != null) {
    const res = await db
      .prepare(
        `${POST_SELECT}
         WHERE p.status = 'published' AND p.category_id = ?
         ORDER BY COALESCE(p.published_at, p.created_at) DESC
         LIMIT ?`
      )
      .bind(opts.categoryId, limit)
      .all<Post>();
    return res.results ?? [];
  }
  const res = await db
    .prepare(
      `${POST_SELECT}
       WHERE p.status = 'published'
       ORDER BY COALESCE(p.published_at, p.created_at) DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<Post>();
  return res.results ?? [];
}

export async function listAllPosts(db: D1Database): Promise<Post[]> {
  const res = await db
    .prepare(
      `${POST_SELECT}
       ORDER BY p.updated_at DESC`
    )
    .all<Post>();
  return res.results ?? [];
}

export async function getPostBySlug(
  db: D1Database,
  slug: string,
  publishedOnly = true
): Promise<Post | null> {
  const sql = publishedOnly
    ? `${POST_SELECT} WHERE p.slug = ? AND p.status = 'published'`
    : `${POST_SELECT} WHERE p.slug = ?`;
  return (await db.prepare(sql).bind(slug).first<Post>()) ?? null;
}

export async function getPostById(
  db: D1Database,
  id: number
): Promise<Post | null> {
  return (
    (await db
      .prepare(`${POST_SELECT} WHERE p.id = ?`)
      .bind(id)
      .first<Post>()) ?? null
  );
}

export async function createPost(
  db: D1Database,
  data: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    cover_url: string;
    category_id: number | null;
    status: "draft" | "published";
  }
): Promise<number> {
  const publishedAt = data.status === "published" ? new Date().toISOString() : null;
  const res = await db
    .prepare(
      `INSERT INTO posts (title, slug, excerpt, content, cover_url, category_id, status, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      data.title,
      data.slug,
      data.excerpt,
      data.content,
      data.cover_url,
      data.category_id,
      data.status,
      publishedAt
    )
    .run();
  return Number(res.meta.last_row_id);
}

export async function updatePost(
  db: D1Database,
  id: number,
  data: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    cover_url: string;
    category_id: number | null;
    status: "draft" | "published";
  }
): Promise<void> {
  const current = await getPostById(db, id);
  if (!current) throw new Error("文章不存在");

  let publishedAt = current.published_at;
  if (data.status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  await db
    .prepare(
      `UPDATE posts
       SET title = ?, slug = ?, excerpt = ?, content = ?, cover_url = ?, category_id = ?, status = ?,
           published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(
      data.title,
      data.slug,
      data.excerpt,
      data.content,
      data.cover_url,
      data.category_id,
      data.status,
      publishedAt,
      id
    )
    .run();
}

export async function setPostStatus(
  db: D1Database,
  id: number,
  status: "draft" | "published"
): Promise<void> {
  const current = await getPostById(db, id);
  if (!current) throw new Error("文章不存在");
  let publishedAt = current.published_at;
  if (status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }
  await db
    .prepare(
      `UPDATE posts SET status = ?, published_at = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(status, publishedAt, id)
    .run();
}

export async function deletePost(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
}

export async function listCategories(db: D1Database): Promise<Category[]> {
  const res = await db
    .prepare(
      `SELECT * FROM categories ORDER BY sort_order ASC, id ASC`
    )
    .all<Category>();
  return res.results ?? [];
}

export async function getCategoryBySlug(
  db: D1Database,
  slug: string
): Promise<Category | null> {
  return (
    (await db
      .prepare("SELECT * FROM categories WHERE slug = ?")
      .bind(slug)
      .first<Category>()) ?? null
  );
}

export async function getCategoryById(
  db: D1Database,
  id: number
): Promise<Category | null> {
  return (
    (await db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .bind(id)
      .first<Category>()) ?? null
  );
}

export async function createCategory(
  db: D1Database,
  data: { name: string; slug: string; sort_order: number }
): Promise<number> {
  const res = await db
    .prepare(
      `INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)`
    )
    .bind(data.name, data.slug, data.sort_order)
    .run();
  return Number(res.meta.last_row_id);
}

export async function updateCategory(
  db: D1Database,
  id: number,
  data: { name: string; slug: string; sort_order: number }
): Promise<void> {
  await db
    .prepare(
      `UPDATE categories SET name = ?, slug = ?, sort_order = ? WHERE id = ?`
    )
    .bind(data.name, data.slug, data.sort_order, id)
    .run();
}

export async function deleteCategory(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(`UPDATE posts SET category_id = NULL WHERE category_id = ?`)
    .bind(id)
    .run();
  await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
}

export async function updatePassword(
  db: D1Database,
  userId: number,
  passwordHash: string
): Promise<void> {
  await db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .bind(passwordHash, userId)
    .run();
}
// AI-GEN-END

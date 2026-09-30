// AI-GEN-BEGIN
import type { Env, Post, User } from "./types";
import { hashPassword } from "./auth";

export async function ensureBootstrap(env: Env): Promise<void> {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = ?"
  )
    .bind("bootstrapped")
    .first<{ value: string }>();

  if (row?.value === "1") return;

  const exists = await env.DB.prepare("SELECT id FROM users LIMIT 1").first();
  if (!exists) {
    const passwordHash = await hashPassword("admin123");
    await env.DB.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)"
    )
      .bind("admin", passwordHash)
      .run();
  }

  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  )
    .bind("bootstrapped", "1")
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

export async function listPublishedPosts(
  db: D1Database,
  limit = 50
): Promise<Post[]> {
  const res = await db
    .prepare(
      `SELECT * FROM posts
       WHERE status = 'published'
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<Post>();
  return res.results ?? [];
}

export async function listAllPosts(db: D1Database): Promise<Post[]> {
  const res = await db
    .prepare(
      `SELECT * FROM posts
       ORDER BY updated_at DESC`
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
    ? "SELECT * FROM posts WHERE slug = ? AND status = 'published'"
    : "SELECT * FROM posts WHERE slug = ?";
  return (await db.prepare(sql).bind(slug).first<Post>()) ?? null;
}

export async function getPostById(
  db: D1Database,
  id: number
): Promise<Post | null> {
  return (
    (await db.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<Post>()) ??
    null
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
    status: "draft" | "published";
  }
): Promise<number> {
  const publishedAt = data.status === "published" ? new Date().toISOString() : null;
  const res = await db
    .prepare(
      `INSERT INTO posts (title, slug, excerpt, content, cover_url, status, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      data.title,
      data.slug,
      data.excerpt,
      data.content,
      data.cover_url,
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
    status: "draft" | "published";
  }
): Promise<void> {
  const current = await getPostById(db, id);
  if (!current) throw new Error("文章不存在");

  let publishedAt = current.published_at;
  if (data.status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }
  if (data.status === "draft") {
    publishedAt = current.published_at;
  }

  await db
    .prepare(
      `UPDATE posts
       SET title = ?, slug = ?, excerpt = ?, content = ?, cover_url = ?, status = ?,
           published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(
      data.title,
      data.slug,
      data.excerpt,
      data.content,
      data.cover_url,
      data.status,
      publishedAt,
      id
    )
    .run();
}

export async function deletePost(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
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

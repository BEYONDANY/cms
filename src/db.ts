// AI-GEN-BEGIN
import type {
  Category,
  Env,
  HomeBanner,
  Post,
  SiteSettings,
  User,
} from "./types";
import { hashPassword } from "./auth";
import { normalizeTheme } from "./themes";

export function parseHomeBanners(raw: string | undefined | null): HomeBanner[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const url = String(o.url || "").trim();
        if (!url) return null;
        return {
          id: String(o.id || crypto.randomUUID()),
          url,
          title: String(o.title || "").trim(),
          link: String(o.link || "").trim(),
        };
      })
      .filter((x): x is HomeBanner => !!x);
  } catch {
    return [];
  }
}

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
    ["click_effect", "water"],
    ["home_banners", "[]"],
    ["home_footer_tagline", "记录所见所想"],
  ];
  for (const [key, value] of defaults) {
    await db
      .prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
      .bind(key, value)
      .run();
  }
}

export async function getSiteSettings(db: D1Database): Promise<SiteSettings> {
  const keys = [
    "ui_theme",
    "weather_effect",
    "cursor_effect",
    "click_effect",
    "home_banners",
    "home_footer_tagline",
  ];
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
    click_effect: map.click_effect || "water",
    home_banners: parseHomeBanners(map.home_banners),
    home_footer_tagline: map.home_footer_tagline || "记录所见所想",
  };
}

export async function saveHomeBanners(
  db: D1Database,
  banners: HomeBanner[]
): Promise<void> {
  await setSetting(db, "home_banners", JSON.stringify(banners));
}

export async function getSetting(
  db: D1Database,
  key: string
): Promise<string | null> {
  // AI-GEN-BEGIN
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
  // AI-GEN-END
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

const POST_ORDER = `ORDER BY p.sort_order ASC, p.id ASC`;

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
         ${POST_ORDER}
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
       ${POST_ORDER}
       LIMIT ?`
    )
    .bind(limit)
    .all<Post>();
  return res.results ?? [];
}

export async function listAllPosts(db: D1Database): Promise<Post[]> {
  const res = await db
    .prepare(`${POST_SELECT} ${POST_ORDER}`)
    .all<Post>();
  return res.results ?? [];
}

async function nextSortOrder(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COALESCE(MIN(sort_order), 0) AS m FROM posts")
    .first<{ m: number }>();
  return (row?.m ?? 0) - 1;
}

export async function uniquePostSlug(
  db: D1Database,
  base: string,
  excludeId?: number
): Promise<string> {
  let slug = base || "post";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const row = excludeId
      ? await db
          .prepare("SELECT id FROM posts WHERE slug = ? AND id != ?")
          .bind(candidate, excludeId)
          .first()
      : await db
          .prepare("SELECT id FROM posts WHERE slug = ?")
          .bind(candidate)
          .first();
    if (!row) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
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
  const sortOrder = await nextSortOrder(db);
  const slug = await uniquePostSlug(db, data.slug);
  const res = await db
    .prepare(
      `INSERT INTO posts (title, slug, excerpt, content, cover_url, category_id, status, sort_order, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      data.title,
      slug,
      data.excerpt,
      data.content,
      data.cover_url,
      data.category_id,
      data.status,
      sortOrder,
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

/** 按 ids 顺序重写 sort_order（0..n-1），同步前后台排序 */
export async function reorderPosts(
  db: D1Database,
  ids: number[]
): Promise<void> {
  if (ids.length === 0) return;
  const stmts = ids.map((id, index) =>
    db
      .prepare(
        `UPDATE posts SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(index, id)
  );
  await db.batch(stmts);
}

/** 复制为新草稿，标题加「（副本）」，slug 自动去重 */
export async function duplicatePost(
  db: D1Database,
  id: number
): Promise<number> {
  const src = await getPostById(db, id);
  if (!src) throw new Error("文章不存在");
  const title = `${src.title}（副本）`;
  const baseSlug = `${src.slug}-copy`;
  return createPost(db, {
    title,
    slug: baseSlug,
    excerpt: src.excerpt,
    content: src.content,
    cover_url: src.cover_url,
    category_id: src.category_id,
    status: "draft",
  });
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

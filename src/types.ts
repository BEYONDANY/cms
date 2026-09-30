// AI-GEN-BEGIN
export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SITE: R2Bucket;
  ASSETS: Fetcher;
  AUTH_SECRET?: string;
  SITE_NAME: string;
  SITE_URL: string;
  /** Turnstile 站点钥（可公开）；密钥走 TURNSTILE_SECRET_KEY */
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  /** Cloudflare 用量看板：Account ID（可放 vars） */
  CF_ACCOUNT_ID?: string;
  /** Cloudflare API Token（Secret，需 Analytics Read，建议含 D1 Read） */
  CF_API_TOKEN?: string;
  /** 统计的 Worker 脚本名，默认 beyondany-cms */
  CF_WORKER_NAME?: string;
  /** D1 database UUID，用于读 file_size */
  CF_D1_DATABASE_ID?: string;
};

export type User = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
};

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  category_id: number | null;
  status: "draft" | "published";
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string | null;
  category_slug?: string | null;
};

export type SessionPayload = {
  uid: number;
  username: string;
  exp: number;
};

export type SiteSettings = {
  ui_theme: string;
  weather_effect: string;
  cursor_effect: string;
  click_effect: string;
};

export type WeatherEffect =
  | "none"
  | "snow"
  | "rain"
  | "overcast"
  | "fog"
  | "wind";

export type CursorEffect = "none" | "whirlwind" | "animal";

export type ClickEffect =
  | "none"
  | "water"
  | "boom"
  | "glass"
  | "nuke";
// AI-GEN-END

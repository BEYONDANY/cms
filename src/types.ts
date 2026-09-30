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

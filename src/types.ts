// AI-GEN-BEGIN
export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  AUTH_SECRET?: string;
  SITE_NAME: string;
  SITE_URL: string;
};

export type User = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionPayload = {
  uid: number;
  username: string;
  exp: number;
};
// AI-GEN-END

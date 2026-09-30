// AI-GEN-BEGIN
import type { Env } from "./types";
import {
  getSiteSettings,
  listCategories,
  listPublishedPosts,
} from "./db";
import { homePage, notFoundPage, postPage } from "./templates/blog";

const HTML_META = {
  httpMetadata: { contentType: "text/html; charset=utf-8" },
};

export type GenerateSiteResult = {
  pages: number;
  deleted: number;
};

async function listAllKeys(bucket: R2Bucket): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ cursor, limit: 1000 });
    for (const obj of listed.objects) keys.push(obj.key);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return keys;
}

/** 从 D1 拉取已发布内容，全量写入 SITE R2（独立静态站桶） */
export async function generateSite(env: Env): Promise<GenerateSiteResult> {
  const [settings, categories, posts] = await Promise.all([
    getSiteSettings(env.DB),
    listCategories(env.DB),
    listPublishedPosts(env.DB),
  ]);

  const wanted = new Map<string, string>();
  wanted.set("index.html", homePage(env.SITE_NAME, posts, categories, settings));
  wanted.set("404.html", notFoundPage(env.SITE_NAME, settings));

  for (const cat of categories) {
    const catPosts = posts.filter((p) => p.category_id === cat.id);
    wanted.set(
      `category/${cat.slug}.html`,
      homePage(env.SITE_NAME, catPosts, categories, settings, cat)
    );
  }

  for (const post of posts) {
    wanted.set(`post/${post.slug}.html`, postPage(env.SITE_NAME, post, settings));
  }

  const existing = await listAllKeys(env.SITE);
  let deleted = 0;
  for (const key of existing) {
    if (!wanted.has(key)) {
      await env.SITE.delete(key);
      deleted++;
    }
  }

  await Promise.all(
    [...wanted.entries()].map(([key, html]) =>
      env.SITE.put(key, html, HTML_META)
    )
  );

  return { pages: wanted.size, deleted };
}

export async function serveSiteHtml(
  bucket: R2Bucket,
  key: string,
  status = 200
): Promise<Response | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/html; charset=utf-8");
  }
  headers.set("cache-control", "public, max-age=60");
  return new Response(obj.body, { status, headers });
}

export async function serveSiteNotFound(bucket: R2Bucket): Promise<Response> {
  const fallback = await serveSiteHtml(bucket, "404.html", 404);
  if (fallback) return fallback;
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function serveSiteOr404(
  bucket: R2Bucket,
  key: string
): Promise<Response> {
  const page = await serveSiteHtml(bucket, key);
  if (page) return page;
  return serveSiteNotFound(bucket);
}
// AI-GEN-END

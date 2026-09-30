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

type CacheCtx = {
  request: Request;
  waitUntil: (p: Promise<unknown>) => void;
};

async function withEdgeCache(
  ctx: CacheCtx | undefined,
  build: () => Promise<Response | null>
): Promise<Response | null> {
  // AI-GEN-BEGIN
  if (ctx) {
    const hit = await caches.default.match(ctx.request);
    if (hit) return hit;
  }
  const res = await build();
  if (res && ctx && (res.status === 200 || res.status === 404)) {
    ctx.waitUntil(caches.default.put(ctx.request, res.clone()));
  }
  return res;
  // AI-GEN-END
}

export async function serveSiteHtml(
  bucket: R2Bucket,
  key: string,
  status = 200,
  cacheCtx?: CacheCtx
): Promise<Response | null> {
  return withEdgeCache(cacheCtx, async () => {
    const obj = await bucket.get(key);
    if (!obj) return null;
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "text/html; charset=utf-8");
    }
    // 短缓存：省 Worker 请求与 R2 读；发文重建后最多约 1 分钟旧页
    headers.set("cache-control", "public, max-age=60");
    return new Response(obj.body, { status, headers });
  });
}

export async function serveSiteNotFound(
  bucket: R2Bucket,
  cacheCtx?: CacheCtx
): Promise<Response> {
  const fallback = await serveSiteHtml(bucket, "404.html", 404, cacheCtx);
  if (fallback) return fallback;
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function serveSiteOr404(
  bucket: R2Bucket,
  key: string,
  cacheCtx?: CacheCtx
): Promise<Response> {
  const page = await serveSiteHtml(bucket, key, 200, cacheCtx);
  if (page) return page;
  return serveSiteNotFound(bucket, cacheCtx);
}

/**
 * 前台读静态页；若整站尚未生成（无 index.html）则自动全量 regenerate 一次。
 * 正常 404（已有站点但缺某页）不会打 D1。
 */
export async function serveSiteOrBootstrap(
  env: Env,
  key: string,
  cacheCtx?: CacheCtx
): Promise<Response> {
  // AI-GEN-BEGIN
  const page = await serveSiteHtml(env.SITE, key, 200, cacheCtx);
  if (page) return page;

  const bootstrapped = await env.SITE.head("index.html");
  if (!bootstrapped) {
    await generateSite(env);
    const generated = await serveSiteHtml(env.SITE, key, 200, cacheCtx);
    if (generated) return generated;
  }

  return serveSiteNotFound(env.SITE, cacheCtx);
  // AI-GEN-END
}
// AI-GEN-END

// AI-GEN-BEGIN
import type { Post } from "../types";
import { escapeHtml, renderMarkdown } from "../utils";
import { layout } from "./layout";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function homePage(siteName: string, posts: Post[]): string {
  const list =
    posts.length === 0
      ? `<p class="muted">暂无文章。</p>`
      : `<ul class="post-list">
        ${posts
          .map(
            (p) => `<li>
            <a href="/post/${escapeHtml(p.slug)}">
              <h2>${escapeHtml(p.title)}</h2>
              <p class="meta">${formatDate(p.published_at || p.created_at)}</p>
              <p>${escapeHtml(p.excerpt || "")}</p>
            </a>
          </li>`
          )
          .join("")}
      </ul>`;

  return layout({
    title: siteName,
    siteName,
    body: `<section class="hero">
      <h1>${escapeHtml(siteName)}</h1>
      <p class="lede">轻量博客 · Cloudflare 免费托管</p>
    </section>
    <section>${list}</section>`,
  });
}

export function postPage(siteName: string, post: Post): string {
  const html = renderMarkdown(post.content);
  const cover = post.cover_url
    ? `<img class="cover" src="${escapeHtml(post.cover_url)}" alt="" />`
    : "";

  return layout({
    title: post.title,
    siteName,
    body: `<article class="post">
      <header>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="meta">${formatDate(post.published_at || post.created_at)}</p>
      </header>
      ${cover}
      <div class="content">${html}</div>
    </article>`,
  });
}

export function notFoundPage(siteName: string): string {
  return layout({
    title: "未找到",
    siteName,
    body: `<section class="empty"><h1>404</h1><p>页面不存在。</p><p><a href="/">返回</a></p></section>`,
  });
}
// AI-GEN-END

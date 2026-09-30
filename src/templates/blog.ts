// AI-GEN-BEGIN
import type { Category, Post, SiteSettings } from "../types";
import { escapeHtml, renderPostContent } from "../utils";
import { layout } from "./layout";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatMonthLabel(iso: string): string {
  const d = iso.slice(0, 7);
  const [y, m] = d.split("-");
  return `${y} · ${Number(m)}月`;
}

type LadderGroup = { key: string; label: string; posts: Post[] };

function groupByMonth(posts: Post[]): LadderGroup[] {
  const map = new Map<string, LadderGroup>();
  for (const p of posts) {
    const iso = p.published_at || p.created_at;
    const key = iso.slice(0, 7);
    if (!map.has(key)) {
      map.set(key, { key, label: formatMonthLabel(iso), posts: [] });
    }
    map.get(key)!.posts.push(p);
  }
  return [...map.values()];
}

function categoryNav(
  categories: Category[],
  activeSlug: string | null
): string {
  const allCls = activeSlug == null ? "active" : "";
  const items = [
    `<a class="cat-chip ${allCls}" href="/">全部</a>`,
    ...categories.map(
      (c) =>
        `<a class="cat-chip ${activeSlug === c.slug ? "active" : ""}" href="/category/${escapeHtml(c.slug)}">${escapeHtml(c.name)}</a>`
    ),
  ];
  return `<nav class="cat-nav">${items.join("")}</nav>`;
}

function coverCard(p: Post): string {
  const cover = p.cover_url
    ? `<div class="ladder-cover" style="background-image:url('${escapeHtml(p.cover_url)}')"></div>`
    : `<div class="ladder-cover ladder-cover--empty"></div>`;
  const cat = p.category_name
    ? `<span class="ladder-cat">${escapeHtml(p.category_name)}</span>`
    : "";
  return `<a class="ladder-card" href="/post/${escapeHtml(p.slug)}">
    ${cover}
    <div class="ladder-body">
      <div class="ladder-meta">
        <time>${formatDate(p.published_at || p.created_at)}</time>
        ${cat}
      </div>
      <h2>${escapeHtml(p.title)}</h2>
      <p>${escapeHtml(p.excerpt || "")}</p>
    </div>
  </a>`;
}

export function homePage(
  siteName: string,
  posts: Post[],
  categories: Category[],
  settings: SiteSettings,
  activeCategory: Category | null = null
): string {
  const groups = groupByMonth(posts);
  const ladder =
    posts.length === 0
      ? `<p class="muted empty-hint">暂无发布内容。</p>`
      : `<div class="timeline">
        ${groups
          .map(
            (g) => `<section class="timeline-group">
            <div class="timeline-rail">
              <span class="timeline-dot"></span>
              <span class="timeline-line"></span>
            </div>
            <div class="timeline-content">
              <h3 class="timeline-label">${escapeHtml(g.label)}</h3>
              <div class="ladder-list">
                ${g.posts.map(coverCard).join("")}
              </div>
            </div>
          </section>`
          )
          .join("")}
      </div>`;

  const subtitle = activeCategory
    ? `分类 · ${escapeHtml(activeCategory.name)}`
    : "封面天梯 · 时间轴";

  return layout({
    title: activeCategory ? activeCategory.name : siteName,
    siteName,
    settings,
    body: `<section class="hero hero-cover">
      <p class="eyebrow">${subtitle}</p>
      <h1>${escapeHtml(siteName)}</h1>
    </section>
    ${categoryNav(categories, activeCategory?.slug ?? null)}
    <section class="ladder-section">${ladder}</section>`,
  });
}

export function postPage(
  siteName: string,
  post: Post,
  settings: SiteSettings
): string {
  const html = renderPostContent(post.content);
  const cover = post.cover_url
    ? `<div class="post-hero-cover" style="background-image:url('${escapeHtml(post.cover_url)}')"></div>`
    : "";
  const cat = post.category_name
    ? `<a class="cat-chip active" href="/category/${escapeHtml(post.category_slug || "")}">${escapeHtml(post.category_name)}</a>`
    : "";

  return layout({
    title: post.title,
    siteName,
    settings,
    body: `<article class="post post-cover">
      ${cover}
      <header class="post-header">
        <div class="ladder-meta">
          <time>${formatDate(post.published_at || post.created_at)}</time>
          ${cat}
        </div>
        <h1>${escapeHtml(post.title)}</h1>
      </header>
      <div class="content">${html}</div>
      <p class="back-link"><a href="/">← 返回天梯</a></p>
    </article>`,
  });
}

export function notFoundPage(siteName: string, settings?: SiteSettings): string {
  return layout({
    title: "未找到",
    siteName,
    settings,
    body: `<section class="empty"><h1>404</h1><p>页面不存在。</p><p><a href="/">返回</a></p></section>`,
  });
}
// AI-GEN-END

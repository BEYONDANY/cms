// AI-GEN-BEGIN
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(md: string): string {
  return marked.parse(md || "", { async: false }) as string;
}

/** 旧 Markdown 正文 vs 富文本 HTML */
export function looksLikeHtml(content: string): boolean {
  const t = (content || "").trim();
  if (!t) return false;
  if (/^<[a-zA-Z!/?]/.test(t)) return true;
  return /<\/(p|div|h[1-6]|ul|ol|li|figure|blockquote|section)>/i.test(t);
}

const EMBED_HOST_RE =
  /^(?:https?:)?\/\/(?:(?:www|m)\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be|player\.bilibili\.com|bilibili\.com|vimeo\.com|player\.vimeo\.com)\//i;

function safeUrl(raw: string, kind: "href" | "src" | "embed"): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (v.startsWith("/media/") || v.startsWith("/static/")) return v;
  if (kind !== "embed" && v.startsWith("/") && !v.startsWith("//")) return v;
  if (/^https?:\/\//i.test(v)) {
    if (kind === "embed") return EMBED_HOST_RE.test(v) ? v : null;
    return v;
  }
  if (kind === "embed" && EMBED_HOST_RE.test(v.startsWith("//") ? `https:${v}` : v)) {
    return v.startsWith("//") ? `https:${v}` : v;
  }
  return null;
}

/** 后台富文本：去掉脚本等危险内容，限制 iframe 域名 */
export function sanitizePostHtml(html: string): string {
  let s = html || "";
  s = s.replace(/<\s*(script|style|object|embed|link|meta|base)[\s\S]*?<\/\s*\1\s*>/gi, "");
  s = s.replace(/<\s*(script|style|object|embed|link|meta|base)\b[^>]*>/gi, "");
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/vbscript\s*:/gi, "");

  s = s.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe>/gi, (_m, attrs: string) => {
    const srcMatch = /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const raw = srcMatch ? srcMatch[2] ?? srcMatch[3] ?? srcMatch[4] ?? "" : "";
    const src = safeUrl(raw, "embed");
    if (!src) return "";
    return `<iframe src="${escapeHtml(src)}" title="embed" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
  });

  s = s.replace(/<(img|video|audio|source|a)\b([^>]*)>/gi, (_m, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    const get = (name: string) => {
      const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
      const m = re.exec(attrs);
      return m ? m[2] ?? m[3] ?? m[4] ?? "" : "";
    };
    if (t === "a") {
      const href = safeUrl(get("href"), "href");
      if (!href) return "<a>";
      const title = get("title");
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${title ? ` title="${escapeHtml(title)}"` : ""}>`;
    }
    if (t === "img") {
      const src = safeUrl(get("src"), "src");
      if (!src) return "";
      const alt = get("alt");
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
    }
    if (t === "video") {
      const src = safeUrl(get("src"), "src");
      const poster = safeUrl(get("poster"), "src");
      const srcAttr = src ? ` src="${escapeHtml(src)}"` : "";
      const posterAttr = poster ? ` poster="${escapeHtml(poster)}"` : "";
      return `<video controls${srcAttr}${posterAttr}>`;
    }
    if (t === "audio") {
      const src = safeUrl(get("src"), "src");
      return src ? `<audio controls src="${escapeHtml(src)}">` : `<audio controls>`;
    }
    if (t === "source") {
      const src = safeUrl(get("src"), "src");
      if (!src) return "";
      const type = get("type");
      return `<source src="${escapeHtml(src)}"${type ? ` type="${escapeHtml(type)}"` : ""} />`;
    }
    return `<${t}>`;
  });

  return s;
}

/** 前台正文：HTML 消毒；旧 Markdown 走 marked */
export function renderPostContent(content: string): string {
  if (looksLikeHtml(content)) return sanitizePostHtml(content);
  return renderMarkdown(content);
}

export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `post-${Date.now()}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
// AI-GEN-END

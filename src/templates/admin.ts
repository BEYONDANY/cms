// AI-GEN-BEGIN
import type { Post } from "../types";
import { escapeHtml } from "../utils";
import { adminLayout } from "./layout";

export function loginPage(siteName: string, error = ""): string {
  return adminLayout({
    title: "登录",
    siteName,
    body: `<section class="card narrow">
      <h1>后台登录</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/x/admin/login" class="stack">
        <label>用户名<input name="username" required autocomplete="username" /></label>
        <label>密码<input name="password" type="password" required autocomplete="current-password" /></label>
        <button type="submit">登录</button>
      </form>
      <p class="muted tip">默认账号 admin / admin123，登录后请改密。</p>
    </section>`,
  });
}

export function dashboardPage(
  siteName: string,
  username: string,
  posts: Post[]
): string {
  const rows =
    posts.length === 0
      ? `<tr><td colspan="4" class="muted">还没有文章</td></tr>`
      : posts
          .map(
            (p) => `<tr>
            <td><a href="/x/admin/posts/${p.id}">${escapeHtml(p.title)}</a></td>
            <td><span class="badge ${p.status}">${p.status === "published" ? "已发布" : "草稿"}</span></td>
            <td>${escapeHtml((p.updated_at || "").slice(0, 16))}</td>
            <td class="actions">
              <a href="/post/${escapeHtml(p.slug)}" target="_blank" rel="noopener">预览</a>
              <form method="post" action="/x/admin/posts/${p.id}/delete" onsubmit="return confirm('确认删除？')">
                <button type="submit" class="danger linkish">删除</button>
              </form>
            </td>
          </tr>`
          )
          .join("");

  return adminLayout({
    title: "文章管理",
    siteName,
    username,
    body: `<section>
      <div class="toolbar">
        <h1>文章</h1>
        <a class="btn" href="/x/admin/posts/new">写文章</a>
      </div>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>标题</th><th>状态</th><th>更新</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`,
  });
}

export function editorPage(
  siteName: string,
  username: string,
  post: Partial<Post> | null,
  error = ""
): string {
  const isNew = !post?.id;
  const action = isNew ? "/x/admin/posts" : `/x/admin/posts/${post!.id}`;
  const title = post?.title ?? "";
  const slug = post?.slug ?? "";
  const excerpt = post?.excerpt ?? "";
  const content = post?.content ?? "";
  const cover = post?.cover_url ?? "";
  const status = post?.status ?? "draft";

  return adminLayout({
    title: isNew ? "写文章" : "编辑文章",
    siteName,
    username,
    body: `<section class="card">
      <h1>${isNew ? "写文章" : "编辑文章"}</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="${action}" class="stack editor" enctype="multipart/form-data">
        <label>标题<input name="title" required value="${escapeHtml(title)}" /></label>
        <label>Slug（可空，自动生成）<input name="slug" value="${escapeHtml(slug)}" placeholder="my-post" /></label>
        <label>摘要<textarea name="excerpt" rows="2">${escapeHtml(excerpt)}</textarea></label>
        <label>封面 URL<input name="cover_url" value="${escapeHtml(cover)}" placeholder="https://... 或先上传" /></label>
        <label>上传封面<input type="file" name="cover_file" accept="image/*" /></label>
        <label>正文（Markdown）
          <textarea name="content" rows="18" required>${escapeHtml(content)}</textarea>
        </label>
        <label>状态
          <select name="status">
            <option value="draft" ${status === "draft" ? "selected" : ""}>草稿</option>
            <option value="published" ${status === "published" ? "selected" : ""}>发布</option>
          </select>
        </label>
        <div class="row">
          <button type="submit">保存</button>
          <a class="btn ghost" href="/x/admin">返回列表</a>
        </div>
      </form>
    </section>`,
  });
}

export function passwordPage(
  siteName: string,
  username: string,
  message = "",
  error = ""
): string {
  return adminLayout({
    title: "修改密码",
    siteName,
    username,
    body: `<section class="card narrow">
      <h1>修改密码</h1>
      ${message ? `<p class="ok">${escapeHtml(message)}</p>` : ""}
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/x/admin/password" class="stack">
        <label>当前密码<input type="password" name="current" required /></label>
        <label>新密码<input type="password" name="next" required minlength="8" /></label>
        <label>确认新密码<input type="password" name="confirm" required minlength="8" /></label>
        <button type="submit">保存</button>
      </form>
    </section>`,
  });
}
// AI-GEN-END

// AI-GEN-BEGIN
/** 简易 IP 限流（Cache API，不依赖付费产品）+ Turnstile 校验 */

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

type RateResult = { ok: true } | { ok: false; retryAfter: number };

/**
 * 滑动窗口近似：在 windowSec 内最多 max 次。
 * 用 Cache API 存计数，跨 isolate 基本可用，免费。
 */
export async function rateLimit(
  scope: string,
  ip: string,
  max: number,
  windowSec: number
): Promise<RateResult> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const keyUrl = `https://cms-rate.internal/${encodeURIComponent(scope)}/${encodeURIComponent(ip)}/${bucket}`;
  const cache = caches.default;
  const req = new Request(keyUrl);
  const hit = await cache.match(req);
  let count = 0;
  if (hit) {
    count = Number(await hit.text()) || 0;
  }
  if (count >= max) {
    const retryAfter = windowSec - (Math.floor(Date.now() / 1000) % windowSec);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  count += 1;
  const res = new Response(String(count), {
    headers: {
      "cache-control": `max-age=${windowSec}`,
      "content-type": "text/plain",
    },
  });
  await cache.put(req, res);
  return { ok: true };
}

export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!token) {
    return { ok: false, message: "请完成人机验证" };
  }
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
      }
    );
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      return { ok: false, message: "人机验证失败，请刷新重试" };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "人机验证服务暂时不可用" };
  }
}

export function rateLimitedHtml(retryAfter: number): Response {
  return new Response(
    `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><title>请求过于频繁</title></head>
<body style="font-family:sans-serif;padding:2rem;text-align:center">
<h1>请求过于频繁</h1>
<p>请 ${retryAfter} 秒后再试。</p>
</body></html>`,
    {
      status: 429,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": String(retryAfter),
      },
    }
  );
}
// AI-GEN-END

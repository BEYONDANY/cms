// AI-GEN-BEGIN
import type { Env } from "./types";
import { getSetting, setSetting } from "./db";

const CACHE_KEY = "usage_cache";
const CACHE_TTL_MS = 15 * 60 * 1000;
const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

/** Workers Free / R2 Free / D1 Free 对照额度（账号级常见值） */
export const FREE_LIMITS = {
  workersRequestsPerDay: 100_000,
  r2StorageBytes: 10 * 1024 * 1024 * 1024,
  r2ClassAPerMonth: 1_000_000,
  r2ClassBPerMonth: 10_000_000,
  d1StorageBytes: 5 * 1024 * 1024 * 1024,
} as const;

const CLASS_A = new Set([
  "ListBuckets",
  "PutBucket",
  "ListObjects",
  "PutObject",
  "CopyObject",
  "CompleteMultipartUpload",
  "CreateMultipartUpload",
  "UploadPart",
  "UploadPartCopy",
  "ListMultipartUploads",
  "ListParts",
]);

const CLASS_B = new Set(["HeadBucket", "HeadObject", "GetObject"]);

export type UsageMeter = {
  label: string;
  used: number;
  limit: number;
  unit: "count" | "bytes";
  hint?: string;
};

export type UsageSnapshot = {
  fetchedAt: string;
  cached: boolean;
  configured: boolean;
  error?: string;
  meters: UsageMeter[];
  details?: {
    workerName: string;
    r2Buckets: { name: string; bytes: number; objects: number }[];
    d1Name?: string;
  };
};

type CachePayload = {
  fetchedAt: string;
  meters: UsageMeter[];
  details?: UsageSnapshot["details"];
};

function utcDayStart(d = new Date()): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  ).toISOString();
}

function utcMonthStart(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 1000) / 10);
}

export function meterPercent(m: UsageMeter): number {
  return pct(m.used, m.limit);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

async function graphql<T>(token: string, query: string): Promise<T> {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (!res.ok || json.errors?.length) {
    throw new Error(json.errors?.map((e) => e.message).join("; ") || `GraphQL HTTP ${res.status}`);
  }
  if (!json.data) throw new Error("GraphQL 无数据");
  return json.data;
}

function classifyR2Ops(
  groups: { dimensions?: { actionType?: string }; sum?: { requests?: number } }[]
): { classA: number; classB: number; other: number } {
  let classA = 0;
  let classB = 0;
  let other = 0;
  for (const g of groups || []) {
    const n = Number(g.sum?.requests || 0);
    const action = g.dimensions?.actionType || "";
    if (CLASS_A.has(action)) classA += n;
    else if (CLASS_B.has(action)) classB += n;
    else other += n;
  }
  return { classA, classB, other };
}

async function fetchLiveUsage(env: Env): Promise<Omit<UsageSnapshot, "cached">> {
  const token = (env.CF_API_TOKEN || "").trim();
  const accountId = (env.CF_ACCOUNT_ID || "").trim();
  const workerName = (env.CF_WORKER_NAME || "beyondany-cms").trim();
  const d1Id = (env.CF_D1_DATABASE_ID || "").trim();

  if (!token || !accountId) {
    return {
      fetchedAt: new Date().toISOString(),
      configured: false,
      meters: [],
      error:
        "未配置 CF_API_TOKEN / CF_ACCOUNT_ID。请在 Worker Secrets 中设置 Token（需 Account Analytics Read，建议含 D1 Read）。",
    };
  }

  const now = new Date();
  const dayStart = utcDayStart(now);
  const monthStart = utcMonthStart(now);
  const end = now.toISOString();

  const query = `query {
    viewer {
      accounts(filter: { accountTag: "${accountId}" }) {
        workersToday: workersInvocationsAdaptive(
          limit: 1000
          filter: {
            datetime_geq: "${dayStart}"
            datetime_leq: "${end}"
            scriptName: "${workerName}"
          }
        ) {
          sum { requests errors subrequests }
        }
        r2Ops: r2OperationsAdaptiveGroups(
          limit: 100
          filter: { datetime_geq: "${monthStart}", datetime_leq: "${end}" }
        ) {
          sum { requests }
          dimensions { actionType }
        }
        r2Storage: r2StorageAdaptiveGroups(
          limit: 50
          filter: { datetime_geq: "${monthStart}", datetime_leq: "${end}" }
        ) {
          max { payloadSize objectCount }
          dimensions { bucketName }
        }
      }
    }
  }`;

  type Gql = {
    viewer: {
      accounts: {
        workersToday: { sum?: { requests?: number; errors?: number } }[];
        r2Ops: {
          sum?: { requests?: number };
          dimensions?: { actionType?: string };
        }[];
        r2Storage: {
          max?: { payloadSize?: number; objectCount?: number };
          dimensions?: { bucketName?: string };
        }[];
      }[];
    };
  };

  const data = await graphql<Gql>(token, query);
  const acct = data.viewer.accounts?.[0];
  if (!acct) throw new Error("账号无 GraphQL 数据（检查 Account ID / Token 权限）");

  let workersRequests = 0;
  for (const row of acct.workersToday || []) {
    workersRequests += Number(row.sum?.requests || 0);
  }

  const { classA, classB, other } = classifyR2Ops(acct.r2Ops || []);
  const bucketMap = new Map<string, { bytes: number; objects: number }>();
  for (const row of acct.r2Storage || []) {
    const name = row.dimensions?.bucketName || "unknown";
    const bytes = Number(row.max?.payloadSize || 0);
    const objects = Number(row.max?.objectCount || 0);
    const prev = bucketMap.get(name);
    if (!prev || bytes > prev.bytes) bucketMap.set(name, { bytes, objects });
  }
  const r2Buckets = [...bucketMap.entries()].map(([name, v]) => ({
    name,
    bytes: v.bytes,
    objects: v.objects,
  }));
  const r2Bytes = r2Buckets.reduce((s, b) => s + b.bytes, 0);

  let d1Bytes = 0;
  let d1Name: string | undefined;
  if (d1Id) {
    try {
      const d1Res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${d1Id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d1Json = (await d1Res.json()) as {
        success?: boolean;
        result?: { file_size?: number; name?: string };
        errors?: { message: string }[];
      };
      if (d1Res.ok && d1Json.success && d1Json.result) {
        d1Bytes = Number(d1Json.result.file_size || 0);
        d1Name = d1Json.result.name;
      }
    } catch {
      // D1 可选
    }
  }

  const meters: UsageMeter[] = [
    {
      label: `Workers 请求（今日 · ${workerName}）`,
      used: workersRequests,
      limit: FREE_LIMITS.workersRequestsPerDay,
      unit: "count",
      hint: "Free：约 10 万次/天，超额当天拒访（Error 1027），不按量扣费",
    },
    {
      label: "R2 存储（本月峰值合计）",
      used: r2Bytes,
      limit: FREE_LIMITS.r2StorageBytes,
      unit: "bytes",
      hint: "Free：10 GB-month；含 cms-media / cms-site",
    },
    {
      label: "R2 Class A 操作（本月）",
      used: classA,
      limit: FREE_LIMITS.r2ClassAPerMonth,
      unit: "count",
      hint: "写/列目录等；Free：100 万次/月",
    },
    {
      label: "R2 Class B 操作（本月）",
      used: classB,
      limit: FREE_LIMITS.r2ClassBPerMonth,
      unit: "count",
      hint: `读/Head 等；Free：1000 万次/月${other ? `（另有未归类 ${other} 次，多不计费）` : ""}`,
    },
  ];

  if (d1Id) {
    meters.push({
      label: `D1 存储${d1Name ? `（${d1Name}）` : ""}`,
      used: d1Bytes,
      limit: FREE_LIMITS.d1StorageBytes,
      unit: "bytes",
      hint: "Free：约 5 GB 总量；行读/写日限额需 Dashboard 查看",
    });
  }

  return {
    fetchedAt: new Date().toISOString(),
    configured: true,
    meters,
    details: { workerName, r2Buckets, d1Name },
  };
}

export async function getUsageSnapshot(
  env: Env,
  opts?: { force?: boolean }
): Promise<UsageSnapshot> {
  const force = Boolean(opts?.force);
  if (!force) {
    const raw = await getSetting(env.DB, CACHE_KEY);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as CachePayload;
        const age = Date.now() - Date.parse(cached.fetchedAt);
        if (Number.isFinite(age) && age >= 0 && age < CACHE_TTL_MS && cached.meters?.length) {
          return {
            fetchedAt: cached.fetchedAt,
            cached: true,
            configured: true,
            meters: cached.meters,
            details: cached.details,
          };
        }
      } catch {
        // ignore bad cache
      }
    }
  }

  try {
    const live = await fetchLiveUsage(env);
    if (live.configured && live.meters.length) {
      const payload: CachePayload = {
        fetchedAt: live.fetchedAt,
        meters: live.meters,
        details: live.details,
      };
      await setSetting(env.DB, CACHE_KEY, JSON.stringify(payload));
    }
    return { ...live, cached: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "拉取用量失败";
    const raw = await getSetting(env.DB, CACHE_KEY);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as CachePayload;
        return {
          fetchedAt: cached.fetchedAt,
          cached: true,
          configured: true,
          meters: cached.meters,
          details: cached.details,
          error: `刷新失败，展示缓存：${msg}`,
        };
      } catch {
        // fallthrough
      }
    }
    return {
      fetchedAt: new Date().toISOString(),
      cached: false,
      configured: Boolean((env.CF_API_TOKEN || "").trim() && (env.CF_ACCOUNT_ID || "").trim()),
      meters: [],
      error: msg,
    };
  }
}
// AI-GEN-END

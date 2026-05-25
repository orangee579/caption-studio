// 读取 API 配置：优先用环境变量（共享 Key），兜底用前端传的（用户自带 Key）

export type KeyConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type DualKeyConfig = {
  text: KeyConfig;
  vision: KeyConfig;
  hasServerKey: boolean; // 是否走服务端共享 Key
};

export function resolveKeys(body: any): DualKeyConfig {
  const envText = process.env.DEEPSEEK_API_KEY || process.env.TEXT_API_KEY || "";
  const envVision = process.env.QWEN_API_KEY || process.env.VISION_API_KEY || "";

  // 文本：优先环境变量
  const text: KeyConfig = envText
    ? {
        apiKey: envText,
        baseUrl: process.env.TEXT_BASE_URL || "https://api.deepseek.com/v1",
        model: process.env.TEXT_MODEL || "deepseek-chat",
      }
    : {
        apiKey: body.apiKey || "",
        baseUrl: body.baseUrl || "",
        model: body.model || "",
      };

  // 视觉：优先环境变量
  const vision: KeyConfig = envVision
    ? {
        apiKey: envVision,
        baseUrl: process.env.VISION_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: process.env.VISION_MODEL || "qwen-vl-max",
      }
    : {
        apiKey: body.visionApiKey || body.apiKey || "",
        baseUrl: body.visionBaseUrl || body.baseUrl || "",
        model: body.model || "",
      };

  return {
    text,
    vision,
    hasServerKey: !!(envText || envVision),
  };
}

// 简易速率限制：基于 IP + Edge Runtime 的 in-memory（重启会清，但够防恶意刷）
const RATE_LIMIT_BUCKET = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 小时
const RATE_LIMIT_MAX = 30; // 每 IP 每天 30 次

export function checkRateLimit(ip: string, hasServerKey: boolean): { allowed: boolean; remaining: number; resetAt: number } {
  // 用户自己带 Key 的不限速
  if (!hasServerKey) return { allowed: true, remaining: -1, resetAt: 0 };

  const now = Date.now();
  const bucket = RATE_LIMIT_BUCKET.get(ip);
  if (!bucket || bucket.resetAt < now) {
    RATE_LIMIT_BUCKET.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - bucket.count, resetAt: bucket.resetAt };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

import { NextRequest, NextResponse } from "next/server";
import { VISION_SYSTEM_PROMPT } from "@/lib/prompt";
import { resolveKeys, checkRateLimit, getClientIp } from "@/lib/keys";

export const runtime = "edge";
export const maxDuration = 60;

type Body = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  visionApiKey?: string;
  visionBaseUrl?: string;
  imageBase64: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const { vision, hasServerKey } = resolveKeys(body);
  if (!vision.apiKey || !vision.baseUrl || !vision.model) {
    return NextResponse.json({ error: "未配置视觉模型 API" }, { status: 400 });
  }
  if (!body.imageBase64 || body.imageBase64.length < 100) {
    return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
  }

  // 速率限制（视觉调用更贵，限制更严）
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, hasServerKey);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "今日体验次数已用完，明天再来吧（或在设置里填自己的 Key 解除限制）" },
      { status: 429 }
    );
  }

  const url = vision.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const dataUrl = body.imageBase64.startsWith("data:")
    ? body.imageBase64
    : `data:image/jpeg;base64,${body.imageBase64}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${vision.apiKey}` },
      body: JSON.stringify({
        model: vision.model,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "请描述这张图。" },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: "调用视觉模型失败：" + e.message }, { status: 502 });
  }

  if (!resp.ok) {
    const txt = await resp.text();
    return NextResponse.json(
      { error: `视觉模型返回 ${resp.status}: ${txt.slice(0, 400)}` },
      { status: 502 }
    );
  }

  const data: any = await resp.json();
  const description: string = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!description) {
    return NextResponse.json({ error: "视觉模型未返回描述" }, { status: 502 });
  }

  return NextResponse.json({ description, remaining: rl.remaining });
}

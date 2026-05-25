import { NextRequest, NextResponse } from "next/server";
import { VISION_SYSTEM_PROMPT } from "@/lib/prompt";

export const runtime = "edge";
export const maxDuration = 60;

type Body = {
  apiKey: string;
  baseUrl: string;
  model: string;
  imageBase64: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const { apiKey, baseUrl, model, imageBase64 } = body;
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({ error: "缺少 apiKey / baseUrl / model" }, { status: 400 });
  }
  if (!imageBase64 || imageBase64.length < 100) {
    return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
  }

  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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

  return NextResponse.json({ description });
}

import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, buildUserPrompt, type Persona } from "@/lib/prompt";
import { postprocess } from "@/lib/postprocess";

export const runtime = "edge";

type Body = {
  apiKey: string;
  baseUrl: string;
  model: string;
  visual_description: string;
  video_summary?: string;
  bgm?: string;
  bgm_mood?: string;
  creator_intent?: string;
  language?: string;
  persona?: Persona;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const { apiKey, baseUrl, model } = body;
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({ error: "缺少 apiKey / baseUrl / model" }, { status: 400 });
  }
  if (!body.visual_description || body.visual_description.trim().length < 5) {
    return NextResponse.json({ error: "请描述画面内容（至少 5 个字）" }, { status: 400 });
  }

  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const userContent = buildUserPrompt(body);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.95,
        top_p: 0.95,
        response_format: { type: "json_object" },
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: "调用大模型失败：" + e.message }, { status: 502 });
  }

  if (!resp.ok) {
    const txt = await resp.text();
    return NextResponse.json({ error: `模型返回 ${resp.status}: ${txt.slice(0, 400)}` }, { status: 502 });
  }

  const data: any = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content || "";
  if (!content) {
    return NextResponse.json({ error: "模型未返回内容" }, { status: 502 });
  }

  try {
    const result = postprocess(content);
    return NextResponse.json({ ...result, raw: content });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, raw: content }, { status: 500 });
  }
}

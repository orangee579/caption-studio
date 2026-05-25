import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const BGM_PROMPT = `你是 TikTok 的 BGM 推荐助手。根据画面描述，推荐 4 个**当下流行**的 BGM 方向。

【输出要求】
- 每条包含：曲名/片段（具体可搜索）、情绪标签（治愈/燃/反差/搞笑/emo/酷/甜/怀旧/悬疑 任一）、为什么适合（≤15字）
- 4 条情绪分布要差异化，不能 4 条都是治愈
- 优先 2024-2026 流行的 TikTok 热门 BGM、Remix、改编版本
- 中文画面优先推抖音/小红书火过的 BGM；英文画面推 TikTok US 流行
- 不要推 2020 之前的过气曲

【输出严格 JSON，不要 markdown】
{
  "bgms": [
    {"name": "曲名/片段", "mood": "情绪", "reason": "为什么适合"}
  ]
}`;

type Body = {
  apiKey: string;
  baseUrl: string;
  model: string;
  visual_description: string;
  language?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const { apiKey, baseUrl, model, visual_description, language } = body;
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({ error: "缺少配置" }, { status: 400 });
  }

  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const userMsg = `画面描述：\n${visual_description}\n\n语言地区：${language || "zh"}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: BGM_PROMPT },
          { role: "user", content: userMsg },
        ],
        temperature: 0.85,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
  if (!resp.ok) {
    const t = await resp.text();
    return NextResponse.json({ error: `${resp.status}: ${t.slice(0, 200)}` }, { status: 502 });
  }
  const data: any = await resp.json();
  const raw: string = data?.choices?.[0]?.message?.content || "";

  let bgms: any[] = [];
  try {
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed?.bgms)) bgms = parsed.bgms.slice(0, 4);
  } catch {}

  if (bgms.length === 0) {
    return NextResponse.json({ error: "解析失败", raw: raw.slice(0, 200) }, { status: 500 });
  }
  return NextResponse.json({ bgms });
}

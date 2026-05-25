import { NextRequest, NextResponse } from "next/server";
import { resolveKeys, checkRateLimit, getClientIp } from "@/lib/keys";

export const runtime = "edge";

const QUICK_PROMPT = `你是 TikTok 头部账号的文案策划。根据用户提供的画面描述，生成 5 条**互不相同**的短标题。

【硬性要求】
1. 每条 ≤ 18 字（中文）
2. 必须**紧贴画面**：每条都要引用画面中至少一个具体细节（物品/动作/场景/颜色/品牌名等），禁止脱离画面写空话
3. 前 3-5 字必须是钩子（数字 / 反常识 / 疑问 / 冲突 / 第一人称视角 选一）
4. 5 条互斥风格全覆盖：① 反差预期违背 ② 悬念抛问留白 ③ 共鸣痛点细节 ④ 玩梗借势热点 ⑤ 数字爆点种草
5. 第一人称视角优先，多用"我"、具体场景而不是宏大叙事

【禁用词清单（含变体一律不准出现）】
家人们、绝绝子、yyds、姐妹们冲、谁懂啊、真的会谢、栓Q、麻了、破防了、宝子们、笑死、老铁们、集美们、听我说谢谢你、DNA动了、蚌埠住了、啊这

【禁用句式】
- "在这个 XX 的时代"
- "让我们一起 XX"
- "不得不说 XX"
- "原来 XX 是这样的"（除非真的有反差，否则这是水文）
- "今天来分享 / 给大家推荐"
- 任何广告腔、总结陈词

【输出】
只返回严格 JSON，不要任何解释或 markdown：
{ "titles": ["...", "...", "...", "...", "..."] }

5 条标题之间不能有 5 字以上重叠，不能有意思相同的两条。`;

type Body = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  visual_description: string;
  persona?: {
    nickname?: string;
    identity?: string;
    vertical?: string;
    voice?: string;
    signature?: string;
    audience?: string;
  };
  user_brief?: string;
};

function personaText(p?: Body["persona"]): string {
  if (!p) return "";
  const fields = [
    p.identity && `身份: ${p.identity}`,
    p.vertical && `赛道: ${p.vertical}`,
    p.voice && `语气: ${p.voice}`,
    p.signature && `口头禅: ${p.signature}`,
    p.audience && `粉丝: ${p.audience}`,
  ].filter(Boolean);
  return fields.length > 0 ? fields.join("\n") : "";
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const { text, hasServerKey } = resolveKeys(body);
  if (!text.apiKey || !text.baseUrl || !text.model) {
    return NextResponse.json({ error: "未配置 API" }, { status: 400 });
  }
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, hasServerKey);
  if (!rl.allowed) {
    return NextResponse.json({ error: "今日体验次数已用完" }, { status: 429 });
  }

  const { visual_description, persona, user_brief } = body;
  const url = text.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const userMsg = [
    `画面描述：\n${visual_description}`,
    personaText(persona) && `\n创作者人设（语气和身份必须对齐）：\n${personaText(persona)}`,
    user_brief && `\n额外要求：\n${user_brief}`,
  ].filter(Boolean).join("\n");

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${text.apiKey}` },
      body: JSON.stringify({
        model: text.model,
        messages: [
          { role: "system", content: QUICK_PROMPT },
          { role: "user", content: userMsg },
        ],
        temperature: 0.95,
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

  let titles: string[] = [];
  try {
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed?.titles)) {
      titles = parsed.titles.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 5);
    }
  } catch {}
  if (titles.length === 0) {
    return NextResponse.json({ error: "解析失败", raw: raw.slice(0, 200) }, { status: 500 });
  }
  return NextResponse.json({ titles });
}

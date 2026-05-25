import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type Body = {
  apiKey: string;
  baseUrl: string;
  model: string;
  vision?: boolean;
};

// 16x16 白色 PNG（≥10px 才能过通义校验）
const TEST_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFElEQVR4nGP4TyJgGNUwqmH4agAAr639H708R/EAAAAASUVORK5CYII=";

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const { apiKey, baseUrl, model, vision } = body;
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({ ok: false, error: "缺少 apiKey / baseUrl / model" }, { status: 400 });
  }

  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";

  const messages = vision
    ? [
        {
          role: "user",
          content: [
            { type: "text", text: "请用一个汉字回复：好" },
            { type: "image_url", image_url: { url: TEST_PIXEL } },
          ],
        },
      ]
    : [{ role: "user", content: "请用一个汉字回复：好" }];

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0, max_tokens: 16 }),
    });
    const txt = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({
        ok: false,
        error: `${resp.status}: ${txt.slice(0, 300)}`,
      });
    }
    let data: any;
    try { data = JSON.parse(txt); } catch { data = null; }
    const content = data?.choices?.[0]?.message?.content || "";
    if (!content) {
      return NextResponse.json({ ok: false, error: "无返回内容：" + txt.slice(0, 200) });
    }
    return NextResponse.json({ ok: true, sample: String(content).slice(0, 80) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "网络错误：" + e.message });
  }
}

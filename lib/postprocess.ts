export type Caption = {
  style: string;
  hook: string;
  title: string;
  body: string;
  hashtags: string[];
  visual_anchor: string;
  trend_tag: string | null;
  persona_fit?: string;
  rationale: string;
  warnings?: string[];
};

const BANNED_WORDS = [
  "家人们", "绝绝子", "yyds", "姐妹们冲", "谁懂啊", "真的会谢",
  "真的栓Q", "栓Q", "麻了", "听我说谢谢你", "DNA动了", "破防了",
  "集美们", "宝子们", "啊这", "蚌埠住了", "笑死", "老铁们",
];

const REQUIRED_STYLES = ["反差", "悬念", "共鸣", "玩梗"];

function extractJson(raw: string): any {
  let txt = raw.trim();
  txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");
  if (start >= 0 && end > start) txt = txt.slice(start, end + 1);

  try {
    return JSON.parse(txt);
  } catch (e) {
    // 宽松修复：模型经常输出的几类非法 JSON
    let fixed = txt
      // 1. 全角引号 / 智能引号 → 半角双引号
      .replace(/[\u201c\u201d\u2018\u2019\uff02\uff07]/g, '"')
      // 2. 全角逗号、全角冒号 → 半角
      .replace(/\uff0c/g, ",")
      .replace(/\uff1a/g, ":")
      // 3a. 数组里 #"xxx"（# 在引号外）→ "#xxx"
      .replace(/([\[,])\s*#\s*"([^"]+?)"/g, '$1"#$2"')
      // 3b. 数组里裸露的 #xxx（无引号）→ "#xxx"
      .replace(/([\[,]\s*)#([\w\u4e00-\u9fa5\-]+)(\s*[,\]])/g, '$1"#$2"$3')
      // 3c. 防止上一步把已经带引号的搞坏：还原 ""#xxx"" → "#xxx"
      .replace(/""#([^"]+)""/g, '"#$1"')
      // 4. 单引号 key → 双引号
      .replace(/(\{|,)\s*'([^']+?)'\s*:/g, '$1"$2":')
      // 5. trailing comma
      .replace(/,(\s*[}\]])/g, "$1");

    try {
      return JSON.parse(fixed);
    } catch (e2) {
      // 实在不行就抛带原文的错误，方便定位
      const err: any = new Error("JSON 解析失败：" + (e2 as Error).message);
      err.raw = raw.slice(0, 800);
      throw err;
    }
  }
}

function checkNgramOverlap(a: string, b: string, n = 5): boolean {
  if (!a || !b) return false;
  for (let i = 0; i + n <= a.length; i++) {
    const gram = a.slice(i, i + n);
    if (b.includes(gram)) return true;
  }
  return false;
}

export function postprocess(rawText: string): {
  captions: Caption[];
  globalWarnings: string[];
} {
  const globalWarnings: string[] = [];
  let parsed: any;

  try {
    parsed = extractJson(rawText);
  } catch (e: any) {
    throw new Error("JSON 解析失败：" + e.message);
  }

  const arr: any[] = parsed.captions || [];
  if (arr.length !== 4) {
    globalWarnings.push(`期望 4 条候选，实际 ${arr.length} 条`);
  }

  const captions: Caption[] = arr.map((c, idx) => {
    const warnings: string[] = [];

    const style = String(c.style || "").trim();
    if (REQUIRED_STYLES[idx] && style !== REQUIRED_STYLES[idx]) {
      warnings.push(`位置 ${idx + 1} 期望 style=${REQUIRED_STYLES[idx]}，实际 ${style}`);
    }

    const title = String(c.title || "").trim();
    const body = String(c.body || "").trim();
    const hook = String(c.hook || "").trim();

    if ([...title].length > 20) warnings.push("title 超过 20 字");
    if ([...body].length > 80) warnings.push("body 超过 80 字");
    if ([...hook].length === 0) warnings.push("缺少 hook");

    for (const w of BANNED_WORDS) {
      if (title.includes(w) || body.includes(w)) {
        warnings.push(`命中禁用词：${w}`);
      }
    }

    let hashtags: string[] = Array.isArray(c.hashtags) ? c.hashtags : [];
    hashtags = hashtags
      .map((h: string) => String(h).trim())
      .filter(Boolean)
      .map((h: string) => (h.startsWith("#") ? h : "#" + h));
    hashtags = Array.from(new Set(hashtags)).slice(0, 5);
    if (hashtags.length < 3) warnings.push("hashtag 少于 3 个");
    const hasFyp = hashtags.some((h) => /^#(fyp|foryou|foryoupage)$/i.test(h));
    if (!hasFyp) warnings.push("缺少泛流量标签 #fyp");

    if (!c.visual_anchor || String(c.visual_anchor).trim().length === 0) {
      warnings.push("缺少素材锚点 visual_anchor");
    }

    return {
      style,
      hook,
      title,
      body,
      hashtags,
      visual_anchor: String(c.visual_anchor || "").trim(),
      trend_tag: c.trend_tag ?? null,
      persona_fit: String(c.persona_fit || "").trim(),
      rationale: String(c.rationale || "").trim(),
      warnings,
    };
  });

  for (let i = 0; i < captions.length; i++) {
    for (let j = i + 1; j < captions.length; j++) {
      if (checkNgramOverlap(captions[i].title, captions[j].title, 5)) {
        captions[i].warnings!.push(`title 与第 ${j + 1} 条 5-gram 重叠`);
      }
    }
  }

  return { captions, globalWarnings };
}

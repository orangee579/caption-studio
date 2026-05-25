"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsModal from "@/components/SettingsModal";
import PersonaModal, { type Persona } from "@/components/PersonaModal";
import CaptionCard from "@/components/CaptionCard";
import MediaUploader from "@/components/MediaUploader";
import { LANGUAGES } from "@/lib/languages";

const QUICK_BRIEFS = [
  "更年轻化，加点 GenZ 网感",
  "更高级，少俏皮多氛围感",
  "更夸张，制造强冲突",
  "更治愈，慢节奏氛围",
  "更带货导向，植入产品卖点",
  "纯第一人称碎碎念",
];

const MOOD_OPTIONS = ["治愈", "燃", "反差", "搞笑", "emo", "酷", "甜", "怀旧", "悬疑"];

type BgmRec = { name: string; mood: string; reason: string };

export default function CaptionStudio() {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);

  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [visualDescription, setVisualDescription] = useState("");
  const [language, setLanguage] = useState("zh");
  const [userBrief, setUserBrief] = useState("");
  const [bgm, setBgm] = useState("");
  const [bgmMood, setBgmMood] = useState("");
  const [bgmRecs, setBgmRecs] = useState<BgmRec[]>([]);
  const [bgmLoading, setBgmLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [error, setError] = useState("");
  const [captions, setCaptions] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [reidentifying, setReidentifying] = useState(false);

  function applyToEditor(c: any) {
    const payload = {
      title: c.title,
      body: c.body,
      hashtags: c.hashtags,
      ts: Date.now(),
    };
    // 直接用 localStorage（跨整页刷新最稳，sessionStorage 在某些浏览器隐私模式下不跨页）
    try {
      localStorage.setItem("tt_apply_caption", JSON.stringify(payload));
      sessionStorage.setItem("tt_apply_caption", JSON.stringify(payload));
    } catch {}
    // 强跳转，整页刷新
    window.location.href = "/";
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  useEffect(() => {
    setHasKey(!!localStorage.getItem("apiKey"));
    const savedPersona = localStorage.getItem("persona");
    if (savedPersona) { try { setPersona(JSON.parse(savedPersona)); } catch {} }

    // 多图：优先读 covers 数组
    const urlsRaw = sessionStorage.getItem("tt_editor_covers");
    if (urlsRaw) {
      try {
        const urls: string[] = JSON.parse(urlsRaw);
        if (Array.isArray(urls) && urls.length > 0) {
          setCoverUrls(urls);
          identifyAll(urls);
          return;
        }
      } catch {}
    }
    // 兼容单图
    const single = sessionStorage.getItem("tt_editor_cover");
    if (single) {
      setCoverUrls([single]);
      identifyAll([single]);
    }
  }, [settingsOpen, personaOpen]); // eslint-disable-line

  async function identifySingle(url: string): Promise<string> {
    const apiKey = localStorage.getItem("apiKey");
    const baseUrl = localStorage.getItem("baseUrl");
    const visionModel = localStorage.getItem("visionModel");
    const visionBaseUrl = localStorage.getItem("visionBaseUrl") || baseUrl;
    const visionApiKey = localStorage.getItem("visionApiKey") || apiKey;
    if (!visionApiKey || !visionBaseUrl || !visionModel) return "";
    try {
      const r = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: visionApiKey, baseUrl: visionBaseUrl, model: visionModel, imageBase64: url }),
      });
      const d = await r.json();
      if (r.ok && d.description) return d.description;
    } catch {}
    return "";
  }

  async function identifyAll(urls: string[]) {
    if (urls.length === 0) return;
    setReidentifying(true);
    try {
      const results = await Promise.all(urls.map((u) => identifySingle(u)));
      const merged = results
        .map((d, i) => d ? `画面 ${i + 1}：${d}` : "")
        .filter(Boolean)
        .join("\n\n");
      if (merged) {
        setVisualDescription(merged);
        sessionStorage.setItem("tt_editor_desc", merged);
        // 顺手推荐 BGM
        fetchBgmRecs(merged);
      }
    } finally {
      setReidentifying(false);
    }
  }

  async function fetchBgmRecs(desc: string) {
    const apiKey = localStorage.getItem("apiKey");
    const baseUrl = localStorage.getItem("baseUrl");
    const model = localStorage.getItem("model");
    if (!apiKey || !baseUrl || !model) return;
    setBgmLoading(true);
    try {
      const r = await fetch("/api/quick-bgm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, baseUrl, model, visual_description: desc, language }),
      });
      const d = await r.json();
      if (r.ok && Array.isArray(d.bgms)) setBgmRecs(d.bgms);
    } catch {} finally {
      setBgmLoading(false);
    }
  }

  function pickBgm(rec: BgmRec) {
    setBgm(rec.name);
    setBgmMood(rec.mood);
    showToast(`已选 BGM · ${rec.name}`);
  }

  async function generate() {
    setError("");
    setCaptions([]);

    const apiKey = localStorage.getItem("apiKey") || "";
    const baseUrl = localStorage.getItem("baseUrl") || "";
    const model = localStorage.getItem("model") || "";

    if (!apiKey || !baseUrl || !model) { setSettingsOpen(true); return; }
    if (visualDescription.trim().length < 5) {
      setError("缺少画面描述，请回首页上传图片或在下方手动补充");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey, baseUrl, model,
          visual_description: visualDescription,
          bgm, bgm_mood: bgmMood,
          creator_intent: userBrief,
          language,
          persona: persona || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errMsg = data.error || "生成失败";
        const rawSnippet = data.raw ? `\n\n模型原文片段:\n${String(data.raw).slice(0, 300)}` : "";
        setError(errMsg + rawSnippet);
      } else {
        setCaptions(data.captions || []);
        showToast(`生成 ${data.captions?.length || 0} 条候选`);
      }
    } catch (e: any) {
      setError("网络错误：" + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 进入页面后不自动生成，等用户主动点（用户反馈：自动生成反应不过来）
  // 切换语言时，已有结果就自动重新生成
  useEffect(() => {
    if (captions.length === 0) return;
    if (loading) return;
    generate();
  }, [language]); // eslint-disable-line

  const personaSummary = persona && persona.nickname
    ? `${persona.nickname}${persona.voice ? " · " + persona.voice : ""}`
    : null;

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 100px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <button
          onClick={() => router.push("/")}
          aria-label="返回"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--tt-line)", borderRadius: 12, width: 38, height: 38, color: "var(--tt-ink)", fontSize: 18, cursor: "pointer" }}
        >‹</button>
        <div style={{ textAlign: "center", flex: 1, marginLeft: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.2, fontFamily: "-apple-system, sans-serif" }}>
            <span style={{ background: "linear-gradient(135deg, #fe2c55, #25f4ee)", WebkitBackgroundClip: "text", color: "transparent" }}>Caption Studio</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--tt-mute)", marginTop: 2, letterSpacing: 1.5, textTransform: "uppercase" }}>
            for tiktok creators
          </div>
        </div>
        <button className="icon-btn" onClick={() => setSettingsOpen(true)}>⚙</button>
      </header>

      {/* 素材摘要条 - 多图横向滑动缩略图 */}
      {coverUrls.length > 0 ? (
        <div className="card" style={{ marginBottom: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--tt-mute)", letterSpacing: 0.3 }}>
              已识别 {coverUrls.length} 张画面 {reidentifying && <span style={{ color: "var(--tt-pink)" }}>· 识别中</span>}
            </div>
            <button className="icon-btn" onClick={() => identifyAll(coverUrls)} disabled={reidentifying} title="重新识别">↻</button>
          </div>
          <div className="scroll-x" style={{ display: "flex", gap: 8, marginBottom: 10, paddingBottom: 2 }}>
            {coverUrls.map((u, i) => (
              <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                <img src={u} alt="" style={{ width: 56, height: 72, borderRadius: 8, objectFit: "cover", border: "1px solid var(--tt-line)" }} />
                <span style={{ position: "absolute", top: 3, left: 3, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
          <div className="scroll-y" style={{ fontSize: 12, color: "var(--tt-sub)", lineHeight: 1.55, maxHeight: 80, overflow: "auto" }}>
            {visualDescription || "（识别中...）"}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 14, padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--tt-sub)", marginBottom: 8 }}>未从编辑页带入素材，请上传图片或手动描述</div>
          <MediaUploader onDescribed={(d) => { setVisualDescription(d); fetchBgmRecs(d); }} onToast={showToast} />
        </div>
      )}

      {/* 描述编辑 - 折叠 */}
      <details className="card" style={{ marginBottom: 14, padding: "10px 14px" }}>
        <summary style={{ fontSize: 13, color: "var(--tt-sub)", cursor: "pointer", listStyle: "none" }}>
          ✎ 编辑画面描述
        </summary>
        <textarea
          value={visualDescription}
          onChange={(e) => setVisualDescription(e.target.value)}
          style={{ marginTop: 8, minHeight: 80 }}
          placeholder="补充或修改画面识别结果..."
        />
      </details>

      {/* 人设按钮 */}
      <button
        onClick={() => setPersonaOpen(true)}
        style={{
          width: "100%",
          background: persona ? "rgba(162,89,255,0.10)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${persona ? "rgba(162,89,255,0.4)" : "var(--tt-line)"}`,
          borderRadius: 12,
          padding: "12px 14px",
          color: persona ? "#c794ff" : "var(--tt-sub)",
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 15 }}>👤</span>
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {personaSummary || "未设置人设 · 点击配置"}
        </span>
        <span style={{ fontSize: 11, color: "var(--tt-mute)" }}>›</span>
      </button>

      {/* 核心：用户额外要求 */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          <span style={{ color: "#fe2c55" }}>✦</span> 你想要什么样的？
          <span style={{ color: "var(--tt-mute)", fontWeight: 400, marginLeft: 4 }}>· 自由输入</span>
        </div>
        <textarea
          value={userBrief}
          onChange={(e) => setUserBrief(e.target.value)}
          placeholder={"例：\n· 偏小红书风格，姐妹种草感\n· 标题更悬念一点，让人想点进来\n· 突出第一次去主题店的兴奋"}
          style={{ minHeight: 76 }}
        />
        <div className="scroll-x" style={{ display: "flex", gap: 6, marginTop: 10, paddingBottom: 2 }}>
          {QUICK_BRIEFS.map((b) => (
            <button
              key={b}
              className="icon-btn"
              style={{ flexShrink: 0 }}
              onClick={() => setUserBrief(userBrief ? userBrief + "；" + b : b)}
            >
              + {b}
            </button>
          ))}
        </div>
      </div>

      {/* BGM 卡片 - 独立 + 自动推荐 */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="label" style={{ marginBottom: 10, justifyContent: "space-between" }}>
          <span><span style={{ color: "#fe2c55" }}>♫</span> BGM</span>
          {bgmLoading && <span style={{ fontSize: 11, color: "var(--tt-mute)" }}>AI 推荐中…</span>}
        </div>

        {bgmRecs.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--tt-mute)", marginBottom: 6 }}>AI 推荐 · 点击使用</div>
            <div className="scroll-x" style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
              {bgmRecs.map((r, i) => (
                <button
                  key={i}
                  onClick={() => pickBgm(r)}
                  style={{
                    flexShrink: 0,
                    background: "rgba(254,44,85,0.06)",
                    border: "1px solid rgba(254,44,85,0.25)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    cursor: "pointer",
                    minWidth: 160,
                    maxWidth: 220,
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--tt-ink)", fontWeight: 600, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--tt-sub)", display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ background: "rgba(254,44,85,0.15)", color: "#ff5577", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{r.mood}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>曲名</div>
            <input value={bgm} onChange={(e) => setBgm(e.target.value)} placeholder="手动输入或选上方推荐" />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>情绪</div>
            <select value={bgmMood} onChange={(e) => setBgmMood(e.target.value)}>
              <option value="">不指定</option>
              {MOOD_OPTIONS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {visualDescription && bgmRecs.length === 0 && !bgmLoading && (
          <button className="icon-btn" style={{ marginTop: 10 }} onClick={() => fetchBgmRecs(visualDescription)}>
            ♫ 让 AI 推荐 BGM
          </button>
        )}
      </div>

      {/* 语言卡片 - 独立 */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          <span style={{ color: "#fe2c55" }}>🌐</span> 输出语言
          <span style={{ color: "var(--tt-mute)", fontWeight: 400, marginLeft: 4 }}>
            · {LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.nativeLabel}
            {captions.length > 0 && <span style={{ marginLeft: 6, color: "#25f4ee" }}>· 切换自动重生成</span>}
          </span>
        </div>
        <div className="scroll-x" style={{ display: "flex", gap: 6, paddingBottom: 2 }}>
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" className="lang-chip" data-active={language === l.code} onClick={() => setLanguage(l.code)}>
              <span>{l.flag}</span><span>{l.nativeLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 生成按钮 */}
      <button className="primary" disabled={loading} onClick={generate}>
        {loading ? (
          <><span className="spinner" /><span>生成中…</span></>
        ) : captions.length > 0 ? (
          <><span style={{ fontSize: 18 }}>↻</span><span>换一批</span><span style={{ fontSize: 11, opacity: 0.9, fontWeight: 600, marginLeft: 2, padding: "2px 8px", background: "rgba(255,255,255,0.2)", borderRadius: 999 }}>4 条</span></>
        ) : (
          <><span style={{ fontSize: 18 }}>✦</span><span>生成爆款文案</span><span style={{ fontSize: 11, opacity: 0.9, fontWeight: 600, marginLeft: 2, padding: "2px 8px", background: "rgba(255,255,255,0.2)", borderRadius: 999 }}>4 条</span></>
        )}
      </button>

      {error && (
        <div style={{ marginTop: 14, padding: 12, background: "rgba(254,44,85,0.10)", border: "1px solid rgba(254,44,85,0.28)", borderRadius: 12, color: "#ff5577", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto", fontFamily: "ui-monospace, SF Mono, monospace" }}>
          {error}
        </div>
      )}

      {captions.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--tt-sub)", letterSpacing: 0.3 }}>
              候选文案 · 点"应用"回写到编辑页
            </h2>
          </div>
          {captions.map((c, i) => (
            <CaptionCard key={i} c={c} idx={i} onToast={showToast} onApply={applyToEditor} />
          ))}
        </section>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PersonaModal open={personaOpen} onClose={() => setPersonaOpen(false)} onSave={setPersona} />
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

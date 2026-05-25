"use client";
import { useEffect, useState } from "react";

const PRESETS = [
  { name: "DeepSeek + 通义视觉", baseUrl: "https://api.deepseek.com/v1", textModel: "deepseek-chat", visionModel: "", note: "推荐组合：文本走 DeepSeek，视觉需另填通义 Key" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", textModel: "deepseek-chat", visionModel: "", note: "无视觉模型，仅文本" },
  { name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", textModel: "qwen-plus", visionModel: "qwen-vl-max", note: "国内访问稳定 · 文本+视觉一站式" },
  { name: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", textModel: "glm-4-plus", visionModel: "glm-4v-plus", note: "支持图片视频" },
  { name: "月之暗面", baseUrl: "https://api.moonshot.cn/v1", textModel: "moonshot-v1-8k", visionModel: "moonshot-v1-8k-vision-preview", note: "视觉为 preview" },
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", textModel: "gpt-4o-mini", visionModel: "gpt-4o-mini", note: "需海外网络" },
];

type TestState = { status: "idle" | "loading" | "ok" | "err"; msg?: string };

export default function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [visionModel, setVisionModel] = useState("");
  const [visionBaseUrl, setVisionBaseUrl] = useState("");
  const [visionApiKey, setVisionApiKey] = useState("");
  const [textTest, setTextTest] = useState<TestState>({ status: "idle" });
  const [visionTest, setVisionTest] = useState<TestState>({ status: "idle" });

  useEffect(() => {
    if (open) {
      setBaseUrl(localStorage.getItem("baseUrl") || PRESETS[0].baseUrl);
      setApiKey(localStorage.getItem("apiKey") || "");
      setModel(localStorage.getItem("model") || PRESETS[0].textModel);
      setVisionModel(localStorage.getItem("visionModel") || "");
      setVisionBaseUrl(localStorage.getItem("visionBaseUrl") || "");
      setVisionApiKey(localStorage.getItem("visionApiKey") || "");
      setTextTest({ status: "idle" });
      setVisionTest({ status: "idle" });
    }
  }, [open]);

  if (!open) return null;

  function applyPreset(name: string) {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    setBaseUrl(p.baseUrl);
    setModel(p.textModel);
    setVisionModel(p.visionModel);
    // DeepSeek + 通义视觉组合预设
    if (p.name === "DeepSeek + 通义视觉") {
      setVisionBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1");
      setVisionModel("qwen-vl-max");
    } else {
      // 其他预设 vision 与 text 同 base 同 key
      setVisionBaseUrl("");
      setVisionApiKey("");
    }
    setTextTest({ status: "idle" });
    setVisionTest({ status: "idle" });
  }

  async function runTest(vision: boolean) {
    const setter = vision ? setVisionTest : setTextTest;
    const m = vision ? visionModel : model;
    // 视觉如果没单独填 base/key，就用主 base/key
    const usedBase = vision ? (visionBaseUrl || baseUrl) : baseUrl;
    const usedKey = vision ? (visionApiKey || apiKey) : apiKey;
    if (!usedKey || !usedBase || !m) {
      setter({ status: "err", msg: "请先填好 base URL / Key / 模型" });
      return;
    }
    setter({ status: "loading" });
    try {
      const r = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: usedKey, baseUrl: usedBase, model: m, vision }),
      });
      const data = await r.json();
      if (data.ok) {
        setter({ status: "ok", msg: `连通 · 模型回复: ${data.sample}` });
      } else {
        setter({ status: "err", msg: data.error || "测试失败" });
      }
    } catch (e: any) {
      setter({ status: "err", msg: e.message });
    }
  }

  function save() {
    localStorage.setItem("baseUrl", baseUrl.trim());
    localStorage.setItem("apiKey", apiKey.trim());
    localStorage.setItem("model", model.trim());
    localStorage.setItem("visionModel", visionModel.trim());
    localStorage.setItem("visionBaseUrl", visionBaseUrl.trim());
    localStorage.setItem("visionApiKey", visionApiKey.trim());
    onClose();
  }

  function renderTestResult(t: TestState) {
    if (t.status === "idle") return null;
    const colorMap = {
      loading: { bg: "rgba(255,255,255,0.06)", c: "#a8a8b3", border: "var(--tt-line)" },
      ok: { bg: "rgba(37,244,238,0.10)", c: "#25f4ee", border: "rgba(37,244,238,0.32)" },
      err: { bg: "rgba(254,44,85,0.10)", c: "#ff5577", border: "rgba(254,44,85,0.32)" },
    } as const;
    const cfg = colorMap[t.status];
    const text = t.status === "loading" ? "测试中..." : t.msg;
    return (
      <div style={{ marginTop: 8, padding: "8px 12px", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, fontSize: 12, color: cfg.c, lineHeight: 1.55 }}>
        {text}
      </div>
    );
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, background: "var(--tt-surface)",
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: 22, paddingBottom: 36, maxHeight: "92vh", overflowY: "auto",
          borderTop: "1px solid var(--tt-line-2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>模型设置</h2>
          <button className="ghost" onClick={onClose}>关闭</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--tt-sub)", marginBottom: 18 }}>
          Key 仅存浏览器本地，不会经过本站服务器
        </div>

        <div className="label">一键预设</div>
        <div className="scroll-x" style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
          {PRESETS.map((p) => (
            <button key={p.name} className="icon-btn" style={{ flexShrink: 0 }} onClick={() => applyPreset(p.name)}>
              {p.name}
            </button>
          ))}
        </div>

        <div className="label" style={{ marginTop: 16 }}>Base URL</div>
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com/v1" />

        <div className="label" style={{ marginTop: 14 }}>API Key</div>
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." type="password" />

        <div className="label" style={{ marginTop: 14, justifyContent: "space-between" }}>
          <span>文本模型 <span style={{ color: "var(--tt-mute)" }}>· 用于生成文案</span></span>
          <button className="icon-btn" onClick={() => runTest(false)} disabled={textTest.status === "loading"}>
            {textTest.status === "loading" ? "测试中" : "测试连接"}
          </button>
        </div>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat" />
        {renderTestResult(textTest)}

        <div className="label" style={{ marginTop: 16, justifyContent: "space-between" }}>
          <span>视觉模型 <span style={{ color: "var(--tt-mute)" }}>· 选填，图片/视频识别</span></span>
          <button className="icon-btn" onClick={() => runTest(true)} disabled={visionTest.status === "loading" || !visionModel}>
            {visionTest.status === "loading" ? "测试中" : "测试视觉"}
          </button>
        </div>
        <input value={visionModel} onChange={(e) => setVisionModel(e.target.value)} placeholder="qwen-vl-max / glm-4v-plus / gpt-4o-mini" />

        <details style={{ marginTop: 10 }} open>
          <summary style={{ fontSize: 12, color: "var(--tt-sub)", cursor: "pointer", padding: "4px 0" }}>
            视觉用不同厂商？（如 DeepSeek 文本 + 通义视觉）
          </summary>
          <div style={{ marginTop: 10, padding: 12, background: "rgba(255,255,255,0.02)", border: "1px solid var(--tt-line)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--tt-sub)", fontWeight: 500 }}>视觉 base URL</span>
              <button
                type="button"
                className="icon-btn"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => setVisionBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1")}
              >
                ↓ 一键填通义
              </button>
            </div>
            <input
              value={visionBaseUrl}
              onChange={(e) => setVisionBaseUrl(e.target.value)}
              placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
            />

            <div style={{ fontSize: 12, color: "var(--tt-sub)", fontWeight: 500, marginTop: 12, marginBottom: 6 }}>视觉 API Key</div>
            <input
              value={visionApiKey}
              onChange={(e) => setVisionApiKey(e.target.value)}
              placeholder="粘贴通义的 sk-... Key"
              type="password"
            />
            <div style={{ fontSize: 11, color: "var(--tt-mute)", marginTop: 8, lineHeight: 1.6 }}>
              💡 留空则视觉也用上方主 base URL / API Key
            </div>
          </div>
        </details>
        {renderTestResult(visionTest)}

        <div style={{ marginTop: 16, padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--tt-line)", borderRadius: 12, fontSize: 12, color: "var(--tt-sub)", lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, color: "var(--tt-ink)", marginBottom: 6 }}>📌 推荐组合：DeepSeek 文本 + 通义视觉</div>
          <div>1. 文本 Key：<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" style={{ color: "#25f4ee" }}>platform.deepseek.com/api_keys</a> (送 500 万 tokens)</div>
          <div>2. 视觉 Key：<a href="https://bailian.console.aliyun.com/?apiKey=1" target="_blank" rel="noreferrer" style={{ color: "#25f4ee" }}>bailian.console.aliyun.com</a> (送 100 万 tokens)</div>
          <div style={{ marginTop: 8, fontWeight: 600, color: "var(--tt-ink)" }}>其他可选：</div>
          <div>· 智谱 GLM：<a href="https://open.bigmodel.cn/" target="_blank" rel="noreferrer" style={{ color: "#25f4ee" }}>open.bigmodel.cn</a></div>
          <div>· 月之暗面：<a href="https://platform.moonshot.cn/" target="_blank" rel="noreferrer" style={{ color: "#25f4ee" }}>platform.moonshot.cn</a></div>
          <div>· OpenAI：<a href="https://platform.openai.com/" target="_blank" rel="noreferrer" style={{ color: "#25f4ee" }}>platform.openai.com</a></div>
        </div>

        <button className="primary" style={{ marginTop: 22 }} onClick={save}>保存</button>
      </div>
    </div>
  );
}

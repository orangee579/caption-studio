"use client";
import { useState } from "react";

type Caption = {
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

const STYLE_META: Record<string, { color: string; bg: string; emoji: string }> = {
  反差: { color: "#fe2c55", bg: "rgba(254,44,85,0.14)", emoji: "↯" },
  悬念: { color: "#ffb84d", bg: "rgba(255,184,77,0.14)", emoji: "?" },
  共鸣: { color: "#25f4ee", bg: "rgba(37,244,238,0.12)", emoji: "♡" },
  玩梗: { color: "#a259ff", bg: "rgba(162,89,255,0.14)", emoji: "★" },
};

export default function CaptionCard({
  c,
  idx,
  onToast,
  onApply,
}: {
  c: Caption;
  idx: number;
  onToast: (msg: string) => void;
  onApply?: (c: Caption) => void;
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const meta = STYLE_META[c.style] || { color: "#8a8a96", bg: "rgba(255,255,255,0.06)", emoji: "•" };

  function copyAll() {
    const text = `${c.title}\n\n${c.body}\n\n${c.hashtags.join(" ")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      onToast("文案已复制");
      setTimeout(() => setCopiedAll(false), 1500);
    });
  }

  function copyTitle() {
    navigator.clipboard.writeText(c.title);
    onToast("标题已复制");
  }

  return (
    <div className="card" style={{ marginBottom: 12, position: "relative", borderColor: "var(--tt-line)" }}>
      <div style={{ position: "absolute", top: 0, left: 18, right: 18, height: 2, background: meta.color, borderRadius: 2 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="style-pill" style={{ background: meta.bg, color: meta.color }}>
            {meta.emoji} {c.style}
          </span>
          <span style={{ fontSize: 11, color: "var(--tt-mute)", fontWeight: 600 }}>0{idx + 1}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ghost" onClick={copyAll} style={{ padding: "6px 12px" }}>
            {copiedAll ? "✓ 已复制" : "复制"}
          </button>
          {onApply && (
            <button
              onClick={() => onApply(c)}
              style={{ padding: "6px 14px", background: "var(--tt-pink)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              应用 →
            </button>
          )}
        </div>
      </div>

      <div
        onClick={copyTitle}
        style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, lineHeight: 1.35, letterSpacing: -0.2, cursor: "pointer" }}
      >
        {c.title}
      </div>

      <div style={{ fontSize: 14, color: "#dcdce2", marginBottom: 12, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
        {c.body}
      </div>

      <div style={{ marginBottom: 4 }}>
        {c.hashtags.map((h) => <span key={h} className="tag brand">{h}</span>)}
      </div>

      <hr className="tt-divider" />

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 12, color: "var(--tt-sub)", lineHeight: 1.7 }}>
        <span style={{ color: "var(--tt-mute)" }}>钩子</span><span>{c.hook}</span>
        <span style={{ color: "var(--tt-mute)" }}>素材</span><span>{c.visual_anchor}</span>
        {c.trend_tag && (<><span style={{ color: "var(--tt-mute)" }}>潮流</span><span>{c.trend_tag}</span></>)}
        {c.persona_fit && (<><span style={{ color: "var(--tt-mute)" }}>人设</span><span style={{ color: "#c794ff" }}>{c.persona_fit}</span></>)}
        <span style={{ color: "var(--tt-mute)" }}>爆点</span><span>{c.rationale}</span>
      </div>

      {c.warnings && c.warnings.length > 0 && (
        <div style={{ marginTop: 12, padding: 10, background: "rgba(255,184,77,0.08)", border: "1px solid rgba(255,184,77,0.22)", borderRadius: 10, fontSize: 12, color: "#ffb84d", lineHeight: 1.6 }}>
          {c.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}
    </div>
  );
}

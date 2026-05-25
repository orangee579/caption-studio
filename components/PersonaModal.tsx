"use client";
import { useEffect, useState } from "react";

export type Persona = {
  nickname: string;
  identity: string;
  vertical: string;
  voice: string;
  signature: string;
  audience: string;
};

const EMPTY: Persona = { nickname: "", identity: "", vertical: "", voice: "", signature: "", audience: "" };

const VOICE_PRESETS = ["毒舌幽默", "温柔治愈", "高能燃系", "知性理性", "沙雕搞怪", "酷帅疏离", "甜系少女", "成熟稳重"];
const VERTICAL_PRESETS = ["生活Vlog", "穿搭", "美食", "旅行", "职场", "学习", "情感", "宠物", "健身", "数码", "影视", "音乐"];

export default function PersonaModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (p: Persona) => void;
}) {
  const [p, setP] = useState<Persona>(EMPTY);

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("persona");
      setP(saved ? JSON.parse(saved) : EMPTY);
    }
  }, [open]);

  function save() {
    localStorage.setItem("persona", JSON.stringify(p));
    onSave(p);
    onClose();
  }

  function clear() {
    localStorage.removeItem("persona");
    setP(EMPTY);
    onSave(EMPTY);
    onClose();
  }

  if (!open) return null;

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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>创作者人设</h2>
          <button className="ghost" onClick={onClose}>关闭</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--tt-sub)", marginBottom: 18 }}>
          填一次，每次生成自动注入 prompt，让文案更像你
        </div>

        <div className="label">昵称 / IP 名</div>
        <input value={p.nickname} onChange={(e) => setP({ ...p, nickname: e.target.value })} placeholder="例：阿橘的日常" />

        <div className="label" style={{ marginTop: 14 }}>身份 / 人物标签</div>
        <input value={p.identity} onChange={(e) => setP({ ...p, identity: e.target.value })} placeholder="例：广州25岁打工人 / 留学法国大三女生" />

        <div className="label" style={{ marginTop: 14 }}>主打赛道</div>
        <input value={p.vertical} onChange={(e) => setP({ ...p, vertical: e.target.value })} placeholder="例：生活Vlog · 穿搭" />
        <div className="scroll-x" style={{ display: "flex", gap: 6, marginTop: 8, paddingBottom: 4 }}>
          {VERTICAL_PRESETS.map((v) => (
            <button key={v} className="icon-btn" style={{ flexShrink: 0 }} onClick={() => setP({ ...p, vertical: p.vertical ? p.vertical + " · " + v : v })}>
              + {v}
            </button>
          ))}
        </div>

        <div className="label" style={{ marginTop: 16 }}>语气 / Tone</div>
        <input value={p.voice} onChange={(e) => setP({ ...p, voice: e.target.value })} placeholder="例：毒舌幽默 + 接地气" />
        <div className="scroll-x" style={{ display: "flex", gap: 6, marginTop: 8, paddingBottom: 4 }}>
          {VOICE_PRESETS.map((v) => (
            <button key={v} className="icon-btn" style={{ flexShrink: 0 }} onClick={() => setP({ ...p, voice: v })}>
              {v}
            </button>
          ))}
        </div>

        <div className="label" style={{ marginTop: 16 }}>口头禅 / 标志性表达（选填）</div>
        <input value={p.signature} onChange={(e) => setP({ ...p, signature: e.target.value })} placeholder="例：开头爱说『家人们我跟你说...』、结尾常带『你品』" />

        <div className="label" style={{ marginTop: 14 }}>核心粉丝画像（选填）</div>
        <input value={p.audience} onChange={(e) => setP({ ...p, audience: e.target.value })} placeholder="例：18-25 岁女生、爱旅行的打工人" />

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="ghost" style={{ flex: 1 }} onClick={clear}>清空</button>
          <button className="primary" style={{ flex: 2 }} onClick={save}>保存人设</button>
        </div>
      </div>
    </div>
  );
}

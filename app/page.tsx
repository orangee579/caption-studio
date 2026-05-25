"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import s from "./editor.module.css";

type CoverItem = { url: string; type: "image" | "video"; file?: File };

const FALLBACK_TITLES = [
  "封面是真的拉满了",
  "这一幕拍出来朋友圈疯抢",
  "猜猜我花了多少钱",
  "本月最值得回购",
  "原来这才是正确打开方式",
];

function EditorPage() {
  const router = useRouter();
  const params = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [covers, setCovers] = useState<CoverItem[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [recommendedTags, setRecommendedTags] = useState<string[]>([]);
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [appliedToast, setAppliedToast] = useState("");
  const [showSettingsHint, setShowSettingsHint] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  // 检查是否配置了 API（服务端环境变量优先，否则看用户 localStorage）
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.hasServerText && cfg.hasServerVision) {
          // 服务端已内置 Key，不需要提示
          setShowSettingsHint(false);
          return;
        }
        // 未内置 → 看用户是否配置了
        const hasKey = !!localStorage.getItem("apiKey");
        const hasModel = !!localStorage.getItem("model");
        const dismissed = localStorage.getItem("hint_dismissed");
        setShowSettingsHint(!hasKey || !hasModel ? !dismissed : false);
      })
      .catch(() => {
        const hasKey = !!localStorage.getItem("apiKey");
        const hasModel = !!localStorage.getItem("model");
        const dismissed = localStorage.getItem("hint_dismissed");
        setShowSettingsHint(!hasKey || !hasModel ? !dismissed : false);
      });
  }, []);

  // 初始化：优先应用 AI 文案，没有则恢复草稿
  useEffect(() => {
    // 1. 优先：来自生成器页的"应用"（localStorage 主存）
    let applyRaw = localStorage.getItem("tt_apply_caption");
    if (!applyRaw) applyRaw = sessionStorage.getItem("tt_apply_caption");
    let applied = false;
    if (applyRaw) {
      try {
        const c = JSON.parse(applyRaw);
        if (c && (c.title || c.body)) {
          setTitle(c.title || "");
          setDesc(c.body || "");
          const tags: string[] = Array.isArray(c.hashtags) ? c.hashtags : [];
          setRecommendedTags(tags);
          setHashtags(tags); // 默认全部选中
          localStorage.removeItem("tt_apply_caption");
          sessionStorage.removeItem("tt_apply_caption");
          sessionStorage.setItem("tt_just_applied", "1");
          setJustApplied(true);
          applied = true;
        }
      } catch {}
    }

    // 2. 恢复图片（无论是否应用了 AI 文案，图片都要保留）
    const coversRaw = localStorage.getItem("tt_editor_covers_data");
    if (coversRaw) {
      try {
        const arr = JSON.parse(coversRaw);
        if (Array.isArray(arr) && arr.length > 0) {
          setCovers(arr.map((url: string) => ({ url, type: "image" as const })));
        }
      } catch {}
    }

    // 3. 兜底：恢复上次草稿（仅当没应用 AI 文案时）
    if (!applied) {
      const draftRaw = localStorage.getItem("tt_editor_draft");
      if (draftRaw) {
        try {
          const d = JSON.parse(draftRaw);
          if (d.title) setTitle(d.title);
          if (d.desc) setDesc(d.desc);
          if (Array.isArray(d.hashtags)) setHashtags(d.hashtags);
        } catch {}
      }
    }
  }, []); // eslint-disable-line

  // 自动持久化封面（每次 covers 变化时存）
  useEffect(() => {
    if (covers.length === 0) {
      localStorage.removeItem("tt_editor_covers_data");
      return;
    }
    try {
      const urls = covers.map((c) => c.url);
      localStorage.setItem("tt_editor_covers_data", JSON.stringify(urls));
    } catch (e) {
      // localStorage 满了（图片太多 base64 太大）
      console.warn("封面持久化失败，可能 localStorage 配额不足");
    }
  }, [covers]);

  function saveDraft() {
    localStorage.setItem("tt_editor_draft", JSON.stringify({ title, desc, hashtags }));
    setAppliedToast("已存为草稿");
    setTimeout(() => setAppliedToast(""), 1800);
  }

  async function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  async function captureFrame(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const v = videoElRef.current!;
      v.src = url;
      v.muted = true;
      v.playsInline = true;
      v.onloadeddata = () => { v.currentTime = Math.min(0.8, (v.duration || 1) * 0.25); };
      v.onseeked = () => {
        const canvas = canvasRef.current!;
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        canvas.getContext("2d")!.drawImage(v, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("视频读取失败")); };
    });
  }

  async function compress(dataUrl: string, max = 1024): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = dataUrl;
    });
  }

  async function onPickFiles(files: FileList) {
    const arr = Array.from(files);
    const picked: CoverItem[] = [];
    for (const f of arr) {
      const isVideo = f.type.startsWith("video/");
      const isImage = f.type.startsWith("image/");
      if (!isVideo && !isImage) continue;
      try {
        let frame: string;
        if (isVideo) {
          frame = await captureFrame(f);
        } else {
          const raw = await readFile(f);
          frame = await compress(raw, 1024);
        }
        picked.push({ url: frame, type: isVideo ? "video" : "image", file: f });
      } catch {}
    }
    if (picked.length === 0) return;

    const isFirstBatch = covers.length === 0;
    setCovers((prev) => [...prev, ...picked].slice(0, 35));

    if (isFirstBatch && picked[0]) {
      fetchAiTitles(picked[0].url);
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  function removeCover(idx: number) {
    setCovers((prev) => prev.filter((_, i) => i !== idx));
  }

  async function fetchAiTitles(imageDataUrl: string) {
    const apiKey = localStorage.getItem("apiKey") || "";
    const baseUrl = localStorage.getItem("baseUrl") || "";
    const visionModel = localStorage.getItem("visionModel") || "";
    const visionBaseUrl = localStorage.getItem("visionBaseUrl") || baseUrl;
    const visionApiKey = localStorage.getItem("visionApiKey") || apiKey;
    const textModel = localStorage.getItem("model") || "";

    setAiLoading(true);
    setAiTitles([]);
    try {
      // 视觉识别（服务端有 Key 就传空，让后端用环境变量）
      let visualDescription = "";
      const visionResp = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: visionApiKey,
          baseUrl: visionBaseUrl,
          model: visionModel,
          visionApiKey: visionApiKey,
          visionBaseUrl: visionBaseUrl,
          imageBase64: imageDataUrl,
        }),
      });
      const visionData = await visionResp.json();
      if (visionResp.ok && visionData.description) {
        visualDescription = visionData.description;
        sessionStorage.setItem("tt_editor_desc", visualDescription);
      }
      if (!visualDescription) {
        visualDescription = "用户上传了一张视频封面/图片，待识别";
      }

      const resp = await fetch("/api/quick-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey, baseUrl, model: textModel,
          visual_description: visualDescription,
          persona: (() => {
            const raw = localStorage.getItem("persona");
            if (!raw) return undefined;
            try { return JSON.parse(raw); } catch { return undefined; }
          })(),
        }),
      });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.titles)) {
        setAiTitles(data.titles.slice(0, 5));
      } else {
        setAiTitles(FALLBACK_TITLES.slice(0, 3));
      }
    } catch {
      setAiTitles(FALLBACK_TITLES.slice(0, 3));
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiTitle(t: string) {
    setTitle(t);
    setAppliedToast("标题已填入");
    setTimeout(() => setAppliedToast(""), 1500);
  }

  function goAgent() {
    if (covers.length > 0) {
      // 把所有图都传过去，让 /agent 多图识别
      const urls = covers.map((c) => c.url);
      sessionStorage.setItem("tt_editor_covers", JSON.stringify(urls));
      sessionStorage.setItem("tt_editor_cover", covers[0].url); // 兼容老逻辑
    } else {
      sessionStorage.removeItem("tt_editor_covers");
      sessionStorage.removeItem("tt_editor_cover");
    }
    sessionStorage.removeItem("tt_editor_desc"); // 让 /agent 自己重识别（多图合并）
    router.push("/agent");
  }

  return (
    <div className={s.page} data-theme="light">
      <div className={s.statusBar}>
        <span>18:04 ☾</span>
        <div className={s.statusRight}>
          <span style={{ fontSize: 13 }}>•••</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>5G</span>
          <span className={s.battery}><span /></span>
        </div>
      </div>

      <button className={s.backBtn} onClick={() => history.back()} aria-label="返回">‹</button>

      {showSettingsHint && (
        <div style={{ margin: "0 16px 14px", padding: 14, background: "linear-gradient(135deg, #fff5f7, #f0fcfb)", border: "1px solid #ffd5de", borderRadius: 12, fontSize: 13, color: "#161823", lineHeight: 1.6, position: "relative" }}>
          <div style={{ fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: "linear-gradient(135deg,#fe2c55,#ff7e3e)", WebkitBackgroundClip: "text", color: "transparent" }}>✦</span>
            <span>3 步开启 AI 文案</span>
          </div>
          <div style={{ fontSize: 12, color: "#5a5a64" }}>
            ① 领 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" style={{ color: "#fe2c55", textDecoration: "underline" }}>DeepSeek Key</a>（送 500 万 tokens）<br />
            ② 领 <a href="https://bailian.console.aliyun.com/?apiKey=1" target="_blank" rel="noreferrer" style={{ color: "#fe2c55", textDecoration: "underline" }}>通义视觉 Key</a>（送 100 万 tokens）<br />
            ③ 点开 <span onClick={() => router.push("/agent")} style={{ color: "#fe2c55", textDecoration: "underline", cursor: "pointer" }}>设置 ⚙</span> → 选 "DeepSeek + 通义视觉" → 粘贴 Key → 测试
          </div>
          <button
            onClick={() => { localStorage.setItem("hint_dismissed", "1"); setShowSettingsHint(false); }}
            style={{ position: "absolute", top: 8, right: 10, background: "transparent", border: "none", color: "#8a8b91", fontSize: 18, cursor: "pointer", padding: 4 }}
            aria-label="关闭"
          >×</button>
        </div>
      )}

      {covers.length === 0 ? (
        <div className={s.uploadEmpty} onClick={() => fileRef.current?.click()}>
          <div className={s.uploadEmptyTitle}>点击上传图片或视频</div>
          <div className={s.uploadEmptyHint}>支持多选 · jpg / png / mp4 / mov</div>
        </div>
      ) : (
        <div className={s.coverRow}>
          {covers.map((c, i) => (
            <div key={i} className={s.coverItem}>
              <img src={c.url} alt="" />
              {i === 0 && <div className={s.coverBadge}>封面</div>}
              <button
                className={s.coverRemove}
                onClick={(e) => { e.stopPropagation(); removeCover(i); }}
                aria-label="删除"
                title="删除"
              >×</button>
            </div>
          ))}
          {covers.length < 35 && (
            <button className={s.addCover} onClick={() => fileRef.current?.click()} aria-label="添加">+</button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { const fs = e.target.files; if (fs && fs.length) onPickFiles(fs); }}
      />
      <video ref={videoElRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <input
        className={s.titleInput}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="添加一个吸睛标题"
        maxLength={50}
      />

      {(aiTitles.length > 0 || aiLoading) && (
        <div className={s.aiRecommendBar}>
          <div className={s.aiRecommendHead}>
            <span className={s.aiLabel}>
              <span className={s.aiSparkle}>✦</span>
              <span>AI 推荐</span>
            </span>
            <button className={s.aiEntryBtn} onClick={goAgent}>
              更多 ›
            </button>
          </div>
          {aiLoading && <div className={s.aiChipLoading}>分析画面中...</div>}
          {!aiLoading && (
            <div className={s.aiChips}>
              {aiTitles.slice(0, 3).map((t, i) => (
                <button key={i} className={s.aiChip} onClick={() => applyAiTitle(t)} title={t}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <textarea
        className={s.descInput}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="撰写详细的描述有助于将浏览量平均提高 3 倍以上。"
      />

      {recommendedTags.length > 0 && (
        <div className={s.hashtagBar}>
          {recommendedTags.map((h) => {
            const selected = hashtags.includes(h);
            return (
              <button
                key={h}
                type="button"
                className={`${s.hashtagChip} ${selected ? s.hashtagChipSelected : ""}`}
                onClick={() => {
                  if (selected) {
                    setHashtags(hashtags.filter((x) => x !== h));
                  } else {
                    setHashtags([...hashtags, h]);
                  }
                }}
              >
                {h}
              </button>
            );
          })}
        </div>
      )}

      <div className={s.tagsRow}>
        <button className={s.tagPill} onClick={() => setDesc(desc + " #")}># 话题标签</button>
        <button className={s.tagPill} onClick={() => setDesc(desc + " @")}>@ 提及</button>
        <button className={s.expandBtn} onClick={goAgent} aria-label="AI 文案" title="AI 文案">
          <span style={{ background: "linear-gradient(135deg,#fe2c55,#ff7e3e)", WebkitBackgroundClip: "text", color: "transparent", fontWeight: 700 }}>✦</span>
        </button>
      </div>

      {justApplied && (
        <div style={{ margin: "0 18px 12px", padding: "10px 14px", background: "#fff5f7", border: "1px solid #ffd5de", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ fontSize: 14 }}>✦</span>
          <span style={{ flex: 1, color: "#161823" }}>已应用 AI 文案</span>
          <button
            onClick={() => router.push("/agent")}
            style={{ background: "transparent", border: "1px solid #fe2c55", color: "#fe2c55", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            返回换一条 ›
          </button>
          <button
            onClick={() => { sessionStorage.removeItem("tt_just_applied"); setJustApplied(false); }}
            style={{ background: "transparent", border: "none", color: "#8a8b91", fontSize: 16, cursor: "pointer", padding: "0 4px" }}
            aria-label="关闭"
          >×</button>
        </div>
      )}

      <div className={s.optionRow}>
        <span className={s.optionIcon}>◎</span>
        <div className={s.optionMain}>
          <div className={s.optionTitle}>位置 <span style={{ color: "#c0c0c5", fontSize: 12 }}>ⓘ</span></div>
          <div className={s.optionSub}>尝试搜索一个位置</div>
        </div>
        <span className={s.optionArrow}>›</span>
      </div>

      <div className={s.optionRow}>
        <span className={s.optionIcon}>⊕</span>
        <div className={s.optionMain}>
          <div className={s.optionTitle}>所有人都可以查看这条发布内容</div>
        </div>
        <span className={s.optionArrow}>›</span>
      </div>

      <div className={s.optionRow}>
        <span className={s.optionIcon}>⋯</span>
        <div className={s.optionMain}>
          <div className={s.optionTitle}>更多选项</div>
          <div className={s.optionSub}>隐私及更多设置已移动到这里。</div>
        </div>
        <span className={s.optionArrow}>›</span>
      </div>

      <div className={s.shareRow}>
        <div className={s.shareLabel}>
          <span>↗</span>
          <span>分享到</span>
        </div>
        <div className={s.shareIcons}>
          <div className={s.shareIcon} style={{ background: "#1877f2", color: "#fff" }}>f</div>
          <div className={s.shareIcon} style={{ background: "#e8e8eb" }}>💬</div>
        </div>
      </div>

      <div className={s.bottomBar}>
        <button className={s.draftBtn} onClick={saveDraft}>
          <span style={{ fontSize: 16 }}>▭</span>
          <span>草稿</span>
        </button>
        <button className={s.publishBtn} onClick={() => setAppliedToast("Demo · 暂未对接发布")}>
          <span style={{ fontSize: 16 }}>✦</span>
          <span>发布</span>
        </button>
      </div>

      {appliedToast && <div className={s.appliedToast}>{appliedToast}</div>}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#8a8b91" }}>加载中...</div>}>
      <EditorPage />
    </Suspense>
  );
}

"use client";
import { useRef, useState } from "react";

export default function MediaUploader({
  onDescribed,
  onToast,
}: {
  onDescribed: (desc: string) => void;
  onToast: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<"image" | "video" | null>(null);

  function reset() {
    setThumb(null);
    setType(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function compressImage(dataUrl: string, maxSize = 1024): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = dataUrl;
    });
  }

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function captureVideoFrame(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const v = videoRef.current!;
      v.src = url;
      v.muted = true;
      v.playsInline = true;
      v.onloadeddata = () => {
        v.currentTime = Math.min(1.0, (v.duration || 1) * 0.3);
      };
      v.onseeked = () => {
        const canvas = canvasRef.current!;
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(v, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("视频读取失败")); };
    });
  }

  async function handleFile(file: File) {
    const apiKey = localStorage.getItem("apiKey") || "";
    const baseUrl = localStorage.getItem("baseUrl") || "";
    const visionModel = localStorage.getItem("visionModel") || "";
    const visionBaseUrl = localStorage.getItem("visionBaseUrl") || baseUrl;
    const visionApiKey = localStorage.getItem("visionApiKey") || apiKey;

    // 没本地 Key 时检查服务端是否有 Key
    if (!apiKey || !visionModel) {
      try {
        const cfg = await fetch("/api/config").then((r) => r.json());
        if (!cfg.hasServerVision) {
          onToast("先到右上角设置 API");
          return;
        }
      } catch {
        onToast("先到右上角设置 API");
        return;
      }
    }

    setBusy(true);
    try {
      let dataUrl: string;
      if (file.type.startsWith("video/")) {
        setType("video");
        dataUrl = await captureVideoFrame(file);
      } else if (file.type.startsWith("image/")) {
        setType("image");
        const raw = await readFile(file);
        dataUrl = await compressImage(raw, 1024);
      } else {
        onToast("仅支持图片或视频");
        setBusy(false);
        return;
      }
      setThumb(dataUrl);

      const resp = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: visionApiKey, baseUrl: visionBaseUrl, model: visionModel, imageBase64: dataUrl }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        onToast(data.error || "识别失败");
      } else {
        onDescribed(data.description);
        onToast(file.type.startsWith("video/") ? "已抽取视频首帧并识别" : "图片已识别");
      }
    } catch (e: any) {
      onToast("处理失败：" + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        className={`dropzone ${thumb ? "has-file" : ""}`}
        onClick={() => fileRef.current?.click()}
      >
        {!thumb && !busy && (
          <>
            <div style={{ fontSize: 22, marginBottom: 6 }}>📸</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>上传图片或视频自动识别</div>
            <div style={{ fontSize: 12, color: "var(--tt-mute)", marginTop: 4 }}>
              视频自动抽取首帧 · 仅在浏览器本地处理
            </div>
          </>
        )}
        {busy && (
          <div style={{ padding: 8 }}>
            <span className="spinner" />
            <span style={{ marginLeft: 10, fontSize: 13, color: "var(--tt-sub)" }}>正在识别画面...</span>
          </div>
        )}
        {thumb && !busy && (
          <div onClick={(e) => e.stopPropagation()}>
            <img src={thumb} alt="" className="thumb" />
            <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center" }}>
              <button className="ghost" onClick={() => fileRef.current?.click()}>换一个</button>
              <button className="ghost" onClick={reset}>清除</button>
              <span className="tag cyan" style={{ marginLeft: 4 }}>{type === "video" ? "视频首帧" : "图片"}</span>
            </div>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

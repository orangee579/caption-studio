# Caption Studio

AI-powered caption studio for TikTok creators. 把素材（图片 / 视频 / BGM）一键变成爆款文案。

## 功能

- 📷 多图 / 视频上传，自动抽帧识别画面
- ✦ AI 推荐 3 个互斥风格的标题（反差 / 悬念 / 共鸣 / 玩梗 / 数字爆点）
- 🎨 4 条候选文案 + 创作者人设对齐
- ♫ 自动推荐当下流行 BGM
- 🌐 13 种语言，每种自带本地 TT 调性
- 📋 抖音同款标签 chip，可勾选取消
- 💾 草稿自动保存

## 技术栈

- Next.js 14 App Router + TypeScript
- Vercel Edge Runtime（API 路由）
- BYOK 架构（用户自带 Key，零服务端成本）
- 兼容 OpenAI 协议（DeepSeek / 通义 / 智谱 / Kimi / OpenAI）

## 本地开发

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

## 部署到 Vercel

```bash
# 1. 推送到 GitHub
git init
git add .
git commit -m "feat: caption studio"
git branch -M main
git remote add origin git@github.com:<your-username>/caption-studio.git
git push -u origin main

# 2. 打开 https://vercel.com/new → Import 这个仓库 → Deploy
# 3. 部署完成后拿到 https://xxx.vercel.app 域名
```

## 移动端使用

1. 手机浏览器（Safari / Chrome）打开 Vercel 域名
2. **iOS**：分享按钮 → "添加到主屏幕"
3. **Android**：右上菜单 → "安装应用"
4. 主屏出现 Caption 图标，点开**全屏运行**像原生 App

## API 配置

进入设置（编辑页 → AI ✨ 进 Studio → 右上 ⚙）：

| 用途 | 推荐 | 申请 |
|---|---|---|
| 文本生成 | DeepSeek (`deepseek-chat`) | https://platform.deepseek.com/api_keys (送 500 万 tokens) |
| 视觉识别 | 通义 (`qwen-vl-max`) | https://bailian.console.aliyun.com (送 100 万 tokens) |

Key 仅存浏览器 localStorage，本站服务器不接触。

## 路由

- `/` - TikTok 风格的发布编辑页（主入口）
- `/agent` - Caption Studio 文案工坊（点 ✦ 进入）

## License

MIT

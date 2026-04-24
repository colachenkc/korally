# Match Monitor Web (Next.js)

## Setup

```bash
cd apps/web
npm install
cp .env.local.example .env.local  # 如需覆寫 API base
```

## Run

```bash
npm run dev
```

打開 http://localhost:3000

首頁會呼叫後端 `GET /api/v1/tournaments`，請先啟動 `apps/api` 的 FastAPI server。

## Deploy to Vercel

1. 在 [vercel.com](https://vercel.com) 登入，**Add New → Project** 選這個 GitHub repo。
2. **Root Directory** 設為 `apps/web`（Vercel 會自動偵測 Next.js）。
3. **Environment Variables** 加：
   - `NEXT_PUBLIC_API_BASE` = `https://<your-fly-app>.fly.dev`
4. 按 Deploy。每次 push 到 `main` 會自動重新部署，PR 也會自動開 preview。

部署完後，記得把 Vercel 指派的網域（例如 `https://match-monitor-xxx.vercel.app`）加到後端的 `CORS_ORIGINS`：

```bash
cd apps/api
fly secrets set CORS_ORIGINS='["https://match-monitor-xxx.vercel.app"]'
```

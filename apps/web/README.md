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

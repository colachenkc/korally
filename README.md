# Match Monitor System

NTU 桌球賽即時監控系統，分為兩個 app：

| Folder | 技術 | 本機部署說明 |
| --- | --- | --- |
| [apps/api](apps/api/README.md) | FastAPI + SQLite | [apps/api/README.md](apps/api/README.md) |
| [apps/web](apps/web/README.md) | Next.js 15 | [apps/web/README.md](apps/web/README.md) |

## 部署架構

- **前端**：Vercel（免費、自動從 GitHub 部署）
- **後端**：Fly.io（nrt region，SQLite + 上傳檔掛在 persistent volume `/data`）
- **資料流**：瀏覽器 → Vercel 前端 → 跨網域 fetch 到 Fly 後端（CORS + `credentials: "include"` 帶 session cookie）

## Phase 2：第一次部署順序

**重要：先部後端、拿到 Fly URL，再部前端、拿到 Vercel URL，最後回後端補 CORS。**

### Step 1. 部後端到 Fly.io

照 [apps/api/README.md 的 "Deploy to Fly.io"](apps/api/README.md#deploy-to-flyio) 做（6 步）。
`CORS_ORIGINS` 先填 `["http://localhost:3000"]`，等第 2 步拿到 Vercel URL 再回來改。

部完後記下你的後端網址，像 `https://match-monitor-api-xxx.fly.dev`。

### Step 2. 部前端到 Vercel

照 [apps/web/README.md 的 "Deploy to Vercel"](apps/web/README.md#deploy-to-vercel) 做（4 步）。
`NEXT_PUBLIC_API_BASE` 填 Step 1 拿到的 Fly 後端網址。

部完後記下你的前端網址，像 `https://match-monitor-xxx.vercel.app`。

### Step 3. 回後端更新 CORS

```bash
cd apps/api
fly secrets set CORS_ORIGINS='["https://match-monitor-xxx.vercel.app"]'
```
Fly 會自動重啟。重啟完後，前端就能成功呼叫後端了。

### Step 4. 煙霧測試

打開 `https://match-monitor-xxx.vercel.app`，確認：
- [ ] 首頁能載入（前端起來了）
- [ ] 比賽資料能顯示（前端→後端 CORS 過了）
- [ ] admin 登入能成功（cookie 跨網域過了）
- [ ] PDF 上傳能存（volume 掛好了）
- [ ] 重新 `fly deploy` 一次，上傳的 PDF 還在（volume 持久化 OK）

## 日常更新

```bash
git push                              # code 推 GitHub
cd apps/api && fly deploy             # 後端有改才跑
# 前端 Vercel 自動偵測 push 重新部署，不用手動
```

## 活動當天

URL 直接給觀眾：`https://match-monitor-xxx.vercel.app`

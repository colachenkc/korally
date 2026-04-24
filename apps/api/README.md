# Match Monitor API (FastAPI)

## Setup

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- Health check: http://localhost:8000/health
- OpenAPI docs: http://localhost:8000/docs
- Base API prefix: `/api/v1`

SQLite DB file `match_monitor.db` will be created in `apps/api/` on first run.
Uploads land in `apps/api/uploads/`.

## Deploy to Fly.io

### First-time setup

```bash
# 1. Install flyctl and log in
brew install flyctl
fly auth login

# 2. From apps/api/
cd apps/api

# 3. Launch app (generates a unique app name, overwrites fly.toml's `app`)
fly launch --no-deploy --copy-config

# 4. Create 1 GB persistent volume for SQLite + uploads
fly volumes create data --size 1 --region nrt

# 5. Set secrets (these are NOT committed)
#    - ADMIN_PASSWORD: pick one you will remember (admins type it to log in)
#    - SESSION_SECRET: random, nobody needs to remember it
#    - CORS_ORIGINS: your Vercel frontend URL (can update later)
fly secrets set \
  ADMIN_PASSWORD='pick-a-memorable-password' \
  SESSION_SECRET="$(python -c 'import secrets;print(secrets.token_urlsafe(32))')" \
  CORS_ORIGINS='["http://localhost:3000"]'

# 6. Deploy
fly deploy
```

### Updating

```bash
cd apps/api
fly deploy
```

### Backing up the SQLite DB

```bash
fly ssh sftp get /data/match_monitor.db ./backup-$(date +%Y%m%d).db
```

### Environment variables reference

| Var | Local dev | Fly.io prod |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./match_monitor.db` | `sqlite:////data/match_monitor.db` (volume) |
| `UPLOAD_ROOT` | `uploads` | `/data/uploads` (volume) |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | `["https://<your>.vercel.app"]` |
| `COOKIE_SECURE` | `false` | `true` |
| `COOKIE_SAMESITE` | `lax` | `none` (cross-site cookie) |
| `ADMIN_PASSWORD` | any | **random, rotated** |
| `SESSION_SECRET` | any | **random 32+ chars** |

The production values for `DATABASE_URL`, `UPLOAD_ROOT`, `COOKIE_SECURE`, `COOKIE_SAMESITE`
are set in `fly.toml` `[env]`. Only the secrets go through `fly secrets set`.

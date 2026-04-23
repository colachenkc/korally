# Match Monitor API (FastAPI)

## Setup

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- Health check: http://localhost:8000/health
- OpenAPI docs: http://localhost:8000/docs
- Base API prefix: `/api/v1`

SQLite DB file `match_monitor.db` will be created in `apps/api/` on first run.

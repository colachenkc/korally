from fastapi import APIRouter

from app.api.v1 import admin, auth, main_desk, matches, participants, schedule_docs, tables, teams, tournaments

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(tournaments.router)
api_router.include_router(tables.router)
api_router.include_router(matches.router)
api_router.include_router(main_desk.router)
api_router.include_router(schedule_docs.router)
api_router.include_router(teams.router)
api_router.include_router(participants.router)
api_router.include_router(admin.router)

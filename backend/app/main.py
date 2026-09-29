from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine, get_db
from app.models.permission import Permission
from app.services.permission_catalog import PERMISSION_CATALOG

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
def on_startup() -> None:
    # Schema creation/changes are owned entirely by Alembic migrations
    # (see backend/alembic/), run before this container starts (see
    # docker-compose.yml). This only ensures the fixed permission catalog
    # is present — safe to re-run, since it skips codes that already exist.
    with Session(engine) as db:
        existing_codes = {p.code for p in db.execute(select(Permission)).scalars().all()}
        added = False
        for perm in PERMISSION_CATALOG:
            if perm["code"] not in existing_codes:
                db.add(Permission(**perm))
                added = True
        if added:
            db.commit()


@app.get("/")
def root():
    return {"message": "Smart Loan Platform API", "environment": settings.environment}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "environment": settings.environment}

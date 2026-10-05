import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.config import get_settings
from app.database import Base, get_engine, get_sessionmaker
from app.routers.auth import child_router, router as auth_router
from app.routers.books import router as books_router
from app.routers.parent import router as parent_router
from app.routers.reading import router as reading_router
from app.routers.recordings import router as recordings_router
from app.seed import seed_demo

logger = logging.getLogger("starlit")


def init_db() -> None:
    last_error: Exception | None = None
    for attempt in range(30):
        try:
            Base.metadata.create_all(bind=get_engine())
            with get_engine().begin() as connection:
                connection.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_reading_once ON reading_records (child_id, book_id)"
                ))
            return
        except OperationalError as exc:
            last_error = exc
            logger.warning("database not ready (%s/30)", attempt + 1)
            time.sleep(1)
    if last_error:
        raise last_error


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    init_db()
    if settings.seed_demo:
        db = get_sessionmaker()()
        try:
            seed_demo(db)
        finally:
            db.close()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="星光书架 Starlit Shelf",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router)
    app.include_router(child_router)
    app.include_router(books_router)
    app.include_router(reading_router)
    app.include_router(recordings_router)
    app.include_router(parent_router)

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=str(upload_dir)), name="media")

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True, "service": "starlit-shelf"}

    @app.get("/")
    def root() -> dict:
        return {"service": "starlit-shelf", "docs": "/api/docs"}

    return app


app = create_app()

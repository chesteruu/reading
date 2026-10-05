from app.routers.auth import child_router, router as auth_router
from app.routers.books import router as books_router
from app.routers.parent import router as parent_router
from app.routers.reading import router as reading_router
from app.routers.recordings import router as recordings_router

__all__ = ["auth_router", "books_router", "child_router", "parent_router", "reading_router", "recordings_router"]

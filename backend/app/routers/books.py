from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_principal
from app.models import Book, BookPage, ReadingProgress, ReadingRecord
from app.scoring import level_fit
from app.services import assert_readable

router = APIRouter(prefix="/api", tags=["books"])


def _book_summary(book: Book) -> dict:
    return {
        "id": book.id,
        "title": book.title,
        "subtitle": book.subtitle,
        "level": book.level,
        "genre": book.genre,
        "total_pages": book.total_pages,
        "cover_image_url": book.cover_image_url,
        "word_count": book.word_count,
        "blurb": book.blurb,
        "accent": book.accent,
    }


def _book_detail(book: Book, pages: list[BookPage]) -> dict:
    payload = _book_summary(book)
    payload["glossary"] = book.glossary or {}
    payload["activities"] = book.activities or {}
    payload["pages"] = [
        {
            "id": page.id,
            "book_id": page.book_id,
            "page_number": page.page_number,
            "image_url": page.image_url,
            "audio_url": page.audio_url,
            "alignment_data": page.alignment_data,
        }
        for page in pages
    ]
    return payload


@router.get("/books")
def list_books(principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    books = db.scalars(select(Book).order_by(Book.level, Book.title)).all()
    return {"books": [_book_summary(book) for book in books]}


@router.get("/books/{book_id}")
def get_book(book_id: str, principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="找不到这本书")
    assert_readable(db, principal, book)
    pages = db.scalars(select(BookPage).where(BookPage.book_id == book.id).order_by(BookPage.page_number)).all()
    return _book_detail(book, list(pages))


@router.get("/shelf")
def shelf(child_id: str, principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    from app.services import owned_child

    child = owned_child(db, principal, child_id)
    books = db.scalars(select(Book).order_by(Book.level, Book.title)).all()
    progress_rows = db.scalars(select(ReadingProgress).where(ReadingProgress.child_id == child.id)).all()
    progress_map = {row.book_id: row for row in progress_rows}
    done_ids = set(
        db.scalars(select(ReadingRecord.book_id).where(ReadingRecord.child_id == child.id, ReadingRecord.status == "completed"))
    )
    shelf_books = []
    for book in books:
        row = progress_map.get(book.id)
        summary = _book_summary(book)
        summary["fit"] = level_fit(book.level, child.current_level)
        summary["progress"] = None
        if row or book.id in done_ids:
            summary["progress"] = {
                "current_page": row.current_page if row else book.total_pages,
                "read_seconds": row.read_seconds if row else 0,
                "listen_seconds": row.listen_seconds if row else 0,
                "completed": book.id in done_ids,
            }
        shelf_books.append(summary)
    return {"child": {"id": child.id, "nickname": child.nickname, "avatar_url": child.avatar_url, "current_level": child.current_level, "star_balance": child.star_balance}, "books": shelf_books}

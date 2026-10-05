from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.catalog import word_count
from app.database import get_db
from app.deps import require_parent
from app.models import (
    AudioRecording,
    Book,
    BookPage,
    ChildProfile,
    ReadingProgress,
    ReadingRecord,
    WordEvent,
    utcnow,
)
from app.scoring import align_sentence
from app.services import new_id

router = APIRouter(prefix="/api/parent", tags=["parent"])


class PageIn(BaseModel):
    image_url: str = "/art/placeholder.svg"
    audio_url: str = "speech:en-US"
    text: str = ""
    alignment_data: list[dict] | None = None


class BookIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    subtitle: str = ""
    level: str = Field(min_length=1, max_length=4)
    genre: str = "fiction"
    cover_image_url: str = "/art/placeholder.svg"
    blurb: str = ""
    accent: str = "#8a5a3b"
    glossary: dict = {}
    activities: dict | None = None
    pages: list[PageIn] = Field(min_length=1)


def _auto_activities(pages: list[dict]) -> dict:
    frames = []
    for page in pages[:4]:
        text = " ".join(item["word"] for item in page["alignment_data"])
        frames.append({"id": f"p{page['page_number']}", "image_url": page["image_url"], "caption": text})
    words: list[str] = []
    for page in pages:
        for item in page["alignment_data"]:
            token = "".join(ch for ch in item["word"].lower() if ch.isalpha())
            if len(token) >= 3 and token not in words and token not in {"the", "and", "look"}:
                words.append(token)
            if len(words) == 4:
                break
    return {
        "sequencer": {
            "prompt": "用手指把故事按发生的顺序排好",
            "frames": frames,
            "order": [frame["id"] for frame in frames],
        },
        "word_match": {
            "prompt": "听一听，把声音拖到对应的词上",
            "pairs": [{"id": word, "word": word, "emoji": "⭐"} for word in words],
        },
    }


@router.get("/overview")
def overview(principal: dict = Depends(require_parent), db: Session = Depends(get_db)) -> dict:
    children = db.scalars(select(ChildProfile).where(ChildProfile.parent_id == principal["sub"])).all()
    payload = []
    for child in children:
        progress_rows = db.scalars(select(ReadingProgress).where(ReadingProgress.child_id == child.id)).all()
        records = db.scalars(
            select(ReadingRecord).where(ReadingRecord.child_id == child.id).order_by(ReadingRecord.completed_at.desc())
        ).all()
        books = {book.id: book for book in db.scalars(select(Book)).all()}
        heat = db.scalars(
            select(WordEvent).where(WordEvent.child_id == child.id, WordEvent.kind == "tap").order_by(WordEvent.count.desc()).limit(24)
        ).all()
        favorites = db.scalars(select(WordEvent).where(WordEvent.child_id == child.id, WordEvent.kind == "favorite")).all()
        recordings = db.scalars(
            select(AudioRecording).where(AudioRecording.child_id == child.id).order_by(AudioRecording.created_at.desc()).limit(12)
        ).all()
        payload.append(
            {
                "id": child.id,
                "nickname": child.nickname,
                "avatar_url": child.avatar_url,
                "current_level": child.current_level,
                "star_balance": child.star_balance,
                "listen_seconds": round(sum(row.listen_seconds or 0 for row in progress_rows), 1),
                "read_seconds": round(sum(row.read_seconds or 0 for row in progress_rows), 1),
                "books_completed": len(records),
                "recent_records": [
                    {
                        "book_id": record.book_id,
                        "title": books[record.book_id].title if record.book_id in books else "",
                        "completed_at": record.completed_at.isoformat(),
                    }
                    for record in records[:8]
                ],
                "word_heatmap": [{"word": row.word, "count": row.count} for row in heat],
                "favorites": [{"word": row.word, "count": row.count} for row in favorites],
                "recordings": [
                    {
                        "id": row.id,
                        "book_title": books[row.book_id].title if row.book_id in books else "",
                        "page_number": row.page_number,
                        "audio_file_url": row.audio_file_url,
                        "duration_seconds": row.duration_seconds,
                    }
                    for row in recordings
                ],
            }
        )
    book_count = db.scalar(select(func.count()).select_from(Book)) or 0
    return {"children": payload, "book_count": book_count}


@router.post("/books")
def create_book(body: BookIn, principal: dict = Depends(require_parent), db: Session = Depends(get_db)) -> dict:
    pages_data = []
    for index, page in enumerate(body.pages, start=1):
        alignment = page.alignment_data
        if not alignment:
            if not page.text.strip():
                raise HTTPException(status_code=400, detail=f"第 {index} 页缺少文字")
            alignment = align_sentence(page.text.strip())
        pages_data.append(
            {
                "page_number": index,
                "image_url": page.image_url or "/art/placeholder.svg",
                "audio_url": page.audio_url or "speech:en-US",
                "alignment_data": alignment,
            }
        )
    book_id = new_id()
    activities = body.activities if body.activities else _auto_activities(pages_data)
    book = Book(
        id=book_id,
        title=body.title.strip(),
        subtitle=body.subtitle.strip(),
        level=body.level,
        genre=body.genre,
        total_pages=len(pages_data),
        cover_image_url=body.cover_image_url or pages_data[0]["image_url"],
        word_count=word_count([{"alignment_data": page["alignment_data"]} for page in pages_data]),
        blurb=body.blurb,
        accent=body.accent,
        glossary=body.glossary,
        activities=activities,
        created_at=utcnow(),
    )
    db.add(book)
    db.flush()
    for page in pages_data:
        db.add(
            BookPage(
                id=new_id(),
                book_id=book_id,
                page_number=page["page_number"],
                image_url=page["image_url"],
                audio_url=page["audio_url"],
                alignment_data=page["alignment_data"],
            )
        )
    db.commit()
    return {"id": book.id, "title": book.title, "total_pages": book.total_pages}

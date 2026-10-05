from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_principal
from app.models import Book, ReadingProgress, ReadingRecord, WordEvent, utcnow
from app.scoring import score_detective, score_match, score_sequence
from app.services import assert_readable, award_safely, new_id, owned_child

router = APIRouter(prefix="/api", tags=["reading"])

ACTIVITY_STARS = 3
FINISH_STARS = 4


class ProgressIn(BaseModel):
    child_id: str
    book_id: str
    current_page: int = Field(ge=1)
    add_read_seconds: float = 0
    add_listen_seconds: float = 0


class CompleteIn(BaseModel):
    child_id: str
    book_id: str


class WordIn(BaseModel):
    child_id: str
    book_id: str
    word: str = Field(min_length=1, max_length=64)
    kind: str


class ActivityIn(BaseModel):
    child_id: str
    book_id: str
    kind: str
    answer: dict


def _normalize_word(word: str) -> str:
    cleaned = "".join(ch for ch in word.lower() if ch.isalpha() or ch == "'")
    return cleaned[:64]


@router.post("/reading/progress")
def save_progress(body: ProgressIn, principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    child = owned_child(db, principal, body.child_id)
    book = db.get(Book, body.book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="找不到这本书")
    assert_readable(db, principal, book)
    row = db.scalar(select(ReadingProgress).where(ReadingProgress.child_id == child.id, ReadingProgress.book_id == book.id))
    if row is None:
        row = ReadingProgress(id=new_id(), child_id=child.id, book_id=book.id, current_page=1, read_seconds=0, listen_seconds=0)
        db.add(row)
    row.current_page = min(max(1, body.current_page), book.total_pages)
    row.read_seconds = float(row.read_seconds or 0) + max(0, min(body.add_read_seconds, 120))
    row.listen_seconds = float(row.listen_seconds or 0) + max(0, min(body.add_listen_seconds, 120))
    row.updated_at = utcnow()
    db.commit()
    return {
        "current_page": row.current_page,
        "read_seconds": row.read_seconds,
        "listen_seconds": row.listen_seconds,
    }


@router.post("/reading/complete")
def complete_book(body: CompleteIn, principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    child = owned_child(db, principal, body.child_id)
    book = db.get(Book, body.book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="找不到这本书")
    assert_readable(db, principal, book)
    existing = db.scalar(
        select(ReadingRecord).where(
            ReadingRecord.child_id == child.id,
            ReadingRecord.book_id == book.id,
            ReadingRecord.status == "completed",
        )
    )
    awarded = 0
    if existing is None:
        db.add(
            ReadingRecord(
                id=new_id(),
                child_id=child.id,
                book_id=book.id,
                status="completed",
                completed_at=utcnow(),
            )
        )
        awarded = award_safely(
            db,
            child,
            amount=FINISH_STARS,
            reason=f"读完《{book.title}》",
            reason_key=f"finish:{book.id}",
        )
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            awarded = 0
        db.refresh(child)
    return {"completed": True, "stars_awarded": awarded, "star_balance": child.star_balance}


@router.post("/words/events")
def word_event(body: WordIn, principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    child = owned_child(db, principal, body.child_id)
    if body.kind not in {"tap", "favorite"}:
        raise HTTPException(status_code=400, detail="不认识的记录类型")
    word = _normalize_word(body.word)
    if not word:
        return {"ok": True}
    row = db.scalar(select(WordEvent).where(WordEvent.child_id == child.id, WordEvent.word == word, WordEvent.kind == body.kind))
    if row is None:
        db.add(WordEvent(id=new_id(), child_id=child.id, book_id=body.book_id, word=word, kind=body.kind, count=1))
    else:
        row.count = int(row.count) + 1
        row.book_id = body.book_id
    db.commit()
    return {"ok": True}


@router.get("/words/favorites")
def favorites(child_id: str, principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    child = owned_child(db, principal, child_id)
    rows = db.scalars(select(WordEvent).where(WordEvent.child_id == child.id, WordEvent.kind == "favorite").order_by(WordEvent.count.desc())).all()
    return {"words": [{"word": row.word, "count": row.count} for row in rows]}


@router.post("/activities/submit")
def submit_activity(body: ActivityIn, principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    child = owned_child(db, principal, body.child_id)
    book = db.get(Book, body.book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="找不到这本书")
    assert_readable(db, principal, book)
    activities = book.activities or {}
    spec = activities.get(body.kind)
    if not spec:
        raise HTTPException(status_code=400, detail="这本书没有这个游戏")

    correct = False
    if body.kind == "sequencer":
        correct = score_sequence(body.answer.get("order") or [], spec.get("order") or [])
    elif body.kind == "detective":
        correct = score_detective(body.answer.get("x", 999), body.answer.get("y", 999), spec["target"])
    elif body.kind == "word_match":
        ids = [pair["id"] for pair in spec.get("pairs") or []]
        correct = score_match(body.answer.get("pairs") or [], ids)
    else:
        raise HTTPException(status_code=400, detail="不认识的游戏")

    awarded = 0
    if correct:
        awarded = award_safely(
            db,
            child,
            amount=ACTIVITY_STARS,
            reason=f"{body.kind} · {book.title}",
            reason_key=f"activity:{book.id}:{body.kind}",
        )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        awarded = 0
    db.refresh(child)
    return {"correct": correct, "stars_awarded": awarded, "star_balance": child.star_balance}

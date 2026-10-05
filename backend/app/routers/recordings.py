from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_principal
from app.models import AudioRecording, Book, utcnow
from app.services import assert_readable, award_safely, new_id, owned_child
from app.storage import save_bytes

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

MAX_BYTES = 800_000
RECORDING_STARS = 3


@router.get("")
def list_recordings(child_id: str, principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    child = owned_child(db, principal, child_id)
    rows = db.scalars(
        select(AudioRecording).where(AudioRecording.child_id == child.id).order_by(AudioRecording.created_at.desc())
    ).all()
    books = {book.id: book for book in db.scalars(select(Book)).all()}
    return {
        "recordings": [
            {
                "id": row.id,
                "book_id": row.book_id,
                "book_title": books[row.book_id].title if row.book_id in books else "",
                "page_number": row.page_number,
                "audio_file_url": row.audio_file_url,
                "duration_seconds": row.duration_seconds,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]
    }


@router.post("")
async def create_recording(
    child_id: str = Form(...),
    book_id: str = Form(...),
    page_number: int = Form(...),
    duration_seconds: float = Form(0),
    file: UploadFile = File(...),
    principal: dict = Depends(get_principal),
    db: Session = Depends(get_db),
) -> dict:
    child = owned_child(db, principal, child_id)
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="找不到这本书")
    assert_readable(db, principal, book)
    if page_number < 1 or page_number > book.total_pages:
        raise HTTPException(status_code=400, detail="页码不在这本书里")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="录音是空的")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="这一页录得太长了，再试一次短一点的")
    content_type = file.content_type or ""
    is_audio = content_type.startswith("audio/") or data.startswith((b"RIFF", b"OggS", b"\x1aE\xdf\xa3"))
    if not is_audio:
        raise HTTPException(status_code=400, detail="请上传录音文件")
    recording_id = new_id()
    url = save_bytes(f"{recording_id}.wav", data, file.content_type or "audio/wav")
    row = AudioRecording(
        id=recording_id,
        child_id=child.id,
        book_id=book.id,
        page_number=page_number,
        audio_file_url=url,
        duration_seconds=max(0, min(duration_seconds, 120)),
        created_at=utcnow(),
    )
    db.add(row)
    awarded = award_safely(
        db,
        child,
        amount=RECORDING_STARS,
        reason=f"朗读《{book.title}》",
        reason_key=f"recording:{book.id}",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        awarded = 0
        db.refresh(child)
        raise HTTPException(status_code=409, detail="这次录音没有保存，请再试一次") from None
    db.refresh(child)
    return {
        "id": row.id,
        "audio_file_url": row.audio_file_url,
        "page_number": row.page_number,
        "duration_seconds": row.duration_seconds,
        "stars_awarded": awarded,
        "star_balance": child.star_balance,
    }

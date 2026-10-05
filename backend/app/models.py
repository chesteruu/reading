from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="parent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChildProfile(Base):
    __tablename__ = "child_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    parent_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    nickname: Mapped[str] = mapped_column(String(64), nullable=False)
    avatar_url: Mapped[str] = mapped_column(String(512), default="/avatars/moon.svg")
    pin_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    current_level: Mapped[str] = mapped_column(String(4), default="A")
    star_balance: Mapped[int] = mapped_column(Integer, default=0)


class Book(Base):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(255), default="")
    level: Mapped[str] = mapped_column(String(4), nullable=False, index=True)
    genre: Mapped[str] = mapped_column(String(64), default="fiction")
    total_pages: Mapped[int] = mapped_column(Integer, nullable=False)
    cover_image_url: Mapped[str] = mapped_column(String(512), default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    blurb: Mapped[str] = mapped_column(Text, default="")
    accent: Mapped[str] = mapped_column(String(16), default="#c44536")
    glossary: Mapped[dict] = mapped_column(JSON, default=dict)
    activities: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BookPage(Base):
    __tablename__ = "book_pages"
    __table_args__ = (UniqueConstraint("book_id", "page_number", name="uq_book_page"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    book_id: Mapped[str] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), index=True)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)
    audio_url: Mapped[str] = mapped_column(String(512), nullable=False)
    alignment_data: Mapped[list] = mapped_column(JSON, nullable=False)


class ReadingRecord(Base):
    __tablename__ = "reading_records"
    __table_args__ = (UniqueConstraint("child_id", "book_id", name="uq_reading_once"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    child_id: Mapped[str] = mapped_column(ForeignKey("child_profiles.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[str] = mapped_column(ForeignKey("books.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="completed")
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AudioRecording(Base):
    __tablename__ = "audio_recordings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    child_id: Mapped[str] = mapped_column(ForeignKey("child_profiles.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[str] = mapped_column(ForeignKey("books.id"), index=True)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    audio_file_url: Mapped[str] = mapped_column(String(512), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    __table_args__ = (UniqueConstraint("child_id", "book_id", name="uq_progress"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    child_id: Mapped[str] = mapped_column(ForeignKey("child_profiles.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[str] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), index=True)
    current_page: Mapped[int] = mapped_column(Integer, default=1)
    read_seconds: Mapped[float] = mapped_column(Float, default=0)
    listen_seconds: Mapped[float] = mapped_column(Float, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class WordEvent(Base):
    __tablename__ = "word_events"
    __table_args__ = (UniqueConstraint("child_id", "word", "kind", name="uq_word_event"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    child_id: Mapped[str] = mapped_column(ForeignKey("child_profiles.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[str] = mapped_column(String(36), default="")
    word: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=1)


class StarLedger(Base):
    __tablename__ = "star_ledger"
    __table_args__ = (UniqueConstraint("child_id", "reason_key", name="uq_star_reason"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    child_id: Mapped[str] = mapped_column(ForeignKey("child_profiles.id", ondelete="CASCADE"), index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(128), default="")
    reason_key: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Book, ChildProfile, StarLedger, utcnow
from app.scoring import level_fit


def new_id() -> str:
    return str(uuid.uuid4())


def grant_stars(db: Session, child: ChildProfile, *, amount: int, reason: str, reason_key: str) -> int:
    existing = db.scalar(select(StarLedger).where(StarLedger.child_id == child.id, StarLedger.reason_key == reason_key))
    if existing:
        return 0
    db.add(
        StarLedger(
            id=new_id(),
            child_id=child.id,
            amount=amount,
            reason=reason,
            reason_key=reason_key,
            created_at=utcnow(),
        )
    )
    child.star_balance = int(child.star_balance or 0) + amount
    return amount


def award_safely(db: Session, child: ChildProfile, *, amount: int, reason: str, reason_key: str) -> int:
    """Award stars once, even if two requests pass the read check together."""
    try:
        with db.begin_nested():
            awarded = grant_stars(db, child, amount=amount, reason=reason, reason_key=reason_key)
            db.flush()
            return awarded
    except IntegrityError:
        db.refresh(child)
        return 0


def assert_readable(db: Session, principal: dict, book: Book) -> None:
    if principal.get("role") != "child":
        return
    child = db.get(ChildProfile, principal["sub"])
    if child is None:
        raise HTTPException(status_code=401, detail="登录已失效，请重新进入")
    if level_fit(book.level, child.current_level) == "locked":
        raise HTTPException(status_code=403, detail="这本要等级别再高一点")


def owned_child(db: Session, principal: dict, child_id: str) -> ChildProfile:
    child = db.get(ChildProfile, child_id)
    if child is None:
        raise HTTPException(status_code=404, detail="找不到这个孩子")
    if principal["role"] == "child":
        if principal["sub"] != child.id:
            raise HTTPException(status_code=403, detail="只能记录自己的阅读")
        return child
    if principal["role"] == "parent" and child.parent_id == principal["sub"]:
        return child
    raise HTTPException(status_code=403, detail="没有权限")

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_principal, require_parent
from app.models import ChildProfile, User, utcnow
from app.security import (
    assert_pin_not_locked,
    clear_pin_failures,
    create_token,
    hash_secret,
    record_pin_failure,
    verify_secret,
)
from app.services import new_id

router = APIRouter(prefix="/api/auth", tags=["auth"])
child_router = APIRouter(prefix="/api/children", tags=["children"])

AVATARS = {
    "moon": "/avatars/moon.svg",
    "lion": "/avatars/lion.svg",
    "fox": "/avatars/fox.svg",
    "bear": "/avatars/bear.svg",
    "owl": "/avatars/owl.svg",
    "whale": "/avatars/whale.svg",
}


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PinIn(BaseModel):
    child_id: str
    pin: str = Field(min_length=4, max_length=4)


class ChildIn(BaseModel):
    nickname: str = Field(min_length=1, max_length=64)
    pin: str = Field(min_length=4, max_length=4)
    avatar_key: str = "moon"
    current_level: str = "A"


class ChildPatch(BaseModel):
    nickname: str | None = None
    pin: str | None = None
    avatar_key: str | None = None
    current_level: str | None = None


def _child_out(child: ChildProfile) -> dict:
    return {
        "id": child.id,
        "nickname": child.nickname,
        "avatar_url": child.avatar_url,
        "current_level": child.current_level,
        "star_balance": child.star_balance,
    }


def _check_pin_shape(pin: str) -> None:
    if not (len(pin) == 4 and pin.isdigit()):
        raise HTTPException(status_code=400, detail="PIN 需要 4 位数字")


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)) -> dict:
    email = body.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="这个邮箱已经注册过了")
    user = User(
        id=new_id(),
        email=email,
        hashed_password=hash_secret(body.password),
        role="parent",
        created_at=utcnow(),
    )
    db.add(user)
    db.commit()
    token = create_token(sub=user.id, role="parent")
    return {"token": token, "role": "parent", "user": {"id": user.id, "email": user.email}}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_secret(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="邮箱或密码不对")
    token = create_token(sub=user.id, role="parent")
    children = db.scalars(select(ChildProfile).where(ChildProfile.parent_id == user.id)).all()
    return {
        "token": token,
        "role": "parent",
        "user": {"id": user.id, "email": user.email},
        "children": [_child_out(child) for child in children],
    }


@router.get("/me")
def me(principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    if principal["role"] == "parent":
        user = db.get(User, principal["sub"])
        if user is None:
            raise HTTPException(status_code=401, detail="登录已失效，请重新进入")
        children = db.scalars(select(ChildProfile).where(ChildProfile.parent_id == user.id)).all()
        return {
            "role": "parent",
            "user": {"id": user.id, "email": user.email},
            "children": [_child_out(child) for child in children],
        }
    child = db.get(ChildProfile, principal["sub"])
    if child is None:
        raise HTTPException(status_code=401, detail="登录已失效，请重新进入")
    return {"role": "child", "child": _child_out(child)}


@router.post("/pin")
def unlock_pin(body: PinIn, principal: dict = Depends(require_parent), db: Session = Depends(get_db)) -> dict:
    _check_pin_shape(body.pin)
    child = db.get(ChildProfile, body.child_id)
    if child is None or child.parent_id != principal["sub"]:
        raise HTTPException(status_code=404, detail="找不到这个孩子")
    assert_pin_not_locked(child.id)
    if not verify_secret(body.pin, child.pin_hash):
        record_pin_failure(child.id)
        raise HTTPException(status_code=401, detail="PIN 不对，再试一次")
    clear_pin_failures(child.id)
    token = create_token(sub=child.id, role="child", parent_id=child.parent_id)
    return {"token": token, "role": "child", "child": _child_out(child)}


@child_router.get("")
def list_children(principal: dict = Depends(require_parent), db: Session = Depends(get_db)) -> dict:
    children = db.scalars(select(ChildProfile).where(ChildProfile.parent_id == principal["sub"])).all()
    return {"children": [_child_out(child) for child in children], "avatars": AVATARS}


@child_router.post("")
def create_child(body: ChildIn, principal: dict = Depends(require_parent), db: Session = Depends(get_db)) -> dict:
    _check_pin_shape(body.pin)
    avatar = AVATARS.get(body.avatar_key, AVATARS["moon"])
    child = ChildProfile(
        id=new_id(),
        parent_id=principal["sub"],
        nickname=body.nickname.strip(),
        avatar_url=avatar,
        pin_hash=hash_secret(body.pin),
        current_level=body.current_level,
        star_balance=0,
    )
    db.add(child)
    db.commit()
    return _child_out(child)


@child_router.patch("/{child_id}")
def patch_child(
    child_id: str,
    body: ChildPatch,
    principal: dict = Depends(require_parent),
    db: Session = Depends(get_db),
) -> dict:
    child = db.get(ChildProfile, child_id)
    if child is None or child.parent_id != principal["sub"]:
        raise HTTPException(status_code=404, detail="找不到这个孩子")
    if body.nickname is not None:
        child.nickname = body.nickname.strip()
    if body.current_level is not None:
        child.current_level = body.current_level
    if body.avatar_key is not None:
        child.avatar_url = AVATARS.get(body.avatar_key, child.avatar_url)
    if body.pin is not None:
        _check_pin_shape(body.pin)
        child.pin_hash = hash_secret(body.pin)
    db.commit()
    return _child_out(child)

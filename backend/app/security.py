import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

from app.config import get_settings

_FAILS: dict[str, list[float]] = {}
LOCK_SECONDS = 30
MAX_FAILS = 5


def hash_secret(value: str) -> str:
    return bcrypt.hashpw(value.encode(), bcrypt.gensalt()).decode()


def verify_secret(value: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(value.encode(), hashed.encode())
    except ValueError:
        return False


def _pem_from_env(value: str) -> str:
    return value.replace("\\n", "\n").strip()


def load_keys() -> tuple[str, str]:
    settings = get_settings()
    if settings.jwt_private_key and settings.jwt_public_key:
        return _pem_from_env(settings.jwt_private_key), _pem_from_env(settings.jwt_public_key)

    priv_path = Path(settings.jwt_private_key_path)
    pub_path = Path(settings.jwt_public_key_path)
    if priv_path.exists() and pub_path.exists():
        return priv_path.read_text(), pub_path.read_text()

    priv_path.parent.mkdir(parents=True, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    public_pem = (
        key.public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )
    priv_path.write_text(private_pem)
    pub_path.write_text(public_pem)
    return private_pem, public_pem


def create_token(*, sub: str, role: str, parent_id: str | None = None) -> str:
    settings = get_settings()
    private_key, _public = load_keys()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "role": role,
        "parent_id": parent_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_minutes)).timestamp()),
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


def decode_token(token: str) -> dict:
    _private, public_key = load_keys()
    try:
        return jwt.decode(token, public_key, algorithms=["RS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="登录已失效，请重新进入") from exc


def assert_pin_not_locked(child_id: str) -> None:
    now = time.time()
    recent = [stamp for stamp in _FAILS.get(child_id, []) if now - stamp < LOCK_SECONDS]
    _FAILS[child_id] = recent
    if len(recent) >= MAX_FAILS:
        raise HTTPException(status_code=429, detail="试太多次啦，请稍等半分钟再试")


def record_pin_failure(child_id: str) -> None:
    _FAILS.setdefault(child_id, []).append(time.time())


def clear_pin_failures(child_id: str) -> None:
    _FAILS.pop(child_id, None)


def reset_pin_failures() -> None:
    _FAILS.clear()

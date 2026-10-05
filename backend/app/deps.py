from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="请先登录")
    return decode_token(credentials.credentials)


def require_parent(principal: dict = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    if principal.get("role") != "parent":
        raise HTTPException(status_code=403, detail="这个入口只给家长")
    user = db.get(User, principal["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="登录已失效，请重新进入")
    return principal

import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="starlit-test-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp / 'test.db'}"
os.environ["UPLOAD_DIR"] = str(_tmp / "uploads")
os.environ["JWT_PRIVATE_KEY_PATH"] = str(_tmp / "private.pem")
os.environ["JWT_PUBLIC_KEY_PATH"] = str(_tmp / "public.pem")
os.environ["SEED_DEMO"] = "1"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def parent(client: TestClient):
    response = client.post("/api/auth/login", json={"email": "demo@reading.app", "password": "demo1234"})
    assert response.status_code == 200, response.text
    body = response.json()
    return {"token": body["token"], "children": body["children"]}


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

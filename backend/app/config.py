from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/reading.db"
    upload_dir: str = "./data/uploads"
    jwt_private_key_path: str = "./data/keys/private.pem"
    jwt_public_key_path: str = "./data/keys/public.pem"
    jwt_private_key: str = ""
    jwt_public_key: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080"
    access_token_minutes: int = 60 * 24 * 30
    seed_demo: bool = True
    s3_bucket: str = ""
    s3_endpoint_url: str = ""
    s3_region: str = "auto"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_public_base_url: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def data_dir() -> Path:
    path = Path(get_settings().upload_dir).resolve().parent
    path.mkdir(parents=True, exist_ok=True)
    return path

from pathlib import Path

from app.config import get_settings


def save_bytes(key: str, data: bytes, content_type: str) -> str:
    """Store an object on local disk, or on S3-compatible storage when configured.

    Cloudflare R2 and AWS S3 both speak this API. Set S3_BUCKET plus keys.
    For R2 also set S3_ENDPOINT_URL and S3_PUBLIC_BASE_URL.
    """
    settings = get_settings()
    safe_key = Path(key).name
    if settings.s3_bucket:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            aws_access_key_id=settings.s3_access_key_id or None,
            aws_secret_access_key=settings.s3_secret_access_key or None,
            region_name=settings.s3_region or "auto",
        )
        client.put_object(Bucket=settings.s3_bucket, Key=safe_key, Body=data, ContentType=content_type)
        if settings.s3_public_base_url:
            return f"{settings.s3_public_base_url.rstrip('/')}/{safe_key}"
        endpoint = settings.s3_endpoint_url.rstrip("/")
        return f"{endpoint}/{settings.s3_bucket}/{safe_key}"

    folder = Path(settings.upload_dir)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / safe_key).write_bytes(data)
    return f"/media/{safe_key}"

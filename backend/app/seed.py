from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog import CATALOG, LEO_ID, LUNA_ID, PARENT_ID
from app.models import Book, BookPage, ChildProfile, User, utcnow
from app.security import hash_secret


def seed_demo(db: Session) -> None:
    if db.get(User, PARENT_ID):
        return
    db.add(
        User(
            id=PARENT_ID,
            email="demo@reading.app",
            hashed_password=hash_secret("demo1234"),
            role="parent",
            created_at=utcnow(),
        )
    )
    # Parent row must exist before child profiles. Ordering is explicit because
    # these models link with foreign keys rather than ORM relationships.
    db.flush()
    db.add(
        ChildProfile(
            id=LUNA_ID,
            parent_id=PARENT_ID,
            nickname="Luna",
            avatar_url="/avatars/moon.svg",
            pin_hash=hash_secret("1234"),
            current_level="E",
            star_balance=0,
        )
    )
    db.add(
        ChildProfile(
            id=LEO_ID,
            parent_id=PARENT_ID,
            nickname="Leo",
            avatar_url="/avatars/lion.svg",
            pin_hash=hash_secret("2580"),
            current_level="D",
            star_balance=0,
        )
    )
    stories = list(CATALOG)
    for story in stories:
        pages = story["pages"]
        db.add(
            Book(
                id=story["id"],
                title=story["title"],
                subtitle=story["subtitle"],
                level=story["level"],
                genre=story["genre"],
                total_pages=len(pages),
                cover_image_url=story["cover_image_url"],
                word_count=sum(len(page["alignment_data"]) for page in pages),
                blurb=story["blurb"],
                accent=story["accent"],
                glossary=story["glossary"],
                activities=story["activities"],
                created_at=utcnow(),
            )
        )
    db.flush()
    for story in stories:
        pages = story["pages"]
        for page in pages:
            db.add(
                BookPage(
                    id=page["id"],
                    book_id=page["book_id"],
                    page_number=page["page_number"],
                    image_url=page["image_url"],
                    audio_url=page["audio_url"],
                    alignment_data=page["alignment_data"],
                )
            )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()

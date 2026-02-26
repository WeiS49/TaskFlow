from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from app.core.database import get_session
from app.models.bookmark import BookmarkTagLink, Tag
from app.schemas.bookmark import TagResponse

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
def list_tags(session: Session = Depends(get_session)):
    stmt = (
        select(Tag.id, Tag.name, func.count(BookmarkTagLink.bookmark_id).label("count"))
        .outerjoin(BookmarkTagLink, Tag.id == BookmarkTagLink.tag_id)
        .group_by(Tag.id)
        .order_by(func.count(BookmarkTagLink.bookmark_id).desc())
    )
    results = session.execute(stmt).all()  # type: ignore[call-overload]
    return [TagResponse(id=row[0], name=row[1], count=row[2]) for row in results]

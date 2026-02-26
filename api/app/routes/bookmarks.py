import math
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, col, func, select

from app.core.database import get_session
from app.models.bookmark import Bookmark, BookmarkTagLink, Tag
from app.schemas.bookmark import (
    BookmarkCreate,
    BookmarkListResponse,
    BookmarkResponse,
    BookmarkUpdate,
)

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


def _bookmark_to_response(bookmark: Bookmark) -> BookmarkResponse:
    return BookmarkResponse(
        id=bookmark.id,  # type: ignore[arg-type]
        url=bookmark.url,
        title=bookmark.title,
        note=bookmark.note,
        summary=bookmark.summary,
        ai_status=bookmark.ai_status,
        ai_error=bookmark.ai_error,
        tags=[t.name for t in bookmark.tags],
        created_at=bookmark.created_at,
        updated_at=bookmark.updated_at,
    )


def _get_or_create_tags(session: Session, tag_names: list[str]) -> list[Tag]:
    tags: list[Tag] = []
    for name in tag_names:
        name = name.strip().lower()
        if not name:
            continue
        tag = session.exec(select(Tag).where(Tag.name == name)).first()
        if not tag:
            tag = Tag(name=name)
            session.add(tag)
            session.flush()
        tags.append(tag)
    return tags


@router.post("", status_code=201, response_model=BookmarkResponse)
def create_bookmark(data: BookmarkCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Bookmark).where(Bookmark.url == data.url)).first()
    if existing:
        raise HTTPException(status_code=409, detail="URL already bookmarked")

    bookmark = Bookmark(url=data.url, title=data.title, note=data.note)
    if data.tags:
        bookmark.tags = _get_or_create_tags(session, data.tags)

    session.add(bookmark)
    session.commit()
    session.refresh(bookmark)
    return _bookmark_to_response(bookmark)


@router.get("", response_model=BookmarkListResponse)
def list_bookmarks(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: str | None = None,
    tag: str | None = None,
    session: Session = Depends(get_session),
):
    query = select(Bookmark)
    count_query = select(func.count(Bookmark.id))

    if tag:
        query = query.join(BookmarkTagLink).join(Tag).where(Tag.name == tag.strip().lower())
        count_query = (
            count_query.join(BookmarkTagLink).join(Tag).where(Tag.name == tag.strip().lower())
        )

    if q:
        pattern = f"%{q}%"
        filter_clause = (
            col(Bookmark.title).ilike(pattern)
            | col(Bookmark.url).ilike(pattern)
            | col(Bookmark.summary).ilike(pattern)
            | col(Bookmark.content_text).ilike(pattern)
        )
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    total = session.exec(count_query).one()
    pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page

    bookmarks = session.exec(
        query.order_by(col(Bookmark.created_at).desc()).offset(offset).limit(per_page)
    ).all()

    return BookmarkListResponse(
        items=[_bookmark_to_response(b) for b in bookmarks],
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/{bookmark_id}", response_model=BookmarkResponse)
def get_bookmark(bookmark_id: int, session: Session = Depends(get_session)):
    bookmark = session.get(Bookmark, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return _bookmark_to_response(bookmark)


@router.patch("/{bookmark_id}", response_model=BookmarkResponse)
def update_bookmark(
    bookmark_id: int, data: BookmarkUpdate, session: Session = Depends(get_session)
):
    bookmark = session.get(Bookmark, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    if data.title is not None:
        bookmark.title = data.title
    if data.note is not None:
        bookmark.note = data.note
    if data.tags is not None:
        bookmark.tags = _get_or_create_tags(session, data.tags)

    bookmark.updated_at = datetime.now(UTC)
    session.add(bookmark)
    session.commit()
    session.refresh(bookmark)
    return _bookmark_to_response(bookmark)


@router.delete("/{bookmark_id}", status_code=204)
def delete_bookmark(bookmark_id: int, session: Session = Depends(get_session)):
    bookmark = session.get(Bookmark, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    # Remove tag links first, then the bookmark
    stmt = BookmarkTagLink.__table__.delete().where(  # type: ignore[union-attr]
        BookmarkTagLink.bookmark_id == bookmark_id
    )
    session.execute(stmt)  # type: ignore[call-overload]
    session.delete(bookmark)
    session.commit()

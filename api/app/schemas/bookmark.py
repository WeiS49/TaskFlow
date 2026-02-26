from datetime import datetime

from pydantic import BaseModel


class BookmarkCreate(BaseModel):
    url: str
    title: str
    note: str = ""
    tags: list[str] = []


class BookmarkUpdate(BaseModel):
    title: str | None = None
    note: str | None = None
    tags: list[str] | None = None


class BookmarkResponse(BaseModel):
    id: int
    url: str
    title: str
    note: str
    summary: str
    ai_status: str
    ai_error: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime


class BookmarkListResponse(BaseModel):
    items: list[BookmarkResponse]
    total: int
    page: int
    pages: int


class TagResponse(BaseModel):
    id: int
    name: str
    count: int

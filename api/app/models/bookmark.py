from datetime import UTC, datetime

from sqlmodel import Field, Relationship, SQLModel


class BookmarkTagLink(SQLModel, table=True):
    bookmark_id: int | None = Field(default=None, foreign_key="bookmark.id", primary_key=True)
    tag_id: int | None = Field(default=None, foreign_key="tag.id", primary_key=True)


class Tag(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

    bookmarks: list["Bookmark"] = Relationship(
        back_populates="tags", link_model=BookmarkTagLink
    )


class Bookmark(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    url: str = Field(index=True, unique=True)
    title: str
    note: str = ""
    summary: str = ""
    content_text: str = ""
    ai_status: str = Field(default="pending")
    ai_error: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    tags: list[Tag] = Relationship(back_populates="bookmarks", link_model=BookmarkTagLink)

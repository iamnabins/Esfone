"""书籍模型"""

from datetime import datetime, timezone

from ..extensions import db


def utcnow():
    """返回不含时区信息的 UTC 时间，便于存入 SQLite。"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    cover = db.Column(db.String(500), default="")
    description = db.Column(db.Text, default="")
    intro = db.Column(db.Text, default="")
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)

    chapters = db.relationship(
        "Chapter",
        backref="book",
        cascade="all, delete-orphan",
        order_by="Chapter.order",
    )

    def to_summary(self):
        return {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "cover": self.cover or "",
            "description": self.description or "",
            "chapter_count": len(self.chapters),
            "latest_chapter": self.chapters[-1].title if self.chapters else None,
            "likes": self.likes or 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_detail(self):
        data = self.to_summary()
        data["chapters"] = [
            {"id": c.id, "book_id": c.book_id, "title": c.title, "order": c.order}
            for c in self.chapters
        ]
        return data

"""书籍收藏模型"""

from ..extensions import db
from .book import utcnow


class Favorite(db.Model):
    __tablename__ = "favorites"

    user_id = db.Column(db.String(100), primary_key=True)
    book_id = db.Column(
        db.Integer,
        db.ForeignKey("books.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at = db.Column(db.DateTime, default=utcnow)

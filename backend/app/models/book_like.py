"""书籍点赞模型"""

from ..extensions import db
from .book import utcnow


class BookLike(db.Model):
    __tablename__ = "book_likes"

    user_id = db.Column(db.String(100), primary_key=True)
    book_id = db.Column(
        db.Integer,
        db.ForeignKey("books.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at = db.Column(db.DateTime, default=utcnow)

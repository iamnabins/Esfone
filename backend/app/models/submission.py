"""投稿模型"""

from ..extensions import db
from .book import utcnow


class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    cover = db.Column(db.String(500), default="")
    intro = db.Column(db.Text, default="")
    user_id = db.Column(db.String(100), default="")
    nickname = db.Column(db.String(100), default="")
    chapters = db.Column(db.JSON, default=list)
    status = db.Column(db.String(20), default="pending")
    approved_book_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

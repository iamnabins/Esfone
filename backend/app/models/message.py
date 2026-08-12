"""留言模型"""

from ..extensions import db
from .book import utcnow


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    nickname = db.Column(db.String(50), default="")
    content = db.Column(db.Text, nullable=False)
    ip = db.Column(db.String(64), default="")  # 仅存储，不对外展示
    category = db.Column(db.String(20), default="forum")  # forum=论坛, feedback=意见反馈
    is_deleted = db.Column(db.Boolean, default=False, index=True)  # 软删除
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "nickname": (self.nickname or "").strip() or "匿名",
            "content": self.content,
            "category": self.category or "forum",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

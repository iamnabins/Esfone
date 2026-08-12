"""数据模型包：集中导入所有模型，便于建表与引用"""

from .book import Book
from .chapter import Chapter
from .message import Message
from .submission import Submission

__all__ = ["Book", "Chapter", "Message", "Submission"]

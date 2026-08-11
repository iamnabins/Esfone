"""蓝图汇总"""

from .books import books_bp
from .chapters import chapters_bp
from .messages import messages_bp

__all__ = ["books_bp", "chapters_bp", "messages_bp"]

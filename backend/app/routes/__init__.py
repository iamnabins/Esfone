"""蓝图汇总"""

from .admin import admin_bp
from .auth import auth_bp
from .books import books_bp
from .chapters import chapters_bp
from .messages import messages_bp

__all__ = ["admin_bp", "auth_bp", "books_bp", "chapters_bp", "messages_bp"]

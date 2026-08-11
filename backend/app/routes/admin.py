"""管理员相关接口"""

from flask import Blueprint, jsonify

from ..utils.auth import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.post("/verify")
@admin_required
def verify_token():
    """校验请求头中的管理员口令是否有效。"""
    return jsonify({"ok": True})

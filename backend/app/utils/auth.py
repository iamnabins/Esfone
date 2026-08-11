"""管理员鉴权工具"""

import secrets
from functools import wraps

from flask import current_app, jsonify, request


def admin_required(fn):
    """校验请求头 X-Admin-Token 是否与 ADMIN_TOKEN 环境变量一致。"""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-Admin-Token", "")
        expected = current_app.config.get("ADMIN_TOKEN") or ""
        if not expected or not secrets.compare_digest(str(token), str(expected)):
            return jsonify({"error": "管理员验证失败：口令错误或未设置"}), 401
        return fn(*args, **kwargs)

    return wrapper

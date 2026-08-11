"""留言板接口"""

import time
from collections import defaultdict

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Message
from ..utils.auth import admin_required

messages_bp = Blueprint("messages", __name__, url_prefix="/api/messages")

MAX_CONTENT_LENGTH = 500
POST_COOLDOWN_SECONDS = 30

# 简易频率限制：记录每个 IP 最近一次发言时间（单进程内存，足够免费套餐使用）
_last_post_at = defaultdict(float)


def _client_ip():
    """优先取代理头中的真实 IP。"""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or ""


@messages_bp.get("")
def list_messages():
    """获取所有未删除留言，按时间倒序（公开）。"""
    messages = (
        Message.query.filter_by(is_deleted=False)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .all()
    )
    return jsonify({"messages": [m.to_dict() for m in messages]})


@messages_bp.post("")
def create_message():
    """发布留言（公开）：内容必填且不超过 500 字，记录 IP。"""
    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"error": "留言内容不能为空"}), 400
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({"error": f"留言内容不能超过 {MAX_CONTENT_LENGTH} 字"}), 400

    nickname = (data.get("nickname") or "").strip()[:50]

    ip = _client_ip()
    now = time.time()
    if ip and now - _last_post_at.get(ip, 0) < POST_COOLDOWN_SECONDS:
        return jsonify({"error": "发布过于频繁，请稍后再试"}), 429
    _last_post_at[ip] = now

    message = Message(nickname=nickname, content=content, ip=ip)
    db.session.add(message)
    db.session.commit()
    return jsonify({"message": message.to_dict()}), 201


@messages_bp.delete("/<int:message_id>")
@admin_required
def delete_message(message_id):
    """删除留言（管理员）：软删除。"""
    message = db.session.get(Message, message_id)
    if message is None:
        return jsonify({"error": "留言不存在"}), 404
    message.is_deleted = True
    db.session.commit()
    return jsonify({"ok": True})

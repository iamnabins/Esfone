"""投稿相关接口"""

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Book, Chapter, Submission
from ..utils.auth import admin_required
from .auth import _decode_token

submissions_bp = Blueprint("submissions", __name__, url_prefix="/api/submissions")

MAX_CHAPTERS = 500
MAX_CHAPTER_CHARS = 100000


def _user_from_request():
    """从 Authorization Bearer 令牌解析登录用户（与 auth.py 同一套校验）。"""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    payload = _decode_token(header[7:].strip())
    if payload is None:
        return None
    meta = payload.get("user_metadata") or {}
    email = payload.get("email") or ""
    return {
        "id": payload.get("sub"),
        "email": email,
        "nickname": (
            (meta.get("nickname") or "").strip()
            or email.split("@")[0]
            or "匿名用户"
        ),
    }


@submissions_bp.post("")
def create_submission():
    """提交投稿（登录用户）。"""
    user = _user_from_request()
    if user is None:
        return jsonify({"error": "请先登录后再投稿"}), 401

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    author = (data.get("author") or "").strip()
    description = (data.get("description") or "").strip()
    if not title or not author or not description:
        return jsonify({"error": "书名、作者和书籍简介不能为空"}), 400

    raw = data.get("chapters")
    if not isinstance(raw, list) or not raw:
        return jsonify({"error": "请至少上传一个章节"}), 400
    if len(raw) > MAX_CHAPTERS:
        return jsonify({"error": f"单次投稿最多 {MAX_CHAPTERS} 章"}), 400

    chapters = []
    for item in raw:
        if not isinstance(item, dict):
            return jsonify({"error": "章节格式不正确"}), 400
        t = (item.get("title") or "").strip()
        content = (item.get("content") or "").strip()
        if not t or not content:
            return jsonify({"error": "章节标题和正文不能为空"}), 400
        if len(content) > MAX_CHAPTER_CHARS:
            return jsonify({"error": f"单章正文不能超过 {MAX_CHAPTER_CHARS} 字"}), 400
        chapters.append({"title": t, "content": content})

    sub = Submission(
        title=title,
        author=author,
        description=description,
        cover=(data.get("cover") or "").strip(),
        intro=(data.get("intro") or "").strip(),
        user_id=user["id"],
        nickname=user["nickname"],
        chapters=chapters,
        status="pending",
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify({"ok": True, "id": sub.id}), 201


@submissions_bp.get("")
@admin_required
def list_submissions():
    """投稿列表（管理员），支持 page/per_page/status。"""
    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1
    try:
        per = max(1, min(20, int(request.args.get("per_page", 10))))
    except ValueError:
        per = 10
    status = (request.args.get("status") or "").strip()

    query = Submission.query
    if status:
        query = query.filter(Submission.status == status)
    total = query.count()
    rows = (
        query.order_by(Submission.created_at.desc(), Submission.id.desc())
        .offset((page - 1) * per)
        .limit(per)
        .all()
    )
    return jsonify(
        {
            "submissions": [
                {
                    "id": s.id,
                    "title": s.title,
                    "author": s.author,
                    "nickname": (s.nickname or "").strip() or None,
                    "status": s.status,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "chapter_count": len(s.chapters or []),
                }
                for s in rows
            ],
            "total": total,
            "page": page,
            "per_page": per,
        }
    )


@submissions_bp.get("/<int:sub_id>")
@admin_required
def get_submission(sub_id):
    """投稿详情（管理员），含全部章节正文。"""
    sub = db.session.get(Submission, sub_id)
    if sub is None:
        return jsonify({"error": "投稿不存在"}), 404
    return jsonify(
        {
            "submission": {
                "id": sub.id,
                "title": sub.title,
                "author": sub.author,
                "description": sub.description,
                "cover": sub.cover or "",
                "nickname": (sub.nickname or "").strip() or None,
                "user_id": sub.user_id or None,
                "status": sub.status,
                "chapters": sub.chapters or [],
                "chapter_count": len(sub.chapters or []),
                "created_at": sub.created_at.isoformat() if sub.created_at else None,
            }
        }
    )


@submissions_bp.post("/<int:sub_id>/approve")
@admin_required
def approve_submission(sub_id):
    """通过投稿：创建书籍与章节并上架（管理员）。"""
    sub = db.session.get(Submission, sub_id)
    if sub is None:
        return jsonify({"error": "投稿不存在"}), 404
    if sub.status != "pending":
        return jsonify({"error": "该投稿已处理"}), 400

    book = Book(
        title=sub.title,
        author=sub.author,
        cover=sub.cover or "",
        description=sub.description or "",
        intro=sub.intro or "",
    )
    db.session.add(book)
    db.session.flush()
    for i, item in enumerate(sub.chapters or []):
        db.session.add(
            Chapter(
                book_id=book.id,
                title=(item.get("title") or "").strip(),
                content=(item.get("content") or "").strip(),
                order=i + 1,
            )
        )
    sub.status = "approved"
    sub.approved_book_id = book.id
    db.session.commit()
    return jsonify({"ok": True, "book_id": book.id})


@submissions_bp.post("/<int:sub_id>/reject")
@admin_required
def reject_submission(sub_id):
    """拒绝投稿（管理员）。"""
    sub = db.session.get(Submission, sub_id)
    if sub is None:
        return jsonify({"error": "投稿不存在"}), 404
    if sub.status != "pending":
        return jsonify({"error": "该投稿已处理"}), 400
    sub.status = "rejected"
    db.session.commit()
    return jsonify({"ok": True})

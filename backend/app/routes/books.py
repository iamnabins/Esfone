"""书籍相关接口"""

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from ..extensions import db
from ..models import Book, BookLike, Chapter, Favorite
from ..utils.auth import admin_required
from .auth import _decode_token

books_bp = Blueprint("books", __name__, url_prefix="/api/books")
favorites_bp = Blueprint("favorites", __name__, url_prefix="/api/favorites")


def _optional_user():
    """解析可选的登录用户（未登录或令牌无效时返回 None）。"""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    payload = _decode_token(header[7:].strip())
    if payload is None:
        return None
    return {"id": payload.get("sub"), "email": payload.get("email")}


@books_bp.get("")
def list_books():
    """获取书籍列表（公开）。支持 ?q=关键词 按书名/作者模糊搜索。"""
    q = (request.args.get("q") or "").strip()
    query = Book.query
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Book.title.ilike(like), Book.author.ilike(like)))
    books = query.order_by(Book.created_at.desc()).all()
    return jsonify({"books": [b.to_summary() for b in books]})


@books_bp.get("/<int:book_id>")
def get_book(book_id):
    """获取单本书详情，含章节、引言、点赞/收藏状态（公开，登录后返回状态）。"""
    book = db.session.get(Book, book_id)
    if book is None:
        return jsonify({"error": "书籍不存在"}), 404
    data = book.to_detail()
    user = _optional_user()
    liked = favorited = False
    if user:
        liked = BookLike.query.filter_by(
            user_id=user["id"], book_id=book_id
        ).first() is not None
        favorited = Favorite.query.filter_by(
            user_id=user["id"], book_id=book_id
        ).first() is not None
    data["intro"] = book.intro or ""
    data["likes"] = book.likes or 0
    data["liked"] = liked
    data["favorited"] = favorited
    return jsonify({"book": data})


@books_bp.post("")
@admin_required
def create_book():
    """添加新书（管理员）。"""
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    author = (data.get("author") or "").strip()
    if not title or not author:
        return jsonify({"error": "书名和作者不能为空"}), 400

    book = Book(
        title=title,
        author=author,
        cover=(data.get("cover") or "").strip(),
        description=(data.get("description") or "").strip(),
    )
    db.session.add(book)
    db.session.commit()
    return jsonify({"book": book.to_summary()}), 201


@books_bp.delete("/<int:book_id>")
@admin_required
def delete_book(book_id):
    """删除书籍，连带删除其所有章节（管理员）。"""
    book = db.session.get(Book, book_id)
    if book is None:
        return jsonify({"error": "书籍不存在"}), 404
    db.session.delete(book)
    db.session.commit()
    return jsonify({"ok": True})


@books_bp.post("/<int:book_id>/chapters")
@admin_required
def add_chapter(book_id):
    """为书籍添加章节（管理员）。"""
    book = db.session.get(Book, book_id)
    if book is None:
        return jsonify({"error": "书籍不存在"}), 404

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    if not title or not content:
        return jsonify({"error": "章节标题和正文不能为空"}), 400

    max_order = (
        db.session.query(db.func.max(Chapter.order))
        .filter(Chapter.book_id == book_id)
        .scalar()
        or 0
    )
    chapter = Chapter(
        book_id=book_id,
        title=title,
        content=content,
        order=max_order + 1,
    )
    db.session.add(chapter)
    db.session.commit()
    return (
        jsonify(
            {
                "chapter": {
                    "id": chapter.id,
                    "book_id": chapter.book_id,
                    "title": chapter.title,
                    "order": chapter.order,
                }
            }
        ),
        201,
    )


@books_bp.post("/<int:book_id>/like")
def like_book(book_id):
    """点赞书籍（登录用户）。"""
    user = _optional_user()
    if user is None:
        return jsonify({"error": "请先登录后再点赞"}), 401
    book = db.session.get(Book, book_id)
    if book is None:
        return jsonify({"error": "书籍不存在"}), 404
    db.session.merge(BookLike(user_id=user["id"], book_id=book_id))
    book.likes = BookLike.query.filter_by(book_id=book_id).count()
    db.session.commit()
    return jsonify({"ok": True, "likes": book.likes})


@books_bp.delete("/<int:book_id>/like")
def unlike_book(book_id):
    """取消点赞（登录用户）。"""
    user = _optional_user()
    if user is None:
        return jsonify({"error": "请先登录后再点赞"}), 401
    book = db.session.get(Book, book_id)
    if book is None:
        return jsonify({"error": "书籍不存在"}), 404
    BookLike.query.filter_by(user_id=user["id"], book_id=book_id).delete()
    book.likes = BookLike.query.filter_by(book_id=book_id).count()
    db.session.commit()
    return jsonify({"ok": True, "likes": book.likes})


@books_bp.post("/<int:book_id>/favorite")
def favorite_book(book_id):
    """收藏书籍（登录用户）。"""
    user = _optional_user()
    if user is None:
        return jsonify({"error": "请先登录后再收藏"}), 401
    book = db.session.get(Book, book_id)
    if book is None:
        return jsonify({"error": "书籍不存在"}), 404
    db.session.merge(Favorite(user_id=user["id"], book_id=book_id))
    db.session.commit()
    return jsonify({"ok": True})


@books_bp.delete("/<int:book_id>/favorite")
def unfavorite_book(book_id):
    """取消收藏（登录用户）。"""
    user = _optional_user()
    if user is None:
        return jsonify({"error": "请先登录后再收藏"}), 401
    book = db.session.get(Book, book_id)
    if book is None:
        return jsonify({"error": "书籍不存在"}), 404
    Favorite.query.filter_by(user_id=user["id"], book_id=book_id).delete()
    db.session.commit()
    return jsonify({"ok": True})


@favorites_bp.get("")
def list_favorites():
    """我的收藏列表（登录用户）。"""
    user = _optional_user()
    if user is None:
        return jsonify({"error": "请先登录"}), 401
    rows = (
        Favorite.query.filter_by(user_id=user["id"])
        .order_by(Favorite.created_at.desc(), Favorite.book_id.desc())
        .all()
    )
    ids = [r.book_id for r in rows]
    if not ids:
        return jsonify({"books": []})
    books = {b.id: b for b in Book.query.filter(Book.id.in_(ids)).all()}
    ordered = [books[i].to_summary() for i in ids if i in books]
    return jsonify({"books": ordered})

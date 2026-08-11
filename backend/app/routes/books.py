"""书籍相关接口"""

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from ..extensions import db
from ..models import Book, Chapter
from ..utils.auth import admin_required

books_bp = Blueprint("books", __name__, url_prefix="/api/books")


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
    """获取单本书详情，含章节列表（公开）。"""
    book = db.session.get(Book, book_id)
    if book is None:
        return jsonify({"error": "书籍不存在"}), 404
    return jsonify({"book": book.to_detail()})


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

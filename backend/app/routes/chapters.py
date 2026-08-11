"""章节接口"""

from flask import Blueprint, jsonify

from ..extensions import db
from ..models import Chapter

chapters_bp = Blueprint("chapters", __name__, url_prefix="/api/chapters")


@chapters_bp.get("/<int:chapter_id>")
def get_chapter(chapter_id):
    """获取章节正文，附带上一章/下一章信息（公开）。"""
    chapter = db.session.get(Chapter, chapter_id)
    if chapter is None:
        return jsonify({"error": "章节不存在"}), 404

    siblings = (
        Chapter.query.filter_by(book_id=chapter.book_id)
        .order_by(Chapter.order.asc(), Chapter.id.asc())
        .all()
    )
    prev_chapter = next_chapter = None
    for index, item in enumerate(siblings):
        if item.id == chapter.id:
            if index > 0:
                prev_chapter = {
                    "id": siblings[index - 1].id,
                    "title": siblings[index - 1].title,
                }
            if index < len(siblings) - 1:
                next_chapter = {
                    "id": siblings[index + 1].id,
                    "title": siblings[index + 1].title,
                }
            break

    return jsonify(
        {
            "chapter": {
                "id": chapter.id,
                "book_id": chapter.book_id,
                "book_title": chapter.book.title if chapter.book else "",
                "title": chapter.title,
                "content": chapter.content,
                "order": chapter.order,
                "prev": prev_chapter,
                "next": next_chapter,
            }
        }
    )

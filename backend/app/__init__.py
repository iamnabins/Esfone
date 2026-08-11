"""Flask 应用工厂"""

import os

from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config, INSTANCE_DIR
from .extensions import db
from .routes import admin_bp, auth_bp, books_bp, chapters_bp, messages_bp


def create_app():
    """创建并配置 Flask 应用实例。"""
    os.makedirs(INSTANCE_DIR, exist_ok=True)

    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app)

    app.register_blueprint(admin_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(books_bp)
    app.register_blueprint(chapters_bp)
    app.register_blueprint(messages_bp)

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "接口不存在"}), 404

    with app.app_context():
        from . import models  # noqa: F401  确保所有模型注册后再建表

        db.create_all()

    return app

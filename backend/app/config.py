"""应用配置：从 backend/.env 读取环境变量"""

import os

from dotenv import load_dotenv

# backend/ 目录（.env 位于此处）
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# SQLite 数据库所在目录
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or (
        "sqlite:///" + os.path.join(INSTANCE_DIR, "novel.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

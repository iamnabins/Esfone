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
    # 设置 DATABASE_URL 后即切换到 Supabase PostgreSQL；
    # 未设置时仍使用本地 SQLite，方便本地开发。
    _database_url = os.environ.get("DATABASE_URL") or (
        "sqlite:///" + os.path.join(INSTANCE_DIR, "novel.db")
    )
    # 标准 postgresql:// 连接串自动归一化到 psycopg3 方言
    if _database_url.startswith("postgresql://"):
        _database_url = "postgresql+psycopg://" + _database_url[len("postgresql://") :]
    SQLALCHEMY_DATABASE_URI = _database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

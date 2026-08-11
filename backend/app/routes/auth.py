"""用户认证接口：校验 Supabase Auth 签发的访问令牌"""

import jwt
from flask import Blueprint, current_app, jsonify, request

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _decode_token(token):
    """依次尝试 HS256（项目 JWT 密钥）与 RS256（新项目 JWKS）两种签名方式。"""
    secret = current_app.config.get("SUPABASE_JWT_SECRET") or ""
    if secret:
        try:
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"require": ["exp"]},
            )
        except jwt.PyJWTError:
            pass

    url = (current_app.config.get("SUPABASE_URL") or "").rstrip("/")
    if url:
        try:
            jwks_url = url + "/auth/v1/.well-known/jwks.json"
            key = jwt.PyJWKClient(jwks_url).get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                key.key,
                algorithms=["RS256"],
                audience="authenticated",
                options={"require": ["exp"]},
            )
        except jwt.PyJWTError:
            pass
    return None


@auth_bp.post("/verify")
def verify_token():
    """校验请求头 Authorization: Bearer <token>，返回用户基本信息。"""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return jsonify({"error": "缺少访问令牌"}), 401

    payload = _decode_token(header[7:].strip())
    if payload is None:
        configured = current_app.config.get("SUPABASE_JWT_SECRET") or current_app.config.get("SUPABASE_URL")
        if not configured:
            return jsonify({"error": "Supabase 尚未配置"}), 503
        return jsonify({"error": "访问令牌无效或已过期"}), 401

    meta = payload.get("user_metadata") or {}
    return jsonify(
        {
            "ok": True,
            "user": {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "nickname": meta.get("nickname") or "",
            },
        }
    )

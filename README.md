# 个人小说站

基于 **Vue 3 + Vite**（前端）与 **Flask + SQLite**（后端）的个人小说网站，支持书籍管理、在线阅读与公共留言板，整体风格参考 ESJ Zone，追求简洁、清晰、易用。

## 功能

- **书籍管理（管理员）**：添加 / 删除书籍（删除时连带删除全部章节）；在书籍详情页添加章节
- **在线阅读**：首页书籍卡片、书籍详情与章节列表、章节阅读页（上一章 / 下一章）
- **留言板（公开）**：无需登录即可查看与发布留言；管理员可删除不当留言
- **管理员鉴权**：请求头 `X-Admin-Token` 与后端环境变量 `ADMIN_TOKEN` 比对
- **防骚扰**：留言内容非空且不超过 500 字；按 IP 记录并做 30 秒发布频率限制
- **主题切换**：全站支持白天 / 黑夜模式，记住用户选择，默认跟随系统
- **默认封面**：未设置封面图的书籍自动使用默认封面图占位

## 目录结构

```text
Esfone/
├── frontend/   # Vue 3 + Vite 前端（Element Plus、Vue Router、Pinia）
└── backend/    # Flask 后端（Blueprint 包结构，Flask-SQLAlchemy）
```

## 本地运行

### 1. 后端（http://localhost:5000）

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

创建 `.env` 文件（参考 `.env.example`）：

```ini
ADMIN_TOKEN=你的管理员口令
SECRET_KEY=随便一串随机字符
```

启动后端：

```bash
python run.py
```

### 2. 前端（http://localhost:5173）

```bash
cd frontend
npm install
npm run dev
```

开发环境下 Vite 已将 `/api` 代理到 `http://localhost:5000`，无需额外配置。

## 部署

### 前端：Netlify

1. 将仓库推送到 GitHub，并在 Netlify 中新建站点（连接仓库）。
2. 构建命令：`npm run build`；发布目录：`dist`（`netlify.toml` 已配置）。
3. 如果前后端不同域，在 Netlify 的环境变量中设置 `VITE_API_BASE=https://你的后端地址`，重新构建。

### 后端：Render

1. 在 Render 新建 Web Service，连接同一个 GitHub 仓库。
2. 根目录填 `backend`；构建命令：`pip install -r requirements.txt`；启动命令：`gunicorn run:app`。
3. 在环境变量中设置 `ADMIN_TOKEN`（管理员口令）与可选的 `SECRET_KEY`。

## API 一览

| 接口 | 方法 | 说明 | 权限 |
| :--- | :--- | :--- | :--- |
| `/api/books` | GET | 书籍列表 | 公开 |
| `/api/books/<id>` | GET | 书籍详情（含章节） | 公开 |
| `/api/books` | POST | 添加书籍 | 管理员 |
| `/api/books/<id>` | DELETE | 删除书籍（连带章节） | 管理员 |
| `/api/books/<book_id>/chapters` | POST | 添加章节 | 管理员 |
| `/api/chapters/<id>` | GET | 章节正文（含上/下一章） | 公开 |
| `/api/messages` | GET | 留言列表（倒序） | 公开 |
| `/api/messages` | POST | 发布留言 | 公开 |
| `/api/messages/<id>` | DELETE | 删除留言（软删除） | 管理员 |

管理员接口需要请求头：`X-Admin-Token: <口令>`。

## 说明

- 数据库文件（SQLite）位于 `backend/instance/`，已被 `.gitignore` 忽略。
- 留言的 IP 仅用于防骚扰与频率限制，不对外展示。

# Esfone · 个人小说站

一款前后端分离的个人小说网站：支持书籍管理、在线阅读、公共留言板，以及基于 Supabase 的注册登录。整体风格参考 ESJ Zone，追求简洁、清晰、易用。

线上地址：https://esfone-novel.netlify.app

## 技术栈

| 端 | 技术 |
| :-- | :-- |
| 前端 | Vue 3 + Vite + Element Plus + Pinia + Vue Router |
| 后端 | 生产：Supabase Edge Functions（Deno）；本地开发：Python 3 + Flask + Flask-SQLAlchemy |
| 数据库 | Supabase PostgreSQL（本地未配置时可回退 SQLite） |
| 用户系统 | Supabase Auth |
| 部署 | Netlify（前端）+ Supabase Edge Functions（后端） |

## 功能特性

- **书籍卡片墙**：首页展示封面、书名、最新章节、作者，支持长列表滚轮浏览
- **阅读体验**：书籍详情与章节列表、阅读页上一章/下一章、正文衬线字体
- **书籍管理（管理员）**：添加/删除书籍（删除连带全部章节），书籍详情页添加章节
- **留言板（公开）**：500 字以内发布、倒序展示、超长留言折叠「查看全部」；管理员可删除
- **防骚扰**：记录留言 IP、30 秒发布频率限制
- **用户系统**：邮箱注册/登录（Supabase Auth），头部圆形用户图标，悬浮显示昵称、邮箱、注册时间
- **管理员鉴权**：`X-Admin-Token` 请求头与 `ADMIN_TOKEN` 环境变量比对，保存口令时先向后端校验
- **站内搜索**：头部放大镜展开搜索框，按书名/作者模糊查询
- **公告**：头部公告入口，居中弹窗展示，点击周边关闭
- **主题切换**：白天/黑夜模式一键切换（0.3s 渐变），记忆选择、默认跟随系统
- **默认封面**：未设置封面图的书籍自动使用默认封面（黑夜模式下为深色占位）

## 目录结构

```text
Esfone/
├── frontend/                 # Vue 3 前端
│   ├── src/
│   │   ├── api/              # 后端 API 封装
│   │   ├── lib/              # Supabase 客户端
│   │   ├── stores/           # Pinia（主题、管理员、用户）
│   │   ├── views/            # 首页/详情/阅读/留言板/管理后台/登录注册
│   │   └── ...
│   └── ...
└── backend/                  # Flask 后端
    ├── app/
    │   ├── models/           # 书籍/章节/留言模型
    │   ├── routes/           # books/chapters/messages/admin/auth 蓝图
    │   └── utils/            # 管理员鉴权
    ├── instance/             # 本地 SQLite 数据库（已被 gitignore）
    └── run.py                # 启动入口
```

## 快速开始

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

复制 `.env.example` 为 `.env`，至少设置：

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

开发环境下 Vite 已将 `/api` 代理到后端，浏览器打开 http://localhost:5173 即可使用。

### 3.（可选）接入 Supabase

见下方「Supabase 接入」。

## 使用指南

**普通用户**

- 点击头部圆形用户图标 → 注册/登录（邮箱 + 密码，注册可填昵称）
- 首页点击书籍卡片进入详情 → 点击章节开始阅读，阅读页支持上一章/下一章
- 留言板可发布留言；超长留言点「查看全部」展开
- 头部放大镜搜索书名/作者；「公告」按钮查看站点公告

**管理员**

- 进入「管理后台」，输入管理员口令（见 `backend/.env` 中的 `ADMIN_TOKEN`）并保存；口令正确才会开启管理功能
- 管理后台：添加/删除书籍
- 书籍详情页底部：添加章节、删除本书
- 留言板：删除不当留言

## API 一览

| 接口 | 方法 | 说明 | 权限 |
| :--- | :--- | :--- | :--- |
| `/api/books` | GET | 书籍列表（支持 `?q=关键词` 按书名/作者搜索） | 公开 |
| `/api/books/<id>` | GET | 书籍详情（含章节） | 公开 |
| `/api/books` | POST | 添加书籍 | 管理员 |
| `/api/books/<id>` | DELETE | 删除书籍（连带章节） | 管理员 |
| `/api/books/<book_id>/chapters` | POST | 添加章节 | 管理员 |
| `/api/chapters/<id>` | GET | 章节正文（含上/下一章） | 公开 |
| `/api/messages` | GET | 留言列表（倒序） | 公开 |
| `/api/messages` | POST | 发布留言（500 字以内） | 公开 |
| `/api/messages/<id>` | DELETE | 删除留言（软删除） | 管理员 |
| `/api/admin/verify` | POST | 校验管理员口令 | 管理员 |
| `/api/auth/verify` | POST | 校验用户访问令牌（Supabase JWT） | 登录用户 |

管理员接口需要请求头 `X-Admin-Token: <口令>`；用户接口需要 `Authorization: Bearer <token>`。


于 `backend/instance/`，已被 `.gitignore` 忽略；用户数据保存在 Supabase Auth 中，不进入项目数据库
- 留言的 IP 仅用于防骚扰与频率限制，不对外展示
- 代码所有版本均保存在 Git 历史中，可随时回退

# Esfone · 个人小说站

一款前后端分离的个人小说网站：支持书籍管理、在线阅读、公共留言板，以及基于 Supabase 的注册登录。整体风格参考 ESJ Zone，追求简洁、清晰、易用。

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

- 进入「管理后台」，输入管理员口令（本地预览默认 `admin123`）并保存；口令正确才会开启管理功能
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

## Supabase 接入（可选）

项目默认使用本地 SQLite；配置 Supabase 后，数据库与用户系统都会切换到 Supabase。

### 1. 创建项目

在 [supabase.com](https://supabase.com) 注册并新建一个项目（免费套餐即可），记下项目地址（如 `https://xxxx.supabase.co`）。

### 2. 获取密钥

进入项目后台 **Settings → API**，复制：

- Project URL → 填到 `SUPABASE_URL` / `VITE_SUPABASE_URL`
- anon public key → 填到 `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- JWT Secret → 填到 `SUPABASE_JWT_SECRET`（后端校验用户登录令牌用）

### 3. 关闭邮箱验证（注册即登录）

后台 **Authentication → Sign In / Up → Email**，关闭 **Confirm email** 开关。注册成功后会自动登录，无需收验证邮件。

### 4. 配置数据库与前端

后台 **Connect** 页面复制 PostgreSQL 连接串（推荐 Transaction pooler，端口 6543），填入后端 `.env`：

```ini
DATABASE_URL=postgresql://postgres.xxxx:密码@aws-0-xx.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=你的JWT密钥
```

前端 `.env`（本地开发可留空，部署时按需填写）：

```ini
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

首次启动时，后端会自动在 Supabase 数据库中创建 `books`、`chapters`、`messages` 三张表（`db.create_all()`）。未设置 `DATABASE_URL` 时仍使用本地 SQLite，不影响开发。

## 部署

### 前端：Netlify

1. 将仓库推送到 GitHub，并在 Netlify 中新建站点（连接仓库）。
2. 构建命令：`npm run build`；发布目录：`dist`（`netlify.toml` 已配置）。
3. 环境变量：`VITE_API_BASE=https://你的后端地址`，以及 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`；设置后重新构建。

### 后端：Supabase Edge Functions

生产环境后端是一个 Deno 云函数（`supabase/functions/api/index.ts`），路由 `/api/*`，与原 Flask 接口返回结构一致。

1. 部署函数（需 Supabase 管理令牌，或用 Supabase CLI）：

   ```bash
   supabase functions deploy api --project-ref <项目 ref> --no-verify-jwt
   ```

   部署完成后设置函数密钥（`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 由平台自动注入）：

   ```bash
   supabase secrets set --project-ref <项目 ref> ADMIN_TOKEN=<管理员口令>
   ```

2. 前端 `frontend/.env`：

   ```env
   VITE_API_BASE=https://<项目 ref>.supabase.co/functions/v1/api
   ```

3. 云函数使用 `service_role` 密钥访问数据库（只存在于函数环境变量中，不会暴露给前端）。

## 常见问题

**管理员口令是什么？**
本地开发在 `backend/.env` 的 `ADMIN_TOKEN` 中设置（本地预览示例为 `admin123`）；生产环境在云函数密钥（Secrets）中设置。

**怎么把数据库换成 Supabase？**
在 `backend/.env` 设置 `DATABASE_URL` 指向 Supabase PostgreSQL，并按上文配置 `SUPABASE_*` 变量。

**注册时提示连接失败？**
前端 `frontend/.env` 尚未配置 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`；配置后重启 `npm run dev`。

**留言有字数限制吗？**
有，500 字以内，前后端都会校验。

## 说明

- 本地 SQLite 文件位于 `backend/instance/`，已被 `.gitignore` 忽略；用户数据保存在 Supabase Auth 中，不进入项目数据库
- 留言的 IP 仅用于防骚扰与频率限制，不对外展示
- 代码所有版本均保存在 Git 历史中，可随时回退

# 🌊 漂流瓶

一个匿名留言的漂流瓶网页应用：把心事装进瓶子扔进大海，陌生人随机捞起后可以匿名回复。

## 功能

- **扔瓶子**：匿名写下一段话，投入大海
- **捞瓶子**：随机捞起一个陌生人的瓶子，阅读并匿名回复
- **我的瓶子**：查看自己扔的瓶子，以及收到的回复
- **匿名**：不注册、无密码，浏览器本地生成匿名 ID

## 技术栈

- **线上部署**：Cloudflare Workers（API）+ D1 免费数据库（持久化）+ 静态前端
- **本地开发**：Node.js + Express + 内置 `node:sqlite`
- 前端：React + Vite（两套后端共用同一套前端）

## 本地运行

要求：Node.js ≥ 22.5（内置 `node:sqlite`），推荐 24+

```bash
npm install

# 开发模式（后端 3001 + 前端 5173，热更新）
npm run dev
# 打开 http://localhost:5173

# 生产模式（Express 单端口 3001）
npm run build && npm start
```

本地数据保存在 `data.db`。

## 部署到 Cloudflare（免费、无需绑卡）

Cloudflare 免费层：Workers 每天 10 万次请求、D1 数据库 5GB 持久化存储，足够个人使用。

**1. 注册 Cloudflare**
打开 https://dash.cloudflare.com/sign-up ，用邮箱注册（无需信用卡）。

**2. 登录 wrangler（命令行工具）**

```bash
npm install          # 已含 wrangler
npx wrangler login   # 会打开浏览器，授权即可
```

**3. 创建 D1 数据库**

```bash
npx wrangler d1 create drift-bottle
```

命令会输出一段 `database_id`（形如 `xxxx-xxxx-...`），把它填到 `wrangler.toml` 里：

```toml
[[d1_databases]]
binding = "DB"
database_name = "drift-bottle"
database_id = "把这里替换成你的 database_id"
```

**4. 部署**

```bash
npm run deploy   # 等价于 npm run build && wrangler deploy
```

部署成功后会输出你的线上地址，形如：
```
https://drift-bottle.<你的子域名>.workers.dev
```

浏览器打开即可使用，把链接发给朋友。

## 目录结构

```
drift-bottle/
  worker/
    index.js    # Cloudflare Worker：API + D1（线上部署）
  server/
    index.js    # Express：API + SQLite（本地开发）
    db.js
  src/          # React 前端（两套后端共用）
  wrangler.toml # Cloudflare 部署配置
  vite.config.js
```

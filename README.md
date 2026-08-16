# 🌊 漂流瓶

一个匿名留言的漂流瓶网页应用：把心事装进瓶子扔进大海，陌生人随机捞起后可以匿名回复。

## 功能

- **扔瓶子**：匿名写下一段话，投入大海
- **捞瓶子**：随机捞起一个陌生人的瓶子，阅读并匿名回复
- **我的瓶子**：查看自己扔的瓶子，以及收到的回复
- **匿名**：不注册、无密码，浏览器本地生成匿名 ID

## 技术栈

- 后端：Node.js + Express
- 数据库：Node 内置 `node:sqlite`（零依赖、零编译）
- 前端：React + Vite
- 生产模式单进程托管 API 与静态页面

## 本地运行

要求：Node.js ≥ 22.5（内置 `node:sqlite`），推荐 24+

```bash
# 1. 安装依赖
npm install

# 2. 开发模式（后端 3001 + 前端 5173，自动热更新）
npm run dev
# 打开 http://localhost:5173

# 3. 生产模式（构建前端，单端口 3001 同时提供页面和 API）
npm run build
npm start
# 打开 http://localhost:3001
```

数据保存在项目根目录的 `data.db` 文件里。

## 测试多用户

用两个浏览器窗口（其中一个用无痕模式）模拟两个匿名用户：

1. 窗口 A 扔一个瓶子
2. 窗口 B 捞瓶子 → 能看到 A 的内容 → 回复
3. 窗口 A 打开「我的瓶子」→ 能看到 B 的回复

## 部署

这是一个单进程应用，可部署到任意支持 Node.js 的平台。

以 [Render](https://render.com)（免费）为例：

1. 新建 Web Service，关联本项目仓库
2. Build Command：`npm install && npm run build`
3. Start Command：`npm start`
4. 环境变量：`PORT`（平台会自动注入）

> 注意：SQLite 数据文件会随容器重建而丢失。要长期保存数据，可把 `DB_PATH` 环境变量指向一个持久化磁盘/卷（例如 Render 的 Disk），或改用远程数据库。

## 目录结构

```
drift-bottle/
  server/
    index.js   # Express：API + 生产时托管 dist/
    db.js      # node:sqlite 建表与查询
  src/
    App.jsx    # 主界面 + 三个视图
    api.js     # fetch 封装
    styles.css # 海洋主题样式
    main.jsx   # 入口
  index.html
  vite.config.js
```

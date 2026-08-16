import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  createBottle,
  pickBottle,
  getBottleWithReplies,
  createReply,
  getMyBottles,
  getStats
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// ---------- API ----------
app.post('/api/bottles', (req, res) => {
  const { content, author_id } = req.body || {}
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: '内容不能为空' })
  }
  if (!author_id) return res.status(400).json({ error: '缺少 author_id' })
  res.json(createBottle(String(content).trim(), author_id))
})

app.get('/api/bottles/pick', (req, res) => {
  const { author_id } = req.query
  if (!author_id) return res.status(400).json({ error: '缺少 author_id' })
  res.json(pickBottle(String(author_id))) // 大海里没有瓶子时返回 null
})

app.get('/api/bottles/mine', (req, res) => {
  const { author_id } = req.query
  if (!author_id) return res.status(400).json({ error: '缺少 author_id' })
  res.json(getMyBottles(String(author_id)))
})

app.get('/api/bottles/:id', (req, res) => {
  const bottle = getBottleWithReplies(Number(req.params.id))
  if (!bottle) return res.status(404).json({ error: '瓶子不存在' })
  res.json(bottle)
})

app.post('/api/bottles/:id/replies', (req, res) => {
  const { content, author_id } = req.body || {}
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: '回复不能为空' })
  }
  if (!author_id) return res.status(400).json({ error: '缺少 author_id' })
  const reply = createReply(Number(req.params.id), String(content).trim(), author_id)
  if (!reply) return res.status(404).json({ error: '瓶子不存在' })
  res.json(reply)
})

app.get('/api/stats', (req, res) => {
  res.json(getStats())
})

// ---------- 生产模式：托管前端构建产物（仅当 dist/ 存在时） ----------
const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  // SPA 回退：非 /api 的 GET 请求返回 index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'))
    }
    next()
  })
}

app.listen(PORT, () => {
  console.log(`🌊 漂流瓶后端已启动: http://localhost:${PORT}`)
})

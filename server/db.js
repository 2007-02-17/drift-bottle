import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 数据库文件默认放在项目根目录，可用环境变量 DB_PATH 覆盖（部署到只读文件系统时指向可写卷）
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.db')

const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS bottles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    author_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    reply_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bottle_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bottle_id INTEGER NOT NULL,
    picker_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`)

const now = () => new Date().toISOString()

export function createBottle(content, authorId) {
  const info = db
    .prepare('INSERT INTO bottles (content, author_id, created_at) VALUES (?, ?, ?)')
    .run(content, authorId, now())
  return getBottle(Number(info.lastInsertRowid))
}

export function getBottle(id) {
  return db.prepare('SELECT * FROM bottles WHERE id = ?').get(id)
}

export function getBottleWithReplies(id) {
  const bottle = getBottle(id)
  if (!bottle) return null
  const replies = db
    .prepare('SELECT * FROM replies WHERE bottle_id = ? ORDER BY id ASC')
    .all(id)
  return { ...bottle, replies }
}

export function pickBottle(pickerId) {
  // 优先捞一个「不是自己扔的」且「自己没捞过」的瓶子
  let bottle = db
    .prepare(
      `SELECT * FROM bottles
       WHERE author_id != ?
         AND id NOT IN (SELECT bottle_id FROM picks WHERE picker_id = ?)
       ORDER BY RANDOM() LIMIT 1`
    )
    .get(pickerId, pickerId)

  // 回退：随便一个不是自己扔的瓶子
  if (!bottle) {
    bottle = db
      .prepare('SELECT * FROM bottles WHERE author_id != ? ORDER BY RANDOM() LIMIT 1')
      .get(pickerId)
  }

  if (!bottle) return null

  db.prepare('INSERT INTO picks (bottle_id, picker_id, created_at) VALUES (?, ?, ?)').run(
    bottle.id,
    pickerId,
    now()
  )
  return getBottleWithReplies(bottle.id)
}

export function createReply(bottleId, content, authorId) {
  const bottle = getBottle(bottleId)
  if (!bottle) return null
  const info = db
    .prepare('INSERT INTO replies (bottle_id, content, author_id, created_at) VALUES (?, ?, ?, ?)')
    .run(bottleId, content, authorId, now())
  db.prepare('UPDATE bottles SET reply_count = reply_count + 1 WHERE id = ?').run(bottleId)
  return db.prepare('SELECT * FROM replies WHERE id = ?').get(Number(info.lastInsertRowid))
}

export function getMyBottles(authorId) {
  const bottles = db
    .prepare('SELECT * FROM bottles WHERE author_id = ? ORDER BY id DESC')
    .all(authorId)
  return bottles.map((b) => {
    const replies = db
      .prepare('SELECT * FROM replies WHERE bottle_id = ? ORDER BY id ASC')
      .all(b.id)
    return { ...b, replies }
  })
}

export function getStats() {
  const bottles = db.prepare('SELECT COUNT(*) AS n FROM bottles').get().n
  const replies = db.prepare('SELECT COUNT(*) AS n FROM replies').get().n
  return { bottles, replies }
}

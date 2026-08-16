// Cloudflare Worker：处理 /api/* 请求，其余交给静态资源（dist/）
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url)
    }
    // 静态资源（index.html、assets/*）
    return env.ASSETS.fetch(request)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}

async function handleApi(request, env, url) {
  const method = request.method
  const path = url.pathname

  try {
    await ensureTables(env)

    // POST /api/bottles —— 扔瓶子
    if (method === 'POST' && path === '/api/bottles') {
      const { content, author_id } = await request.json()
      if (!content || !String(content).trim()) return json({ error: '内容不能为空' }, 400)
      if (!author_id) return json({ error: '缺少 author_id' }, 400)
      return json(await createBottle(env, String(content).trim(), author_id))
    }

    // GET /api/bottles/pick —— 捞瓶子
    if (method === 'GET' && path === '/api/bottles/pick') {
      const author_id = url.searchParams.get('author_id')
      if (!author_id) return json({ error: '缺少 author_id' }, 400)
      return json(await pickBottle(env, author_id)) // 大海里没有瓶子时返回 null
    }

    // GET /api/bottles/mine —— 我的瓶子
    if (method === 'GET' && path === '/api/bottles/mine') {
      const author_id = url.searchParams.get('author_id')
      if (!author_id) return json({ error: '缺少 author_id' }, 400)
      return json(await getMyBottles(env, author_id))
    }

    // GET /api/stats
    if (method === 'GET' && path === '/api/stats') {
      return json(await getStats(env))
    }

    // GET /api/bottles/:id
    const bottleMatch = path.match(/^\/api\/bottles\/(\d+)$/)
    if (method === 'GET' && bottleMatch) {
      const b = await getBottleWithReplies(env, Number(bottleMatch[1]))
      if (!b) return json({ error: '瓶子不存在' }, 404)
      return json(b)
    }

    // POST /api/bottles/:id/replies —— 回复
    const replyMatch = path.match(/^\/api\/bottles\/(\d+)\/replies$/)
    if (method === 'POST' && replyMatch) {
      const { content, author_id } = await request.json()
      if (!content || !String(content).trim()) return json({ error: '回复不能为空' }, 400)
      if (!author_id) return json({ error: '缺少 author_id' }, 400)
      const reply = await createReply(env, Number(replyMatch[1]), String(content).trim(), author_id)
      if (!reply) return json({ error: '瓶子不存在' }, 404)
      return json(reply)
    }

    return json({ error: 'Not Found' }, 404)
  } catch (err) {
    return json({ error: '服务器错误' }, 500)
  }
}

// ---------- 建表（幂等） ----------
let initialized = false
async function ensureTables(env) {
  if (initialized) return
  await env.DB.exec(`
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
  initialized = true
}

const now = () => new Date().toISOString()

async function createBottle(env, content, authorId) {
  const res = await env.DB.prepare(
    'INSERT INTO bottles (content, author_id, created_at) VALUES (?, ?, ?)'
  )
    .bind(content, authorId, now())
    .run()
  const id = res.meta.last_row_id
  return env.DB.prepare('SELECT * FROM bottles WHERE id = ?').bind(id).first()
}

async function getBottleWithReplies(env, id) {
  const bottle = await env.DB.prepare('SELECT * FROM bottles WHERE id = ?').bind(id).first()
  if (!bottle) return null
  const { results: replies } = await env.DB.prepare(
    'SELECT * FROM replies WHERE bottle_id = ? ORDER BY id ASC'
  )
    .bind(id)
    .all()
  return { ...bottle, replies }
}

async function pickBottle(env, pickerId) {
  // 优先捞「不是自己扔的」且「自己没捞过」的瓶子
  let bottle = await env.DB.prepare(
    `SELECT * FROM bottles
     WHERE author_id != ?
       AND id NOT IN (SELECT bottle_id FROM picks WHERE picker_id = ?)
     ORDER BY RANDOM() LIMIT 1`
  )
    .bind(pickerId, pickerId)
    .first()

  // 回退：随便一个不是自己扔的瓶子
  if (!bottle) {
    bottle = await env.DB.prepare(
      'SELECT * FROM bottles WHERE author_id != ? ORDER BY RANDOM() LIMIT 1'
    )
      .bind(pickerId)
      .first()
  }

  if (!bottle) return null

  await env.DB.prepare('INSERT INTO picks (bottle_id, picker_id, created_at) VALUES (?, ?, ?)')
    .bind(bottle.id, pickerId, now())
    .run()

  return getBottleWithReplies(env, bottle.id)
}

async function createReply(env, bottleId, content, authorId) {
  const bottle = await env.DB.prepare('SELECT * FROM bottles WHERE id = ?').bind(bottleId).first()
  if (!bottle) return null

  const res = await env.DB.prepare(
    'INSERT INTO replies (bottle_id, content, author_id, created_at) VALUES (?, ?, ?, ?)'
  )
    .bind(bottleId, content, authorId, now())
    .run()
  const id = res.meta.last_row_id

  await env.DB.prepare('UPDATE bottles SET reply_count = reply_count + 1 WHERE id = ?')
    .bind(bottleId)
    .run()

  return env.DB.prepare('SELECT * FROM replies WHERE id = ?').bind(id).first()
}

async function getMyBottles(env, authorId) {
  const { results: bottles } = await env.DB.prepare(
    'SELECT * FROM bottles WHERE author_id = ? ORDER BY id DESC'
  )
    .bind(authorId)
    .all()

  const out = []
  for (const b of bottles) {
    const { results: replies } = await env.DB.prepare(
      'SELECT * FROM replies WHERE bottle_id = ? ORDER BY id ASC'
    )
      .bind(b.id)
      .all()
    out.push({ ...b, replies })
  }
  return out
}

async function getStats(env) {
  const b = await env.DB.prepare('SELECT COUNT(*) AS n FROM bottles').first()
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM replies').first()
  return { bottles: b.n, replies: r.n }
}

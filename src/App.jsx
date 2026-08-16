import { useEffect, useState } from 'react'
import { throwBottle, pickBottle, replyBottle, getMyBottles, getStats } from './api.js'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  )
}

function getAnonymousId() {
  let id = localStorage.getItem('drift_bottle_id')
  if (!id) {
    id = uuid()
    localStorage.setItem('drift_bottle_id', id)
  }
  return id
}

const ANON_ID = getAnonymousId()

function shortId(id) {
  return id ? '#' + id.slice(0, 4).toUpperCase() : '#----'
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

export default function App() {
  const [tab, setTab] = useState('throw')
  const [stats, setStats] = useState({ bottles: 0, replies: 0 })

  const refreshStats = () => {
    getStats().then(setStats).catch(() => {})
  }

  useEffect(() => {
    refreshStats()
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="hero">
          <span className="hero-bottle">🍾</span>
          <h1>漂流瓶</h1>
        </div>
        <p className="subtitle">把心事装进瓶子，扔进大海，等一个陌生人捡起</p>
        <div className="stats">
          <span>
            大海里漂着 <b>{stats.bottles}</b> 个瓶子
          </span>
          <span>
            累计 <b>{stats.replies}</b> 条回复
          </span>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'throw' ? 'active' : ''} onClick={() => setTab('throw')}>
          扔瓶子
        </button>
        <button className={tab === 'pick' ? 'active' : ''} onClick={() => setTab('pick')}>
          捞瓶子
        </button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          我的瓶子
        </button>
      </nav>

      <main className="content">
        {tab === 'throw' && <ThrowView onThrown={refreshStats} />}
        {tab === 'pick' && <PickView />}
        {tab === 'mine' && <MineView />}
      </main>
    </div>
  )
}

function ThrowView({ onThrown }) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const text = content.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      await throwBottle(text, ANON_ID)
      setContent('')
      setDone(true)
      onThrown()
      setTimeout(() => setDone(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="view">
      <form className="card" onSubmit={submit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写点什么吧……一句心事、一个秘密、一个问题，或一句祝福"
          maxLength={500}
          rows={6}
        />
        <div className="row-between">
          <span className="count">{content.length}/500</span>
          <button className="btn primary" type="submit" disabled={sending}>
            {sending ? '投入中…' : '扔进大海 🌊'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {done && <p className="success">瓶子已投入大海，等一个陌生人捡起 💙</p>}
      </form>
    </div>
  )
}

function PickView() {
  const [bottle, setBottle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')

  async function doPick() {
    setLoading(true)
    setEmpty(false)
    setError('')
    setBottle(null)
    setReply('')
    try {
      const b = await pickBottle(ANON_ID)
      if (!b) setEmpty(true)
      else setBottle(b)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitReply(e) {
    e.preventDefault()
    const text = reply.trim()
    if (!text || !bottle) return
    try {
      const r = await replyBottle(bottle.id, text, ANON_ID)
      setBottle({
        ...bottle,
        replies: [...(bottle.replies || []), r],
        reply_count: (bottle.reply_count || 0) + 1
      })
      setReply('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="view center">
        <div className="wave-loader">
          <span>🌊</span>
        </div>
        <p className="hint">正在打捞漂流瓶…</p>
      </div>
    )
  }

  if (!bottle) {
    return (
      <div className="view center">
        <div className="hero-bottle bob">🍾</div>
        <p className="hint">
          {empty ? '大海里暂时没有瓶子，去扔一个吧～' : '捞一个漂流瓶，看看陌生人的心事'}
        </p>
        <button className="btn primary big" onClick={doPick}>
          捞瓶子 🎣
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="view">
      <div className="card bottle-card">
        <div className="bottle-meta">
          <span className="tag">来自 {shortId(bottle.author_id)}</span>
          <span className="time">{timeAgo(bottle.created_at)}</span>
        </div>
        <p className="bottle-content">{bottle.content}</p>

        <div className="replies">
          <h3>回复（{bottle.reply_count || (bottle.replies || []).length}）</h3>
          {(bottle.replies || []).length === 0 && (
            <p className="muted">还没有回复，做第一个回应的人吧</p>
          )}
          {(bottle.replies || []).map((r) => (
            <div className="reply" key={r.id}>
              <div className="bottle-meta">
                <span className="tag">瓶友 {shortId(r.author_id)}</span>
                <span className="time">{timeAgo(r.created_at)}</span>
              </div>
              <p>{r.content}</p>
            </div>
          ))}
        </div>

        <form className="reply-form" onSubmit={submitReply}>
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="匿名回复一句……"
            maxLength={500}
          />
          <button className="btn primary" type="submit" disabled={!reply.trim()}>
            回复
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        <button
          className="btn ghost full"
          onClick={() => {
            setBottle(null)
            setReply('')
            setError('')
          }}
        >
          再捞一个 →
        </button>
      </div>
    </div>
  )
}

function MineView() {
  const [bottles, setBottles] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyBottles(ANON_ID).then(setBottles).catch((err) => setError(err.message))
  }, [])

  return (
    <div className="view">
      <div className="id-banner">
        你的匿名身份：<b>{shortId(ANON_ID)}</b>
        <span className="muted">（存在本浏览器，别清除站点数据，否则找不回自己的瓶子）</span>
      </div>

      {error && <p className="error">{error}</p>}
      {bottles === null && <p className="muted center">加载中…</p>}

      {bottles && bottles.length === 0 && (
        <div className="center">
          <p className="hint">你还没扔过瓶子，去扔一个吧 💙</p>
        </div>
      )}

      {bottles &&
        bottles.map((b) => (
          <div className="card bottle-card" key={b.id}>
            <div className="bottle-meta">
              <span className="time">{timeAgo(b.created_at)}</span>
              <span className="tag">{b.reply_count} 条回复</span>
            </div>
            <p className="bottle-content">{b.content}</p>
            <div className="replies">
              {(b.replies || []).length === 0 ? (
                <p className="muted">还没有回复，静静等待有缘人…</p>
              ) : (
                (b.replies || []).map((r) => (
                  <div className="reply" key={r.id}>
                    <div className="bottle-meta">
                      <span className="tag">瓶友 {shortId(r.author_id)}</span>
                      <span className="time">{timeAgo(r.created_at)}</span>
                    </div>
                    <p>{r.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
    </div>
  )
}

// 相对路径：开发时走 Vite 代理到后端，生产时同端口同源
async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    let msg = '请求失败'
    try {
      const data = await res.json()
      msg = data.error || msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json()
}

export function throwBottle(content, authorId) {
  return request('/api/bottles', {
    method: 'POST',
    body: JSON.stringify({ content, author_id: authorId })
  })
}

export function pickBottle(authorId) {
  return request(`/api/bottles/pick?author_id=${encodeURIComponent(authorId)}`)
}

export function replyBottle(bottleId, content, authorId) {
  return request(`/api/bottles/${bottleId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content, author_id: authorId })
  })
}

export function getMyBottles(authorId) {
  return request(`/api/bottles/mine?author_id=${encodeURIComponent(authorId)}`)
}

export function getStats() {
  return request('/api/stats')
}

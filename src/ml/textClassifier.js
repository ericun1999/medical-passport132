export const LABELS = [
  {
    id: 'amoxicillin-clavulanic-acid',
    name: 'AMOXICILLIN CLAVULANIC ACID',
    keywords: [
      'amoxicillin',
      'amoxycillin',
      'amoxicilina',
      'amoxil',
      'augmentin',
      'clavulanic',
      'clavulanate',
      'clavulanico',
      'amoxiclav',
      'coamoxiclav',
    ],
  },
  {
    id: 'ambroxol-hcl',
    name: 'AMBROXOL HCL',
    keywords: ['ambroxol', 'ambroxolum', 'mucosolvan', 'ambroxolhydrochloride'],
  },
]

export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/5/g, 's')
    .replace(/[^a-z\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function distance(a, b) {
  if (a === b) return 0
  const rows = a.length + 1
  const cols = b.length + 1
  const m = Array.from({ length: rows }, () => new Array(cols).fill(0))
  for (let i = 0; i < rows; i++) m[i][0] = i
  for (let j = 0; j < cols; j++) m[0][j] = j
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost)
    }
  }
  return m[a.length][b.length]
}

function keywordHits(text, keywords) {
  const compact = text.replace(/\s+/g, '')
  let score = 0
  for (const key of keywords) {
    if (text.includes(key) || compact.includes(key)) {
      score += key.length
      continue
    }
    for (const word of text.split(' ')) {
      if (word.length < 5 || key.length < 5) continue
      const allowed = key.length >= 8 ? 2 : 1
      if (distance(word, key) <= allowed) score += key.length * 0.8
    }
  }
  return score
}

export function splitTexts(raw) {
  return String(raw || '')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 3)
}

export function mergeTexts(existing, incoming) {
  const next = [...existing]
  for (const line of incoming) {
    const normalized = normalizeText(line)
    if (!normalized) continue
    const duplicate = next.some((item) => {
      const a = normalizeText(item)
      return a.includes(normalized) || normalized.includes(a)
    })
    if (!duplicate) next.push(line.trim())
  }
  return next
}

export function classifyText(text) {
  const normalized = normalizeText(text)
  const raw = LABELS.map((item) => keywordHits(normalized, item.keywords))
  const total = raw.reduce((sum, value) => sum + value, 0)
  const scores = LABELS.map((item, index) => ({
    id: item.id,
    name: item.name,
    score: total ? raw[index] / total : 0,
    hits: raw[index],
  }))
  const top = scores.reduce((best, item) => (item.hits > best.hits ? item : best), scores[0])
  const confident = top.hits >= 6
  return {
    label: confident ? top.id : null,
    name: confident ? top.name : null,
    confidence: top.score,
    scores,
    confident,
    text,
  }
}

export function classifyAllTexts(lines) {
  const items = lines.map((text) => ({ text, ...classifyText(text) }))
  const found = new Set(items.filter((item) => item.confident).map((item) => item.label))
  const pending = items.filter((item) => !item.confident && normalizeText(item.text).replace(/\s/g, '').length >= 6)
  const combined = classifyText(lines.join(' '))
  if (combined.confident) found.add(combined.label)
  return {
    items,
    found: LABELS.filter((item) => found.has(item.id)),
    pending,
    combined,
    complete: pending.length === 0 && found.size > 0,
  }
}

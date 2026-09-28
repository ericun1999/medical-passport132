export const CONDITION_IDS = [
  'none',
  'hypertension',
  'diabetes',
  'highCholesterol',
  'heartDisease',
  'arrhythmia',
  'stroke',
  'asthma',
  'copd',
  'kidneyDisease',
  'liverDisease',
  'hepatitisB',
  'gout',
  'arthritis',
  'osteoporosis',
  'thyroid',
  'anemia',
  'epilepsy',
  'cancer',
  'depression',
  'gastricUlcer',
]

export function parseHistory(value, t) {
  const parts = String(value || '')
    .split(/[,、，]/)
    .map((part) => part.trim())
    .filter(Boolean)
  const ids = []
  for (const part of parts) {
    if (CONDITION_IDS.includes(part)) {
      if (!ids.includes(part)) ids.push(part)
      continue
    }
    const match = CONDITION_IDS.find((id) => t?.conditions?.[id] === part)
    if (match && !ids.includes(match)) ids.push(match)
  }
  return ids
}

export function formatHistory(value, t, empty = '') {
  const text = String(value || '').trim()
  if (!text) return empty
  const ids = parseHistory(text, t)
  if (!ids.length) return text
  return ids.map((id) => t?.conditions?.[id] || id).join(t?.historyJoin || '、')
}

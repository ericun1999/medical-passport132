export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
export const RX_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'
export const TX_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9'
export const DEVICE_NAME = 'SmartPillBox'

export const MAX_DAYS = 4
export const DOSES_PER_DAY = 2
export const SLOT_COUNT = MAX_DAYS * DOSES_PER_DAY
export const DEFAULT_TOLERANCE = 1

const UNUSED_TIME = '99:99'

export const SLOT_STATE = {
  pending: '0',
  alerting: '1',
  overdue: '2',
  taken: '3',
}

export function bleError(code) {
  const error = new Error(`SmartPill: ${code}`)
  error.code = code
  return error
}

export function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateInput(value) {
  const [year, month, day] = String(value || '').split('-').map((part) => Number(part))
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

export function addDays(value, days) {
  const date = parseDateInput(value)
  date.setDate(date.getDate() + days)
  return formatDateInput(date)
}

/**
 * The box fires twice a day, so the two earliest enabled alarms become dose 1
 * and dose 2. Any further alarms still ring on the phone but have no slot.
 * Always returns DOSES_PER_DAY entries, using null where no alarm is available.
 */
export function pickDoseAlarms(alarms) {
  const ordered = (alarms || [])
    .filter((alarm) => alarm?.enabled && alarm?.time)
    .sort((left, right) => normalizeTime(left.time).localeCompare(normalizeTime(right.time)))
  return Array.from({ length: DOSES_PER_DAY }, (_, dose) => ordered[dose] || null)
}

/** Slot i covers dose (i % 2) of day floor(i / 2), counting from `startDate`. */
export function buildSlots(startDate, doseAlarms) {
  return Array.from({ length: SLOT_COUNT }, (_, index) => {
    const dose = index % DOSES_PER_DAY
    const alarm = doseAlarms?.[dose] || null
    return {
      date: addDays(startDate, Math.floor(index / DOSES_PER_DAY)),
      time: alarm?.time || '',
      alarmId: alarm?.id || '',
      name: alarm?.name || '',
      tag: alarm?.tag || '',
      linked: Boolean(alarm),
    }
  })
}

export function normalizeTime(value) {
  const [hour, minute] = String(value || '').split(':').map((part) => Number(part))
  const safeHour = Number.isFinite(hour) ? Math.min(Math.max(Math.trunc(hour), 0), 23) : 8
  const safeMinute = Number.isFinite(minute) ? Math.min(Math.max(Math.trunc(minute), 0), 59) : 0
  return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`
}

/**
 * Slots past the chosen day count, and doses with no alarm behind them, go out
 * as the 99:99 sentinel so the box never fires them. Values are re-normalized
 * here so a stale stored field can never send the box a malformed line.
 */
export function buildSetPayload(slots, dayCount, tolerance) {
  const activeSlots = dayCount * DOSES_PER_DAY
  return slots.reduce((payload, slot, index) => {
    const date = formatDateInput(parseDateInput(slot.date))
    const live = index < activeSlots && slot.linked !== false
    return `${payload}|${index},${date},${live ? normalizeTime(slot.time) : UNUSED_TIME}`
  }, `SET:${tolerance}`)
}

export function buildTimeSync(now) {
  const parts = [
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ]
  return `T:${parts.join('-')}`
}

export const RESET_PAYLOAD = 'RESET'

/** Returns the 8 slot states from an `S:0,1,2,3,...` notification, or null for other messages. */
export function parseSlotStates(text) {
  if (!String(text || '').startsWith('S:')) return null
  const states = text.slice(2).split(',')
  return Array.from({ length: SLOT_COUNT }, (_, index) => states[index]?.trim() || SLOT_STATE.pending)
}

export function textToBytes(text) {
  return Array.from(String(text), (char) => char.charCodeAt(0) & 0xff)
}

export function bytesToText(bytes) {
  return Array.from(bytes || [], (byte) => String.fromCharCode(byte)).join('')
}

const BASE_UUID_TAIL = '-0000-1000-8000-00805f9b34fb'

/** iOS may report assigned UUIDs in 16/32-bit form, so compare in expanded 128-bit form. */
export function sameUuid(left, right) {
  const expand = (value) => {
    const uuid = String(value || '').trim().toLowerCase()
    if (uuid.length === 4) return `0000${uuid}${BASE_UUID_TAIL}`
    if (uuid.length === 8) return `${uuid}${BASE_UUID_TAIL}`
    return uuid
  }
  const expanded = expand(left)
  return Boolean(expanded) && expanded === expand(right)
}

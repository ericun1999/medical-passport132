import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { translations } from '../i18n/translations'
import { initNotifications, ringAlarm, startForegroundWatcher, syncAlarmNotifications, testAlarmInSeconds } from '../notifications'

const STORAGE_KEYS = {
  lang: 'mp-lang',
  passport: 'mp-passport',
  alarms: 'mp-alarms',
}

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzkWydn3n50G70nngq5_4oWLsK6QlReDsYcoUZb7Bffl-bCiW6s7O6X87gfm0_-mgZd/exec'
function periodFromTime(time) {
  const hour = Number(String(time).split(':')[0])
  return hour < 12 ? 'AM' : 'PM'
}

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const defaultPassport = {
  name: '',
  blood: 'O',
  contact: '',
  history: '',
  allergy: '',
  meds: '',
}

const defaultAlarms = [
  {
    id: 'default-amox',
    time: '08:00',
    period: 'AM',
    name: '阿莫西林 (預設)',
    tag: '每日服藥',
    slot: '',
    enabled: true,
  },
]

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [lang, setLang] = useState('zh-HK')
  const [passport, setPassport] = useState(defaultPassport)
  const [alarms, setAlarms] = useState(defaultAlarms)
  const [notifyOk, setNotifyOk] = useState(false)
  const alarmsRef = useRef(defaultAlarms)
  alarmsRef.current = alarms

  const t = translations[lang] || translations['zh-HK']

  useEffect(() => {
    ;(async () => {
      try {
        const [savedLang, savedPassport, savedAlarms] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.lang),
          AsyncStorage.getItem(STORAGE_KEYS.passport),
          AsyncStorage.getItem(STORAGE_KEYS.alarms),
        ])
        if (savedLang) setLang(savedLang)
        if (savedPassport) setPassport(JSON.parse(savedPassport))
        if (savedAlarms) setAlarms(JSON.parse(savedAlarms))
      } catch {
        /* keep defaults */
      }
      const granted = await initNotifications().catch(() => false)
      setNotifyOk(Boolean(granted))
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!ready) return
    AsyncStorage.setItem(STORAGE_KEYS.lang, lang).catch(() => {})
  }, [lang, ready])

  useEffect(() => {
    if (!ready) return
    AsyncStorage.setItem(STORAGE_KEYS.passport, JSON.stringify(passport)).catch(() => {})
  }, [passport, ready])

  useEffect(() => {
    if (!ready) return
    AsyncStorage.setItem(STORAGE_KEYS.alarms, JSON.stringify(alarms)).catch(() => {})
    syncAlarmNotifications(alarms).catch((err) => console.error('Alarm sync failed', err))
  }, [alarms, ready])

  useEffect(() => {
    if (!ready) return
    return startForegroundWatcher(() => alarmsRef.current)
  }, [ready])

  const value = useMemo(
    () => ({
      ready,
      notifyOk,
      requestNotify: async () => {
        const granted = await initNotifications()
        setNotifyOk(Boolean(granted))
        if (granted) await syncAlarmNotifications(alarms)
        return granted
      },
      testAlarm: async () => {
        const granted = await initNotifications()
        setNotifyOk(Boolean(granted))
        const payload = { name: t.alarmHeader, tag: t.dailyMed }
        try {
          await testAlarmInSeconds(5, payload)
        } catch (err) {
          console.error(err)
        }
        setTimeout(() => {
          ringAlarm(payload).catch((err) => console.error(err))
        }, 5000)
      },
      lang,
      setLang,
      t,
      passport,
      savePassport: (data) => setPassport(data),
      alarms,
      toggleAlarm: (id) =>
        setAlarms((prev) => prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))),
      addAlarm: ({ time, name, tag }) =>
        setAlarms((prev) => [
          ...prev,
          {
            id: uid(),
            time,
            period: periodFromTime(time),
            name,
            tag: tag || t.afterMeal,
            slot: '',
            enabled: true,
          },
        ]),
      replaceAlarmsFromScan: (medNames) => {
        const names = Array.isArray(medNames) ? medNames : [medNames]
        const slots = [
          { time: '08:00', period: 'AM', tagKey: 'morning' },
          { time: '13:00', period: 'PM', tagKey: 'noon' },
          { time: '19:00', period: 'PM', tagKey: 'evening' },
        ]
        setAlarms((prev) => {
          const next = [...prev]
          for (const name of names) {
            for (const slot of slots) {
              const alarmName = `${name} (${t[slot.tagKey]})`
              const exists = next.some((item) => item.name === alarmName && item.time === slot.time)
              if (exists) continue
              next.push({
                id: uid(),
                time: slot.time,
                period: slot.period,
                name: alarmName,
                tag: t.afterMeal,
                slot: t.scanBoxHint,
                enabled: true,
              })
            }
          }
          return next
        })
      },
      exportPassport: async () => {
        const payload = {
          name: passport.name || '',
          blood: passport.blood || '',
          contact: passport.contact || '',
          history: passport.history || '',
          allergy: passport.allergy || '',
          meds: passport.meds || '',
        }
        try {
          const res = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
          })
          const text = await res.text()
          if (text) {
            try {
              const json = JSON.parse(text)
              if (json.result === 'error') throw new Error(json.error || 'Sheet error')
            } catch (err) {
              if (String(err.message || err).includes('Sheet error') || String(err.message || '').startsWith('Error:')) {
                throw err
              }
              if (/sign in|accounts\.google/i.test(text)) {
                throw new Error('Google script access denied')
              }
            }
          }
        } catch (err) {
          const message = String(err?.message || err)
          if (message.includes('Network request failed')) return
          throw err
        }
      },
    }),
    [ready, notifyOk, lang, t, passport, alarms],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

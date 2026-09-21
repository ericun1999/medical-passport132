import { Alert, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Haptics from 'expo-haptics'

const CHANNEL_ID = 'medication-alarms'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function pad(value) {
  return String(value).padStart(2, '0')
}

function dailyTrigger(hour, minute) {
  if (Platform.OS === 'ios') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      repeats: true,
      hour,
      minute,
      second: 0,
    }
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: CHANNEL_ID,
  }
}

export async function initNotifications() {
  if (Platform.OS === 'web') return false
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Medication alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      })
    }

    const current = await Notifications.getPermissionsAsync()
    let status = current.status
    if (status !== 'granted') {
      const next = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      })
      status = next.status
    }
    return status === 'granted'
  } catch (err) {
    console.error('initNotifications', err)
    return false
  }
}

export async function ringAlarm(alarm, { alert = true } = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.name,
        body: alarm.tag || '',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: CHANNEL_ID,
      },
    })
  } catch (err) {
    console.error('ringAlarm notification', err)
  }
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {
    /* haptics are optional */
  }
  if (alert && Platform.OS !== 'web') {
    Alert.alert(alarm.name, alarm.tag || '')
  }
}

export async function testAlarmInSeconds(seconds = 5, alarm) {
  const payload = alarm || { name: 'Test alarm', tag: 'Medication reminder' }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.name,
      body: payload.tag || '',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, seconds),
      repeats: false,
      channelId: CHANNEL_ID,
    },
  })
}

export async function syncAlarmNotifications(alarms) {
  if (Platform.OS === 'web') return
  await Notifications.cancelAllScheduledNotificationsAsync()
  for (const alarm of alarms.filter((item) => item.enabled && item.time)) {
    const [hour, minute] = String(alarm.time).split(':').map((part) => Number(part))
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: String(alarm.id),
        content: {
          title: alarm.name,
          body: alarm.tag || '',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: dailyTrigger(hour, minute),
      })
    } catch (err) {
      console.error('schedule alarm failed', alarm, err)
    }
  }
}

export function startForegroundWatcher(getAlarms) {
  if (Platform.OS === 'web') return () => {}
  const fired = new Set()
  const timer = setInterval(() => {
    const now = new Date()
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    const key = `${hhmm}-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
    if (fired.has(key)) return
    const due = getAlarms().filter((item) => item.enabled && item.time === hhmm)
    if (!due.length) return
    fired.add(key)
    ringAlarm(due[0]).catch((err) => console.error(err))
  }, 3000)
  return () => clearInterval(timer)
}

import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { FontAwesome } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useApp } from '../context/AppContext'
import { fill } from '../i18n/translations'
import { useSmartPill } from '../ble/useSmartPill'
import {
  DEFAULT_TOLERANCE,
  DOSES_PER_DAY,
  MAX_DAYS,
  RESET_PAYLOAD,
  SLOT_STATE,
  buildSetPayload,
  buildSlots,
  formatDateInput,
  parseDateInput,
  pickDoseAlarms,
} from '../ble/smartPill'
import { colors } from '../theme'

const MIN_TOLERANCE = 1
const MAX_TOLERANCE = 60
const DAY_OPTIONS = Array.from({ length: MAX_DAYS }, (_, index) => index + 1)

const STATUS_KEYS = {
  disconnected: 'deviceOffline',
  unsupported: 'deviceOffline',
  scanning: 'deviceScanning',
  connecting: 'deviceConnecting',
  connected: 'deviceOnline',
}

const ERROR_KEYS = {
  module: 'deviceErrModule',
  unsupported: 'deviceErrUnsupported',
  permission: 'deviceErrPermission',
  'bluetooth-off': 'deviceErrBluetoothOff',
  'not-found': 'deviceErrNotFound',
  'not-connected': 'deviceErrNotConnected',
  failed: 'deviceErrFailed',
}

const SLOT_BADGES = {
  [SLOT_STATE.taken]: { labelKey: 'deviceTaken', slot: 'slotTaken', badge: 'badgeTaken', text: 'badgeTakenText' },
  [SLOT_STATE.alerting]: { labelKey: 'deviceAlerting', slot: 'slotAlert', badge: 'badgeAlert', text: 'badgeAlertText' },
  [SLOT_STATE.overdue]: { labelKey: 'deviceOverdue', slot: 'slotOverdue', badge: 'badgeOverdue', text: 'badgeOverdueText' },
}

function timeToDate(time) {
  const [hour, minute] = String(time || '08:00').split(':').map((part) => Number(part) || 0)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date
}

function dateToTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function clampTolerance(value) {
  const minutes = Math.round(Number(value))
  if (!Number.isFinite(minutes)) return DEFAULT_TOLERANCE
  return Math.min(Math.max(minutes, MIN_TOLERANCE), MAX_TOLERANCE)
}

export default function PillBox() {
  const { t, alarms, pillbox, savePillbox, updateAlarm } = useApp()
  const pill = useSmartPill()
  const navigation = useNavigation()
  const [now, setNow] = useState(() => new Date())
  const [tolerance, setTolerance] = useState(String(pillbox.tolerance))
  const [picker, setPicker] = useState(null)
  const [notice, setNotice] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [sending, setSending] = useState(false)

  const dayCount = pillbox.dayCount
  const doseAlarms = useMemo(() => pickDoseAlarms(alarms), [alarms])
  const slots = useMemo(() => buildSlots(pillbox.startDate, doseAlarms), [pillbox.startDate, doseAlarms])
  const extraAlarms = alarms.filter((item) => item.enabled).length - doseAlarms.filter(Boolean).length

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => setTolerance(String(pillbox.tolerance)), [pillbox.tolerance])

  const clock = useMemo(
    () => ({
      date: formatDateInput(now),
      week: t.weekDays[now.getDay()],
      time: [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((part) => String(part).padStart(2, '0'))
        .join(':'),
    }),
    [now, t],
  )

  const blockingCode = pill.errorCode || (pill.available ? '' : pill.unavailableCode)
  const blockingText = blockingCode ? t[ERROR_KEYS[blockingCode]] || t.deviceErrFailed : ''

  function handleConnectPress() {
    setNotice('')
    pill.clearError()
    if (pill.connected) pill.disconnect()
    else pill.connect()
  }

  function commitTolerance(value) {
    const minutes = clampTolerance(value)
    setTolerance(String(minutes))
    savePillbox({ tolerance: minutes })
    return minutes
  }

  async function handleSend() {
    const minutes = commitTolerance(tolerance)
    setNotice('')
    pill.clearError()
    setSending(true)
    const saved = (await pill.syncTime()) && (await pill.send(buildSetPayload(slots, dayCount, minutes)))
    setSending(false)
    if (saved) setNotice(fill(t.deviceSendOk, { days: dayCount }))
  }

  async function handleReset() {
    setConfirmReset(false)
    setNotice('')
    pill.clearError()
    setSending(true)
    const done = await pill.send(RESET_PAYLOAD)
    setSending(false)
    if (!done) return
    savePillbox({
      startDate: formatDateInput(new Date()),
      dayCount: MAX_DAYS,
      tolerance: DEFAULT_TOLERANCE,
    })
    setNotice(t.deviceResetOk)
  }

  /** Dose times live on the alarm, so editing one here edits the shared alarm. */
  function handleDoseTime(dose, time) {
    const alarm = doseAlarms[dose]
    if (alarm) updateAlarm(alarm.id, { time })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t.deviceHeader}</Text>
          <FontAwesome name="bluetooth" size={18} color={colors.white} />
        </View>
        <Text style={styles.clockDate}>{`${clock.date} (${clock.week})`}</Text>
        <Text style={styles.clockTime}>{clock.time}</Text>
      </View>

      {blockingText ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{blockingText}</Text>
        </View>
      ) : null}
      {notice ? (
        <View style={styles.okBanner}>
          <Text style={styles.okText}>{notice}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.linkCard}>
          <View style={styles.linkInfo}>
            <Text style={styles.linkLabel}>{t.deviceLinkLabel}</Text>
            <View style={styles.linkStatusRow}>
              <View style={[styles.dot, pill.connected && styles.dotOn, pill.busy && styles.dotBusy]} />
              <Text style={styles.linkStatus} numberOfLines={1}>
                {t[STATUS_KEYS[pill.status]]}
              </Text>
            </View>
            {pill.deviceName ? <Text style={styles.linkDevice}>{pill.deviceName}</Text> : null}
          </View>
          <Pressable
            onPress={handleConnectPress}
            disabled={pill.busy}
            style={[styles.linkBtn, pill.connected && styles.linkBtnOff, pill.busy && styles.btnDisabled]}
          >
            {pill.busy ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.linkBtnText}>{pill.connected ? t.deviceDisconnect : t.deviceConnect}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.configCard}>
          <Text style={styles.configLabel}>{t.deviceStartDate}</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              value={pillbox.startDate}
              onChangeText={(value) => savePillbox({ startDate: value })}
              placeholder="YYYY-MM-DD"
              style={[styles.field, styles.startField]}
            />
          ) : (
            <Pressable onPress={() => setPicker({ mode: 'date' })} style={[styles.field, styles.startField]}>
              <FontAwesome name="calendar" size={12} color={colors.slate400} />
              <Text style={styles.fieldText}>{pillbox.startDate}</Text>
            </Pressable>
          )}

          <Text style={[styles.configLabel, styles.configLabelSpaced]}>{t.deviceDays}</Text>
          <View style={styles.dayPicker}>
            {DAY_OPTIONS.map((days) => (
              <Pressable
                key={days}
                onPress={() => savePillbox({ dayCount: days })}
                style={[styles.dayOption, days === dayCount && styles.dayOptionOn]}
              >
                <Text style={[styles.dayOptionText, days === dayCount && styles.dayOptionTextOn]}>
                  {fill(t.deviceDaysOption, { days, doses: days * DOSES_PER_DAY })}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.configLabel, styles.configLabelSpaced]}>{t.deviceTolerance}</Text>
          <View style={styles.toleranceRow}>
            <Text style={styles.toleranceHint}>{t.deviceTolerancePre}</Text>
            <TextInput
              value={tolerance}
              onChangeText={setTolerance}
              onEndEditing={() => commitTolerance(tolerance)}
              onBlur={() => commitTolerance(tolerance)}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.toleranceInput}
            />
            <Text style={styles.toleranceHint}>{t.deviceTolerancePost}</Text>
          </View>
        </View>

        <Pressable onPress={() => navigation.navigate('Alarms')} style={styles.syncCard}>
          <FontAwesome name="refresh" size={14} color={colors.blue700} />
          <Text style={styles.syncText}>
            {extraAlarms > 0 ? fill(t.deviceSyncExtra, { count: extraAlarms }) : t.deviceSyncHint}
          </Text>
          <FontAwesome name="chevron-right" size={12} color={colors.slate400} />
        </Pressable>

        {DAY_OPTIONS.slice(0, dayCount).map((day) => (
          <View key={day} style={styles.dayCard}>
            <Text style={styles.dayTitle}>{fill(t.deviceDayTitle, { day })}</Text>
            {Array.from({ length: DOSES_PER_DAY }, (_, dose) => {
              const index = (day - 1) * DOSES_PER_DAY + dose
              const slot = slots[index]
              const badge = SLOT_BADGES[pill.slotStates[index]]
              return (
                <View key={index} style={[styles.slot, badge && styles[badge.slot], !slot.linked && styles.slotEmpty]}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotTitle}>{fill(t.deviceDoseTitle, { dose: dose + 1 })}</Text>
                    {slot.linked ? (
                      <View style={[styles.badge, badge && styles[badge.badge]]}>
                        <Text style={[styles.badgeText, badge && styles[badge.text]]}>
                          {badge ? t[badge.labelKey] : t.devicePending}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {slot.linked ? (
                    <>
                      <Text style={styles.slotMed} numberOfLines={1}>
                        <FontAwesome name="medkit" size={12} color={colors.emerald500} /> {slot.name}
                      </Text>
                      <View style={styles.slotFields}>
                        <View style={[styles.field, styles.fieldReadonly]}>
                          <FontAwesome name="calendar" size={12} color={colors.slate400} />
                          <Text style={styles.fieldText}>{slot.date}</Text>
                        </View>
                        {Platform.OS === 'web' ? (
                          <TextInput
                            value={slot.time}
                            onChangeText={(value) => handleDoseTime(dose, value)}
                            placeholder="HH:MM"
                            style={styles.field}
                          />
                        ) : (
                          <Pressable onPress={() => setPicker({ mode: 'time', dose })} style={styles.field}>
                            <FontAwesome name="clock-o" size={12} color={colors.slate400} />
                            <Text style={styles.fieldText}>{slot.time}</Text>
                          </Pressable>
                        )}
                      </View>
                    </>
                  ) : (
                    <Pressable onPress={() => navigation.navigate('Alarms')} style={styles.slotEmptyBtn}>
                      <FontAwesome name="plus" size={12} color={colors.blue700} />
                      <Text style={styles.slotEmptyText}>{t.deviceNoDoseAlarm}</Text>
                    </Pressable>
                  )}
                </View>
              )
            })}
          </View>
        ))}

        <Pressable onPress={handleSend} disabled={sending} style={[styles.sendBtn, sending && styles.btnDisabled]}>
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.sendText}>{t.deviceSend}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => setConfirmReset(true)}
          disabled={sending}
          style={[styles.resetBtn, sending && styles.btnDisabled]}
        >
          <Text style={styles.resetText}>{t.deviceReset}</Text>
        </Pressable>
      </ScrollView>

      {picker ? (
        <>
          <DateTimePicker
            mode={picker.mode}
            value={
              picker.mode === 'date'
                ? parseDateInput(pillbox.startDate)
                : timeToDate(doseAlarms[picker.dose]?.time)
            }
            onChange={(event, selected) => {
              const target = picker
              if (Platform.OS !== 'ios' || event.type === 'dismissed') setPicker(null)
              if (event.type === 'dismissed' || !selected) return
              if (target.mode === 'date') savePillbox({ startDate: formatDateInput(selected) })
              else handleDoseTime(target.dose, dateToTime(selected))
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setPicker(null)} style={styles.pickerDone}>
              <Text style={styles.sendText}>{t.cancel}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.dialogBg}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{t.deviceReset}</Text>
            <Text style={styles.dialogBody}>{t.deviceResetHint}</Text>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setConfirmReset(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>{t.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleReset} style={styles.dialogConfirm}>
                <Text style={styles.sendText}>{t.deviceReset}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate100 },
  header: { backgroundColor: colors.blue700, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  clockDate: { color: '#dbeafe', fontSize: 13, marginTop: 10 },
  clockTime: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: 1 },
  errorBanner: { backgroundColor: colors.red100, paddingHorizontal: 20, paddingVertical: 12 },
  errorText: { color: colors.red700, fontWeight: '600' },
  okBanner: { backgroundColor: '#dcfce7', paddingHorizontal: 20, paddingVertical: 12 },
  okText: { color: colors.emerald700, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 120, gap: 14 },
  linkCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkInfo: { flex: 1 },
  linkLabel: { fontSize: 12, fontWeight: '700', color: colors.slate400 },
  linkStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red500 },
  dotBusy: { backgroundColor: colors.amber500 },
  dotOn: { backgroundColor: colors.emerald500 },
  linkStatus: { flex: 1, fontWeight: '700', color: colors.slate700 },
  linkDevice: { fontSize: 12, color: colors.slate400, marginTop: 2, marginLeft: 18 },
  linkBtn: {
    backgroundColor: colors.emerald600,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 112,
    alignItems: 'center',
  },
  linkBtnOff: { backgroundColor: colors.slate500 },
  linkBtnText: { color: colors.white, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  btnDisabled: { opacity: 0.6 },
  configCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
  },
  configLabel: { fontSize: 13, fontWeight: '800', color: colors.slate600 },
  configLabelSpaced: { marginTop: 16 },
  dayPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  dayOption: {
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayOptionOn: { borderColor: colors.blue700, backgroundColor: '#dbeafe' },
  dayOptionText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  dayOptionTextOn: { color: colors.blue700, fontWeight: '800' },
  toleranceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  toleranceHint: { fontSize: 13, color: colors.slate500 },
  toleranceInput: {
    width: 56,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.slate800,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
  },
  dayCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    gap: 10,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate700,
    borderBottomWidth: 2,
    borderBottomColor: colors.slate100,
    paddingBottom: 8,
  },
  slot: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.slate300,
    padding: 12,
  },
  slotEmpty: { borderLeftColor: colors.slate200, backgroundColor: colors.white },
  slotEmptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  slotEmptyText: { color: colors.blue700, fontWeight: '700', fontSize: 13 },
  slotMed: { fontWeight: '700', color: colors.slate700, fontSize: 13, marginTop: 8 },
  slotTaken: { backgroundColor: '#f0fdf4', borderLeftColor: colors.emerald500 },
  slotAlert: { backgroundColor: '#fffbeb', borderLeftColor: colors.amber500 },
  slotOverdue: { backgroundColor: colors.red50, borderLeftColor: colors.red500 },
  slotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  slotTitle: { fontSize: 13, fontWeight: '700', color: colors.slate700 },
  badge: { backgroundColor: colors.slate100, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTaken: { backgroundColor: '#dcfce7' },
  badgeAlert: { backgroundColor: colors.amber100 },
  badgeOverdue: { backgroundColor: colors.red100 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.slate600 },
  badgeTakenText: { color: colors.emerald700 },
  badgeAlertText: { color: colors.amber700 },
  badgeOverdueText: { color: colors.red700 },
  slotFields: { flexDirection: 'row', gap: 8, marginTop: 10 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  fieldReadonly: { backgroundColor: colors.slate100, borderColor: colors.slate100 },
  startField: { marginTop: 10, flex: 0, alignSelf: 'flex-start', minWidth: 180 },
  fieldText: { fontWeight: '700', color: colors.slate800, fontSize: 13 },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  syncText: { flex: 1, color: colors.blue800, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  sendBtn: {
    backgroundColor: colors.emerald600,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  sendText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  resetBtn: { backgroundColor: colors.slate500, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  resetText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  pickerDone: { backgroundColor: colors.blue700, margin: 16, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  dialogBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.white, borderRadius: 16, padding: 24 },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: colors.slate800 },
  dialogBody: { marginTop: 8, color: colors.slate600, fontSize: 15, lineHeight: 22 },
  dialogActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { fontWeight: '700', color: colors.slate700 },
  dialogConfirm: { flex: 1, backgroundColor: colors.red600, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
})

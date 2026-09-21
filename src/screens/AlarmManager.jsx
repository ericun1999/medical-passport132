import { useMemo, useState } from 'react'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useApp } from '../context/AppContext'
import Toggle from '../components/Toggle'
import { colors } from '../theme'

function timeToDate(time) {
  const [hour, minute] = String(time || '08:00').split(':').map((part) => Number(part) || 0)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date
}

function dateToTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function AlarmManager() {
  const { t, alarms, toggleAlarm, addAlarm, notifyOk, requestNotify, testAlarm } = useApp()
  const navigation = useNavigation()
  const [showForm, setShowForm] = useState(false)
  const [time, setTime] = useState('08:00')
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerDate = useMemo(() => timeToDate(time), [time])

  function handleSave() {
    if (!name.trim()) return
    addAlarm({ time, name: name.trim(), tag: tag.trim() || t.afterMeal })
    setName('')
    setTag('')
    setShowForm(false)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate('Home')} style={styles.iconBtn}>
          <FontAwesome name="chevron-left" size={14} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.alarmHeader}</Text>
        <View style={styles.iconBtn} />
      </View>

      {!notifyOk ? (
        <Pressable onPress={requestNotify} style={styles.permBanner}>
          <Text style={styles.permText}>{t.notifyEnable}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={testAlarm} style={styles.testBanner}>
        <Text style={styles.testText}>{t.testAlarm}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.list}>
        {alarms.map((alarm) => (
          <View key={alarm.id} style={[styles.card, !alarm.enabled && styles.cardOff]}>
            <View style={[styles.bar, { backgroundColor: alarm.enabled ? colors.emerald500 : colors.slate300 }]} />
            <View style={styles.cardBody}>
              <View style={styles.timeRow}>
                <Text style={[styles.time, !alarm.enabled && styles.strike]}>{alarm.time}</Text>
                <Text style={styles.period}>{alarm.period}</Text>
              </View>
              <Text style={styles.name}>
                <FontAwesome name="medkit" size={14} color={alarm.enabled ? colors.emerald500 : colors.slate400} /> {alarm.name}
              </Text>
              <View style={styles.tag}>
                <Text style={[styles.tagText, !alarm.enabled && { color: colors.slate500 }]}>{alarm.tag || t.dailyMed}</Text>
              </View>
            </View>
            <Toggle checked={alarm.enabled} onChange={() => toggleAlarm(alarm.id)} />
          </View>
        ))}
      </ScrollView>

      <Pressable onPress={() => setShowForm(true)} style={styles.fab}>
        <FontAwesome name="plus" size={22} color={colors.white} />
      </Pressable>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.sheetBg}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{t.addAlarm}</Text>
            <Text style={styles.label}>{t.timeLabel}</Text>
            {Platform.OS === 'web' ? (
              <TextInput value={time} onChangeText={setTime} style={styles.input} placeholder="08:00" />
            ) : (
              <>
                <Pressable onPress={() => setPickerOpen(true)} style={styles.input}>
                  <Text>{time}</Text>
                </Pressable>
                {pickerOpen ? (
                  <DateTimePicker
                    mode="time"
                    value={pickerDate}
                    onChange={(_, selected) => {
                      setPickerOpen(Platform.OS === 'ios')
                      if (selected) setTime(dateToTime(selected))
                    }}
                  />
                ) : null}
              </>
            )}
            <Text style={styles.label}>{t.medNameLabel}</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder={t.placeholderMeds} />
            <Text style={styles.label}>{t.noteLabel}</Text>
            <TextInput value={tag} onChangeText={setTag} style={styles.input} placeholder={t.afterMeal} />
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setShowForm(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>{t.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.save}>
                <Text style={styles.saveText}>{t.saveAlarm}</Text>
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
  header: {
    backgroundColor: colors.blue700,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: '700' },
  permBanner: { backgroundColor: colors.amber100, padding: 12 },
  permText: { color: colors.amber700, fontWeight: '600', textAlign: 'center' },
  testBanner: { backgroundColor: colors.blue700, padding: 12 },
  testText: { color: colors.white, fontWeight: '700', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 120, gap: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 20,
    paddingLeft: 16,
  },
  cardOff: { backgroundColor: colors.slate100, opacity: 0.7 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8 },
  cardBody: { flex: 1, paddingLeft: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  time: { fontSize: 36, fontWeight: '700', color: colors.slate800 },
  strike: { textDecorationLine: 'line-through', color: colors.slate500 },
  period: { fontSize: 13, color: colors.slate500 },
  name: { fontWeight: '700', color: colors.slate700, marginTop: 4 },
  tag: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.orange50,
    borderColor: colors.orange100,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: { color: colors.orange600, fontSize: 12, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.blue700,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle: { width: 48, height: 4, backgroundColor: colors.slate200, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.slate800 },
  label: { fontSize: 13, fontWeight: '700', color: colors.slate600, marginTop: 12 },
  input: {
    marginTop: 4,
    padding: 12,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
  },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancel: { flex: 1, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  save: { flex: 1, backgroundColor: colors.blue700, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: colors.slate700 },
  saveText: { fontWeight: '700', color: colors.white },
})

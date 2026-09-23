import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { FontAwesome } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { languages } from '../i18n/translations'
import { useApp } from '../context/AppContext'
import { colors } from '../theme'

function minutesOf(time) {
  const [hour, minute] = String(time || '00:00').split(':').map((part) => Number(part) || 0)
  return hour * 60 + minute
}

export default function Home() {
  const { t, lang, setLang, alarms, passport } = useApp()
  const navigation = useNavigation()
  const [langOpen, setLangOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const current = languages.find((item) => item.value === lang)?.label || lang
  const filled = Boolean(passport.name)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const upcoming = useMemo(() => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const enabled = [...alarms]
      .filter((item) => item.enabled)
      .sort((a, b) => minutesOf(a.time) - minutesOf(b.time))
    return [
      ...enabled.filter((item) => minutesOf(item.time) >= nowMinutes),
      ...enabled.filter((item) => minutesOf(item.time) < nowMinutes),
    ]
  }, [alarms, now])

  const next = upcoming[0]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => setLangOpen(true)} style={styles.langBtn}>
            <FontAwesome name="globe" size={12} color={colors.white} />
            <Text style={styles.langText}>{current}</Text>
          </Pressable>
          <Text style={styles.homeTitle}>{t.homeTitle}</Text>
          <Text style={styles.homeSub}>{t.homeSub}</Text>
        </View>

        <View style={styles.body}>
          <Pressable onPress={() => navigation.navigate('Alarms')} style={styles.nextCard}>
            <View style={styles.nextTop}>
              <Text style={styles.nextLabel}>{t.homeNextDose}</Text>
              <FontAwesome name="bell" size={16} color={colors.amber500} />
            </View>
            {next ? (
              <>
                <View style={styles.nextTimeRow}>
                  <Text style={styles.nextTime}>{next.time}</Text>
                  <Text style={styles.nextPeriod}>{next.period}</Text>
                </View>
                <Text style={styles.nextName} numberOfLines={1}>
                  {next.name}
                </Text>
                <View style={styles.nextTag}>
                  <Text style={styles.nextTagText}>{next.tag || t.dailyMed}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>{t.homeNoAlarms}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Passport')} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: '#dbeafe' }]}>
              <FontAwesome name="id-card" size={20} color={colors.blue700} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{t.cardHeader}</Text>
              <Text style={styles.cardValue} numberOfLines={1}>
                {filled ? passport.name : t.notFilled}
              </Text>
            </View>
            {filled ? (
              <View style={styles.bloodChip}>
                <Text style={styles.bloodChipText}>
                  {passport.blood || 'O'}
                  {t.bloodSuffix}
                </Text>
              </View>
            ) : (
              <FontAwesome name="chevron-right" size={14} color={colors.slate400} />
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Scan')} style={styles.scanCta}>
            <FontAwesome name="camera" size={16} color={colors.white} />
            <Text style={styles.scanCtaText}>{t.btnScan}</Text>
          </Pressable>

          {upcoming.length > 1 ? (
            <>
              <Text style={styles.sectionTitle}>{t.homeUpcoming}</Text>
              {upcoming.slice(1, 4).map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.rowTime}>{item.time}</Text>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setLangOpen(false)}>
          <View style={styles.modalCard}>
            {languages.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => {
                  setLang(item.value)
                  setLangOpen(false)
                }}
                style={styles.langRow}
              >
                <Text style={[styles.langRowText, item.value === lang && styles.langRowActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { paddingBottom: 24 },
  header: {
    backgroundColor: colors.blue800,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 56,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  langBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  homeTitle: { color: colors.white, fontSize: 26, fontWeight: '800', marginTop: 20 },
  homeSub: { color: '#dbeafe', fontSize: 14, marginTop: 6 },
  body: { paddingHorizontal: 20, marginTop: -36, gap: 14 },
  nextCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 20,
    shadowColor: colors.slate900,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextLabel: { fontSize: 12, fontWeight: '800', color: colors.slate400, letterSpacing: 0.5 },
  nextTimeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  nextTime: { fontSize: 40, fontWeight: '800', color: colors.slate800 },
  nextPeriod: { fontSize: 14, color: colors.slate500, fontWeight: '700' },
  nextName: { fontWeight: '700', color: colors.slate700, marginTop: 2 },
  nextTag: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: colors.orange50,
    borderColor: colors.orange100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nextTagText: { color: colors.orange600, fontSize: 12, fontWeight: '700' },
  emptyText: { color: colors.slate500, marginTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.slate200,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { marginLeft: 14, flex: 1 },
  cardLabel: { fontSize: 12, color: colors.slate400, fontWeight: '700' },
  cardValue: { fontSize: 17, fontWeight: '700', color: colors.slate800, marginTop: 2 },
  bloodChip: {
    backgroundColor: colors.red100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bloodChipText: { color: colors.red600, fontWeight: '800', fontSize: 13 },
  scanCta: {
    backgroundColor: colors.emerald600,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanCtaText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.slate500, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderColor: colors.slate200,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowTime: { fontSize: 16, fontWeight: '800', color: colors.blue700, width: 56 },
  rowName: { flex: 1, color: colors.slate700, fontWeight: '600' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  langRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  langRowText: { fontSize: 16, color: colors.slate700 },
  langRowActive: { fontWeight: '700', color: colors.blue700 },
})

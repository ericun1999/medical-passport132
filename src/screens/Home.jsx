import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { FontAwesome } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { languages } from '../i18n/translations'
import { useApp } from '../context/AppContext'
import { colors } from '../theme'

function MenuButton({ to, color, icon, title, desc, extra }) {
  const navigation = useNavigation()
  const palettes = {
    blue: { wrap: '#dbeafe', icon: colors.blue700 },
    emerald: { wrap: '#d1fae5', icon: colors.emerald600 },
    amber: { wrap: colors.amber100, icon: colors.amber500 },
  }
  const palette = palettes[color]

  return (
    <Pressable onPress={() => navigation.navigate(to)} style={styles.menu}>
      <View style={[styles.iconWrap, { backgroundColor: palette.wrap }]}>
        <FontAwesome name={icon} size={20} color={palette.icon} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
      {extra}
    </Pressable>
  )
}

export default function Home() {
  const { t, lang, setLang, alarms } = useApp()
  const activeCount = alarms.filter((item) => item.enabled).length
  const [langOpen, setLangOpen] = useState(false)
  const current = languages.find((item) => item.value === lang)?.label || lang

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setLangOpen(true)} style={styles.langBtn}>
          <Text style={styles.langText}>{current}</Text>
        </Pressable>
        <Text style={styles.homeTitle}>{t.homeTitle}</Text>
        <Text style={styles.homeSub}>{t.homeSub}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <MenuButton
          to="PassportForm"
          color="blue"
          icon="id-card"
          title={t.btnPassport}
          desc={t.descPassport}
        />
        <MenuButton
          to="Scan"
          color="emerald"
          icon="camera"
          title={t.btnScan}
          desc={t.descScan}
        />
        <MenuButton
          to="Alarms"
          color="amber"
          icon="bell"
          title={t.btnAlarm}
          desc={t.descAlarm}
          extra={
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          }
        />
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
  header: {
    backgroundColor: colors.blue800,
    padding: 24,
    paddingTop: 32,
  },
  langBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langText: { color: colors.white, fontSize: 13 },
  homeTitle: { color: colors.white, fontSize: 24, fontWeight: '700', marginTop: 24 },
  homeSub: { color: '#dbeafe', fontSize: 14, marginTop: 4 },
  body: { padding: 24, gap: 16 },
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.slate200,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { marginLeft: 16, flex: 1 },
  menuTitle: { fontWeight: '700', fontSize: 18, color: colors.slate800 },
  menuDesc: { fontSize: 12, color: colors.slate500, marginTop: 4 },
  badge: {
    backgroundColor: colors.amber100,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: colors.amber700, fontWeight: '700', fontSize: 12 },
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

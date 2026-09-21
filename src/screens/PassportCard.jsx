import { useState } from 'react'
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import { colors } from '../theme'

export default function PassportCard() {
  const { t, passport, exportPassport } = useApp()
  const navigation = useNavigation()
  const [exporting, setExporting] = useState(false)

  const display = {
    name: passport.name || t.notFilled,
    blood: passport.blood || 'O',
    contact: passport.contact || t.notFilled,
    history: passport.history || t.empty,
    allergy: passport.allergy || t.empty,
    meds: passport.meds || t.empty,
  }

  async function generateShareLink() {
    const message = [
      t.cardHeader,
      `${t.cardNameTitle}: ${display.name}`,
      `${t.cardBloodTitle}: ${display.blood}${t.bloodSuffix}`,
      `${t.cardContactTitle}: ${display.contact}`,
      `${t.cardHistoryTitle}: ${display.history}`,
      `${t.cardAllergyTitle}: ${display.allergy}`,
      `${t.cardMedsTitle}: ${display.meds}`,
    ].join('\n')
    try {
      await Share.share({ message })
    } catch {
      navigation.navigate('PublicView', display)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportPassport()
      Alert.alert(t.exportOk)
    } catch {
      Alert.alert(t.exportFail)
    } finally {
      setExporting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <FontAwesome name="user" size={28} color={colors.blue700} />
            </View>
            <Text style={styles.heroTitle}>{t.cardHeader}</Text>
            <Text style={styles.heroSub}>{t.cardSub}</Text>
          </View>
          <View style={styles.content}>
            <View style={styles.split}>
              <View>
                <Text style={styles.muted}>{t.cardNameTitle}</Text>
                <Text style={styles.name}>{display.name}</Text>
              </View>
              <View>
                <Text style={[styles.muted, { textAlign: 'right' }]}>{t.cardBloodTitle}</Text>
                <View style={styles.blood}>
                  <Text style={styles.bloodText}>
                    {display.blood}
                    {t.bloodSuffix}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.contact}>
              <View style={styles.contactIcon}>
                <FontAwesome name="phone" size={16} color={colors.orange600} />
              </View>
              <View>
                <Text style={styles.contactLabel}>{t.cardContactTitle}</Text>
                <Text style={styles.contactValue}>{display.contact}</Text>
              </View>
            </View>
            <Text style={styles.muted}>{t.cardHistoryTitle}</Text>
            <Text style={styles.box}>{display.history}</Text>
            <Text style={[styles.muted, { color: colors.red500 }]}>{t.cardAllergyTitle}</Text>
            <Text style={[styles.box, styles.allergy]}>{display.allergy}</Text>
            <Text style={styles.muted}>{t.cardMedsTitle}</Text>
            <Text style={styles.box}>{display.meds}</Text>
            <Pressable onPress={generateShareLink} style={styles.share}>
              <FontAwesome name="share-alt" size={14} color={colors.white} />
              <Text style={styles.shareText}>{t.shareLink}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={handleExport} disabled={exporting} style={styles.export}>
            <Text style={styles.actionText}>{exporting ? t.btnExporting : t.btnExport}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Home')} style={styles.home}>
            <Text style={styles.homeText}>{t.btnHome}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate100 },
  body: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  hero: { backgroundColor: colors.blue700, padding: 24, alignItems: 'center' },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: '700' },
  heroSub: { color: '#dbeafe', fontSize: 13, marginTop: 4 },
  content: { padding: 24, gap: 10 },
  split: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.slate200, paddingBottom: 12 },
  muted: { fontSize: 12, color: colors.slate400, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.slate800 },
  blood: { backgroundColor: colors.red100, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-end' },
  bloodText: { color: colors.red600, fontWeight: '700' },
  contact: {
    backgroundColor: colors.orange50,
    borderColor: colors.orange100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orange100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactLabel: { fontSize: 12, color: colors.orange600, fontWeight: '700' },
  contactValue: { fontWeight: '700', color: colors.slate800 },
  box: { backgroundColor: colors.slate50, borderRadius: 8, padding: 8, fontSize: 14, color: colors.slate700 },
  allergy: { backgroundColor: colors.red50, color: colors.red700, fontWeight: '500' },
  share: {
    marginTop: 8,
    backgroundColor: colors.indigo600,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shareText: { color: colors.white, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  export: { flex: 1, backgroundColor: colors.emerald600, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  home: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  actionText: { color: colors.white, fontWeight: '700' },
  homeText: { color: colors.slate700, fontWeight: '700' },
})

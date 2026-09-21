import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import { colors } from '../theme'

export default function PublicView() {
  const { t } = useApp()
  const { params = {} } = useRoute()
  const data = {
    name: params.name || t.notFilled,
    blood: params.blood || 'O',
    contact: params.contact || t.notFilled,
    history: params.history || t.empty,
    allergy: params.allergy || t.empty,
    meds: params.meds || t.empty,
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <FontAwesome name="id-card" size={26} color={colors.indigo700} />
            </View>
            <Text style={styles.heroTitle}>{t.publicHeader}</Text>
            <Text style={styles.heroSub}>{t.publicSub}</Text>
          </View>
          <View style={styles.content}>
            <View style={styles.split}>
              <View>
                <Text style={styles.muted}>{t.cardNameTitle}</Text>
                <Text style={styles.name}>{data.name}</Text>
              </View>
              <View style={styles.blood}>
                <Text style={styles.bloodText}>{data.blood}</Text>
              </View>
            </View>
            <View style={styles.contact}>
              <Text style={styles.contactLabel}>{t.cardContactTitle}</Text>
              <Text style={styles.contactValue}>{data.contact}</Text>
            </View>
            <Text style={styles.muted}>{t.cardHistoryTitle}</Text>
            <Text style={styles.box}>{data.history}</Text>
            <Text style={[styles.muted, { color: colors.red500 }]}>{t.cardAllergyTitle}</Text>
            <Text style={[styles.box, styles.allergy]}>{data.allergy}</Text>
            <Text style={styles.muted}>{t.cardMedsTitle}</Text>
            <Text style={styles.box}>{data.meds}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate100 },
  body: { padding: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  hero: { backgroundColor: colors.indigo700, padding: 24, alignItems: 'center' },
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
  heroSub: { color: '#c7d2fe', fontSize: 12, marginTop: 4 },
  content: { padding: 24, gap: 10 },
  split: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.slate200, paddingBottom: 12 },
  muted: { fontSize: 12, color: colors.slate400, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700' },
  blood: { backgroundColor: colors.red100, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  bloodText: { color: colors.red600, fontWeight: '700' },
  contact: {
    backgroundColor: colors.orange50,
    borderColor: colors.orange100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  contactLabel: { fontSize: 12, color: colors.orange600, fontWeight: '700' },
  contactValue: { fontWeight: '700', color: colors.slate800 },
  box: { backgroundColor: colors.slate50, borderRadius: 8, padding: 8, fontSize: 14 },
  allergy: { backgroundColor: colors.red50, color: colors.red700, fontWeight: '500' },
})

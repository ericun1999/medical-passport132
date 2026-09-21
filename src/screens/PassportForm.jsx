import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/PageHeader'
import { colors } from '../theme'

const BLOOD = ['O', 'A', 'B', 'AB', 'Rh']

export default function PassportForm() {
  const { t, passport, savePassport } = useApp()
  const navigation = useNavigation()
  const [form, setForm] = useState({
    name: passport.name || '',
    blood: passport.blood || 'O',
    contact: passport.contact || '',
    history: passport.history || '',
    allergy: passport.allergy || '',
    meds: passport.meds || '',
  })

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit() {
    if (!form.name.trim()) return
    savePassport({
      ...form,
      name: form.name.trim(),
      contact: form.contact.trim(),
      history: form.history.trim(),
      allergy: form.allergy.trim(),
      meds: form.meds.trim(),
    })
    navigation.navigate('PassportCard')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageHeader title={t.formHeader} extra={<FontAwesome name="globe" size={16} color="rgba(255,255,255,0.8)" />} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>{t.labelName}</Text>
        <TextInput
          value={form.name}
          onChangeText={(value) => update('name', value)}
          placeholder={t.placeholderName}
          style={styles.input}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>{t.labelBlood}</Text>
            <View style={styles.bloodWrap}>
              {[...BLOOD, 'Unknown'].map((item) => {
                const value = item === 'Unknown' ? t.unknownBlood : item
                const selected = form.blood === item || form.blood === value
                return (
                  <Pressable
                    key={item}
                    onPress={() => update('blood', item === 'Unknown' ? t.unknownBlood : item)}
                    style={[styles.bloodChip, selected && styles.bloodChipOn]}
                  >
                    <Text style={[styles.bloodText, selected && styles.bloodTextOn]}>
                      {item === 'Unknown' ? t.unknownBlood : item}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>{t.labelContact}</Text>
            <TextInput
              value={form.contact}
              onChangeText={(value) => update('contact', value)}
              placeholder={t.placeholderContact}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
        </View>
        <Text style={styles.label}>{t.labelHistory}</Text>
        <TextInput
          value={form.history}
          onChangeText={(value) => update('history', value)}
          placeholder={t.placeholderHistory}
          multiline
          style={[styles.input, styles.area]}
        />
        <Text style={styles.label}>{t.labelAllergy}</Text>
        <TextInput
          value={form.allergy}
          onChangeText={(value) => update('allergy', value)}
          placeholder={t.placeholderAllergy}
          style={styles.input}
        />
        <Text style={styles.label}>{t.labelMeds}</Text>
        <TextInput
          value={form.meds}
          onChangeText={(value) => update('meds', value)}
          placeholder={t.placeholderMeds}
          style={styles.input}
        />
        <Pressable onPress={handleSubmit} style={styles.submit}>
          <FontAwesome name="qrcode" size={16} color={colors.white} />
          <Text style={styles.submitText}>{t.submitBtn}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  body: { padding: 24, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '700', color: colors.slate600, marginTop: 12 },
  input: {
    marginTop: 4,
    padding: 12,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    color: colors.slate800,
  },
  area: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  bloodWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  bloodChip: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  bloodChipOn: { backgroundColor: colors.blue700, borderColor: colors.blue700 },
  bloodText: { fontSize: 12, color: colors.slate600 },
  bloodTextOn: { color: colors.white, fontWeight: '700' },
  submit: {
    marginTop: 20,
    backgroundColor: colors.blue700,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitText: { color: colors.white, fontWeight: '700' },
})

import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/PageHeader'
import { CONDITION_IDS, parseHistory } from '../data/conditions'
import { colors } from '../theme'

const BLOOD = ['O', 'A', 'B', 'AB', 'Rh']

export default function PassportForm() {
  const { t, passport, savePassport } = useApp()
  const navigation = useNavigation()
  const [form, setForm] = useState({
    name: passport.name || '',
    blood: passport.blood || 'O',
    contactName: passport.contactName || '',
    contact: passport.contact || '',
    history: parseHistory(passport.history, t).join(','),
    allergy: passport.allergy || '',
    meds: passport.meds || '',
  })

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleHistory(id) {
    const current = parseHistory(form.history, t)
    let next
    if (id === 'none') {
      next = current.includes('none') ? [] : ['none']
    } else if (current.includes(id)) {
      next = current.filter((item) => item !== id)
    } else {
      next = [...current.filter((item) => item !== 'none'), id]
    }
    update('history', next.join(','))
  }

  function handleSubmit() {
    if (!form.name.trim()) return
    savePassport({
      ...form,
      name: form.name.trim(),
      contactName: form.contactName.trim(),
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
              value={form.contactName}
              onChangeText={(value) => update('contactName', value)}
              placeholder={t.placeholderContactName || t.placeholderContact}
              style={styles.input}
            />
            <TextInput
              value={form.contact}
              onChangeText={(value) => update('contact', value)}
              placeholder={t.placeholderContact}
              keyboardType="phone-pad"
              style={[styles.input, { marginTop: 8 }]}
            />
          </View>
        </View>
        <Text style={styles.label}>{t.labelHistory}</Text>
        <Text style={styles.hint}>{t.historyPick}</Text>
        <View style={styles.historyWrap}>
          {CONDITION_IDS.map((id) => {
            const selected = parseHistory(form.history, t).includes(id)
            return (
              <Pressable
                key={id}
                onPress={() => toggleHistory(id)}
                style={[styles.historyChip, selected && styles.historyChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                {selected ? <FontAwesome name="check" size={12} color={colors.white} /> : null}
                <Text style={[styles.historyText, selected && styles.historyTextOn]}>{t.conditions[id]}</Text>
              </Pressable>
            )
          })}
        </View>
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
  hint: { marginTop: 4, fontSize: 12, color: colors.slate500 },
  historyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  historyChipOn: { backgroundColor: colors.blue700, borderColor: colors.blue700 },
  historyText: { fontSize: 13, color: colors.slate700, fontWeight: '600' },
  historyTextOn: { color: colors.white },
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

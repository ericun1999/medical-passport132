import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import { authErrorMessage } from '../auth/emailAuth'
import { colors } from '../theme'

export default function Login() {
  const { t, signInWithEmail, registerWithEmail } = useApp()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isRegister = mode === 'register'

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError(t.loginMissingFields)
      return
    }
    if (password.length < 6) {
      setError(t.loginWeakPassword)
      return
    }

    setLoading(true)
    setError('')
    try {
      if (isRegister) await registerWithEmail(email, password)
      else await signInWithEmail(email, password)
    } catch (err) {
      console.error('Email auth failed', err)
      setError(authErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <FontAwesome name="heartbeat" size={36} color={colors.white} />
          </View>
          <Text style={styles.title}>{t.loginTitle}</Text>
          <Text style={styles.sub}>{isRegister ? t.loginRegisterSub : t.loginSub}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.card}>
            <Text style={styles.label}>{t.loginEmail}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder={t.loginEmailPlaceholder}
              placeholderTextColor={colors.slate400}
              style={styles.input}
              editable={!loading}
            />

            <Text style={[styles.label, styles.labelGap]}>{t.loginPassword}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isRegister ? 'newPassword' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'password'}
              placeholder={t.loginPasswordPlaceholder}
              placeholderTextColor={colors.slate400}
              style={styles.input}
              editable={!loading}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [styles.submitBtn, pressed && styles.submitPressed, loading && styles.submitDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitText}>{isRegister ? t.loginRegister : t.loginSignIn}</Text>
              )}
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <Pressable
            onPress={() => {
              setMode(isRegister ? 'signin' : 'register')
              setError('')
            }}
            disabled={loading}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>{isRegister ? t.loginHaveAccount : t.loginNeedAccount}</Text>
          </Pressable>

          <Text style={styles.hint}>{t.loginHint}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  flex: { flex: 1 },
  hero: {
    backgroundColor: colors.blue800,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 64,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { color: colors.white, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#dbeafe', fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 22 },
  body: { paddingHorizontal: 24, marginTop: -28, gap: 14 },
  card: {
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
  label: { fontSize: 13, fontWeight: '700', color: colors.slate500 },
  labelGap: { marginTop: 14 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.slate800,
    backgroundColor: colors.slate50,
  },
  submitBtn: {
    marginTop: 18,
    backgroundColor: colors.blue700,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitPressed: { opacity: 0.9 },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  error: { color: colors.red600, fontSize: 13, textAlign: 'center', marginTop: 12 },
  switchBtn: { alignItems: 'center', paddingVertical: 4 },
  switchText: { color: colors.blue700, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.slate500, fontSize: 13, textAlign: 'center', lineHeight: 18 },
})

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import { LABELS, classifyAllTexts, mergeTexts, splitTexts } from '../ml/textClassifier'
import { recognizeImage } from '../ocr/recognize'
import { colors } from '../theme'

const MAX_SHOTS = 40
const SHOT_GAP_MS = 900

function waitFor(check, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      if (check()) return resolve(true)
      if (Date.now() - start > timeoutMs) return resolve(false)
      setTimeout(tick, 120)
    }
    tick()
  })
}

export default function ScanMedicine() {
  const { t, replaceAlarmsFromScan } = useApp()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const focused = useIsFocused()
  const cameraRef = useRef(null)
  const textsRef = useRef([])
  const stopRef = useRef(false)
  const loopingRef = useRef(false)
  const cameraReadyRef = useRef(false)
  const [permission, requestPermission] = useCameraPermissions()
  const [reading, setReading] = useState(false)
  const [flash, setFlash] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [texts, setTexts] = useState([])
  const [shots, setShots] = useState(0)
  const [error, setError] = useState('')

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
      contentStyle: { backgroundColor: '#000', flex: 1 },
    })
  }, [navigation])

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
  }, [permission?.granted])

  useEffect(() => {
    if (!focused) {
      stopRef.current = true
      cameraReadyRef.current = false
      return
    }
    stopRef.current = false
    if (permission?.granted) autoCaptureLoop()
    return () => {
      stopRef.current = true
    }
  }, [focused, permission?.granted])

  async function captureOnce() {
    const camera = cameraRef.current
    if (!camera?.takePictureAsync) return null
    let photo
    try {
      photo = await camera.takePictureAsync({
        quality: 0.5,
        base64: true,
        exif: false,
        shutterSound: false,
      })
    } catch (err) {
      console.error('takePictureAsync', err)
      return null
    }
    setShots((n) => n + 1)
    setFlash(true)
    setTimeout(() => setFlash(false), 120)
    if (!photo?.uri && !photo?.base64) return classifyAllTexts(textsRef.current)
    try {
      let uri = photo.uri
      let base64 = photo.base64
      if (photo.uri) {
        const small = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 960 } }], {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        })
        uri = small.uri || uri
        base64 = small.base64 || base64
      }
      const found = await recognizeImage({ uri, base64 })
      const incoming = splitTexts(found)
      if (incoming.length) {
        const merged = mergeTexts(textsRef.current, incoming)
        textsRef.current = merged
        setTexts(merged)
      }
    } catch (err) {
      console.warn('ocr', err?.message || err)
    }
    return classifyAllTexts(textsRef.current)
  }

  async function autoCaptureLoop() {
    if (loopingRef.current || stopRef.current) return
    loopingRef.current = true
    setReading(true)
    setError('')
    setResultOpen(false)
    try {
      const ready = await waitFor(
        () => cameraReadyRef.current && Boolean(cameraRef.current?.takePictureAsync),
        12000,
      )
      if (!ready || stopRef.current) {
        if (!stopRef.current) {
          setError(t.scanFailMsg)
          setResultOpen(true)
        }
        return
      }
      let taken = 0
      while (!stopRef.current && taken < MAX_SHOTS) {
        const classified = await captureOnce()
        if (!classified) {
          await new Promise((resolve) => setTimeout(resolve, SHOT_GAP_MS))
          taken += 1
          continue
        }
        taken += 1
        if (classified.found.length > 0) {
          setResultOpen(true)
          return
        }
        await new Promise((resolve) => setTimeout(resolve, SHOT_GAP_MS))
      }
      if (!stopRef.current) {
        setError(t.scanFailMsg)
        setResultOpen(true)
      }
    } catch (err) {
      console.error(err)
      if (!stopRef.current) {
        setError(t.scanFailMsg)
        setResultOpen(true)
      }
    } finally {
      loopingRef.current = false
      setReading(false)
    }
  }

  function retryScan() {
    stopRef.current = false
    textsRef.current = []
    setTexts([])
    setShots(0)
    autoCaptureLoop()
  }

  const result = classifyAllTexts(texts)
  const classified = result.found.length > 0

  function confirmAlarms() {
    const names = result.found.map((item) => item.name)
    if (!names.length) return
    stopRef.current = true
    replaceAlarmsFromScan(names)
    navigation.navigate('Alarms')
  }

  function goHome() {
    stopRef.current = true
    navigation.navigate('Home')
  }

  return (
    <View style={[styles.root, { marginTop: insets.top * 4 }]}>
      {focused && permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="off"
          animateShutter
          onCameraReady={() => {
            cameraReadyRef.current = true
          }}
        />
      ) : (
        <View style={styles.black} />
      )}
      {flash ? <View style={styles.flash} pointerEvents="none" /> : null}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 4) }]}>
          <Pressable onPress={goHome} style={styles.back}>
            <FontAwesome name="chevron-left" size={16} color={colors.white} />
          </Pressable>
          <Text style={styles.title}>{t.scanHeader}</Text>
          <View style={styles.back} />
        </View>
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.tip}>{reading ? `${t.scanAutoRunning} (${shots})` : t.scanTip}</Text>
        </View>
        {permission && !permission.granted ? (
          <Pressable onPress={requestPermission} style={styles.permBtn}>
            <Text style={styles.permText}>Allow camera</Text>
          </Pressable>
        ) : null}
      </View>

      {resultOpen ? (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {error && !classified ? (
            <>
              <Text style={styles.failTitle}>{t.scanFail}</Text>
              <Text style={styles.failMsg}>{error}</Text>
              <Pressable onPress={retryScan} style={styles.confirm}>
                <Text style={styles.confirmText}>{t.scanKeepShootingBtn}</Text>
              </Pressable>
            </>
          ) : classified ? (
            <ScrollView>
              <Text style={styles.okTitle}>{t.scanFullyClassified}</Text>
              <Text style={styles.shots}>
                {t.scanShots}: {shots}
              </Text>
              {LABELS.map((item) => {
                const found = result.found.some((entry) => entry.id === item.id)
                const score = result.combined.scores.find((entry) => entry.id === item.id)?.score || 0
                return (
                  <View key={item.id} style={styles.labelCard}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.labelName, found && { color: colors.emerald700 }]}>{item.name}</Text>
                      <Text>{found ? t.scanFound : t.scanPending}</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.max(2, Math.round(score * 100))}%`,
                            backgroundColor: item.id.includes('ambroxol') ? colors.sky500 : colors.orange600,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )
              })}
              <Text style={styles.typedLabel}>{t.scanTypedLabel}</Text>
              {result.items.map((item, index) => (
                <View key={`${item.text}-${index}`} style={styles.textCard}>
                  <Text style={styles.itemText}>{item.text}</Text>
                  <Text style={{ color: item.confident ? colors.emerald600 : colors.amber500, marginTop: 4 }}>
                    {item.confident ? item.name : t.scanPending}
                  </Text>
                </View>
              ))}
              <Pressable onPress={confirmAlarms} style={styles.confirm}>
                <Text style={styles.confirmText}>{t.scanConfirm}</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.black },
  black: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.black },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.55)', zIndex: 20 },
  overlay: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.white, fontSize: 18, fontWeight: '700' },
  frameWrap: { alignItems: 'center', marginTop: 64 },
  frame: {
    width: 256,
    height: 256,
    borderColor: colors.emerald500,
    borderWidth: 3,
    borderRadius: 16,
  },
  tip: {
    marginTop: 16,
    color: colors.slate200,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  permBtn: {
    alignSelf: 'center',
    marginTop: 24,
    backgroundColor: colors.emerald600,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permText: { color: colors.white, fontWeight: '700' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 24,
    paddingTop: 16,
    zIndex: 30,
  },
  handle: { width: 48, height: 4, backgroundColor: colors.slate200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  failTitle: { color: colors.red600, fontSize: 20, fontWeight: '700' },
  failMsg: { color: colors.slate600, marginVertical: 12 },
  okTitle: { color: colors.emerald600, fontWeight: '700', marginBottom: 4 },
  shots: { color: colors.slate400, fontSize: 12, marginBottom: 12 },
  labelCard: { backgroundColor: colors.slate50, borderRadius: 12, padding: 12, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  labelName: { fontWeight: '700', color: colors.slate600, fontSize: 12 },
  barBg: { height: 8, backgroundColor: colors.slate200, borderRadius: 8, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 8 },
  typedLabel: { fontWeight: '700', color: colors.slate600, marginTop: 8, marginBottom: 8 },
  textCard: { backgroundColor: colors.slate50, borderRadius: 8, padding: 8, marginBottom: 8 },
  itemText: { color: colors.slate800, fontWeight: '500' },
  confirm: {
    backgroundColor: colors.emerald600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmText: { color: colors.white, fontWeight: '700' },
})

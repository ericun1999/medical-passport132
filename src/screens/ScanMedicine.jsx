import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import { LABELS } from '../ml/textClassifier'
import { classifyMedicineImage } from '../ai/classifyMedicineImage'
import { colors } from '../theme'

const MAX_SHOTS = 3
const SHOT_GAP_MS = 1200

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
  const stopRef = useRef(false)
  const loopingRef = useRef(false)
  const cameraReadyRef = useRef(false)
  const scanIdRef = useRef(0)
  const [permission, requestPermission] = useCameraPermissions()
  const [reading, setReading] = useState(false)
  const [flash, setFlash] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [result, setResult] = useState(null)
  const [shots, setShots] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
  }, [permission?.granted])

  useEffect(() => {
    if (!focused) {
      stopRef.current = true
      scanIdRef.current += 1
      cameraReadyRef.current = false
      return
    }
    stopRef.current = false
    if (permission?.granted) autoCaptureLoop()
    return () => {
      stopRef.current = true
    }
  }, [focused, permission?.granted])

  async function captureOnce(scanId) {
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
    if (!photo?.uri && !photo?.base64) return null

    let base64 = photo.base64
    if (photo.uri) {
      const small = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 1024 } }], {
        compress: 0.72,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      })
      base64 = small.base64 || base64
    }

    const classified = await classifyMedicineImage({ base64, mimeType: 'image/jpeg' })
    if (scanId !== scanIdRef.current || stopRef.current) return null
    setResult(classified)
    return classified
  }

  async function autoCaptureLoop() {
    if (loopingRef.current || stopRef.current) return
    const scanId = ++scanIdRef.current
    loopingRef.current = true
    setReading(true)
    setError('')
    setResult(null)
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
        const classified = await captureOnce(scanId)
        if (scanId !== scanIdRef.current) return
        if (!classified) {
          await new Promise((resolve) => setTimeout(resolve, SHOT_GAP_MS))
          taken += 1
          continue
        }
        taken += 1
        if (classified.found.length > 0) {
          stopRef.current = true
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
      console.warn('gemini', err?.message || err)
      if (!stopRef.current) {
        setError(err?.message || t.scanFailMsg)
        setResultOpen(true)
      }
    } finally {
      loopingRef.current = false
      if (scanId === scanIdRef.current) setReading(false)
    }
  }

  function retryScan() {
    stopRef.current = false
    setResult(null)
    setError('')
    setShots(0)
    autoCaptureLoop()
  }

  async function pickAndClassify() {
    stopRef.current = true
    const scanId = ++scanIdRef.current
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    })
    if (picked.canceled) return

    const image = picked.assets?.[0]
    if (!image?.base64) {
      setError(t.scanFailMsg)
      setResultOpen(true)
      return
    }

    setReading(true)
    setError('')
    setResult(null)
    setResultOpen(false)
    setShots(1)
    try {
      const classified = await classifyMedicineImage({
        base64: image.base64,
        mimeType: image.mimeType || 'image/jpeg',
      })
      if (scanId !== scanIdRef.current) return
      setResult(classified)
      if (!classified.found.length) setError(t.scanFailMsg)
      setResultOpen(true)
    } catch (err) {
      if (scanId !== scanIdRef.current) return
      console.warn('gemini', err?.message || err)
      setError(err?.message || t.scanFailMsg)
      setResultOpen(true)
    } finally {
      if (scanId === scanIdRef.current) setReading(false)
    }
  }

  const classified = Boolean(result?.found.length)

  function confirmAlarms() {
    const names = result?.found.map((item) => item.name) || []
    if (!names.length) return
    stopRef.current = true
    replaceAlarmsFromScan(names)
    navigation.navigate('Alarms')
  }

  return (
    <View style={styles.root}>
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
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.status}>
            <View style={[styles.dot, reading && styles.dotOn]} />
            <Text style={styles.shotCount}>{shots}</Text>
          </View>
          <Text style={styles.title}>{t.scanHeader}</Text>
          <Pressable onPress={retryScan} style={styles.iconBtn}>
            <FontAwesome name="refresh" size={16} color={colors.white} />
          </Pressable>
        </View>

        {permission && !permission.granted ? (
          <Pressable onPress={requestPermission} style={styles.permBtn}>
            <Text style={styles.permText}>Allow camera</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={pickAndClassify} style={styles.albumBtn}>
          <FontAwesome name="image" size={15} color={colors.white} />
          <Text style={styles.albumText}>{t.scanAlbum}</Text>
        </Pressable>
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
                const found = result?.found.some((entry) => entry.id === item.id)
                const score = result?.scores.find((entry) => entry.id === item.id)?.score || 0
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
              <View style={styles.textCard}>
                <Text style={styles.itemText}>{result?.text || t.empty}</Text>
                {result?.matches.map((item, index) => (
                  <Text key={`${item.id}-${index}`} style={styles.evidence}>
                    {item.evidence} · {Math.round(item.confidence * 100)}%
                  </Text>
                ))}
              </View>
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
  root: { flex: 1, backgroundColor: colors.black },
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    width: 40,
    alignItems: 'center',
    gap: 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.slate500 },
  dotOn: { backgroundColor: colors.emerald500 },
  shotCount: { color: colors.slate200, fontSize: 11, fontWeight: '700' },
  title: { color: colors.white, fontSize: 18, fontWeight: '700' },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  albumBtn: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 20,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  albumText: { color: colors.white, fontWeight: '700' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  evidence: { color: colors.slate500, fontSize: 12, marginTop: 6 },
  confirm: {
    backgroundColor: colors.emerald600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmText: { color: colors.white, fontWeight: '700' },
})

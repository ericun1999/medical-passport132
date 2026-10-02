import { PermissionsAndroid, Platform } from 'react-native'
import {
  DEVICE_NAME,
  RX_UUID,
  SERVICE_UUID,
  TX_UUID,
  bleError,
  bytesToText,
  sameUuid,
  textToBytes,
} from './smartPill'

const SCAN_SECONDS = 10
const PREFERRED_MTU = 512
const FALLBACK_WRITE_SIZE = 20

// The package instantiates its manager on import and throws when the native
// module is missing, which happens in Expo Go or a dev build made before BLE
// was added.
let BleManager = null
try {
  BleManager = require('react-native-ble-manager').default
} catch {
  BleManager = null
}

export const available = Boolean(BleManager)
export const unavailableCode = 'module'

let startPromise = null

function ensureStarted() {
  if (!startPromise) {
    startPromise = BleManager.start({ showAlert: false }).catch((err) => {
      startPromise = null
      throw err
    })
  }
  return startPromise
}

async function ensurePermissions() {
  if (Platform.OS !== 'android') return
  const { PERMISSIONS, RESULTS } = PermissionsAndroid
  const required =
    Platform.Version >= 31
      ? [PERMISSIONS.BLUETOOTH_SCAN, PERMISSIONS.BLUETOOTH_CONNECT]
      : [PERMISSIONS.ACCESS_FINE_LOCATION]
  const granted = await PermissionsAndroid.requestMultiple(required)
  if (required.some((permission) => granted[permission] !== RESULTS.GRANTED)) {
    throw bleError('permission')
  }
}

async function ensureRadioOn() {
  const state = await BleManager.checkState()
  if (state === 'on') return
  if (state === 'unsupported') throw bleError('unsupported')
  if (Platform.OS !== 'android') throw bleError('bluetooth-off')
  try {
    await BleManager.enableBluetooth()
  } catch {
    throw bleError('bluetooth-off')
  }
}

function findPillbox() {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (action) => {
      if (settled) return
      settled = true
      discovered.remove()
      scanEnded.remove()
      BleManager.stopScan().catch(() => {})
      action()
    }

    const discovered = BleManager.onDiscoverPeripheral((peripheral) => {
      const name = peripheral.name || peripheral.advertising?.localName || ''
      if (name !== DEVICE_NAME) return
      finish(() => resolve(peripheral))
    })
    const scanEnded = BleManager.onStopScan(() => finish(() => reject(bleError('not-found'))))

    BleManager.scan({ seconds: SCAN_SECONDS }).catch(() => finish(() => reject(bleError('failed'))))
  })
}

async function negotiateWriteSize(peripheralId) {
  try {
    if (Platform.OS === 'android') {
      const mtu = await BleManager.requestMTU(peripheralId, PREFERRED_MTU)
      return Math.max(mtu - 3, FALLBACK_WRITE_SIZE)
    }
    const max = await BleManager.getMaximumWriteValueLengthForWithResponse(peripheralId)
    return Math.max(max, FALLBACK_WRITE_SIZE)
  } catch {
    return FALLBACK_WRITE_SIZE
  }
}

function releaseSubscriptions(handle) {
  handle.subscriptions.forEach((subscription) => subscription.remove())
  handle.subscriptions = []
}

export async function connect({ onStatus, onMessage, onDisconnected }) {
  if (!available) throw bleError(unavailableCode)
  await ensurePermissions()
  await ensureStarted()
  await ensureRadioOn()

  onStatus?.('scanning')
  const peripheral = await findPillbox()

  onStatus?.('connecting')
  await BleManager.connect(peripheral.id)
  const handle = {
    id: peripheral.id,
    name: peripheral.name || DEVICE_NAME,
    writeSize: FALLBACK_WRITE_SIZE,
    subscriptions: [],
  }

  try {
    await BleManager.retrieveServices(peripheral.id, [SERVICE_UUID])
    handle.writeSize = await negotiateWriteSize(peripheral.id)

    handle.subscriptions.push(
      BleManager.onDidUpdateValueForCharacteristic((event) => {
        if (event.peripheral !== handle.id || !sameUuid(event.characteristic, TX_UUID)) return
        onMessage?.(bytesToText(event.value))
      }),
      BleManager.onDisconnectPeripheral((event) => {
        if (event.peripheral !== handle.id) return
        releaseSubscriptions(handle)
        onDisconnected?.()
      }),
    )
    await BleManager.startNotification(peripheral.id, SERVICE_UUID, TX_UUID)
  } catch (err) {
    releaseSubscriptions(handle)
    await BleManager.disconnect(peripheral.id).catch(() => {})
    throw err
  }

  return handle
}

export async function send(handle, text) {
  const bytes = textToBytes(text)
  try {
    await BleManager.write(handle.id, SERVICE_UUID, RX_UUID, bytes, handle.writeSize)
  } catch {
    await BleManager.writeWithoutResponse(handle.id, SERVICE_UUID, RX_UUID, bytes, handle.writeSize)
  }
}

export async function disconnect(handle) {
  releaseSubscriptions(handle)
  await BleManager.stopNotification(handle.id, SERVICE_UUID, TX_UUID).catch(() => {})
  await BleManager.disconnect(handle.id).catch(() => {})
}

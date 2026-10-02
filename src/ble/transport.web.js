import { DEVICE_NAME, RX_UUID, SERVICE_UUID, TX_UUID, bleError, textToBytes } from './smartPill'

export const available = typeof navigator !== 'undefined' && Boolean(navigator.bluetooth)
export const unavailableCode = 'unsupported'

export async function connect({ onStatus, onMessage, onDisconnected }) {
  if (!available) throw bleError(unavailableCode)

  onStatus?.('scanning')
  let device
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ name: DEVICE_NAME }],
      optionalServices: [SERVICE_UUID],
    })
  } catch (err) {
    // The chooser rejects with NotFoundError both when nothing matched and when
    // the user dismissed it, so treat it as a silent cancel.
    throw bleError(err?.name === 'NotFoundError' ? 'cancelled' : 'failed')
  }

  onStatus?.('connecting')
  const handle = { device, name: device.name || DEVICE_NAME }
  handle.onDisconnect = () => {
    device.removeEventListener('gattserverdisconnected', handle.onDisconnect)
    onDisconnected?.()
  }
  device.addEventListener('gattserverdisconnected', handle.onDisconnect)

  try {
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(SERVICE_UUID)
    handle.rx = await service.getCharacteristic(RX_UUID)
    handle.tx = await service.getCharacteristic(TX_UUID)
    handle.onValue = (event) => onMessage?.(new TextDecoder().decode(event.target.value))
    handle.tx.addEventListener('characteristicvaluechanged', handle.onValue)
    await handle.tx.startNotifications()
  } catch (err) {
    device.removeEventListener('gattserverdisconnected', handle.onDisconnect)
    device.gatt?.disconnect()
    throw err
  }

  return handle
}

export async function send(handle, text) {
  const data = new Uint8Array(textToBytes(text))
  try {
    await handle.rx.writeValueWithResponse(data)
  } catch {
    await handle.rx.writeValueWithoutResponse(data)
  }
}

export async function disconnect(handle) {
  handle.device.removeEventListener('gattserverdisconnected', handle.onDisconnect)
  handle.tx?.removeEventListener('characteristicvaluechanged', handle.onValue)
  await handle.tx?.stopNotifications().catch(() => {})
  handle.device.gatt?.disconnect()
}

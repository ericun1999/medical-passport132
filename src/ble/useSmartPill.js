import { useCallback, useEffect, useRef, useState } from 'react'
import { SLOT_COUNT, SLOT_STATE, buildTimeSync, parseSlotStates } from './smartPill'
import * as transport from './transport'

const IDLE_STATES = Array(SLOT_COUNT).fill(SLOT_STATE.pending)

/**
 * Keeps a single SmartPillBox link alive and mirrors the slot states the box
 * notifies back. `status` is one of disconnected / scanning / connecting /
 * connected / unsupported.
 */
export function useSmartPill() {
  const handleRef = useRef(null)
  const mountedRef = useRef(true)
  const [status, setStatus] = useState(transport.available ? 'disconnected' : 'unsupported')
  const [deviceName, setDeviceName] = useState('')
  const [slotStates, setSlotStates] = useState(IDLE_STATES)
  const [errorCode, setErrorCode] = useState('')

  const release = useCallback(() => {
    const handle = handleRef.current
    handleRef.current = null
    if (handle) transport.disconnect(handle).catch(() => {})
    if (!mountedRef.current) return
    setStatus(transport.available ? 'disconnected' : 'unsupported')
    setDeviceName('')
    setSlotStates(IDLE_STATES)
  }, [])

  useEffect(
    () => () => {
      mountedRef.current = false
      const handle = handleRef.current
      handleRef.current = null
      if (handle) transport.disconnect(handle).catch(() => {})
    },
    [],
  )

  const send = useCallback(async (text) => {
    if (!handleRef.current) {
      setErrorCode('not-connected')
      return false
    }
    try {
      await transport.send(handleRef.current, text)
      return true
    } catch (err) {
      setErrorCode(err?.code || 'failed')
      return false
    }
  }, [])

  const connect = useCallback(async () => {
    if (handleRef.current) return true
    if (!transport.available) {
      setErrorCode(transport.unavailableCode)
      return false
    }
    setErrorCode('')
    try {
      const handle = await transport.connect({
        onStatus: (next) => mountedRef.current && setStatus(next),
        onMessage: (text) => {
          const states = parseSlotStates(text)
          if (states && mountedRef.current) setSlotStates(states)
        },
        onDisconnected: release,
      })
      if (!mountedRef.current) {
        transport.disconnect(handle).catch(() => {})
        return false
      }
      handleRef.current = handle
      setDeviceName(handle.name)
      setStatus('connected')
      await send(buildTimeSync(new Date()))
      return true
    } catch (err) {
      release()
      if (err?.code !== 'cancelled') setErrorCode(err?.code || 'failed')
      return false
    }
  }, [release, send])

  const syncTime = useCallback(() => send(buildTimeSync(new Date())), [send])

  return {
    available: transport.available,
    unavailableCode: transport.unavailableCode,
    status,
    connected: status === 'connected',
    busy: status === 'scanning' || status === 'connecting',
    deviceName,
    slotStates,
    errorCode,
    clearError: useCallback(() => setErrorCode(''), []),
    connect,
    disconnect: release,
    send,
    syncTime,
  }
}

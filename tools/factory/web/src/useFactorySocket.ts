import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { initialState, reducer } from './state'
import { summarizeClientMessage, summarizeServerMessage } from './lib/debug'
import type { DebugEvent } from './lib/debug'
import type { ClientMsg, ServerMsg } from './types'

const DEFAULT_URL = 'ws://127.0.0.1:8080/ws'

export function useFactorySocket(onNotice?: (message: string) => void) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [events, setEvents] = useState<DebugEvent[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const noticeRef = useRef(onNotice)
  const wsUrl = (import.meta.env.VITE_FACTORY_WS as string | undefined) ?? DEFAULT_URL

  const pushEvent = useCallback((event: DebugEvent) => {
    setEvents((previous) => [...previous.slice(-49), event])
  }, [])

  useEffect(() => {
    noticeRef.current = onNotice
  }, [onNotice])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let backoff = 500

    function connect() {
      if (!active) return
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        if (!active) return
        backoff = 500
        pushEvent({
          at: new Date().toISOString(),
          direction: 'system',
          type: 'open',
          summary: `connected to ${wsUrl}`,
        })
        dispatch({ type: 'connection', connected: true })
      }
      socket.onclose = (event) => {
        if (socketRef.current === socket) {
          socketRef.current = null
        }
        if (!active) return
        pushEvent({
          at: new Date().toISOString(),
          direction: 'system',
          type: 'close',
          summary: `code=${event.code} reason=${event.reason || '(none)'}`,
        })
        dispatch({ type: 'connection', connected: false })
        timer = setTimeout(connect, backoff)
        backoff = Math.min(backoff * 2, 5000)
      }
      socket.onerror = () => {
        if (!active) return
        pushEvent({
          at: new Date().toISOString(),
          direction: 'system',
          type: 'socket_error',
          summary: 'websocket error',
        })
        socket.close()
      }
      socket.onmessage = (event) => {
        if (!active) return
        if (typeof event.data !== 'string') {
          pushEvent({
            at: new Date().toISOString(),
            direction: 'system',
            type: 'message',
            summary: 'non-string message',
          })
          return
        }
        let message: ServerMsg
        try {
          message = JSON.parse(event.data) as ServerMsg
        } catch {
          pushEvent({
            at: new Date().toISOString(),
            direction: 'in',
            type: 'unparseable',
            summary: event.data.slice(0, 500),
          })
          return
        }
        pushEvent(summarizeServerMessage(message))
        if (message.type === 'groom_thread') {
          dispatch({ type: 'thread_loaded', id: message.id, thread: message.thread })
          return
        }
        if (message.type === 'groom_chat_started') {
          dispatch({ type: 'chat_started', id: message.id })
          return
        }
        if (message.type === 'groom_chat_result') {
          dispatch({
            type: 'chat_result',
            id: message.id,
            ok: message.ok,
            thread: message.thread,
            error: message.error,
          })
          return
        }
        if (message.type === 'error') {
          noticeRef.current?.(message.message)
          return
        }
        if (message.type === 'build_status') {
          const job =
            message.job ??
            ({
              id: message.id,
              phase: message.phase,
              ok: message.ok,
              message: message.message,
              brief_path: message.brief_path,
              model: message.model,
            } as const)
          dispatch({ type: 'build_status', job })
          if (message.phase === 'starting' || message.phase === 'running') {
            noticeRef.current?.(message.message || `Building ${message.id}`)
          } else if (message.phase === 'error' || (message.phase === 'exited' && !message.ok)) {
            noticeRef.current?.(message.message || `Build failed: ${message.id}`)
          } else if (message.phase === 'exited') {
            noticeRef.current?.(message.message || `Build finished: ${message.id}`)
          }
          return
        }
        if (message.type === 'build_result') {
          noticeRef.current?.(
            message.ok
              ? message.message || `Brief ready: ${message.brief_path || message.id}`
              : message.error || 'Build brief failed',
          )
          return
        }
        dispatch({ type: 'server', message })
      }
    }

    const onWindowError = (event: ErrorEvent) => {
      pushEvent({
        at: new Date().toISOString(),
        direction: 'system',
        type: 'window_error',
        message: event.message,
        summary: `${event.filename}:${event.lineno}:${event.colno}`,
      })
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      pushEvent({
        at: new Date().toISOString(),
        direction: 'system',
        type: 'unhandled_rejection',
        message: String(event.reason),
        summary: String(event.reason),
      })
    }

    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onRejection)
    connect()

    return () => {
      active = false
      if (timer) clearTimeout(timer)
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onRejection)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [pushEvent, wsUrl])

  useEffect(() => {
    if (state.needResync && state.connected) {
      const message: ClientMsg = { type: 'resync' }
      pushEvent(summarizeClientMessage(message))
      socketRef.current?.send(JSON.stringify(message))
    }
  }, [state.needResync, state.connected, pushEvent])

  const send = useCallback(
    (message: ClientMsg) => {
      const socket = socketRef.current
      if (socket && socket.readyState === WebSocket.OPEN) {
        pushEvent(summarizeClientMessage(message))
        socket.send(JSON.stringify(message))
      } else {
        pushEvent({
          at: new Date().toISOString(),
          direction: 'out',
          type: message.type,
          summary: 'not sent: socket not open',
        })
      }
    },
    [pushEvent],
  )

  const clearDebug = useCallback(() => setEvents([]), [])
  const reconnect = useCallback(() => {
    socketRef.current?.close()
  }, [])

  return { state, send, debug: { wsUrl, events }, clearDebug, reconnect }
}

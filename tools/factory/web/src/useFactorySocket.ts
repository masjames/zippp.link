import { useCallback, useEffect, useReducer, useRef } from 'react'
import { initialState, reducer } from './state'
import type { ClientMsg, ServerMsg } from './types'

const DEFAULT_URL = 'ws://127.0.0.1:8080/ws'

export function useFactorySocket(onNotice?: (message: string) => void) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const socketRef = useRef<WebSocket | null>(null)
  const noticeRef = useRef(onNotice)

  useEffect(() => {
    noticeRef.current = onNotice
  }, [onNotice])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let backoff = 500

    const url = (import.meta.env.VITE_FACTORY_WS as string | undefined) ?? DEFAULT_URL

    function connect() {
      if (!active) return
      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        if (!active) return
        backoff = 500
        dispatch({ type: 'connection', connected: true })
      }
      socket.onclose = () => {
        socketRef.current = null
        if (!active) return
        dispatch({ type: 'connection', connected: false })
        timer = setTimeout(connect, backoff)
        backoff = Math.min(backoff * 2, 5000)
      }
      socket.onerror = () => {
        socket.close()
      }
      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') return
        let message: ServerMsg
        try {
          message = JSON.parse(event.data) as ServerMsg
        } catch {
          return
        }
        if (message.type === 'editor_result') {
          noticeRef.current?.(message.message || (message.ok ? 'Editor opened' : 'Editor failed'))
          return
        }
        if (message.type === 'error') {
          noticeRef.current?.(message.message)
          return
        }
        dispatch({ type: 'server', message })
      }
    }

    connect()

    return () => {
      active = false
      if (timer) clearTimeout(timer)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (state.needResync && state.connected) {
      const message: ClientMsg = { type: 'resync' }
      socketRef.current?.send(JSON.stringify(message))
    }
  }, [state.needResync, state.connected])

  const send = useCallback((message: ClientMsg) => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }, [])

  return { state, send }
}

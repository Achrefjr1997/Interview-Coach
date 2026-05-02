import { useEffect, useRef, useCallback } from 'react'

export function useInterviewSocket({ sessionId, token, onMessage, enabled = true }) {
  const ws    = useRef(null)
  const retry = useRef(false)

  const connect = useCallback(() => {
    if (!sessionId || !token || !enabled) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url   = `${proto}://${window.location.host}/ws/${sessionId}?token=${token}`
    ws.current  = new WebSocket(url)

    ws.current.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)) } catch {}
    }

    ws.current.onclose = () => {
      if (!retry.current) {
        retry.current = true
        setTimeout(connect, 2000)
      }
    }
  }, [sessionId, token, onMessage, enabled])

  useEffect(() => {
    connect()
    return () => {
      retry.current = true
      ws.current?.close()
    }
  }, [connect])

  const sendAnswer = useCallback((text) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'answer', content: text }))
    }
  }, [])

  return { sendAnswer }
}

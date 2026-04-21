import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { io, Socket } from 'socket.io-client'
import { authService } from '../services/authService'
import type { ChatMessage } from '../services/chatService'

const SOCKET_URL = 'http://localhost:3000'

type SocketContextValue = {
  connected: boolean
  joinConversation: (conversationId: string) => Promise<boolean>
  leaveConversation: (conversationId: string) => void
  sendMessage: (conversationId: string, text: string) => Promise<{ ok: boolean; message?: ChatMessage; error?: string }>
  onNewMessage: (callback: (msg: ChatMessage) => void) => () => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const listenersRef = useRef<Set<(msg: ChatMessage) => void>>(new Set())

  useEffect(() => {
    const token = authService.getToken()
    if (!token) {
      setConnected(false)
      return
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))

    socket.on('new_message', (payload: ChatMessage) => {
      listenersRef.current.forEach((cb) => cb(payload))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  const joinConversation = useCallback(async (conversationId: string) => {
    const socket = socketRef.current
    if (!socket?.connected) return false
    return new Promise<boolean>((resolve) => {
      socket.emit('join_conversation', conversationId, (ack: { ok?: boolean }) => {
        resolve(ack?.ok === true)
      })
    })
  }, [])

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('leave_conversation', conversationId)
  }, [])

  const sendMessage = useCallback(
    async (
      conversationId: string,
      text: string
    ): Promise<{ ok: boolean; message?: ChatMessage; error?: string }> => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return { ok: false, error: 'Not connected' }
      }
      return new Promise((resolve) => {
        socket.emit('send_message', { conversationId, text }, (ack: { ok?: boolean; message?: ChatMessage }) => {
          if (ack?.ok && ack?.message && typeof ack.message === 'object') {
            resolve({ ok: true, message: { ...ack.message, isOwn: true } })
          } else {
            resolve({ ok: false, error: (ack as { message?: string })?.message || 'Failed to send' })
          }
        })
      })
    },
    []
  )

  const onNewMessage = useCallback((callback: (msg: ChatMessage) => void) => {
    listenersRef.current.add(callback)
    return () => {
      listenersRef.current.delete(callback)
    }
  }, [])

  const value: SocketContextValue = {
    connected,
    joinConversation,
    leaveConversation,
    sendMessage,
    onNewMessage
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return ctx
}

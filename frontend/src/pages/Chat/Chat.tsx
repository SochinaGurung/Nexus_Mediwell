import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import {
  chatService,
  type ChatMessage,
  type ChatableUser,
  type Conversation
} from '../../services/chatService'
import { useSocket } from '../../contexts/SocketContext'
import './Chat.css'

export default function Chat() {
  const navigate = useNavigate()
  const { connected, joinConversation, leaveConversation, sendMessage, onNewMessage } = useSocket()
  const currentUser = authService.getCurrentUser()
  const isDoctor = currentUser?.role === 'doctor'

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [chatableUsers, setChatableUsers] = useState<ChatableUser[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }
    const role = currentUser?.role
    if (role !== 'patient' && role !== 'doctor') {
      navigate('/')
      return
    }
    void loadConversations().then(() => loadChatableUsers())
  }, [navigate, currentUser?.role])

  async function loadConversations() {
    setError('')
    try {
      const res = await chatService.getConversations()
      setConversations(res.conversations || [])
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load conversations')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  async function loadChatableUsers() {
    try {
      const res = await chatService.getChatableUsers()
      setChatableUsers(res.users || [])
    } catch {
      setChatableUsers([])
    }
  }

  const newChatCandidates = useMemo(
    () =>
      chatableUsers.filter(
        (u) => !conversations.some((c) => String(c.otherUser.id) === String(u.id))
      ),
    [chatableUsers, conversations]
  )

  const openConversation = useCallback(
    async (conv: Conversation) => {
      setSelectedConv(conv)
      setShowNewChat(false)
      setError('')
      setLoadingMessages(true)
      setMessages([])
      setCurrentUserId(null)
      try {
        const res = await chatService.getMessages(conv.id)
        setMessages(res.messages || [])
        setCurrentUserId(res.currentUserId ?? null)
        await joinConversation(conv.id)
        await chatService.markConversationRead(conv.id)
        await loadConversations()
      } catch (err: unknown) {
        setError((err as { message?: string })?.message || 'Failed to load messages')
      } finally {
        setLoadingMessages(false)
      }
    },
    [joinConversation]
  )

  useEffect(() => {
    if (!selectedConv) return
    const unsub = onNewMessage((msg) => {
      if (msg.conversationId === selectedConv.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        chatService.markConversationRead(selectedConv.id).then(() => loadConversations())
      }
    })
    return () => {
      unsub()
      leaveConversation(selectedConv.id)
    }
  }, [selectedConv, onNewMessage, leaveConversation])

  async function handleStartChat(user: ChatableUser) {
    setError('')
    try {
      const res = await chatService.createOrGetConversation(user.id)
      const newConv: Conversation = {
        id: res.conversation.id,
        otherUser: res.conversation.otherUser,
        lastMessage: null,
        updatedAt: res.conversation.createdAt
      }
      setConversations((prev) => {
        const withoutSameOther = prev.filter(
          (c) => String(c.otherUser.id) !== String(newConv.otherUser.id)
        )
        return [newConv, ...withoutSameOther]
      })
      setShowNewChat(false)
      await loadChatableUsers()
      await openConversation(newConv)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as { message?: string })?.message || 'Cannot start chat')
    }
  }

  async function handleSend() {
    const text = inputText.trim()
    if (!text || !selectedConv || sending) return
    setSending(true)
    setInputText('')
    const result = await sendMessage(selectedConv.id, text)
    setSending(false)
    if (result.ok && result.message) {
      setMessages((prev) => {
        const m = result.message!
        if (prev.some((x) => String(x.id) === String(m.id))) return prev
        return [...prev, m]
      })
    } else if (!result.ok) {
      setError(result.error || 'Failed to send')
    }
  }

  const backLink = isDoctor ? '/doctor/dashboard' : '/patient/dashboard'
  const backLabel = isDoctor ? 'Doctor dashboard' : 'Dashboard'

  return (
    <div className="chat-page">
      <header className="chat-header">
        <Link to={backLink} className="chat-back">
          ← {backLabel}
        </Link>
        <h1>Messages</h1>
        {connected ? (
          <span className="chat-status chat-status-online">Connected</span>
        ) : (
          <span className="chat-status chat-status-offline">Connecting…</span>
        )}
      </header>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <button
            type="button"
            className="chat-new-btn"
            onClick={() => {
              setShowNewChat(true)
              setSelectedConv(null)
            }}
          >
            + Start New conversation
          </button>
          {showNewChat && (
            <div className="chat-new-list">
              {newChatCandidates.length > 0 ? (
                <>
                  <p className="chat-new-label">
                    You can only start a new chat with {isDoctor ? 'patients' : 'doctors'} you have a completed
                    appointment with, and who you do not already have a conversation with:
                  </p>
                  {newChatCandidates.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="chat-new-user"
                      onClick={() => handleStartChat(u)}
                    >
                      {u.name || u.username}
                    </button>
                  ))}
                </>
              ) : (
                <p className="chat-new-label">
                  {isDoctor
                    ? 'No new patients to add — you already have a thread with everyone you have completed appointments with, or none are available yet.'
                    : 'No new doctors to add — you already have a thread with everyone you have completed appointments with, or none are available yet.'}
                </p>
              )}
            </div>
          )}
          {error && <p className="chat-error">{error}</p>}
          {loading ? (
            <p className="chat-loading">Loading conversations…</p>
          ) : (
            <ul className="chat-conv-list">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    className={`chat-conv-item ${selectedConv?.id === conv.id ? 'active' : ''}`}
                    onClick={() => openConversation(conv)}
                  >
                    <span className="chat-conv-name">
                      {conv.otherUser.name || conv.otherUser.username}
                      {(conv.unreadCount ?? 0) > 0 && (
                        <span className="chat-conv-unread">{conv.unreadCount}</span>
                      )}
                    </span>
                    {conv.lastMessage && (
                      <span className="chat-conv-preview">{conv.lastMessage.text}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="chat-main">
          {!selectedConv ? (
            <div className="chat-placeholder">
              <p>Select a conversation or start a new one.</p>
              <p className="chat-placeholder-hint">
                You can only chat with {isDoctor ? 'patients' : 'doctors'} after an appointment has been completed.
              </p>
            </div>
          ) : (
            <>
              <div className="chat-main-header">
                <h2>{selectedConv.otherUser.name || selectedConv.otherUser.username}</h2>
              </div>
              <div className="chat-messages">
                {loadingMessages ? (
                  <p>Loading messages…</p>
                ) : (
                  messages.map((msg) => {
                    const isOwn = Boolean(currentUserId && String(msg.sender) === String(currentUserId))
                    return (
                      <div
                        key={msg.id}
                        className={`chat-msg ${isOwn ? 'own' : 'other'}`}
                      >
                        <span className="chat-msg-sender">
                          {isOwn ? (isDoctor ? 'You (Doctor)' : 'You (Patient)') : (isDoctor ? 'Patient' : 'Doctor')}
                        </span>
                        <p className="chat-msg-text">{msg.text}</p>
                        <span className="chat-msg-time">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : ''}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="chat-input-wrap">
                <input
                  type="text"
                  className="chat-input"
                  placeholder={connected ? 'Type a message…' : 'Connecting…'}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <button
                  type="button"
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={!inputText.trim() || !connected || sending}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

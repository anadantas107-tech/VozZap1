import { useEffect, useState, useRef } from 'react'
import { Send, Loader, AlertCircle, Play, Pause } from 'lucide-react'
import { Message, Conversation, subscribeToMessages, sendMessage, markMessagesAsRead, getMessages } from '../../lib/chat-service'
import { AudioRecorder } from './AudioRecorder'

interface ChatInputProps {
  conversationId: string
  receiverId: string
  onSend: (message: Message) => void
  disabled?: boolean
}

// Este componente foi substituído por AudioRecorder
export function ChatInput({ conversationId, receiverId, onSend, disabled }: ChatInputProps) {
  return <></>
}

interface MessageBubbleProps {
  message: Message
  isSender: boolean
  senderName?: string
  senderAvatar?: string
}

export function AudioPlayer({ audioUrl, duration }: { audioUrl: string; duration?: number }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const displayDuration = duration || 0

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '0.5rem'
    }}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      
      <button
        onClick={togglePlay}
        style={{
          padding: '0.5rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <div style={{ flex: 1, minWidth: '100px' }}>
        <div style={{
          height: '3px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '2px',
          cursor: 'pointer',
          position: 'relative'
        }}>
          <div
            style={{
              height: '100%',
              backgroundColor: 'currentColor',
              borderRadius: '2px',
              width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%`,
              transition: 'width 0.1s linear'
            }}
          />
        </div>
      </div>

      <span style={{
        fontSize: '0.75rem',
        minWidth: '40px',
        textAlign: 'right',
        opacity: 0.8
      }}>
        {formatTime(currentTime)} / {formatTime(displayDuration)}
      </span>
    </div>
  )
}

export function MessageBubble({ message, isSender, senderName, senderAvatar }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className={`message-bubble ${isSender ? 'sent' : 'received'}`}>
      {!isSender && senderAvatar && (
        <div className="message-avatar-wrapper">
          <img src={senderAvatar} alt={senderName} className="message-avatar" />
          {senderName && <div className="message-avatar-name">{senderName}</div>}
        </div>
      )}
      <div className="message-content">
        {message.audio_url ? (
          <div>
            <AudioPlayer audioUrl={message.audio_url} duration={message.audio_duration} />
          </div>
        ) : (
          <p>{message.content || '🎵 Áudio'}</p>
        )}
        <span className="message-time">
          {formatTime(message.created_at)}
          {isSender && message.is_read && ' ✓✓'}
        </span>
      </div>
    </div>
  )
}

interface ChatWindowProps {
  conversation: Conversation
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
}

export function ChatWindow({
  conversation,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationId = conversation.id
  const receiverId = currentUserId === conversation.user_1_id 
    ? conversation.user_2_id 
    : conversation.user_1_id

  // Carregar mensagens iniciais
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true)
      setError('')
      try {
        const loaded = await getMessages(conversationId)
        setMessages(loaded)
        await markMessagesAsRead(conversationId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [conversationId])

  // Subscribe a novas mensagens
  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => [...prev, newMessage])
      markMessagesAsRead(conversationId)
    })

    return unsubscribe
  }, [conversationId])

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loading) {
    return (
      <div className="chat-loading">
        <Loader size={32} />
        <p>Carregando conversa...</p>
      </div>
    )
  }

  return (
    <div className="chat-window">
      {error && (
        <div className="chat-error-banner">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Nenhuma mensagem ainda</p>
            <span>Comece a conversa!</span>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSender={msg.sender_id === currentUserId}
              senderName={currentUserName}
              senderAvatar={currentUserAvatar}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <AudioRecorder
        conversationId={conversationId}
        receiverId={receiverId}
        onSend={(newMessage) => setMessages((prev) => [...prev, newMessage])}
        disabled={loading}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Loader, AlertCircle, MessageCircle } from 'lucide-react'
import { Conversation, getUserConversations, getOrCreateConversation, Profile } from '../../lib/chat-service'

interface ConversationListProps {
  currentUserId: string
  selectedConversation?: Conversation
  onSelectConversation: (conversation: Conversation) => void
  onNewConversation?: () => void
}

export function ConversationList({
  currentUserId,
  selectedConversation,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Carregar conversas
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true)
      setError('')
      try {
        const loaded = await getUserConversations()
        const formatted = loaded.map((conv) => {
          const otherUserId = conv.user_1_id === currentUserId ? conv.user_2_id : conv.user_1_id
          const profiles = conv.user_1_id === currentUserId ? conv.profiles_2 : conv.profiles
          
          return {
            ...conv,
            other_user: profiles as Profile,
          }
        })
        setConversations(formatted)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar conversas')
      } finally {
        setLoading(false)
      }
    }

    loadConversations()

    // Recarregar conversas a cada 30 segundos
    const interval = setInterval(loadConversations, 30000)
    return () => clearInterval(interval)
  }, [currentUserId])

  if (loading) {
    return (
      <div className="conversation-list-loading">
        <Loader size={24} />
        <p>Carregando conversas...</p>
      </div>
    )
  }

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h2>Mensagens</h2>
        {onNewConversation && (
          <button onClick={onNewConversation} className="new-chat-btn" aria-label="Nova mensagem">
            <MessageCircle size={20} />
          </button>
        )}
      </div>

      {error && (
        <div className="conversation-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="empty-conversations">
          <MessageCircle size={32} />
          <p>Nenhuma conversa ainda</p>
          <span>Comece a conversar com alguém!</span>
        </div>
      ) : (
        <div className="conversation-items">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className={`conversation-item ${
                selectedConversation?.id === conv.id ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv)}
            >
              <div className="conversation-avatar">
                <div className="avatar-wrapper">
                  {conv.other_user?.avatar_url ? (
                    <img src={conv.other_user.avatar_url} alt={conv.other_user.username} />
                  ) : (
                    <div className="avatar-placeholder">
                      {conv.other_user?.username?.[0].toUpperCase() || '?'}
                    </div>
                  )}
                  {conv.other_user?.is_online && <div className="online-indicator" />}
                </div>
                <div className="avatar-name">
                  {conv.other_user?.display_name || conv.other_user?.username}
                </div>
              </div>
              <div className="conversation-info">
                <div className="conversation-header">
                  <span className="conversation-time">
                    {new Date(conv.updated_at).toLocaleDateString('pt-BR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="conversation-preview">
                  {conv.last_message || '@' + conv.other_user?.username}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface StartConversationProps {
  users: Array<{ id: string; username: string; display_name: string; avatar_url?: string }>
  currentUserId: string
  onConversationStart: (conversation: Conversation) => void
}

export function StartConversationDialog({
  users,
  currentUserId,
  onConversationStart,
}: StartConversationProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filteredUsers = users.filter((u) => u.id !== currentUserId)

  const handleStart = async () => {
    if (!selectedUserId) return

    setLoading(true)
    setError('')

    try {
      const conversation = await getOrCreateConversation(currentUserId, selectedUserId)
      onConversationStart(conversation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar conversa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="start-conversation-dialog">
      <h3>Iniciar nova conversa</h3>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="user-selection">
        <label>Selecione um usuário:</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          disabled={loading}
        >
          <option value="">-- Escolha um usuário --</option>
          {filteredUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.display_name} (@{user.username})
            </option>
          ))}
        </select>
      </div>

      <div className="dialog-actions">
        <button
          onClick={handleStart}
          disabled={!selectedUserId || loading}
          className="btn btn-primary"
        >
          {loading ? 'Iniciando...' : 'Iniciar conversa'}
        </button>
      </div>
    </div>
  )
}

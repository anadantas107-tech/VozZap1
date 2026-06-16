import { useState, useEffect } from 'react'
import { Conversation, getCurrentUserProfile, Profile, validateAuth } from '../../lib/chat-service'
import { ChatWindow } from './ChatWindow'
import { ConversationList, StartConversationDialog } from './ConversationList'

interface DirectMessagesScreenProps {
  currentUserId?: string
  allUsers?: Array<{ id: string; username: string; display_name: string; avatar_url?: string }>
}

export function DirectMessagesScreen({ currentUserId: propsUserId, allUsers: propsUsers }: DirectMessagesScreenProps = {}) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [allUsers, setAllUsers] = useState<Array<{ id: string; username: string; display_name: string; avatar_url?: string }>>(propsUsers || [])
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>(propsUserId || '')
  const [authError, setAuthError] = useState<string | null>(null)

  // Carregar perfil do usuário autenticado
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Validar que o usuário está autenticado (local ou Supabase)
        const user = await validateAuth()
        
        const profile = await getCurrentUserProfile()
        setCurrentUserProfile(profile)
        if (profile?.id) {
          setCurrentUserId(profile.id)
        }
        setAuthError(null)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error('Erro ao carregar perfil:', err)
        setAuthError(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  // Mostrar erro de autenticação
  if (authError) {
    return (
      <div className="screen direct-messages">
        <div className="auth-error-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '2rem',
          textAlign: 'center',
          gap: '1.5rem'
        }}>
          <div style={{ fontSize: '3rem' }}>🔐</div>
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Autenticação Necessária</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Para acessar as mensagens diretas, você precisa estar logado com sua conta Supabase.
            </p>
            <p style={{ 
              fontSize: '0.875rem',
              color: '#ef4444',
              padding: '1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)'
            }}>
              {authError}
            </p>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              marginTop: '1rem'
            }}>
              Por favor, faça login ou registre-se para usar o chat.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="screen direct-loading">
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="screen direct-messages">
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fed7d7',
        borderRadius: '8px',
        padding: '12px 14px',
        margin: '0.5rem 0 1rem 0',
        fontSize: '0.85rem',
        color: '#744210',
        textAlign: 'center'
      }}>
        💾 <strong>Dados locais:</strong> As mensagens estão sendo salvas apenas neste navegador/máquina. Não há sincronização em nuvem.
      </div>
      <div className="dm-container">
        <div className="dm-sidebar">
          <ConversationList
            currentUserId={currentUserId}
            selectedConversation={selectedConversation ?? undefined}
            onSelectConversation={setSelectedConversation}
            onNewConversation={() => setShowNewConversation(true)}
          />
        </div>

        <div className="dm-main">
          {showNewConversation && (
            <div className="new-conversation-modal">
              <div className="modal-content">
                <h2>Nova conversa</h2>
                <StartConversationDialog
                  users={allUsers}
                  currentUserId={currentUserId}
                  onConversationStart={(conv) => {
                    setSelectedConversation(conv)
                    setShowNewConversation(false)
                  }}
                />
                <button
                  onClick={() => setShowNewConversation(false)}
                  className="btn btn-secondary"
                  style={{ marginTop: '16px' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUserId={currentUserId}
              currentUserName={currentUserProfile?.display_name}
              currentUserAvatar={currentUserProfile?.avatar_url}
            />
          ) : (
            <div className="empty-dm-view">
              <div className="empty-illustration">💬</div>
              <h2>Nenhuma conversa selecionada</h2>
              <p>Escolha uma conversa à esquerda ou crie uma nova</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

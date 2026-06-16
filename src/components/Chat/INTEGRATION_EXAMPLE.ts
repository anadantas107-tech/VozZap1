/**
 * EXEMPLO DE INTEGRAÇÃO NO App.tsx
 * 
 * Este arquivo mostra exatamente como integrar o sistema de chat
 * no seu App.tsx existente.
 */

// 1. IMPORTAÇÕES - ADICIONE NO TOPO DO App.tsx

import { DirectMessagesScreen } from './components/Chat/DirectMessagesScreen'

// 2. TIPO SCREEN - ATUALIZE A DEFINIÇÃO

// ANTES:
// type Screen = 'feed' | 'search' | 'mine' | 'direct' | 'profile' | 'settings'

// DEPOIS:
type Screen = 'feed' | 'search' | 'mine' | 'direct' | 'chat' | 'profile' | 'settings'

// 3. NAVEGAÇÃO - ADICIONE AO navItems

const navItems: Array<{ id: Screen; label: string; icon: typeof Home }> = [
  { id: 'feed', label: 'Início (Feed)', icon: Home },
  { id: 'search', label: 'Buscar/Pesquisar', icon: Search },
  { id: 'mine', label: 'Minhas Publicações', icon: Bookmark },
  { id: 'direct', label: 'Mensagens Diretas', icon: MessageCircle },
  { id: 'chat', label: 'Chat (DM)', icon: MessageCircle }, // ✅ NOVO
  { id: 'profile', label: 'Meu Perfil', icon: User },
  { id: 'settings', label: 'Configurações', icon: Settings },
]

// 4. RENDERIZAÇÃO - NO RETORNO JSX DA FUNÇÃO MAIN

function App() {
  // ... seu código existente ...

  let content: React.ReactNode = null

  if (authMode) {
    content = <AuthScreen {...authProps} />
  } else if (screen === 'feed') {
    content = <Feed posts={posts} onLike={handleLike} />
  } else if (screen === 'search') {
    content = <SearchScreen currentUserId={currentUser.id} />
  } else if (screen === 'mine') {
    content = <Mine posts={myPosts} onLike={handleLike} onEdit={handleEdit} onDelete={handleDelete} />
  } else if (screen === 'direct') {
    content = <Direct />
  } else if (screen === 'chat') {
    // ✅ NOVO - ADICIONE ISTO
    content = (
      <DirectMessagesScreen 
        currentUserId={currentUser.id} 
        allUsers={users}
      />
    )
  } else if (screen === 'profile') {
    content = <Profile user={currentUser} />
  } else if (screen === 'settings') {
    content = <SettingsScreen theme={theme} setTheme={setTheme} />
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <Header screen={screen} onMenu={() => setSidebarOpen(true)} onNewPost={() => setEditing(null)} />
      <Sidebar
        open={sidebarOpen}
        screen={screen}
        setScreen={setScreen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
        user={currentUser}
      />
      {content}
      {editing && <PostModal onClose={() => setEditing(null)} onSave={handleSave} editing={editing} />}
    </div>
  )
}

// ============================================
// CÓDIGO COMPLETO MÍNIMO PARA TESTE RÁPIDO
// ============================================

/**
 * Se você quiser testar apenas o chat sem integrar no App.tsx,
 * crie um arquivo separado: src/pages/ChatPage.tsx
 */

import { DirectMessagesScreen } from '../components/Chat/DirectMessagesScreen'

export function ChatPage() {
  // Simulando dados do usuário
  const currentUserId = '12345-67890-abc'
  const allUsers = [
    {
      id: 'user-1',
      username: 'alice',
      display_name: 'Alice Silva',
      avatar_url: 'https://...',
    },
    {
      id: 'user-2',
      username: 'bob',
      display_name: 'Bob Santos',
      avatar_url: 'https://...',
    },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <DirectMessagesScreen currentUserId={currentUserId} allUsers={allUsers} />
    </div>
  )
}

// ============================================
// TIPOS - PARA REFERÊNCIA
// ============================================

/**
 * Tipos disponíveis em chat-service.ts:
 * 
 * - Profile: { id, username, display_name, avatar_url, bio, is_online, last_seen_at, ... }
 * - Conversation: { id, user_1_id, user_2_id, created_at, updated_at, other_user? }
 * - Message: { id, conversation_id, sender_id, receiver_id, content, is_read, created_at }
 */

// ============================================
// FUNÇÕES DO chat-service.ts - REFERÊNCIA
// ============================================

/**
 * VALIDAÇÃO & AUTENTICAÇÃO
 */

// Valida se o usuário está autenticado
// await validateAuth() -> User (da auth.users)

// Valida se um destinatário existe
// await validateRecipient(recipientId: string) -> Profile

/**
 * CONVERSAS
 */

// Obtém ou cria uma conversa entre dois usuários
// await getOrCreateConversation(userId1: string, userId2: string) -> Conversation

// Obtém todas as conversas do usuário autenticado
// await getUserConversations() -> Conversation[]

/**
 * MENSAGENS
 */

// Envia uma mensagem
// await sendMessage(conversationId: string, receiverId: string, content: string) -> Message

// Obtém mensagens de uma conversa (com paginação)
// await getMessages(conversationId: string, limit?: number) -> Message[]

// Marca mensagens como lidas
// await markMessagesAsRead(conversationId: string) -> void

// Conta mensagens não lidas
// await getUnreadCount(conversationId: string) -> number

/**
 * REALTIME (WebSockets)
 */

// Subscribe a novas mensagens em uma conversa
// subscribeToMessages(conversationId: string, callback: (msg: Message) => void) -> unsubscribe()

// Subscribe a atualizações de perfil
// subscribeToProfileUpdates(userId: string, callback: (profile: Profile) => void) -> unsubscribe()

/**
 * PERFIL
 */

// Obtém perfil do usuário autenticado
// await getCurrentUserProfile() -> Profile

// Obtém perfil de outro usuário
// await getUserProfile(userId: string) -> Profile

// Atualiza status online
// await updateOnlineStatus(isOnline: boolean) -> void

// ============================================
// EXEMPLO: ENVIAR MENSAGEM MANUALMENTE
// ============================================

import * as ChatService from './lib/chat-service'

async function exemploEnviarMensagem() {
  try {
    // 1. Validar autenticação
    const user = await ChatService.validateAuth()
    console.log('Usuário autenticado:', user.id)

    // 2. Validar destinatário
    const recipient = await ChatService.validateRecipient('uuid-do-outro-usuario')
    console.log('Destinatário existe:', recipient.username)

    // 3. Obter ou criar conversa
    const conversation = await ChatService.getOrCreateConversation(
      user.id,
      recipient.id
    )
    console.log('Conversa:', conversation.id)

    // 4. Enviar mensagem
    const message = await ChatService.sendMessage(
      conversation.id,
      recipient.id,
      'Olá! Tudo bem?'
    )
    console.log('Mensagem enviada:', message.id)

    // 5. Marcar como lida
    await ChatService.markMessagesAsRead(conversation.id)

    // 6. Subscribe a novas mensagens
    const unsubscribe = ChatService.subscribeToMessages(
      conversation.id,
      (newMessage) => {
        console.log('Mensagem recebida:', newMessage.content)
      }
    )

    // Quando terminar:
    // unsubscribe()
  } catch (error) {
    console.error('Erro:', error)
  }
}

// ============================================
// CUSTOMIZAÇÕES OPCIONAIS
// ============================================

/**
 * 1. ESTILO PERSONALIZADO
 * 
 * Adicione ao seu CSS:
 * 
 * .chat-send-btn {
 *   background: #25D366 !important;
 * }
 * 
 * .message-bubble.sent .message-content {
 *   background: #25D366 !important;
 * }
 */

/**
 * 2. ÍCONES DIFERENTES
 * 
 * Em ConversationList.tsx, substitua MessageCircle por outro ícone:
 * 
 * import { MessageSquare } from 'lucide-react'
 * <MessageSquare size={20} /> // ao invés de MessageCircle
 */

/**
 * 3. NOTIFICAÇÕES
 * 
 * Adicione ao DirectMessagesScreen.tsx:
 * 
 * import { useEffect } from 'react'
 * 
 * useEffect(() => {
 *   const notification = new Notification('Nova mensagem!', {
 *     body: 'Você tem uma nova mensagem',
 *   })
 * }, [messages])
 */

export default {}

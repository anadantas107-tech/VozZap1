import { supabase as supabaseClient } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Type assertion para evitar null checks em todo o código
const supabase = supabaseClient as SupabaseClient

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Gera um UUID v4 válido para usuários locais
 */
function generateUUID(): string {
  const chars = '0123456789abcdef'
  let uuid = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-'
    } else if (i === 14) {
      uuid += '4'
    } else if (i === 19) {
      uuid += chars[(Math.random() * 4 | 8)]
    } else {
      uuid += chars[Math.random() * 16 | 0]
    }
  }
  return uuid
}

// ============================================
// TIPOS
// ============================================

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  is_online: boolean
  last_seen_at: string
}

export interface Conversation {
  id: string
  user_1_id: string
  user_2_id: string
  created_at: string
  updated_at: string
  other_user?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
  audio_url?: string
  audio_duration?: number
  read_at?: string | null
}

// ============================================
// VALIDAÇÃO
// ============================================

/**
 * Valida se o usuário está autenticado no Supabase
 * Não aceita fallback de localStorage
 */
export async function validateSupabaseAuth() {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }
  
  const { data: { user }, error } = await supabase!.auth.getUser()
  
  if (error || !user) {
    throw new Error('Usuário não autenticado no supabase!. Faça login para acessar o chat.')
  }
  
  return user
}

/**
 * Valida se o usuário está autenticado
 * Lança erro se não estiver logado
 */
export async function validateAuth() {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }
  
  const { data: { user }, error } = await supabase!.auth.getUser()
  
  if (error || !user) {
    throw new Error('Usuário não autenticado. Faça login para acessar o chat.')
  }
  
  return user
}

/**
 * Registra usuário no Supabase Auth e cria profile
 */
export async function registerInSupabase(email: string, password: string, userData: any) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  try {
    // 1. Registrar no Supabase Auth
    const { data, error: authError } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: userData.name,
          username: userData.username,
        }
      }
    })

    if (authError || !data?.user?.id) {
      const errorMsg = authError?.message || 'ID não gerado'
      throw new Error(`Erro ao registrar no Supabase: ${errorMsg}`)
    }

    // 2. Login automático
    if (data.user.id) {
      try {
        await supabase!.auth.signInWithPassword({ email, password })
      } catch (err: any) {
        console.warn('Login automático falhou:', err)
      }
      
      // 3. Criar profile
      try {
        await supabase!
          .from('profiles')
          .insert({
            id: data.user.id,
            username: userData.username,
            display_name: userData.name,
            is_online: true,
            last_seen_at: new Date().toISOString(),
          })
      } catch (err: any) {
        if (!err.message?.includes('duplicate')) {
          console.warn('Erro ao criar profile:', err)
        }
      }
    }

    return data.user
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('🔴 Erro no registro Supabase:', errorMsg)
    throw new Error(errorMsg)
  }
}

/**
 * Faz login no Supabase
 */
export async function loginInSupabase(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  const { data, error } = await supabase!.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw new Error(`Erro ao fazer login: ${error.message}`)
  }

  if (!data.user) {
    throw new Error('Falha ao fazer login: usuário não retornado')
  }

  // Atualizar status online em background (não bloqueia)
  supabase
    .from('profiles')
    .update({
      is_online: true,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', data.user.id)
    .then(
      () => {},
      (err: any) => console.warn('Erro ao atualizar status:', err)
    )

  return data.user
}

/**
 * Valida se um destinatário existe e é válido
 */
export async function validateRecipient(recipientId: string) {
  if (!recipientId) {
    throw new Error('ID do destinatário inválido')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', recipientId)
    .single()

  if (error || !data) {
    throw new Error('Usuário destinatário não existe')
  }

  return data
}

// ============================================
// CONVERSAS
// ============================================

/**
 * Obtém ou cria uma conversa entre dois usuários
 */
export async function getOrCreateConversation(userId1: string, userId2: string) {
  if (userId1 === userId2) {
    throw new Error('Não é possível criar conversa consigo mesmo')
  }

  // Ordenar IDs para garantir unicidade
  const [sortedUser1, sortedUser2] = [userId1, userId2].sort()

  // Verificar se conversa já existe
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_1_id', sortedUser1)
    .eq('user_2_id', sortedUser2)
    .single()

  if (existing) {
    return existing
  }

  // Criar nova conversa
  const { data: newConversation, error } = await supabase
    .from('conversations')
    .insert({
      user_1_id: sortedUser1,
      user_2_id: sortedUser2,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar conversa: ${error.message}`)
  }

  return newConversation
}

/**
 * Obtém todas as conversas do usuário autenticado com informações do outro usuário
 */
export async function getUserConversations() {
  const user = await validateAuth()

  // Buscar conversas do usuário com join nas profiles
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select(`
      *,
      profiles_1:user_1_id(id, username, display_name, avatar_url, bio, is_online, last_seen_at),
      profiles_2:user_2_id(id, username, display_name, avatar_url, bio, is_online, last_seen_at)
    `)
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })

  if (convError) {
    console.warn('Erro ao carregar conversas do Supabase:', convError)
    return []
  }

  if (!conversations || conversations.length === 0) {
    return []
  }

  // Mapear para adicionar other_user
  return conversations.map((conv: any) => ({
    ...conv,
    other_user: conv.user_1_id === user.id ? conv.profiles_2 : conv.profiles_1,
  })) as Conversation[]
}

// ============================================
// MENSAGENS
// ============================================

/**
 * Envia uma mensagem
 */
export async function sendMessage(
  conversationId: string,
  receiverId: string,
  content: string
) {
  const user = await validateAuth()

  if (!content.trim()) {
    throw new Error('Mensagem não pode estar vazia')
  }

  if (content.length > 10000) {
    throw new Error('Mensagem muito longa (máximo 10000 caracteres)')
  }

  // Validar destinatário
  await validateRecipient(receiverId)

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao enviar mensagem: ${error.message}`)
  }

  // Atualizar updated_at da conversa
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data as Message
}

/**
 * Obtém mensagens de uma conversa (paginadas)
 */
export async function getMessages(conversationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Erro ao carregar mensagens: ${error.message}`)
  }

  return (data as Message[]).reverse()
}

/**
 * Marca mensagens como lidas
 */
export async function markMessagesAsRead(conversationId: string) {
  const user = await validateAuth()

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', user.id)
    .eq('is_read', false)

  if (error) {
    throw new Error(`Erro ao marcar como lido: ${error.message}`)
  }
}

/**
 * Conta mensagens não lidas de uma conversa
 */
export async function getUnreadCount(conversationId: string) {
  const user = await validateAuth()

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', user.id)
    .eq('is_read', false)

  if (error) {
    throw new Error(`Erro ao contar não lidas: ${error.message}`)
  }

  return count || 0
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe a novas mensagens em uma conversa
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        onNewMessage(payload.new as Message)
      }
    )
    .subscribe()

  return () => {
    supabase!.removeChannel(channel)
  }
}

/**
 * Subscribe a atualizações de status online dos usuários
 */
export function subscribeToProfileUpdates(
  userId: string,
  onProfileUpdate: (profile: Profile) => void
) {
  const channel = supabase
    .channel(`profile:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload: any) => {
        onProfileUpdate(payload.new as Profile)
      }
    )
    .subscribe()

  return () => {
    supabase!.removeChannel(channel)
  }
}

// ============================================
// PERFIL
// ============================================

/**
 * Obtém perfil do usuário autenticado
 */
// Cache para evitar múltiplas queries do mesmo perfil
const profileCache = new Map<string, { profile: Profile; timestamp: number }>()
const PROFILE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export async function getCurrentUserProfile() {
  const user = await validateAuth()
  
  // Verificar cache
  const cached = profileCache.get(user.id)
  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
    return cached.profile
  }
  
  // Se é usuário local, criar profile local (rápido)
  if (!user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    try {
      const usersData = localStorage.getItem('vozzap-users')
      const currentEmail = localStorage.getItem('vozzap-current-user')
      
      if (usersData && currentEmail) {
        const users = new Map(JSON.parse(usersData))
        const userData = users.get(currentEmail) as any
        
        if (userData?.user) {
          const profile: Profile = {
            id: userData.user.id,
            username: userData.user.username,
            display_name: userData.user.name,
            avatar_url: userData.user.photoUrl || '',
            bio: userData.user.bio || '',
            is_online: true,
            last_seen_at: new Date().toISOString(),
          }
          profileCache.set(user.id, { profile, timestamp: Date.now() })
          return profile
        }
      }
    } catch (err) {
      console.error('Erro ao carregar profile local:', err)
    }
  }

  // Buscar do Supabase
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    // Fallback: retornar profile mínimo
    const fallbackProfile: Profile = {
      id: user.id,
      username: user.email?.split('@')[0] || 'user',
      display_name: user.user_metadata?.display_name || user.email || 'User',
      avatar_url: user.user_metadata?.avatar_url || '',
      bio: '',
      is_online: true,
      last_seen_at: new Date().toISOString(),
    }
    profileCache.set(user.id, { profile: fallbackProfile, timestamp: Date.now() })
    return fallbackProfile
  }

  profileCache.set(user.id, { profile: data as Profile, timestamp: Date.now() })
  return data as Profile
}

/**
 * Obtém perfil de outro usuário
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Erro ao carregar perfil: ${error.message}`)
  }

  return data as Profile
}

/**
 * Atualiza status online do usuário
 */
export async function updateOnlineStatus(isOnline: boolean) {
  const user = await validateAuth()

  const { error } = await supabase
    .from('profiles')
    .update({
      is_online: isOnline,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    throw new Error(`Erro ao atualizar status: ${error.message}`)
  }
}

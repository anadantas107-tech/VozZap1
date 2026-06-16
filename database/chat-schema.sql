-- ===========================================================
-- SCRIPT SQL COMPLETO PARA SISTEMA DE CHAT - VOZZAP (CORRIGIDO)
-- ===========================================================
-- Copie e execute este script no SQL Editor do Supabase
-- ===========================================================

-- ============================================
-- 1. CRIAR TABELAS
-- ============================================

-- Tabela de Conversas
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Força que user_1_id < user_2_id para manter ordem consistente
  CHECK (user_1_id < user_2_id),
  -- Garante que há apenas uma conversa entre dois usuários
  UNIQUE(user_1_id, user_2_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user_2_id);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);

-- ============================================
-- 2. ATIVAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. POLÍTICAS DE SEGURANÇA - CONVERSATIONS
-- ============================================

-- Usuários só veem conversas onde são participantes
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- Usuários autenticados podem criar conversas
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    (auth.uid() = user_1_id OR auth.uid() = user_2_id)
    AND user_1_id != user_2_id
  );

-- Usuários podem atualizar conversas suas
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id)
  WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- ============================================
-- 4. POLÍTICAS DE SEGURANÇA - MESSAGES
-- ============================================

-- Usuários só veem mensagens das suas conversas
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Apenas o sender pode inserir mensagens
CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Qualquer participante pode atualizar (marcar como lida)
CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================
-- 5. POLÍTICAS DE SEGURANÇA - PROFILES
-- ============================================

-- Todos podem ver perfis (público)
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Usuários só podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- CORREÇÃO: Permitir inserção via trigger (auth.uid() pode ser NULL ou diferente do id)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 6. TRIGGER PARA CRIAR PERFIL NA AUTENTICAÇÃO
-- ============================================

-- Função para criar perfil ao novo usuário registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, is_online)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que dispara quando um novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. VALIDAÇÃO DE DADOS
-- ============================================

-- Função para validar mensagem antes de inserir
CREATE OR REPLACE FUNCTION public.validate_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se sender e receiver são diferentes
  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Não é possível enviar mensagem para si mesmo';
  END IF;

  -- Verificar se conteúdo não está vazio
  IF NEW.content IS NULL OR NEW.content = '' THEN
    RAISE EXCEPTION 'Conteúdo da mensagem não pode estar vazio';
  END IF;

  -- Verificar se sender existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.sender_id) THEN
    RAISE EXCEPTION 'Usuário remetente não existe';
  END IF;

  -- Verificar se receiver existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.receiver_id) THEN
    RAISE EXCEPTION 'Usuário destinatário não existe';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validação de mensagem
DROP TRIGGER IF EXISTS validate_message_trigger ON messages;
CREATE TRIGGER validate_message_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_message();

-- ============================================
-- 8. FUNÇÕES ÚTEIS
-- ============================================

-- Função para obter ou criar conversa (CORRIGIDA)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  sorted_user1 UUID;
  sorted_user2 UUID;
BEGIN
  -- Impedir conversa com o mesmo usuário
  IF user1_id = user2_id THEN
    RAISE EXCEPTION 'Não é possível criar conversa com o mesmo usuário';
  END IF;

  -- Ordenar IDs
  IF user1_id < user2_id THEN
    sorted_user1 := user1_id;
    sorted_user2 := user2_id;
  ELSE
    sorted_user1 := user2_id;
    sorted_user2 := user1_id;
  END IF;

  -- Verificar se existe
  SELECT id INTO conv_id
  FROM conversations
  WHERE user_1_id = sorted_user1 AND user_2_id = sorted_user2;

  -- Se não existe, criar
  IF conv_id IS NULL THEN
    INSERT INTO conversations (user_1_id, user_2_id)
    VALUES (sorted_user1, sorted_user2)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql;

-- Função para contar mensagens não lidas
CREATE OR REPLACE FUNCTION public.get_unread_count(user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT m.conversation_id, COUNT(*) as unread_count
  FROM messages m
  WHERE m.receiver_id = user_id AND m.is_read = FALSE
  GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICAÇÕES FINAIS
-- ============================================

-- Verifique se as tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('conversations', 'messages', 'profiles');

-- Verifique as políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
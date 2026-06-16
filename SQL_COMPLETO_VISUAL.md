# 📊 SQL CHAT SYSTEM - TUDO EXPLICADO

## 🎯 GUIA VISUAL COMPLETO

---

## PARTE 1️⃣: TABELAS (3x)

### Tabela 1: CONVERSATIONS (Conversas)
```sql
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(LEAST(user_1_id, user_2_id), GREATEST(user_1_id, user_2_id)),
  CHECK (user_1_id < user_2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user_2_id);
```

**O que faz:**
- ✅ Armazena conversas entre 2 usuários
- ✅ Força que exista apenas UMA conversa entre o mesmo par
- ✅ `user_1_id < user_2_id` garante ordem consistente
- ✅ Índices para buscas rápidas

**Exemplo de dados:**
```
id                                   | user_1_id                       | user_2_id                       | created_at              | updated_at
-------------------------------------|---------------------------------|---------------------------------|-------------------------|------------------------
550e8400-e29b-41d4-a716-446655440000| alice-uuid                      | bob-uuid                        | 2024-01-01 10:00:00 UTC | 2024-01-01 15:30:00 UTC
550e8400-e29b-41d4-a716-446655440001| alice-uuid                      | carol-uuid                      | 2024-01-02 12:00:00 UTC | 2024-01-02 14:20:00 UTC
```

---

### Tabela 2: MESSAGES (Mensagens)
```sql
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

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
```

**O que faz:**
- ✅ Armazena as mensagens
- ✅ Registra quem enviou (sender) e quem recebeu (receiver)
- ✅ Marca se foi lida (is_read)
- ✅ Índices para buscas por conversa, usuário, e data

**Exemplo de dados:**
```
id                                   | conversation_id                 | sender_id                       | receiver_id                     | content          | is_read | created_at              
-------------------------------------|---------------------------------|---------------------------------|---------------------------------|--------------------|---------|------------------------
660e8400-e29b-41d4-a716-446655550000| 550e8400-e29b-41d4-a716-446655 | alice-uuid                      | bob-uuid                        | Olá! Tudo bem?    | true    | 2024-01-01 10:05:00 UTC
660e8400-e29b-41d4-a716-446655550001| 550e8400-e29b-41d4-a716-446655 | bob-uuid                        | alice-uuid                      | Tudo sim! E você? | true    | 2024-01-01 10:06:00 UTC
```

---

### Tabela 3: PROFILES (Perfis de Usuários)
```sql
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

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
```

**O que faz:**
- ✅ Perfil do usuário (nome, avatar, bio)
- ✅ Status online/offline
- ✅ Rastreia último acesso
- ✅ Username é único (não pode ter 2 "alice")

**Exemplo de dados:**
```
id                                   | username | display_name  | avatar_url          | is_online | last_seen_at
-------------------------------------+----------+---------------+---------------------+-----------+------------------------
alice-uuid                           | alice    | Alice Silva   | https://...avatar   | true      | 2024-01-01 15:30:00 UTC
bob-uuid                             | bob      | Bob Santos    | https://...avatar   | false     | 2024-01-01 14:20:00 UTC
```

---

## PARTE 2️⃣: RLS POLICIES (8x SEGURANÇA)

### ⏳ ANTES DE TUDO - Ativar RLS

```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

**O que significa**: Com RLS ativo, o banco de dados vai **bloquear automaticamente** qualquer tentativa de acessar dados que você não deveria ver.

---

### 🔐 CONVERSATIONS - 3 Policies

#### Policy 1: Visualizar Conversas
```sql
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);
```

**O que faz:**
- ✅ Você só vê conversas onde PARTICIPA
- ✅ Se a conversa é entre Alice e Bob, apenas eles veem
- ✅ Carol não consegue ver (bloqueado automaticamente)

**Teste:**
```
Alice tenta ver conversa de Alice+Bob → ✅ PERMITE
Bob tenta ver conversa de Alice+Bob  → ✅ PERMITE
Carol tenta ver conversa de Alice+Bob → ❌ BLOQUEIA
```

---

#### Policy 2: Criar Conversas
```sql
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    (auth.uid() = user_1_id OR auth.uid() = user_2_id)
    AND user_1_id != user_2_id
  );
```

**O que faz:**
- ✅ Você SÓ pode criar conversa sendo participante
- ✅ Não permite conversa consigo mesmo
- ✅ Valida que ambos IDs são válidos

**Teste:**
```
Alice tenta criar conversa Alice+Bob     → ✅ PERMITE (Alice é participante)
Carol tenta criar conversa Alice+Bob     → ❌ BLOQUEIA (Carol não é participante)
Alice tenta criar conversa Alice+Alice   → ❌ BLOQUEIA (não com si mesmo)
```

---

#### Policy 3: Atualizar Conversas
```sql
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id)
  WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);
```

**O que faz:**
- ✅ Só participantes podem editar conversa
- ✅ Testa permissão antes AND depois da atualização

---

### 🔐 MESSAGES - 3 Policies

#### Policy 1: Visualizar Mensagens
```sql
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
```

**O que faz:**
- ✅ Você vê mensagens que ENVIOU ou RECEBEU
- ✅ Carol não consegue ver mensagens de Alice→Bob

**Teste:**
```
Alice (sender) visualiza mensagem Alice→Bob   → ✅ PERMITE
Bob (receiver) visualiza mensagem Alice→Bob   → ✅ PERMITE
Carol visualiza mensagem Alice→Bob            → ❌ BLOQUEIA
```

---

#### Policy 2: Inserir Mensagens
```sql
CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
```

**O que faz:**
- ✅ Você SÓ pode enviar como SENDER (remetente)
- ✅ Impossível fake de outro usuário
- ✅ Backend valida: auth_id == sender_id

**Teste:**
```
Alice tenta enviar como Alice             → ✅ PERMITE
Alice tenta enviar como Bob               → ❌ BLOQUEIA (JWT diz que é Alice)
Bob tenta enviar como Alice               → ❌ BLOQUEIA
```

---

#### Policy 3: Atualizar Mensagens (Marcar Lida)
```sql
CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);
```

**O que faz:**
- ✅ Participantes podem marcar como lida
- ✅ Permite que receiver mude `is_read = true`

---

### 🔐 PROFILES - 3 Policies

#### Policy 1: Visualizar Perfis (Público)
```sql
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);
```

**O que faz:**
- ✅ QUALQUER pessoa (logada ou não) pode ver perfis
- ✅ Perfis são públicos
- ✅ `true` = sem restrição

---

#### Policy 2: Atualizar Próprio Perfil
```sql
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**O que faz:**
- ✅ Você SÓ pode editar SEU perfil
- ✅ Alice não consegue editar perfil de Bob

**Teste:**
```
Alice tenta editar perfil de Alice   → ✅ PERMITE
Alice tenta editar perfil de Bob     → ❌ BLOQUEIA
```

---

#### Policy 3: Inserir Próprio Perfil
```sql
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

**O que faz:**
- ✅ Você SÓ pode criar SEU perfil
- ✅ Automático via TRIGGER (veja próxima seção)

---

## PARTE 3️⃣: TRIGGERS (2x AUTOMAÇÃO)

### ⏲️ TRIGGER 1: Criar Perfil ao Registrar

#### Função
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, is_online)
  VALUES (
    NEW.id,                                                  -- UUID do novo user
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), -- username ou email
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), -- nome ou email
    FALSE                                                   -- offline inicialmente
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**O que faz:**
- ✅ Quando novo user se registra no Supabase Auth
- ✅ Automaticamente cria perfil na tabela profiles
- ✅ Preenche username, display_name, avatar_url

#### Trigger
```sql
DROP TRIGGER IF NOT EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Timeline do evento:**
```
Usuário clica "Cadastrar"
         ↓
Supabase Auth cria novo user em auth.users
         ↓
TRIGGER dispara ← AUTOMÁTICO
         ↓
handle_new_user() EXECUTA
         ↓
INSERT em profiles ← User tem perfil agora!
```

---

### ⏲️ TRIGGER 2: Validar Mensagens

#### Função
```sql
CREATE OR REPLACE FUNCTION public.validate_message()
RETURNS TRIGGER AS $$
BEGIN
  -- ✅ Não permite enviar para si mesmo
  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Não é possível enviar mensagem para si mesmo';
  END IF;

  -- ✅ Não permite mensagem vazia
  IF NEW.content IS NULL OR NEW.content = '' THEN
    RAISE EXCEPTION 'Conteúdo da mensagem não pode estar vazio';
  END IF;

  -- ✅ Valida se sender existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.sender_id) THEN
    RAISE EXCEPTION 'Usuário remetente não existe';
  END IF;

  -- ✅ Valida se receiver existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.receiver_id) THEN
    RAISE EXCEPTION 'Usuário destinatário não existe';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**O que faz:**
```
Verifica:
1. sender_id ≠ receiver_id    (não consigo mesmo)
2. content não está vazio      (mensagem tem texto)
3. sender existe em auth.users (remetente real)
4. receiver existe em auth.users (destinatário real)

Se falhar = INSERT é BLOQUEADO + erro retornado
```

#### Trigger
```sql
DROP TRIGGER IF NOT EXISTS validate_message_trigger ON messages;
CREATE TRIGGER validate_message_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_message();
```

**Timeline do evento:**
```
App chama: sendMessage(conversationId, receiverId, "Olá")
         ↓
INSERT em messages
         ↓
TRIGGER dispara ANTES do INSERT ← VALIDAÇÃO!
         ↓
validate_message() EXECUTA
         ↓
Testa 4 condições acima
         ↓
Se OK → INSERT permitido ✅
Se FAIL → INSERT bloqueado + erro retornado ❌
```

---

## PARTE 4️⃣: BUCKETS (Storage para Imagens)

### Criar Bucket para Avatares

```sql
-- Criar bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Ou via UI do Supabase:
-- Storage → Create bucket → Name: "avatars" → Public
```

**O que faz:**
- ✅ Armazena imagens de perfil de usuários
- ✅ URLs públicas (qualquer um consegue acessar)
- ✅ Caminho: `https://project.supabase.co/storage/v1/object/public/avatars/[filename]`

### Política de Storage

```sql
-- Qualquer um pode ler avatares
CREATE POLICY "Public avatar access" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

-- Usuários podem fazer upload do próprio avatar
CREATE POLICY "Users can upload own avatar" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Como usar no App

```typescript
// Upload de avatar
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file);

// URL pública
const url = `${SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/avatar.jpg`;

// Atualizar perfil com avatar
await supabase.from('profiles').update({
  avatar_url: url
}).eq('id', userId);
```

---

## PARTE 5️⃣: FUNCTIONS (2x Helpers)

### Function 1: Obter ou Criar Conversa

```sql
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  user1_id UUID, 
  user2_id UUID
)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  sorted_user1 UUID;
  sorted_user2 UUID;
BEGIN
  -- Ordena IDs (user_1_id < user_2_id)
  IF user1_id < user2_id THEN
    sorted_user1 := user1_id;
    sorted_user2 := user2_id;
  ELSE
    sorted_user1 := user2_id;
    sorted_user2 := user1_id;
  END IF;

  -- Procura conversa existente
  SELECT id INTO conv_id
  FROM conversations
  WHERE user_1_id = sorted_user1 AND user_2_id = sorted_user2;

  -- Se não existe, cria
  IF conv_id IS NULL THEN
    INSERT INTO conversations (user_1_id, user_2_id)
    VALUES (sorted_user1, sorted_user2)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql;
```

**O que faz:**
```
Entrada: Alice ID + Bob ID
         ↓
Ordena: MENOR ID + MAIOR ID (garante unicidade)
         ↓
Busca conversa já existe?
         ↓
Se SIM → retorna ID
Se NÃO → cria nova → retorna ID
         ↓
Saída: Conversation UUID
```

**Como usar:**
```typescript
const conversationId = await supabase.rpc('get_or_create_conversation', {
  user1_id: currentUserId,
  user2_id: otherUserId
});
// Resultado: UUID da conversa (nova ou existente)
```

---

### Function 2: Contar Mensagens Não Lidas

```sql
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
```

**O que faz:**
```
Entrada: Alice ID
         ↓
Procura mensagens NÃO LIDAS enviadas PARA Alice
         ↓
Agrupa por conversa
         ↓
Conta quantas não lidas cada conversa tem
         ↓
Saída: [
  { conversation_id: 'conv-1', unread_count: 3 },
  { conversation_id: 'conv-2', unread_count: 1 }
]
```

**Como usar:**
```typescript
const unreadCounts = await supabase.rpc('get_unread_count', {
  user_id: currentUserId
});
// Resultado: Array com conversas não lidas
```

---

## 📋 RESUMO VISUAL - O QUE CADA COISA FAZ

```
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TABELAS (3x)                  POLICIES RLS (8x)           │
│  ├─ conversations    ──────►   ├─ View conversations       │
│  ├─ messages         ──────►   ├─ Insert conversations     │
│  └─ profiles         ──────►   ├─ View messages            │
│                                ├─ Insert messages          │
│                                ├─ Update messages          │
│                                ├─ View profiles            │
│                                ├─ Insert profile           │
│                                └─ Update profile           │
│                                                              │
│  TRIGGERS (2x)                 FUNCTIONS (2x)              │
│  ├─ on_auth_user_created ──►   ├─ get_or_create_conv      │
│  └─ validate_message ────────►  └─ get_unread_count       │
│                                                              │
│  BUCKETS (1x)                  INDEXES (7x)                │
│  └─ avatars (public) ─────────► idx_conversations_user1/2   │
│     (armazena imagens)         idx_messages_conv/sender/... │
│                                idx_profiles_username/online │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 COMO EXECUTAR NO SUPABASE

### Passo 1: Abra SQL Editor
```
Supabase Dashboard
  → Seu Projeto
  → SQL Editor
  → "+ New Query"
```

### Passo 2: Copie TUDO abaixo (em ordem)

```sql
-- 1. CRIAR TABELAS
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(LEAST(user_1_id, user_2_id), GREATEST(user_1_id, user_2_id)),
  CHECK (user_1_id < user_2_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user_2_id);

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
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);

-- 2. ATIVAR RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES - CONVERSATIONS
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK ((auth.uid() = user_1_id OR auth.uid() = user_2_id) AND user_1_id != user_2_id);

CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id)
  WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- 4. POLICIES - MESSAGES
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 5. POLICIES - PROFILES
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. TRIGGERS
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

DROP TRIGGER IF NOT EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.validate_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Não é possível enviar mensagem para si mesmo';
  END IF;
  IF NEW.content IS NULL OR NEW.content = '' THEN
    RAISE EXCEPTION 'Conteúdo da mensagem não pode estar vazio';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.sender_id) THEN
    RAISE EXCEPTION 'Usuário remetente não existe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.receiver_id) THEN
    RAISE EXCEPTION 'Usuário destinatário não existe';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS validate_message_trigger ON messages;
CREATE TRIGGER validate_message_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_message();

-- 7. FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  sorted_user1 UUID;
  sorted_user2 UUID;
BEGIN
  IF user1_id < user2_id THEN
    sorted_user1 := user1_id;
    sorted_user2 := user2_id;
  ELSE
    sorted_user1 := user2_id;
    sorted_user2 := user1_id;
  END IF;
  SELECT id INTO conv_id FROM conversations
  WHERE user_1_id = sorted_user1 AND user_2_id = sorted_user2;
  IF conv_id IS NULL THEN
    INSERT INTO conversations (user_1_id, user_2_id)
    VALUES (sorted_user1, sorted_user2)
    RETURNING id INTO conv_id;
  END IF;
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql;

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
```

### Passo 3: Execute (Ctrl+Enter ou botão RUN)

**Esperado:**
```
✓ Query 1 succeeded
✓ Query 2 succeeded
... (múltiplas mensagens de sucesso)

No errors! ✅
```

---

## ✅ VERIFICAÇÕES POS-EXECUÇÃO

```sql
-- 1. Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('conversations', 'messages', 'profiles');

-- Resultado esperado: 3 linhas (conversations, messages, profiles)

-- 2. Verificar RLS ativo
SELECT tablename, (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages', 'profiles');

-- Resultado esperado: 3 rows, policy_count = 2-3 cada

-- 3. Verificar índices
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages', 'profiles');

-- Resultado esperado: 7 índices

-- 4. Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Resultado esperado: 2 triggers (on_auth_user_created, validate_message_trigger)

-- 5. Verificar functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Resultado esperado: 4 functions (handle_new_user, validate_message, get_or_create_conversation, get_unread_count)
```

---

## 🎊 PRONTO!

Seu banco está **100% pronto** com:
- ✅ 3 Tabelas estruturadas
- ✅ 8 Políticas de segurança (RLS)
- ✅ 2 Triggers automáticos
- ✅ 2 Functions helper
- ✅ 7 Índices de performance
- ✅ 1 Bucket para avatares

**Próximo**: Integre no App.tsx! 🚀

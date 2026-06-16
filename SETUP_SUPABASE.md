# Setup do Supabase - Passo a Passo

## ❌ Problema Atual
- Usuários estão sendo salvos em **fallback local** 
- Supabase está retornando `email rate limit exceeded`
- Profile dos usuários **não está sendo criado** no banco

## ✅ Solução: 3 Passos

### 1️⃣ Executar o SQL Schema no Supabase

Acesse: **Supabase Dashboard** → **SQL Editor** → **New Query**

Copie e cole TODO este SQL:

```sql
-- Tabela de Conversas
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_1_id, user_2_id),
  CHECK (user_1_id < user_2_id)
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_1 ON conversations(user_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_2 ON conversations(user_2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Ativar RLS (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança

-- Conversations: SELECT
DROP POLICY IF EXISTS "select_conversations" ON conversations;
CREATE POLICY "select_conversations" ON conversations FOR SELECT
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- Conversations: INSERT
DROP POLICY IF EXISTS "insert_conversations" ON conversations;
CREATE POLICY "insert_conversations" ON conversations FOR INSERT
  WITH CHECK ((auth.uid() = user_1_id OR auth.uid() = user_2_id) AND user_1_id != user_2_id);

-- Conversations: UPDATE
DROP POLICY IF EXISTS "update_conversations" ON conversations;
CREATE POLICY "update_conversations" ON conversations FOR UPDATE
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- Messages: SELECT
DROP POLICY IF EXISTS "select_messages" ON messages;
CREATE POLICY "select_messages" ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Messages: INSERT
DROP POLICY IF EXISTS "insert_messages" ON messages;
CREATE POLICY "insert_messages" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Messages: UPDATE
DROP POLICY IF EXISTS "update_messages" ON messages;
CREATE POLICY "update_messages" ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Profiles: SELECT (público)
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  USING (true);

-- Profiles: UPDATE (só o próprio usuário)
DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Função que cria profile automaticamente
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    'user_' || SUBSTR(new.id::text, 1, 8),
    COALESCE(new.raw_user_meta_data->>'display_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$;

-- Trigger que executa a função
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Clique em "Run"** ▶️

---

### 2️⃣ Criar Buckets no Supabase (Storage)

Vá para: **Supabase Dashboard** → **Storage** → **New Bucket**

Crie 2 buckets:

#### Bucket 1: `avatars`
- Nome: `avatars`
- Acesso: **Public** ✅
- Clique em "Create Bucket"

#### Bucket 2: `message-files`
- Nome: `message-files`
- Acesso: **Private** 🔒
- Clique em "Create Bucket"

---

### 3️⃣ Atualizar `.env` no Projeto

Crie/atualize o arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**Onde pegar?**
- Vá para: Supabase Dashboard → **Settings** → **API** 
- Copie:
  - **Project URL** → `VITE_SUPABASE_URL`
  - **Anon Key** → `VITE_SUPABASE_ANON_KEY`

---

### 4️⃣ Aguardar Rate Limit Reset

**Tempo de espera necessário:**
- Supabase: ~1 hora por IP
- Alternativa: Usar VPN ou aguardar

**Verificação:**
1. Abra a app em browser: `http://localhost:5173`
2. Clique em "Criar conta"
3. Preencha: Email, Senha, Nome
4. Clique em "Registrar"

**Esperado:**
- ✅ Usuário criado em `auth.users` (Supabase)
- ✅ Profile criado em `profiles` table (trigger automático)
- ✅ Sem erro "email rate limit exceeded"

---

## 🔍 Verificação no Supabase

Para confirmar que funcionou:

1. **Verificar Profiles**: 
   - Supabase Dashboard → **SQL Editor**
   - Execute: `SELECT * FROM profiles;`
   - Deve listar novo usuário

2. **Verificar Auth**:
   - Supabase Dashboard → **Authentication** → **Users**
   - Deve listar novo usuário

---

## ⚠️ Troubleshooting

Se ainda tiver problema:

| Erro | Solução |
|------|---------|
| "email rate limit exceeded" | Aguarde 1h e tente novamente (ou use VPN) |
| "Profile não criado" | Verifique se o trigger foi executado: `SELECT * FROM profiles;` |
| "Supabase não configurado" | Verifique `.env` e reinicie o dev server: `npm run dev` |
| "CORS error" | Adicione URL da app em Supabase → Settings → API → CORS |

---

## ✨ Pronto!

Depois que executar isto, a app vai:
1. ✅ Registrar usuários no Supabase auth
2. ✅ Criar profiles automaticamente
3. ✅ Permitir chat em tempo real
4. ✅ Sincronizar com banco de dados

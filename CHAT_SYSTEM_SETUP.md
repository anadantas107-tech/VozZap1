# 📱 Sistema de Chat/DM em Tempo Real - VozZap

## ✨ Visão Geral

Sistema completo de Direct Messages com:
- ✅ Comunicação 100% humana em tempo real
- ✅ WebSockets via Supabase Realtime
- ✅ Autenticação JWT obrigatória
- ✅ Validação rigorosa de destinatários
- ✅ Criptografia de dados no Supabase
- ✅ Interface limpa e responsiva em React

---

## 📋 Arquivos Criados

```
src/
├── components/Chat/
│   ├── ChatWindow.tsx          ✅ Janela de chat (mensagens + input)
│   ├── ConversationList.tsx    ✅ Lista de conversas
│   └── DirectMessagesScreen.tsx ✅ Tela principal de DM
├── lib/
│   ├── chat-service.ts         ✅ Serviço de comunicação com DB
│   └── supabase.ts             (já existe)
└── styles.css                   ✅ Estilos (já adicionado)

database/
└── chat-schema.sql             ✅ Schema completo + RLS + Triggers
```

---

## 🚀 SETUP PASSO-A-PASSO

### PASSO 1: Executar Script SQL no Supabase

1. Abra [Supabase Dashboard](https://app.supabase.com)
2. Vá para seu projeto VozZap
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**
5. **Copie todo o conteúdo** do arquivo `database/chat-schema.sql`
6. **Cole** na janela de query
7. Clique em **RUN** (ou `Ctrl+Enter`)

**Esperado**: Nenhum erro. Você verá as tabelas criadas ao final.

---

### PASSO 2: Verificar Tabelas e RLS

No SQL Editor, execute:

```sql
-- Listar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('conversations', 'messages', 'profiles');

-- Listar políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Esperado**: 
- 3 tabelas: `conversations`, `messages`, `profiles`
- 8 políticas RLS (2-3 por tabela)

---

### PASSO 3: Estrutura do Projeto

Os arquivos já estão criados em:
- `src/lib/chat-service.ts` - Serviço de chat
- `src/components/Chat/ChatWindow.tsx` - Componente de janela
- `src/components/Chat/ConversationList.tsx` - Lista de conversas
- `src/components/Chat/DirectMessagesScreen.tsx` - Tela principal
- `src/styles.css` - Estilos (já inclusos)

---

### PASSO 4: Integrar ao App.tsx

Abra `src/App.tsx` e **adicione** a tela de chat ao `type Screen`:

```typescript
// ANTES:
type Screen = 'feed' | 'search' | 'mine' | 'direct' | 'profile' | 'settings'

// DEPOIS:
type Screen = 'feed' | 'search' | 'mine' | 'direct' | 'chat' | 'profile' | 'settings'
```

Adicione o item no `navItems`:

```typescript
const navItems: Array<{ id: Screen; label: string; icon: typeof Home }> = [
  { id: 'feed', label: 'Início (Feed)', icon: Home },
  { id: 'search', label: 'Buscar/Pesquisar', icon: Search },
  { id: 'mine', label: 'Minhas Publicações', icon: Bookmark },
  { id: 'direct', label: 'Mensagens Diretas', icon: MessageCircle },
  { id: 'chat', label: 'Chat', icon: MessageCircle }, // ✅ NOVO
  { id: 'profile', label: 'Meu Perfil', icon: User },
  { id: 'settings', label: 'Configurações', icon: Settings },
]
```

Importe o componente no topo:

```typescript
import { DirectMessagesScreen } from './components/Chat/DirectMessagesScreen'
```

Na função principal, adicione um `else if` para renderizar a tela:

```typescript
} else if (screen === 'chat') {
  content = (
    <DirectMessagesScreen 
      currentUserId={currentUser.id} 
      allUsers={users}
    />
  )
}
```

---

### PASSO 5: Atualizar Perfis de Usuários

Para que o chat funcione 100%, os usuários precisam ter perfis na tabela `profiles`.

Se você já tem usuários cadastrados, execute no SQL Editor:

```sql
-- Cria perfis para usuários existentes que não têm
INSERT INTO profiles (id, username, display_name, is_online)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', email),
  FALSE
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
```

---

## 🧪 TESTES COMPLETOS

### Teste 1: Login com dois usuários

1. Abra seu app em `http://localhost:5173/`
2. **Abra 2 abas do navegador** (ou 2 navegadores)
3. Na aba 1: Faça login com **Usuário A**
4. Na aba 2: Faça login com **Usuário B**

### Teste 2: Iniciar conversa

1. Em **ambas as abas**, clique na aba "Chat" (no menu lateral)
2. Na aba 1 (Usuário A):
   - Clique em "➕ Nova" (botão verde no header)
   - Selecione "Usuário B"
   - Clique "Iniciar conversa"
3. Você deve ver a conversa iniciada

### Teste 3: Enviar mensagem em tempo real

1. Na aba 1 (Usuário A):
   - Digite: "Olá! Tudo bem?"
   - Pressione **Enter** ou clique no botão de envio
2. **Imediatamente na aba 2** (Usuário B):
   - A mensagem deve aparecer **sem recarregar**
3. Digite uma resposta em **Usuário B**
4. Veja aparecer em tempo real em **Usuário A**

### Teste 4: Marcar como lida

1. Na aba 2 (Usuário B):
   - As mensagens de A devem ficar marcadas com **✓✓**
2. Todas as mensagens devem ficar **cinzentas** (lidas)

### Teste 5: Lista de conversas

1. Ambos os usuários devem ver a conversa na **lista lateral**
2. O último horário de mensagem deve atualizar
3. Nome do outro usuário deve aparecer

### Teste 6: Segurança - Sem Login

1. Abra uma aba **anônima** (Ctrl+Shift+N no Chrome)
2. Acesse `http://localhost:5173/`
3. **Sem fazer login**, clique em "Chat"
4. **Esperado**: Erro ou tela vazia

---

## 🔒 Segurança - Verificações

### ✅ RLS (Row Level Security)

Cada usuário **SÓ VÊ**:
- Conversas onde participa
- Mensagens das suas conversas
- Perfis públicos (leitura)

**Testado automaticamente** - banco nega acesso a dados de outros usuários

### ✅ Autenticação JWT

- Token JWT obrigatório em toda requisição ao Supabase
- Token expirado = acesso negado automaticamente

### ✅ Validação de Destinatário

Função no backend valida:
- Sender existe no banco
- Receiver existe no banco
- Não é possível enviar para si mesmo

---

## 📊 Arquitetura da Solução

```
┌─────────────────────────────────────────┐
│         FRONTEND (React)                 │
├─────────────────────────────────────────┤
│ DirectMessagesScreen                    │
│  ├─ ConversationList (lista)            │
│  └─ ChatWindow (mensagens)              │
│      ├─ MessageBubbles                  │
│      └─ ChatInput                       │
├─────────────────────────────────────────┤
│ chat-service.ts (Supabase client)       │
│  ├─ sendMessage()                       │
│  ├─ getMessages()                       │
│  ├─ subscribeToMessages()               │
│  └─ validateAuth()                      │
├─────────────────────────────────────────┤
│    SUPABASE REALTIME (WebSockets)       │
├─────────────────────────────────────────┤
│    POSTGRESQL DATABASE                  │
│  ├─ conversations (com UNIQUE)          │
│  ├─ messages (com validação)            │
│  └─ profiles (com RLS)                  │
└─────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Mensagem não aparece em tempo real

**Causa**: WebSocket não conectado
**Solução**: 
1. Verifique se Realtime está ativado no Supabase
2. Recarregue a página
3. Verifique console do navegador (F12)

### Erro "Usuário não autenticado"

**Causa**: Usuário faz logout ou sessão expirou
**Solução**: Faça login novamente

### Erro "RLS policy violation"

**Causa**: Políticas RLS não foram criadas
**Solução**: Execute novamente o `database/chat-schema.sql`

### Conversa não aparece na lista

**Causa**: Ambos os usuários precisam estar autenticados
**Solução**: Verifique se ambos fizeram login

---

## 📱 Estrutura de Dados

### Tabela: conversations
```
id (UUID)              - Chave primária
user_1_id (UUID)      - Primeiro usuário (sempre menor que user_2)
user_2_id (UUID)      - Segundo usuário (sempre maior que user_1)
created_at             - Timestamp
updated_at             - Atualizado ao enviar mensagem
```

### Tabela: messages
```
id (UUID)              - Chave primária
conversation_id (UUID) - FK para conversations
sender_id (UUID)      - Quem enviou
receiver_id (UUID)    - Quem recebeu
content (TEXT)        - Conteúdo da mensagem
is_read (BOOLEAN)     - Marcado como lido
created_at             - Timestamp
updated_at             - Timestamp
```

### Tabela: profiles
```
id (UUID)              - FK para auth.users
username (TEXT)       - Único, obrigatório
display_name (TEXT)  - Nome de exibição
avatar_url (TEXT)    - URL da foto (opcional)
bio (TEXT)           - Biografia (opcional)
is_online (BOOLEAN)  - Status online
last_seen_at         - Último acesso
created_at            - Timestamp
updated_at            - Timestamp
```

---

## 🎯 Próximas Melhorias Opcionais

- [ ] Digitando... indicator
- [ ] Deletar mensagens
- [ ] Editar mensagens
- [ ] Anexos (imagens/áudios)
- [ ] Buscar em conversas
- [ ] Notificações de novo chat
- [ ] Remover contato
- [ ] Chat em grupo

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs do Supabase
3. Certifique-se que JWT está válido
4. Recarregue a página e teste novamente

# 🎯 Chat System - QUICK CHECKLIST

Siga este checklist para implementar o sistema de chat completo!

---

## FASE 1: DATABASE ⚙️

- [ ] Acesse: https://app.supabase.com
- [ ] Vá em: SQL Editor → New Query
- [ ] Copie todo o conteúdo: `database/chat-schema.sql`
- [ ] Execute (Ctrl+Enter)
- [ ] Verifique ao final: "no errors"

**Verificação**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('conversations', 'messages', 'profiles');
```
Esperado: 3 tabelas listadas ✅

---

## FASE 2: ARQUIVOS ✅ JÁ CRIADOS

Todos estes arquivos já estão criados e prontos:

- ✅ `src/lib/chat-service.ts` - Serviço completo
- ✅ `src/components/Chat/ChatWindow.tsx` - Janela de chat
- ✅ `src/components/Chat/ConversationList.tsx` - Lista de conversas
- ✅ `src/components/Chat/DirectMessagesScreen.tsx` - Tela principal
- ✅ `src/styles.css` - Estilos inclusos
- ✅ `database/chat-schema.sql` - Script SQL
- ✅ `CHAT_SYSTEM_SETUP.md` - Documentação completa

---

## FASE 3: INTEGRAÇÃO NO App.tsx 🔧

### 3.1 Adicione import (no topo)
```typescript
import { DirectMessagesScreen } from './components/Chat/DirectMessagesScreen'
```

### 3.2 Atualize o type Screen
```typescript
// ENCONTRE:
type Screen = 'feed' | 'search' | 'mine' | 'direct' | 'profile' | 'settings'

// MUDE PARA:
type Screen = 'feed' | 'search' | 'mine' | 'direct' | 'chat' | 'profile' | 'settings'
```

### 3.3 Adicione no navItems
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

### 3.4 Adicione renderização (no JSX)
Encontre a seção de `if (authMode)` / `else if (screen === ...)` e adicione:

```typescript
} else if (screen === 'chat') {
  content = (
    <DirectMessagesScreen 
      currentUserId={currentUser.id} 
      allUsers={users}
    />
  )
} else if (screen === 'profile') {
```

---

## FASE 4: TESTE BÁSICO ✔️

### 4.1 Inicie o servidor
```bash
npm run dev
```
Acesse: http://localhost:5173/

### 4.2 Abra 2 abas
- **Aba 1**: Faça login com usuário A
- **Aba 2**: Faça login com usuário B (use navegador privado se quiser)

### 4.3 Teste o chat
1. Em **Aba 1**: Clique em "Chat" no menu
2. Em **Aba 1**: Clique em "➕" e selecione usuário B
3. Em **Aba 1**: Digite "Olá!" e pressione Enter
4. **Em Aba 2**: Deve aparecer a mensagem INSTANTANEAMENTE
5. Em **Aba 2**: Digite resposta
6. **Em Aba 1**: Deve receber INSTANTANEAMENTE

---

## FASE 5: VERIFICAÇÕES DE SEGURANÇA 🔒

- [ ] Teste SEM LOGIN: Tente acessar `/` em aba anônima
  - Esperado: ❌ Erro ou tela vazia
  
- [ ] Teste EXPIRAÇÃO: Faça logout e tente enviar mensagem
  - Esperado: ❌ Erro de autenticação

- [ ] Teste ACESSO: Usuário A tenta ver mensagens de B (que não participou)
  - Esperado: ❌ Bloqueado pelo RLS

---

## TROUBLESHOOTING 🐛

### ❌ "Erro de RLS" ou "Unauthorized"

**Causa**: Políticas RLS não aplicadas
**Solução**: 
1. Vá em Supabase → Authentication → Policies
2. Verifique se as políticas aparecem
3. Se não, execute novamente o script SQL

### ❌ Mensagens não aparecem em tempo real

**Causa**: WebSocket desconectado
**Solução**:
1. Abra Console do Navegador (F12)
2. Procure por erros de conexão
3. Recarregue a página
4. Tente novamente

### ❌ Erro "Tabela não existe"

**Causa**: Script SQL não foi executado
**Solução**: Execute o `database/chat-schema.sql` completo no Supabase

### ❌ "Usuário não existe" ao enviar

**Causa**: Perfil não foi criado
**Solução**: Execute no Supabase:
```sql
INSERT INTO profiles (id, username, display_name, is_online)
SELECT id, email, email, FALSE FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

---

## LISTAS DE VERIFICAÇÃO

### Login
- [ ] Usuário A consegue fazer login
- [ ] Usuário B consegue fazer login em outra aba
- [ ] Ambos veem "Chat" no menu

### Mensagens
- [ ] Usuário A consegue iniciar conversa com B
- [ ] Mensagem aparece em tempo real (sem recarregar)
- [ ] Timestamp aparece corretamente
- [ ] Marca com ✓✓ quando lida

### Conversas
- [ ] Lista de conversas carrega
- [ ] Conversas aparecem para ambos usuários
- [ ] Último horário atualiza
- [ ] Avatar do outro usuário aparece

### Segurança
- [ ] Sem login: acesso negado
- [ ] Mensagem vazia: não envia
- [ ] Destinatário inválido: erro

---

## PRÓXIMAS MELHORIAS (OPCIONAL)

Depois que o chat estiver funcionando, você pode adicionar:

- [ ] Indicador "Digitando..."
- [ ] Deletar mensagens
- [ ] Editar mensagens
- [ ] Buscar conversas
- [ ] Notificações de som
- [ ] Anexos (imagens)
- [ ] Reações com emoji
- [ ] Modo offline com sincronização

---

## 📞 CHECKLIST FINAL

- [ ] Todos os arquivos criados
- [ ] Script SQL executado
- [ ] App.tsx atualizado
- [ ] Servidor rodando (npm run dev)
- [ ] Teste com 2 usuários feito
- [ ] Tempo real funcionando
- [ ] Segurança validada
- [ ] Pronto para produção! 🚀

---

## 📚 REFERÊNCIAS

- **Setup completo**: `CHAT_SYSTEM_SETUP.md`
- **Exemplos de código**: `src/components/Chat/INTEGRATION_EXAMPLE.ts`
- **Serviço chat**: `src/lib/chat-service.ts`
- **Documentação Supabase**: https://supabase.com/docs/realtime/overview

---

**Desenvolvido em**: 16/06/2026
**Stack**: React + TypeScript + Supabase + WebSockets
**Status**: ✅ Pronto para uso

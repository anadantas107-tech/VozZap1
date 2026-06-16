# 🔧 Guia de Resolução: Usuários Não Sendo Cadastrados

## ❌ Problema Identificado

Usuários estão sendo **salvos em fallback local**, mas não são registrados no **Supabase Auth** porquê:

1. **Rate limiting do Supabase está bloqueando requisições** (erro: `email rate limit exceeded`)
2. **SQL schema não foi executado no Supabase** (tabelas, triggers e policies não existem)
3. **Variáveis de ambiente (`.env`) não estão configuradas** (app não consegue conectar ao Supabase)

---

## ✅ Solução: 4 Passos

### 1️⃣ CONFIGURAR SUPABASE (5 minutos)

#### A) Criar arquivo `.env` na raiz do projeto

Crie o arquivo `c:\Users\enfre\Downloads\VozZap\.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**Onde pegar os valores:**
1. Abra [Supabase Dashboard](https://app.supabase.com)
2. Clique no seu projeto
3. Vá para **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** (abaix de Keys) → `VITE_SUPABASE_ANON_KEY`

✅ Salve o arquivo

---

#### B) Executar SQL Schema

1. Abra Supabase Dashboard
2. Clique em **SQL Editor** → **New Query**
3. **Copie TODO o conteúdo** de: [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) (primeira seção SQL)
4. **Cole** no SQL Editor
5. Clique em **Run** ▶️

**Esperado:** Sem erros, todas as tabelas criadas ✅

---

#### C) Criar Storage Buckets

1. Vá para **Storage** no Supabase
2. Clique em **New Bucket**
3. Crie:
   - **Bucket 1:** Nome = `avatars` | Acesso = **Public** ✅
   - **Bucket 2:** Nome = `message-files` | Acesso = **Private** 🔒

---

### 2️⃣ REINICIAR A APP

```bash
# No terminal, pressione Ctrl+C para parar
# Depois execute:
npm run dev
```

---

### 3️⃣ TESTAR O REGISTRO

1. Abra `http://localhost:5173`
2. Clique em **"Criar conta"**
3. Preencha:
   - Email: `seu-email@teste.com`
   - Senha: `SenhaForte123`
   - Nome: `Seu Nome`
   - Usuário: `seu_usuario`
4. Clique em **"Cadastrar"**

**Resultados esperados:**

| Cenário | Resultado |
|---------|-----------|
| ✅ Sem rate limit | Usuário criado no Supabase Auth + Profile criado automaticamente |
| ⚠️ Com rate limit | Usuário criado localmente com aviso, e será sincronizado depois de 1h |
| ❌ Erro outro | Fallback local automático |

---

### 4️⃣ VERIFICAR NO SUPABASE

#### Verificar que o Profile foi criado:

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Execute:
```sql
SELECT * FROM profiles;
```
3. Deve listar o novo usuário ✅

#### Verificar que foi criado em Auth:

1. Supabase Dashboard → **Authentication** → **Users**
2. Deve listar o novo usuário com email confirming ✅

---

## 🔄 O Que Acontece Automaticamente

### Fluxo de Registro:

```
┌─────────────────┐
│ Usuário clica   │
│ "Cadastrar"     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ App tenta Supabase Auth │
│ (signUp)                │
└────────┬────────────────┘
         │
    ╔════╩════╗
    │         │
    ▼         ▼
┌─────┐   ┌──────────┐
│ OK? │   │Rate Limit?
└──┬──┘   └──────┬───┘
   │             │
   ▼             ▼
┌──────────────┐ ┌──────────────┐
│ Salvos no    │ │ Salvos Locais│
│ Supabase +   │ │ + Aviso      │
│ Trigger cria │ │ (fallback)   │
│ Profile Auto │ │              │
└──────────────┘ └──────────────┘
```

### Quando Supabase conecta:
- ✅ User criado em `auth.users`
- ✅ Trigger `on_auth_user_created` executa automaticamente
- ✅ Profile criado em `profiles` table automaticamente
- ✅ Mensagens começam sincronizando em tempo real

---

## ⚠️ Tratamento de Rate Limit

Se receber: `⚠️ Supabase está bloqueando requisições...`

**O que fazer:**
1. ✅ Usuário AINDA é registrado localmente
2. ✅ App funciona normalmente com dados locais
3. ⏳ Aguarde ~1 hora (rate limit do Supabase reset)
4. 🔄 Próximo login sincroniza com Supabase

**Alternativas:**
- 🌐 Usar VPN para mudar IP (reseta rate limit)
- 📧 Usar email diferente (alguns provedores têm limite por email)
- ⏰ Aguardar 1 hora

---

## 🔍 Troubleshooting

### Problema: Usuário não aparece em `SELECT * FROM profiles`

**Causa:** SQL schema não foi executado ou trigger não funcionou

**Solução:**
1. Verifique se executou o SQL em SQL Editor (deve aparecer `DONE`)
2. Re-execute o SQL:
```sql
-- Verificar se tabela existe
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';
```

### Problema: "email rate limit exceeded"

**Causa:** Muitas requisições do mesmo IP/email em pouco tempo

**Solução:**
1. Aguarde 1 hora
2. Use VPN (muda IP)
3. Use email diferente

### Problema: `.env` não está sendo lido

**Causa:** Variáveis não carregadas do arquivo `.env`

**Solução:**
1. Verifique nome: deve ser **exatamente** `.env` (ponto antes)
2. Reinicie o dev server: `npm run dev`
3. Verifique console: deve dizer `Supabase conectado`

### Problema: "Supabase não configurado" na tela de Settings

**Causa:** `.env` não foi carregado ou chaves estão vazias

**Solução:**
1. Abra `.env` e verifique que tem valores (não vazio)
2. Não tem espaços extras: `VITE_SUPABASE_URL=https://...` (sem espaço antes/depois de `=`)
3. Reinicie: `npm run dev`

---

## ✨ Resumo da Mudança

### Antes:
- ❌ Usuários só em fallback local
- ❌ Sem sincronização com Supabase
- ❌ Sem triggersautomático

### Depois:
- ✅ Usuários criados no Supabase Auth
- ✅ Profile criado automaticamente por trigger
- ✅ Chats funcionam em tempo real
- ✅ Fallback local se Supabase tiver problemas

---

## 📝 Próximas Etapas

1. ✅ Executar SQL schema (AGORA)
2. ✅ Configurar `.env` (AGORA)
3. ✅ Testar primeiro registro
4. ⏳ Criar 2º usuário para teste de chat
5. 🔄 Testar sincronização de mensagens

---

**Dúvidas?** Verifique console do browser (F12) e terminal para mensagens de erro.

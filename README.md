# VozZap — Protótipo React + TypeScript + Vite

Protótipo mobile-first da rede social de áudios curtos **VozZap**, com telas principais, navegação por menu sanduíche, tema claro/escuro persistente e base preparada para Supabase.

## Stack

- Vite
- React
- TypeScript
- UI própria inspirada em shadcn/ui, com tokens CSS e componentes reutilizáveis
- Supabase JS client preparado em `src/lib/supabase.ts`
- Deploy compatível com Vercel

## Funcionalidades implementadas no protótipo

- Login, cadastro e recuperação de senha com alternância de tema.
- Menu sanduíche com: Feed, Buscar, Minhas Publicações, Direct, Perfil, Configurações e Sair.
- Feed com cards de áudio contendo título, descrição, categoria, player, duração, autor, curtidas, comentários e ações.
- Nova publicação por modal com título, descrição, categoria, upload de áudio, duração e visibilidade.
- CRUD visual de publicações próprias: criar, editar e excluir.
- Direct com lista de conversas e composição de mensagem.
- Perfil com edição visual e estatísticas.
- Configurações com toggle Light/Dark persistido no `localStorage`.
- Paleta obrigatória aplicada: `#25D366`, `#075E54`, `#FFFFFF`, `#111827`.

## Rodar localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha quando conectar ao Supabase:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon
VITE_APP_URL=http://localhost:5173
```

## Próximos passos recomendados

1. Criar tabelas Supabase: `profiles`, `posts`, `follows`, `likes`, `comments`, `conversations`, `messages` e buckets de storage para `avatars` e `audios`.
2. Adicionar autenticação real com `supabase.auth.signUp`, `signInWithPassword`, `resetPasswordForEmail`.
3. Trocar dados mockados de `src/data/mock.ts` por queries Supabase.
4. Implementar Row Level Security (RLS) para impedir edição/exclusão por usuários não autorizados.
5. Opcional: instalar e configurar shadcn/ui oficial para substituir os componentes visuais próprios.

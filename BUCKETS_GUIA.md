# 📦 BUCKETS - GUIA COMPLETO

## Buckets do Sistema

### 1️⃣ AVATARS - Perfil do Usuário
```
Nome: avatars
Tipo: Público (Public)
Uso: Fotos de perfil dos usuários
URL Pattern: https://project.supabase.co/storage/v1/object/public/avatars/[userId]/avatar.jpg
Permissão: Qualquer um consegue ler | Autenticados podem fazer upload
```

**Estrutura de Pastas:**
```
avatars/
├── user-1-uuid/
│   └── avatar.jpg
├── user-2-uuid/
│   └── avatar.jpg
└── user-3-uuid/
    └── avatar.jpg
```

### 2️⃣ MESSAGE-FILES - Arquivos em Mensagens (Opcional)
```
Nome: message-files
Tipo: Privado (Private)
Uso: Arquivos compartilhados nas mensagens (fotos, documentos, etc)
URL Pattern: https://project.supabase.co/storage/v1/object/authenticated/message-files/[conversationId]/[fileName]
Permissão: Apenas participantes conseguem acessar
```

**Estrutura de Pastas:**
```
message-files/
├── conversation-1-uuid/
│   ├── image-1.jpg
│   ├── document.pdf
│   └── video.mp4
└── conversation-2-uuid/
    └── photo.jpg
```

---

## 🚀 Como Usar nos Componentes React

### Upload de Avatar

```typescript
// src/lib/chat-service.ts

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // 1. Upload do arquivo
  const fileName = `${userId}/avatar.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      upsert: true, // Substituir se já existe
      contentType: file.type
    });

  if (error) throw error;

  // 2. Obter URL pública
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // 3. Atualizar profile com a URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', userId);

  if (updateError) throw updateError;

  return urlData.publicUrl;
}
```

### Component de Upload

```tsx
// src/components/Chat/AvatarUpload.tsx

import { useState } from 'react';
import { uploadAvatar } from '@/lib/chat-service';
import { Upload, Loader } from 'lucide-react';

interface AvatarUploadProps {
  userId: string;
  currentAvatar?: string;
  onSuccess?: (url: string) => void;
}

export function AvatarUpload({ userId, currentAvatar, onSuccess }: AvatarUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecione uma imagem');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem deve ter menos de 5MB');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = await uploadAvatar(userId, file);
      onSuccess?.(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="avatar-upload">
      <div className="avatar-preview">
        {currentAvatar ? (
          <img src={currentAvatar} alt="Avatar" />
        ) : (
          <div className="avatar-placeholder">Sem Avatar</div>
        )}
      </div>

      <label className="upload-button">
        {loading ? <Loader className="animate-spin" /> : <Upload size={20} />}
        {loading ? 'Enviando...' : 'Enviar Avatar'}
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={loading}
          style={{ display: 'none' }}
        />
      </label>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
```

### Exibir Avatar no Chat

```tsx
// src/components/Chat/MessageBubble.tsx

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderAvatar?: string;
  senderName?: string;
}

export function MessageBubble({ 
  message, 
  isOwn, 
  senderAvatar,
  senderName 
}: MessageBubbleProps) {
  return (
    <div className={`message-bubble ${isOwn ? 'sent' : 'received'}`}>
      {!isOwn && senderAvatar && (
        <img 
          src={senderAvatar} 
          alt={senderName} 
          className="message-avatar"
        />
      )}
      
      <div className="message-content">
        {!isOwn && senderName && (
          <div className="message-sender-name">{senderName}</div>
        )}
        <p>{message.content}</p>
        <span className="message-time">
          {new Date(message.created_at).toLocaleTimeString()}
          {isOwn && message.is_read && '✓✓'}
        </span>
      </div>
    </div>
  );
}
```

---

## 📸 CSS para Avatar

```css
.avatar-upload {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: var(--surface);
  border: 2px solid var(--green);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
}

.upload-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: var(--green);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.upload-button:hover {
  background-color: var(--green-dark);
}

.upload-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 8px;
}

.message-sender-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
```

---

## 🔄 Como Usar no Profile

```tsx
// src/components/Profile/EditProfile.tsx

import { useState } from 'react';
import { AvatarUpload } from '@/components/Chat/AvatarUpload';
import { uploadAvatar } from '@/lib/chat-service';

export function EditProfile() {
  const [userId] = useState(getCurrentUserId());
  const [profile, setProfile] = useState(getProfile());
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = async (url: string) => {
    setProfile({ ...profile, avatar_url: url });
    // Automaticamente atualiza no banco via service
  };

  return (
    <div className="edit-profile">
      <h2>Meu Perfil</h2>
      
      <AvatarUpload 
        userId={userId}
        currentAvatar={profile.avatar_url}
        onSuccess={handleAvatarUpload}
      />

      <div className="profile-form">
        <input 
          type="text" 
          value={profile.display_name}
          onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
          placeholder="Nome"
        />
        
        <textarea 
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          placeholder="Bio"
        />

        <button 
          onClick={() => saveProfile(profile)}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
```

---

## ✅ Passo a Passo - Supabase

### 1. Execute o SQL dos Buckets

```
Supabase Dashboard
  → SQL Editor
  → New Query
  → Copie storage-buckets.sql
  → Execute
```

### 2. Verifique no Storage

```
Supabase Dashboard
  → Storage
  → Você verá 2 buckets:
     ✓ avatars (público)
     ✓ message-files (privado)
```

### 3. Configure CORS (se necessário)

```
Supabase Dashboard
  → Storage
  → Settings
  → CORS Configuration
  → Adicione seu domínio (http://localhost:5173)
```

---

## 🎯 Resumo dos Nomes dos Buckets

| Bucket | Tipo | Uso | Acesso |
|--------|------|-----|--------|
| `avatars` | Público | Fotos de perfil | Qualquer um lê |
| `message-files` | Privado | Arquivos compartilhados | Autenticados |

---

## 🚀 Próximos Passos

1. ✅ Execute `storage-buckets.sql` no Supabase
2. ✅ Adicione `AvatarUpload.tsx` ao projeto
3. ✅ Importe `uploadAvatar` no `chat-service.ts`
4. ✅ Integre no `EditProfile` component
5. ✅ Teste com upload de imagem

**Pronto!** 🎊

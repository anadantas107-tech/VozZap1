import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Bell,
  Bookmark,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  Heart,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  Moon,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Sun,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react'
import { chats, currentUser, myPosts, posts as initialPosts, users, type Post, type User as UserType } from './data/mock'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { DirectMessagesScreen } from './components/Chat/DirectMessagesScreen'
import { registerInSupabase, loginInSupabase } from './lib/chat-service'

type Screen = 'feed' | 'search' | 'mine' | 'direct' | 'profile' | 'settings'
type AuthMode = 'login' | 'register' | 'recover'
type Theme = 'light' | 'dark'

const navItems: Array<{ id: Screen; label: string; icon: typeof Home }> = [
  { id: 'feed', label: 'Início (Feed)', icon: Home },
  { id: 'search', label: 'Buscar/Pesquisar', icon: Search },
  { id: 'mine', label: 'Minhas Publicações', icon: Bookmark },
  { id: 'direct', label: 'Mensagens Diretas', icon: MessageCircle },
  { id: 'profile', label: 'Meu Perfil', icon: User },
  { id: 'settings', label: 'Configurações', icon: Settings },
]

const categories = ['Comédia', 'Educação', 'Música', 'Notícias']

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('vozzap-theme') as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function Avatar({ label, size = 'md', photoUrl }: { label: string; size?: 'sm' | 'md' | 'lg'; photoUrl?: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={label} className={`avatar avatar-${size}`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
  }
  return <div className={`avatar avatar-${size}`} aria-hidden="true">{label}</div>
}

function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>
}

function Header({ screen, onMenu, onNewPost }: { screen: Screen; onMenu: () => void; onNewPost: () => void }) {
  const title = navItems.find((item) => item.id === screen)?.label ?? 'VozZap'
  return (
    <header className="app-header">
      <button className="icon-btn header-icon" onClick={onMenu} aria-label="Abrir menu">
        <Menu size={22} />
      </button>
      <div>
        <p className="eyebrow">VozZap</p>
        <h1>{title}</h1>
      </div>
      <button className="icon-btn header-icon" aria-label="Notificações">
        <Bell size={20} />
        <span className="dot" />
      </button>
      <button className="floating-new" onClick={onNewPost} aria-label="Nova publicação"><Plus size={24} /></button>
    </header>
  )
}

function Sidebar({ open, screen, setScreen, onClose, onLogout, theme, setTheme, user }: {
  open: boolean
  screen: Screen
  setScreen: (screen: Screen) => void
  onClose: () => void
  onLogout: () => void
  theme: Theme
  setTheme: (theme: Theme) => void
  user: UserType
}) {
  return (
    <>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`} inert={!open ? true : undefined}>
        <div className="sidebar-top">
          <div className="brand-mark"><Mic size={24} /></div>
          <div>
            <h2>VozZap</h2>
            <p>Micro-podcasts sociais</p>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Fechar menu"><X size={20} /></button>
        </div>

        <div className="profile-mini">
          <Avatar label={user.avatar} photoUrl={user.photoUrl} />
          <div>
            <strong>{user.name}</strong>
            <span>{user.username}</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${screen === item.id ? 'active' : ''}`}
                onClick={() => { setScreen(item.id); onClose() }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                <ChevronRight size={16} />
              </button>
            )
          })}
        </nav>

        <div className="theme-card">
          <div>
            <strong>{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</strong>
            <p>Alternância instantânea e persistente.</p>
          </div>
          <button className="switch" data-on={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Alternar tema">
            <span>{theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}</span>
          </button>
        </div>

        <button className="nav-item logout" onClick={onLogout}>
          <LogOut size={19} />
          <span>Sair</span>
        </button>
      </aside>
    </>
  )
}

function Auth({ theme, setTheme, onLogin }: { theme: Theme; setTheme: (theme: Theme) => void; onLogin: (email: string, password: string, mode: AuthMode, userData?: { name: string; username: string; photoUrl?: string }) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email) {
        setError('E-mail é obrigatório')
        setLoading(false)
        return
      }

      if (mode !== 'recover' && !password) {
        setError('Senha é obrigatória')
        setLoading(false)
        return
      }

      if (mode === 'register') {
        if (!name) {
          setError('Nome é obrigatório')
          setLoading(false)
          return
        }
        if (!username) {
          setError('Usuário é obrigatório')
          setLoading(false)
          return
        }
        
        // Validar formato do username
        if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
          setError('Usuário deve conter apenas letras, números, pontos, travessões e sublinhados')
          setLoading(false)
          return
        }

        onLogin(email, password, 'register', { name, username, photoUrl })
      } else if (mode === 'login') {
        onLogin(email, password, 'login')
      } else {
        // Modo recover
        onLogin(email, '', 'recover')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar')
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-visual">
          <div className="auth-visual-content">
            <div className="auth-visual-icon">🎙️</div>
            <h2>Bem-vindo ao VozZap</h2>
            <p>Compartilhe sua voz, ouça histórias e conecte-se com uma comunidade de áudio apaixonada</p>
          </div>
        </div>
        
        <div className="auth-content">
          <div className="auth-theme-row">
            <div className="brand-lockup">
              <div className="brand-mark"><Mic size={25} /></div>
              <div>
                <h1>VozZap</h1>
                <p>Áudios curtos. Conversas grandes.</p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Alternar tema">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>

          <div className="auth-hero">
            <h2>{mode === 'login' ? 'Entre na sua rede de voz' : mode === 'register' ? 'Crie sua conta' : 'Recupere sua senha'}</h2>
            <p>{mode === 'recover' ? 'Enviaremos um link de redefinição para seu e-mail.' : 'Publique, ouça, curta e converse por áudio.'}</p>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 500 }}>{error}</div>}

          <form className="form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <label>Nome de exibição
                  <input 
                    placeholder="Seu nome" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </label>
                <label>Nome de usuário
                  <input 
                    placeholder="usuario_ou_handle" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    disabled={loading}
                  />
                </label>
              </>
            )}
            <label>E-mail
              <input 
                type="email" 
                placeholder="voce@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </label>
            {mode !== 'recover' && (
              <label>Senha
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </label>
            )}
            {mode === 'register' && (
              <label>Foto/avatar
                <input ref={fileInputRef} type="file" accept="image/*" disabled={loading} onChange={handleFileChange} />
              </label>
            )}
            <Button type="submit" className="full" disabled={loading}>
              {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar' : 'Enviar link'}
            </Button>
          </form>

          <div className="auth-links">
            {mode !== 'login' && <button onClick={() => { setMode('login'); setError('') }} disabled={loading}>Já tenho conta</button>}
            {mode !== 'register' && <button onClick={() => { setMode('register'); setError('') }} disabled={loading}>Criar conta</button>}
            {mode !== 'recover' && <button onClick={() => { setMode('recover'); setError('') }} disabled={loading}>Esqueci minha senha</button>}
          </div>
        </div>
      </section>
    </main>
  )
}

function AudioCard({ post, mine = false, onLike, onEdit, onDelete }: { post: Post; mine?: boolean; onLike: (id: string) => void; onEdit?: (post: Post) => void; onDelete?: (id: string) => void }) {
  const [playing, setPlaying] = useState(false)
  return (
    <article className="post-card">
      <div className="post-head">
        <Avatar label={post.author.avatar} photoUrl={post.author.photoUrl} />
        <div className="grow">
          <strong>{post.author.name}</strong>
          <span>{post.author.username} • {post.createdAt}</span>
        </div>
        <span className="badge">{post.visibility}</span>
      </div>

      <h2>{post.title}</h2>
      <p>{post.description}</p>

      <div className="meta-row">
        <span className="category">{post.category}</span>
        <span>{post.duration}</span>
      </div>

      <div className="player">
        <button className="play-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pausar' : 'Tocar'}>
          {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </button>
        <div className="wave" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => <span key={i} style={{ height: `${18 + ((i * 13) % 34)}px` }} />)}
        </div>
        <audio src={post.audioUrl} controls preload="none" />
      </div>

      <div className="actions">
        <button className={post.liked ? 'liked' : ''} onClick={() => onLike(post.id)}><Heart size={18} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}</button>
        <button><MessageCircle size={18} /> {post.comments}</button>
        <button><Share2 size={18} /> Compartilhar</button>
        {mine && (
          <div className="owner-actions">
            <button onClick={() => onEdit?.(post)}><Edit3 size={17} /> Editar</button>
            <button className="danger-text" onClick={() => onDelete?.(post.id)}><Trash2 size={17} /> Excluir</button>
          </div>
        )}
      </div>
    </article>
  )
}

function Feed({ posts, onLike }: { posts: Post[]; onLike: (id: string) => void }) {
  return (
    <div className="screen stack">
      <section className="welcome-card">
        <div>
          <p className="eyebrow">Feed personalizado</p>
          <h2>Ouça os áudios de quem você segue</h2>
          <p>Publicações ordenadas por tempo, com interações rápidas e player otimizado.</p>
        </div>
        <Mic size={42} />
      </section>
      {posts.map((post) => <AudioCard key={post.id} post={post} onLike={onLike} />)}
    </div>
  )
}

function SearchScreen({ currentUserId }: { currentUserId: string }) {
  return (
    <div className="screen stack">
      <div className="search-box"><Search size={20} /><input placeholder="Buscar pessoas, categorias ou áudios" /></div>
      <h2 className="section-title">Perfis sugeridos</h2>
      {users.filter((u) => u.id !== currentUserId).map((user) => (
        <article className="user-row" key={user.id}>
          <Avatar label={user.avatar} photoUrl={user.photoUrl} />
          <div className="grow"><strong>{user.name}</strong><span>{user.bio}</span></div>
          <Button variant="secondary"><Users size={16} /> Seguir</Button>
        </article>
      ))}
      <h2 className="section-title">Categorias</h2>
      <div className="chips">{categories.map((cat) => <button key={cat}>{cat}</button>)}</div>
    </div>
  )
}

function Mine({ posts, onLike, onEdit, onDelete }: { posts: Post[]; onLike: (id: string) => void; onEdit: (post: Post) => void; onDelete: (id: string) => void }) {
  return (
    <div className="screen stack">
      <section className="stats-grid">
        <div><strong>{posts.length}</strong><span>publicações</span></div>
        <div><strong>97</strong><span>curtidas</span></div>
        <div><strong>15</strong><span>comentários</span></div>
      </section>
      {posts.map((post) => <AudioCard key={post.id} post={post} mine onLike={onLike} onEdit={onEdit} onDelete={onDelete} />)}
    </div>
  )
}



function Profile({ user }: { user: UserType }) {
  return (
    <div className="screen stack">
      <section className="profile-card">
        <div className="cover" />
        <div className="profile-content">
          <Avatar label={user.avatar} size="lg" photoUrl={user.photoUrl} />
          <button className="camera"><Camera size={17} /></button>
          <h2>{user.name}</h2>
          <p>{user.username}</p>
          <p>{user.bio}</p>
          <div className="profile-stats"><span><strong>{user.followers}</strong> seguidores</span><span><strong>{user.following}</strong> seguindo</span></div>
          <Button><Edit3 size={17} /> Editar perfil</Button>
        </div>
      </section>
      <section className="form-card">
        <h3>CRUD do Perfil</h3>
        <label>Nome<input defaultValue={user.name} /></label>
        <label>Bio<textarea defaultValue={user.bio} /></label>
        <div className="row"><Button><Check size={17} /> Salvar</Button><Button variant="danger"><Trash2 size={17} /> Excluir conta</Button></div>
      </section>
    </div>
  )
}

function SettingsScreen({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {
  return (
    <div className="screen stack">
      <section className="settings-card">
        <div className="setting-row">
          <div className="setting-icon">{theme === 'dark' ? <Moon /> : <Sun />}</div>
          <div className="grow">
            <strong>Tema da interface</strong>
            <span>Persistido no localStorage e aplicado em todas as telas.</span>
          </div>
          <button className="switch" data-on={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <span>{theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}</span>
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-icon"><Shield /></div>
          <div className="grow">
            <strong>Armazenamento</strong>
            <span>🟢 Usando armazenamento local (localStorage). Dados salvos no navegador.</span>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-icon">☁️</div>
          <div className="grow">
            <strong>Supabase Backend</strong>
            <span>{isSupabaseConfigured ? '✅ Configurado (com fallback local)' : '⚠️ Usando apenas armazenamento local'}</span>
          </div>
        </div>
      </section>
      <section className="palette">
        <div style={{ background: '#25D366' }}>#25D366</div>
        <div style={{ background: '#075E54' }}>#075E54</div>
        <div style={{ background: '#FFFFFF', color: '#111827', border: '1px solid var(--border)' }}>#FFFFFF</div>
        <div style={{ background: '#111827' }}>#111827</div>
      </section>
    </div>
  )
}

function PostModal({ onClose, onSave, editing }: { onClose: () => void; onSave: (post: Post) => void; editing?: Post | null }) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [category, setCategory] = useState(editing?.category ?? 'Educação')
  const [duration, setDuration] = useState(editing?.duration ?? '01:00')
  const [visibility, setVisibility] = useState<Post['visibility']>(editing?.visibility ?? 'Público')

  return (
    <div className="modal-backdrop">
      <section className="modal-card">
        <div className="modal-head"><h2>{editing ? 'Editar publicação' : 'Nova publicação'}</h2><button className="icon-btn" onClick={onClose}><X size={20} /></button></div>
        <form className="form" onSubmit={(event) => {
          event.preventDefault()
          onSave({
            id: editing?.id ?? `p${Date.now()}`,
            title,
            description,
            category,
            audioUrl: editing?.audioUrl ?? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
            duration,
            author: currentUser,
            likes: editing?.likes ?? 0,
            comments: editing?.comments ?? 0,
            liked: editing?.liked ?? false,
            visibility,
            createdAt: editing?.createdAt ?? 'agora',
          })
        }}>
          <label>Título obrigatório<input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Pensamento do dia" /></label>
          <label>Descrição<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" /></label>
          <div className="row two">
            <label>Categoria<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
            <label>Duração<input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="01:20" /></label>
          </div>
          <label>URL ou upload de áudio<input type="file" accept="audio/mp3,audio/mpeg,audio/mp4,audio/m4a" /></label>
          <label>Visibilidade<select value={visibility} onChange={(e) => setVisibility(e.target.value as Post['visibility'])}><option>Público</option><option>Seguidores</option><option>Privado</option></select></label>
          <div className="row"><Button type="submit">Publicar</Button><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></div>
        </form>
      </section>
    </div>
  )
}

export default function App() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<UserType | null>(null)
  const [screen, setScreen] = useState<Screen>('feed')
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedPosts, setFeedPosts] = useState<Post[]>(initialPosts)
  const [ownedPosts, setOwnedPosts] = useState<Post[]>(myPosts)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Post | null>(null)
  const lastAuthAttemptRef = useRef<number>(0)
  
  // Carregar usuários registrados do localStorage
  const [registeredUsers, setRegisteredUsers] = useState<Map<string, { user: UserType; password: string }>>(() => {
    const saved = localStorage.getItem('vozzap-users')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return new Map(parsed)
      } catch {
        return new Map()
      }
    }
    return new Map()
  })

  const allPosts = useMemo(() => [...ownedPosts, ...feedPosts], [ownedPosts, feedPosts])

  // Salvar usuários no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('vozzap-users', JSON.stringify([...registeredUsers.entries()]))
  }, [registeredUsers])

  // Salvar email do usuário autenticado para o chat-service acessar
  useEffect(() => {
    if (loggedIn && loggedInUser) {
      // Encontrar o email do usuário logado
      for (const [email, userData] of registeredUsers.entries()) {
        if (userData.user.id === loggedInUser.id) {
          localStorage.setItem('vozzap-current-user', email)
          break
        }
      }
    } else {
      localStorage.removeItem('vozzap-current-user')
    }
  }, [loggedIn, loggedInUser, registeredUsers])

  function setTheme(next: Theme) {
    setThemeState(next)
    localStorage.setItem('vozzap-theme', next)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  async function handleAuth(email: string, password: string, mode: AuthMode, userData?: { name: string; username: string; photoUrl?: string }) {
    // Rate limiting: 1 segundo entre tentativas
    const now = Date.now()
    const timeSinceLastAttempt = now - lastAuthAttemptRef.current
    if (timeSinceLastAttempt < 1000) {
      throw new Error(`⏳ Aguarde ${Math.ceil((1000 - timeSinceLastAttempt) / 1000)}s antes de tentar novamente`)
    }
    lastAuthAttemptRef.current = now

    try {
      if (mode === 'register') {
        if (!userData) throw new Error('Dados do usuário são obrigatórios para registro')

        // Verificar se email já está registrado localmente
        if (registeredUsers.has(email)) {
          throw new Error('Este e-mail já está cadastrado')
        }

        // Se Supabase está configurado, tentar Supabase
        if (isSupabaseConfigured && supabase) {
          try {
            // Usar nova função registerInSupabase
            const supabaseUser = await registerInSupabase(email, password, userData)

            // Criar usuário local também
            const newUser: UserType = {
              id: supabaseUser.id,
              name: userData.name,
              username: `@${userData.username}`,
              avatar: userData.name.substring(0, 2).toUpperCase(),
              photoUrl: userData.photoUrl,
              bio: '',
              followers: 0,
              following: 0,
            }

            setRegisteredUsers(new Map(registeredUsers.set(email, {
              user: newUser,
              password,
            })))

            setLoggedInUser(newUser)
            setLoggedIn(true)
            console.log('✅ Usuário registrado com sucesso no Supabase!')

          } catch (supabaseError) {
            const errorMsg = supabaseError instanceof Error ? supabaseError.message : String(supabaseError)
            console.warn('⚠️ Supabase não disponível, usando fallback local:', errorMsg)
            console.info('💾 Salvando usuário localmente no navegador')

            // Fallback: registrar localmente (sempre funciona)
            const newUser: UserType = {
              id: `u${Date.now()}`,
              name: userData.name,
              username: `@${userData.username}`,
              avatar: userData.name.substring(0, 2).toUpperCase(),
              photoUrl: userData.photoUrl,
              bio: '',
              followers: 0,
              following: 0,
            }

            setRegisteredUsers(new Map(registeredUsers.set(email, {
              user: newUser,
              password,
            })))

            setLoggedInUser(newUser)
            setLoggedIn(true)
            console.log('✅ Usuário registrado localmente com sucesso!')
            console.log('📝 Email:', email)
            console.log('👤 Nome:', userData.name)
          }
        } else {
          // Usar sistema mockado local
          const newUser: UserType = {
            id: `u${Date.now()}`,
            name: userData.name,
            username: `@${userData.username}`,
            avatar: userData.name.substring(0, 2).toUpperCase(),
            photoUrl: userData.photoUrl,
            bio: '',
            followers: 0,
            following: 0,
          }

          setRegisteredUsers(new Map(registeredUsers.set(email, {
            user: newUser,
            password,
          })))

          setLoggedInUser(newUser)
          setLoggedIn(true)
        }

      } else if (mode === 'login') {
        // Se Supabase está configurado, tentar Supabase
        if (isSupabaseConfigured && supabase) {
          try {
            // Usar nova função loginInSupabase
            const supabaseUser = await loginInSupabase(email, password)
            
            console.log('✅ Usuário logado no Supabase:', supabaseUser)
            
            // Buscar dados do usuário registrado localmente ou criar novo
            let registered = registeredUsers.get(email)
            if (!registered) {
              // Se não existe localmente, criar com dados do Supabase
              registered = {
                user: {
                  id: supabaseUser.id,
                  name: supabaseUser.user_metadata?.display_name || email,
                  username: `@${supabaseUser.user_metadata?.username || email.split('@')[0]}`,
                  avatar: (supabaseUser.user_metadata?.display_name || email).substring(0, 2).toUpperCase(),
                  photoUrl: supabaseUser.user_metadata?.photoUrl || '',
                  bio: '',
                  followers: 0,
                  following: 0,
                },
                password,
              }
              setRegisteredUsers(new Map(registeredUsers.set(email, registered)))
            }
            
            setLoggedInUser(registered.user)
            setLoggedIn(true)
            
          } catch (supabaseError) {
            const errorMsg = supabaseError instanceof Error ? supabaseError.message : String(supabaseError)
            console.error('⚠️ Erro no Supabase, tentando fallback local:', errorMsg)
            
            // Fallback: verificar se existe localmente
            const registered = registeredUsers.get(email)
            if (!registered || registered.password !== password) {
              throw new Error('E-mail ou senha incorretos')
            }

            setLoggedInUser(registered.user)
            setLoggedIn(true)
          }
        } else {
          // Sistema mockado: verificar se usuário existe
          const registered = registeredUsers.get(email)
          if (!registered || registered.password !== password) {
            throw new Error('E-mail ou senha incorretos')
          }

          setLoggedInUser(registered.user)
          setLoggedIn(true)
        }

      } else if (mode === 'recover') {
        console.log('Recuperação de senha enviada para:', email)
        alert('Link de recuperação enviado para seu e-mail (este é apenas um mockup)')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro de autenticação'
      console.error('Erro de autenticação:', message)
      throw error
    }
  }

  function likePost(id: string) {
    const updater = (post: Post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post
    setFeedPosts((list) => list.map(updater))
    setOwnedPosts((list) => list.map(updater))
  }

  function savePost(post: Post) {
    setOwnedPosts((list) => list.some((item) => item.id === post.id) ? list.map((item) => item.id === post.id ? post : item) : [post, ...list])
    setModalOpen(false)
    setEditing(null)
    setScreen('mine')
  }

  function renderScreen() {
    const displayUser = loggedInUser || currentUser
    
    switch (screen) {
      case 'feed': return <Feed posts={feedPosts} onLike={likePost} />
      case 'search': return <SearchScreen currentUserId={displayUser.id} />
      case 'mine': return <Mine posts={ownedPosts} onLike={likePost} onEdit={(post) => { setEditing(post); setModalOpen(true) }} onDelete={(id) => setOwnedPosts((list) => list.filter((post) => post.id !== id))} />
      case 'direct': return <DirectMessagesScreen allUsers={users} currentUserId={displayUser.id} />
      case 'profile': return <Profile user={displayUser} />
      case 'settings': return <SettingsScreen theme={theme} setTheme={setTheme} />
      default: return <Feed posts={allPosts} onLike={likePost} />
    }
  }

  if (!loggedIn) return <Auth theme={theme} setTheme={setTheme} onLogin={handleAuth} />

  const displayUser = loggedInUser || currentUser

  return (
    <div className="app-shell">
      <Header screen={screen} onMenu={() => setMenuOpen(true)} onNewPost={() => { setEditing(null); setModalOpen(true) }} />
      <Sidebar open={menuOpen} screen={screen} setScreen={setScreen} onClose={() => setMenuOpen(false)} onLogout={() => { setLoggedIn(false); setLoggedInUser(null) }} theme={theme} setTheme={setTheme} user={displayUser} />
      {renderScreen()}
      {modalOpen && <PostModal editing={editing} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={savePost} />}
    </div>
  )
}

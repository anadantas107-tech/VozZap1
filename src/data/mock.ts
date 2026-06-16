export type User = {
  id: string
  name: string
  username: string
  avatar: string
  photoUrl?: string
  bio: string
  followers: number
  following: number
}

export type Post = {
  id: string
  title: string
  description: string
  category: string
  audioUrl: string
  duration: string
  author: User
  likes: number
  comments: number
  liked: boolean
  visibility: 'Público' | 'Seguidores' | 'Privado'
  createdAt: string
}

export type Chat = {
  id: string
  user: User
  lastMessage: string
  time: string
  unread: number
}

export const currentUser: User = {
  id: 'u1',
  name: 'Ana Luiza',
  username: '@ana.voz',
  avatar: 'AL',
  photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  bio: 'Micro-podcaster, fã de tecnologia, histórias curtas e boas conversas.',
  followers: 1280,
  following: 246,
}

export const users: User[] = [
  currentUser,
  { id: 'u2', name: 'Bruno Reis', username: '@brunoreis', avatar: 'BR', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', bio: 'Notícias sem enrolação em até 2 minutos.', followers: 8420, following: 312 },
  { id: 'u3', name: 'Camila Torres', username: '@camilacria', avatar: 'CT', photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop', bio: 'Música, bastidores e criatividade.', followers: 5200, following: 190 },
  { id: 'u4', name: 'Diego Lima', username: '@diegoprof', avatar: 'DL', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop', bio: 'Educação prática para o dia a dia.', followers: 3410, following: 501 },
]

export const posts: Post[] = [
  {
    id: 'p1',
    title: '3 ideias para organizar seu dia',
    description: 'Um áudio rápido com um método simples para sair do caos e começar melhor a manhã.',
    category: 'Educação',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: '01:42',
    author: users[3],
    likes: 248,
    comments: 32,
    liked: false,
    visibility: 'Público',
    createdAt: 'há 12 min',
  },
  {
    id: 'p2',
    title: 'Resumo das notícias da tarde',
    description: 'Os principais acontecimentos em formato direto, para ouvir no intervalo.',
    category: 'Notícias',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: '02:18',
    author: users[1],
    likes: 521,
    comments: 89,
    liked: true,
    visibility: 'Seguidores',
    createdAt: 'há 38 min',
  },
  {
    id: 'p3',
    title: 'Riff que não sai da cabeça',
    description: 'Gravei uma ideia de melodia no celular. O que vocês acham?',
    category: 'Música',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: '00:55',
    author: users[2],
    likes: 810,
    comments: 144,
    liked: false,
    visibility: 'Público',
    createdAt: 'há 1 h',
  },
]

export const myPosts: Post[] = [
  {
    id: 'p4',
    title: 'Por que áudio aproxima pessoas?',
    description: 'Reflexão curta sobre voz, emoção e redes sociais.',
    category: 'Comédia',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: '01:08',
    author: currentUser,
    likes: 97,
    comments: 15,
    liked: false,
    visibility: 'Público',
    createdAt: 'ontem',
  },
]

export const chats: Chat[] = [
  { id: 'c1', user: users[1], lastMessage: 'Manda aquele áudio depois?', time: '12:20', unread: 2 },
  { id: 'c2', user: users[2], lastMessage: 'Adorei seu último VozZap!', time: '09:14', unread: 0 },
  { id: 'c3', user: users[3], lastMessage: 'Vamos gravar juntos amanhã.', time: 'ontem', unread: 1 },
]

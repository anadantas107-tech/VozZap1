import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

// Debug logging
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase Config:', {
    urlExists: !!supabaseUrl,
    keyExists: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length,
    isHttps: supabaseUrl?.startsWith('https://'),
  })
}

let supabase = null
let isSupabaseConfigured = false

try {
  const isValid = supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey
  
  if (isValid) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    isSupabaseConfigured = true
    console.log('✅ Supabase inicializado com sucesso')
  } else {
    console.warn('⚠️ Supabase não configurado (credenciais faltando ou inválidas)')
    if (!supabaseUrl) console.warn('  - VITE_SUPABASE_URL não definido')
    if (!supabaseAnonKey) console.warn('  - VITE_SUPABASE_ANON_KEY não definido')
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) console.warn('  - VITE_SUPABASE_URL não é HTTPS')
  }
} catch (err) {
  console.error('❌ Erro ao inicializar Supabase:', err)
}

export { supabase, isSupabaseConfigured }

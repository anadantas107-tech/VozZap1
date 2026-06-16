-- ===========================================================
-- BUCKETS DE STORAGE - SUPABASE
-- ===========================================================
-- Execute este script no SQL Editor do Supabase
-- Cria os buckets para armazenar arquivos
-- ===========================================================

-- ============================================
-- 1. BUCKET PARA AVATARES DE USUÁRIOS
-- ============================================

-- Criar bucket "avatars"
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. BUCKET PARA ARQUIVOS DE MENSAGENS (OPCIONAL)
-- ============================================

-- Criar bucket "message-files"
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-files', 'message-files', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. POLÍTICAS DE STORAGE - AVATARS
-- ============================================

-- Qualquer um pode ler avatares (público)
CREATE POLICY "Public avatar access" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

-- Usuários autenticados podem fazer upload
CREATE POLICY "Users can upload avatar" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Usuários podem deletar seu próprio avatar
CREATE POLICY "Users can delete own avatar" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ============================================
-- 4. POLÍTICAS DE STORAGE - MESSAGE-FILES
-- ============================================

-- Apenas participantes podem ler arquivos
CREATE POLICY "Users can read message files" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'message-files' AND auth.role() = 'authenticated');

-- Apenas autenticados podem fazer upload
CREATE POLICY "Users can upload files" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'message-files' AND auth.role() = 'authenticated');

-- Apenas owner pode deletar
CREATE POLICY "Users can delete own files" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'message-files' AND auth.role() = 'authenticated');

-- ============================================
-- VERIFICAÇÕES FINAIS
-- ============================================

-- Verifique os buckets criados
SELECT id, name, public FROM storage.buckets WHERE id IN ('avatars', 'message-files');

-- Verifique as políticas de storage
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

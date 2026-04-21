-- ============================================================
-- Migration 003: Supabase Storage
-- ============================================================

-- Criar bucket para anexos de análises
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analysis-attachments',
  'analysis-attachments',
  FALSE,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Políticas do Storage
CREATE POLICY "Autenticados podem fazer upload de anexos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'analysis-attachments');

CREATE POLICY "Autenticados podem ver anexos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'analysis-attachments');

CREATE POLICY "Autenticados podem deletar seus anexos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'analysis-attachments' AND auth.uid() = owner);

-- ============================================================
-- 0020 – Kunden dürfen eigene Dokument-Uploads umbenennen
-- ============================================================
-- Bisher gab es nur "documents: Client löscht eigene Uploads" (DELETE) und "documents:
-- Client lädt hoch" (INSERT) für Kunden — UPDATE lief ausschließlich über die
-- Admin-Policy "documents: Admin verwaltet alle" (for all). Für die neue
-- Umbenennen-Funktion im Kundenportal (app/(portal)/portal/documents/actions.ts#renameFile)
-- braucht es eine eigene UPDATE-Policy mit derselben Einschränkung wie beim Löschen: nur
-- eigene Uploads (uploaded_by = auth.uid()), nicht admin-verwaltete Dokumente (Verträge,
-- Angebote, Care-Reports etc., die generateDocument() mit uploaded_by = <Admin> anlegt).

drop policy if exists "documents: Client benennt eigene Uploads um" on public.documents;
create policy "documents: Client benennt eigene Uploads um"
  on public.documents for update
  using (
    uploaded_by = auth.uid()
    and (select profile_id from public.clients where id = documents.client_id) = auth.uid()
  )
  with check (
    uploaded_by = auth.uid()
    and (select profile_id from public.clients where id = documents.client_id) = auth.uid()
  );

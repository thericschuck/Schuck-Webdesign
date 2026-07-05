-- ============================================================
-- 0001 – client_status um JARVIS-Werte erweitern
-- ============================================================
-- ALTER TYPE ... ADD VALUE darf laut Postgres nicht in derselben Transaktion
-- verwendet werden, in der der neue Wert auch geschrieben wird. Diese
-- Migration enthält AUSSCHLIESSLICH die Enum-Erweiterung und muss committen,
-- bevor nachfolgende Migrationen 'lead' / 'paused' / 'completed' benutzen.

alter type public.client_status add value if not exists 'lead';
alter type public.client_status add value if not exists 'paused';
alter type public.client_status add value if not exists 'completed';

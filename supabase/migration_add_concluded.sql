-- ==============================================================================
-- MIGRAZIONE: AGGIUNTA COLONNA "is_concluded" PER APPUNTAMENTI CONCLUSI
-- Esegui nel SQL Editor di Supabase:
-- https://supabase.com/dashboard/project/djjcbrtqgzduptiklvoz/sql/new
-- ==============================================================================

alter table appointments add column if not exists is_concluded boolean default false;

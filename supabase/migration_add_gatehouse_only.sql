-- ==============================================================================
-- MIGRAZIONE: AGGIUNTA COLONNA "gatehouse_only" PER VOCI SOLO PORTINERIA
-- Esegui nel SQL Editor di Supabase:
-- https://supabase.com/dashboard/project/djjcbrtqgzduptiklvoz/sql/new
-- ==============================================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS gatehouse_only BOOLEAN DEFAULT false;

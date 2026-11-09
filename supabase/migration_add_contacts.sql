-- ==============================================================================
-- MIGRAZIONE: AGGIUNTA TABELLA "contacts" E REALTIME PER AGENDA SEGRETERIA
-- Da eseguire nel SQL Editor della dashboard Supabase:
-- https://supabase.com/dashboard/project/djjcbrtqgzduptiklvoz/sql/new
-- ==============================================================================

-- 1. Crea la tabella dei contatti anagrafica se non esiste
create table if not exists contacts (
  id text primary key default gen_random_uuid()::text,
  title text default '',
  name text not null,
  phone text default '',
  email text default '',
  company text default '',
  address text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- 2. Assicura che la colonna indirizzo esista
alter table contacts add column if not exists address text default '';

-- 3. Abilita Row Level Security (RLS) e policy pubbliche (lettura e scrittura per la segreteria)
alter table contacts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all read on contacts' and tablename = 'contacts') then
    create policy "Allow all read on contacts" on contacts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow all write on contacts' and tablename = 'contacts') then
    create policy "Allow all write on contacts" on contacts for all using (true);
  end if;
end $$;

-- 4. Aggiungi la tabella alla pubblicazione realtime per aggiornamenti istantanei tra dispositivi
alter publication supabase_realtime add table contacts;

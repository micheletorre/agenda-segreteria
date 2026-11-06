-- ==============================================================================
-- MIGRAZIONE FOGLIO PORTINERIA E ACCESSI AUTORIZZATI
-- Esegui questo script nel SQL Editor di Supabase (Project ID: djjcbrtqgzduptiklvoz)
-- ==============================================================================

-- 1. Aggiunge le colonne per il foglio portineria e il luogo/sede specifica
alter table appointments add column if not exists for_gatehouse boolean default false;
alter table appointments add column if not exists location text default '';

-- 2. (Opzionale) Se la tabella contacts non è ancora stata creata sul cloud:
create table if not exists contacts (
  id text primary key,
  name text not null,
  title text default '',
  phone text default '',
  email text default '',
  company text default '',
  notes text default '',
  created_at timestamptz default now()
);

alter table contacts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'contacts' and policyname = 'Allow all read on contacts'
  ) then
    create policy "Allow all read on contacts" on contacts for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'contacts' and policyname = 'Allow all write on contacts'
  ) then
    create policy "Allow all write on contacts" on contacts for all using (true);
  end if;
end $$;

-- 3. Aggiunge contacts alla pubblicazione realtime
alter publication supabase_realtime add table contacts;

-- ==============================================================================
-- SCHEMA DATABASE SUPABASE PER "AGENDA SEGRETERIA"
-- ==============================================================================

-- 1. Tabella Appuntamenti
create table if not exists appointments (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  time_label text not null,          -- es. 'h 10.00', 'in mattinata', 'a seguire'
  order_index int default 0,
  referent text default '',          -- es. 'MC', 'Giulia', 'Risorg'
  title text not null,               -- es. 'AU riceve D.ssa Canestrari'
  category text not null default 'standard', -- 'standard', 'internal_red', 'external_yellow'
  side_note text default '',         -- es. '(Paolini)', '(Ricci F.)'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Tabella Ferie e Note di Giornata
create table if not exists daily_notes (
  id text primary key default gen_random_uuid()::text,
  start_date date not null,
  end_date date not null,
  note_text text not null,           -- es. 'Andrea Acciari in ferie dal 05.11 al 07.11'
  note_type text not null default 'ferie', -- 'ferie', 'avviso', 'chiusura'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2b. Tabella Contatti Anagrafica
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

alter table contacts add column if not exists address text default '';
alter table contacts enable row level security;
create policy "Allow all read on contacts" on contacts for select using (true);
create policy "Allow all write on contacts" on contacts for all using (true);

-- 3. Abilitazione Row Level Security (RLS) aperta per lettura e scrittura della segreteria
alter table appointments enable row level security;
alter table daily_notes enable row level security;

-- Policy di accesso anonimo/segreteria
create policy "Allow all read on appointments" on appointments for select using (true);
create policy "Allow all write on appointments" on appointments for all using (true);

create policy "Allow all read on daily_notes" on daily_notes for select using (true);
create policy "Allow all write on daily_notes" on daily_notes for all using (true);

-- 4. Abilitazione Realtime sulle tabelle
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table daily_notes;
alter publication supabase_realtime add table contacts;

-- 5. Dati iniziali di test (coincidenti con la scansione)
insert into appointments (id, date, time_label, referent, title, category, side_note) values
  ('app-1', '2026-11-04', 'in mattinata', 'MC', 'DLG impianti per inversione stagionale CDZ', 'standard', '(Paolini)'),
  ('app-2', '2026-11-04', 'h 10.00', 'MC', 'AU riceve D.ssa Canestrari', 'internal_red', ''),
  ('app-3', '2026-11-04', 'h 10.00', 'Giulia', 'sopralluogo bagni e pittura', 'standard', '(Ricci F.)'),
  ('app-4', '2026-11-04', 'a seguire', 'Risorg', 'sopralluogo bagni e pittura', 'standard', '(Ricci F.)'),
  ('app-5', '2026-11-05', 'h 10.00', 'MC', 'AU riceve Dott. Nitoglia', 'internal_red', ''),
  ('app-6', '2026-11-06', 'h 10.00', 'MC', 'AU riceve D.ssa Canestrari', 'internal_red', ''),
  ('app-7', '2026-11-09', 'h 11.45', '', 'AU c/o Dott.ssa Galli', 'external_yellow', ''),
  ('app-8', '2026-11-10', 'h 10.00', 'MC', 'AU riceve Dott. Nitoglia', 'internal_red', ''),
  ('app-9', '2026-11-11', 'h 09.00', '', 'AU c/o Ars Biomedica', 'external_yellow', ''),
  ('app-10', '2026-11-12', 'h 10.00', 'MC', 'AU riceve Dott. Nitoglia', 'internal_red', ''),
  ('app-11', '2026-11-13', 'h 10.00', 'MC', 'AU riceve D.ssa Canestrari', 'internal_red', ''),
  ('app-12', '2026-11-16', 'h 15.00', '', 'AU c/o Dott.ssa Spagnolo', 'external_yellow', ''),
  ('app-13', '2026-11-17', 'h 09.00', '', 'AU c/o Bios Euclide (andare 15 minuti prima)', 'external_yellow', '')
on conflict (id) do nothing;

insert into daily_notes (id, start_date, end_date, note_text, note_type) values
  ('note-1', '2026-11-05', '2026-11-07', 'Andrea Acciari in ferie dal 05.11 al 07.11', 'ferie'),
  ('note-2', '2026-11-16', '2026-11-22', 'Paolo Ferranti in ferie dal 16.11 al 22.11', 'ferie')
on conflict (id) do nothing;

-- Migration : ajoute la table des points d'extraction (4x4, secours).
-- A executer dans le SQL Editor du dashboard Supabase.

create table points_extraction (
  id uuid primary key default gen_random_uuid(),
  lettre text not null,
  libelle text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

alter table points_extraction enable row level security;

create policy "lecture publique points_extraction" on points_extraction for select using (true);

create policy "ecriture organisateur points_extraction" on points_extraction for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

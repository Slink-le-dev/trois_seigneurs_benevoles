-- Migration 019 : nouveau type de poste "Abri temporaire" (coordonnées GPS + capacité d'accueil).

create table abris_temporaires (
  id uuid primary key default gen_random_uuid(),
  numero integer not null,
  nom text not null,
  capacite integer not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

alter table abris_temporaires enable row level security;

create policy "lecture publique abris_temporaires" on abris_temporaires for select using (true);

create policy "ecriture organisateur abris_temporaires" on abris_temporaires for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

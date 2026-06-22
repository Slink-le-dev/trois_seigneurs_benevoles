-- Migration 009 : journal des modifications + commentaires pour les événements de la main courante.

create table main_courante_journal (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references main_courante(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by text not null,
  champ text not null,
  ancienne_valeur text,
  nouvelle_valeur text
);

create table main_courante_commentaires (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references main_courante(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by text not null,
  contenu text not null
);

alter table main_courante_journal enable row level security;
alter table main_courante_commentaires enable row level security;

create policy "lecture organisateur main_courante_journal" on main_courante_journal for select
  using (auth.role() = 'authenticated');
create policy "ecriture organisateur main_courante_journal" on main_courante_journal for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "lecture organisateur main_courante_commentaires" on main_courante_commentaires for select
  using (auth.role() = 'authenticated');
create policy "ecriture organisateur main_courante_commentaires" on main_courante_commentaires for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

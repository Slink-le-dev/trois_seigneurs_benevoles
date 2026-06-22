-- Migration 006 : ajout de la table main_courante pour tracer les événements de l'organisateur

create table main_courante (
  id uuid primary key default gen_random_uuid(),
  date_evenement date not null,
  created_at timestamptz not null default now(),
  created_by text not null,
  updated_at timestamptz,
  updated_by text,
  deleted_at timestamptz,
  deleted_by text,
  poste_origine_id uuid not null references postes(id) on delete restrict,
  benevole_appelant_id uuid not null references benevoles(id) on delete restrict,
  benevole_recepteur_id uuid not null references benevoles(id) on delete restrict,
  course text not null,
  objet text not null,
  dossard text,
  commentaire text,
  abandon boolean not null default false,
  date_depart date,
  lieu_depart text,
  lieu_arrivee_attendue text,
  heure_arrivee_estimee time,
  heure_arrivee_effective time,
  statut text not null default 'en cours'
    check (statut in ('en cours', 'terminé', 'abandonné'))
);

alter table main_courante enable row level security;

create policy "lecture organisateur main_courante" on main_courante for select
  using (auth.role() = 'authenticated');

create policy "ecriture organisateur main_courante" on main_courante for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

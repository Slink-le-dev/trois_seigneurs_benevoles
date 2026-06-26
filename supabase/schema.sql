-- Schema Supabase pour l'application Postes Signaleurs
-- A executer dans l'editeur SQL du dashboard Supabase (SQL Editor > New query > Run)

-- ============================================================
-- Tables
-- ============================================================

create table parcours (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  couleur text not null default '#2563eb',
  distance_km numeric,
  denivele_m numeric,
  gpx_geojson jsonb,
  created_at timestamptz not null default now()
);

create table postes (
  id uuid primary key default gen_random_uuid(),
  numero integer not null,
  nom text not null,
  lat double precision not null,
  lng double precision not null,
  types text[] not null default '{}',
  notes text,
  statut text not null default 'non_active'
    check (statut in ('desactive', 'non_active', 'en_place', 'alerte', 'ferme')),
  statut_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table poste_parcours (
  poste_id uuid not null references postes(id) on delete cascade,
  parcours_id uuid not null references parcours(id) on delete cascade,
  primary key (poste_id, parcours_id)
);

create table benevoles (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  formation text not null default 'aucune'
    check (formation in ('medecin', 'infirmier', 'pompier', 'psc1', 'kinesitherapeute', 'pharmacien', 'aucune')),
  created_at timestamptz not null default now()
);

create table affectations (
  id uuid primary key default gen_random_uuid(),
  benevole_id uuid not null references benevoles(id) on delete cascade,
  poste_id uuid not null references postes(id) on delete cascade,
  heure_debut time,
  heure_fin time,
  created_at timestamptz not null default now()
);

create table points_extraction (
  id uuid primary key default gen_random_uuid(),
  lettre text not null,
  libelle text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create table main_courante (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity unique,
  date_evenement date not null,
  created_at timestamptz not null default now(),
  created_by text not null,
  updated_at timestamptz,
  updated_by text,
  deleted_at timestamptz,
  deleted_by text,
  poste_origine_id uuid not null references postes(id) on delete restrict,
  benevole_appelant_id uuid references benevoles(id) on delete restrict,
  appelant_special text check (appelant_special in ('coureur', 'croix_rouge', 'autre')),
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
  lien_suivi_gps text,
  statut text not null default 'prise en charge en cours'
    check (statut in ('prise en charge en cours', 'pris en charge', 'terminé', 'abandonné')),
  constraint main_courante_appelant_xor
    check ((benevole_appelant_id is not null) <> (appelant_special is not null))
);

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

-- Vue publique des benevoles : expose tout sauf le telephone.
-- Note : les vues Postgres s'executent par defaut avec les droits du proprietaire de la vue
-- (ici le role postgres, qui bypass la RLS), donc cette vue retourne toutes les lignes a
-- n'importe quel role ayant le GRANT SELECT ci-dessous. La confidentialite vient uniquement
-- du fait que la colonne telephone n'est pas selectionnee ici (protection au niveau colonne,
-- pas au niveau ligne) - c'est l'effet recherche : la liste des benevoles reste publique,
-- seul le telephone est cache.
create view benevoles_public as
  select id, nom, created_at from benevoles;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table parcours enable row level security;
alter table postes enable row level security;
alter table poste_parcours enable row level security;
alter table benevoles enable row level security;
alter table affectations enable row level security;
alter table points_extraction enable row level security;
alter table main_courante enable row level security;
alter table main_courante_journal enable row level security;
alter table main_courante_commentaires enable row level security;

-- Lecture publique (anon + authenticated) sur les tables sans donnee sensible
create policy "lecture publique parcours" on parcours for select using (true);
create policy "lecture publique postes" on postes for select using (true);
create policy "lecture publique poste_parcours" on poste_parcours for select using (true);
create policy "lecture publique affectations" on affectations for select using (true);
create policy "lecture publique points_extraction" on points_extraction for select using (true);

-- benevoles : lecture du telephone reservee aux organisateurs connectes.
-- Le public doit utiliser la vue benevoles_public (qui n'expose pas le telephone).
create policy "lecture organisateur benevoles" on benevoles for select
  using (auth.role() = 'authenticated');

grant select on benevoles_public to anon, authenticated;

-- Ecriture (insert/update/delete) reservee aux organisateurs connectes (role authenticated)
create policy "ecriture organisateur parcours" on parcours for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "ecriture organisateur postes" on postes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "ecriture organisateur poste_parcours" on poste_parcours for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "ecriture organisateur benevoles" on benevoles for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "ecriture organisateur affectations" on affectations for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "ecriture organisateur points_extraction" on points_extraction for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "lecture organisateur main_courante" on main_courante for select
  using (auth.role() = 'authenticated');
create policy "ecriture organisateur main_courante" on main_courante for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "lecture organisateur main_courante_journal" on main_courante_journal for select
  using (auth.role() = 'authenticated');
create policy "ecriture organisateur main_courante_journal" on main_courante_journal for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "lecture organisateur main_courante_commentaires" on main_courante_commentaires for select
  using (auth.role() = 'authenticated');
create policy "ecriture organisateur main_courante_commentaires" on main_courante_commentaires for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Note : la policy "ecriture organisateur parcours" ci-dessus couvre aussi le select,
-- mais comme la policy "lecture publique parcours" existe deja avec using(true), les
-- deux policies de select se combinent en OR : le public garde l'acces en lecture.

-- ============================================================
-- Realtime
-- ============================================================

alter publication supabase_realtime add table postes;

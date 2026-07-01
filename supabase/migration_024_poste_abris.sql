create table if not exists poste_abris (
  poste_id uuid not null references postes(id) on delete cascade,
  abri_id  uuid not null references abris_temporaires(id) on delete cascade,
  primary key (poste_id, abri_id)
);

alter table poste_abris enable row level security;

create policy "Lecture publique" on poste_abris
  for select using (true);

create policy "Écriture organisateur" on poste_abris
  for all using (auth.role() = 'authenticated');

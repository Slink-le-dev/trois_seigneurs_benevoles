create table if not exists poste_extractions (
  poste_id      uuid not null references postes(id) on delete cascade,
  extraction_id uuid not null references points_extraction(id) on delete cascade,
  primary key (poste_id, extraction_id)
);

alter table poste_extractions enable row level security;

create policy "Lecture publique" on poste_extractions
  for select using (true);

create policy "Écriture organisateur" on poste_extractions
  for all using (auth.role() = 'authenticated');

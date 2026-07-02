-- Table de paramètres d'affichage (une seule ligne)
create table if not exists app_settings (
  id int primary key default 1,
  show_denivele bool not null default true,
  constraint single_row check (id = 1)
);

insert into app_settings (id, show_denivele)
values (1, true)
on conflict (id) do nothing;

alter table app_settings enable row level security;

create policy "Public read app_settings"
  on app_settings for select using (true);

create policy "Auth update app_settings"
  on app_settings for update using (auth.role() = 'authenticated');

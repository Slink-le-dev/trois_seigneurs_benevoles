-- Migration : rend le telephone des benevoles optionnel.
-- A executer dans le SQL Editor du dashboard Supabase.

alter table benevoles alter column telephone drop not null;

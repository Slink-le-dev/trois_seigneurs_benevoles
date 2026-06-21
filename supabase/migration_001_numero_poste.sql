-- Migration : ajoute un numero de poste modifiable manuellement.
-- A executer une seule fois dans le SQL Editor du dashboard Supabase, sur un projet
-- deja cree avec la version precedente de supabase/schema.sql (table postes sans colonne numero).

alter table postes add column numero integer;

-- Backfill : numerote les postes existants selon leur ordre de creation
update postes
set numero = sub.rn
from (
  select id, row_number() over (order by created_at) as rn
  from postes
) sub
where postes.id = sub.id;

alter table postes alter column numero set not null;

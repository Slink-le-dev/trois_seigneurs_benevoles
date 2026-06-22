-- Migration 011 : numéro de ticket unique pour les évènements de la main courante.

alter table main_courante add column numero integer;

with ordered as (
  select id, row_number() over (order by created_at) as rn
  from main_courante
)
update main_courante m
set numero = ordered.rn
from ordered
where ordered.id = m.id;

create sequence if not exists main_courante_numero_seq;
select setval('main_courante_numero_seq', coalesce((select max(numero) from main_courante), 0) + 1, false);

alter table main_courante alter column numero set default nextval('main_courante_numero_seq');
alter table main_courante alter column numero set not null;
alter table main_courante add constraint main_courante_numero_unique unique (numero);
alter sequence main_courante_numero_seq owned by main_courante.numero;

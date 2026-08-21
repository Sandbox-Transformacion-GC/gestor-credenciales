-- =====================================================================
-- Migración 006: reemplaza los campos fijos "Sitio web" y "¿A qué está
-- atado?" por una lista de pares (nombre + link) que se pueden agregar
-- de a uno con un botón "+".
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- =====================================================================

alter table public.credentials
  add column if not exists links jsonb not null default '[]'::jsonb;

-- Migra los datos existentes a la nueva estructura (una sola vez: si "links" ya
-- tiene algo, no lo toca, para poder re-ejecutar este archivo sin duplicar).
update public.credentials
set links = (
  select coalesce(jsonb_agg(x), '[]'::jsonb)
  from (
    select jsonb_build_object('label', 'Sitio web', 'value', url) as x
    where url is not null and url <> ''
    union all
    select jsonb_build_object('label', 'Atado a', 'value', linked_to) as x
    where linked_to is not null and linked_to <> ''
  ) t
)
where links = '[]'::jsonb
  and ((url is not null and url <> '') or (linked_to is not null and linked_to <> ''));

alter table public.credentials drop column if exists url;
alter table public.credentials drop column if exists linked_to;

-- =====================================================================
-- Fin de la migración 006.
-- =====================================================================

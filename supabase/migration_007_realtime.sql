-- =====================================================================
-- Migración 007: activa actualizaciones en vivo (Supabase Realtime)
-- para que si una persona agrega/edita/elimina una credencial, o el
-- admin cambia las categorías, los demás lo vean sin recargar la
-- página.
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query. Es
-- seguro volver a correrla (revisa antes de agregar cada tabla).
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'credentials'
  ) then
    alter publication supabase_realtime add table public.credentials;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;

-- Nota: Realtime respeta las políticas de RLS que ya existen — cada quien solo
-- recibe eventos de las filas que ya podría ver con un SELECT normal, así que
-- las credenciales restringidas a personas específicas siguen sin filtrarse.

-- =====================================================================
-- Fin de la migración 007.
-- =====================================================================

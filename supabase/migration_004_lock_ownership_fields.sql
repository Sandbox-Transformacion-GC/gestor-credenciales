-- =====================================================================
-- Migración 004: cierra un hueco de seguridad encontrado en auditoría.
--
-- Problema: la policy de UPDATE de "credentials" usa "with check (true)",
-- es decir, cualquiera con permiso para editar una credencial ABIERTA
-- (visible para todo el equipo) podía, llamando directamente a la API
-- de Supabase (sin pasar por la interfaz de la app), cambiar el campo
-- created_by a su propio usuario. Como el trigger que protege el borrado
-- confía en created_by, eso le daba permiso para: 1) borrar esa
-- credencial aunque no fuera suya, y 2) restringir con quién está
-- compartida, ocultándosela al resto del equipo (incluido quien la
-- creó de verdad).
--
-- Esto NO es explotable desde la interfaz normal de la app (la app
-- nunca envía ese campo al editar), pero sí desde una llamada directa
-- a la API con las credenciales de cualquiera de los 3 usuarios. Se
-- cierra a nivel de base de datos, que es donde debe estar la defensa
-- real.
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- =====================================================================

create or replace function public.enforce_credential_delete_permission()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    if not (old.created_by = auth.uid() or public.is_admin()) then
      raise exception 'Solo quien creó esta credencial o un administrador pueden eliminarla.';
    end if;
  end if;

  -- Nadie (salvo un admin) puede reasignar de quién es una credencial.
  if new.created_by is distinct from old.created_by then
    if not public.is_admin() then
      raise exception 'No puedes cambiar quién es el creador de esta credencial.';
    end if;
  end if;

  -- created_at es un dato de auditoría: nunca se toca desde un UPDATE, pase lo que pase.
  new.created_at := old.created_at;

  return new;
end;
$$;

-- El trigger ya existe (se creó en la migración 002) y apunta a esta misma función,
-- así que con reemplazar la función arriba (create or replace) ya queda aplicado.
-- Esta línea es solo para dejarlo explícito y que se pueda re-ejecutar sin error.
drop trigger if exists trg_credentials_delete_permission on public.credentials;
create trigger trg_credentials_delete_permission
  before update on public.credentials
  for each row execute procedure public.enforce_credential_delete_permission();

-- =====================================================================
-- Fin de la migración 004.
-- =====================================================================

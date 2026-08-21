-- =====================================================================
-- Migración 004: evita que created_by/created_at de "credentials" se
-- puedan modificar desde un UPDATE (solo un admin puede reasignar
-- created_by). Sin esto, alguien con permiso de edición sobre una
-- credencial abierta podía apropiarse de ella vía la API directa.
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

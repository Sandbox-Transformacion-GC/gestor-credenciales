-- =====================================================================
-- Migración 008: corrige comparación de mayúsculas/minúsculas en la
-- lista blanca de registro. El trigger comparaba el correo nuevo (en
-- minúsculas) contra el valor guardado tal cual se escribió en
-- allowed_signup_emails — si se insertó con mayúsculas, nunca hacía
-- match y el alta fallaba con "Database error creating new user".
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- =====================================================================

-- Normaliza lo que ya esté guardado.
update public.allowed_signup_emails set email = lower(email);

create or replace function public.enforce_allowed_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_signup_emails where lower(email) = lower(new.email)
  ) then
    raise exception 'Registro no permitido: este correo no está autorizado. Contacta al administrador del equipo.';
  end if;
  return new;
end;
$$;

-- =====================================================================
-- Fin de la migración 008.
-- =====================================================================

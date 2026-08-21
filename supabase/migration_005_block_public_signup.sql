-- =====================================================================
-- Migración 005: bloquea el registro público a nivel de base de datos.
--
-- Motivo: en esta versión del dashboard de Supabase, "Enable email
-- provider" controla LOGIN y REGISTRO juntos — no existe un switch
-- separado para permitir solo login. Como el login tiene que
-- funcionar, no se puede simplemente apagar ese switch.
--
-- En vez de depender de un ajuste del dashboard, esto agrega una
-- "lista blanca" de correos permitidos y un trigger que rechaza
-- CUALQUIER registro (así sea por la API pública, sin pasar por el
-- dashboard) cuyo correo no esté en esa lista. Funciona sin importar
-- cómo esté configurado "Enable email provider".
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- =====================================================================

create table if not exists public.allowed_signup_emails (
  email text primary key,
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles (id)
);

alter table public.allowed_signup_emails enable row level security;

drop policy if exists "allowed_signup_emails: solo el admin ve la lista" on public.allowed_signup_emails;
create policy "allowed_signup_emails: solo el admin ve la lista"
  on public.allowed_signup_emails for select
  to authenticated
  using (public.is_admin());

drop policy if exists "allowed_signup_emails: solo el admin agrega" on public.allowed_signup_emails;
create policy "allowed_signup_emails: solo el admin agrega"
  on public.allowed_signup_emails for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "allowed_signup_emails: solo el admin quita" on public.allowed_signup_emails;
create policy "allowed_signup_emails: solo el admin quita"
  on public.allowed_signup_emails for delete
  to authenticated
  using (public.is_admin());

-- Deja pre-aprobadas a las cuentas que YA existen hoy (para no bloquearlas por accidente).
insert into public.allowed_signup_emails (email)
select lower(email) from auth.users
on conflict (email) do nothing;

create or replace function public.enforce_allowed_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_signup_emails where email = lower(new.email)
  ) then
    raise exception 'Registro no permitido: este correo no está autorizado. Contacta al administrador del equipo.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_allowed_signup on auth.users;
create trigger trg_enforce_allowed_signup
  before insert on auth.users
  for each row execute procedure public.enforce_allowed_signup();

-- =====================================================================
-- Para agregar a una 4ta persona en el futuro:
--   1) En el SQL Editor: insert into public.allowed_signup_emails (email)
--      values ('correo@dominio.com');
--   2) RECIÉN DESPUÉS créala en Authentication -> Users -> Add user.
-- Si te saltas el paso 1, la creación del usuario va a fallar con el
-- mensaje de "Registro no permitido" de arriba (funcionando como debe).
-- =====================================================================

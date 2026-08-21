-- =====================================================================
-- Esquema de base de datos para el Gestor de Credenciales
-- Ejecutar completo en: Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) profiles: un perfil por cada usuario de auth.users (uno de los 3).
--    Se llena solo mediante el trigger de más abajo cuando invitas a alguien.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: cualquier usuario autenticado puede ver a los demás"
  on public.profiles for select
  to authenticated
  using (true);

-- Crea automáticamente un profile cuando se crea un usuario en auth.users
-- (esto ocurre cuando lo invitas desde el dashboard de Supabase).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2) vault_meta: fila única con la sal y un "valor de verificación" que
--    permite confirmar que la clave maestra ingresada es correcta, SIN
--    almacenar la clave maestra en ningún momento. El cifrado real de
--    cada contraseña ocurre en el navegador (ver src/lib/crypto.ts).
-- ---------------------------------------------------------------------
create table if not exists public.vault_meta (
  id boolean primary key default true,
  constraint vault_meta_single_row check (id),
  salt text not null,
  check_cipher text not null,
  check_iv text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.vault_meta enable row level security;

create policy "vault_meta: usuarios autenticados pueden leer"
  on public.vault_meta for select
  to authenticated
  using (true);

create policy "vault_meta: usuarios autenticados pueden crear/inicializar"
  on public.vault_meta for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------
-- 3) credentials: las credenciales guardadas (bóveda compartida entre
--    los 3 usuarios). El campo password_cipher/password_iv contiene la
--    contraseña YA cifrada por el navegador; el servidor nunca ve el
--    texto plano.
-- ---------------------------------------------------------------------
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  email text not null default '',
  password_cipher text not null,
  password_iv text not null,
  url text default '',
  category text not null default 'Otro',
  linked_to text default '',
  notes text default '',
  owner_id uuid references public.profiles (id),
  is_favorite boolean not null default false,
  created_by uuid not null references public.profiles (id) default auth.uid(),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists credentials_deleted_at_idx on public.credentials (deleted_at);
create index if not exists credentials_owner_idx on public.credentials (owner_id);
create index if not exists credentials_category_idx on public.credentials (category);

alter table public.credentials enable row level security;

create policy "credentials: los 3 usuarios ven toda la bóveda"
  on public.credentials for select
  to authenticated
  using (true);

create policy "credentials: los 3 usuarios pueden crear"
  on public.credentials for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "credentials: los 3 usuarios pueden editar"
  on public.credentials for update
  to authenticated
  using (true)
  with check (true);

create policy "credentials: los 3 usuarios pueden borrar (soft delete recomendado desde la app)"
  on public.credentials for delete
  to authenticated
  using (true);

-- Mantiene updated_at / updated_by al día automáticamente en cada UPDATE.
create or replace function public.set_credentials_audit_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_credentials_audit on public.credentials;
create trigger trg_credentials_audit
  before update on public.credentials
  for each row execute procedure public.set_credentials_audit_fields();

-- ---------------------------------------------------------------------
-- 4) audit_log: registro simple de quién hizo qué y cuándo, útil si
--    alguna vez necesitas revisar el historial de accesos/cambios.
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  action text not null,
  credential_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log: usuarios autenticados pueden leer"
  on public.audit_log for select
  to authenticated
  using (true);

create policy "audit_log: usuarios autenticados pueden insertar sus propias entradas"
  on public.audit_log for insert
  to authenticated
  with check (actor_id = auth.uid());

-- =====================================================================
-- Fin del esquema. Siguiente paso: en el dashboard de Supabase, ve a
-- Authentication -> Providers -> Email y desactiva "Allow new users to
-- sign up". Luego invita a las 3 personas desde Authentication -> Users
-- -> Invite user (ver README.md para el paso a paso completo).
-- =====================================================================

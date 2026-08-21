-- =====================================================================
-- Migración 002: roles (admin/miembro), categorías editables desde la
-- app, y compartir credenciales con personas específicas.
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
-- Es seguro volver a correrla si algo falla a la mitad (usa
-- "if not exists" / "drop ... if exists" en todos lados).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Rol de cada perfil: 'admin' o 'member'.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('admin', 'member'));

-- Marca como admin a la cuenta indicada. Si esta persona todavía no
-- tiene cuenta creada en Authentication -> Users, corre esta línea de
-- nuevo después de crearla.
update public.profiles set role = 'admin' where email = 'admin@alfinbanco.pe';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 2) Categorías editables (antes estaban fijas en el código).
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default 'slate',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories: usuarios autenticados pueden leer" on public.categories;
create policy "categories: usuarios autenticados pueden leer"
  on public.categories for select
  to authenticated
  using (true);

drop policy if exists "categories: solo admin puede crear" on public.categories;
create policy "categories: solo admin puede crear"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "categories: solo admin puede editar" on public.categories;
create policy "categories: solo admin puede editar"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "categories: solo admin puede eliminar" on public.categories;
create policy "categories: solo admin puede eliminar"
  on public.categories for delete
  to authenticated
  using (public.is_admin());

-- Semilla con las categorías que ya venían fijas en el código, para no
-- perder nada al migrar. Si ya insertaste alguna con el mismo nombre,
-- se ignora gracias a "on conflict".
insert into public.categories (name, color, sort_order) values
  ('Correo', 'sky', 1),
  ('Banco', 'emerald', 2),
  ('Streaming', 'fuchsia', 3),
  ('Redes Sociales', 'pink', 4),
  ('Trabajo', 'amber', 5),
  ('Dominios/Hosting', 'indigo', 6),
  ('Compras', 'orange', 7),
  ('Otro', 'slate', 8)
on conflict (name) do nothing;

-- credentials.category pasa a ser texto libre igual que antes (ya lo
-- era); simplemente ahora la lista de opciones sale de esta tabla en
-- vez de estar fija en el código del frontend.

-- ---------------------------------------------------------------------
-- 3) Compartir credenciales con personas específicas.
--    Si una credencial NO tiene filas en credential_viewers, se
--    considera abierta a todo el equipo (comportamiento actual). En
--    cuanto el creador (o el admin) agrega al menos una persona aquí,
--    la credencial solo la ven: el creador, el admin, y las personas
--    listadas.
-- ---------------------------------------------------------------------
create table if not exists public.credential_viewers (
  credential_id uuid not null references public.credentials (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (credential_id, profile_id)
);

alter table public.credential_viewers enable row level security;

-- Con solo 3 personas de confianza en el equipo, no es un problema que
-- cualquiera vea QUIÉN tiene acceso a qué credencial (ya lo sabrían con
-- solo preguntar); lo sensible -la contraseña en sí- sigue protegido
-- por la policy de "credentials" más abajo y por el cifrado.
drop policy if exists "credential_viewers: usuarios autenticados pueden leer" on public.credential_viewers;
create policy "credential_viewers: usuarios autenticados pueden leer"
  on public.credential_viewers for select
  to authenticated
  using (true);

-- IMPORTANTE: esto va como 3 policies separadas (insert/update/delete) y NO como
-- "for all", porque "for all" también cubre SELECT: si el SELECT de aquí volviera a
-- consultar "credentials", y el SELECT de "credentials" vuelve a consultar esta
-- tabla, Postgres entra en recursión infinita ("infinite recursion detected in
-- policy for relation credential_viewers"). Al dejar el SELECT únicamente con la
-- policy plana de arriba (using true, sin tocar otras tablas), se corta el ciclo.
drop policy if exists "credential_viewers: solo el creador o el admin gestionan" on public.credential_viewers;

drop policy if exists "credential_viewers: solo el creador o el admin insertan" on public.credential_viewers;
create policy "credential_viewers: solo el creador o el admin insertan"
  on public.credential_viewers for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.credentials c
      where c.id = credential_viewers.credential_id and c.created_by = auth.uid()
    )
  );

drop policy if exists "credential_viewers: solo el creador o el admin actualizan" on public.credential_viewers;
create policy "credential_viewers: solo el creador o el admin actualizan"
  on public.credential_viewers for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.credentials c
      where c.id = credential_viewers.credential_id and c.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.credentials c
      where c.id = credential_viewers.credential_id and c.created_by = auth.uid()
    )
  );

drop policy if exists "credential_viewers: solo el creador o el admin eliminan" on public.credential_viewers;
create policy "credential_viewers: solo el creador o el admin eliminan"
  on public.credential_viewers for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.credentials c
      where c.id = credential_viewers.credential_id and c.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 4) Nuevas reglas de acceso para "credentials":
--    - Ver: el creador, el admin, alguien listado en credential_viewers,
--      o cualquiera si la credencial no tiene restricciones.
--    - Editar (campos normales, ej. rotar la contraseña): igual que ver.
--    - Eliminar: SOLO el creador o el admin (nadie más puede borrar la
--      credencial de otra persona).
-- ---------------------------------------------------------------------
drop policy if exists "credentials: los 3 usuarios ven toda la bóveda" on public.credentials;
drop policy if exists "credentials: ver según permisos" on public.credentials;
create policy "credentials: ver según permisos"
  on public.credentials for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.credential_viewers cv
      where cv.credential_id = credentials.id and cv.profile_id = auth.uid()
    )
    or not exists (
      select 1 from public.credential_viewers cv where cv.credential_id = credentials.id
    )
  );

drop policy if exists "credentials: los 3 usuarios pueden editar" on public.credentials;
drop policy if exists "credentials: editar según permisos" on public.credentials;
create policy "credentials: editar según permisos"
  on public.credentials for update
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.credential_viewers cv
      where cv.credential_id = credentials.id and cv.profile_id = auth.uid()
    )
    or not exists (
      select 1 from public.credential_viewers cv where cv.credential_id = credentials.id
    )
  )
  with check (true);

drop policy if exists "credentials: los 3 usuarios pueden borrar (soft delete recomendado desde la app)" on public.credentials;
drop policy if exists "credentials: solo el creador o el admin pueden borrar" on public.credentials;
create policy "credentials: solo el creador o el admin pueden borrar"
  on public.credentials for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 5) La app "elimina" una credencial marcando deleted_at (papelera
--    lógica), lo cual técnicamente es un UPDATE, no un DELETE. La
--    policy del punto 4 sobre DELETE no alcanza a cubrir eso, así que
--    esta protección se refuerza aquí con un trigger: si alguien que
--    no es el creador ni el admin intenta cambiar deleted_at, se
--    rechaza la operación (aunque pueda editar otros campos).
-- ---------------------------------------------------------------------
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
  return new;
end;
$$;

drop trigger if exists trg_credentials_delete_permission on public.credentials;
create trigger trg_credentials_delete_permission
  before update on public.credentials
  for each row execute procedure public.enforce_credential_delete_permission();

-- =====================================================================
-- Fin de la migración 002.
-- =====================================================================

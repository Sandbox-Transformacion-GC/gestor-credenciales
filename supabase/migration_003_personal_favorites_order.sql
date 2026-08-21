-- =====================================================================
-- Migración 003: favoritos y orden personalizados POR PERSONA.
--
-- Hasta ahora "favorito" era una sola columna compartida (si uno la
-- marcaba, la veían los 3 marcada). Esto la separa por usuario: cada
-- quien tiene su propia lista de favoritos y puede arrastrar las
-- tarjetas para ordenarlas a su gusto, sin afectar lo que ven los
-- demás.
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query (después
-- de la migración 002). Es seguro volver a correrla si algo falla a
-- la mitad.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Favoritos personales.
-- ---------------------------------------------------------------------
create table if not exists public.credential_favorites (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  credential_id uuid not null references public.credentials (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, credential_id)
);

alter table public.credential_favorites enable row level security;

drop policy if exists "credential_favorites: cada quien ve y gestiona los suyos" on public.credential_favorites;
create policy "credential_favorites: cada quien ve y gestiona los suyos"
  on public.credential_favorites for all
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Migra lo que ya estaba marcado como favorito (columna vieja y
-- compartida) como favorito personal de quien creó cada credencial,
-- para no perder esa información. Ajusta esto si prefieres empezar
-- todos desde cero.
insert into public.credential_favorites (profile_id, credential_id)
select created_by, id from public.credentials where is_favorite = true
on conflict do nothing;

alter table public.credentials drop column if exists is_favorite;

-- ---------------------------------------------------------------------
-- 2) Orden personalizado (arrastrar y soltar) por persona.
--    "position" es simplemente un número; entre más chico, más arriba
--    aparece en la lista de esa persona. La app reasigna estos números
--    cada vez que alguien reordena.
-- ---------------------------------------------------------------------
create table if not exists public.credential_positions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  credential_id uuid not null references public.credentials (id) on delete cascade,
  position double precision not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, credential_id)
);

alter table public.credential_positions enable row level security;

drop policy if exists "credential_positions: cada quien ve y gestiona el suyo" on public.credential_positions;
create policy "credential_positions: cada quien ve y gestiona el suyo"
  on public.credential_positions for all
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- =====================================================================
-- Fin de la migración 003.
-- =====================================================================

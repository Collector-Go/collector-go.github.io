-- =====================================================================
-- Collector Go · base de datos (Supabase / Postgres)
-- Versión del esquema: 1
-- Se pega completo en Supabase → SQL Editor → Run.
-- Es seguro volver a ejecutarlo: no borra datos.
-- =====================================================================

-- Límite de categorías por perfil (si lo cambias aquí, cámbialo también
-- en config.js → MAX_CATEGORIAS)
create or replace function public.max_categorias() returns int
language sql immutable as $$ select 5 $$;

-- ---------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  bio          text check (bio is null or char_length(bio) <= 120),
  avatar       text not null default 'user',
  avatar_color text not null default '#C4532F' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_admin     boolean not null default false,
  blocked      boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 30),
  icon       text not null,
  color      text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.finds (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id  uuid not null,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  note         text check (note is null or char_length(note) <= 140),
  is_private   boolean not null default false,
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  accuracy     real,
  colonia      text check (colonia is null or char_length(colonia) <= 80),
  photo        text,
  thumb        text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- la categoría tiene que ser del mismo dueño; no se puede borrar una
  -- categoría que todavía tiene hallazgos
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete restrict
);
create index if not exists finds_latlng_idx  on public.finds (lat, lng);
create index if not exists finds_created_idx on public.finds (created_at desc);
create index if not exists finds_user_idx    on public.finds (user_id);

create table if not exists public.sightings (   -- reencuentros
  id         uuid primary key default gen_random_uuid(),
  find_id    uuid not null references public.finds(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  lat        double precision check (lat between -90 and 90),
  lng        double precision check (lng between -180 and 180),
  created_at timestamptz not null default now()
);
create index if not exists sightings_find_idx on public.sightings (find_id);

create table if not exists public.reactions (
  find_id    uuid not null references public.finds(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('heart','star','flame','eye')),
  created_at timestamptz not null default now(),
  primary key (find_id, user_id, kind)
);

create table if not exists public.reports (      -- avisos a moderación
  find_id    uuid not null references public.finds(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (find_id, user_id)
);

-- ---------------------------------------------------------------------
-- FUNCIONES DE APOYO (leen el perfil sin pasar por las reglas)
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_blocked(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select blocked from public.profiles where id = uid), false)
$$;

-- ---------------------------------------------------------------------
-- DISPARADORES
-- ---------------------------------------------------------------------
-- Máximo de categorías por perfil
create or replace function public.check_max_categorias() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.categories where user_id = new.user_id) >= public.max_categorias() then
    raise exception 'MAX_CATEGORIAS' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists categories_max on public.categories;
create trigger categories_max before insert on public.categories
  for each row execute function public.check_max_categorias();

-- Nadie se da a sí mismo permisos de administración ni se desbloquea.
-- Una administradora solo puede cambiar "blocked" de otras personas.
create or replace function public.protect_profile() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;          -- SQL Editor / servidor
  if tg_op = 'INSERT' then
    new.is_admin := false; new.blocked := false; return new;
  end if;
  if new.id <> old.id then raise exception 'NO_PERMITIDO'; end if;
  if auth.uid() = old.id then
    if new.is_admin <> old.is_admin or new.blocked <> old.blocked then
      raise exception 'NO_PERMITIDO';
    end if;
  else
    if not public.is_admin()
       or new.name <> old.name or new.bio is distinct from old.bio
       or new.avatar <> old.avatar or new.avatar_color <> old.avatar_color
       or new.is_admin <> old.is_admin then
      raise exception 'NO_PERMITIDO';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before insert or update on public.profiles
  for each row execute function public.protect_profile();

-- Fechas y dueño de un hallazgo no se editan
create or replace function public.protect_find() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists finds_protect on public.finds;
create trigger finds_protect before update on public.finds
  for each row execute function public.protect_find();

-- Un reencuentro actualiza la fecha "última vez visto"
create or replace function public.touch_find() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.finds set last_seen_at = new.created_at where id = new.find_id;
  return new;
end $$;
drop trigger if exists sightings_touch on public.sightings;
create trigger sightings_touch after insert on public.sightings
  for each row execute function public.touch_find();

-- ---------------------------------------------------------------------
-- REGLAS DE ACCESO (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.finds      enable row level security;
alter table public.sightings  enable row level security;
alter table public.reactions  enable row level security;
alter table public.reports    enable row level security;

-- Perfiles: todos los ven; cada quien crea y edita el suyo;
-- la administradora puede bloquear.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Categorías: todos las ven; cada quien administra las suyas
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select to authenticated using (true);
drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories for insert to authenticated
  with check (user_id = auth.uid() and not public.is_blocked());
drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories for delete to authenticated using (user_id = auth.uid());

-- Hallazgos: los privados solo los ve su dueño (ni la administradora).
-- Los de personas bloqueadas solo los ven su dueño y la administradora.
drop policy if exists finds_select on public.finds;
create policy finds_select on public.finds for select to authenticated using (
  user_id = auth.uid()
  or (not is_private and (not public.is_blocked(user_id) or public.is_admin()))
);
drop policy if exists finds_insert on public.finds;
create policy finds_insert on public.finds for insert to authenticated
  with check (user_id = auth.uid() and not public.is_blocked());
drop policy if exists finds_update on public.finds;
create policy finds_update on public.finds for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists finds_delete on public.finds;
create policy finds_delete on public.finds for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Reencuentros: solo el dueño del hallazgo los registra
drop policy if exists sightings_select on public.sightings;
create policy sightings_select on public.sightings for select to authenticated
  using (exists (select 1 from public.finds f where f.id = find_id));
drop policy if exists sightings_insert on public.sightings;
create policy sightings_insert on public.sightings for insert to authenticated
  with check (user_id = auth.uid() and not public.is_blocked()
    and exists (select 1 from public.finds f where f.id = find_id and f.user_id = auth.uid()));
drop policy if exists sightings_delete on public.sightings;
create policy sightings_delete on public.sightings for delete to authenticated using (user_id = auth.uid());

-- Reacciones: solo a hallazgos públicos de otras personas
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions for select to authenticated
  using (exists (select 1 from public.finds f where f.id = find_id));
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and not public.is_blocked()
    and exists (select 1 from public.finds f where f.id = find_id
                and not f.is_private and f.user_id <> auth.uid()));
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

-- Avisos: cualquiera avisa sobre un hallazgo público; solo la
-- administradora los ve y los descarta
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated using (public.is_admin());
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.finds f where f.id = find_id and not f.is_private));
drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports for delete to authenticated using (public.is_admin());

-- Permisos: solo personas con sesión iniciada
revoke all on public.profiles, public.categories, public.finds, public.sightings,
              public.reactions, public.reports from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.finds to authenticated;
grant select, insert, delete on public.sightings, public.reactions, public.reports to authenticated;

-- ---------------------------------------------------------------------
-- VISTA DE TARJETAS (lo que leen el mapa, el muro y las colecciones)
-- security_invoker: respeta las mismas reglas de arriba
-- ---------------------------------------------------------------------
drop view if exists public.find_cards;
create view public.find_cards with (security_invoker = true) as
select
  f.id, f.user_id, f.category_id, f.name, f.note, f.is_private,
  f.lat, f.lng, f.accuracy, f.colonia, f.photo, f.thumb,
  f.created_at, f.last_seen_at,
  p.name  as user_name, p.avatar, p.avatar_color,
  c.name  as cat_name,  c.icon as cat_icon, c.color as cat_color,
  coalesce((select jsonb_object_agg(kind, n) from
             (select r.kind, count(*) n from public.reactions r
               where r.find_id = f.id group by r.kind) s), '{}'::jsonb) as reactions,
  coalesce((select array_agg(r.kind) from public.reactions r
             where r.find_id = f.id and r.user_id = auth.uid()), '{}'::text[]) as my_reactions,
  (select count(*) from public.sightings s where s.find_id = f.id) as sightings_count
from public.finds f
join public.profiles   p on p.id = f.user_id
join public.categories c on c.id = f.category_id;
revoke all on public.find_cards from anon;
grant select on public.find_cards to authenticated;

-- ---------------------------------------------------------------------
-- ESTADÍSTICAS DEL JUEGO
-- ---------------------------------------------------------------------
-- Récords de un perfil. Si es el tuyo cuenta también lo privado;
-- si es de otra persona, solo lo público (lo deciden las reglas).
create or replace function public.profile_stats(p_uid uuid, tz text default 'America/Mexico_City')
returns jsonb language sql stable as $$
with f as (
  select * from public.finds where user_id = p_uid
),
cats as (
  select c.id, c.name, c.icon, c.color, c.created_at,
         (select count(*) from f where f.category_id = c.id) as total
  from public.categories c where c.user_id = p_uid
),
col as (
  select colonia, min(created_at) as first_at, count(*) n
  from f where colonia is not null group by colonia
),
dias as (
  select (created_at at time zone tz)::date as d, count(*) n from f group by 1
),
semanas as (
  select distinct date_trunc('week', created_at at time zone tz)::date as wk from f
),
g as (select wk, wk - (row_number() over (order by wk))::int * 7 as grp from semanas),
rachas as (select count(*) len, max(wk) last from g group by grp)
select jsonb_build_object(
  'total',         (select count(*) from f),
  'publicos',      (select count(*) from f where not is_private),
  'categorias',    coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'icon',icon,'color',color,'total',total) order by created_at) from cats), '[]'::jsonb),
  'colonias',      coalesce((select jsonb_agg(jsonb_build_object('colonia',colonia,'first_at',first_at,'n',n) order by first_at) from col), '[]'::jsonb),
  'mejor_dia',     (select jsonb_build_object('fecha', d, 'n', n) from dias order by n desc, d asc limit 1),
  'racha_mejor',   coalesce((select max(len) from rachas), 0),
  'racha_actual',  coalesce((select max(len) from rachas
                     where last >= date_trunc('week', now() at time zone tz)::date - 7), 0),
  'reencuentros',  (select count(*) from public.sightings s join f on f.id = s.find_id),
  'reacciones',    (select count(*) from public.reactions r join f on f.id = r.find_id)
)
$$;
grant execute on function public.profile_stats(uuid, text) to authenticated;

-- Tabla general: solo cuenta hallazgos públicos de perfiles no bloqueados
create or replace function public.leaderboard(metric text default 'total', lim int default 30)
returns table (user_id uuid, name text, avatar text, avatar_color text, total bigint, colonias bigint)
language sql stable as $$
  select p.id, p.name, p.avatar, p.avatar_color,
         count(f.id) as total, count(distinct f.colonia) as colonias
  from public.profiles p
  join public.finds f on f.user_id = p.id and not f.is_private
  where not p.blocked
  group by p.id
  order by case when metric = 'colonias' then count(distinct f.colonia) else count(f.id) end desc,
           count(f.id) desc, p.created_at asc
  limit least(greatest(lim, 1), 100)
$$;
grant execute on function public.leaderboard(text, int) to authenticated;

-- ---------------------------------------------------------------------
-- FOTOS (Supabase Storage)
-- Carpeta por persona: fotos/<id-de-usuario>/<archivo>.
-- El bucket es público para que las fotos carguen rápido y queden en
-- caché; los nombres de archivo son aleatorios e imposibles de adivinar
-- y nadie puede listar carpetas ajenas.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/webp','image/jpeg','image/png'];

drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text
              and not public.is_blocked());
drop policy if exists fotos_select on storage.objects;
create policy fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

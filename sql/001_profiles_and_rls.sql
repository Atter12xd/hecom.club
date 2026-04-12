-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (todo el bloque o por secciones).
-- Requiere: Authentication ya habilitado (auth.users existe por defecto).
-- =============================================================================

-- Perfil público ligado a cada usuario de Auth
create table if not exists public.profiles (
    id uuid not null references auth.users (id) on delete cascade,
    email text,
    full_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_pkey primary key (id)
);

comment on table public.profiles is 'Perfil de app; una fila por auth.users';

-- Actualizar updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row
    execute procedure public.set_updated_at();

-- Al registrarse vía Auth, crear fila en profiles (email desde raw_user_meta_data opcional)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Opcional: permitir insert solo al servicio / triggers (ya inserta handle_new_user con security definer)
-- No policy insert para anon: el trigger cubre altas desde Auth.

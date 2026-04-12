-- =============================================================================
-- Opcional: si creaste profiles después de que ya hubiera usuarios en Auth
-- =============================================================================

insert into public.profiles (id, email, full_name)
select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

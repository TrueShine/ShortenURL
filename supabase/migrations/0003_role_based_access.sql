-- Role split: super_admin (all links + account management) vs admin
-- (own links only, no account management). Single-admin era ends here —
-- see 0002_admin_full_visibility.sql for the "any authenticated user is
-- the admin" policies this migration replaces.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- security definer so link/click policies below can call this without
-- recursing back into profiles' own RLS (and without granting callers
-- direct SELECT on other people's profile rows).
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- Seed exactly the current operator account as super_admin — NOT every row
-- in auth.users. Replace v_operator_email below with the real login email
-- (check the Supabase dashboard) before running this migration. The DO
-- block hard-fails if it matches nobody, so a stale placeholder can't
-- silently leave zero super_admins or, worse, silently promote the wrong
-- account.
do $$
declare
  v_operator_email text := 'REPLACE_WITH_OPERATOR_EMAIL';
  v_seeded integer;
begin
  insert into public.profiles (id, role, must_change_password)
  select id, 'super_admin', false
  from auth.users
  where email = v_operator_email
  on conflict (id) do nothing;

  get diagnostics v_seeded = row_count;

  if v_seeded = 0 then
    raise exception
      'super_admin seed matched 0 rows for email %. Edit v_operator_email in this migration to the real operator email (see Supabase dashboard > Authentication > Users) before running.',
      v_operator_email;
  end if;
end $$;

-- Profiles are only ever written via the service-role client (account
-- creation, password-change flow) — no INSERT/UPDATE/DELETE policy is
-- defined here on purpose, since an RLS policy can't restrict which
-- *columns* a self-update touches and "self updates must_change_password"
-- would also let a row update its own role.
create policy "self selects own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "super_admin selects all profiles"
  on public.profiles for select
  to authenticated
  using (public.current_user_role() = 'super_admin');

-- Replace 0002's "any authenticated user sees/edits everything" policies
-- with role scoping: super_admin keeps full access, admin is limited to
-- links.created_by = auth.uid() (pre-existing anonymous links, where
-- created_by is null, are super_admin-only as a result).
drop policy if exists "admin selects all links" on public.links;
drop policy if exists "admin updates all links" on public.links;
drop policy if exists "admin deletes all links" on public.links;
drop policy if exists "admin selects all clicks" on public.clicks;

create policy "admin selects links"
  on public.links for select
  to authenticated
  using (public.current_user_role() = 'super_admin' or created_by = auth.uid());

create policy "admin updates links"
  on public.links for update
  to authenticated
  using (public.current_user_role() = 'super_admin' or created_by = auth.uid())
  with check (public.current_user_role() = 'super_admin' or created_by = auth.uid());

create policy "admin deletes links"
  on public.links for delete
  to authenticated
  using (public.current_user_role() = 'super_admin' or created_by = auth.uid());

create policy "admin selects clicks"
  on public.clicks for select
  to authenticated
  using (
    public.current_user_role() = 'super_admin'
    or exists (
      select 1 from public.links
      where links.id = clicks.link_id
      and links.created_by = auth.uid()
    )
  );

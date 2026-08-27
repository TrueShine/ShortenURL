-- Role split: super_admin (all links + account management) vs admin
-- (own links only, no account management). Single-admin era ends here —
-- see 0002_admin_full_visibility.sql for the "any authenticated user is
-- the admin" policies this migration replaces.
--
-- Wrapped in an explicit transaction so this is atomic regardless of how
-- the SQL client executes multi-statement scripts (e.g. per-statement
-- autocommit) — if the operator seed below can't be applied unambiguously,
-- everything in this file rolls back rather than partially applying.
begin;

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
-- in auth.users. This app has been documented as single-admin since
-- 0002 (see its header comment), so instead of hardcoding a specific
-- email/UUID (a PII value that would otherwise sit in git history for no
-- real benefit), this asserts that premise still holds: exactly one
-- auth.users row exists, and that row is the one seeded. If it doesn't
-- hold (zero, or more than one), the whole migration rolls back with an
-- explicit error rather than guessing which account is the operator.
do $$
declare
  v_user_count integer;
  v_operator_id uuid;
begin
  select count(*) into v_user_count from auth.users;

  if v_user_count <> 1 then
    raise exception
      'Expected exactly 1 existing auth.users row to seed as super_admin (single-admin app), found %. Seed the operator account explicitly (edit this block to filter by the real id/email) instead of running it unmodified against a multi-account project.',
      v_user_count;
  end if;

  select id into v_operator_id from auth.users limit 1;

  insert into public.profiles (id, role, must_change_password)
  values (v_operator_id, 'super_admin', false)
  on conflict (id) do nothing;
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

commit;

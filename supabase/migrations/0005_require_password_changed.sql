-- Close a gap QA found while reviewing PR3 (force-password-change): an
-- account with must_change_password=true was only blocked from /_admin by
-- proxy.ts (Next.js middleware) — it could still create/read/update/delete
-- its own links by calling the Supabase REST API directly (0004's
-- role-only RLS lets any recognized role through) or by hitting
-- api/links/route.ts's custom-alias path before ever visiting /_admin.
-- Add a DB-level requirement that the flag is cleared, matching the app's
-- "finish changing your password before doing anything else" intent.
begin;

create or replace function public.current_user_must_change_password()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  -- No profile row is treated the same as "must change" (true) — fail
  -- closed, consistent with current_user_role() returning null for the
  -- same case and every links/clicks policy already rejecting a null role.
  select coalesce(
    (select must_change_password from public.profiles where id = auth.uid()),
    true
  );
$$;

revoke all on function public.current_user_must_change_password() from public;
grant execute on function public.current_user_must_change_password() to authenticated;

drop policy if exists "admin inserts own links" on public.links;
drop policy if exists "admin selects links" on public.links;
drop policy if exists "admin updates links" on public.links;
drop policy if exists "admin deletes links" on public.links;
drop policy if exists "admin selects clicks" on public.clicks;

create policy "admin inserts own links"
  on public.links for insert
  to authenticated
  with check (
    not public.current_user_must_change_password()
    and (
      public.current_user_role() = 'super_admin'
      or (public.current_user_role() = 'admin' and created_by = auth.uid())
    )
  );

create policy "admin selects links"
  on public.links for select
  to authenticated
  using (
    not public.current_user_must_change_password()
    and (
      public.current_user_role() = 'super_admin'
      or (public.current_user_role() = 'admin' and created_by = auth.uid())
    )
  );

create policy "admin updates links"
  on public.links for update
  to authenticated
  using (
    not public.current_user_must_change_password()
    and (
      public.current_user_role() = 'super_admin'
      or (public.current_user_role() = 'admin' and created_by = auth.uid())
    )
  )
  with check (
    not public.current_user_must_change_password()
    and (
      public.current_user_role() = 'super_admin'
      or (public.current_user_role() = 'admin' and created_by = auth.uid())
    )
  );

create policy "admin deletes links"
  on public.links for delete
  to authenticated
  using (
    not public.current_user_must_change_password()
    and (
      public.current_user_role() = 'super_admin'
      or (public.current_user_role() = 'admin' and created_by = auth.uid())
    )
  );

create policy "admin selects clicks"
  on public.clicks for select
  to authenticated
  using (
    not public.current_user_must_change_password()
    and (
      public.current_user_role() = 'super_admin'
      or (
        public.current_user_role() = 'admin'
        and exists (
          select 1 from public.links
          where links.id = clicks.link_id
          and links.created_by = auth.uid()
        )
      )
    )
  );

commit;

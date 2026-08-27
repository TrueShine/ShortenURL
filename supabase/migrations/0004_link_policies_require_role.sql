-- Close a gap QA found after 0003 shipped: 0001's original "admin inserts
-- own links" policy (and 0003's select/update/delete policies) only check
-- created_by = auth.uid() — i.e. "logged in", not "has a role". Any
-- authenticated Supabase user, including one with no profiles row at all
-- (e.g. an auth user left behind by a partially-failed account-creation
-- rollback), could insert/select/update/delete their own links by calling
-- Supabase's REST API directly, bypassing the app entirely. Replace every
-- links/clicks policy to require an explicit, recognized role.
begin;

drop policy if exists "admin inserts own links" on public.links;
drop policy if exists "admin selects links" on public.links;
drop policy if exists "admin updates links" on public.links;
drop policy if exists "admin deletes links" on public.links;
drop policy if exists "admin selects clicks" on public.clicks;

create policy "admin inserts own links"
  on public.links for insert
  to authenticated
  with check (
    public.current_user_role() = 'admin' and created_by = auth.uid()
    or public.current_user_role() = 'super_admin'
  );

create policy "admin selects links"
  on public.links for select
  to authenticated
  using (
    public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'admin' and created_by = auth.uid())
  );

create policy "admin updates links"
  on public.links for update
  to authenticated
  using (
    public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'admin' and created_by = auth.uid())
  )
  with check (
    public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'admin' and created_by = auth.uid())
  );

create policy "admin deletes links"
  on public.links for delete
  to authenticated
  using (
    public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'admin' and created_by = auth.uid())
  );

create policy "admin selects clicks"
  on public.clicks for select
  to authenticated
  using (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'admin'
      and exists (
        select 1 from public.links
        where links.id = clicks.link_id
        and links.created_by = auth.uid()
      )
    )
  );

commit;

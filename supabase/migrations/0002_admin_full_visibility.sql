-- Single-admin app: any authenticated user is the admin, so scoping SELECT/
-- UPDATE/DELETE to created_by = auth.uid() only hid anonymously-created
-- links (created_by is null) from the admin dashboard's "전체 링크" tab.
-- Open those policies to all authenticated users; INSERT keeps the
-- created_by = auth.uid() check since that's just data integrity for the
-- creator field, not a visibility restriction.

drop policy if exists "admin selects own links" on public.links;
drop policy if exists "admin updates own links" on public.links;
drop policy if exists "admin deletes own links" on public.links;
drop policy if exists "admin selects clicks for own links" on public.clicks;

create policy "admin selects all links"
  on public.links for select
  to authenticated
  using (true);

create policy "admin updates all links"
  on public.links for update
  to authenticated
  using (true)
  with check (true);

create policy "admin deletes all links"
  on public.links for delete
  to authenticated
  using (true);

create policy "admin selects all clicks"
  on public.clicks for select
  to authenticated
  using (true);

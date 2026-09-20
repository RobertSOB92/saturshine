-- ============================================================
-- Migracja 003: Poprawka RLS dla administratora budynku
-- ============================================================
-- Problem: Użycie funkcji array_agg() zwracającej UUID[] do weryfikacji przez = ANY() 
-- mogło powodować problemy w niektórych wersjach Postgres/PostgREST.
-- Rozwiązanie: Przejście na podzapytania (IN) bazujące bezpośrednio na public.profile_clients

-- Aktualizacja polityki dostępu dla 'clients'
drop policy if exists "clients: client_rep read own" on public.clients;
create policy "clients: client_rep read own"
  on public.clients for select
  using (
    public.get_user_role(auth.uid()) = 'client_rep'
    and id in (select client_id from public.profile_clients where profile_id = auth.uid())
  );

-- Aktualizacja polityki dostępu dla 'tickets'
drop policy if exists "tickets: client_rep select own client" on public.tickets;
create policy "tickets: client_rep select own client"
  on public.tickets for select
  using (
    public.get_user_role(auth.uid()) = 'client_rep'
    and client_id in (select client_id from public.profile_clients where profile_id = auth.uid())
  );

drop policy if exists "tickets: client_rep insert" on public.tickets;
create policy "tickets: client_rep insert"
  on public.tickets for insert
  with check (
    public.get_user_role(auth.uid()) = 'client_rep'
    and client_id in (select client_id from public.profile_clients where profile_id = auth.uid())
    and user_id = auth.uid()
  );

-- Aktualizacja Storage polityk (ticket-photos)
drop policy if exists "ticket-photos: authenticated upload" on storage.objects;
create policy "ticket-photos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ticket-photos'
    and (storage.foldername(name))[1] in (
      select client_id::text from public.profile_clients where profile_id = auth.uid()
    )
  );

drop policy if exists "ticket-photos: client_rep read own" on storage.objects;
create policy "ticket-photos: client_rep read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ticket-photos'
    and (storage.foldername(name))[1] in (
      select client_id::text from public.profile_clients where profile_id = auth.uid()
    )
  );

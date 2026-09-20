-- ============================================================
-- Migracja 002: Wsparcie dla wielu klientów (budynków) przez administratora (client_rep)
-- ============================================================

-- 1. Nowa tabela łącząca (Many-to-Many)
create table public.profile_clients (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  primary key (profile_id, client_id)
);

-- Włączenie RLS na nowej tabeli
alter table public.profile_clients enable row level security;

-- 2. Migracja starych danych: skopiowanie client_id z profiles do profile_clients
insert into public.profile_clients (profile_id, client_id)
select id, client_id
from public.profiles
where client_id is not null;

-- 3. Zastąpienie/Stworzenie nowych funkcji pobierających ID klientów użytkownika
-- Funkcja zwraca teraz TABLICĘ UUID (uuid[])
create or replace function public.get_user_client_ids(user_uuid uuid)
returns uuid[]
language sql
stable
security definer
as $$
  select array_agg(client_id) from public.profile_clients where profile_id = user_uuid;
$$;

-- 4. Zmiany w RLS (zastępujemy stare policy nowymi, opartymi na ANY())

-- Polityki dostępu dla 'clients'
drop policy if exists "clients: client_rep read own" on public.clients;
create policy "clients: client_rep read own"
  on public.clients for select
  using (
    public.get_user_role(auth.uid()) = 'client_rep'
    and id = any(public.get_user_client_ids(auth.uid()))
  );

-- Polityki dostępu dla 'tickets'
drop policy if exists "tickets: client_rep select own client" on public.tickets;
create policy "tickets: client_rep select own client"
  on public.tickets for select
  using (
    public.get_user_role(auth.uid()) = 'client_rep'
    and client_id = any(public.get_user_client_ids(auth.uid()))
  );

drop policy if exists "tickets: client_rep insert" on public.tickets;
create policy "tickets: client_rep insert"
  on public.tickets for insert
  with check (
    public.get_user_role(auth.uid()) = 'client_rep'
    and client_id = any(public.get_user_client_ids(auth.uid()))
    and user_id = auth.uid()
  );

-- Polityki dostępu do 'ticket-photos' (Storage - trzeba to nałożyć na `storage.objects`)
-- W Supabase używa się nazwy bucketu 'ticket-photos' i foldername.
drop policy if exists "ticket-photos: authenticated upload" on storage.objects;
create policy "ticket-photos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ticket-photos'
    and (storage.foldername(name))[1] = any(
      select client_id::text from unnest(public.get_user_client_ids(auth.uid())) as client_id
    )
  );

drop policy if exists "ticket-photos: client_rep read own" on storage.objects;
create policy "ticket-photos: client_rep read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ticket-photos'
    and (storage.foldername(name))[1] = any(
      select client_id::text from unnest(public.get_user_client_ids(auth.uid())) as client_id
    )
  );

-- Polityki dostępu dla nowej tabeli profile_clients
create policy "profile_clients: admin full access"
  on public.profile_clients for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

create policy "profile_clients: self read"
  on public.profile_clients for select
  using (profile_id = auth.uid());

-- 5. Usunięcie starej kolumny client_id i przestarzałej funkcji
alter table public.profiles drop column client_id;
drop function if exists public.get_user_client_id(uuid);

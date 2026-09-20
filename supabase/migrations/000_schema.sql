-- ============================================================
-- SaturShine — Kompletny Schemat Bazy Danych
-- Wersja: 1.1.0
-- (Ten plik zastępuje poprzednie migracje: 001, 002, 003, 004)
-- ============================================================

-- ===========================
-- 1. ROZSZERZENIA
-- ===========================
create extension if not exists "uuid-ossp";

-- ===========================
-- 2. TABELE
-- ===========================

-- Klienci (obiekty nieruchomości)
create table if not exists public.clients (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  address            text        not null,
  assigned_staff_name text,
  created_at         timestamptz not null default now()
);

-- Profile użytkowników (rozszerzenie auth.users)
create table if not exists public.profiles (
  id          uuid        primary key references auth.users on delete cascade,
  full_name   text        not null,
  role        text        not null check (role in ('admin', 'client_rep')),
  requires_password_change boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Nowa tabela łącząca (Many-to-Many) dla zarządców i wielu obiektów
create table if not exists public.profile_clients (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  primary key (profile_id, client_id)
);

-- Zgłoszenia
create table if not exists public.tickets (
  id                   uuid        primary key default gen_random_uuid(),
  client_id            uuid        not null references public.clients(id) on delete cascade,
  user_id              uuid        not null references public.profiles(id) on delete cascade,
  area                 text        not null,
  description          text        not null,
  photo_url            text        not null,
  resolution_photo_url text,
  admin_notes          text,
  status               text        not null default 'pending'
                                   check (status in ('pending', 'in_progress', 'resolved')),
  created_at           timestamptz not null default now(),
  resolved_at          timestamptz
);

-- Subskrypcje Web Push
create table if not exists public.push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  endpoint    text        not null,
  p256dh      text        not null,
  auth        text        not null,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ===========================
-- 3. TRIGGER: resolved_at
-- ===========================
create or replace function public.handle_ticket_resolved()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Ustawienie resolved_at gdy status zmienia się na 'resolved'
  if new.status = 'resolved' and (old.status is distinct from 'resolved') then
    new.resolved_at := now();
  end if;

  -- Wyzerowanie resolved_at gdy status zmienia się z 'resolved' na inny
  if old.status = 'resolved' and new.status != 'resolved' then
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_ticket_resolved on public.tickets;
create trigger trigger_ticket_resolved
  before update on public.tickets
  for each row
  execute function public.handle_ticket_resolved();

-- ===========================
-- 4. FUNKCJA POMOCNICZA: get_user_role
-- ===========================
create or replace function public.get_user_role(user_uuid uuid)
returns text
language sql
stable
security definer
as $$
  select role from public.profiles where id = user_uuid;
$$;

-- ===========================
-- 5. ROW LEVEL SECURITY (RLS)
-- ===========================

-- Włącz RLS na wszystkich tabelach
alter table public.clients            enable row level security;
alter table public.profiles           enable row level security;
alter table public.profile_clients    enable row level security;
alter table public.tickets            enable row level security;
alter table public.push_subscriptions enable row level security;

-- Wyczyść istniejące polityki (aby skrypt był idempotentny przy ponownym uruchomieniu)
drop policy if exists "clients: admin full access" on public.clients;
drop policy if exists "clients: client_rep read own" on public.clients;

drop policy if exists "profiles: admin full access" on public.profiles;
drop policy if exists "profiles: client_rep read own" on public.profiles;
drop policy if exists "profiles: self read" on public.profiles;

drop policy if exists "profile_clients: admin full access" on public.profile_clients;
drop policy if exists "profile_clients: self read" on public.profile_clients;

drop policy if exists "tickets: admin full access" on public.tickets;
drop policy if exists "tickets: client_rep select own client" on public.tickets;
drop policy if exists "tickets: client_rep insert" on public.tickets;

drop policy if exists "push_subscriptions: own select" on public.push_subscriptions;
drop policy if exists "push_subscriptions: own insert" on public.push_subscriptions;
drop policy if exists "push_subscriptions: own delete" on public.push_subscriptions;


-- ----- CLIENTS -----
create policy "clients: admin full access"
  on public.clients for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

create policy "clients: client_rep read own"
  on public.clients for select
  using (
    public.get_user_role(auth.uid()) = 'client_rep'
    and id in (select client_id from public.profile_clients where profile_id = auth.uid())
  );


-- ----- PROFILES -----
create policy "profiles: admin full access"
  on public.profiles for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

create policy "profiles: client_rep read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: self read"
  on public.profiles for select
  using (id = auth.uid());


-- ----- PROFILE_CLIENTS -----
create policy "profile_clients: admin full access"
  on public.profile_clients for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

create policy "profile_clients: self read"
  on public.profile_clients for select
  using (profile_id = auth.uid());


-- ----- TICKETS -----
create policy "tickets: admin full access"
  on public.tickets for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

create policy "tickets: client_rep select own client"
  on public.tickets for select
  using (
    public.get_user_role(auth.uid()) = 'client_rep'
    and client_id in (select client_id from public.profile_clients where profile_id = auth.uid())
  );

create policy "tickets: client_rep insert"
  on public.tickets for insert
  with check (
    public.get_user_role(auth.uid()) = 'client_rep'
    and client_id in (select client_id from public.profile_clients where profile_id = auth.uid())
    and user_id = auth.uid()
  );


-- ----- PUSH_SUBSCRIPTIONS -----
create policy "push_subscriptions: own select"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions: own insert"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions: own delete"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- ===========================
-- 6. STORAGE
-- ===========================

-- Bucket prywatny (nie publiczny)
insert into storage.buckets (id, name, public)
values ('ticket-photos', 'ticket-photos', false)
on conflict (id) do nothing;

drop policy if exists "ticket-photos: authenticated upload" on storage.objects;
drop policy if exists "ticket-photos: admin read all" on storage.objects;
drop policy if exists "ticket-photos: client_rep read own" on storage.objects;
drop policy if exists "ticket-photos: admin update delete" on storage.objects;

-- Polityka: zalogowany użytkownik może uploadować do ścieżki zawierającej jego client_id
create policy "ticket-photos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ticket-photos'
    and (storage.foldername(name))[1] in (
      select client_id::text from public.profile_clients where profile_id = auth.uid()
    )
  );

-- Polityka: admin może odczytać wszystkie zdjęcia
create policy "ticket-photos: admin read all"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ticket-photos'
    and public.get_user_role(auth.uid()) = 'admin'
  );

-- Polityka: client_rep może odczytać zdjęcia ze swojego client_id
create policy "ticket-photos: client_rep read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ticket-photos'
    and (storage.foldername(name))[1] in (
      select client_id::text from public.profile_clients where profile_id = auth.uid()
    )
  );

-- Polityka: admin może aktualizować/usuwać zdjęcia
create policy "ticket-photos: admin update delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ticket-photos'
    and public.get_user_role(auth.uid()) = 'admin'
  );

-- ===========================
-- 7. FUNKCJA: auto-create profile
-- ===========================
-- Trigger tworzący profil przy rejestracji (używany przez service role)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Profile tworzone ręcznie przez API route (service role)
  -- Ten trigger istnieje jako fallback
  return new;
end;
$$;

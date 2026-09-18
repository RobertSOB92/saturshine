-- ============================================================
-- SaturShine — Kompletna Migracja SQL
-- Wersja: 1.0.0
-- ============================================================

-- ===========================
-- 1. ROZSZERZENIA
-- ===========================
create extension if not exists "uuid-ossp";

-- ===========================
-- 2. TABELE
-- ===========================

-- Klienci (obiekty nieruchomości)
create table public.clients (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  address            text        not null,
  assigned_staff_name text,
  created_at         timestamptz not null default now()
);

-- Profile użytkowników (rozszerzenie auth.users)
create table public.profiles (
  id          uuid        primary key references auth.users on delete cascade,
  client_id   uuid        references public.clients(id) on delete set null,
  full_name   text        not null,
  role        text        not null check (role in ('admin', 'client_rep')),
  created_at  timestamptz not null default now()
);

-- Zgłoszenia
create table public.tickets (
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
create table public.push_subscriptions (
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

create trigger trigger_ticket_resolved
  before update on public.tickets
  for each row
  execute function public.handle_ticket_resolved();

-- ===========================
-- 4. FUNKCJA POMOCNICZA: get_user_role
-- ===========================
-- Używana w politykach RLS do odczytu roli z profiles bez rekurencji
create or replace function public.get_user_role(user_uuid uuid)
returns text
language sql
stable
security definer
as $$
  select role from public.profiles where id = user_uuid;
$$;

create or replace function public.get_user_client_id(user_uuid uuid)
returns uuid
language sql
stable
security definer
as $$
  select client_id from public.profiles where id = user_uuid;
$$;

-- ===========================
-- 5. ROW LEVEL SECURITY (RLS)
-- ===========================

-- Włącz RLS na wszystkich tabelach
alter table public.clients            enable row level security;
alter table public.profiles           enable row level security;
alter table public.tickets            enable row level security;
alter table public.push_subscriptions enable row level security;

-- ----- CLIENTS -----
-- Admin: pełny dostęp
create policy "clients: admin full access"
  on public.clients for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

-- client_rep: tylko SELECT własnego klienta
create policy "clients: client_rep read own"
  on public.clients for select
  using (
    public.get_user_role(auth.uid()) = 'client_rep'
    and id = public.get_user_client_id(auth.uid())
  );

-- ----- PROFILES -----
-- Admin: pełny dostęp
create policy "profiles: admin full access"
  on public.profiles for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

-- client_rep: tylko własny profil
create policy "profiles: client_rep read own"
  on public.profiles for select
  using (id = auth.uid());

-- Każdy zalogowany może odczytać własny profil (konieczne do inicjalizacji sesji)
create policy "profiles: self read"
  on public.profiles for select
  using (id = auth.uid());

-- ----- TICKETS -----
-- Admin: pełny dostęp
create policy "tickets: admin full access"
  on public.tickets for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

-- client_rep: SELECT tylko zgłoszeń swojego klienta
create policy "tickets: client_rep select own client"
  on public.tickets for select
  using (
    public.get_user_role(auth.uid()) = 'client_rep'
    and client_id = public.get_user_client_id(auth.uid())
  );

-- client_rep: INSERT tylko dla własnego client_id
create policy "tickets: client_rep insert"
  on public.tickets for insert
  with check (
    public.get_user_role(auth.uid()) = 'client_rep'
    and client_id = public.get_user_client_id(auth.uid())
    and user_id = auth.uid()
  );

-- ----- PUSH_SUBSCRIPTIONS -----
-- Własne subskrypcje: SELECT, INSERT, DELETE
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

-- Polityka: zalogowany użytkownik może uploadować do ścieżki zawierającej jego client_id
create policy "ticket-photos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ticket-photos'
    and (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::text
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
    and (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::text
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

-- ============================================================
-- Migracja 004: Wymuszenie zmiany hasła
-- ============================================================

-- Dodanie kolumny requires_password_change do tabeli profiles
alter table public.profiles 
add column if not exists requires_password_change boolean not null default false;

# SaturShine ITSM - System Zgłoszeń 🛠️✨

SaturShine ITSM to nowoczesna platforma webowa stworzona na potrzeby zarządzania zgłoszeniami i usterkami w obiektach (facility management). Umożliwia zarządcom nieruchomości (Zarządcom) szybkie zgłaszanie problemów ze zdjęciami, a pracownikom technicznym (Administratorom) efektywne ich rozwiązywanie i zarządzanie stanem technicznym obiektów.

## 🌟 Główne funkcje

- **Zarządzanie Usterkami (Tickets)**: Tworzenie zgłoszeń ze zdjęciami, określanie lokalizacji usterki.
- **Role w systemie**:
  - `Administrator`: Posiada pełny dostęp, widzi wszystkie obiekty, zarządza użytkownikami oraz rozwiązuje usterki (z możliwością dodawania notatek i zdjęć z naprawy).
  - `Zarządca (Client Rep)`: Przypisany do konkretnych obiektów, zgłasza usterki, śledzi status ich rozwiązywania.
- **Powiadomienia Web Push**: Zintegrowane powiadomienia, m.in. o utworzeniu nowych zgłoszeń dla administratorów.
- **Zabezpieczenia i Auth**: Bezpieczne logowanie z użyciem Supabase Auth. Dedykowany proces wymuszanej zmiany hasła dla nowych użytkowników bez wykorzystywania poczty SMTP.

## 💻 Tech Stack

- **Framework:** Next.js 15 (App Router, Standalone build)
- **Baza danych i Backend:** Supabase (PostgreSQL, Storage, Auth, Edge Functions)
- **Styling:** Tailwind CSS
- **Ikony:** Lucide React
- **Bezpieczeństwo:** Row-Level Security (RLS) definiowane bezpośrednio w Postgresie.

---

## 🚀 Uruchomienie lokalne (Development)

### 1. Wymagania
- Node.js (v18 lub wyższy)
- Zarejestrowane konto w [Supabase](https://supabase.com/) i utworzony projekt.

### 2. Klonowanie i Instalacja
```bash
git clone <adres_repozytorium>
cd saturshine
npm install
```

### 3. Zmienne Środowiskowe
Utwórz plik `.env.local` w głównym katalogu projektu i uzupełnij go swoimi danymi z Supabase oraz kluczami VAPID (do powiadomień Push):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<twój-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<twój-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<twój-service-role-key>

# Klucze do powiadomień Web Push (wygeneruj np. za pomocą web-push library)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<twój-vapid-public-key>
VAPID_PRIVATE_KEY=<twój-vapid-private-key>
VAPID_SUBJECT=mailto:admin@twojadomena.pl
```

### 4. Baza Danych (Migracje Supabase)
Aby struktura bazy danych (w tym tabele, polityki RLS i triggery) poprawnie funkcjonowała, skopiuj zapytanie SQL znajdujące się w pliku `supabase/migrations/000_schema.sql` i wykonaj je w edytorze SQL na swoim projekcie Supabase. Tworzy to od razu gotową, pełną strukturę (wcześniej było to rozbite na paczki 001-004, teraz połączone w jedno).

### 5. Start Aplikacji
```bash
npm run dev
```
Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

---

## 📦 Aktualizacja i Wdrażanie na serwer (Mikrus / VPS)

Aplikacja jest skonfigurowana do budowania w trybie `standalone` (zoptymalizowana wersja dla serwerów bez Vercela). Aby przygotować nową paczkę z poprawkami i wgrać ją na serwer, wykonaj poniższe kroki:

### Krok 1: Zbudowanie aplikacji
Zawsze gdy wprowadzisz zmiany w kodzie, musisz przebudować aplikację w swoim terminalu:
```bash
npm run build
```

### Krok 2: Przygotowanie plików
Po udanym buildzie, aplikacja tworzy gotowe pliki serwera w folderze `.next/standalone`.
Aby wygodnie przesłać całość na serwer, możesz użyć poniższych komend w terminalu bash/zsh (np. na Macu/Linuxie):

```bash
mkdir -p ../gotowa-paczka-na-serwer
rsync -av --delete .next/ ../gotowa-paczka-na-serwer/.next/
rsync -av --delete public/ ../gotowa-paczka-na-serwer/public/
cp package.json package-lock.json next.config.ts ../gotowa-paczka-na-serwer/
rsync -av --delete supabase/ ../gotowa-paczka-na-serwer/supabase/
```

### Krok 3: Wgranie na serwer
Otwórz folder `gotowa-paczka-na-serwer` (który został wygenerowany folder wyżej) na swoim komputerze i **skopiuj całą jego zawartość** na swój serwer za pomocą klienta FTP/SFTP (np. FileZilla), nadpisując obecne pliki w folderze aplikacji.
Nie musisz odpalać `npm install` na serwerze, ponieważ tryb `standalone` paczkuje od razu potrzebne zależności (folder `node_modules`). Pamiętaj o konfiguracji pliku `.env.local` na serwerze!

### Krok 4: Restart na serwerze
Połącz się z serwerem przez SSH i zrestartuj proces PM2, aby serwer wczytał nowe pliki:
```bash
# Sprawdź nazwę/ID swojej aplikacji
pm2 list

# Zrestartuj używając nazwy lub ID
pm2 restart saturshine 
# (lub pm2 restart 0)
```

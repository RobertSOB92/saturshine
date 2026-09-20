## Aktualizacja i Wdrażanie na serwer (Mikrus / VPS)

Aplikacja jest skonfigurowana do budowania w trybie `standalone` (zoptymalizowana wersja dla serwerów bez Vercela). Aby przygotować nową paczkę z poprawkami i wgrać ją na serwer, wykonaj poniższe kroki:

### Krok 1: Zbudowanie aplikacji
Zawsze gdy wprowadzisz zmiany w kodzie, musisz przebudować aplikację w swoim terminalu:
```bash
npm run build
```

### Krok 2: Przygotowanie plików
Po udanym buildzie, aplikacja tworzy gotowe pliki serwera w folderze `.next/standalone`.
Aby wygodnie przesłać całość na serwer, możesz skopiować pliki do folderu `gotowa-paczka-na-serwer`:
```bash
# Uwaga: poniższe komendy zadziałają w terminalu bash/zsh (np. na Macu)
rm -rf gotowa-paczka-na-serwer/.next
cp -r .next/standalone/ gotowa-paczka-na-serwer/
mkdir -p gotowa-paczka-na-serwer/.next
cp -r .next/static gotowa-paczka-na-serwer/.next/static
cp -r public gotowa-paczka-na-serwer/public
```

### Krok 3: Wgranie na serwer
Otwórz folder `gotowa-paczka-na-serwer` na swoim komputerze i **skopiuj całą jego zawartość** na swój serwer za pomocą klienta FTP/SFTP (np. FileZilla), nadpisując obecne pliki w folderze aplikacji.
Nie musisz odpalać `npm install` na serwerze, ponieważ tryb `standalone` paczkuje od razu potrzebne zależności (folder `node_modules`).

### Krok 4: Restart na serwerze
Połącz się z Mikrusem (lub innym serwerem) przez SSH i zrestartuj proces PM2, aby serwer wczytał nowe pliki:
```bash
# Sprawdź nazwę/ID swojej aplikacji
pm2 list

# Zrestartuj używając nazwy lub ID
pm2 restart saturshine 
# (lub pm2 restart 0)
```

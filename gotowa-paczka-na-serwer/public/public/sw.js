// ============================================================
// SaturShine — Service Worker
// MINIMALNY — obsługuje WYŁĄCZNIE Web Push i notificationclick
// BEZ cache'owania zasobów, BEZ trybu offline
// ============================================================

'use strict';

// Obsługa zdarzenia push (Web Push API)
self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'SaturShine',
      body: event.data.text(),
    };
  }

  const title = data.title || 'SaturShine Zgłoszenia';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'saturshine-notification',
    data: data.data || {},
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Obsługa kliknięcia w powiadomienie
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        // Sprawdź czy aplikacja jest już otwarta
        for (const client of windowClients) {
          if (client.url === fullUrl && 'focus' in client) {
            return client.focus();
          }
        }

        // Znajdź dowolne okno aplikacji i przekieruj
        for (const client of windowClients) {
          if ('navigate' in client) {
            client.focus();
            return client.navigate(fullUrl);
          }
        }

        // Otwórz nowe okno
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// Wymagana obsługa activate — brak logiki cache'owania
self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});

// Install event — brak pre-cache'owania
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PushSubscriptionData } from '@/types';

/**
 * Hook zarządzający subskrypcją Web Push
 * - Pyta o zgodę na powiadomienia
 * - Rejestruje/usuwa subskrypcję w tabeli push_subscriptions
 */
export function usePushSubscription(userId: string | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Sprawdź wsparcie przeglądarki przy montowaniu
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Sprawdź czy już mamy subskrypcję
  const checkSubscription = useCallback(async () => {
    if (!isSupported || !userId) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Błąd sprawdzania subskrypcji:', error);
    }
  }, [isSupported, userId]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  /**
   * Prosi użytkownika o zgodę i rejestruje subskrypcję push
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !userId) return false;
    setLoading(true);

    try {
      // Poproś o zgodę
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setLoading(false);
        return false;
      }

      // Zarejestruj Service Worker jeśli nie jest jeszcze zarejestrowany
      const registration = await navigator.serviceWorker.ready;

      // Subskrybuj
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY nie jest ustawiony');
        setLoading(false);
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Zapisz subskrypcję w bazie
      const subJson = subscription.toJSON();
      const subData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
      };

      // Sprawdź czy już istnieje (upsert)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          ...subData,
        }, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.error('Błąd zapisywania subskrypcji:', error);
        setLoading(false);
        return false;
      }

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Błąd rejestracji push:', error);
      setLoading(false);
      return false;
    }
  }, [isSupported, userId, supabase]);

  /**
   * Usuwa subskrypcję push
   */
  const unsubscribe = useCallback(async () => {
    if (!isSupported || !userId) return;
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Usuń z bazy
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error('Błąd usuwania subskrypcji:', error);
    }

    setLoading(false);
  }, [isSupported, userId, supabase]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}

/**
 * Konwertuje base64 URL na Uint8Array (wymagane przez pushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

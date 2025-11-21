'use client';

import { useEffect, useRef } from 'react';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minuter i millisekunder

export function useInactivity() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const resetTimer = () => {
    // Rensa befintlig timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Sätt ny timeout för utloggning
    timeoutRef.current = setTimeout(async () => {
      try {
        await logout();
        // Vänta lite för att säkerställa att auth-state uppdateras
        await new Promise(resolve => setTimeout(resolve, 200));
        // Omdirigera till login
        window.location.href = '/login';
      } catch (error) {
        console.error('Fel vid automatisk utloggning:', error);
        // Försök ändå omdirigera
        window.location.href = '/login';
      }
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    // Events som indikerar aktivitet
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Lägg till event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, true);
    });

    // Starta timern vid första laddningen
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [router]);
}


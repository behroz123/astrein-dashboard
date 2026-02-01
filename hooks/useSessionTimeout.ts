import { useEffect, useRef, useState, useCallback } from 'react';
import { signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 Minuten in Millisekunden
const WARNING_TIME = 5 * 60 * 1000; // 5 Minuten Warnung vor Logout

export function useSessionTimeout(user: User | null) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Funktion zum Zurücksetzen des Timers
  const resetTimer = useCallback(() => {
    // Alte Timer löschen
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Warning ausblenden
    setShowWarning(false);

    if (!user) return;

    // Warning-Timer: 25 Minuten
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(WARNING_TIME);

      // Countdown starten
      countdownIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1000) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Logout-Timer: 30 Minuten
    inactivityTimerRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT);
  }, [user]);

  // Funktion zum Logout
  const handleLogout = useCallback(async () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setShowWarning(false);
    
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  // Funktion zum Fortsetzen der Sitzung
  const continueSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Activity Listener
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      resetTimer();
    };

    // Event-Listener für verschiedene Aktivitäten
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);

    // Timer initial starten
    resetTimer();

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);

      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, resetTimer]);

  return {
    showWarning,
    timeRemaining,
    handleLogout,
    continueSession,
  };
}

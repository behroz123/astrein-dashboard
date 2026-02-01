'use client';

import { useEffect, useState } from 'react';

interface SessionWarningProps {
  show: boolean;
  timeRemaining: number;
  onContinue: () => void;
  onLogout: () => void;
}

export default function SessionWarning({
  show,
  timeRemaining,
  onContinue,
  onLogout,
}: SessionWarningProps) {
  const [displayTime, setDisplayTime] = useState('5:00');

  useEffect(() => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    setDisplayTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }, [timeRemaining]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4 border border-white/10">
        {/* Warnung Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-yellow-500/20 rounded-full p-4">
            <svg
              className="w-8 h-8 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 4v2M12 3a9 9 0 100 18 9 9 0 000-18z"
              />
            </svg>
          </div>
        </div>

        {/* Titel */}
        <h2 className="text-center text-2xl font-bold text-white mb-2">
          Sitzung läuft ab
        </h2>

        {/* Beschreibung */}
        <p className="text-center text-white/70 text-sm mb-6">
          Du wirst aus Sicherheitsgründen automatisch abgemeldet, wenn du nicht reagierst.
        </p>

        {/* Timer */}
        <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-6 text-center">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-2">
            Verbleibende Zeit
          </p>
          <p className="text-4xl font-bold text-red-400 font-mono">
            {displayTime}
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition transform hover:scale-105"
          >
            Sitzung fortsetzen
          </button>
          <button
            onClick={onLogout}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition"
          >
            Jetzt abmelden
          </button>
        </div>

        {/* Info Text */}
        <p className="text-center text-white/50 text-xs mt-4">
          Jede Aktivität (Klicks, Tastatureingaben) setzt den Timer zurück
        </p>
      </div>
    </div>
  );
}

"use client";

import { usePrefs } from "@/lib/prefs";

export function ThemeShowcase() {
  const { theme } = usePrefs();
  const isDark = theme !== "light";

  return (
    <div className="space-y-3 p-6">
      <h2 className="text-xl font-bold">Theme</h2>
      <p className="text-sm opacity-70">Nur zwei Modi sind aktiv: Light und Dark.</p>
      <div className="text-sm font-semibold">
        Aktueller Modus: {isDark ? "Dark" : "Light"}
      </div>
    </div>
  );
}

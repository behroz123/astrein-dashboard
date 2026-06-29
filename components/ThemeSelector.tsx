"use client";

import { usePrefs } from "../lib/prefs";

export function ThemeSelector() {
  const { theme, setTheme } = usePrefs();
  const isDark = theme !== "light";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-3">Theme</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme("light" as any)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              !isDark ? "border-blue-500 bg-blue-500/10" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="font-medium text-sm">Light</div>
          </button>

          <button
            onClick={() => setTheme("midnight" as any)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              isDark ? "border-blue-500 bg-blue-500/10" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="font-medium text-sm">Dark</div>
          </button>
        </div>
      </div>
    </div>
  );
}

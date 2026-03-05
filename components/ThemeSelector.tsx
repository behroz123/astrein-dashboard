"use client";

import { useTheme } from "../lib/themeContext";
import { themes, type ThemeType } from "../lib/themes";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-3">Design Theme</h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(themes) as [ThemeType, typeof themes[ThemeType]][]).map(
            ([key, themeConfig]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  theme === key
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="font-medium text-sm">{themeConfig.name}</div>
                <div className="text-xs opacity-60">{themeConfig.description}</div>
                <div className="flex gap-1 mt-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: themeConfig.primary }}
                  ></div>
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: themeConfig.accent1 }}
                  ></div>
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: themeConfig.accent2 }}
                  ></div>
                </div>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

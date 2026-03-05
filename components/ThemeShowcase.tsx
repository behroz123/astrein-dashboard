"use client";

import { useTheme } from "@/lib/themeContext";
import { themes } from "@/lib/themes";

export function ThemeShowcase() {
  const { config, theme } = useTheme();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Aktuelles Theme: {themes[theme as keyof typeof themes].name}</h2>
        <p className="text-sm opacity-70">{themes[theme as keyof typeof themes].description}</p>
      </div>

      {/* Color Palette */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Farbpalette</h3>

        {/* Primary Colors */}
        <div className="grid grid-cols-3 gap-4">
          <div
            className="h-24 rounded-lg flex items-end justify-center pb-2"
            style={{ backgroundColor: config.primary }}
          >
            <span className="text-xs font-bold opacity-90">Primary</span>
          </div>
          <div
            className="h-24 rounded-lg flex items-end justify-center pb-2"
            style={{ backgroundColor: config.primaryDark }}
          >
            <span className="text-xs font-bold opacity-90">Dark</span>
          </div>
          <div
            className="h-24 rounded-lg flex items-end justify-center pb-2"
            style={{ backgroundColor: config.primaryLight }}
          >
            <span className="text-xs font-bold opacity-90">Light</span>
          </div>
        </div>

        {/* Status Colors */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: "Success", color: config.success },
            { name: "Warning", color: config.warning },
            { name: "Error", color: config.error },
            { name: "Info", color: config.info },
          ].map((item) => (
            <div
              key={item.name}
              className="h-20 rounded-lg flex items-end justify-center pb-2"
              style={{ backgroundColor: item.color }}
            >
              <span className="text-xs font-bold opacity-90">{item.name}</span>
            </div>
          ))}
        </div>

        {/* Accents */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: "Accent 1", color: config.accent1 },
            { name: "Accent 2", color: config.accent2 },
            { name: "Accent 3", color: config.accent3 },
            { name: "Accent 4", color: config.accent4 },
          ].map((item) => (
            <div
              key={item.name}
              className="h-20 rounded-lg flex items-end justify-center pb-2"
              style={{ backgroundColor: item.color }}
            >
              <span className="text-xs font-bold opacity-90">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Component Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Komponenten-Beispiele</h3>

        {/* Card */}
        <div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: config.surface,
            borderColor: config.border,
            color: config.text,
          }}
        >
          <div className="font-semibold mb-2">Beispiel Card</div>
          <p style={{ color: config.textSecondary }}>Mit aktuellen Theme-Farben</p>
        </div>

        {/* Button */}
        <button
          className="px-6 py-3 rounded-lg font-semibold text-white transition"
          style={{ backgroundColor: config.primary }}
        >
          Beispiel Button
        </button>

        {/* Text Variations */}
        <div className="space-y-2">
          <div style={{ color: config.text }} className="font-semibold">
            Primary Text
          </div>
          <div style={{ color: config.textSecondary }}>Secondary Text</div>
          <div style={{ color: config.textMuted }}>Muted Text</div>
        </div>
      </div>
    </div>
  );
}

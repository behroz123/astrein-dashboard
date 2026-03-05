# 🎨 Design Theme System

Das Dashboard verfügt jetzt über ein umfassendes Theme-System mit 6 professionellen Design-Varianten.

## 📋 Verfügbare Themes

### 1. **Hell** (Light)
- Helles, kontrastreiches Design
- Optimiert für Tageslicht und hohe Kontrastanforderungen
- Moderne, saubere Optik
- Beste für Benutzerfreundlichkeit

### 2. **Glas** (Glass)
- Transparentes Glas-Morphism Design
- Semi-transparente Oberflächen
- Modern und elegant
- Blur-Effekte für Tiefenwirkung

### 3. **Mitternacht** (Midnight)
- Tiefe, dunkle Farben
- GitHub-ähnliches dunkles Design
- Perfekt für lange Arbeitssessions
- Reduzierte Augenbelastung

### 4. **Graphit** (Graphite)
- Neutraler Graphit-Look
- Professionell und zurückhaltend
- Balance zwischen Hell und Dunkel
- Geeignet für formale Dokumentation

### 5. **Aurora** (Aurora)
- Farbige Aurora-Akzente
- Lila/Blau/Rosa Farbschema
- Futuristisch und kreativ
- Lebendige Akzentfarben

### 6. **Neon** (Neon)
- Kräftige Neonfarben
- Retro-Cyberpunk Aesthetic
- Grün auf Schwarz Terminal-Style
- Maximale Kontrastwirkung

## 🎯 How to Use

### 1. **Theme Selection**
```
Settings → Design Themes → Wählen Sie ein Theme
```
Das Theme wird automatisch in localStorage gespeichert und bleibt erhalten.

### 2. **Programmatisch im Code**
```tsx
import { useTheme } from "@/lib/themeContext";

export function MyComponent() {
  const { theme, setTheme, config } = useTheme();
  
  return (
    <div style={{ color: config.primary }}>
      Aktives Theme: {theme}
    </div>
  );
}
```

### 3. **CSS-Variablen in Styling**
```tsx
<div style={{ backgroundColor: 'var(--color-primary)' }}>
  Dynamische Hintergrundfarbe
</div>
```

### 4. **Tailwind Utilities**
```tsx
<div className="theme-bg theme-text theme-border">
  Theme-aware Styling
</div>
```

## 🎨 Theme Color Palette

Jedes Theme definiert diese Farben:

- **Primary**: Haupt-Akzentfarbe
- **Primary Dark/Light**: Variationen
- **Background**: Haupt-Hintergrund
- **Surface**: Karten und Komponenten
- **Text**: Haupttext, Sekundärtext, Gedimmter Text
- **Status**: Success, Warning, Error, Info
- **Accents**: 4 zusätzliche Akzentfarben
- **Borders**: Border und Light Border Farben

## 📁 Dateistruktur

```
lib/
├── themes.ts          # Theme Definitionen
├── themeContext.tsx   # Theme Provider und Hook
components/
└── ThemeSelector.tsx  # Theme Auswahlkomponent
app/
├── theme.css          # Tailwind Utilities
├── globals.css        # CSS-Variablen
└── settings/page.tsx  # Theme Settings Integration
```

## 🔄 Theme Integration

Die Themen werden automatisch in alle Komponenten integriert durch:

1. **CSS Custom Properties** - Verfügbar in jedem CSS
2. **useTheme Hook** - Für React-Komponenten
3. **Tailwind Utilities** - Für schnelle Styling

## 🚀 Features

✅ Persistente Theme-Speicherung  
✅ Sofortige Aktualisierung aller Komponenten  
✅ CSS-Variable Support  
✅ TypeScript Support  
✅ Performant und leichtgewichtig  
✅ Keine Breaking Changes  

## 📝 Zukünftige Erweiterungen

- [ ] System Theme Detection (OS Dark Mode)
- [ ] Custom Theme Creator
- [ ] Theme Scheduling (automatischer Wechsel)
- [ ] Theme Export/Import
- [ ] Accessibility Presets (High Contrast, etc.)

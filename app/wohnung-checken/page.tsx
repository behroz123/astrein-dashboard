"use client";

import { useRouter } from 'next/navigation';
import { usePrefs } from '../../lib/prefs';

export default function WohnungCheckenPage() {
  const router = useRouter();
  const { t } = usePrefs();

  return (
    <div className="min-h-screen pb-8">
      {/* Modern Header */}
      <div className="mb-10">
        <button
          onClick={() => router.push('/immobilien')}
          className="inline-flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "rgb(var(--foreground))" }}
        >
          Zurück
        </button>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold" 
             style={{ 
               background: "rgba(var(--accent), 0.1)",
               color: "rgb(var(--accent))"
             }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgb(var(--accent))" }}></span>
          Wohnung Checken
        </div>
        <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: "rgb(var(--foreground))" }}>
          Wohnungszustand Dokumentieren
        </h1>
        <p className="text-lg opacity-60 max-w-2xl">
          Detaillierte Protokolle und Dokumentation für Einzüge, Auszüge und Inspektionen
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="group relative rounded-2xl p-7 text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
             style={{
               background: "rgb(var(--card-bg))",
               border: "1px solid rgb(var(--border))",
             }}>
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" 
               style={{ background: "linear-gradient(135deg, rgb(59, 130, 246), transparent)", zIndex: -1 }}></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 text-lg">
              ✓
            </div>
            <h3 className="text-lg font-semibold group-hover:translate-x-1 transition-transform duration-300" style={{ color: "rgb(var(--foreground))" }}>Bestandsprotokolle</h3>
          </div>
          <p className="text-sm opacity-60 leading-relaxed">
            Erstellen Sie detaillierte Protokolle beim Einzug und Auszug.
          </p>
        </div>

        <div className="group relative rounded-2xl p-7 text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
             style={{
               background: "rgb(var(--card-bg))",
               border: "1px solid rgb(var(--border))",
             }}>
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" 
               style={{ background: "linear-gradient(135deg, rgb(34, 197, 94), transparent)", zIndex: -1 }}></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 text-lg">
              📷
            </div>
            <h3 className="text-lg font-semibold group-hover:translate-x-1 transition-transform duration-300" style={{ color: "rgb(var(--foreground))" }}>Fotodokumentation</h3>
          </div>
          <p className="text-sm opacity-60 leading-relaxed">
            Dokumentieren Sie Schäden und Zustand mit Fotos.
          </p>
        </div>

        <div className="group relative rounded-2xl p-7 text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
             style={{
               background: "rgb(var(--card-bg))",
               border: "1px solid rgb(var(--border))",
             }}>
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" 
               style={{ background: "linear-gradient(135deg, rgb(217, 119, 6), transparent)", zIndex: -1 }}></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 text-lg">
              ⚠️
            </div>
            <h3 className="text-lg font-semibold group-hover:translate-x-1 transition-transform duration-300" style={{ color: "rgb(var(--foreground))" }}>Mängelliste</h3>
          </div>
          <p className="text-sm opacity-60 leading-relaxed">
            Erfassen Sie Mängel und Reparaturbedarf systematisch.
          </p>
        </div>

        <div className="group relative rounded-2xl p-7 text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
             style={{
               background: "rgb(var(--card-bg))",
               border: "1px solid rgb(var(--border))",
             }}>
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" 
               style={{ background: "linear-gradient(135deg, rgb(147, 51, 234), transparent)", zIndex: -1 }}></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 text-lg">
              📊
            </div>
            <h3 className="text-lg font-semibold group-hover:translate-x-1 transition-transform duration-300" style={{ color: "rgb(var(--foreground))" }}>Archive</h3>
          </div>
          <p className="text-sm opacity-60 leading-relaxed">
            Speichern und archivieren Sie alle Protokolle zentral.
          </p>
        </div>
      </div>

      <div className="mt-8 group relative rounded-2xl p-7 text-left transition-all duration-500" 
           style={{
             background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))",
             border: "1px solid rgba(var(--accent), 0.2)"
           }}>
        <p className="text-sm opacity-80" style={{ color: "rgb(var(--foreground))" }}>
          Diese Funktion wird in Kürze erweitert. Nutzen Sie momentan die anderen Immobilien-Module.
        </p>
      </div>
    </div>
  );
}

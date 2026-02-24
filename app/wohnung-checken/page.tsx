"use client";

export default function WohnungCheckenPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] surface p-6">
        <h2 className="text-xl font-semibold text-white">Wohnung Checken</h2>
        <p className="mt-2 text-sm text-white/60">
          Dokumentieren Sie Wohnungszustände, Schäden und führen Sie Check-Protokolle durch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[28px] surface p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-lg">✓</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Bestandsprotokolle</h3>
          </div>
          <p className="text-sm text-white/60">
            Erstellen Sie detaillierte Protokolle beim Einzug und Auszug.
          </p>
        </div>

        <div className="rounded-[28px] surface p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-lg">📷</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Fotodokumentation</h3>
          </div>
          <p className="text-sm text-white/60">
            Dokumentieren Sie Schäden und Zustand mit Fotos.
          </p>
        </div>

        <div className="rounded-[28px] surface p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-lg">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Mängelliste</h3>
          </div>
          <p className="text-sm text-white/60">
            Erfassen Sie Mängel und Reparaturbedarf systematisch.
          </p>
        </div>

        <div className="rounded-[28px] surface p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Archive</h3>
          </div>
          <p className="text-sm text-white/60">
            Speichern und archivieren Sie alle Protokolle zentral.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <p className="text-sm text-white/80">
          Diese Funktion wird in Kürze erweitert. Nutzen Sie momentan die anderen Immobilien-Module.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from 'next/navigation';
import { usePrefs } from '../../lib/prefs';

export default function MietvertragPage() {
  const router = useRouter();
  const { t } = usePrefs();

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/immobilien')}
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
          >
            {t("contract.back")}
          </button>
        </div>
        <h2 className="text-xl font-semibold text-white">Mietverträge</h2>
        <p className="mt-2 text-sm text-white/60">Verwalten und speichern Sie Mietverträge zentral.</p>
      </div>
      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
        <p className="text-sm text-white/70">Diese Funktion wird in Kürze erweitert.</p>
      </div>
    </div>
  );
}

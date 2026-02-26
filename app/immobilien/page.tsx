"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import CostDashboard from "../../components/CostDashboard";
import { usePrefs } from "../../lib/prefs";

export default function ImmobilienPage() {
  const { t } = usePrefs();
  const router = useRouter();

  const sections = useMemo(
    () => [
      {
        key: "auszuege",
        route: "/auszuege",
        label: t("moveouts"),
        description: "Auszüge dokumentieren",
        accent: "from-indigo-500/20 to-indigo-500/5",
      },
      {
        key: "einzuege",
        route: "/einzuege",
        label: t("moveins"),
        description: t("moveins.subtitle"),
        accent: "from-emerald-500/20 to-emerald-500/5",
      },
      {
        key: "wohnung-checken",
        route: "/wohnung-checken",
        label: t("wohnungChecken"),
        description: t("wohnungChecken.subtitle"),
        accent: "from-sky-500/20 to-sky-500/5",
      },
      {
        key: "schluesseluebergabe",
        route: "/schluesseluebergabe",
        label: t("schluesseluebergabe"),
        description: t("schluesseluebergabe.subtitle"),
        accent: "from-amber-500/20 to-amber-500/5",
      },
      {
        key: "mietvertrag",
        route: "/mietvertrag",
        label: t("mietvertrag"),
        description: t("mietvertrag.subtitle"),
        accent: "from-purple-500/20 to-purple-500/5",
      },
      {
        key: "strom-vertrag",
        route: "/strom-vertrag",
        label: t("stromVertrag"),
        description: t("stromVertrag.subtitle"),
        accent: "from-orange-500/20 to-orange-500/5",
      },
      {
        key: "wasser-vertrag",
        route: "/wasser-vertrag",
        label: t("wasserVertrag"),
        description: t("wasserVertrag.subtitle"),
        accent: "from-cyan-500/20 to-cyan-500/5",
      },
      {
        key: "untermietvertrag",
        route: "/untermietvertrag",
        label: t("untermietvertrag"),
        description: t("untermietvertrag.subtitle"),
        accent: "from-pink-500/20 to-pink-500/5",
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      {/* Kostenübersicht */}
      <div className="rounded-[28px] surface p-6 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-70 pointer-events-none"
          style={{
            background:
              "radial-gradient(900px 420px at 12% 22%, rgba(34,197,94,0.15), transparent 60%), radial-gradient(900px 520px at 82% 28%, rgba(255,255,255,0.05), transparent 62%)",
          }}
        />
        <div className="relative">
          <div className="mb-4">
            <div className="text-xs muted">Übersicht</div>
            <h2 className="mt-2 text-xl font-semibold text-white">Kostenübersicht</h2>
          </div>
          <CostDashboard />
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{t("immobilien")}</h1>
            <div className="mt-1 text-sm muted">
              {t("immobilien.subtitle")}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              {sections.length} Module verfügbar
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => router.push(section.route)}
              className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-4 text-left transition"
            >
              <div className={`mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r ${section.accent}`} />
              <div className="text-sm font-semibold text-white group-hover:text-white">
                {section.label}
              </div>
              <div className="mt-1 text-xs text-white/60">{section.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

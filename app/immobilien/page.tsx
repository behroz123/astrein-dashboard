"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import CostDashboard from "../../components/CostDashboard";
import { usePrefs } from "../../lib/prefs";
import {
  FileText,
  Home,
  CheckSquare,
  Key,
  FileCheck,
  Zap,
  Droplet,
  Users,
} from "lucide-react";

export default function ImmobilienPage() {
  const { t } = usePrefs();
  const router = useRouter();

  const sections = useMemo(
    () => [
      {
        key: "auszuege",
        route: "/auszuege",
        label: t("moveouts"),
        description: t("moveouts.subtitle"),
        icon: FileText,
        accent: "from-indigo-500/20 to-indigo-500/5",
        borderAccent: "border-indigo-500/30",
        hoverAccent: "hover:bg-indigo-500/10",
        iconColor: "text-indigo-400",
      },
      {
        key: "einzuege",
        route: "/einzuege",
        label: t("moveins"),
        description: t("moveins.subtitle"),
        icon: Home,
        accent: "from-emerald-500/20 to-emerald-500/5",
        borderAccent: "border-emerald-500/30",
        hoverAccent: "hover:bg-emerald-500/10",
        iconColor: "text-emerald-400",
      },
      {
        key: "wohnung-checken",
        route: "/wohnung-checken",
        label: t("wohnungChecken"),
        description: t("wohnungChecken.subtitle"),
        icon: CheckSquare,
        accent: "from-sky-500/20 to-sky-500/5",
        borderAccent: "border-sky-500/30",
        hoverAccent: "hover:bg-sky-500/10",
        iconColor: "text-sky-400",
      },
      {
        key: "schluesseluebergabe",
        route: "/schluesseluebergabe",
        label: t("schluesseluebergabe"),
        description: t("schluesseluebergabe.subtitle"),
        icon: Key,
        accent: "from-amber-500/20 to-amber-500/5",
        borderAccent: "border-amber-500/30",
        hoverAccent: "hover:bg-amber-500/10",
        iconColor: "text-amber-400",
      },
      {
        key: "mietvertrag",
        route: "/mietvertrag",
        label: t("mietvertrag"),
        description: t("mietvertrag.subtitle"),
        icon: FileCheck,
        accent: "from-purple-500/20 to-purple-500/5",
        borderAccent: "border-purple-500/30",
        hoverAccent: "hover:bg-purple-500/10",
        iconColor: "text-purple-400",
      },
      {
        key: "strom-vertrag",
        route: "/strom-vertrag",
        label: t("stromVertrag"),
        description: t("stromVertrag.subtitle"),
        icon: Zap,
        accent: "from-orange-500/20 to-orange-500/5",
        borderAccent: "border-orange-500/30",
        hoverAccent: "hover:bg-orange-500/10",
        iconColor: "text-orange-400",
      },
      {
        key: "wasser-vertrag",
        route: "/wasser-vertrag",
        label: t("wasserVertrag"),
        description: t("wasserVertrag.subtitle"),
        icon: Droplet,
        accent: "from-cyan-500/20 to-cyan-500/5",
        borderAccent: "border-cyan-500/30",
        hoverAccent: "hover:bg-cyan-500/10",
        iconColor: "text-cyan-400",
      },
      {
        key: "untermietvertrag",
        route: "/untermietvertrag",
        label: t("untermietvertrag"),
        description: t("untermietvertrag.subtitle"),
        icon: Users,
        accent: "from-pink-500/20 to-pink-500/5",
        borderAccent: "border-pink-500/30",
        hoverAccent: "hover:bg-pink-500/10",
        iconColor: "text-pink-400",
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-[28px] surface p-8 overflow-hidden relative border border-white/5">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(900px 420px at 12% 22%, rgba(30,30,30,0.4), transparent 60%), radial-gradient(900px 520px at 82% 28%, rgba(20,20,20,0.3), transparent 62%)",
          }}
        />
        <div className="relative z-10">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Verwaltung</div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              {t("immobilien.header")}
            </h1>
            <div className="mt-3 text-base text-white/70 max-w-2xl">
              {t("immobilien.description")}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white/70">
              {sections.length} {t("immobilien.modules")}
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white/70">
              {t("immobilien.integrated")}
            </div>
          </div>
        </div>
      </div>

      {/* Kostenübersicht */}
      <div className="rounded-[28px] surface p-8 overflow-hidden relative border border-white/5">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(900px 420px at 12% 22%, rgba(34,197,94,0.1), transparent 60%), radial-gradient(900px 520px at 82% 28%, rgba(20,20,20,0.2), transparent 62%)",
          }}
        />
        <div className="relative z-10">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Finanzübersicht</div>
            <h2 className="text-2xl font-bold text-white">{t("immobilien.costs")}</h2>
          </div>
          <CostDashboard />
        </div>
      </div>

      {/* Module Grid */}
      <div className="rounded-[28px] surface p-8 border border-white/5">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">{t("immobilien.modulesTitle")}</h2>
          <p className="mt-2 text-sm text-white/60">
            {t("immobilien.modulesDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => router.push(section.route)}
                className={`group rounded-2xl border ${section.borderAccent} bg-gradient-to-br ${section.accent} ${section.hoverAccent} px-6 py-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-white/5 hover:border-white/15`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/8 transition-colors">
                  <Icon className={`h-6 w-6 ${section.iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {section.label}
                </h3>
                <p className="mt-2 text-xs text-white/60 group-hover:text-white/70 transition-colors">
                  {section.description}
                </p>
                <div className="mt-4 flex items-center text-xs font-medium text-white/50 group-hover:text-white/70 transition-colors">
                  {t("immobilien.open")} →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

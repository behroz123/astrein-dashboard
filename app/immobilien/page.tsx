"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="rounded-[28px] surface p-12 overflow-hidden relative border border-white/5 bg-gradient-to-br from-white/3 to-white/1">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              "radial-gradient(1200px 600px at 15% 25%, rgba(59,130,246,0.15), transparent 50%), radial-gradient(1000px 800px at 85% 30%, rgba(139,92,246,0.12), transparent 55%)",
          }}
        />
        <div className="relative z-10">
          <div className="space-y-4">
            <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                {t("immobilien.modules")} Verwaltung
              </span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
              {t("immobilien.header")}
            </h1>
            <p className="text-lg text-white/70 max-w-2xl leading-relaxed">
              {t("immobilien.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Module Grid */}
      <div className="rounded-[28px] surface p-10 border border-white/5">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">{t("immobilien.modulesTitle")}</h2>
          <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <p className="mt-4 text-base text-white/60 max-w-2xl">
            {t("immobilien.modulesDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => router.push(section.route)}
                className={`group relative rounded-[20px] border ${section.borderAccent} bg-gradient-to-br ${section.accent} ${section.hoverAccent} px-6 py-8 text-left transition-all duration-300 hover:shadow-xl hover:shadow-white/10 hover:border-white/20 overflow-hidden`}
              >
                {/* Decorative gradient background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none" style={{background: `linear-gradient(135deg, var(--tw-gradient-stops))`}}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 group-hover:from-white/15 group-hover:to-white/10 transition-all border border-white/5">
                    <Icon className={`h-7 w-7 ${section.iconColor}`} />
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-white transition-colors">
                    {section.label}
                  </h3>
                  <p className="mt-3 text-sm text-white/60 group-hover:text-white/75 transition-colors leading-relaxed">
                    {section.description}
                  </p>
                  <div className="mt-6 inline-flex items-center text-sm font-semibold text-white/60 group-hover:text-white transition-colors">
                    {t("immobilien.open")}
                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
    <div className="space-y-10">
      {/* Premium Header with Animated Gradient */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/40 via-purple-900/20 to-slate-900/40 p-12 lg:p-16">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Verwaltungssystem</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            {t("immobilien.header")}
          </h1>
          
          <p className="text-lg text-white/70 leading-relaxed max-w-2xl mb-8">
            {t("immobilien.description")}
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <p className="text-xs text-white/60 uppercase tracking-wide">Module</p>
              <p className="text-2xl font-bold text-white mt-1">{sections.length}</p>
            </div>
            <div className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <p className="text-xs text-white/60 uppercase tracking-wide">Status</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">Aktiv</p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Grid - Premium Layout */}
      <div>
        <div className="mb-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">{t("immobilien.modulesTitle")}</h2>
          <div className="flex items-center space-x-3">
            <div className="h-1.5 w-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
            <p className="text-base text-white/60">{t("immobilien.modulesDesc")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => router.push(section.route)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm p-8 text-left transition-all duration-500 hover:border-white/30 hover:shadow-2xl hover:shadow-white/10"
              >
                {/* Hover Gradient Overlay */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${section.accent}`}></div>
                
                {/* Animated Border Glow */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl border border-white/20 blur-xl pointer-events-none`}></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon Container */}
                  <div className="mb-6 inline-flex items-center justify-center">
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${section.accent} rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                      <div className="relative w-14 h-14 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors">
                        <Icon className={`w-7 h-7 ${section.iconColor} group-hover:scale-110 transition-transform`} />
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white mb-3 group-hover:text-white transition-colors">
                    {section.label}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-white/60 group-hover:text-white/75 transition-colors leading-relaxed mb-5">
                    {section.description}
                  </p>

                  {/* Footer Link */}
                  <div className="flex items-center text-sm font-semibold text-white/60 group-hover:text-white transition-all duration-300">
                    <span>{t("immobilien.open")}</span>
                    <span className="ml-2 inline-block group-hover:translate-x-2 transition-transform duration-300">→</span>
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

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

// Theme configurations
const THEME_CONFIG = {
  light: {
    headerBg: "bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200/40",
    headerText: "text-slate-900",
    headerDesc: "text-slate-700",
    cardBg: "bg-white",
    cardBorder: "border-slate-200/50",
    cardHover: "hover:bg-slate-50/80 hover:border-slate-300/70 hover:shadow-lg",
    titleText: "text-slate-900",
    descText: "text-slate-700",
    accent: "bg-gradient-to-r from-blue-500 to-blue-600",
    badge: "bg-blue-50 text-blue-900 border-blue-200",
  },
  glass: {
    headerBg: "bg-white/10 backdrop-blur-xl border-white/30",
    headerText: "text-white",
    headerDesc: "text-white/75",
    cardBg: "bg-white/8 backdrop-blur-md border border-white/15",
    cardBorder: "border-white/20",
    cardHover: "hover:bg-white/15 hover:border-white/40 hover:shadow-2xl hover:shadow-white/10",
    titleText: "text-white",
    descText: "text-white/75",
    accent: "bg-gradient-to-r from-cyan-300 to-blue-400",
    badge: "bg-white/20 text-white border-white/30",
  },
  midnight: {
    headerBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-700/50",
    headerText: "text-white",
    headerDesc: "text-slate-300",
    cardBg: "bg-slate-900/70 border border-slate-700/30",
    cardBorder: "border-slate-700/40",
    cardHover: "hover:bg-slate-800/70 hover:border-slate-600/60 hover:shadow-xl hover:shadow-slate-900/50",
    titleText: "text-white",
    descText: "text-slate-300",
    accent: "bg-gradient-to-r from-violet-500 to-purple-500",
    badge: "bg-slate-800 text-slate-100 border-slate-600/60",
  },
  graphite: {
    headerBg: "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600/40",
    headerText: "text-white",
    headerDesc: "text-gray-300",
    cardBg: "bg-gray-800/60 border border-gray-700/40",
    cardBorder: "border-gray-700/50",
    cardHover: "hover:bg-gray-700/60 hover:border-gray-600/70 hover:shadow-xl hover:shadow-gray-900/50",
    titleText: "text-white",
    descText: "text-gray-300",
    accent: "bg-gradient-to-r from-teal-500 to-cyan-500",
    badge: "bg-gray-700 text-gray-100 border-gray-600/70",
  },
  aurora: {
    headerBg: "bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 border-purple-500/30",
    headerText: "text-white",
    headerDesc: "text-slate-200",
    cardBg: "bg-white/5 backdrop-blur border border-purple-400/25",
    cardBorder: "border-purple-400/30",
    cardHover: "hover:bg-purple-500/15 hover:border-purple-400/50 hover:shadow-xl hover:shadow-purple-500/20",
    titleText: "text-white",
    descText: "text-slate-200",
    accent: "bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500",
    badge: "bg-purple-500/30 text-purple-100 border-purple-400/60",
  },
  neon: {
    headerBg: "bg-gradient-to-br from-slate-950 to-slate-900 border-lime-500/40",
    headerText: "text-white",
    headerDesc: "text-slate-300",
    cardBg: "bg-slate-900/70 border border-lime-500/25",
    cardBorder: "border-lime-500/30",
    cardHover: "hover:bg-lime-500/10 hover:border-lime-400/60 hover:shadow-xl hover:shadow-lime-500/20",
    titleText: "text-white",
    descText: "text-slate-300",
    accent: "bg-gradient-to-r from-lime-400 to-emerald-400",
    badge: "bg-lime-500/30 text-lime-200 border-lime-400/70",
  },
};

export default function ImmobilienPage() {
  const { t, theme } = usePrefs();
  const router = useRouter();
  const themeConfig = THEME_CONFIG[theme as keyof typeof THEME_CONFIG] || THEME_CONFIG.glass;

  const sections = useMemo(
    () => [
      {
        key: "auszuege",
        route: "/auszuege",
        label: t("moveouts"),
        description: t("moveouts.subtitle"),
        icon: FileText,
      },
      {
        key: "einzuege",
        route: "/einzuege",
        label: t("moveins"),
        description: t("moveins.subtitle"),
        icon: Home,
      },
      {
        key: "wohnung-checken",
        route: "/wohnung-checken",
        label: t("wohnungChecken"),
        description: t("wohnungChecken.subtitle"),
        icon: CheckSquare,
      },
      {
        key: "schluesseluebergabe",
        route: "/schluesseluebergabe",
        label: t("schluesseluebergabe"),
        description: t("schluesseluebergabe.subtitle"),
        icon: Key,
      },
      {
        key: "mietvertrag",
        route: "/mietvertrag",
        label: t("mietvertrag"),
        description: t("mietvertrag.subtitle"),
        icon: FileCheck,
      },
      {
        key: "strom-vertrag",
        route: "/strom-vertrag",
        label: t("stromVertrag"),
        description: t("stromVertrag.subtitle"),
        icon: Zap,
      },
      {
        key: "wasser-vertrag",
        route: "/wasser-vertrag",
        label: t("wasserVertrag"),
        description: t("wasserVertrag.subtitle"),
        icon: Droplet,
      },
      {
        key: "untermietvertrag",
        route: "/untermietvertrag",
        label: t("untermietvertrag"),
        description: t("untermietvertrag.subtitle"),
        icon: Users,
      },
    ],
    [t]
  );

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className={`rounded-3xl border ${themeConfig.headerBg} p-12 lg:p-16 overflow-hidden relative`}>
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <div className={`h-1.5 w-12 ${themeConfig.accent} rounded-full`}></div>
            <span className={`text-xs font-bold uppercase tracking-widest ${themeConfig.headerDesc}`}>
              Verwaltungssystem
            </span>
          </div>

          <h1 className={`text-5xl lg:text-6xl font-bold ${themeConfig.headerText} mb-6 leading-tight`}>
            {t("immobilien.header")}
          </h1>

          <p className={`text-lg ${themeConfig.headerDesc} leading-relaxed max-w-3xl mb-8`}>
            {t("immobilien.description")}
          </p>

          <div className="flex flex-wrap gap-4">
            <div className={`px-5 py-3 rounded-xl ${themeConfig.badge} border`}>
              <p className={`text-xs font-semibold uppercase tracking-wide opacity-75`}>Module</p>
              <p className={`text-2xl font-bold mt-1 ${themeConfig.titleText}`}>{sections.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Title Section */}
      <div>
        <h2 className={`text-3xl lg:text-4xl font-bold ${themeConfig.titleText} mb-3`}>
          {t("immobilien.modulesTitle")}
        </h2>
        <div className="flex items-center gap-3">
          <div className={`h-1.5 w-16 ${themeConfig.accent} rounded-full`}></div>
          <p className={`text-base ${themeConfig.descText}`}>{t("immobilien.modulesDesc")}</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              onClick={() => router.push(section.route)}
              className={`group relative rounded-2xl border ${themeConfig.cardBg} ${themeConfig.cardBorder} ${themeConfig.cardHover} p-8 text-left transition-all duration-300 hover:shadow-lg`}
            >
              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-6 inline-flex">
                  <div className={`w-12 h-12 rounded-xl ${themeConfig.accent} opacity-20 group-hover:opacity-30 transition-opacity flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-base font-bold ${themeConfig.titleText} mb-3`}>
                  {section.label}
                </h3>

                {/* Description */}
                <p className={`text-sm ${themeConfig.descText} leading-relaxed mb-5`}>
                  {section.description}
                </p>

                {/* Link */}
                <div className={`text-sm font-semibold ${themeConfig.descText} group-hover:${themeConfig.titleText} transition-colors flex items-center gap-2`}>
                  <span>{t("immobilien.open")}</span>
                  <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

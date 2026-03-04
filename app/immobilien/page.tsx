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
    headerBg: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/30",
    headerText: "text-slate-900",
    headerDesc: "text-slate-600",
    cardBg: "bg-white/80",
    cardBorder: "border-blue-200/30",
    cardHover: "hover:bg-blue-50/50 hover:border-blue-300/50",
    titleText: "text-slate-900",
    descText: "text-slate-600",
    accent: "bg-gradient-to-r from-blue-500 to-indigo-500",
    badge: "bg-blue-100 text-blue-900 border-blue-200",
  },
  glass: {
    headerBg: "bg-white/10 backdrop-blur-xl border-white/20",
    headerText: "text-white",
    headerDesc: "text-white/70",
    cardBg: "bg-white/5 backdrop-blur-md",
    cardBorder: "border-white/20",
    cardHover: "hover:bg-white/10 hover:border-white/30",
    titleText: "text-white",
    descText: "text-white/70",
    accent: "bg-gradient-to-r from-cyan-400 to-blue-500",
    badge: "bg-white/20 text-white border-white/30",
  },
  midnight: {
    headerBg: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/30",
    headerText: "text-white",
    headerDesc: "text-slate-300",
    cardBg: "bg-slate-900/50",
    cardBorder: "border-slate-700/30",
    cardHover: "hover:bg-slate-800/50 hover:border-slate-600/50",
    titleText: "text-white",
    descText: "text-slate-300",
    accent: "bg-gradient-to-r from-slate-600 to-slate-400",
    badge: "bg-slate-800 text-slate-100 border-slate-600",
  },
  graphite: {
    headerBg: "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600/30",
    headerText: "text-white",
    headerDesc: "text-gray-300",
    cardBg: "bg-gray-800/40",
    cardBorder: "border-gray-600/30",
    cardHover: "hover:bg-gray-700/40 hover:border-gray-500/50",
    titleText: "text-white",
    descText: "text-gray-300",
    accent: "bg-gradient-to-r from-gray-600 to-gray-500",
    badge: "bg-gray-700 text-gray-100 border-gray-600",
  },
  aurora: {
    headerBg: "bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-600/20 border-purple-400/30",
    headerText: "text-white",
    headerDesc: "text-white/75",
    cardBg: "bg-white/5",
    cardBorder: "border-purple-400/20",
    cardHover: "hover:bg-purple-500/10 hover:border-purple-400/40",
    titleText: "text-white",
    descText: "text-white/70",
    accent: "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500",
    badge: "bg-purple-500/30 text-purple-100 border-purple-400/50",
  },
  neon: {
    headerBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-lime-500/40",
    headerText: "text-white",
    headerDesc: "text-white/70",
    cardBg: "bg-slate-900/60",
    cardBorder: "border-lime-500/30",
    cardHover: "hover:bg-slate-800/60 hover:border-lime-400/60",
    titleText: "text-white",
    descText: "text-white/70",
    accent: "bg-gradient-to-r from-lime-400 to-cyan-400",
    badge: "bg-lime-500/30 text-lime-100 border-lime-400/60",
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
}

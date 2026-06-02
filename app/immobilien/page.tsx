"use client";

import { useRouter } from "next/navigation";
import { usePrefs } from "../../lib/prefs";
import Link from "next/link";
import {
  FileText,
  Home,
  CheckSquare,
  Key,
  FileCheck,
  Zap,
  Droplet,
  Flame,
  Users,
  ArrowRight,
  FolderOpen,
} from "lucide-react";

export default function ImmobilienPage() {
  const { t } = usePrefs();
  const router = useRouter();

  const items = [
    {
      icon: FileText,
      labelKey: "immobilien.item.rental",
      descKey: "immobilien.item.rental.desc",
      path: "/mietvertrag",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Users,
      labelKey: "immobilien.item.sublease",
      descKey: "immobilien.item.sublease.desc",
      path: "/untermietvertrag",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Key,
      labelKey: "immobilien.item.keyhandover",
      descKey: "immobilien.item.keyhandover.desc",
      path: "/schluesseluebergabe",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: Home,
      labelKey: "immobilien.item.apartmentcheck",
      descKey: "immobilien.item.apartmentcheck.desc",
      path: "/wohnung-checken",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Zap,
      labelKey: "immobilien.item.electricity",
      descKey: "immobilien.item.electricity.desc",
      path: "/strom-vertrag",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      icon: Droplet,
      labelKey: "immobilien.item.water",
      descKey: "immobilien.item.water.desc",
      path: "/wasser-vertrag",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      icon: Flame,
      labelKey: "immobilien.item.gas",
      descKey: "immobilien.item.gas.desc",
      path: "/gas-vertrag",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: FolderOpen,
      labelKey: "immobilien.item.moveins",
      descKey: "immobilien.item.moveins.desc",
      path: "/einzuege",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      icon: CheckSquare,
      labelKey: "immobilien.item.moveouts",
      descKey: "immobilien.item.moveouts.desc",
      path: "/auszuege",
      color: "from-red-500 to-red-600",
    },
    {
      icon: FileCheck,
      labelKey: "immobilien.item.apartments",
      descKey: "immobilien.item.apartments.desc",
      path: "/wohnungen",
      color: "from-teal-500 to-teal-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] surface p-6 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-70 pointer-events-none"
          style={{
            background:
              "radial-gradient(900px 420px at 12% 22%, rgba(var(--accent),0.18), transparent 60%), radial-gradient(900px 520px at 82% 28%, rgba(255,255,255,0.05), transparent 62%)",
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="text-xs muted">
              {t("appName")} {t("companyLine")}
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-white">{t("immobilien")}</h1>
            <div className="mt-1 text-sm muted">
              {t("immobilien.description")}
            </div>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition self-start lg:self-auto"
          >
            ← {t("nav.dashboard")}
          </Link>
        </div>
      </div>

      {/* Premium Grid with Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => router.push(item.path)}
              className="group relative rounded-2xl surface p-6 text-left transition-all duration-300 hover:shadow-lg"
            >
              {/* Premium Icon */}
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-30 blur-md transition-all duration-300"
                     style={{ background: `linear-gradient(135deg, var(--${item.color.split('-')[1]}-500), transparent)` }}>
                </div>
                <div
                  className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-bold text-white">{t(item.labelKey)}</h3>
                <p className="text-sm opacity-60 leading-relaxed">{t(item.descKey)}</p>
              </div>

              {/* Action */}
              <div className="flex items-center gap-2 text-sm font-semibold opacity-60 group-hover:opacity-100 transition">
                <span>{t("common.open")}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

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
  ArrowRight,
  FolderOpen,
} from "lucide-react";

export default function ImmobilienPage() {
  const { t } = usePrefs();
  const router = useRouter();

  const sections = [
    {
      title: "Vertragsmanagement",
      description: "Verträge erstellen und verwalten",
      items: [
        {
          icon: FileText,
          label: "Mietvertrag",
          desc: "Hauptmietvertrag erstellen",
          path: "/mietvertrag",
          color: "from-blue-500 to-blue-600",
          badge: "Wichtig",
        },
        {
          icon: Users,
          label: "Untermietvertrag",
          desc: "Untermietvertrag erstellen",
          path: "/untermietvertrag",
          color: "from-indigo-500 to-indigo-600",
        },
        {
          icon: Zap,
          label: "Stromvertrag",
          desc: "Stromvertrag verwalten",
          path: "/strom-vertrag",
          color: "from-yellow-500 to-yellow-600",
        },
        {
          icon: Droplet,
          label: "Wasservertrag",
          desc: "Wasservertrag verwalten",
          path: "/wasser-vertrag",
          color: "from-cyan-500 to-cyan-600",
        },
      ],
    },
    {
      title: "Übergabe & Protokolle",
      description: "Dokumentation und Übergabeprotokolle",
      items: [
        {
          icon: Key,
          label: "Schlüsselübergabe",
          desc: "Protokoll erstellen",
          path: "/schluesseluebergabe",
          color: "from-purple-500 to-purple-600",
        },
        {
          icon: Home,
          label: "Wohnung checken",
          desc: "Übergabeprotokoll",
          path: "/wohnung-checken",
          color: "from-green-500 to-green-600",
        },
        {
          icon: FileCheck,
          label: "Wohnungen",
          desc: "Wohnungsübersicht",
          path: "/wohnungen",
          color: "from-teal-500 to-teal-600",
          badge: "Neu",
        },
      ],
    },
    {
      title: "Ein- & Auszüge",
      description: "Mieter Ein- und Auszugsverwaltung",
      items: [
        {
          icon: FolderOpen,
          label: "Einzüge",
          desc: "Einzüge verwalten",
          path: "/einzuege",
          color: "from-emerald-500 to-emerald-600",
        },
        {
          icon: CheckSquare,
          label: "Auszüge",
          desc: "Auszüge verwalten",
          path: "/auszuege",
          color: "from-orange-500 to-orange-600",
        },
      ],
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "rgb(var(--foreground))" }}>
        {t("immobilien")}
      </h1>

      {/* All sections combined */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sections.flatMap((section) => section.items).map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => router.push(item.path)}
              className="group relative rounded-xl p-6 text-left transition-all"
              style={{
                background: "rgb(var(--card-bg))",
                border: "1px solid rgb(var(--border))",
              }}
            >
              {item.badge && (
                <span
                  className="absolute top-3 right-3 px-2 py-0.5 rounded text-xs font-bold"
                  style={{ background: "rgb(var(--accent))", color: "white" }}
                >
                  {item.badge}
                </span>
              )}

              <div
                className={`w-11 h-11 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>

              <h3 className="font-semibold mb-1" style={{ color: "rgb(var(--foreground))" }}>
                {item.label}
              </h3>
              <p className="text-sm opacity-60">{item.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

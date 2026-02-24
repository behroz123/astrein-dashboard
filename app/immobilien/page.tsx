"use client";

import { useMemo, useState } from "react";
import AuszuegePage from "../auszuege/page";
import EinzuegePage from "../einzuege/page";
import WohnungCheckenPage from "../wohnung-checken/page";
import SchluesseluebergabePage from "../schluesseluebergabe/page";
import MietvertragPage from "../mietvertrag/page";
import StromVertragPage from "../strom-vertrag/page";
import WasserVertragPage from "../wasser-vertrag/page";
import UntermietvertragPage from "../untermietvertrag/page";
import { usePrefs } from "../../lib/prefs";

export default function ImmobilienPage() {
  const { t } = usePrefs();
  const [tab, setTab] = useState<
    | "auszuege"
    | "einzuege"
    | "wohnung-checken"
    | "schluesseluebergabe"
    | "mietvertrag"
    | "strom-vertrag"
    | "wasser-vertrag"
    | "untermietvertrag"
  >( "auszuege");

  const sections = useMemo(
    () => [
      {
        key: "auszuege",
        label: t("moveouts"),
        description: "Auszüge dokumentieren",
        accent: "from-indigo-500/20 to-indigo-500/5",
      },
      {
        key: "einzuege",
        label: t("moveins"),
        description: t("moveins.subtitle"),
        accent: "from-emerald-500/20 to-emerald-500/5",
      },
      {
        key: "wohnung-checken",
        label: t("wohnungChecken"),
        description: t("wohnungChecken.subtitle"),
        accent: "from-sky-500/20 to-sky-500/5",
      },
      {
        key: "schluesseluebergabe",
        label: t("schluesseluebergabe"),
        description: t("schluesseluebergabe.subtitle"),
        accent: "from-amber-500/20 to-amber-500/5",
      },
      {
        key: "mietvertrag",
        label: t("mietvertrag"),
        description: t("mietvertrag.subtitle"),
        accent: "from-purple-500/20 to-purple-500/5",
      },
      {
        key: "strom-vertrag",
        label: t("stromVertrag"),
        description: t("stromVertrag.subtitle"),
        accent: "from-orange-500/20 to-orange-500/5",
      },
      {
        key: "wasser-vertrag",
        label: t("wasserVertrag"),
        description: t("wasserVertrag.subtitle"),
        accent: "from-cyan-500/20 to-cyan-500/5",
      },
      {
        key: "untermietvertrag",
        label: t("untermietvertrag"),
        description: t("untermietvertrag.subtitle"),
        accent: "from-pink-500/20 to-pink-500/5",
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
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
              {sections.length} Module
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              Aktiver Bereich: <span className="text-white">{sections.find((s) => s.key === tab)?.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => setTab(section.key as typeof tab)}
              className={`group rounded-2xl border px-4 py-4 text-left transition ${
                tab === section.key
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
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

      <div className="rounded-[28px] surface p-6">
        {tab === "auszuege" ? (
          <AuszuegePage />
        ) : tab === "einzuege" ? (
          <EinzuegePage />
        ) : tab === "wohnung-checken" ? (
          <WohnungCheckenPage />
        ) : tab === "schluesseluebergabe" ? (
          <SchluesseluebergabePage />
        ) : tab === "mietvertrag" ? (
          <MietvertragPage />
        ) : tab === "strom-vertrag" ? (
          <StromVertragPage />
        ) : tab === "wasser-vertrag" ? (
          <WasserVertragPage />
        ) : (
          <UntermietvertragPage />
        )}
      </div>
    </div>
  );
}

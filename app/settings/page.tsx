"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePrefs } from "../../lib/prefs";

function hexToRgbTriplet(hex: string) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r} ${g} ${b}`;
}

function rgbTripletToHex(triplet?: string) {
  const safe = String(triplet ?? "99 102 241").trim();
  const parts = safe.split(/\s+/).filter(Boolean);
  const r = Math.max(0, Math.min(255, Number(parts[0] ?? 99)));
  const g = Math.max(0, Math.min(255, Number(parts[1] ?? 102)));
  const b = Math.max(0, Math.min(255, Number(parts[2] ?? 241)));
  const to = (n: number) => (Number.isFinite(n) ? n.toString(16).padStart(2, "0") : "00");
  return `#${to(r)}${to(g)}${to(b)}`;
}

type MenuPos = { top: number; left: number; width: number };

function LangMenuPortal({
  open,
  anchorEl,
  onClose,
  options,
  activeId,
  onSelect,
}: {
  open: boolean;
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  options: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [pos, setPos] = useState<MenuPos | null>(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const compute = () => {
      const r = anchorEl.getBoundingClientRect();
      const w = Math.max(240, r.width);
      // align right edge with button
      const left = Math.min(window.innerWidth - w - 12, Math.max(12, r.right - w));
      const top = Math.min(window.innerHeight - 12, r.bottom + 10);
      setPos({ top, left, width: w });
    };

    compute();

    const onResize = () => compute();
    const onScroll = () => compute(); // any scroll, recalc
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, anchorEl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !pos) return null;

  return createPortal(
    <>
      {/* Overlay to catch clicks */}
      <div
        onMouseDown={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100000,
          background: "transparent",
        }}
      />

      {/* Menu */}
      <div
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: pos.width,
          zIndex: 100001,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.70)",
          backdropFilter: "blur(16px)",
          padding: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.60)",
        }}
      >
        {options.map((x) => {
          const active = x.id === activeId;
          return (
            <button
              key={x.id}
              onClick={() => {
                onSelect(x.id);
                onClose();
              }}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 14,
                padding: "10px 12px",
                margin: 0,
                border: active ? "1px solid rgba(var(--accent),0.22)" : "1px solid transparent",
                background: active ? "rgba(var(--accent),0.14)" : "transparent",
                color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.82)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (active) return;
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.95)";
              }}
              onMouseLeave={(e) => {
                if (active) return;
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.82)";
              }}
            >
              {x.label}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  );
}

export default function SettingsPage() {
  const { lang, setLang, theme, setTheme, accent, setAccent, t } = usePrefs();

  const [langOpen, setLangOpen] = useState(false);
  const langBtnRef = useRef<HTMLButtonElement | null>(null);

  const [colorHex, setColorHex] = useState(() => rgbTripletToHex(accent));
  useEffect(() => setColorHex(rgbTripletToHex(accent)), [accent]);

  const languages = useMemo(
    () => [
      { id: "de", label: "Deutsch" },
      { id: "en", label: "English" },
      { id: "tr", label: "Türkçe" },
      { id: "ro", label: "Română" },
      { id: "ru", label: "Русский" },
    ],
    []
  );

  const themes = useMemo(
    () => [
      { id: "glass", title: "Glass", desc: "Soft glow" },
      { id: "midnight", title: "Midnight", desc: "Deep contrast" },
      { id: "graphite", title: "Graphite", desc: "Minimal texture" },
      { id: "aurora", title: "Aurora", desc: "Color waves" },
      { id: "neon", title: "Neon", desc: "Vibrant highlights" },
    ],
    []
  );

  const accentPresets = useMemo(
    () => [
      { name: "Indigo", rgb: "99 102 241" },
      { name: "Cyan", rgb: "34 211 238" },
      { name: "Emerald", rgb: "34 197 94" },
      { name: "Orange", rgb: "249 115 22" },
      { name: "Pink", rgb: "236 72 153" },
      { name: "Violet", rgb: "139 92 246" },
    ],
    []
  );

  const currentLangLabel = languages.find((x) => x.id === lang)?.label ?? "Deutsch";

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] surface p-6">
        <h1 className="text-xl font-semibold text-white">{t("settings")}</h1>
        <p className="mt-1 text-sm muted">
          {t("language")} · {t("theme")} · {t("color")}
        </p>
      </div>

      {/* Language */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white/90">{t("language")}</div>
            <div className="mt-1 text-xs muted">
              {t("preview")}: {currentLangLabel}
            </div>
          </div>

          <button
            ref={langBtnRef}
            onClick={() => setLangOpen((v) => !v)}
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
          >
            {currentLangLabel}
          </button>

          <LangMenuPortal
            open={langOpen}
            anchorEl={langBtnRef.current}
            onClose={() => setLangOpen(false)}
            options={languages}
            activeId={lang}
            onSelect={(id) => setLang(id as any)}
          />
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-[28px] surface p-6">
        <div className="text-sm font-semibold text-white/90">{t("theme")}</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {themes.map((x) => (
            <button
              key={x.id}
              onClick={() => setTheme(x.id as any)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                theme === x.id
                  ? "border-white/25 bg-white/5 text-white accent-ring"
                  : "border-white/10 bg-black/20 text-white/80 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{x.title}</div>
                {theme === x.id && <div className="text-xs accent-text font-semibold">Active</div>}
              </div>
              <div className="mt-1 text-xs muted">{x.desc}</div>
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full" style={{ width: "70%", background: "rgb(var(--accent))" }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white/90">{t("color")}</div>
            <div className="mt-1 text-xs muted">rgb({accent})</div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => {
                const hex = e.target.value;
                setColorHex(hex);
                setAccent(hexToRgbTriplet(hex));
              }}
              className="h-11 w-16 rounded-xl border border-white/10 bg-black/25"
            />
            <button className="rounded-2xl btn-accent px-4 py-2 text-sm font-semibold">
              {t("preview")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {accentPresets.map((p) => (
            <button
              key={p.name}
              onClick={() => setAccent(p.rgb)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                accent === p.rgb
                  ? "border-white/25 bg-white/5 accent-ring"
                  : "border-white/10 bg-black/20 hover:bg-white/5"
              }`}
            >
              <div className="text-xs text-white/85 font-semibold">{p.name}</div>
              <div className="mt-2 h-2 rounded-full" style={{ background: `rgb(${p.rgb})` }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
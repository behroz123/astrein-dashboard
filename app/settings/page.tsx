"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePrefs } from "../../lib/prefs";
import { useTheme } from "../../lib/themeContext";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

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
  const to = (n: number) =>
    Number.isFinite(n) ? n.toString(16).padStart(2, "0") : "00";
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
      const left = Math.min(window.innerWidth - w - 12, Math.max(12, r.right - w));
      const top = Math.min(window.innerHeight - 12, r.bottom + 10);
      setPos({ top, left, width: w });
    };

    compute();

    const onResize = () => compute();
    const onScroll = () => compute();
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
      <div
        onMouseDown={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100000,
          background: "transparent",
        }}
      />

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
  const router = useRouter();
  const { lang, setLang, theme, setTheme, accent, setAccent, t } = usePrefs();

  const [langOpen, setLangOpen] = useState(false);
  const langBtnRef = useRef<HTMLButtonElement | null>(null);

  const [colorHex, setColorHex] = useState(() => rgbTripletToHex(accent));
  useEffect(() => setColorHex(rgbTripletToHex(accent)), [accent]);

  // User Profile
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("mitarbeiter");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Profile Edit Modal
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPassword2, setEditPassword2] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      setUserId(u.uid);
      setUserEmail(u.email || "");

      const userDoc = await getDoc(doc(db, "users", u.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const name = data.name || data.displayName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : u.email?.split('@')[0] || "Benutzer");
        setUserName(name);
        setEditName(name);
        setUserRole(data.role || "mitarbeiter");
      } else {
        setUserName(u.email?.split('@')[0] || "Benutzer");
        setEditName(u.email?.split('@')[0] || "Benutzer");
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  // ✅ language labels translated via t()
  const languages = useMemo(
    () => [
      { id: "de", label: t("lang.de") },
      { id: "en", label: t("lang.en") },
      { id: "tr", label: t("lang.tr") },
      { id: "ro", label: t("lang.ro") },
      { id: "ru", label: t("lang.ru") },
    ],
    [t]
  );

  // ✅ theme cards translated via t()
  const themes = useMemo(
    () => [
      { id: "light", title: t("theme.light.title"), desc: t("theme.light.desc") },
      { id: "glass", title: t("theme.glass.title"), desc: t("theme.glass.desc") },
      { id: "midnight", title: t("theme.midnight.title"), desc: t("theme.midnight.desc") },
      { id: "graphite", title: t("theme.graphite.title"), desc: t("theme.graphite.desc") },
      { id: "aurora", title: t("theme.aurora.title"), desc: t("theme.aurora.desc") },
      { id: "neon", title: t("theme.neon.title"), desc: t("theme.neon.desc") },
    ],
    [t]
  );

  // ✅ accent preset labels translated via t()
  const accentPresets = useMemo(
    () => [
      { name: t("accentPreset.indigo"), rgb: "99 102 241" },
      { name: t("accentPreset.cyan"), rgb: "34 211 238" },
      { name: t("accentPreset.emerald"), rgb: "34 197 94" },
      { name: t("accentPreset.orange"), rgb: "249 115 22" },
      { name: t("accentPreset.pink"), rgb: "236 72 153" },
      { name: t("accentPreset.violet"), rgb: "139 92 246" },
    ],
    [t]
  );

  const currentLangLabel = languages.find((x) => x.id === lang)?.label ?? t("lang.de");

  if (loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        Lädt...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                 style={{ background: `linear-gradient(135deg, rgb(var(--accent)), rgba(var(--accent), 0.6))` }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">{userName}</h1>
              <p className="text-sm text-white/60">{userEmail}</p>
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                   style={{ 
                     background: userRole === "admin" ? "rgba(139, 92, 246, 0.15)" : "rgba(34, 197, 94, 0.15)",
                     color: userRole === "admin" ? "rgb(139, 92, 246)" : "rgb(34, 197, 94)"
                   }}>
                {userRole === "admin" ? "Administrator" : "Mitarbeiter"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditMode(true)}
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 transition"
          >
            ✏️ Bearbeiten
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white/90">{t("language")}</div>
            <div className="mt-1 text-xs muted">
              {currentLangLabel}
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
                {theme === x.id && (
                  <div className="text-xs accent-text font-semibold">{t("active")}</div>
                )}
              </div>
              <div className="mt-1 text-xs muted">{x.desc}</div>
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full" style={{ width: "70%", background: "rgb(var(--accent))" }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Design Themes */}
      <div className="rounded-[28px] surface p-6">
        <div className="mb-6">
          <div className="text-sm font-semibold text-white/90">Design Themes</div>
          <div className="mt-1 text-xs muted">Light Mode ist immer aktiv</div>
        </div>
        <div className="text-sm text-white/70 bg-white/5 rounded-lg p-4">
          Das Design ist auf Light Mode festgelegt und kann nicht geändert werden.
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

      {/* Profile Edit Modal */}
      {editMode && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100000,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setEditMode(false)}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 28,
              padding: 32,
              maxWidth: 500,
              width: "100%",
              backdropFilter: "blur(16px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Profil bearbeiten</h2>

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
                {editError}
              </div>
            )}

            {editSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-200 text-sm">
                Profil erfolgreich aktualisiert!
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 text-white px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                  placeholder="Name eingeben"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">Neues Passwort (optional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 text-white px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                  placeholder="Passwort eingeben"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">Passwort wiederholen</label>
                <input
                  type="password"
                  value={editPassword2}
                  onChange={(e) => setEditPassword2(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 text-white px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                  placeholder="Passwort bestätigen"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setEditError(null);
                  setEditSuccess(false);
                  setSaving(true);

                  try {
                    if (!userId) throw new Error("Benutzer nicht gefunden");

                    // Update name in Firestore
                    if (editName && editName !== userName) {
                      const { updateDoc, doc: firebaseDoc } = await import('firebase/firestore');
                      await updateDoc(firebaseDoc(db, "users", userId), { name: editName });
                      setUserName(editName);
                    }

                    // Update password if provided
                    if (editPassword) {
                      if (editPassword !== editPassword2) {
                        throw new Error("Passwörter stimmen nicht überein");
                      }
                      if (editPassword.length < 6) {
                        throw new Error("Passwort muss mind. 6 Zeichen lang sein");
                      }

                      const { updatePassword } = await import('firebase/auth');
                      const currentUser = auth.currentUser;
                      if (currentUser) {
                        await updatePassword(currentUser, editPassword);
                      }
                    }

                    setEditSuccess(true);
                    setTimeout(() => {
                      setEditMode(false);
                      setEditPassword("");
                      setEditPassword2("");
                      setEditSuccess(false);
                    }, 2000);
                  } catch (err: any) {
                    setEditError(err?.message || "Fehler beim Speichern");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-3 transition disabled:opacity-50"
              >
                {saving ? "Speichert..." : "Speichern"}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditError(null);
                  setEditSuccess(false);
                  setEditPassword("");
                  setEditPassword2("");
                }}
                className="flex-1 rounded-xl border border-white/10 bg-black/30 hover:bg-white/5 text-white font-semibold px-4 py-3 transition"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

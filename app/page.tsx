"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import { usePrefs } from "../lib/prefs";
// حذف ساعت داشبورد

type Item = {
  id: string;
  name?: string;
  type?: string;
  category?: string;
  lagerId?: string;
  lager?: string;
  lage?: string;
  location?: string;
  zustand?: string;
  condition?: string;
  status?: string;
  stock?: number;
  bestand?: number;
};

type Booking = {
  id: string;
  userId?: string;
  itemId?: string;
  lagerId?: string;
  aktion?: string;
  menge?: number;
  zeit?: any;
};

function safeNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pickLager(x: any) {
  const raw =
    x?.lagerId ??
    x?.lager ??
    x?.lage ??
    x?.location ??
    x?.standort ??
    x?.warehouse ??
    x?.Lager ??
    x?.LAGE;

  const s = String(raw ?? "").trim();
  if (!s) return "—";

  const up = s.toUpperCase();
  if (up === "LA" || up.endsWith(" LA")) return "LA";
  if (up === "LB" || up.endsWith(" LB")) return "LB";

  return s.length <= 8 ? up : s;
}

function normConditionKey(v: any) {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("repar") || s.includes("def") || s.includes("kaputt")) return "needsRepair";
  if (s.includes("fehl") || s.includes("missing")) return "missing";
  if (s.includes("use") || s.includes("benutz") || s.includes("ausgel")) return "inUse";
  return "available";
}

function fmtTime(x: any) {
  try {
    const d = x?.toDate?.() ?? (x ? new Date(x) : null);
    if (!d) return "—";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return "—";
  }
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full" style={{ width: `${pct}%`, background: "rgb(var(--accent))" }} />
    </div>
  );
}

function MiniDonut({ a, b, c, d }: { a: number; b: number; c: number; d: number }) {
  const total = a + b + c + d;
  const r = 34;
  const C = 2 * Math.PI * r;
  const p = (n: number) => (total <= 0 ? 0 : (n / total) * C);

  const s1 = p(a);
  const s2 = p(b);
  const s3 = p(c);
  const s4 = p(d);

  return (
    <svg width="90" height="90" viewBox="0 0 90 90" className="shrink-0">
      <g transform="translate(45 45)">
        <circle r={r} fill="none" stroke="currentColor" strokeWidth="10" className="opacity-10" />
        <circle
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="10"
          strokeDasharray={`${s1} ${C - s1}`}
          strokeDashoffset={0}
          transform="rotate(-90)"
          strokeLinecap="round"
        />
        <circle
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${s2} ${C - s2}`}
          strokeDashoffset={-s1}
          transform="rotate(-90)"
          strokeLinecap="round"
          className="opacity-35"
        />
        <circle
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${s3} ${C - s3}`}
          strokeDashoffset={-(s1 + s2)}
          transform="rotate(-90)"
          strokeLinecap="round"
          className="opacity-25"
        />
        <circle
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${s4} ${C - s4}`}
          strokeDashoffset={-(s1 + s2 + s3)}
          transform="rotate(-90)"
          strokeLinecap="round"
          className="opacity-18"
        />
        <text x="0" y="5" textAnchor="middle" fontSize="14" fill="currentColor" fontWeight="600" className="opacity-85">
          {total}
        </text>
      </g>
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("mitarbeiter");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hasBookingsCollection, setHasBookingsCollection] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!authReady) return;
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const itSnap = await getDocs(collection(db, "items"));
        const it: Item[] = itSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (!alive) return;
        setItems(it);
      } catch (e: any) {
        if (!alive) return;
        const msg = String(e?.message ?? "");
        if (msg.toLowerCase().includes("insufficient permissions") || msg.toLowerCase().includes("permission")) {
          setError(t?.("noPermission") ?? "No permission to read data. Check Firestore Rules.");
        } else {
          setError(msg || "Error loading items");
        }
        setItems([]);
      }

      // bookings are optional
      try {
        const qy = query(collection(db, "buchungen"), orderBy("zeit", "desc"), limit(10));
        const bkSnap = await getDocs(qy);
        const bk: Booking[] = bkSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (!alive) return;
        setBookings(bk);
        setHasBookingsCollection(true);
      } catch (e: any) {
        if (!alive) return;
        const msg = String(e?.message ?? "");
        if (msg.toLowerCase().includes("insufficient permissions") || msg.toLowerCase().includes("permission")) {
          setHasBookingsCollection(false);
        } else {
          setHasBookingsCollection(false);
        }
        setBookings([]);
      }

      if (!alive) return;
      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [authReady, user, t]);

  const computed = useMemo(() => {
    const byCond = { available: 0, needsRepair: 0, missing: 0, inUse: 0 };
    const byLager: Record<string, number> = {};

    for (const x of items) {
      const ck = normConditionKey(x.condition ?? x.status ?? x.zustand ?? "");
      (byCond as any)[ck]++;

      const lager = pickLager(x);
      byLager[lager] = (byLager[lager] ?? 0) + 1;
    }

    const lagerSorted = Object.entries(byLager).sort((a, b) => b[1] - a[1]);
    const maxLager = lagerSorted[0]?.[1] ?? 0;

    return {
      total: items.length,
      byCond,
      lagerSorted,
      maxLager,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="hero-gradient rounded-[28px] surface p-8 overflow-hidden relative shadow-lg">
        <div
          className="absolute inset-0 opacity-70 pointer-events-none hero-bg-pattern"
          style={{
            background:
              "radial-gradient(900px 420px at 12% 22%, rgba(var(--accent),0.18), transparent 60%), radial-gradient(900px 520px at 82% 28%, rgba(255,255,255,0.05), transparent 62%)",
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="text-xs font-medium hero-subtitle">{t("companyLine")}</div>
            <h1 className="mt-2 text-3xl font-bold hero-title">{t("dashboard")}</h1>
            <p className="mt-1 text-sm hero-description">{t("whereMost")}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 hero-buttons">
            <Link href="/items" className="rounded-2xl btn-accent px-5 py-3 text-sm font-semibold shadow-md hover:shadow-lg transition-all">
              {t("items")}
            </Link>
            <Link
              href="/wareneingang"
              className="rounded-2xl hero-btn-success px-5 py-3 text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              {t("wareneingang")}
            </Link>
            <Link
              href="/warenausgang"
              className="rounded-2xl hero-btn-danger px-5 py-3 text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              {t("warenausgang")}
            </Link>
            <Link
              href="/settings"
              className="rounded-2xl hero-btn-secondary px-5 py-3 text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              {t("settings")}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-[28px] surface p-6 shadow-md">
        <h2 className="text-lg font-bold mb-5 quick-actions-title">Schnellzugriff</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/items/new"
            className="quick-action-card rounded-2xl surface-2 p-5 hover:scale-105 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="text-3xl mb-3">📦</div>
            <div className="text-sm font-bold quick-action-title">Neues Item</div>
            <div className="text-xs quick-action-desc mt-1">Item hinzufügen</div>
          </Link>
          
          <Link
            href="/fuhrpark"
            className="quick-action-card rounded-2xl surface-2 p-5 hover:scale-105 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="text-3xl mb-3">🚗</div>
            <div className="text-sm font-bold quick-action-title">Neues Fahrzeug</div>
            <div className="text-xs quick-action-desc mt-1">Fuhrpark erweitern</div>
          </Link>
          
          <Link
            href="/immobilien"
            className="quick-action-card rounded-2xl surface-2 p-5 hover:scale-105 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="text-3xl mb-3">🏢</div>
            <div className="text-sm font-bold quick-action-title">Immobilien</div>
            <div className="text-xs quick-action-desc mt-1">Verträge verwalten</div>
          </Link>
          
          <Link
            href="/reports"
            className="quick-action-card rounded-2xl surface-2 p-5 hover:scale-105 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="text-3xl mb-3">📊</div>
            <div className="text-sm font-bold quick-action-title">Berichte</div>
            <div className="text-xs quick-action-desc mt-1">Statistiken ansehen</div>
          </Link>
        </div>
      </div>

      {error && (
        <div className="error-card rounded-[28px] surface p-6 shadow-md">
          <div className="text-sm font-bold error-title">{t("error") ?? "Error"}</div>
          <div className="mt-2 text-sm error-message">{error}</div>
          <div className="mt-3 text-xs error-hint">
            {t("rulesHint") ?? "If you see 'Missing or insufficient permissions', update Firestore Rules to allow reads for signed-in users."}
          </div>
        </div>
      )}

      {/* KPI + Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-[28px] surface p-7 lg:col-span-2 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold kpi-label">{t("overview") ?? "Overview"}</div>
              <div className="mt-2 text-4xl font-bold kpi-number">{computed.total}</div>
              <div className="mt-1 text-sm kpi-subtitle">{t("items")}</div>
            </div>
            <MiniDonut
              a={computed.byCond.available}
              b={computed.byCond.needsRepair}
              c={computed.byCond.missing}
              d={computed.byCond.inUse}
            />
          </div>

          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="stat-card rounded-2xl surface-2 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="text-xs font-semibold stat-label">{t("available")}</div>
              <div className="mt-2 text-2xl font-bold stat-value">{computed.byCond.available}</div>
              <ProgressBar value={computed.byCond.available} max={computed.total} />
            </div>
            <div className="stat-card rounded-2xl surface-2 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="text-xs font-semibold stat-label">{t("needsRepair")}</div>
              <div className="mt-2 text-2xl font-bold stat-value">{computed.byCond.needsRepair}</div>
              <ProgressBar value={computed.byCond.needsRepair} max={computed.total} />
            </div>
            <div className="stat-card rounded-2xl surface-2 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="text-xs font-semibold stat-label">{t("missing")}</div>
              <div className="mt-2 text-2xl font-bold stat-value">{computed.byCond.missing}</div>
              <ProgressBar value={computed.byCond.missing} max={computed.total} />
            </div>
            <div className="stat-card rounded-2xl surface-2 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="text-xs font-semibold stat-label">{t("inUse") ?? "In use"}</div>
              <div className="mt-2 text-2xl font-bold stat-value">{computed.byCond.inUse}</div>
              <ProgressBar value={computed.byCond.inUse} max={computed.total} />
            </div>
          </div>

          {loading && <div className="mt-5 text-sm loading-text font-semibold">Loading…</div>}
        </div>

        {/* Top Lager - Prominent */}
        <div className="rounded-[28px] surface p-7 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold lager-label">{t("topLager")}</div>
              <div className="mt-2 flex items-center gap-4">
                <div className="shrink-0">
                  <MiniDonut
                    a={computed.byCond.available}
                    b={computed.byCond.needsRepair}
                    c={computed.byCond.missing}
                    d={computed.byCond.inUse}
                  />
                </div>
                <div>
                  <div className="text-3xl font-bold lager-name">{computed.lagerSorted[0]?.[0] ?? "—"}</div>
                  <div className="mt-1 text-sm lager-subtitle">{t("whereMostHint") ?? t("whereMost")}</div>
                </div>
              </div>
            </div>

            <div className="ml-auto text-right">
              <div className="text-xs font-semibold lager-label">{t("mostCount") ?? t("count")}</div>
              <div className="mt-2 text-4xl font-extrabold lager-count kpi-animate">{computed.maxLager}</div>
              <div className="mt-4 w-44 rounded-full progress-bg overflow-hidden shadow-inner">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${computed.maxLager <= 0 ? 0 : Math.round((computed.maxLager / Math.max(1, computed.total)) * 100)}%`,
                    background: "rgb(var(--accent))",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {computed.lagerSorted.length === 0 ? (
              <div className="text-sm muted">—</div>
            ) : (
              computed.lagerSorted.slice(0, 6).map(([lager, n], idx) => (
                <div key={lager} className={`lager-item rounded-2xl surface-2 p-4 shadow-sm hover:shadow-md transition-all ${idx === 0 ? "sheen-animate theme-card-active" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold lager-item-name">{lager}</div>
                    <div className="text-sm lager-item-count font-bold">{n}</div>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full progress-bg overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${computed.maxLager <= 0 ? 0 : Math.round((n / computed.maxLager) * 100)}%`,
                        background: "rgb(var(--accent))",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-[28px] surface p-6 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-bold bookings-title">{t("recentBookings")}</div>
          <Link href="/items" className="text-sm bookings-link hover:underline transition font-semibold">
            {t("items")}
          </Link>
        </div>

        <div className="mt-5">
          {!hasBookingsCollection ? (
            <div className="text-sm muted">{t("noBookingsHint")}</div>
          ) : bookings.length === 0 ? (
            <div className="text-sm muted">{t("noBookingsYet")}</div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="booking-item rounded-2xl surface-2 p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <div className="booking-detail">
                      <span className="booking-label">Item:</span> <span className="booking-value">{String(b.itemId ?? "—")}</span>
                    </div>
                    <div className="booking-detail">
                      <span className="booking-label">Lager:</span> <span className="booking-value">{String(b.lagerId ?? "—")}</span>
                    </div>
                    <div className="booking-detail">
                      <span className="booking-label">User:</span> <span className="booking-value">{String(b.userId ?? "—")}</span>
                    </div>
                    <div className="booking-detail">
                      <span className="booking-label">Action:</span> <span className="booking-value">{String(b.aktion ?? "—")}</span>
                    </div>
                    <div className="booking-detail">
                      <span className="booking-label">Qty:</span> <span className="booking-value">{safeNum(b.menge, 1)}</span>
                    </div>
                    <div className="ml-auto text-xs booking-time">{fmtTime(b.zeit)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
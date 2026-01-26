"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import { usePrefs } from "../lib/prefs";

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
        <circle r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="10" />
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
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="10"
          strokeDasharray={`${s2} ${C - s2}`}
          strokeDashoffset={-s1}
          transform="rotate(-90)"
          strokeLinecap="round"
        />
        <circle
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="10"
          strokeDasharray={`${s3} ${C - s3}`}
          strokeDashoffset={-(s1 + s2)}
          transform="rotate(-90)"
          strokeLinecap="round"
        />
        <circle
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="10"
          strokeDasharray={`${s4} ${C - s4}`}
          strokeDashoffset={-(s1 + s2 + s3)}
          transform="rotate(-90)"
          strokeLinecap="round"
        />
        <text x="0" y="5" textAnchor="middle" fontSize="14" fill="rgba(255,255,255,0.85)" fontWeight="600">
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
            <div className="text-xs muted">{t("companyLine")}</div>
            <h1 className="mt-2 text-2xl font-semibold text-white">{t("dashboard")}</h1>
            <p className="mt-1 text-sm muted">{t("whereMost")}</p>
          </div>

          <div className="flex gap-3">
            <Link href="/items" className="rounded-2xl btn-accent px-4 py-3 text-sm font-semibold">
              {t("items")}
            </Link>
            <Link
              href="/settings"
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
            >
              {t("settings")}
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[28px] surface p-5">
          <div className="text-sm text-white/90 font-semibold">{t("error") ?? "Error"}</div>
          <div className="mt-1 text-sm muted">{error}</div>
          <div className="mt-3 text-xs muted">
            {t("rulesHint") ?? "If you see 'Missing or insufficient permissions', update Firestore Rules to allow reads for signed-in users."}
          </div>
        </div>
      )}

      {/* KPI + Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-[28px] surface p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs muted">{t("overview") ?? "Overview"}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{computed.total}</div>
              <div className="mt-1 text-sm muted">{t("items")}</div>
            </div>
            <MiniDonut
              a={computed.byCond.available}
              b={computed.byCond.needsRepair}
              c={computed.byCond.missing}
              d={computed.byCond.inUse}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl surface-2 p-5">
              <div className="text-xs muted">{t("available")}</div>
              <div className="mt-2 text-2xl font-semibold text-white">{computed.byCond.available}</div>
              <ProgressBar value={computed.byCond.available} max={computed.total} />
            </div>
            <div className="rounded-2xl surface-2 p-5">
              <div className="text-xs muted">{t("needsRepair")}</div>
              <div className="mt-2 text-2xl font-semibold text-white">{computed.byCond.needsRepair}</div>
              <ProgressBar value={computed.byCond.needsRepair} max={computed.total} />
            </div>
            <div className="rounded-2xl surface-2 p-5">
              <div className="text-xs muted">{t("missing")}</div>
              <div className="mt-2 text-2xl font-semibold text-white">{computed.byCond.missing}</div>
              <ProgressBar value={computed.byCond.missing} max={computed.total} />
            </div>
            <div className="rounded-2xl surface-2 p-5">
              <div className="text-xs muted">{t("inUse") ?? "In use"}</div>
              <div className="mt-2 text-2xl font-semibold text-white">{computed.byCond.inUse}</div>
              <ProgressBar value={computed.byCond.inUse} max={computed.total} />
            </div>
          </div>

          {loading && <div className="mt-4 text-sm muted">Loading…</div>}
        </div>

        {/* Top Lager - Prominent */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs muted">{t("topLager")}</div>
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
                  <div className="text-3xl font-bold text-white stat-number">{computed.lagerSorted[0]?.[0] ?? "—"}</div>
                  <div className="mt-1 text-sm muted">{t("whereMostHint") ?? t("whereMost")}</div>
                </div>
              </div>
            </div>

            <div className="ml-auto text-right">
              <div className="text-xs muted">{t("mostCount") ?? t("count")}</div>
              <div className="mt-2 text-4xl font-extrabold text-white kpi-animate">{computed.maxLager}</div>
              <div className="mt-4 w-44 rounded-full bg-white/6 overflow-hidden">
                <div
                  className="h-3"
                  style={{
                    width: `${computed.maxLager <= 0 ? 0 : Math.round((computed.maxLager / Math.max(1, computed.total)) * 100)}%`,
                    background: "rgb(var(--accent))",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {computed.lagerSorted.length === 0 ? (
              <div className="text-sm muted">—</div>
            ) : (
              computed.lagerSorted.slice(0, 6).map(([lager, n], idx) => (
                <div key={lager} className={`rounded-2xl surface-2 p-3 ${idx === 0 ? "sheen-animate theme-card-active" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white/90">{lager}</div>
                    <div className="text-sm text-white/85 font-semibold">{n}</div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full"
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
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white/90">{t("recentBookings")}</div>
          <Link href="/items" className="text-sm text-white/80 hover:text-white transition">
            {t("items")}
          </Link>
        </div>

        <div className="mt-4">
          {!hasBookingsCollection ? (
            <div className="text-sm muted">{t("noBookingsHint")}</div>
          ) : bookings.length === 0 ? (
            <div className="text-sm muted">{t("noBookingsYet")}</div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-2xl surface-2 p-4">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <div className="text-white/90">
                      <span className="muted">Item:</span> <span className="font-semibold">{String(b.itemId ?? "—")}</span>
                    </div>
                    <div className="text-white/80">
                      <span className="muted">Lager:</span> <span className="font-semibold">{String(b.lagerId ?? "—")}</span>
                    </div>
                    <div className="text-white/80">
                      <span className="muted">User:</span> <span className="font-semibold">{String(b.userId ?? "—")}</span>
                    </div>
                    <div className="text-white/80">
                      <span className="muted">Action:</span> <span className="font-semibold">{String(b.aktion ?? "—")}</span>
                    </div>
                    <div className="text-white/80">
                      <span className="muted">Qty:</span> <span className="font-semibold">{safeNum(b.menge, 1)}</span>
                    </div>
                    <div className="ml-auto text-xs muted">{fmtTime(b.zeit)}</div>
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
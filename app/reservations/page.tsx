"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";

type Reservation = {
  id: string;
  itemId?: string;
  lagerId?: string;
  qty?: number;
  forDate?: any;
  forWhom?: string;
  status?: string; // "active"
  reservedByUid?: string;
  createdAt?: any;
};

function fmtDate(x: any) {
  try {
    const d =
      x?.toDate?.() ??
      (x instanceof Date ? x : null) ??
      (typeof x === "string" ? new Date(x) : null);
    if (!d || isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(d);
  } catch {
    return "—";
  }
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function num(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function ReservationsPage() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "mitarbeiter">("mitarbeiter");
  const [uid, setUid] = useState<string>("");
  const [ready, setReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Reservation[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUid(u.uid);

      const usnap = await getDoc(doc(db, "users", u.uid));
      const r = (usnap.exists()
        ? (usnap.data() as any).role
        : "mitarbeiter") as any;
      setRole(r === "admin" ? "admin" : "mitarbeiter");
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const qy = query(
        collection(db, "reservations"),
        orderBy("createdAt", "desc"),
        limit(200)
      );

      const snap = await getDocs(qy);
      const list: Reservation[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      const filtered =
        role === "admin"
          ? list.filter((x) => String(x.status ?? "") === "active")
          : list.filter(
              (x) =>
                String(x.status ?? "") === "active" &&
                String(x.reservedByUid ?? "") === uid
            );

      setRows(filtered);
    } catch (e: any) {
      const code = String(e?.code ?? "");
      setErr(code ? `Daten nicht verfügbar. Fehler: ${code}` : "Daten nicht verfügbar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, role, uid]);

  const activeCount = useMemo(() => rows.length, [rows]);

  async function checkout(r: Reservation) {
    if (!r.id || !r.itemId) return;

    // Mitarbeiter فقط رزرو خودش
    if (role !== "admin" && String(r.reservedByUid ?? "") !== uid) return;

    setBusyId(r.id);
    setErr(null);

    try {
      const itemRef = doc(db, "items", r.itemId);
      const resRef = doc(db, "reservations", r.id);
      const histRef = doc(collection(db, "reservation_history"));

      const qty = Math.max(1, Math.floor(num(r.qty, 1)));

      await runTransaction(db, async (tx) => {
        const itSnap = await tx.get(itemRef);
        if (!itSnap.exists()) throw new Error("ITEM_NOT_FOUND");

        const it = itSnap.data() as any;
        const reserved = Math.max(0, num(it.reservedQty, 0));
        const newReserved = Math.max(0, reserved - qty);

        tx.update(itemRef, { reservedQty: newReserved, updatedAt: serverTimestamp() });

        // history entry (expires after 7 days)
        const now = new Date();
        tx.set(histRef, {
          ...r,
          qty,
          status: "fulfilled",
          fulfilledAt: serverTimestamp(),
          expiresAt: addDays(now, 7),
        });

        // remove active reservation
        tx.delete(resRef);
      });

      await load();
    } catch (e: any) {
      const code = String(e?.code ?? "");
      setErr(code ? `Checkout fehlgeschlagen: ${code}` : "Checkout fehlgeschlagen.");
    } finally {
      setBusyId("");
    }
  }

  if (!ready) {
    return <div className="rounded-[28px] surface p-6 text-sm muted">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs muted">{role === "admin" ? "Admin" : "Mitarbeiter"}</div>
            <h1 className="mt-2 text-2xl font-semibold text-white">Reservierungen</h1>
            <div className="mt-1 text-sm muted">
              Aktiv: <span className="text-white/80 font-semibold">{activeCount}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/items"
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
            >
              Geräte & Material
            </Link>
            <button
              onClick={load}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
            >
              Aktualisieren
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-[28px] surface p-6 text-sm text-white/85">{err}</div>
      )}

      <div className="rounded-[28px] surface p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full">
            <thead>
              <tr className="text-left text-xs text-white/55 border-b border-white/10">
                <th className="px-5 py-4">Item ID</th>
                <th className="px-5 py-4">Lager</th>
                <th className="px-5 py-4">Menge</th>
                <th className="px-5 py-4">Datum</th>
                <th className="px-5 py-4">Für wen</th>
                <th className="px-5 py-4">Reserved By</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aktion</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-sm muted">
                    Keine aktiven Reservierungen.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-sm muted">
                    Loading…
                  </td>
                </tr>
              )}

              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/10 hover:bg-white/[0.03] transition"
                >
                  <td className="px-5 py-4 text-sm text-white/90 font-semibold">
                    {r.itemId ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-white/75">{r.lagerId ?? "—"}</td>
                  <td className="px-5 py-4 text-sm text-white/75">
                    {Math.max(0, Math.floor(num(r.qty, 0)))}
                  </td>
                  <td className="px-5 py-4 text-sm text-white/75">{fmtDate(r.forDate)}</td>
                  <td className="px-5 py-4 text-sm text-white/75">
                    {String(r.forWhom ?? "").trim() ? r.forWhom : "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-white/75">{r.reservedByUid ?? "—"}</td>
                  <td className="px-5 py-4 text-sm text-white/75">{r.status ?? "—"}</td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => checkout(r)}
                      disabled={busyId === r.id}
                      className="rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60"
                      style={{ background: "rgb(var(--accent))", color: "white" }}
                    >
                      {busyId === r.id ? "Bitte warten…" : "Checkout"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs muted">
        Hinweis: "Checkout" simuliert das Ausgeben (später macht das die iPhone-Scan-App automatisch).
      </div>
    </div>
  );
}
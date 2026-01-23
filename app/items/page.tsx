"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

type Item = {
  id: string;

  name?: string;

  type?: string; // Gerät | Material
  typ?: string;

  category?: string;

  lager?: string; // LA/LB (your data)
  lagerId?: string; // newer

  zustand?: string; // Neu/OK/Defekt...
  condition?: string;

  status?: string; // verfügbar / nicht verfügbar / gesperrt

  // quantity fields (any of these may exist)
  stock?: number;
  bestand?: number;
  Bestand?: number;
  menge?: number;
  qty?: number;
  anzahl?: number;
  count?: number;

  // legacy
  available?: any; // string "true"

  reservedQty?: number;
};

function num(v: any, fallback = 0) {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function pickLager(it: any) {
  const raw =
    it?.lager ??
    it?.lagerId ??
    it?.Lager ??
    it?.lage ??
    it?.location ??
    it?.standort ??
    it?.warehouse;
  const s = String(raw ?? "").trim();
  return s || "—";
}

function pickType(it: any) {
  const s = String(it?.type ?? it?.typ ?? "").trim();
  return s || "—";
}

function pickCategory(it: any) {
  const s = String(it?.category ?? "").trim();
  return s || "Ohne Kategorie";
}

function pickCondition(it: any) {
  const s = String(it?.zustand ?? it?.condition ?? "").trim();
  return s || "—";
}

function pickStatus(it: any) {
  const s = String(it?.status ?? "").trim();
  if (s) return s;
  const av = it?.available;
  const ok = av === true || String(av).toLowerCase() === "true";
  return ok ? "verfügbar" : "nicht verfügbar";
}

function pickStock(it: any) {
  const v =
    it?.stock ??
    it?.bestand ??
    it?.Bestand ??
    it?.menge ??
    it?.qty ??
    it?.anzahl ??
    it?.count;

  // legacy: if no quantity exists, fall back to available=true => 1
  if (v === undefined || v === null || v === "") {
    const av = it?.available;
    const ok = av === true || String(av).toLowerCase() === "true";
    return ok ? 1 : 0;
  }

  return num(v, 0);
}

export default function ItemsPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"admin" | "mitarbeiter">("mitarbeiter");

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [lagerFilter, setLagerFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");

  // reserve modal
  const [reserveOpen, setReserveOpen] = useState(false);
  const [selReserve, setSelReserve] = useState<Item | null>(null);
  const [reserveQty, setReserveQty] = useState(1);
  const [reserveDate, setReserveDate] = useState("");
  const [reserveForWhom, setReserveForWhom] = useState("");
  const [reserveBusy, setReserveBusy] = useState(false);
  const [reserveErr, setReserveErr] = useState<string | null>(null);

  // decrement modal (admin “Löschen” = reduce stock)
  const [decOpen, setDecOpen] = useState(false);
  const [selDec, setSelDec] = useState<Item | null>(null);
  const [decQty, setDecQty] = useState(1);
  const [decBusy, setDecBusy] = useState(false);
  const [decErr, setDecErr] = useState<string | null>(null);

  // auth + role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      const usnap = await getDoc(doc(db, "users", u.uid));
      const r = (usnap.exists() ? (usnap.data() as any).role : "mitarbeiter") as any;
      setRole(r === "admin" ? "admin" : "mitarbeiter");
      setReady(true);
    });

    return () => unsub();
  }, [router]);

  async function loadItems() {
    setLoading(true);
    const snap = await getDocs(collection(db, "items"));
    const list: Item[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    setItems(list);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const rows = useMemo(() => {
    const enriched = items.map((it) => {
      const stock = pickStock(it);
      const reserved = num(it.reservedQty, 0);
      const available = Math.max(0, stock - reserved);

      return {
        ...it,
        stock,
        reserved,
        available,
        lager: pickLager(it),
        type: pickType(it),
        category: pickCategory(it),
        zustand: pickCondition(it),
        status: pickStatus(it),
      } as any;
    });

    const qq = q.trim().toLowerCase();
    const bySearch = !qq
      ? enriched
      : enriched.filter((x: any) => {
          return (
            String(x.id).toLowerCase().includes(qq) ||
            String(x.name ?? "").toLowerCase().includes(qq) ||
            String(x.category ?? "").toLowerCase().includes(qq) ||
            String(x.lager ?? "").toLowerCase().includes(qq)
          );
        });

    const byLager =
      lagerFilter === "all" ? bySearch : bySearch.filter((x: any) => x.lager === lagerFilter);

    const byCat =
      catFilter === "all" ? byLager : byLager.filter((x: any) => x.category === catFilter);

    // employee: hide fully reserved
    const visible =
      role === "admin" ? byCat : byCat.filter((x: any) => Number(x.available ?? 0) > 0);

    return visible.sort((a: any, b: any) =>
      String(a.name ?? a.id).localeCompare(String(b.name ?? b.id))
    );
  }, [items, q, lagerFilter, catFilter, role]);

  const lagerOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) s.add(pickLager(it));
    return ["all", ...Array.from(s).filter(Boolean).sort()];
  }, [items]);

  const catOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) s.add(pickCategory(it));
    return ["all", ...Array.from(s).filter(Boolean).sort()];
  }, [items]);

  // open reserve modal
  function openReserve(it: Item) {
    setReserveErr(null);
    setSelReserve(it);
    setReserveQty(1);
    setReserveDate("");
    setReserveForWhom("");
    setReserveOpen(true);
  }

  async function confirmReserve() {
    if (!selReserve) return;

    setReserveErr(null);
    const qty = Math.max(1, Math.floor(num(reserveQty, 1)));
    if (!reserveDate) {
      setReserveErr("Bitte Datum auswählen.");
      return;
    }

    setReserveBusy(true);
    try {
      const fb = auth.currentUser;
      if (!fb) throw new Error("NOAUTH");

      const itemRef = doc(db, "items", selReserve.id);
      const resRef = doc(collection(db, "reservations"));

      await runTransaction(db, async (tx) => {
        const itSnap = await tx.get(itemRef);
        if (!itSnap.exists()) throw new Error("ITEM_NOT_FOUND");

        const it = itSnap.data() as any;
        const stock = pickStock(it);
        const reserved = num(it.reservedQty, 0);
        const available = stock - reserved;

        if (qty > available) throw new Error("NOT_ENOUGH");

        tx.update(itemRef, { reservedQty: reserved + qty });

        tx.set(resRef, {
          itemId: selReserve.id,
          lagerId: pickLager(it),
          qty,
          forDate: new Date(reserveDate),
          forWhom: String(reserveForWhom ?? "").trim(),
          status: "active",
          reservedByUid: fb.uid,
          createdAt: serverTimestamp(),
        });
      });

      // optimistic update
      setItems((prev) =>
        prev.map((x) =>
          x.id === selReserve.id ? { ...x, reservedQty: num(x.reservedQty, 0) + qty } : x
        )
      );

      setReserveOpen(false);
    } catch (e: any) {
      if (String(e?.message || "").includes("NOT_ENOUGH")) setReserveErr("Nicht genügend verfügbar.");
      else setReserveErr("Reservierung fehlgeschlagen.");
    } finally {
      setReserveBusy(false);
    }
  }

  // open decrement modal
  function openDecrement(it: Item) {
    setDecErr(null);
    setSelDec(it);
    setDecQty(1);
    setDecOpen(true);
  }

  async function confirmDecrement() {
    if (!selDec) return;

    setDecErr(null);
    const qty = Math.max(1, Math.floor(num(decQty, 1)));

    setDecBusy(true);
    try {
      const itemRef = doc(db, "items", selDec.id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(itemRef);
        if (!snap.exists()) throw new Error("ITEM_NOT_FOUND");

        const it = snap.data() as any;
        const stock = pickStock(it);
        const reserved = num(it.reservedQty, 0);
        const newStock = Math.max(0, stock - qty);

        // do not reduce below reserved
        if (newStock < reserved) throw new Error("BELOW_RESERVED");

        tx.update(itemRef, {
          stock: newStock, // unify to stock
          status: newStock === 0 ? "nicht verfügbar" : pickStatus(it),
          updatedAt: serverTimestamp(),
        });
      });

      await loadItems();
      setDecOpen(false);
    } catch (e: any) {
      if (String(e?.message || "").includes("BELOW_RESERVED")) {
        setDecErr("Du kannst nicht unter die reservierte Menge reduzieren.");
      } else {
        setDecErr("Änderung fehlgeschlagen. Prüfe Rules.");
      }
    } finally {
      setDecBusy(false);
    }
  }

  if (!ready) {
    return <div className="rounded-[28px] surface p-6 text-sm muted">Loading…</div>;
  }

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
            <div className="text-xs muted">Astrein Exzellent Gebäudemanagment International GmbH</div>
            <h1 className="mt-2 text-2xl font-semibold text-white">Geräte & Material</h1>
            <div className="mt-1 text-sm muted">
              Rolle: <span className="text-white/80 font-semibold">{role}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
            >
              Dashboard
            </Link>

            {role === "admin" && (
              <Link
                href="/items/new"
                className="rounded-2xl btn-accent px-4 py-3 text-sm font-semibold"
              >
                Neues Item
              </Link>
            )}

            {role === "admin" && (
              <Link
                href="/reservations"
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
              >
                Reservierungen
              </Link>
            )}

            <button
              onClick={loadItems}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
            >
              Aktualisieren
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-[28px] surface p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche nach Name, ID, Kategorie, Lager…"
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
          />

          <select
            value={lagerFilter}
            onChange={(e) => setLagerFilter(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
          >
            {lagerOptions.map((x) => (
              <option key={x} value={x} className="bg-black">
                {x === "all" ? "Alle Lager" : x}
              </option>
            ))}
          </select>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
          >
            {catOptions.map((x) => (
              <option key={x} value={x} className="bg-black">
                {x === "all" ? "Alle Kategorien" : x}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 text-xs muted">{loading ? "Loading…" : `${rows.length} Einträge`}</div>
      </div>

      {/* Table */}
      <div className="rounded-[28px] surface p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full">
            <thead>
              <tr className="text-left text-xs text-white/55 border-b border-white/10">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Kategorie</th>
                <th className="px-5 py-4">Lager</th>
                <th className="px-5 py-4">Zustand</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aktion</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-white/10 hover:bg-white/[0.03] transition">
                  <td className="px-5 py-4 text-sm text-white/90 font-semibold">{r.id}</td>
                  <td className="px-5 py-4 text-sm text-white/85">{r.name ?? "—"}</td>
                  <td className="px-5 py-4 text-sm text-white/75">{r.type}</td>
                  <td className="px-5 py-4 text-sm text-white/75">{r.category}</td>
                  <td className="px-5 py-4 text-sm text-white/75">{r.lager}</td>
                  <td className="px-5 py-4 text-sm text-white/75">{r.zustand}</td>
                  <td className="px-5 py-4 text-sm text-white/75">{r.status}</td>

                  <td className="px-5 py-4 text-right">
                    {role === "admin" ? (
                      <div className="inline-flex gap-2">
                        <Link
                          href={`/items/edit/${encodeURIComponent(r.id)}`}
                          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/85 hover:bg-white/5 transition"
                        >
                          Bearbeiten
                        </Link>

                        <button
                          onClick={() => openReserve(r)}
                          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/85 hover:bg-white/5 transition"
                        >
                          Reservieren
                        </button>

                        <button
                          onClick={() => openDecrement(r)}
                          className="rounded-xl px-3 py-2 text-xs font-semibold"
                          style={{ background: "rgb(var(--accent))", color: "white" }}
                        >
                          Löschen
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openReserve(r)}
                        className="rounded-xl px-3 py-2 text-xs font-semibold"
                        style={{ background: "rgb(var(--accent))", color: "white" }}
                      >
                        Reservieren
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-sm muted" colSpan={8}>
                    Keine passenden Einträge.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="px-5 py-10 text-sm muted" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reserve modal */}
      {reserveOpen && selReserve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => (!reserveBusy ? setReserveOpen(false) : null)}
          />
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-black/70 backdrop-blur-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs muted">Reservierung</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {selReserve.name ?? selReserve.id}
                </div>
                <div className="mt-1 text-xs muted">ID: {selReserve.id}</div>
              </div>

              <button
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80 hover:bg-white/5 transition"
                onClick={() => (!reserveBusy ? setReserveOpen(false) : null)}
              >
                Schließen
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block">
                <div className="text-xs text-white/70">Für welches Datum?</div>
                <input
                  type="date"
                  value={reserveDate}
                  onChange={(e) => setReserveDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
                />
              </label>

              <label className="block">
                <div className="text-xs text-white/70">Menge</div>
                <input
                  type="number"
                  min={1}
                  value={reserveQty}
                  onChange={(e) => setReserveQty(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
                />
              </label>

              <label className="block">
                <div className="text-xs text-white/70">Für wen? (optional)</div>
                <input
                  value={reserveForWhom}
                  onChange={(e) => setReserveForWhom(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
                  placeholder="Name / Team"
                />
              </label>

              {reserveErr && (
                <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/80">
                  {reserveErr}
                </div>
              )}

              <button
                onClick={confirmReserve}
                disabled={reserveBusy}
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                style={{ background: "rgb(var(--accent))", color: "white" }}
              >
                {reserveBusy ? "Bitte warten…" : "Reservierung bestätigen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decrement modal */}
      {decOpen && selDec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => (!decBusy ? setDecOpen(false) : null)}
          />
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-black/70 backdrop-blur-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs muted">Bestand reduzieren</div>
                <div className="mt-1 text-lg font-semibold text-white">{selDec.name ?? selDec.id}</div>
                <div className="mt-1 text-xs muted">ID: {selDec.id}</div>
              </div>

              <button
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80 hover:bg-white/5 transition"
                onClick={() => (!decBusy ? setDecOpen(false) : null)}
              >
                Schließen
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="text-sm text-white/80">
                Aktueller Bestand:{" "}
                <span className="text-white font-semibold">{pickStock(selDec)}</span>
              </div>

              <label className="block">
                <div className="text-xs text-white/70">Wie viele abziehen?</div>
                <input
                  type="number"
                  min={1}
                  value={decQty}
                  onChange={(e) => setDecQty(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
                />
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => setDecQty(1)}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/85 hover:bg-white/5 transition"
                >
                  −1
                </button>
                <button
                  onClick={() => setDecQty(5)}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/85 hover:bg-white/5 transition"
                >
                  −5
                </button>
              </div>

              {decErr && (
                <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/80">
                  {decErr}
                </div>
              )}

              <button
                onClick={confirmDecrement}
                disabled={decBusy}
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                style={{ background: "rgb(var(--accent))", color: "white" }}
              >
                {decBusy ? "Bitte warten…" : "Bestand reduzieren"}
              </button>

              <div className="text-xs muted">Hinweis: Das Item wird nicht gelöscht. Nur der Bestand wird reduziert.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../../../lib/firebase";

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id ?? "");

  const [role, setRole] = useState<"admin" | "mitarbeiter">("mitarbeiter");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [type, setType] = useState("Gerät");
  const [category, setCategory] = useState("");
  const [lager, setLager] = useState("LA");
  const [zustand, setZustand] = useState("OK");
  const [status, setStatus] = useState("verfügbar");
  const [stock, setStock] = useState(1);

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      const usnap = await getDoc(doc(db, "users", u.uid));
      const r = (usnap.exists() ? (usnap.data() as any).role : "mitarbeiter") as any;
      const rr = r === "admin" ? "admin" : "mitarbeiter";
      setRole(rr);

      if (rr !== "admin") {
        router.replace("/items");
        return;
      }

      // load item
      const itSnap = await getDoc(doc(db, "items", id));
      if (!itSnap.exists()) {
        setErr("Item nicht gefunden.");
        setLoading(false);
        return;
      }
      const it = itSnap.data() as any;

      setName(String(it.name ?? ""));
      setType(String(it.type ?? it.typ ?? "Gerät"));
      setCategory(String(it.category ?? ""));
      setLager(String(it.lager ?? it.lagerId ?? "LA"));
      setZustand(String(it.zustand ?? it.condition ?? "OK"));
      setStatus(String(it.status ?? "verfügbar"));
      setStock(Number(it.stock ?? it.bestand ?? it.menge ?? 1) || 0);

      setLoading(false);
    });

    return () => unsub();
  }, [router, id]);

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      await updateDoc(doc(db, "items", id), {
        name: name.trim(),
        type: type.trim(),
        category: category.trim(),
        lager: lager.trim(),
        lagerId: lager.trim(), // keep both
        zustand: zustand.trim(),
        condition: zustand.trim(), // keep both
        status: status.trim(),
        stock: Number(stock) || 0,
        updatedAt: serverTimestamp(),
      });
      router.replace("/items");
    } catch {
      setErr("Speichern fehlgeschlagen. Prüfe Rules.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-[28px] surface p-6 text-sm muted">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs muted">Admin</div>
            <h1 className="mt-2 text-2xl font-semibold text-white">Item bearbeiten</h1>
            <div className="mt-1 text-sm muted">
              ID: <span className="text-white/80 font-semibold">{id}</span>
            </div>
          </div>
          <Link
            href="/items"
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
          >
            Zurück
          </Link>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs text-white/70">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            />
          </label>

          <label className="block">
            <div className="text-xs text-white/70">Type</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option className="bg-black" value="Gerät">Gerät</option>
              <option className="bg-black" value="Material">Material</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs text-white/70">Kategorie</div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            />
          </label>

          <label className="block">
            <div className="text-xs text-white/70">Lager</div>
            <select
              value={lager}
              onChange={(e) => setLager(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option className="bg-black" value="LA">LA</option>
              <option className="bg-black" value="LB">LB</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs text-white/70">Zustand</div>
            <select
              value={zustand}
              onChange={(e) => setZustand(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option className="bg-black" value="Neu">Neu</option>
              <option className="bg-black" value="OK">OK</option>
              <option className="bg-black" value="Reparatur nötig">Reparatur nötig</option>
              <option className="bg-black" value="Defekt">Defekt</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs text-white/70">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option className="bg-black" value="verfügbar">verfügbar</option>
              <option className="bg-black" value="nicht verfügbar">nicht verfügbar</option>
              <option className="bg-black" value="gesperrt">gesperrt</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs text-white/70">Bestand (stock)</div>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            />
          </label>
        </div>

        {err && (
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
            {err}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl btn-accent px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
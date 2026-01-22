"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { collection, deleteDoc, doc, getDoc, getDocs } from "firebase/firestore";
import { usePrefs } from "../../lib/prefs";

type Role = "admin" | "mitarbeiter";
type Item = {
  id: string;
  name?: string;
  typ?: "gerät" | "material";
  category?: string;
  lager?: string;
  condition?: string;
  available?: boolean;
};

const ALL = "Alle";

export default function ItemsPage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [items, setItems] = useState<Item[]>([]);
  const [role, setRole] = useState<Role>("mitarbeiter");
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [fTyp, setFTyp] = useState<string>(ALL);
  const [fCat, setFCat] = useState<string>(ALL);
  const [fLager, setFLager] = useState<string>(ALL);
  const [fCond, setFCond] = useState<string>(ALL);
  const [fAvail, setFAvail] = useState<string>(ALL); // Alle | verfügbar | nicht verfügbar

  const isAdmin = useMemo(() => role === "admin", [role]);

  async function loadItems() {
    const snap = await getDocs(collection(db, "items"));
    setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Item[]);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        router.replace("/login");
        return;
      }

      const uSnap = await getDoc(doc(db, "users", user.uid));
      setRole((uSnap.data()?.role as Role) ?? "mitarbeiter");

      await loadItems();
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  async function deleteItem(itemId: string) {
    if (!isAdmin) return;

    const first = confirm(t("confirmDelete1"));
    if (!first) return;

    const second = confirm(t("confirmDelete2"));
    if (!second) return;

    await deleteDoc(doc(db, "items", itemId));
    await loadItems();
  }

  const typOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.typ && s.add(i.typ));
    return [ALL, ...Array.from(s).sort()];
  }, [items]);

  const catOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.category && s.add(i.category));
    return [ALL, ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const lagerOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.lager && s.add(i.lager));
    return [ALL, ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const condOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.condition && s.add(i.condition));
    return [ALL, ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return items.filter((it) => {
      if (query) {
        const hay = `${it.id} ${it.name ?? ""} ${it.category ?? ""} ${it.lager ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      if (fTyp !== ALL && (it.typ ?? "") !== fTyp) return false;
      if (fCat !== ALL && (it.category ?? "") !== fCat) return false;
      if (fLager !== ALL && (it.lager ?? "") !== fLager) return false;
      if (fCond !== ALL && (it.condition ?? "") !== fCond) return false;

      if (fAvail !== ALL) {
        const isAvail = it.available === true;
        if (fAvail === t("available") && !isAvail) return false;
        if (fAvail === t("notAvailable") && isAvail) return false;
      }

      return true;
    });
  }, [items, q, fTyp, fCat, fLager, fCond, fAvail, t]);

  function resetFilters() {
    setQ("");
    setFTyp(ALL);
    setFCat(ALL);
    setFLager(ALL);
    setFCond(ALL);
    setFAvail(ALL);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{t("items")}</h1>
          <p className="mt-1 text-sm text-white/60">
            Rolle: <span className="font-semibold text-white/85">{role}</span>
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 transition"
          >
            {t("dashboard")}
          </Link>

          {isAdmin && (
            <Link href="/items/new" className="rounded-2xl btn-accent px-4 py-2 text-sm font-semibold transition">
              + {t("newItem")}
            </Link>
          )}
        </div>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/30"
          />

          <Select label={t("type")} value={fTyp} onChange={setFTyp} options={typOptions} />
          <Select label={t("category")} value={fCat} onChange={setFCat} options={catOptions} />
          <Select label={t("lager")} value={fLager} onChange={setFLager} options={lagerOptions} />
          <Select label={t("condition")} value={fCond} onChange={setFCond} options={condOptions} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/60">{t("status")}</label>
            <select
              value={fAvail}
              onChange={(e) => setFAvail(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"
            >
              <option value={ALL}>{ALL}</option>
              <option value={t("available")}>{t("available")}</option>
              <option value={t("notAvailable")}>{t("notAvailable")}</option>
            </select>

            <span className="text-xs text-white/50">
              {t("result")}: <span className="text-white/80 font-semibold">{filtered.length}</span>
            </span>
          </div>

          <button
            onClick={resetFilters}
            className="w-fit rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 transition"
          >
            {t("filterReset")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-white/70">{t("loading")}</div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-white/70">
                  <th className="p-4">ID</th>
                  <th className="p-4">{t("name")}</th>
                  <th className="p-4">{t("type")}</th>
                  <th className="p-4">{t("category")}</th>
                  <th className="p-4">{t("lager")}</th>
                  <th className="p-4">{t("condition")}</th>
                  <th className="p-4">{t("status")}</th>
                  <th className="p-4">Aktion</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {filtered.map((it) => (
                  <tr key={it.id} className="hover:bg-white/5 transition">
                    <td className="p-4 font-mono text-xs text-white/80">{it.id}</td>
                    <td className="p-4 text-white">{it.name?.trim() ? it.name : "-"}</td>
                    <td className="p-4 text-white/75">{it.typ ?? "-"}</td>
                    <td className="p-4 text-white/75">{it.category ?? "-"}</td>
                    <td className="p-4 text-white/75">{it.lager ?? "-"}</td>
                    <td className="p-4 text-white/75">{it.condition ?? "-"}</td>
                    <td className="p-4 text-white/75">{it.available ? t("available") : t("notAvailable")}</td>
                    <td className="p-4">
                      {isAdmin ? (
                        <button
                          onClick={() => deleteItem(it.id)}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100 hover:bg-red-500/15 transition"
                        >
                          {t("delete")}
                        </button>
                      ) : (
                        <span className="text-xs text-white/40">-</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td className="p-6 text-white/60" colSpan={8}>
                      {items.length ? t("emptyFiltered") : t("emptyAll")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-white/60">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
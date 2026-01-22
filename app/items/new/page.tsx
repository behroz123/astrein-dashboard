"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { usePrefs } from "../../../lib/prefs";

type Role = "admin" | "mitarbeiter";

export default function NewItemPage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [uid, setUid] = useState<string>("");
  const [role, setRole] = useState<Role>("mitarbeiter");
  const isAdmin = useMemo(() => role === "admin", [role]);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [typ, setTyp] = useState<"gerät" | "material">("gerät");
  const [category, setCategory] = useState("");
  const [lager, setLager] = useState("LA");
  const [condition, setCondition] = useState<"neu" | "gebraucht" | "reparatur" | "defekt">("neu");
  const [available, setAvailable] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setUid(user.uid);

      const uSnap = await getDoc(doc(db, "users", user.uid));
      setRole((uSnap.data()?.role as Role) ?? "mitarbeiter");
    });

    return () => unsub();
  }, [router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!isAdmin) {
      setMsg(t("onlyAdmin"));
      return;
    }

    const cleanId = id.trim();
    if (!cleanId) return;

    setSaving(true);
    try {
      await setDoc(doc(db, "items", cleanId), {
        name: name.trim(),
        typ,
        category: category.trim(),
        lager: lager.trim(),
        condition,
        available,
        archived: false,
        createdAt: serverTimestamp(),
        createdBy: uid,
      });

      router.replace("/items");
    } catch (err: any) {
      setMsg(err?.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{t("addItemTitle")}</h1>
          <p className="mt-1 text-sm text-white/60">
            Rolle: <span className="font-semibold text-white/85">{role}</span>
          </p>
        </div>

        <Link
          href="/items"
          className="w-fit rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 transition"
        >
          {t("back")}
        </Link>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 max-w-2xl">
        {!isAdmin && (
          <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            {t("notAdminBox")}
          </div>
        )}

        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <label className="text-sm text-white/80">{t("idLabel")}</label>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-white/35 outline-none"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="G-LA-0001"
              required
            />
            <p className="mt-2 text-xs text-white/45">{t("idHint")}</p>
          </div>

          <div>
            <label className="text-sm text-white/80">{t("name")}</label>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-white/35 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Staubsauger Kärcher"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/80">{t("type")}</label>
              <select
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                value={typ}
                onChange={(e) => setTyp(e.target.value as any)}
              >
                <option value="gerät">{t("typ_geraet")}</option>
                <option value="material">{t("typ_material")}</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-white/80">{t("category")}</label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Staubsauger"
              />
            </div>

            <div>
              <label className="text-sm text-white/80">{t("lager")}</label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                value={lager}
                onChange={(e) => setLager(e.target.value)}
                placeholder="LA"
              />
            </div>

            <div>
              <label className="text-sm text-white/80">{t("condition")}</label>
              <select
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
              >
                <option value="neu">{t("cond_neu")}</option>
                <option value="gebraucht">{t("cond_gebraucht")}</option>
                <option value="reparatur">{t("cond_reparatur")}</option>
                <option value="defekt">{t("cond_defekt")}</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-white/80">{t("availableLabel")}</span>
          </label>

          {msg && (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/80">
              {msg}
            </div>
          )}

          <button
            disabled={!isAdmin || saving}
            className="w-full rounded-2xl btn-accent px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
            type="submit"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </form>
      </div>
    </div>
  );
}
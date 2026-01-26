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
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { usePrefs } from "../../../lib/prefs";

type Role = "admin" | "mitarbeiter";

export default function NewItemPage() {
  const router = useRouter();
  const { t, lang } = usePrefs();

  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>("mitarbeiter");
  const [uid, setUid] = useState("");

  // form fields
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  const [type, setType] = useState<"Gerät" | "Material">("Gerät");

  // Kategorie: pick or custom
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryMode, setCategoryMode] = useState<"pick" | "custom">("pick");
  const [categoryPick, setCategoryPick] = useState<string>("");
  const [category, setCategory] = useState("");

  // Zustand: pick or custom
  const [zustandMode, setZustandMode] = useState<"pick" | "custom">("pick");
  const [zustandPick, setZustandPick] = useState<string>("neu");
  const [zustand, setZustand] = useState("");

  const [lager, setLager] = useState<"LA" | "LB" | "">("");
  const [status, setStatus] = useState<"verfügbar" | "nicht verfügbar">(
    "verfügbar"
  );
  const [stock, setStock] = useState<number>(1);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

      const rr: Role = r === "admin" ? "admin" : "mitarbeiter";
      setRole(rr);
      setReady(true);

      if (rr !== "admin") router.replace("/items");
    });

    return () => unsub();
  }, [router]);

  // load existing categories from items
  useEffect(() => {
    if (!ready) return;

    (async () => {
      const snap = await getDocs(collection(db, "items"));
      const set = new Set<string>();
      snap.docs.forEach((d) => {
        const v = String((d.data() as any).category ?? "").trim();
        if (v) set.add(v);
      });
      const list = Array.from(set).sort((a, b) => a.localeCompare(b));
      setCategories(list);

      if (list.length) {
        setCategoryPick(list[0]);
        setCategory(list[0]);
      }
    })();
  }, [ready]);

  const finalCategory = useMemo(() => {
    return categoryMode === "pick" ? categoryPick : category.trim();
  }, [categoryMode, categoryPick, category]);

  const finalZustand = useMemo(() => {
    return zustandMode === "pick" ? zustandPick : zustand.trim();
  }, [zustandMode, zustandPick, zustand]);

  async function onSave() {
    setMsg(null);

    const docId = id.trim();
    if (!docId) return setMsg("Bitte eine ID eingeben (z.B. G-LA001).");
    if (!name.trim()) return setMsg("Bitte einen Namen eingeben.");
    if (categoryMode === "custom" && !finalCategory) {
      return setMsg("Bitte eine Kategorie auswählen oder eingeben.");
    }
    if (zustandMode === "custom" && !finalZustand) {
      return setMsg("Bitte einen Zustand auswählen oder eingeben.");
    }

    const cleanStock = Math.max(0, Math.floor(Number(stock || 0)));

    setBusy(true);
    try {
      await setDoc(
        doc(db, "items", docId),
        {
          name: name.trim(),
          type,
          category: finalCategory || "",
          lager: lager || "",
          zustand: finalZustand || "",
          status,
          stock: cleanStock,
          reservedQty: 0,
          createdAt: serverTimestamp(),
          createdBy: uid,
        },
        { merge: true }
      );

      router.replace("/items");
    } catch {
      setMsg("Speichern fehlgeschlagen. Prüfe Firestore Rules.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">{t("common.loading")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs muted">{t("role." + role)}</div>
            <h1 className="mt-2 text-2xl font-semibold text-white">{t("items.new")}</h1>
            <div className="mt-1 text-sm muted">{t("items.newSubtitle")}</div>
          </div>

          <Link href="/items" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition">
            {t("common.back")}
          </Link>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-xs text-white/70">{t("form.id")}</div>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="G-LA001"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            />
          </label>

          <label className="block">
            <div className="text-xs text-white/70">{t("form.name")}</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.placeholder.name")}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            />
          </label>

          <label className="block">
            <div className="text-xs text-white/70">{t("form.type")}</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option value="Gerät" className="bg-black">
                {t("item.device")}
              </option>
              <option value="Material" className="bg-black">
                {t("item.material")}
              </option>
            </select>
          </label>

          {/* Kategorie */}
          <label className="block">
            <div className="text-xs text-white/70">{t("form.category")}</div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={categoryMode === "pick" ? categoryPick : "__custom__"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom__") {
                    setCategoryMode("custom");
                    setCategory("");
                  } else {
                    setCategoryMode("pick");
                    setCategoryPick(v);
                    setCategory(v);
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
              >
                {categories.length === 0 ? (
                  <option value="" className="bg-black">
                    {t("form.noCategoryFound")}
                  </option>
                ) : (
                  categories.map((c) => (
                    <option key={c} value={c} className="bg-black">
                      {c}
                    </option>
                  ))
                )}
                <option value="__custom__" className="bg-black">
                  {t("form.newCategory")}
                </option>
              </select>

              <input
                disabled={categoryMode !== "custom"}
                value={categoryMode === "custom" ? category : ""}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("form.newCategoryPlaceholder")}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25 disabled:opacity-50"
              />
            </div>
          </label>

          <label className="block">
            <div className="text-xs text-white/70">{t("form.warehouse")}</div>
            <select
              value={lager}
              onChange={(e) => setLager(e.target.value as any)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option value="" className="bg-black">
                —
              </option>
              <option value="LA" className="bg-black">
                LA
              </option>
              <option value="LB" className="bg-black">
                LB
              </option>
            </select>
          </label>

          {/* Zustand */}
          <label className="block">
            <div className="text-xs text-white/70">{t("form.state")}</div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={zustandMode === "pick" ? zustandPick : "__custom__"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom__") {
                    setZustandMode("custom");
                    setZustand("");
                  } else {
                    setZustandMode("pick");
                    setZustandPick(v);
                    setZustand(v);
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
              >
                <option value="neu" className="bg-black">
                  {t("state.new")}
                </option>
                <option value="ok" className="bg-black">
                  {t("state.ok")}
                </option>
                <option value="reparatur nötig" className="bg-black">
                  {t("state.needsRepair")}
                </option>
                <option value="defekt" className="bg-black">
                  {t("state.defect")}
                </option>
                <option value="ausgesondert" className="bg-black">
                  {t("state.disposed")}
                </option>
                <option value="__custom__" className="bg-black">
                  {t("state.other")}
                </option>
              </select>

              <input
                disabled={zustandMode !== "custom"}
                value={zustandMode === "custom" ? zustand : ""}
                onChange={(e) => setZustand(e.target.value)}
                placeholder={t("form.statePlaceholder")}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25 disabled:opacity-50"
              />
            </div>
          </label>

          <label className="block">
            <div className="text-xs text-white/70">{t("form.status")}</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            >
              <option value="verfügbar" className="bg-black">
                {t("status.available")}
              </option>
              <option value="nicht verfügbar" className="bg-black">
                {t("status.unavailable")}
              </option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs text-white/70">{t("form.stockTotal")}</div>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-white/25"
            />
          </label>
        </div>

        {msg && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85">
            {msg}
          </div>
        )}

        <div className="mt-5 flex gap-3">

          <button
            onClick={onSave}
            disabled={busy}
            className="rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
            style={{ background: "rgb(var(--accent))", color: "white" }}
          >
            {busy ? t("action.saving") : t("action.save")}
          </button>

          <Link href="/items" className="rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-sm text-white/85 hover:bg-white/5 transition">
            {t("action.cancel")}
          </Link>
        </div>
      </div>
    </div>
  );
}
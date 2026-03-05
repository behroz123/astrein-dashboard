"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

type MoveInEntry = {
  id: string;
  person?: string;
  movedInAt?: any;
  movedInDate?: string;
  toWhere?: string;
  notes?: string;
  createdAt?: any;
  createdByUid?: string;
  createdByName?: string;
};

function formatDate(x: any) {
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

export default function EinzuegePage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<MoveInEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [person, setPerson] = useState("");
  const [movedInDate, setMovedInDate] = useState("");
  const [toWhere, setToWhere] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!ready) return;

    setLoading(true);
    setErr(null);

    const q = query(collection(db, "moveins"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: MoveInEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setRows(list);
        setLoading(false);
      },
      (error) => {
        console.error("moveins onSnapshot error:", error);
        setErr("Fehler beim Laden der Einzüge");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [ready]);

  const totalCount = useMemo(() => rows.length, [rows]);

  async function handleAdd() {
    if (!person.trim() || !movedInDate || !toWhere.trim()) {
      setErr("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    setErr(null);

    try {
      const dateObj = new Date(movedInDate);
      const movedInAt = isNaN(dateObj.getTime())
        ? null
        : Timestamp.fromDate(dateObj);

      await addDoc(collection(db, "moveins"), {
        person: person.trim(),
        movedInAt,
        movedInDate,
        toWhere: toWhere.trim(),
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByName: user.displayName || user.email || "Unbekannt",
      });

      setPerson("");
      setMovedInDate("");
      setToWhere("");
      setNotes("");
    } catch (e) {
      console.error("add movein error:", e);
      setErr("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Modern Header */}
      <div className="mb-10">
        <button
          onClick={() => router.push('/immobilien')}
          className="inline-flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "rgb(var(--foreground))" }}
        >
          Zurück
        </button>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold" 
             style={{ 
               background: "rgba(var(--accent), 0.1)",
               color: "rgb(var(--accent))"
             }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgb(var(--accent))" }}></span>
          Einzüge
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: "rgb(var(--foreground))" }}>
              {t("moveins.title")}
            </h1>
            <p className="text-lg opacity-60">
              {t("moveins.subtitle")}
            </p>
          </div>
          <div className="text-sm font-semibold px-4 py-2 rounded-lg opacity-60"
               style={{ background: "rgba(var(--accent), 0.1)", color: "rgb(var(--accent))" }}>
            {totalCount} {t("moveins.count")}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t("moveins.form.title")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-white/60">{t("moveins.form.person")}</label>
            <input
              className="input mt-2"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Max Mustermann"
            />
          </div>
          <div>
            <label className="text-xs text-white/60">{t("moveins.form.date")}</label>
            <input
              type="date"
              className="input mt-2"
              value={movedInDate}
              onChange={(e) => setMovedInDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-white/60">{t("moveins.form.to")}</label>
            <input
              className="input mt-2"
              value={toWhere}
              onChange={(e) => setToWhere(e.target.value)}
              placeholder="Wohnung / Adresse"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs text-white/60">{t("moveins.form.notes")}</label>
          <textarea
            className="input mt-2 min-h-[90px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Zusätzliche Hinweise..."
          />
        </div>

        {err && <div className="mt-3 text-sm text-red-300">{err}</div>}

        <div className="mt-4">
          <button
            onClick={handleAdd}
            disabled={saving}
            className="btn-accent px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? t("common.pleaseWait") : t("moveins.form.save")}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t("moveins.list.title")}</h2>

        {loading ? (
          <div className="text-sm muted">{t("common.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm muted">{t("moveins.empty")}</div>
        ) : (
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-3 text-xs uppercase text-white/50 px-2">
              <div className="col-span-3">{t("moveins.col.person")}</div>
              <div className="col-span-2">{t("moveins.col.date")}</div>
              <div className="col-span-3">{t("moveins.col.to")}</div>
              <div className="col-span-2">{t("moveins.col.by")}</div>
              <div className="col-span-2">{t("moveins.col.notes")}</div>
            </div>

            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="md:col-span-3">
                  <div className="text-sm text-white">{r.person || "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-white/80">
                    {formatDate(r.movedInAt ?? r.movedInDate)}
                  </div>
                </div>
                <div className="md:col-span-3">
                  <div className="text-sm text-white/80">{r.toWhere || "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-white/70">
                    {r.createdByName || "—"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-white/70 line-clamp-2">
                    {r.notes || "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

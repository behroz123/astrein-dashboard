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

type MoveoutEntry = {
  id: string;
  person?: string;
  movedOutAt?: any;
  movedOutDate?: string;
  fromWhere?: string;
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

export default function AuszuegePage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<MoveoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [person, setPerson] = useState("");
  const [movedOutDate, setMovedOutDate] = useState("");
  const [fromWhere, setFromWhere] = useState("");
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

    const q = query(collection(db, "moveouts"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: MoveoutEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setRows(list);
        setLoading(false);
      },
      (error) => {
        console.error("moveouts onSnapshot error:", error);
        setErr("Fehler beim Laden der Auszüge");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [ready]);

  const totalCount = useMemo(() => rows.length, [rows]);

  async function handleAdd() {
    if (!person.trim() || !movedOutDate || !fromWhere.trim()) {
      setErr("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    setErr(null);

    try {
      const dateObj = new Date(movedOutDate);
      const movedOutAt = isNaN(dateObj.getTime())
        ? null
        : Timestamp.fromDate(dateObj);

      await addDoc(collection(db, "moveouts"), {
        person: person.trim(),
        movedOutAt,
        movedOutDate,
        fromWhere: fromWhere.trim(),
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByName: user.displayName || user.email || "Unbekannt",
      });

      setPerson("");
      setMovedOutDate("");
      setFromWhere("");
      setNotes("");
    } catch (e) {
      console.error("add moveout error:", e);
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
          Auszüge
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: "rgb(var(--foreground))" }}>
              {t("moveouts.title")}
            </h1>
            <p className="text-lg opacity-60">
              {t("moveouts.subtitle")}
            </p>
          </div>
          <div className="text-sm font-semibold px-4 py-2 rounded-lg opacity-60"
               style={{ background: "rgba(var(--accent), 0.1)", color: "rgb(var(--accent))" }}>
            {totalCount} {t("moveouts.count")}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t("moveouts.form.title")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-white/60">{t("moveouts.form.person")}</label>
            <input
              className="input mt-2"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Max Mustermann"
            />
          </div>
          <div>
            <label className="text-xs text-white/60">{t("moveouts.form.date")}</label>
            <input
              type="date"
              className="input mt-2"
              value={movedOutDate}
              onChange={(e) => setMovedOutDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-white/60">{t("moveouts.form.from")}</label>
            <input
              className="input mt-2"
              value={fromWhere}
              onChange={(e) => setFromWhere(e.target.value)}
              placeholder="Wohnung / Adresse"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs text-white/60">{t("moveouts.form.notes")}</label>
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
            {saving ? t("common.pleaseWait") : t("moveouts.form.save")}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t("moveouts.list.title")}</h2>

        {loading ? (
          <div className="text-sm muted">{t("common.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm muted">{t("moveouts.empty")}</div>
        ) : (
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-3 text-xs uppercase text-white/50 px-2">
              <div className="col-span-3">{t("moveouts.col.person")}</div>
              <div className="col-span-2">{t("moveouts.col.date")}</div>
              <div className="col-span-3">{t("moveouts.col.from")}</div>
              <div className="col-span-2">{t("moveouts.col.by")}</div>
              <div className="col-span-2">{t("moveouts.col.notes")}</div>
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
                    {formatDate(r.movedOutAt ?? r.movedOutDate)}
                  </div>
                </div>
                <div className="md:col-span-3">
                  <div className="text-sm text-white/80">{r.fromWhere || "—"}</div>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

export default function ExportsPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

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

  async function exportItems() {
    setExporting("items");
    try {
      const snap = await getDocs(collection(db, "items"));
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const headers = ["ID", "Name", "Typ", "Kategorie", "Lager", "Zustand", "Status", "Bestand"];
      const rows = items.map((item: any) => [
        item.id || "",
        item.name || "",
        item.type || item.typ || "",
        item.category || "",
        item.lager || item.lagerId || "",
        item.zustand || item.condition || "",
        item.status || "",
        item.stock || item.bestand || item.Bestand || "0"
      ]);

      const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      downloadCSV(csv, `lagerbestand_${getDateString()}.csv`);
    } catch (error) {
      console.error("Error exporting items:", error);
      alert(t("error") || "Fehler beim Export");
    } finally {
      setExporting(null);
    }
  }

  async function exportWareneingang() {
    setExporting("wareneingang");
    try {
      const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const allLogs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const logs = allLogs.filter((log: any) => log.type === "wareneingang");

      const headers = ["Datum", "Uhrzeit", "Benutzer", "Artikel-ID", "Artikel", "Menge", "Alter Bestand", "Neuer Bestand"];
      const rows = logs.map((log: any) => {
        const date = formatTimestampForCSV(log.timestamp);
        const userName = log.userName && !log.userName.includes('@') 
          ? log.userName 
          : log.userName?.split('@')[0] || log.userId || "Unbekannt";
        
        return [
          date.date,
          date.time,
          userName,
          log.itemId || "",
          log.itemName || "",
          log.menge || "",
          log.alterBestand || "",
          log.neuerBestand || ""
        ];
      });

      const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      downloadCSV(csv, `wareneingang_${getDateString()}.csv`);
    } catch (error) {
      console.error("Error exporting wareneingang:", error);
      alert(t("error") || "Fehler beim Export");
    } finally {
      setExporting(null);
    }
  }

  async function exportWarenausgang() {
    setExporting("warenausgang");
    try {
      const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const allLogs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const logs = allLogs.filter((log: any) => log.type === "warenausgang" || log.type === "out");

      const headers = ["Datum", "Uhrzeit", "Benutzer", "Artikel-ID", "Artikel", "Menge", "Alter Bestand", "Neuer Bestand"];
      const rows = logs.map((log: any) => {
        const date = formatTimestampForCSV(log.timestamp);
        const userName = log.userName && !log.userName.includes('@') 
          ? log.userName 
          : log.userName?.split('@')[0] || log.userId || "Unbekannt";
        
        return [
          date.date,
          date.time,
          userName,
          log.itemId || "",
          log.itemName || "",
          log.menge || "",
          log.alterBestand || "",
          log.neuerBestand || ""
        ];
      });

      const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      downloadCSV(csv, `warenausgang_${getDateString()}.csv`);
    } catch (error) {
      console.error("Error exporting warenausgang:", error);
      alert(t("error") || "Fehler beim Export");
    } finally {
      setExporting(null);
    }
  }

  function formatTimestampForCSV(ts: any): { date: string; time: string } {
    if (!ts) return { date: "", time: "" };

    let date: Date;
    if (ts instanceof Timestamp) {
      date = ts.toDate();
    } else if (ts instanceof Date) {
      date = ts;
    } else {
      date = new Date(ts);
    }

    const dateStr = date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const timeStr = date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return { date: dateStr, time: timeStr };
  }

  function getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!ready) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{t("exports.title")}</h1>
            <div className="mt-1 text-sm muted">
              {t("exports.subtitle")}
            </div>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
          >
            {t("common.back")}
          </Link>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Items Export */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">{t("exports.items.title")}</h3>
              <div className="text-xs muted">{t("exports.items.desc")}</div>
            </div>
          </div>

          <button
            onClick={exportItems}
            disabled={exporting !== null}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting === "items" ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t("exports.exporting")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("exports.download")}
              </>
            )}
          </button>
        </div>

        {/* Wareneingang Export */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">{t("exports.wareneingang.title")}</h3>
              <div className="text-xs muted">{t("exports.wareneingang.desc")}</div>
            </div>
          </div>

          <button
            onClick={exportWareneingang}
            disabled={exporting !== null}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting === "wareneingang" ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t("exports.exporting")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("exports.download")}
              </>
            )}
          </button>
        </div>

        {/* Warenausgang Export */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">{t("exports.warenausgang.title")}</h3>
              <div className="text-xs muted">{t("exports.warenausgang.desc")}</div>
            </div>
          </div>

          <button
            onClick={exportWarenausgang}
            disabled={exporting !== null}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting === "warenausgang" ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t("exports.exporting")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("exports.download")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-white/70">
            {t("exports.info")}
          </div>
        </div>
      </div>
    </div>
  );
}

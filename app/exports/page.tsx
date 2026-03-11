"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, Timestamp, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";
import jsPDF from "jspdf";

type WohnungsAbrechnung = {
  id: string;
  propertyId: string;
  propertyName: string;
  startDate: string;
  endDate?: string;
  totalCosts: number;
  totalPaid: number;
  notes?: string;
  createdAt: any;
  createdByName: string;
};

export default function ExportsPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [abrechnungen, setAbrechnungen] = useState<WohnungsAbrechnung[]>([]);
  const [showAbrechForm, setShowAbrechForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [totalCosts, setTotalCosts] = useState("");
  const [totalPaid, setTotalPaid] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setReady(true);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    loadProperties();
    loadAbrechnungen();
  }, [ready]);

  async function loadProperties() {
    try {
      const snap = await getDocs(collection(db, "properties"));
      const props = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProperties(props);
    } catch (error) {
      console.error("Error loading properties:", error);
    }
  }

  async function loadAbrechnungen() {
    try {
      const q = query(collection(db, "wohnungsAbrechnungen"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: WohnungsAbrechnung[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setAbrechnungen(list);
    } catch (error) {
      console.error("Error loading abrechnungen:", error);
    }
  }

  async function handleSaveAbrechnung() {
    if (!selectedProperty || !startDate || !totalCosts || !user) {
      alert("Bitte Objekt, Startdatum und Kosten ausfüllen!");
      return;
    }

    try {
      const property = properties.find(p => p.id === selectedProperty);
      const data = {
        propertyId: selectedProperty,
        propertyName: property?.adresse || property?.address || "",
        startDate,
        endDate: "",
        totalCosts: parseFloat(totalCosts),
        totalPaid: parseFloat(totalPaid) || 0,
        notes,
        createdAt: serverTimestamp(),
        createdByName: user.email?.split("@")[0] || "Unbekannt",
      };

      await addDoc(collection(db, "wohnungsAbrechnungen"), data);
      alert("Abrechnung gespeichert!");
      setShowAbrechForm(false);
      setSelectedProperty("");
      setStartDate("");
      setTotalCosts("");
      setTotalPaid("");
      setNotes("");
      loadAbrechnungen();
    } catch (error) {
      console.error("Error saving abrechnung:", error);
      alert("Fehler beim Speichern!");
    }
  }

  function generateAbrechungPDF(abrechnung: WohnungsAbrechnung) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    // ===== HEADER =====
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text("WOHNUNGSABRECHNUNG", margin, y);
    
    y += 10;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    const today = new Date().toLocaleDateString("de-DE");
    doc.text(`Erstellt: ${today}`, margin, y);

    // ===== SEPARATOR =====
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);

    // ===== PROPERTY INFO =====
    y += 10;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text("Objektinformationen", margin, y);

    y += 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    
    doc.text(`Objekt: ${abrechnung.propertyName}`, margin + 2, y);
    y += 5;
    doc.text(`Abrechnungszeitraum: ${abrechnung.startDate}${abrechnung.endDate ? ` bis ${abrechnung.endDate}` : ''}`, margin + 2, y);

    // ===== FINANCIAL SUMMARY =====
    y += 12;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text("Finanzübersicht", margin, y);

    y += 10;
    const boxHeight = 25;
    const boxWidth = (maxWidth - 4) / 2;

    // Costs Box
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, boxWidth, boxHeight, "F");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("Gesamtkosten", margin + 3, y + 5);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(`${abrechnung.totalCosts.toFixed(2)} €`, margin + 3, y + 16);

    // Paid Box
    doc.setFillColor(240, 253, 244);
    doc.rect(margin + boxWidth + 2, y, boxWidth, boxHeight, "F");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("Bezahlt", margin + boxWidth + 5, y + 5);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(`${abrechnung.totalPaid.toFixed(2)} €`, margin + boxWidth + 5, y + 16);

    y += boxHeight + 8;

    // Difference
    const difference = abrechnung.totalCosts - abrechnung.totalPaid;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Differenz: ${difference.toFixed(2)} €`, margin, y);

    // ===== NOTES =====
    if (abrechnung.notes) {
      y += 10;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text("Notizen:", margin, y);

      y += 6;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const noteLines = doc.splitTextToSize(abrechnung.notes, maxWidth);
      doc.text(noteLines, margin, y);
    }

    // ===== FOOTER =====
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("AH Exzellent Immobilien GmbH • Heidenkampweg 46 • 20097 Hamburg", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

    const fileName = `Abrechnung_${abrechnung.propertyName.replace(/\s+/g, '_')}_${abrechnung.startDate}.pdf`;
    doc.save(fileName);
  }

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

  async function exportFuhrpark() {
    setExporting("fuhrpark");
    try {
      const snap = await getDocs(collection(db, "vehicles"));
      const vehicles = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const headers = ['Kennzeichen', 'Modell', 'Fahrzeugname', 'FIN', 'Kilometerstand', 'Letzter Service', 'Fahrer Vorname', 'Fahrer Name', 'Geburtsdatum', 'Adresse', 'Versicherungsnr', 'Versicherung'];
      const rows = vehicles.map((v: any) => [
        v.kennzeichen || '',
        v.modell || '',
        v.fahrzeugName || '',
        v.fin || '',
        v.kilometerstand || '',
        v.letzterService || '',
        v.fahrerVorname || '',
        v.fahrerName || '',
        v.fahrerGeburtsdatum || '',
        v.fahrerAdresse || '',
        v.versicherungsnummer || '',
        v.versicherungsname || ''
      ]);

      const csv = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
      downloadCSV('\uFEFF' + csv, `fuhrpark_${getDateString()}.csv`);
    } catch (error) {
      console.error("Error exporting fuhrpark:", error);
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
        {/* Wohnungsabrechnung Export */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Wohnungsabrechnung</h3>
              <div className="text-xs muted">Hausverwaltung verwalten</div>
            </div>
          </div>

          <button
            onClick={() => setShowAbrechForm(!showAbrechForm)}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-600 transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neue Abrechnung
          </button>
        </div>
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

        {/* Fuhrpark Export */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <span className="text-2xl">🚗</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Fuhrpark</h3>
              <div className="text-xs muted">Alle Fahrzeuge exportieren</div>
            </div>
          </div>

          <button
            onClick={exportFuhrpark}
            disabled={exporting !== null}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-purple-500 text-white hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting === "fuhrpark" ? (
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

      {/* Abrechnung Form Modal */}
      {showAbrechForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-[28px] surface p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Neue Abrechnung</h2>
              <button
                onClick={() => setShowAbrechForm(false)}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Property Selection */}
              <div>
                <label className="text-xs muted font-medium">Objekt auswählen *</label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="input mt-2 rounded-lg w-full"
                >
                  <option value="">Wählen Sie ein Objekt</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.adresse || prop.address || "Objekt"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs muted font-medium">Abrechnungsdatum von *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input mt-2 rounded-lg w-full"
                />
              </div>

              {/* Total Costs */}
              <div>
                <label className="text-xs muted font-medium">Gesamtkosten (EUR) *</label>
                <input
                  type="number"
                  value={totalCosts}
                  onChange={(e) => setTotalCosts(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="input mt-2 rounded-lg w-full"
                />
              </div>

              {/* Total Paid */}
              <div>
                <label className="text-xs muted font-medium">Bezahlt (EUR)</label>
                <input
                  type="number"
                  value={totalPaid}
                  onChange={(e) => setTotalPaid(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="input mt-2 rounded-lg w-full"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs muted font-medium">Notizen</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Zusätzliche Informationen..."
                  className="input mt-2 rounded-lg w-full h-20"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveAbrechnung}
                  className="flex-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition"
                >
                  💾 Speichern
                </button>
                <button
                  onClick={() => setShowAbrechForm(false)}
                  className="rounded-lg surface-2 px-6 py-3 text-sm muted hover:bg-white/5 transition"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abrechnungen List */}
      {abrechnungen.length > 0 && (
        <div className="rounded-[28px] surface p-6">
          <h2 className="text-xl font-semibold mb-4">Abrechnungen</h2>
          <div className="space-y-2">
            {abrechnungen.map((abr) => (
              <div key={abr.id} className="flex items-center justify-between p-4 rounded-xl surface-2 hover:bg-white/5 transition">
                <div className="flex-1">
                  <div className="font-semibold text-white">{abr.propertyName}</div>
                  <div className="text-xs muted mt-1">{abr.startDate}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-4">
                    <div className="text-sm font-semibold">{abr.totalCosts.toFixed(2)} €</div>
                    <div className="text-xs muted">{abr.totalPaid.toFixed(2)} € bezahlt</div>
                  </div>
                  <button
                    onClick={() => generateAbrechungPDF(abr)}
                    className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition text-xs font-semibold"
                  >
                    📄 PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, Timestamp, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";
import jsPDF from "jspdf";

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  monthlyPayment: number;
  startDate: string;
  createdAt: any;
  createdByName: string;
  paidMonths?: string[];
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const index = parseInt(monthNumber, 10) - 1;
  return `${monthNames[index] || monthNumber} ${year}`;
}

function getMonthOptions(): string[] {
  const now = new Date();
  const options: string[] = [];
  for (let offset = -12; offset <= 6; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return options;
}

export default function ExportsPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showTenantOptions, setShowTenantOptions] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showTenantManageModal, setShowTenantManageModal] = useState(false);
  const [showTenantPaymentsModal, setShowTenantPaymentsModal] = useState(false);
  const [showPrintMonthModal, setShowPrintMonthModal] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [paymentMonth, setPaymentMonth] = useState(getCurrentMonth());
  const [selectedPrintMonth, setSelectedPrintMonth] = useState(getCurrentMonth());
  const [tenantPaymentMap, setTenantPaymentMap] = useState<Record<string, boolean>>({});

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
    loadTenants();
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

  async function loadTenants() {
    try {
      const q = query(collection(db, "tenants"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: Tenant[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setTenants(list);
    } catch (error) {
      console.error("Error loading tenants:", error);
    }
  }

  async function handleSaveTenant() {
    if (!selectedProperty || !firstName.trim() || !lastName.trim() || !monthlyPayment || !startDate || !user) {
      alert("Bitte alle Felder ausfüllen!");
      return;
    }

    try {
      const property = properties.find(p => p.id === selectedProperty);
      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        propertyId: selectedProperty,
        propertyName: property?.adresse || property?.address || "",
        propertyAddress: property?.stadtplz || "",
        monthlyPayment: parseFloat(monthlyPayment),
        startDate,
      };

      if (editingTenantId) {
        await updateDoc(doc(db, "tenants", editingTenantId), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "tenants"), {
          ...data,
          createdAt: serverTimestamp(),
          createdByName: user.email?.split("@")[0] || "Unbekannt",
        });
      }

      setEditingTenantId(null);
      setShowTenantForm(false);
      setFirstName("");
      setLastName("");
      setSelectedProperty("");
      setMonthlyPayment("");
      setStartDate("");
      loadTenants();
    } catch (error) {
      console.error("Error saving tenant:", error);
      alert("Fehler beim Speichern!");
    }
  }

  function handleEditTenant(tenant: Tenant) {
    setEditingTenantId(tenant.id);
    setSelectedProperty(tenant.propertyId || "");
    setFirstName(tenant.firstName || "");
    setLastName(tenant.lastName || "");
    setMonthlyPayment(String(tenant.monthlyPayment ?? ""));
    setStartDate(tenant.startDate || "");
    setShowTenantManageModal(false);
    setShowTenantOptions(false);
    setShowTenantForm(true);
  }

  async function handleDeleteTenant(tenantId: string) {
    const confirmed = window.confirm("Diesen Mieter wirklich löschen?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "tenants", tenantId));
      setTenants((prev) => prev.filter((t) => t.id !== tenantId));
    } catch (error) {
      console.error("Error deleting tenant:", error);
      alert("Fehler beim Löschen!");
    }
  }

  useEffect(() => {
    setTenantPaymentMap(tenants.reduce((acc, tenant) => {
      acc[tenant.id] = tenant.paidMonths?.includes(paymentMonth) ?? false;
      return acc;
    }, {} as Record<string, boolean>));
  }, [tenants, paymentMonth]);

  function handleToggleTenantPayment(tenantId: string) {
    setTenantPaymentMap((prev) => ({
      ...prev,
      [tenantId]: !prev[tenantId],
    }));
  }

  async function handleSaveTenantPayments() {
    if (!paymentMonth) {
      alert("Bitte einen Monat auswählen.");
      return;
    }

    try {
      const updatedTenants = await Promise.all(tenants.map(async (tenant) => {
        const paid = tenantPaymentMap[tenant.id];
        const currentPaidMonths = tenant.paidMonths ? [...tenant.paidMonths] : [];
        const hasMonth = currentPaidMonths.includes(paymentMonth);
        let nextPaidMonths = currentPaidMonths;

        if (paid && !hasMonth) {
          nextPaidMonths = [...currentPaidMonths, paymentMonth];
        } else if (!paid && hasMonth) {
          nextPaidMonths = currentPaidMonths.filter((m) => m !== paymentMonth);
        }

        if (JSON.stringify(nextPaidMonths) !== JSON.stringify(currentPaidMonths)) {
          await updateDoc(doc(db, "tenants", tenant.id), { paidMonths: nextPaidMonths });
        }

        return { ...tenant, paidMonths: nextPaidMonths };
      }));

      setTenants(updatedTenants);
      setShowTenantPaymentsModal(false);
    } catch (error) {
      console.error("Error saving tenant payment state:", error);
      alert("Fehler beim Speichern der Zahlungdaten!");
    }
  }

  function generateTenantListPDF(month: string) {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;
    const margin = 20;
    
    const primaryColor: [number, number, number] = [25, 103, 210];
    const secondaryColor: [number, number, number] = [50, 50, 50];
    const lightGray: [number, number, number] = [240, 240, 240];
    
    // Company name header
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('AH Exzellent Immobilien GmbH', margin, y);
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('MIETERLISTE', margin, y + 13);
    doc.setFontSize(11);
    doc.text(`Monat: ${formatMonthLabel(month)}`, margin, y + 23);
    
    // Current date
    const now = new Date();
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Erstellt: ${now.toLocaleDateString('de-DE')}`, pageWidth - margin - 40, y + 8);
    
    y += 34;
    
    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 8;
    
    // Table headers
    const headers = ['Name', 'Objekt', 'Adresse', 'Miete/Monat', 'Beginn', 'Status'];
    const colWidths = [36, 26, 40, 24, 24, 20];
    
    // Header background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, y - 5, pageWidth - 2 * margin, 7, 'F');
    
    // Header text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    
    let xPos = margin;
    headers.forEach((header, idx) => {
      doc.text(header, xPos + 2, y);
      xPos += colWidths[idx];
    });
    
    y += 10;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    
    tenants.forEach((tenant, idx) => {
      if (y > 250) {
        doc.addPage();
        y = margin;
      }
      
      // Alternate row background
      if (idx % 2 === 0) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(margin, y - 3, pageWidth - 2 * margin, 6, 'F');
      }
      
      xPos = margin;
      const nameStr = `${tenant.firstName} ${tenant.lastName}`;
      const rentStr = `${tenant.monthlyPayment.toFixed(2)} €`;
      const paidStatus = tenant.paidMonths?.includes(month) ? 'Bezahlt' : 'Offen';
      const rowData = [nameStr, tenant.propertyName, tenant.propertyAddress, rentStr, tenant.startDate, paidStatus];
      
      rowData.forEach((text, i) => {
        doc.text(text, xPos + 2, y + 1, { maxWidth: colWidths[i] - 4 });
        xPos += colWidths[i];
      });
      
      y += 6;
    });
    
    // Summary section
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    
    const totalRent = tenants.reduce((sum, t) => sum + t.monthlyPayment, 0);
    const paidCount = tenants.filter((tenant) => tenant.paidMonths?.includes(month)).length;
    doc.text(`Gesamtmiete: ${totalRent.toFixed(2)} €`, margin, y);
    doc.text(`Mieter: ${tenants.length}`, margin, y + 7);
    doc.text(`Bezahlt: ${paidCount}`, margin, y + 14);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('AH Exzellent Immobilien GmbH • Heidenkampweg 46 • 20097 Hamburg', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    const fileName = `Mieterliste_${month}.pdf`;
    doc.save(fileName);
  }

  function downloadTenantListCSV(month?: string) {
    const baseHeaders = ["Vorname", "Nachname", "Objekt", "Adresse", "Miete", "Beginn"];
    const headers = month ? [...baseHeaders, "Monat", "Bezahlt"] : baseHeaders;
    const rows = tenants.map((t) => {
      const row = [
        t.firstName,
        t.lastName,
        t.propertyName,
        t.propertyAddress,
        t.monthlyPayment.toFixed(2),
        t.startDate
      ];
      if (month) {
        row.push(formatMonthLabel(month), t.paidMonths?.includes(month) ? "Ja" : "Nein");
      }
      return row;
    });

    const csv = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Mieterliste_${month || new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {/* Tenants Management */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3.634a1 1 0 01-.952-1.405l2.694-10.131A6 6 0 0115.5 1.5h3.368a1 1 0 01.951 1.405l-2.694 10.131A6 6 0 0115 21z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white exports-card-title">Mieter</h3>
              <div className="text-xs muted exports-card-desc">Mieter verwalten & exportieren</div>
            </div>
          </div>

          <button
            onClick={() => tenants.length > 0 ? setShowTenantOptions(true) : setShowTenantForm(true)}
            className="exports-action-btn exports-action-blue w-full rounded-2xl px-4 py-3 text-sm font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition flex items-center justify-center gap-2 shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Mieter verwalten
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
              <h3 className="font-semibold text-white exports-card-title">{t("exports.items.title")}</h3>
              <div className="text-xs muted exports-card-desc">{t("exports.items.desc")}</div>
            </div>
          </div>

          <button
            onClick={exportItems}
            disabled={exporting !== null}
            className="exports-action-btn exports-action-blue w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <h3 className="font-semibold text-white exports-card-title">{t("exports.wareneingang.title")}</h3>
              <div className="text-xs muted exports-card-desc">{t("exports.wareneingang.desc")}</div>
            </div>
          </div>

          <button
            onClick={exportWareneingang}
            disabled={exporting !== null}
            className="exports-action-btn exports-action-green w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <h3 className="font-semibold text-white exports-card-title">{t("exports.warenausgang.title")}</h3>
              <div className="text-xs muted exports-card-desc">{t("exports.warenausgang.desc")}</div>
            </div>
          </div>

          <button
            onClick={exportWarenausgang}
            disabled={exporting !== null}
            className="exports-action-btn exports-action-red w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <h3 className="font-semibold text-white exports-card-title">Fuhrpark</h3>
              <div className="text-xs muted exports-card-desc">Alle Fahrzeuge exportieren</div>
            </div>
          </div>

          <button
            onClick={exportFuhrpark}
            disabled={exporting !== null}
            className="exports-action-btn exports-action-purple w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-purple-500 text-white hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Tenant Form Modal */}
      {showTenantForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-[28px] surface p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">{editingTenantId ? "Mieter bearbeiten" : "Neuer Mieter"}</h2>
              <button
                onClick={() => setShowTenantForm(false)}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* First Name */}
              <div>
                <label className="text-xs muted font-medium">Vorname *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="z.B. Max"
                  className="input mt-2 rounded-lg w-full"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="text-xs muted font-medium">Nachname *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="z.B. Mustermann"
                  className="input mt-2 rounded-lg w-full"
                />
              </div>

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

              {/* Monthly Payment */}
              <div>
                <label className="text-xs muted font-medium">Monatliche Miete (EUR) *</label>
                <input
                  type="number"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="input mt-2 rounded-lg w-full"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs muted font-medium">Mietbeginn *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input mt-2 rounded-lg w-full"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveTenant}
                  className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-3 text-sm font-bold text-white transition shadow-lg"
                >
                  {editingTenantId ? "💾 Änderungen speichern" : "💾 Speichern"}
                </button>
                <button
                  onClick={() => {
                    setEditingTenantId(null);
                    setShowTenantForm(false);
                  }}
                  className="rounded-lg surface-2 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-white/10 transition border border-gray-300"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Options Modal */}
      {showTenantOptions && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-[28px] surface p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Mieter verwalten</h2>
              <button
                onClick={() => setShowTenantOptions(false)}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <p className="text-sm muted mb-4">Was möchten Sie tun?</p>
            <div className="mb-4">
              <label className="text-xs muted font-medium">Monat für Zahlung / Export</label>
              <select
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
                className="input mt-2 rounded-lg w-full"
              >
                {getMonthOptions().map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowTenantOptions(false);
                  setShowTenantForm(true);
                }}
                className="tenant-option-btn tenant-option-blue w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-3 text-sm font-bold text-white transition flex items-center justify-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuer Mieter
              </button>

              <button
                onClick={() => {
                  setShowTenantOptions(false);
                  setShowTenantManageModal(true);
                }}
                className="tenant-option-btn tenant-option-amber w-full rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 px-4 py-3 text-sm font-bold text-white transition flex items-center justify-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-1-1v2m-5 6h10m-9 7h8a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Mieter bearbeiten / löschen
              </button>

              <button
                onClick={() => {
                  setShowTenantOptions(false);
                  setShowTenantPaymentsModal(true);
                }}
                className="tenant-option-btn tenant-option-teal w-full rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 px-4 py-3 text-sm font-bold text-white transition flex items-center justify-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M5 12h14" />
                </svg>
                Zahlung markieren
              </button>

              <button
                onClick={() => {
                  setShowTenantOptions(false);
                  setSelectedPrintMonth(paymentMonth);
                  setShowPrintMonthModal(true);
                }}
                className="tenant-option-btn tenant-option-purple w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-4 py-3 text-sm font-bold text-white transition flex items-center justify-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF drucken
              </button>

              <button
                onClick={() => {
                  downloadTenantListCSV(paymentMonth);
                  setShowTenantOptions(false);
                }}
                className="tenant-option-btn tenant-option-green w-full rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-4 py-3 text-sm font-bold text-white transition flex items-center justify-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV herunterladen
              </button>

              <button
                onClick={() => setShowTenantOptions(false)}
                className="w-full rounded-lg surface-2 px-4 py-3 text-sm font-semibold muted hover:bg-white/5 transition"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Payments Modal */}
      {showTenantPaymentsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-[28px] surface p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Zahlung markieren</h2>
                <div className="text-sm muted">Wähle den Monat und markiere die Mieten als bezahlt.</div>
              </div>
              <button
                onClick={() => setShowTenantPaymentsModal(false)}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs muted font-medium">Monat</label>
                <select
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  className="input mt-2 rounded-lg w-full"
                >
                  {getMonthOptions().map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </div>

              {tenants.length === 0 ? (
                <div className="text-sm muted">Keine Mieter gefunden.</div>
              ) : (
                tenants.map((tenant) => (
                  <div key={tenant.id} className="tenant-manage-row rounded-xl border border-white/10 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{tenant.firstName} {tenant.lastName}</div>
                      <div className="text-xs muted mt-1">{tenant.propertyName} • {tenant.monthlyPayment.toFixed(2)} €</div>
                      <div className="text-xs muted mt-1">Status: {tenant.paidMonths?.includes(paymentMonth) ? 'Bezahlt' : 'Offen'}</div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white">
                      <input
                        type="checkbox"
                        checked={tenantPaymentMap[tenant.id] ?? false}
                        onChange={() => handleToggleTenantPayment(tenant.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Bezahlt
                    </label>
                  </div>
                ))
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveTenantPayments}
                  className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-3 text-sm font-bold text-white transition shadow-lg"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setShowTenantPaymentsModal(false)}
                  className="rounded-lg surface-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-white/10 transition border border-gray-300"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Month Modal */}
      {showPrintMonthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-[28px] surface p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">PDF-Monat wählen</h2>
              <button
                onClick={() => setShowPrintMonthModal(false)}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs muted font-medium">Monat für den Druck</label>
                <select
                  value={selectedPrintMonth}
                  onChange={(e) => setSelectedPrintMonth(e.target.value)}
                  className="input mt-2 rounded-lg w-full"
                >
                  {getMonthOptions().map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    generateTenantListPDF(selectedPrintMonth);
                    setShowPrintMonthModal(false);
                  }}
                  className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-4 py-3 text-sm font-bold text-white transition shadow-lg"
                >
                  PDF drucken
                </button>
                <button
                  onClick={() => setShowPrintMonthModal(false)}
                  className="rounded-lg surface-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-white/10 transition border border-gray-300"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Manage Modal */}
      {showTenantManageModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-[28px] surface p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Mieter bearbeiten oder löschen</h2>
              <button
                onClick={() => setShowTenantManageModal(false)}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {tenants.length === 0 ? (
                <div className="text-sm muted">Keine Mieter gefunden.</div>
              ) : (
                tenants.map((tenant) => (
                  <div key={tenant.id} className="tenant-manage-row rounded-xl border border-white/10 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="tenant-manage-name font-semibold text-white">{tenant.firstName} {tenant.lastName}</div>
                      <div className="tenant-manage-subtext text-xs muted mt-1">{tenant.propertyName} • {tenant.monthlyPayment?.toFixed(2)} €</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTenant(tenant)}
                        className="tenant-manage-btn tenant-manage-btn-edit rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-bold text-white transition"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant.id)}
                        className="tenant-manage-btn tenant-manage-btn-delete rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-xs font-bold text-white transition"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

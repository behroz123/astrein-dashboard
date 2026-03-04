"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import jsPDF from "jspdf";
import { auth, db, storage } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

type WaterContract = {
  id: string;
  propertyName: string;
  propertyAddress: string;
  providerName: string;
  accountNumber: string;
  meterNumber: string;
  meterReading: string;
  monthlyPayment: string;
  contractPdfUrl?: string;
  contractPdfName?: string;
  createdAt: any;
  createdByUid: string;
  createdByName: string;
  updatedAt?: any;
};

type PropertyOption = {
  id: string;
  address?: string;
};

export default function WasserVertragPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [contracts, setContracts] = useState<WaterContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<WaterContract | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationProviderName, setCancellationProviderName] = useState("");
  const [cancellationProviderStreet, setCancellationProviderStreet] = useState("");
  const [cancellationProviderCity, setCancellationProviderCity] = useState("");
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [showNewProperty, setShowNewProperty] = useState(false);
  const [newPropertyAddress, setNewPropertyAddress] = useState("");
  const [savingProperty, setSavingProperty] = useState(false);

  // Form fields
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [providerName, setProviderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [meterReading, setMeterReading] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Get user name (Vor- und Nachname)
  function getUserDisplayName(fullEmail: string): string {
    if (!fullEmail) return "Unbekannt";
    const parts = fullEmail.split("@")[0].split(".");
    if (parts.length >= 2) {
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    }
    return fullEmail.split("@")[0];
  }

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

    setLoading(true);
    const q = query(collection(db, "waterContracts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: WaterContract[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setContracts(list);
        setLoading(false);
      },
      () => {
        setContracts([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    setPropertiesLoading(true);
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PropertyOption[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setProperties(list);
        setPropertiesLoading(false);
      },
      () => {
        setProperties([]);
        setPropertiesLoading(false);
      }
    );

    return () => unsub();
  }, [ready]);

  function resetForm() {
    setPropertyName("");
    setPropertyAddress("");
    setProviderName("");
    setAccountNumber("");
    setMeterNumber("");
    setMeterReading("");
    setMonthlyPayment("");
    setPdfFile(null);
    setSelectedPropertyId("");
    setShowNewProperty(false);
    setNewPropertyAddress("");
    setIsEditing(false);
  }

  function handleEdit(contract: WaterContract) {
    setSelectedContract(contract);
    setPropertyName(contract.propertyName || "");
    setPropertyAddress(contract.propertyAddress || "");
    setProviderName(contract.providerName || "");
    setAccountNumber(contract.accountNumber || "");
    setMeterNumber(contract.meterNumber || "");
    setMeterReading(contract.meterReading || "");
    setMonthlyPayment(contract.monthlyPayment || "");
    setSelectedPropertyId("");
    setIsEditing(true);
    setError(null);
  }

  useEffect(() => {
    if (!selectedContract || properties.length === 0) return;
    const match = properties.find(
      (p) =>
        (p.address || "").toLowerCase() ===
        (selectedContract.propertyAddress || selectedContract.propertyName || "").toLowerCase()
    );
    if (match) {
      setSelectedPropertyId(match.id);
    }
  }, [selectedContract, properties]);

  function handleNew() {
    resetForm();
    setSelectedContract(null);
    setIsEditing(true);
    setError(null);
  }

  async function handleAddProperty() {
    if (!newPropertyAddress.trim() || !user) return;

    setSavingProperty(true);
    try {
      const docRef = await addDoc(collection(db, "properties"), {
        address: newPropertyAddress.trim(),
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByName: getUserDisplayName(user.email || ""),
      });

      setSelectedPropertyId(docRef.id);
      setPropertyName(newPropertyAddress.trim());
      setPropertyAddress(newPropertyAddress.trim());
      setNewPropertyAddress("");
      setShowNewProperty(false);
    } finally {
      setSavingProperty(false);
    }
  }

  async function handleSave() {
    if (!propertyName.trim() || !providerName.trim()) {
      setError("Bitte Objektname und Wasserversorger ausfüllen!");
      return;
    }

    if (!user) {
      setError("Benutzer nicht authentifiziert!");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let pdfUrl = selectedContract?.contractPdfUrl;
      let pdfName = selectedContract?.contractPdfName;

      // Upload PDF if new file selected
      if (pdfFile) {
        setUploading(true);
        try {
          const fileName = `${Date.now()}_${pdfFile.name}`;
          const fileRef = ref(storage, `water-contracts/${fileName}`);
          
          console.log("Uploading PDF:", pdfFile.name, "Size:", pdfFile.size);
          await uploadBytes(fileRef, pdfFile);
          
          pdfUrl = await getDownloadURL(fileRef);
          pdfName = pdfFile.name;
          setUploading(false);

          // Delete old PDF if exists
          if (selectedContract?.contractPdfUrl) {
            try {
              const oldRef = ref(storage, selectedContract.contractPdfUrl);
              await deleteObject(oldRef);
            } catch (e) {
              console.error("Error deleting old PDF:", e);
            }
          }
        } catch (uploadError: any) {
          setUploading(false);
          const errorMsg = uploadError?.message || "PDF-Upload fehlgeschlagen";
          console.error("PDF Upload Error:", uploadError);
          setError(`PDF-Upload Fehler: ${errorMsg}`);
          setSaving(false);
          return;
        }
      }

      const data = {
        propertyName: propertyName.trim(),
        propertyAddress: propertyAddress.trim(),
        providerName: providerName.trim(),
        accountNumber: accountNumber.trim(),
        meterNumber: meterNumber.trim(),
        meterReading: meterReading.trim(),
        monthlyPayment: monthlyPayment.trim(),
        contractPdfUrl: pdfUrl,
        contractPdfName: pdfName,
        updatedAt: serverTimestamp(),
      };

      if (selectedContract) {
        await updateDoc(doc(db, "waterContracts", selectedContract.id), data);
      } else {
        await addDoc(collection(db, "waterContracts"), {
          ...data,
          createdAt: serverTimestamp(),
          createdByUid: user.uid,
          createdByName: getUserDisplayName(user.email || ""),
        });
      }

      resetForm();
      setSelectedContract(null);
    } catch (error: any) {
      console.error("Error saving contract:", error);
      const errorMsg = error?.message || "Fehler beim Speichern";
      setError(`Speicherfehler: ${errorMsg}`);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleDelete(contract: WaterContract) {
    if (!confirm(`Wasservertrag für "${contract.propertyName}" wirklich löschen?`)) {
      return;
    }

    try {
      // Delete PDF if exists
      if (contract.contractPdfUrl) {
        try {
          const fileRef = ref(storage, contract.contractPdfUrl);
          await deleteObject(fileRef);
        } catch (e) {
          console.error("Error deleting PDF:", e);
        }
      }

      await deleteDoc(doc(db, "waterContracts", contract.id));
      setSelectedContract(null);
      setIsEditing(false);
    } catch (error) {
      alert("Fehler beim Löschen!");
    }
  }

  function getNextPossibleCancellationDate(): string {
    const today = new Date();
    // Nächster möglicher Kündigungstag: 14 Tage von heute
    const cancellationDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    return cancellationDate.toLocaleDateString("de-DE");
  }

  function generateCancellationPdf(
    contract: WaterContract,
    providerName: string,
    providerStreet: string,
    providerCity: string
  ): void {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    // ===== KOPFZEILE (Header) =====
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const headerText = "AH Exzellent Immobilien GmbH · Heidenkampweg 46 · 20097 Hamburg";
    doc.text(headerText, margin, y);

    // Trennlinie
    y += 4;
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, pageWidth - margin, y);

    y += 8;

    // ===== OBEN RECHTS: Vertragskonto und Datum =====
    const rightX = pageWidth - margin - 70;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Vertragskonto", rightX, y);
    y += 5;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text(contract.accountNumber || "nicht angegeben", rightX, y);
    y += 10;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    const today = new Date();
    const dateStr = today.toLocaleDateString("de-DE", { 
      year: "numeric", 
      month: "2-digit", 
      day: "2-digit" 
    });
    doc.text(`Hamburg, ${dateStr}`, rightX, y);

    // ===== EMPFÄNGER (Links) =====
    y = 30;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.text(providerName || contract.providerName || "Wasserversorger", margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.text(providerStreet || "", margin, y);
    y += 4;
    doc.text(providerCity || "", margin, y);

    y += 25;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Kündigung", margin, y);

    // ===== ANREDE =====
    y += 10;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Sehr geehrte Damen und Herren,", margin, y);

    // ===== HAUPTTEXT =====
    y += 10;
    doc.setFontSize(11);
    const mainText = `hiermit kündigen wir unseren Wasserversorgungsvertrag fristgerecht zum nächstmöglichen Zeitpunkt.

Ich beantrage die sofortige Beendigung der automatischen Abbuchungen von meinem Bankkonto. Bitte senden Sie mir eine schriftliche Bestätigung über den Erhalt dieser Kündigung sowie ggf. eine Abschlussrechnung.`;
    const mainLines = doc.splitTextToSize(mainText, maxWidth);
    doc.text(mainLines, margin, y);

    // ===== VERTRAGSDATEN =====
    y += mainLines.length * 5.5 + 8;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Meine Vertragsdaten:", margin, y);

    y += 6;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    
    const addressLine = contract.propertyAddress || contract.propertyName;
    doc.text(`Liegenschaft: ${addressLine}`, margin + 2, y);
    y += 5;

    const kundennummer = contract.accountNumber || "(nicht angegeben)";
    doc.text(`Kundennummer: ${kundennummer}`, margin + 2, y);
    y += 5;

    if (contract.meterNumber) {
      doc.text(`Zählernummer: ${contract.meterNumber}`, margin + 2, y);
      y += 5;
    }

    // ===== SCHLUSSVERMERK =====
    y += 5;
    doc.setFontSize(10);
    const closingText = `Ich bitte Sie, mir eine schriftliche Bestätigung zur Kündigung zukommen zu lassen.`;
    const closingLines = doc.splitTextToSize(closingText, maxWidth);
    doc.text(closingLines, margin, y);

    // ===== GRUSSFORMEL =====
    y += closingLines.length * 5.5 + 8;
    doc.text("Mit freundlichen Grüßen,", margin, y);

    // ===== UNTERSCHRIFT =====
    y += 12;
    doc.text("_________________________________", margin, y);
    y += 4;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Dimitri Root", margin, y);
    y += 4;
    doc.setFont("Helvetica", "bold");
    doc.text("AH Exzellent Immobilien GmbH", margin, y);

    // Download PDF
    const fileName = `Kündigung_Wasser_${contract.propertyName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  const filteredContracts = contracts.filter(c =>
    c.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.meterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openCancellationModal(contract: WaterContract) {
    setCancellationProviderName(contract.providerName || "");
    setCancellationProviderStreet("Amerigo-Vespucci-Platz 2");
    setCancellationProviderCity("20457 Hamburg");
    setShowCancellationModal(true);
  }

  function handleConfirmCancellation() {
    if (!selectedContract) return;
    generateCancellationPdf(
      selectedContract,
      cancellationProviderName.trim(),
      cancellationProviderStreet.trim(),
      cancellationProviderCity.trim()
    );
    setShowCancellationModal(false);
  }

  if (!ready || loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        Lädt...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="rounded-[28px] surface p-6 mb-8">
        <button
          onClick={() => router.push('/immobilien')}
          className="mb-6 rounded-xl surface-2 px-4 py-2 text-sm muted hover:bg-white/5 transition flex items-center gap-2"
        >
          {t("contract.back")}
        </button>
        <div className="flex items-start gap-4">
          <div className="text-5xl">💧</div>
          <div>
            <h1 className="text-3xl font-bold">{t("wasserVertrag.title")}</h1>
            <p className="mt-2 text-sm muted">
              {t("wasserVertrag.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verträge Liste */}
        <div className="lg:col-span-1">
          <div className="rounded-[28px] surface p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{t("contract.myContracts")}</h2>
              <span className="px-3 py-1 rounded-full surface-2 text-xs font-semibold">
                {contracts.length}
              </span>
            </div>
            <p className="text-sm muted">{t("contract.selectNote")}</p>

            <input
              type="text"
              placeholder={t("search") || "Suchen..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input mb-2"
            />

            <button
              onClick={handleNew}
              className="w-full rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-green-700 hover:to-green-600 mb-4"
            >
              ➕ {t("contract.newContract")}
            </button>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredContracts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💧</div>
                  <div className="text-xs muted">{t("contract.noContracts")}</div>
                </div>
              ) : (
                filteredContracts.map((contract) => (
                  <button
                    key={contract.id}
                    onClick={() => {
                      setSelectedContract(contract);
                      setIsEditing(false);
                    }}
                    className={`w-full text-left rounded-xl p-4 transition border ${
                      selectedContract?.id === contract.id
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "surface-2 hover:bg-white/5"
                    }`}
                  >
                    <div className="font-semibold text-sm">{contract.propertyName}</div>
                    <div className="text-xs muted mt-1">{contract.providerName}</div>
                    {contract.monthlyPayment && (
                      <div className="text-sm text-emerald-500 font-medium mt-3">
                        💰 {parseFloat(contract.monthlyPayment).toFixed(2)} EUR/Monat
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Hauptbereich: Detail/Edit */}
        <div className="lg:col-span-2">
          {isEditing ? (
            // Edit Form
            <div className="rounded-[28px] surface p-6 space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  {selectedContract ? "Bearbeiten" : "Neuer Wasservertrag"}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-red-400">{error}</div>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Objekt */}
                <div>
                  <label className="text-xs text-white/60 font-medium">Objekt auswählen *</label>
                  <select
                    className="input mt-2"
                    value={selectedPropertyId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedPropertyId(id);
                      const selected = properties.find((p) => p.id === id);
                      const addr = selected?.address || "";
                      setPropertyName(addr);
                      setPropertyAddress(addr);
                    }}
                    disabled={propertiesLoading || properties.length === 0}
                  >
                    <option value="">Objekt auswählen</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address || "—"}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowNewProperty((v) => !v)}
                      className="rounded-lg border border-white/10 px-3 py-1 text-white/80 hover:text-white"
                    >
                      Neues Objekt hinzufügen
                    </button>
                    {propertiesLoading && (
                      <span className="text-white/50">Lädt Objekte…</span>
                    )}
                  </div>
                  {showNewProperty && (
                    <div className="mt-3 space-y-2">
                      <input
                        className="input"
                        value={newPropertyAddress}
                        onChange={(e) => setNewPropertyAddress(e.target.value)}
                        placeholder="Neue Adresse"
                      />
                      <button
                        type="button"
                        onClick={handleAddProperty}
                        disabled={savingProperty}
                        className="btn-accent px-4 py-2 text-xs font-semibold disabled:opacity-60"
                      >
                        {savingProperty ? t("common.pleaseWait") : "Objekt speichern"}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium">Adresse</label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPropertyAddress(value);
                      if (!selectedPropertyId) {
                        setPropertyName(value);
                      }
                    }}
                    placeholder="Vollständige Adresse"
                    className="input mt-2"
                  />
                </div>

                {/* Anbieter */}
                <div>
                  <label className="text-xs text-white/60 font-medium">Wasserversorger *</label>
                  <input
                    type="text"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="z.B. Stadtwerke"
                    className="input mt-2"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium">Vertragskonto-Nummer</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Kundennummer"
                    className="input mt-2"
                  />
                </div>

                {/* Zähler */}
                <div>
                  <label className="text-xs text-white/60 font-medium">Zähler-Nummer</label>
                  <input
                    type="text"
                    value={meterNumber}
                    onChange={(e) => setMeterNumber(e.target.value)}
                    placeholder="Zählernummer"
                    className="input mt-2"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium">Zählerstand (m³)</label>
                  <input
                    type="text"
                    value={meterReading}
                    onChange={(e) => setMeterReading(e.target.value)}
                    placeholder="z.B. 12345"
                    className="input mt-2"
                  />
                </div>

                {/* Kosten */}
                <div>
                  <label className="text-xs text-white/60 font-medium">Monatlicher Abschlag (EUR)</label>
                  <input
                    type="number"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="input mt-2"
                  />
                </div>

                {/* PDF */}
                <div>
                  <label className="text-xs text-white/60 font-medium">Vertrag (PDF)</label>
                  {selectedContract?.contractPdfUrl && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mt-2 mb-3">
                      <div className="text-2xl">📄</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {selectedContract.contractPdfName || "Vertrag.pdf"}
                        </div>
                        <div className="text-xs text-white/50">Aktueller Vertrag</div>
                      </div>
                      <a
                        href={selectedContract.contractPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap"
                      >
                        Öffnen
                      </a>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="input mt-2"
                  />
                  {pdfFile && (
                    <div className="mt-2 text-xs text-green-400">
                      ✓ {pdfFile.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-blue-600 disabled:opacity-50"
                >
                  {uploading ? "📤 Lade PDF..." : saving ? "💾 Speichert..." : "💾 Speichern"}
                </button>
                <button
                  onClick={resetForm}
                  disabled={saving || uploading}
                  className="rounded-xl bg-white/5 border border-white/10 px-6 py-3 text-sm text-white/70 hover:bg-white/10 transition disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : selectedContract ? (
            // Detail View
            <div className="rounded-[28px] surface p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">
                  {selectedContract.propertyName}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(selectedContract)}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition"
                  >
                    ✏️ Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      if (selectedContract) {
                        openCancellationModal(selectedContract);
                      }
                    }}
                    disabled={!selectedContract}
                    className="rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📄 Kündigung
                  </button>
                  <button
                    onClick={() => handleDelete(selectedContract)}
                    className="rounded-xl bg-red-600/20 border border-red-600/30 hover:bg-red-600/30 px-4 py-2 text-sm text-red-400 transition"
                  >
                    🗑️ Löschen
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Objektinfo */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
                    Objekt-Information
                  </h3>
                  <div className="space-y-3">
                    {selectedContract.propertyAddress && (
                      <div>
                        <div className="text-xs text-white/50">Adresse</div>
                        <div className="text-sm text-white mt-1">
                          {selectedContract.propertyAddress}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Anbieter */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
                    Wasserversorger
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-white/50">Provider</div>
                      <div className="text-sm text-white mt-1">
                        {selectedContract.providerName}
                      </div>
                    </div>
                    {selectedContract.accountNumber && (
                      <div>
                        <div className="text-xs text-white/50">Vertragskonto</div>
                        <div className="text-sm text-white/70 mt-1 font-mono">
                          {selectedContract.accountNumber}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Zähler */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
                    Zähler-Information
                  </h3>
                  <div className="space-y-3">
                    {selectedContract.meterNumber && (
                      <div>
                        <div className="text-xs text-white/50">Zähler-Nr</div>
                        <div className="text-sm text-white/70 mt-1 font-mono">
                          {selectedContract.meterNumber}
                        </div>
                      </div>
                    )}
                    {selectedContract.meterReading && (
                      <div>
                        <div className="text-xs text-white/50">Zählerstand</div>
                        <div className="text-sm text-white mt-1">
                          {selectedContract.meterReading} <span className="text-white/60">m³</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kosten */}
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 p-4">
                  <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
                    Kosten
                  </h3>
                  <div className="space-y-3">
                    {selectedContract.monthlyPayment && (
                      <div>
                        <div className="text-xs text-white/50">Monatlicher Abschlag</div>
                        <div className="text-2xl font-bold text-cyan-400 mt-2">
                          {parseFloat(selectedContract.monthlyPayment).toFixed(2)} EUR
                        </div>
                        <div className="text-xs text-white/50 mt-3">
                          Jährlich: {(parseFloat(selectedContract.monthlyPayment) * 12).toFixed(2)} EUR
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vertrag PDF */}
              {selectedContract.contractPdfUrl && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Vertrag</h3>
                  <a
                    href={selectedContract.contractPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="text-2xl">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">
                        {selectedContract.contractPdfName || "Vertrag.pdf"}
                      </div>
                      <div className="text-xs text-white/50">PDF-Dokument</div>
                    </div>
                    <div className="text-blue-400">↗</div>
                  </a>
                </div>
              )}

              {/* Meta */}
              <div className="text-xs text-white/40 pt-4 border-t border-white/10">
                Erstellt von: <span className="text-white/60">{selectedContract.createdByName}</span>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="rounded-[28px] surface p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-6xl mb-4">💧</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Wählen Sie einen Vertrag aus
              </h3>
              <p className="text-sm text-white/50 mb-6">
                oder erstellen Sie einen neuen Vertrag
              </p>
              <button
                onClick={handleNew}
                className="rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-green-700 hover:to-green-600"
              >
                ➕ Neuer Vertrag
              </button>
            </div>
          )}
        </div>
      </div>

      {showCancellationModal && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl surface border border-white/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Anbieter prüfen</h3>
                <p className="mt-1 text-sm text-white/60">
                  Bitte Anbietername und Adresse bestätigen, bevor die Kündigung erstellt wird.
                </p>
              </div>
              <button
                onClick={() => setShowCancellationModal(false)}
                className="text-white/60 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs text-white/60 font-medium">Anbietername</label>
                <input
                  type="text"
                  value={cancellationProviderName}
                  onChange={(e) => setCancellationProviderName(e.target.value)}
                  className="input mt-2"
                  placeholder="z.B. Hamburg Wasser"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 font-medium">Straße & Hausnummer</label>
                <input
                  type="text"
                  value={cancellationProviderStreet}
                  onChange={(e) => setCancellationProviderStreet(e.target.value)}
                  className="input mt-2"
                  placeholder="z.B. Musterstraße 1"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 font-medium">PLZ & Ort</label>
                <input
                  type="text"
                  value={cancellationProviderCity}
                  onChange={(e) => setCancellationProviderCity(e.target.value)}
                  className="input mt-2"
                  placeholder="z.B. 20097 Hamburg"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCancellationModal(false)}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmCancellation}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition"
              >
                📄 Kündigung erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

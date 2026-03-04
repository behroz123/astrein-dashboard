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

type ElectricityContract = {
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

export default function StromVertragPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [contracts, setContracts] = useState<ElectricityContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<ElectricityContract | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
    // Extract name if stored as "Firstname Lastname"
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
    const q = query(collection(db, "electricityContracts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ElectricityContract[] = snap.docs.map((d) => ({
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

  function handleEdit(contract: ElectricityContract) {
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
      setError("Bitte Objektname und Stromanbieter ausfüllen!");
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
          const fileRef = ref(storage, `electricity-contracts/${fileName}`);
          
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
        await updateDoc(doc(db, "electricityContracts", selectedContract.id), data);
      } else {
        await addDoc(collection(db, "electricityContracts"), {
          ...data,
          createdAt: serverTimestamp(),
          createdByUid: user.uid,
          createdByName: getUserDisplayName(user.email || ""),
        });
      }

      resetForm();
      setSelectedContract(null);
    } catch (error: any) {
      const errorMsg = error?.message || "Fehler beim Speichern";
      setError(`Speicherfehler: ${errorMsg}`);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleDelete(contract: ElectricityContract) {
    if (!confirm(`Stromvertrag für "${contract.propertyName}" wirklich löschen?`)) {
      return;
    }

    try {
      if (contract.contractPdfUrl) {
        try {
          const fileRef = ref(storage, contract.contractPdfUrl);
          await deleteObject(fileRef);
        } catch (e) {
          console.error("Error deleting PDF:", e);
        }
      }

      await deleteDoc(doc(db, "electricityContracts", contract.id));
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

  function generateCancellationPdf(contract: ElectricityContract): void {
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

    y += 10;

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
    doc.text(contract.providerName || "Stromanbieter", margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.text("Amerigo-Vespucci-Platz 2", margin, y);
    y += 4;
    doc.text("20457 Hamburg", margin, y);

    y += 25;

    // ===== BETREFF =====
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
    const mainText = `hiermit kündigen wir unseren Stromversorgungsvertrag fristgerecht zum nächstmöglichen Zeitpunkt.

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
    const fileName = `Kündigung_Strom_${contract.propertyName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  const filteredContracts = contracts.filter(c =>
    c.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.meterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="text-5xl">⚡</div>
          <div>
            <h1 className="text-3xl font-bold">{t("stromVertrag.title")}</h1>
            <p className="mt-2 text-sm muted">
              {t("stromVertrag.subtitle")}
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
            className="w-full rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-4 py-3 text-sm font-semibold text-white transition shadow-lg"
          >
            ➕ {t("contract.newContract")}
          </button>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredContracts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">⚡</div>
                <div className="text-sm muted">{t("contract.noContracts")}</div>
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
              <h2 className="text-2xl font-semibold">
                {selectedContract ? "Bearbeiten" : "Neuer Stromvertrag"}
              </h2>
              <button
                onClick={resetForm}
                className="muted hover:opacity-80 text-2xl"
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
                <label className="text-xs muted font-medium">Objekt auswählen *</label>
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
                <label className="text-xs muted font-medium">Adresse</label>
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
                <label className="text-xs muted font-medium">Stromanbieter *</label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="z.B. Stadtwerke"
                  className="input mt-2"
                />
              </div>

              <div>
                <label className="text-xs muted font-medium">Vertragskonto-Nummer</label>
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
                <label className="text-xs muted font-medium">Zähler-Nummer</label>
                <input
                  type="text"
                  value={meterNumber}
                  onChange={(e) => setMeterNumber(e.target.value)}
                  placeholder="Zählernummer"
                  className="input mt-2"
                />
              </div>

              <div>
                <label className="text-xs muted font-medium">Zählerstand (kWh)</label>
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
                <label className="text-xs muted font-medium">Monatlicher Abschlag (EUR)</label>
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
                <label className="text-xs muted font-medium">Vertrag (PDF)</label>
                {selectedContract?.contractPdfUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mt-2 mb-3">
                    <div className="text-2xl">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        {selectedContract.contractPdfName || "Vertrag.pdf"}
                      </div>
                      <div className="text-xs muted">Aktueller Vertrag</div>
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
                className="rounded-xl surface-2 px-6 py-3 text-sm muted hover:bg-white/5 transition disabled:opacity-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : selectedContract ? (
          // Detail View
          <div className="rounded-[28px] surface p-8 space-y-8">
            {/* Header mit Buttons */}
            <div>
              <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {selectedContract.propertyName}
                  </h2>
                  <p className="text-base muted">
                    {selectedContract.providerName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(selectedContract)}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition"
                  >
                    ✏️ {t("contract.edit")}
                  </button>
                  <button
                    onClick={() => {
                      if (selectedContract) {
                        generateCancellationPdf(selectedContract);
                      }
                    }}
                    disabled={!selectedContract}
                    className="rounded-lg bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📄 {t("contract.cancellation")}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedContract)}
                    className="rounded-lg bg-red-600/20 border border-red-600/30 hover:bg-red-600/30 px-4 py-2 text-sm text-red-500 transition"
                  >
                    🗑️ {t("contract.delete")}
                  </button>
                </div>
              </div>
            </div>

            {/* Kosten - Highlight */}
            {selectedContract.monthlyPayment && (
              <div className="rounded-2xl surface-2 accent-ring p-6">
                <div className="text-sm font-semibold muted mb-2">{t("contract.monthlyPayment")}</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-bold text-emerald-500">
                    {parseFloat(selectedContract.monthlyPayment).toFixed(2)}
                  </div>
                  <div className="text-lg muted">EUR/{t("moveins") === "Einzüge" ? "Monat" : "month"}</div>
                </div>
                <div className="text-sm muted mt-3">
                  {t("contract.annualPayment")}: <span className="font-semibold">{(parseFloat(selectedContract.monthlyPayment) * 12).toFixed(2)} EUR</span>
                </div>
              </div>
            )}

            {/* Daten Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Objekt */}
              <div className="rounded-2xl surface-2 p-5">
                <h3 className="text-xs font-bold muted mb-4 uppercase tracking-widest">📍 {t("contract.object")}</h3>
                <div className="space-y-4">
                  {selectedContract.propertyAddress && (
                    <div>
                      <div className="text-xs muted font-medium mb-1">{t("contract.address")}</div>
                      <div className="text-sm leading-relaxed">
                        {selectedContract.propertyAddress}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Zähler */}
              <div className="rounded-2xl surface-2 p-5">
                <h3 className="text-xs font-bold muted mb-4 uppercase tracking-widest">📊 {t("contract.meter")}</h3>
                <div className="space-y-4">
                  {selectedContract.meterNumber && (
                    <div>
                      <div className="text-xs muted font-medium mb-1">{t("contract.meterNumber")}</div>
                      <div className="text-sm font-mono">
                        {selectedContract.meterNumber}
                      </div>
                    </div>
                  )}
                  {selectedContract.meterReading && (
                    <div>
                      <div className="text-xs muted font-medium mb-1">{t("contract.meterReading")}</div>
                      <div className="text-lg font-semibold">
                        {selectedContract.meterReading} <span className="text-sm muted font-normal">kWh</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Anbieter */}
              <div className="rounded-2xl surface-2 p-5">
                <h3 className="text-xs font-bold muted mb-4 uppercase tracking-widest">🏢 {t("contract.provider")}</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs muted font-medium mb-1">{t("contract.provider")}</div>
                    <div className="text-sm font-semibold">
                      {selectedContract.providerName}
                    </div>
                  </div>
                  {selectedContract.accountNumber && (
                    <div>
                      <div className="text-xs muted font-medium mb-1">{t("contract.accountNumber")}</div>
                      <div className="text-sm font-mono">
                        {selectedContract.accountNumber}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Vertrag PDF */}
              {selectedContract.contractPdfUrl && (
                <div className="rounded-2xl surface-2 p-5">
                  <h3 className="text-xs font-bold muted mb-4 uppercase tracking-widest">📄 {t("contract.document")}</h3>
                  <a
                    href={selectedContract.contractPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg surface-2 hover:bg-white/5 transition"
                  >
                    <div className="text-2xl">📑</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {selectedContract.contractPdfName || "Vertrag.pdf"}
                      </div>
                      <div className="text-xs muted">{t("contract.pdfDocument")}</div>
                    </div>
                    <div className="text-lg">↗</div>
                  </a>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="pt-6 border-t border-white/10">
              <div className="text-xs muted">
                {t("contract.createdBy")}: <span className="font-medium">{selectedContract.createdByName}</span>
              </div>
            </div>
          </div>
        ) : (
          // Empty State
          <div className="rounded-[28px] surface p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
            <div className="text-7xl mb-6">⚡</div>
            <h3 className="text-2xl font-bold mb-3">
              {t("contract.selectNote")}
            </h3>
            <p className="text-base muted mb-8 max-w-sm">
              {t("contract.myContracts")} - {t("contract.noContracts")}
            </p>
            <button
              onClick={handleNew}
              className="rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-6 py-3 text-sm font-semibold text-white transition shadow-lg"
            >
              ➕ {t("contract.newContract")}
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

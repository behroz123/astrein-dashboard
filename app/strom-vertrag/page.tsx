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

export default function StromVertragPage() {
  const router = useRouter();
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

  function resetForm() {
    setPropertyName("");
    setPropertyAddress("");
    setProviderName("");
    setAccountNumber("");
    setMeterNumber("");
    setMeterReading("");
    setMonthlyPayment("");
    setPdfFile(null);
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
    setIsEditing(true);
    setError(null);
  }

  function handleNew() {
    resetForm();
    setSelectedContract(null);
    setIsEditing(true);
    setError(null);
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
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    let y = 15;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Kündigungsschreiben", 15, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Stromversorgungsvertrag", 15, y);

    y += 15;

    // Absender
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("AH Exzellent Immobilien GmbH", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Heidenkampweg 46", 15, y);
    y += 5;
    doc.text("20097 Hamburg", 15, y);

    y += 15;

    // Kündigung Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Kündigungsschreiben für Stromversorgung", 15, y);

    y += 12;

    // Vertragsdaten
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Sehr geehrte Damen und Herren,", 15, y);

    y += 10;

    const cancellationDate = getNextPossibleCancellationDate();
    const letterText = `hiermit kündigen wir unseren Stromversorgungsvertrag mit den folgenden Daten zum nächstmöglichen Zeitpunkt, spätestens zum ${cancellationDate}:`;
    const letterLines = doc.splitTextToSize(letterText, 180);
    doc.text(letterLines, 15, y);
    y += letterLines.length * 5 + 10;

    // Kontodaten
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Vertragsdaten:", 15, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Anlagenstelle / Adresse: ${contract.propertyName}`, 15, y);
    y += 6;
    if (contract.propertyAddress) {
      doc.text(`${contract.propertyAddress}`, 15, y);
      y += 6;
    }
    doc.text(`Stromversorger: ${contract.providerName}`, 15, y);
    y += 6;
    if (contract.accountNumber) {
      doc.text(`Vertragskontonnummer: ${contract.accountNumber}`, 15, y);
      y += 6;
    }
    if (contract.meterNumber) {
      doc.text(`Zählernummer: ${contract.meterNumber}`, 15, y);
      y += 6;
    }

    y += 8;

    // Schluss
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const closingText = `Bitte bestätigen Sie den Erhalt dieser Kündigung schriftlich. Wir bitten, alle offenen Rechnungen vor dem Kündigungsdatum auszugleichen.`;
    const closingLines = doc.splitTextToSize(closingText, 180);
    doc.text(closingLines, 15, y);
    y += closingLines.length * 5 + 12;

    doc.text("Mit freundlichen Grüßen,", 15, y);
    y += 15;

    doc.setFont("helvetica", "bold");
    doc.text("AH Exzellent Immobilien GmbH", 15, y);

    // Footer
    y = height - 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Kündigungsdatum: ${new Date().toLocaleDateString("de-DE")}`, width / 2, y, { align: "center" });

    // Download PDF
    const fileName = `Kündigung_${contract.providerName}_${contract.propertyName}_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  const filteredContracts = contracts.filter(c =>
    c.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.providerName.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/immobilien')}
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
          >
            ← Zurück zu Immobilien
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Stromverträge</h1>
          <div className="mt-1 text-sm muted">
            Alle Stromverträge und Zählerinformationen verwalten
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Verträge Liste */}
      <div className="lg:col-span-1 space-y-4">
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Verträge</h2>
            <span className="px-2 py-1 rounded-full bg-white/10 text-xs text-white/70">
              {contracts.length}
            </span>
          </div>

          <input
            type="text"
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input mb-4"
          />

          <button
            onClick={handleNew}
            className="w-full rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-green-700 hover:to-green-600 mb-4"
          >
            ➕ Neuer Vertrag
          </button>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredContracts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">⚡</div>
                <div className="text-xs text-white/50">Keine Verträge</div>
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <button
                  key={contract.id}
                  onClick={() => {
                    setSelectedContract(contract);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left rounded-xl p-3 transition ${
                    selectedContract?.id === contract.id
                      ? "bg-blue-500/20 border border-blue-500/30"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="font-semibold text-white text-sm truncate">
                    {contract.propertyName}
                  </div>
                  <div className="text-xs text-white/50 truncate mt-1">
                    {contract.providerName}
                  </div>
                  {contract.monthlyPayment && (
                    <div className="text-xs text-green-400 font-medium mt-2">
                      {parseFloat(contract.monthlyPayment).toFixed(2)} EUR/Mo.
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
                {selectedContract ? "Bearbeiten" : "Neuer Stromvertrag"}
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
                <label className="text-xs text-white/60 font-medium">Objektname *</label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="z.B. Wohnung 1A"
                  className="input mt-2"
                />
              </div>

              <div>
                <label className="text-xs text-white/60 font-medium">Adresse</label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="Vollständige Adresse"
                  className="input mt-2"
                />
              </div>

              {/* Anbieter */}
              <div>
                <label className="text-xs text-white/60 font-medium">Stromanbieter *</label>
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
                <label className="text-xs text-white/60 font-medium">Zählerstand (kWh)</label>
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
                  onClick={() => generateCancellationPdf(selectedContract)}
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition"
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
                  Stromanbieter
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
                        {selectedContract.meterReading} <span className="text-white/60">kWh</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Kosten */}
              <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 p-4">
                <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
                  Kosten
                </h3>
                <div className="space-y-3">
                  {selectedContract.monthlyPayment && (
                    <div>
                      <div className="text-xs text-white/50">Monatlicher Abschlag</div>
                      <div className="text-2xl font-bold text-green-400 mt-2">
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
            <div className="text-6xl mb-4">⚡</div>
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
    </div>
  );
}

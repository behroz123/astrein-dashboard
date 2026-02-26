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

export default function WasserVertragPage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [ready, setReady] = useState(false);
  const [contracts, setContracts] = useState<WaterContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<WaterContract | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [providerName, setProviderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [meterReading, setMeterReading] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

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

  function resetForm() {
    setPropertyName("");
    setPropertyAddress("");
    setProviderName("");
    setAccountNumber("");
    setMeterNumber("");
    setMeterReading("");
    setMonthlyPayment("");
    setPdfFile(null);
    setSelectedContract(null);
    setShowForm(false);
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
    setShowForm(true);
  }

  function handleNewContract() {
    resetForm();
    setShowForm(true);
  }

  async function handleSave() {
    if (!propertyName.trim() || !providerName.trim()) {
      setError("Bitte Objektname und Wasserversorger ausfüllen!");
      return;
    }

    const user = auth.currentUser;
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
          createdByName: user.displayName || user.email || "Unbekannt",
        });
      }

      resetForm();
      setError(null);
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
    } catch (error) {
      console.error("Error deleting contract:", error);
      alert("Fehler beim Löschen!");
    }
  }

  if (!ready || loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        Lädt...
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {selectedContract ? "Wasservertrag bearbeiten" : "Neuer Wasservertrag"}
              </h1>
              <div className="mt-1 text-sm muted">
                {selectedContract ? "Vertragsdaten aktualisieren" : "Neuen Vertrag anlegen"}
              </div>
            </div>
            <button
              onClick={resetForm}
              className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
            >
              Abbrechen
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-[28px] surface p-4 bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <div className="text-sm font-semibold text-red-400">{error}</div>
                <div className="text-xs text-red-300/70 mt-1">
                  Bitte überprüfe deine Firebase Storage Rules oder versuch es später erneut.
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="rounded-[28px] surface p-6">
          <div className="space-y-6">
            {/* Objekt-Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Objekt-Informationen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60">Objektname / Wohnung *</label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="z.B. Wohnung 1A, Hauptstraße"
                    className="input mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Adresse</label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="Vollständige Adresse"
                    className="input mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Vertrags-Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Vertrags-Informationen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60">Wasserversorger *</label>
                  <input
                    type="text"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="z.B. Stadtwerke, Wasserwerke"
                    className="input mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Vertragskonto-Nummer</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Kundennummer / Vertragskonto"
                    className="input mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Zähler-Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Zähler-Informationen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60">Zähler-Nummer</label>
                  <input
                    type="text"
                    value={meterNumber}
                    onChange={(e) => setMeterNumber(e.target.value)}
                    placeholder="Zählernummer"
                    className="input mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Aktueller Zähler-Stand (m³)</label>
                  <input
                    type="text"
                    value={meterReading}
                    onChange={(e) => setMeterReading(e.target.value)}
                    placeholder="z.B. 12345"
                    className="input mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Kosten */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Kosten-Übersicht</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60">Monatlicher Abschlag (EUR)</label>
                  <input
                    type="number"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="input mt-2"
                  />
                </div>
              </div>
            </div>

            {/* PDF Upload */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Vertrag (PDF)</h3>
              <div className="space-y-3">
                {selectedContract?.contractPdfUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
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
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Öffnen
                    </a>
                  </div>
                )}
                <div>
                  <label className="text-xs text-white/60">
                    {selectedContract?.contractPdfUrl ? "Neues PDF hochladen" : "PDF hochladen"}
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="input mt-2"
                  />
                  {pdfFile && (
                    <div className="mt-2 text-xs text-green-400">
                      ✓ {pdfFile.name} ausgewählt
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-blue-600 disabled:opacity-50"
              >
                {saving || uploading
                  ? uploading
                    ? "📤 Lade PDF hoch..."
                    : "💾 Speichert..."
                  : selectedContract
                  ? "💾 Änderungen speichern"
                  : "➕ Vertrag anlegen"}
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Wasserverträge</h1>
            <div className="mt-1 text-sm muted">
              Alle Wasserverträge und Zählerinformationen verwalten
            </div>
          </div>
          <button
            onClick={handleNewContract}
            className="rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-green-700 hover:to-green-600"
          >
            ➕ Neuer Vertrag
          </button>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-[28px] surface p-12 text-center">
          <div className="text-4xl mb-4">💧</div>
          <div className="text-lg text-white/80 mb-2">Noch keine Wasserverträge</div>
          <div className="text-sm text-white/50">
            Klicken Sie auf "Neuer Vertrag" um zu beginnen
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="rounded-[28px] surface p-6 hover:bg-white/[0.08] transition cursor-pointer"
              onClick={() => handleEdit(contract)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="text-lg font-semibold text-white mb-1">
                    {contract.propertyName}
                  </div>
                  {contract.propertyAddress && (
                    <div className="text-xs text-white/50">{contract.propertyAddress}</div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(contract);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs ml-2"
                >
                  🗑️
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/50">Versorger:</span>
                  <span className="text-white font-medium">{contract.providerName}</span>
                </div>

                {contract.accountNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">Vertragskonto:</span>
                    <span className="text-white/70">{contract.accountNumber}</span>
                  </div>
                )}

                {contract.meterNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">Zähler-Nr:</span>
                    <span className="text-white/70">{contract.meterNumber}</span>
                  </div>
                )}

                {contract.meterReading && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">Zählerstand:</span>
                    <span className="text-white/70">{contract.meterReading} m³</span>
                  </div>
                )}

                {contract.monthlyPayment && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">Monatlich:</span>
                    <span className="text-green-400 font-semibold">
                      {parseFloat(contract.monthlyPayment).toFixed(2)} EUR
                    </span>
                  </div>
                )}

                {contract.contractPdfUrl && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-blue-400">📄 Vertrag vorhanden</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
                Erstellt: {contract.createdByName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

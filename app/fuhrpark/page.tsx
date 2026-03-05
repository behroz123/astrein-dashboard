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

type Vehicle = {
  id: string;
  kennzeichen: string;
  fin: string;
  modell: string;
  fahrzeugName: string;
  kilometerstand?: string;
  letzterService?: string;
  versicherungsnummer?: string;
  versicherungsname?: string;
  fahrerName: string;
  fahrerVorname: string;
  fahrerGeburtsdatum: string;
  fahrerAdresse: string;
  fahrerPhotoUrl?: string;
  fahrerPhotoName?: string;
  fuehrerscheinUrl?: string;
  fuehrerscheinName?: string;
  createdAt: any;
  createdByUid: string;
  createdByName: string;
  updatedAt?: any;
};

export default function FuhrparkPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModell, setFilterModell] = useState("");
  const [sortBy, setSortBy] = useState<"kennzeichen" | "modell" | "service">("kennzeichen");

  // Form fields
  const [kennzeichen, setKennzeichen] = useState("");
  const [fin, setFin] = useState("");
  const [modell, setModell] = useState("");
  const [fahrzeugName, setFahrzeugName] = useState("");
  const [kilometerstand, setKilometerstand] = useState("");
  const [letzterService, setLetzterService] = useState("");
  const [versicherungsnummer, setVersicherungsnummer] = useState("");
  const [versicherungsname, setVersicherungsname] = useState("");
  const [fahrerName, setFahrerName] = useState("");
  const [fahrerVorname, setFahrerVorname] = useState("");
  const [fahrerGeburtsdatum, setFahrerGeburtsdatum] = useState("");
  const [fahrerAdresse, setFahrerAdresse] = useState("");
  const [fahrerPhotoFile, setFahrerPhotoFile] = useState<File | null>(null);
  const [fuehrerscheinFile, setFuehrerscheinFile] = useState<File | null>(null);

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
    const q = query(collection(db, "vehicles"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Vehicle[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setVehicles(list);
        setLoading(false);
      },
      () => {
        setVehicles([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [ready]);

  function resetForm() {
    setKennzeichen("");
    setFin("");
    setModell("");
    setFahrzeugName("");
    setKilometerstand("");
    setLetzterService("");
    setVersicherungsnummer("");
    setVersicherungsname("");
    setFahrerName("");
    setFahrerVorname("");
    setFahrerGeburtsdatum("");
    setFahrerAdresse("");
    setFahrerPhotoFile(null);
    setFuehrerscheinFile(null);
    setSelectedVehicle(null);
    setIsEditing(false);
    setError(null);
  }

  function handleEdit(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setKennzeichen(vehicle.kennzeichen || "");
    setFin(vehicle.fin || "");
    setModell(vehicle.modell || "");
    setFahrzeugName(vehicle.fahrzeugName || "");
    setKilometerstand(vehicle.kilometerstand || "");
    setLetzterService(vehicle.letzterService || "");
    setVersicherungsnummer(vehicle.versicherungsnummer || "");
    setVersicherungsname(vehicle.versicherungsname || "");
    setFahrerName(vehicle.fahrerName || "");
    setFahrerVorname(vehicle.fahrerVorname || "");
    setFahrerGeburtsdatum(vehicle.fahrerGeburtsdatum || "");
    setFahrerAdresse(vehicle.fahrerAdresse || "");
    setIsEditing(true);
    setError(null);
  }

  function handleNew() {
    resetForm();
    setSelectedVehicle(null);
    setIsEditing(true);
    setError(null);
  }

  async function handleSave() {
    if (!kennzeichen.trim() || !modell.trim() || !fahrerName.trim()) {
      setError("Bitte Kennzeichen, Modell und Fahrername ausfüllen!");
      return;
    }

    if (!user) {
      setError("Benutzer nicht authentifiziert!");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let fuehrerscheinUrl = selectedVehicle?.fuehrerscheinUrl;
      let fuehrerscheinName = selectedVehicle?.fuehrerscheinName;
      let fahrerPhotoUrl = selectedVehicle?.fahrerPhotoUrl;
      let fahrerPhotoName = selectedVehicle?.fahrerPhotoName;

      // Upload Führerschein if new file selected
      if (fuehrerscheinFile) {
        setUploading(true);
        try {
          const fileName = `${Date.now()}_${fuehrerscheinFile.name}`;
          const fileRef = ref(storage, `fuehrerscheine/${fileName}`);
          
          await uploadBytes(fileRef, fuehrerscheinFile);
          fuehrerscheinUrl = await getDownloadURL(fileRef);
          fuehrerscheinName = fuehrerscheinFile.name;

          // Delete old file if exists
          if (selectedVehicle?.fuehrerscheinUrl) {
            try {
              const oldRef = ref(storage, selectedVehicle.fuehrerscheinUrl);
              await deleteObject(oldRef);
            } catch (e) {
              console.error("Error deleting old Führerschein:", e);
            }
          }
        } catch (uploadError: any) {
          setUploading(false);
          setError(`Führerschein-Upload Fehler: ${uploadError?.message || "Unbekannt"}`);
          setSaving(false);
          return;
        }
      }

      // Upload Fahrer Photo if new file selected
      if (fahrerPhotoFile) {
        setUploading(true);
        try {
          const fileName = `${Date.now()}_${fahrerPhotoFile.name}`;
          const fileRef = ref(storage, `fahrer-photos/${fileName}`);
          
          await uploadBytes(fileRef, fahrerPhotoFile);
          fahrerPhotoUrl = await getDownloadURL(fileRef);
          fahrerPhotoName = fahrerPhotoFile.name;

          // Delete old file if exists
          if (selectedVehicle?.fahrerPhotoUrl) {
            try {
              const oldRef = ref(storage, selectedVehicle.fahrerPhotoUrl);
              await deleteObject(oldRef);
            } catch (e) {
              console.error("Error deleting old Fahrer Photo:", e);
            }
          }
        } catch (uploadError: any) {
          setUploading(false);
          setError(`Fahrer-Foto Upload Fehler: ${uploadError?.message || "Unbekannt"}`);
          setSaving(false);
          return;
        }
      }

      setUploading(false);

      const data = {
        kennzeichen: kennzeichen.trim(),
        fin: fin.trim(),
        modell: modell.trim(),
        fahrzeugName: fahrzeugName.trim(),
        kilometerstand: kilometerstand.trim(),
        letzterService: letzterService.trim(),
        versicherungsnummer: versicherungsnummer.trim(),
        versicherungsname: versicherungsname.trim(),
        fahrerName: fahrerName.trim(),
        fahrerVorname: fahrerVorname.trim(),
        fahrerGeburtsdatum: fahrerGeburtsdatum.trim(),
        fahrerAdresse: fahrerAdresse.trim(),
        fahrerPhotoUrl,
        fahrerPhotoName,
        fuehrerscheinUrl,
        fuehrerscheinName,
        updatedAt: serverTimestamp(),
      };

      if (selectedVehicle) {
        await updateDoc(doc(db, "vehicles", selectedVehicle.id), data);
      } else {
        await addDoc(collection(db, "vehicles"), {
          ...data,
          createdAt: serverTimestamp(),
          createdByUid: user.uid,
          createdByName: getUserDisplayName(user.email || ""),
        });
      }

      // Reset form and close edit view
      resetForm();
      setSelectedVehicle(null);
      setIsEditing(false);
    } catch (error: any) {
      const errorMsg = error?.message || "Fehler beim Speichern";
      setError(`Speicherfehler: ${errorMsg}`);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleDelete(vehicle: Vehicle) {
    if (!confirm(`Fahrzeug "${vehicle.kennzeichen}" wirklich löschen?`)) {
      return;
    }

    try {
      if (vehicle.fuehrerscheinUrl) {
        try {
          const fileRef = ref(storage, vehicle.fuehrerscheinUrl);
          await deleteObject(fileRef);
        } catch (e) {
          console.error("Error deleting Führerschein:", e);
        }
      }

      if (vehicle.fahrerPhotoUrl) {
        try {
          const fileRef = ref(storage, vehicle.fahrerPhotoUrl);
          await deleteObject(fileRef);
        } catch (e) {
          console.error("Error deleting Fahrer Photo:", e);
        }
      }

      await deleteDoc(doc(db, "vehicles", vehicle.id));
      setSelectedVehicle(null);
      setIsEditing(false);
    } catch (error) {
      alert("Fehler beim Löschen!");
    }
  }

  // Get unique models for filter
  const uniqueModels = Array.from(new Set(vehicles.map(v => v.modell))).sort();

  const filteredVehicles = vehicles
    .filter(v => {
      const matchesSearch = 
        v.kennzeichen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modell.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.fahrzeugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.fahrerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesModell = !filterModell || v.modell === filterModell;
      
      return matchesSearch && matchesModell;
    })
    .sort((a, b) => {
      if (sortBy === "kennzeichen") return a.kennzeichen.localeCompare(b.kennzeichen);
      if (sortBy === "modell") return a.modell.localeCompare(b.modell);
      if (sortBy === "service") {
        const dateA = a.letzterService ? new Date(a.letzterService).getTime() : 0;
        const dateB = b.letzterService ? new Date(b.letzterService).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

  if (!ready || loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        Lädt...
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Modern Header */}
      <div className="mb-10">
        <button
          onClick={() => router.push('/')}
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
          Fuhrpark
        </div>
        <div className="flex items-start gap-4 mb-3">
          <div className="text-5xl">🚗</div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: "rgb(var(--foreground))" }}>
              Fuhrparkverwaltung
            </h1>
            <p className="mt-2 text-lg opacity-60">
              Verwalten Sie alle Firmenfahrzeuge, Fahrer und Dokumente
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
      {/* Filter Bar */}
      <div className="rounded-[28px] surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterModell}
            onChange={(e) => setFilterModell(e.target.value)}
            className="input flex-shrink-0"
            style={{ minWidth: '150px' }}
          >
            <option value="">Alle Modelle</option>
            {uniqueModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input flex-shrink-0"
            style={{ minWidth: '150px' }}
          >
            <option value="kennzeichen">Nach Kennzeichen</option>
            <option value="modell">Nach Modell</option>
            <option value="service">Nach Service-Datum</option>
          </select>
          
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm muted">
              {filteredVehicles.length} von {vehicles.length} Fahrzeuge
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Fahrzeuge Liste */}
      <div className="lg:col-span-1">
        <div className="rounded-[28px] surface p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Fahrzeuge</h2>
            <span className="px-3 py-1 rounded-full surface-2 text-xs font-semibold">
              {vehicles.length}
            </span>
          </div>
          <p className="text-sm muted">Firmenfahrzeuge verwalten</p>

          <input
            type="text"
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input mb-2"
          />

          <button
            onClick={handleNew}
            className="w-full rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-4 py-3 text-sm font-semibold text-white transition shadow-lg"
          >
            ➕ Neues Fahrzeug
          </button>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🚗</div>
                <div className="text-sm muted">Keine Fahrzeuge</div>
              </div>
            ) : (
              filteredVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => {
                    setSelectedVehicle(vehicle);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left rounded-xl p-4 transition border ${
                    selectedVehicle?.id === vehicle.id
                      ? "bg-blue-500/10 border-blue-500/30"
                      : "surface-2 hover:bg-white/5"
                  }`}
                >
                  <div className="font-semibold text-sm">{vehicle.kennzeichen}</div>
                  <div className="text-xs muted mt-1">{vehicle.modell}</div>
                  <div className="text-xs muted mt-1">👤 {vehicle.fahrerVorname} {vehicle.fahrerName}</div>
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
                {selectedVehicle ? "Fahrzeug bearbeiten" : "Neues Fahrzeug"}
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
              {/* Fahrzeugdaten */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Fahrzeugdaten</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs muted">Kennzeichen *</label>
                    <input
                      type="text"
                      value={kennzeichen}
                      onChange={(e) => setKennzeichen(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. HH-AB 1234"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Fahrzeugidentifikationsnummer (FIN)</label>
                    <input
                      type="text"
                      value={fin}
                      onChange={(e) => setFin(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. WBA12345678901234"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Modell *</label>
                    <input
                      type="text"
                      value={modell}
                      onChange={(e) => setModell(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. Mercedes Sprinter"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Fahrzeugname</label>
                    <input
                      type="text"
                      value={fahrzeugName}
                      onChange={(e) => setFahrzeugName(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. Lieferwagen 1"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Kilometerstand</label>
                    <input
                      type="text"
                      value={kilometerstand}
                      onChange={(e) => setKilometerstand(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. 45000 km"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Letzter Service</label>
                    <input
                      type="date"
                      value={letzterService}
                      onChange={(e) => setLetzterService(e.target.value)}
                      className="input mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Fahrerdaten */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Fahrerdaten</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs muted">Vorname *</label>
                    <input
                      type="text"
                      value={fahrerVorname}
                      onChange={(e) => setFahrerVorname(e.target.value)}
                      className="input mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Nachname *</label>
                    <input
                      type="text"
                      value={fahrerName}
                      onChange={(e) => setFahrerName(e.target.value)}
                      className="input mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Geburtsdatum</label>
                    <input
                      type="date"
                      value={fahrerGeburtsdatum}
                      onChange={(e) => setFahrerGeburtsdatum(e.target.value)}
                      className="input mt-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs muted">Adresse</label>
                    <input
                      type="text"
                      value={fahrerAdresse}
                      onChange={(e) => setFahrerAdresse(e.target.value)}
                      className="input mt-2"
                      placeholder="Straße, PLZ, Ort"
                    />
                  </div>
                </div>
              </div>

              {/* Versicherung & Dokumente */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Versicherung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs muted">Versicherungsnummer</label>
                    <input
                      type="text"
                      value={versicherungsnummer}
                      onChange={(e) => setVersicherungsnummer(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. 123456789"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Name der Versicherung</label>
                    <input
                      type="text"
                      value={versicherungsname}
                      onChange={(e) => setVersicherungsname(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. Allianz"
                    />
                  </div>
                </div>
              </div>

              {/* Dokumente */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Dokumente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs muted">Fahrer Profilfoto</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFahrerPhotoFile(e.target.files?.[0] || null)}
                      className="input mt-2"
                    />
                    {selectedVehicle?.fahrerPhotoUrl && (
                      <a
                        href={selectedVehicle.fahrerPhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                      >
                        📷 {selectedVehicle.fahrerPhotoName || "Aktuelles Foto"}
                      </a>
                    )}
                  </div>
                  <div>
                    <label className="text-xs muted">Führerschein (Foto/PDF)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setFuehrerscheinFile(e.target.files?.[0] || null)}
                      className="input mt-2"
                    />
                    {selectedVehicle?.fuehrerscheinUrl && (
                      <a
                        href={selectedVehicle.fuehrerscheinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                      >
                        📄 {selectedVehicle.fuehrerscheinName || "Aktuelles Dokument"}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  {saving || uploading ? "Speichert..." : "💾 Speichern"}
                </button>
                {selectedVehicle && (
                  <button
                    onClick={() => handleDelete(selectedVehicle)}
                    className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-3 text-sm font-semibold text-white transition"
                  >
                    🗑️ Löschen
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : selectedVehicle ? (
          // Detail View
          <div className="rounded-[28px] surface p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedVehicle.kennzeichen}</h2>
                <p className="text-sm muted mt-1">{selectedVehicle.modell}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(selectedVehicle)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  ✏️ Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(selectedVehicle)}
                  className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  🗑️ Löschen
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Fahrzeuginfo */}
              <div className="rounded-xl surface-2 p-4">
                <h3 className="text-sm font-semibold mb-3">Fahrzeuginformationen</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs muted">Kennzeichen</div>
                    <div className="font-medium">{selectedVehicle.kennzeichen}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">FIN</div>
                    <div className="font-medium">{selectedVehicle.fin || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Modell</div>
                    <div className="font-medium">{selectedVehicle.modell}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Fahrzeugname</div>
                    <div className="font-medium">{selectedVehicle.fahrzeugName || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Kilometerstand</div>
                    <div className="font-medium">{selectedVehicle.kilometerstand || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Letzter Service</div>
                    <div className="font-medium">{selectedVehicle.letzterService || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Versicherung */}
              <div className="rounded-xl surface-2 p-4">
                <h3 className="text-sm font-semibold mb-3">Versicherung</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs muted">Versicherungsnummer</div>
                    <div className="font-medium">{selectedVehicle.versicherungsnummer || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Versicherung</div>
                    <div className="font-medium">{selectedVehicle.versicherungsname || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Fahrerinfo mit Foto */}
              <div className="rounded-xl surface-2 p-4">
                <h3 className="text-sm font-semibold mb-3">Fahrer</h3>
                <div className="flex gap-4">
                  {selectedVehicle.fahrerPhotoUrl && (
                    <div className="flex-shrink-0">
                      <img 
                        src={selectedVehicle.fahrerPhotoUrl} 
                        alt="Fahrer Foto"
                        className="w-24 h-24 rounded-xl object-cover border-2 border-white/10"
                      />
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs muted">Name</div>
                      <div className="font-medium">{selectedVehicle.fahrerVorname} {selectedVehicle.fahrerName}</div>
                    </div>
                    <div>
                      <div className="text-xs muted">Geburtsdatum</div>
                      <div className="font-medium">{selectedVehicle.fahrerGeburtsdatum || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs muted">Adresse</div>
                      <div className="font-medium">{selectedVehicle.fahrerAdresse || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dokumente */}
              <div className="rounded-xl surface-2 p-4">
                <h3 className="text-sm font-semibold mb-3">Führerschein</h3>
                <div className="space-y-2">
                  {selectedVehicle.fuehrerscheinUrl ? (
                    <div>
                      {selectedVehicle.fuehrerscheinUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img 
                          src={selectedVehicle.fuehrerscheinUrl}
                          alt="Führerschein"
                          className="w-full max-w-md rounded-xl border-2 border-white/10 cursor-pointer hover:border-blue-400 transition"
                          onClick={() => window.open(selectedVehicle.fuehrerscheinUrl, '_blank')}
                        />
                      ) : (
                        <a
                          href={selectedVehicle.fuehrerscheinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                        >
                          📄 Führerschein PDF öffnen
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm muted">Kein Führerschein hochgeladen</div>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="pt-6 border-t border-white/10">
                <div className="text-xs muted">
                  Erstellt von: <span className="font-medium">{selectedVehicle.createdByName}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Empty State
          <div className="rounded-[28px] surface p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
            <div className="text-7xl mb-6">🚗</div>
            <h3 className="text-2xl font-bold mb-3">
              Wählen Sie ein Fahrzeug aus
            </h3>
            <p className="text-base muted mb-8 max-w-sm">
              oder erstellen Sie ein neues Fahrzeug
            </p>
            <button
              onClick={handleNew}
              className="rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-6 py-3 text-sm font-semibold text-white transition shadow-lg"
            >
              ➕ Neues Fahrzeug
            </button>
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}

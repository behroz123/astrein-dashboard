"use client";

import "./fuhrpark.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  baujahr?: string;
  erstzulassungJahr?: string;
  fahrzeugFarbe?: string;
  fahrzeugStatus?: string;
  naechsterService?: string;
  kraftstoffArt?: string;
  registrierteFirma?: string;
  kilometerstand?: string;
  letzterService?: string;
  versicherungsnummer?: string;
  versicherungsname?: string;
  fahrerName: string;
  fahrerVorname: string;
  fahrerNummer?: string;
  fuehrerscheinGueltigBis?: string;
  fahrerGeburtsdatum: string;
  fahrerAdresse: string;
  gpsTrackingLink?: string;
  fahrerPhotoUrl?: string;
  fahrerPhotoName?: string;
  fuehrerscheinUrl?: string;
  fuehrerscheinName?: string;
  createdAt: any;
  createdByUid: string;
  createdByName: string;
  updatedAt?: any;
};

type UpcomingService = {
  id: string;
  kennzeichen: string;
  modell: string;
  serviceDate: string;
  dateObj: Date;
  daysLeft: number;
};

type ExtractedVehicleData = Partial<{
  kennzeichen: string;
  fin: string;
  modell: string;
  fahrzeugName: string;
  baujahr: string;
  erstzulassungJahr: string;
  fahrzeugFarbe: string;
  kraftstoffArt: string;
  kilometerstand: string;
  versicherungsnummer: string;
  versicherungsname: string;
  registrierteFirma: string;
  fahrerVorname: string;
  fahrerName: string;
  fahrerNummer: string;
  fahrerGeburtsdatum: string;
  fahrerAdresse: string;
  fuehrerscheinGueltigBis: string;
}>;

function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function serviceBadgeClass(daysLeft: number | null): string {
  if (daysLeft === null) return "bg-slate-500/15 text-slate-200 border-slate-400/30";
  if (daysLeft < 0) return "bg-red-500/20 text-red-200 border-red-400/40";
  if (daysLeft <= 30) return "bg-amber-500/20 text-amber-100 border-amber-400/40";
  return "bg-emerald-500/20 text-emerald-100 border-emerald-400/40";
}

function serviceLabel(daysLeft: number | null): string {
  if (daysLeft === null) return "Kein Termin";
  if (daysLeft < 0) return `${Math.abs(daysLeft)} Tage überfällig`;
  if (daysLeft === 0) return "Heute";
  return `In ${daysLeft} Tagen`;
}

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
  const [showServiceAlert, setShowServiceAlert] = useState(false);

  // Form fields
  const [kennzeichen, setKennzeichen] = useState("");
  const [fin, setFin] = useState("");
  const [modell, setModell] = useState("");
  const [fahrzeugName, setFahrzeugName] = useState("");
  const [baujahr, setBaujahr] = useState("");
  const [erstzulassungJahr, setErstzulassungJahr] = useState("");
  const [fahrzeugFarbe, setFahrzeugFarbe] = useState("");
  const [fahrzeugStatus, setFahrzeugStatus] = useState("");
  const [naechsterService, setNaechsterService] = useState("");
  const [kraftstoffArt, setKraftstoffArt] = useState("");
  const [registrierteFirma, setRegistrierteFirma] = useState("");
  const [kilometerstand, setKilometerstand] = useState("");
  const [letzterService, setLetzterService] = useState("");
  const [versicherungsnummer, setVersicherungsnummer] = useState("");
  const [versicherungsname, setVersicherungsname] = useState("");
  const [fahrerName, setFahrerName] = useState("");
  const [fahrerVorname, setFahrerVorname] = useState("");
  const [fahrerNummer, setFahrerNummer] = useState("");
  const [fuehrerscheinGueltigBis, setFuehrerscheinGueltigBis] = useState("");
  const [fahrerGeburtsdatum, setFahrerGeburtsdatum] = useState("");
  const [fahrerAdresse, setFahrerAdresse] = useState("");
  const [gpsTrackingLink, setGpsTrackingLink] = useState("");
  const [fahrerPhotoFile, setFahrerPhotoFile] = useState<File | null>(null);
  const [fuehrerscheinFile, setFuehrerscheinFile] = useState<File | null>(null);
  const [aiVehicleDocFile, setAiVehicleDocFile] = useState<File | null>(null);
  const [aiLicenseDocFile, setAiLicenseDocFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

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
    setBaujahr("");
    setErstzulassungJahr("");
    setFahrzeugFarbe("");
    setFahrzeugStatus("");
    setNaechsterService("");
    setKraftstoffArt("");
    setRegistrierteFirma("");
    setKilometerstand("");
    setLetzterService("");
    setVersicherungsnummer("");
    setVersicherungsname("");
    setFahrerName("");
    setFahrerVorname("");
    setFahrerNummer("");
    setFuehrerscheinGueltigBis("");
    setFahrerGeburtsdatum("");
    setFahrerAdresse("");
    setGpsTrackingLink("");
    setFahrerPhotoFile(null);
    setFuehrerscheinFile(null);
    setAiVehicleDocFile(null);
    setAiLicenseDocFile(null);
    setAiProgress(0);
    setAiMessage(null);
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
    setBaujahr(vehicle.baujahr || "");
    setErstzulassungJahr(vehicle.erstzulassungJahr || "");
    setFahrzeugFarbe(vehicle.fahrzeugFarbe || "");
    setFahrzeugStatus(vehicle.fahrzeugStatus || "");
    setNaechsterService(vehicle.naechsterService || "");
    setKraftstoffArt(vehicle.kraftstoffArt || "");
    setRegistrierteFirma(vehicle.registrierteFirma || "");
    setKilometerstand(vehicle.kilometerstand || "");
    setLetzterService(vehicle.letzterService || "");
    setVersicherungsnummer(vehicle.versicherungsnummer || "");
    setVersicherungsname(vehicle.versicherungsname || "");
    setFahrerName(vehicle.fahrerName || "");
    setFahrerVorname(vehicle.fahrerVorname || "");
    setFahrerNummer(vehicle.fahrerNummer || "");
    setFuehrerscheinGueltigBis(vehicle.fuehrerscheinGueltigBis || "");
    setFahrerGeburtsdatum(vehicle.fahrerGeburtsdatum || "");
    setFahrerAdresse(vehicle.fahrerAdresse || "");
    setGpsTrackingLink(vehicle.gpsTrackingLink || "");
    setIsEditing(true);
    setError(null);
  }

  function handleNew() {
    resetForm();
    setSelectedVehicle(null);
    setIsEditing(true);
    setError(null);
  }

  function applyExtractedData(data: ExtractedVehicleData) {
    if (data.kennzeichen) setKennzeichen(data.kennzeichen);
    if (data.fin) setFin(data.fin);
    if (data.modell) setModell(data.modell);
    if (data.fahrzeugName) setFahrzeugName(data.fahrzeugName);
    if (data.baujahr) setBaujahr(data.baujahr);
    if (data.erstzulassungJahr) setErstzulassungJahr(data.erstzulassungJahr);
    if (data.fahrzeugFarbe) setFahrzeugFarbe(data.fahrzeugFarbe);
    if (data.kraftstoffArt) setKraftstoffArt(data.kraftstoffArt);
    if (data.kilometerstand) setKilometerstand(data.kilometerstand);
    if (data.versicherungsnummer) setVersicherungsnummer(data.versicherungsnummer);
    if (data.versicherungsname) setVersicherungsname(data.versicherungsname);
    if (data.registrierteFirma) setRegistrierteFirma(data.registrierteFirma);
    if (data.fahrerVorname) setFahrerVorname(data.fahrerVorname);
    if (data.fahrerName) setFahrerName(data.fahrerName);
    if (data.fahrerNummer) setFahrerNummer(data.fahrerNummer);
    if (data.fahrerGeburtsdatum) setFahrerGeburtsdatum(data.fahrerGeburtsdatum);
    if (data.fahrerAdresse) setFahrerAdresse(data.fahrerAdresse);
    if (data.fuehrerscheinGueltigBis) setFuehrerscheinGueltigBis(data.fuehrerscheinGueltigBis);
  }

  async function handleAiExtract() {
    if (!aiVehicleDocFile) {
      setAiMessage("❌ Bitte laden Sie einen gültigen Fahrzeugschein bzw. ein Zulassungsdokument hoch.");
      return;
    }

    if (!aiLicenseDocFile) {
      setAiMessage("❌ Bitte laden Sie einen gültigen Führerschein des Fahrers hoch.");
      return;
    }

    if (!user) {
      setAiMessage("Benutzer nicht authentifiziert.");
      return;
    }

    let progressTimer: ReturnType<typeof setInterval> | null = null;

    try {
      setAiLoading(true);
      setAiProgress(8);
      setAiMessage("Dokumente werden analysiert...");

      progressTimer = setInterval(() => {
        setAiProgress((prev) => {
          if (prev >= 92) return prev;
          const next = prev + Math.floor(Math.random() * 7) + 2;
          return next > 92 ? 92 : next;
        });
      }, 450);

      const token = await user.getIdToken(true);
      const formData = new FormData();
      formData.append("idToken", token);
      if (aiVehicleDocFile) formData.append("vehicleDoc", aiVehicleDocFile);
      if (aiLicenseDocFile) formData.append("licenseDoc", aiLicenseDocFile);

      const res = await fetch("/api/extract-vehicle-docs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setAiProgress(0);
        throw new Error(json?.details ? `${json?.error}: ${json?.details}` : (json?.error || "Fehler bei der KI-Analyse"));
      }

      applyExtractedData((json?.extracted || {}) as ExtractedVehicleData);
      setAiProgress(100);
      setAiMessage("✅ Daten erkannt und in das Formular übernommen.");
      setTimeout(() => setAiProgress(0), 800);
    } catch (e: any) {
      setAiProgress(0);
      setAiMessage(`❌ ${e?.message || "Analyse fehlgeschlagen"}`);
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      setAiLoading(false);
    }
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
        baujahr: baujahr.trim(),
        erstzulassungJahr: erstzulassungJahr.trim(),
        fahrzeugFarbe: fahrzeugFarbe.trim(),
        fahrzeugStatus: fahrzeugStatus.trim(),
        naechsterService: naechsterService.trim(),
        kraftstoffArt: kraftstoffArt.trim(),
        registrierteFirma: registrierteFirma.trim(),
        kilometerstand: kilometerstand.trim(),
        letzterService: letzterService.trim(),
        versicherungsnummer: versicherungsnummer.trim(),
        versicherungsname: versicherungsname.trim(),
        fahrerName: fahrerName.trim(),
        fahrerVorname: fahrerVorname.trim(),
        fahrerNummer: fahrerNummer.trim(),
        fuehrerscheinGueltigBis: fuehrerscheinGueltigBis.trim(),
        fahrerGeburtsdatum: fahrerGeburtsdatum.trim(),
        fahrerAdresse: fahrerAdresse.trim(),
        gpsTrackingLink: gpsTrackingLink.trim(),
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
        const dateA = parseIsoDate(a.naechsterService)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const dateB = parseIsoDate(b.naechsterService)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      }
      return 0;
    });

  const upcomingServices = useMemo<UpcomingService[]>(() => {
    return vehicles
      .map((v) => {
        const dateObj = parseIsoDate(v.naechsterService);
        if (!dateObj) return null;
        return {
          id: v.id,
          kennzeichen: v.kennzeichen,
          modell: v.modell,
          serviceDate: v.naechsterService || "",
          dateObj,
          daysLeft: getDaysUntil(dateObj),
        };
      })
      .filter((item): item is UpcomingService => item !== null)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [vehicles]);

  const urgentServices = useMemo(
    () => upcomingServices.filter((item) => item.daysLeft >= 0 && item.daysLeft <= 30),
    [upcomingServices]
  );

  const serviceChartData = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setHours(0, 0, 0, 0);

    return Array.from({ length: 6 }).map((_, idx) => {
      const monthStart = new Date(base.getFullYear(), base.getMonth() + idx, 1);
      const monthEnd = new Date(base.getFullYear(), base.getMonth() + idx + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const count = upcomingServices.filter(
        (item) => item.dateObj >= monthStart && item.dateObj <= monthEnd
      ).length;

      return {
        month: monthStart.toLocaleDateString("de-DE", { month: "short" }),
        fullMonth: monthStart.toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
        services: count,
      };
    });
  }, [upcomingServices]);

  useEffect(() => {
    if (!ready || loading) return;

    if (urgentServices.length === 0) {
      setShowServiceAlert(false);
      return;
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `fuhrpark-service-alert-dismissed-${todayKey}`;
    const dismissed = window.localStorage.getItem(storageKey) === "1";

    setShowServiceAlert(!dismissed);
  }, [ready, loading, urgentServices]);

  function dismissServiceAlert() {
    const todayKey = new Date().toISOString().slice(0, 10);
    window.localStorage.setItem(`fuhrpark-service-alert-dismissed-${todayKey}`, "1");
    setShowServiceAlert(false);
  }

  function formatDate(value?: string) {
    if (!value) return "—";
    const d = parseIsoDate(value);
    if (!d) return value;
    return d.toLocaleDateString("de-DE");
  }

  function exportVehiclePDF(vehicle: Vehicle) {
    const doc = new jsPDF({ format: "a4", unit: "mm" });

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 34, "F");
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 30, 210, 4, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("FUHRPARK MANAGEMENT", 14, 13);
    doc.setFontSize(10);
    doc.setTextColor(191, 219, 254);
    doc.text("Fahrzeug-Detailbericht", 14, 21);
    doc.setTextColor(226, 232, 240);
    doc.text(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, 14, 27);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(`${vehicle.kennzeichen || "—"}`, 14, 48);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(11);
    doc.text(`${vehicle.modell || "—"} • ${vehicle.fahrzeugName || "Kein Fahrzeugname"}`, 14, 55);

    // Summary chips
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, 60, 56, 13, 2, 2, "F");
    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Status", 17, 65);
    doc.setFont("helvetica", "normal");
    doc.text(vehicle.fahrzeugStatus || "—", 17, 70);

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(74, 60, 56, 13, 2, 2, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.text("Nächster Service", 77, 65);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(vehicle.naechsterService), 77, 70);

    doc.setFillColor(255, 247, 237);
    doc.roundedRect(134, 60, 62, 13, 2, 2, "F");
    doc.setTextColor(154, 52, 18);
    doc.setFont("helvetica", "bold");
    doc.text("Kilometerstand", 137, 65);
    doc.setFont("helvetica", "normal");
    doc.text(vehicle.kilometerstand || "—", 137, 70);

    autoTable(doc, {
      startY: 79,
      head: [["Feld", "Wert"]],
      body: [
        ["Kennzeichen", vehicle.kennzeichen || "—"],
        ["FIN", vehicle.fin || "—"],
        ["Modell", vehicle.modell || "—"],
        ["Fahrzeugname", vehicle.fahrzeugName || "—"],
        ["Baujahr", vehicle.baujahr || "—"],
        ["Erstzulassung", vehicle.erstzulassungJahr || "—"],
        ["Farbe", vehicle.fahrzeugFarbe || "—"],
        ["Status", vehicle.fahrzeugStatus || "—"],
        ["Kilometerstand", vehicle.kilometerstand || "—"],
        ["Nächster Service", formatDate(vehicle.naechsterService)],
        ["Letzter Service", formatDate(vehicle.letzterService)],
        ["Kraftstoff", vehicle.kraftstoffArt || "—"],
        ["Zugelassen auf", vehicle.registrierteFirma || "—"],
      ],
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9.2, cellPadding: 2.8, lineColor: [226, 232, 240], lineWidth: 0.1 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: 125 } },
      margin: { left: 14, right: 14 },
    });

    const y = (doc as any).lastAutoTable?.finalY ?? 130;

    autoTable(doc, {
      startY: y + 8,
      head: [["Fahrerdaten", "Wert"]],
      body: [
        ["Name", `${vehicle.fahrerVorname || ""} ${vehicle.fahrerName || ""}`.trim() || "—"],
        ["Fahrernummer", vehicle.fahrerNummer || "—"],
        ["Geburtsdatum", formatDate(vehicle.fahrerGeburtsdatum)],
        ["Führerschein gültig bis", formatDate(vehicle.fuehrerscheinGueltigBis)],
        ["Adresse", vehicle.fahrerAdresse || "—"],
        ["GPS Tracking", vehicle.gpsTrackingLink || "—"],
      ],
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9.2, cellPadding: 2.8, lineColor: [226, 232, 240], lineWidth: 0.1 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: 125 } },
      margin: { left: 14, right: 14 },
    });

    const safePlate = (vehicle.kennzeichen || "fahrzeug").replace(/[^a-zA-Z0-9-_]/g, "_");
    doc.save(`fahrzeug_${safePlate}.pdf`);
  }

  function exportFleetPDF() {
    const doc = new jsPDF({ format: "a4", unit: "mm", orientation: "landscape" });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 30, "F");
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 27, 297, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("FUHRPARK MANAGEMENT", 12, 12);
    doc.setFontSize(11);
    doc.setTextColor(226, 232, 240);
    doc.text("Gesamtliste Fahrzeuge", 12, 20);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, 12, 38);
    doc.text(`Anzahl Fahrzeuge: ${vehicles.length}`, 12, 44);

    const activeCount = vehicles.filter((v) => (v.fahrzeugStatus || "").toLowerCase() === "betriebsbereit").length;
    const serviceSoon = urgentServices.length;

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(95, 34, 56, 12, 2, 2, "F");
    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Betriebsbereit", 98, 39);
    doc.setFont("helvetica", "normal");
    doc.text(String(activeCount), 98, 44);

    doc.setFillColor(255, 247, 237);
    doc.roundedRect(155, 34, 56, 12, 2, 2, "F");
    doc.setTextColor(154, 52, 18);
    doc.setFont("helvetica", "bold");
    doc.text("Service in 30 Tagen", 158, 39);
    doc.setFont("helvetica", "normal");
    doc.text(String(serviceSoon), 158, 44);

    const rows = vehicles.map((v) => [
      v.kennzeichen || "—",
      v.modell || "—",
      `${v.fahrerVorname || ""} ${v.fahrerName || ""}`.trim() || "—",
      v.fahrzeugStatus || "—",
      formatDate(v.naechsterService),
      v.kilometerstand || "—",
      v.kraftstoffArt || "—",
      v.registrierteFirma || "—",
    ]);

    autoTable(doc, {
      startY: 52,
      head: [["Kennzeichen", "Modell", "Fahrer", "Status", "Nächster Service", "KM", "Kraftstoff", "Firma"]],
      body: rows,
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8.5, cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 10, right: 10 },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 34 },
        2: { cellWidth: 34 },
        3: { cellWidth: 26 },
        4: { cellWidth: 28 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 26 },
      },
    });

    const statusCount = vehicles.reduce<Record<string, number>>((acc, v) => {
      const key = v.fahrzeugStatus || "Unbekannt";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const statusRows = Object.entries(statusCount).map(([status, count]) => [status, String(count)]);
    const finalY = (doc as any).lastAutoTable?.finalY ?? 220;

    autoTable(doc, {
      startY: finalY + 6,
      head: [["Status", "Anzahl"]],
      body: statusRows,
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 2.4 },
      margin: { left: 10, right: 220 },
    });

    doc.save(`fuhrpark_gesamtliste_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  if (!ready || loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        Lädt...
      </div>
    );
  }

  return (
    <div className="pb-8 fuhrpark-page">
      {/* Modern Header */}
      <div className="mb-10 fuhrpark-hero">
        <div className="fuhrpark-hero-grid">
          <div className="fuhrpark-hero-content">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
            >
              Zurück
            </button>

            <div
              className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(var(--accent), 0.1)",
                color: "rgb(var(--accent))"
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgb(var(--accent))" }}></span>
              Fuhrpark
            </div>

            <h1 className="text-4xl font-bold tracking-tight fuhrpark-hero-title">
              Fuhrparkverwaltung
            </h1>
            <p className="mt-2 text-lg opacity-60 fuhrpark-hero-subtitle">
              Verwalten Sie alle Firmenfahrzeuge, Fahrer und Dokumente
            </p>

            <div className="fuhrpark-hero-stats mt-4">
              <div className="fuhrpark-stat-pill">
                <span className="fuhrpark-stat-label">Fahrzeuge</span>
                <span className="fuhrpark-stat-value">{vehicles.length}</span>
              </div>
              <div className="fuhrpark-stat-pill">
                <span className="fuhrpark-stat-label">Service in 30 Tagen</span>
                <span className="fuhrpark-stat-value">{urgentServices.length}</span>
              </div>
            </div>

            <div className="fuhrpark-hero-actions mt-5">
              <button
                onClick={exportFleetPDF}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-4 py-2 text-sm font-semibold text-white transition shadow-lg"
              >
                📄 Gesamtliste als PDF
              </button>
              {selectedVehicle && !isEditing && (
                <button
                  onClick={() => exportVehiclePDF(selectedVehicle)}
                  className="rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-4 py-2 text-sm font-semibold text-white transition shadow-lg"
                >
                  🖨️ Fahrzeug-PDF
                </button>
              )}
            </div>
          </div>

          <div className="fuhrpark-hero-car" aria-hidden="true">
            <div className="fuhrpark-hero-car-glow" />
            <svg className="fuhrpark-hero-svg" viewBox="0 0 640 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="carStroke" x1="0" y1="0" x2="640" y2="300" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#60A5FA" />
                  <stop offset="1" stopColor="#34D399" />
                </linearGradient>
              </defs>
              <path d="M80 205H560" stroke="rgba(148,163,184,0.35)" strokeWidth="4" strokeLinecap="round"/>
              <path d="M120 190C140 140 190 120 280 118H370C445 118 490 140 520 188" stroke="url(#carStroke)" strokeWidth="8" strokeLinecap="round"/>
              <path d="M165 186H478" stroke="url(#carStroke)" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="200" cy="205" r="33" stroke="url(#carStroke)" strokeWidth="8"/>
              <circle cx="200" cy="205" r="12" fill="#93C5FD"/>
              <circle cx="445" cy="205" r="33" stroke="url(#carStroke)" strokeWidth="8"/>
              <circle cx="445" cy="205" r="12" fill="#34D399"/>
              <path d="M250 130L292 96H366L410 130" stroke="url(#carStroke)" strokeWidth="8" strokeLinecap="round"/>
              <path d="M318 96H356" stroke="url(#carStroke)" strokeWidth="6" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-6 fuhrpark-layout">
      {showServiceAlert && urgentServices.length > 0 && (
        <div className="rounded-2xl p-4 fuhrpark-alert">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold">🔔 Service-Erinnerung (30 Tage)</div>
              <p className="text-sm mt-1 opacity-90">
                {urgentServices.length} Fahrzeug(e) benötigen bald einen Service.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {urgentServices.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const target = vehicles.find((v) => v.id === item.id) || null;
                      setSelectedVehicle(target);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-full text-xs border border-white/25 bg-white/10 hover:bg-white/20"
                  >
                    {item.kennzeichen} • {serviceLabel(item.daysLeft)}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={dismissServiceAlert}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/20 hover:bg-black/30 border border-white/20"
            >
              Heute ausblenden
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-[28px] surface p-4 fuhrpark-filter">
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

      <div className="rounded-[28px] surface p-5 fuhrpark-insight-panel">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 rounded-2xl surface-2 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Service-Chart (nächste 6 Monate)</h3>
              <span className="text-xs muted">Automatisch aus geplantem Service-Datum</span>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceChartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                  <XAxis dataKey="month" tick={{ fill: "currentColor", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "currentColor", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(59,130,246,0.1)" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.25)",
                      background: "rgba(15,23,42,0.92)",
                      color: "#e2e8f0",
                    }}
                    formatter={(value: any) => [`${value} Service`, "Anzahl"]}
                    labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullMonth || label}
                  />
                  <Bar dataKey="services" radius={[10, 10, 0, 0]}>
                    {serviceChartData.map((entry) => (
                      <Cell
                        key={entry.fullMonth}
                        fill={entry.services > 0 ? "rgba(59,130,246,0.85)" : "rgba(148,163,184,0.35)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl surface-2 p-4">
            <h3 className="font-semibold mb-3">Service-Übersicht</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="muted">Gesamte Fahrzeuge</span>
                <span className="font-semibold">{vehicles.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="muted">Mit Service-Termin</span>
                <span className="font-semibold">{upcomingServices.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="muted">In 30 Tagen fällig</span>
                <span className="font-semibold text-amber-300">{urgentServices.length}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {upcomingServices.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const target = vehicles.find((v) => v.id === item.id) || null;
                    setSelectedVehicle(target);
                    setIsEditing(false);
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-white/10 hover:border-white/25 hover:bg-white/5"
                >
                  <div className="text-sm font-medium">{item.kennzeichen}</div>
                  <div className="text-xs muted">{item.modell} • {item.serviceDate}</div>
                  <div className={`mt-1 inline-flex text-[11px] px-2 py-0.5 rounded-full border ${serviceBadgeClass(item.daysLeft)}`}>
                    {serviceLabel(item.daysLeft)}
                  </div>
                </button>
              ))}
              {upcomingServices.length === 0 && (
                <div className="text-sm muted">Keine Service-Daten vorhanden.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Fahrzeuge Liste */}
      <div className="lg:col-span-1">
        <div className="rounded-[28px] surface p-6 space-y-4 fuhrpark-list-panel">
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
                (() => {
                  const nextServiceDate = parseIsoDate(vehicle.naechsterService);
                  const daysLeft = nextServiceDate ? getDaysUntil(nextServiceDate) : null;
                  return (
                <button
                  key={vehicle.id}
                  onClick={() => {
                    setSelectedVehicle(vehicle);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left rounded-xl p-4 transition border fuhrpark-vehicle-item ${
                    selectedVehicle?.id === vehicle.id
                      ? "bg-blue-500/10 border-blue-500/30"
                      : "surface-2 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm">{vehicle.kennzeichen}</div>
                    <div className={`text-[11px] px-2 py-0.5 rounded-full border ${serviceBadgeClass(daysLeft)}`}>
                      {serviceLabel(daysLeft)}
                    </div>
                  </div>
                  <div className="text-xs muted mt-1">{vehicle.modell}</div>
                  <div className="text-xs muted mt-1">👤 {vehicle.fahrerVorname} {vehicle.fahrerName}</div>
                </button>
                  );
                })()
              ))
            )}
          </div>
        </div>
      </div>

      {/* Hauptbereich: Detail/Edit */}
      <div className="lg:col-span-2">
        {isEditing ? (
          // Edit Form
          <div className="rounded-[28px] surface p-6 space-y-6 fuhrpark-main-panel">
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
              <div className="rounded-xl surface-2 p-4 border border-blue-500/20">
                <h3 className="text-lg font-semibold mb-2">🤖 KI-Dokumentenerkennung</h3>
                <p className="text-sm muted mb-3">
                  Fahrzeugschein und Führerschein sind beide erforderlich. Bei falschem Dokumenttyp fordert die KI automatisch das richtige Dokument an.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs muted">Fahrzeugschein / Zulassung</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setAiVehicleDocFile(e.target.files?.[0] || null)}
                      className="input mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Führerschein Fahrer</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setAiLicenseDocFile(e.target.files?.[0] || null)}
                      className="input mt-2"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAiExtract}
                    disabled={aiLoading}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
                  >
                    {aiLoading ? "Analysiert..." : "🔍 Mit KI auslesen"}
                  </button>
                  {aiMessage && <span className="text-xs muted">{aiMessage}</span>}
                </div>
                {(aiLoading || aiProgress > 0) && (
                  <div className="mt-3 w-full">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-500/20 border border-slate-400/20">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500"
                        style={{ width: `${aiProgress}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] muted">{aiProgress}%</div>
                  </div>
                )}
              </div>

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
                    <label className="text-xs muted">Baujahr</label>
                    <input
                      type="number"
                      value={baujahr}
                      onChange={(e) => setBaujahr(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. 2021"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Erstzulassung (Jahr)</label>
                    <input
                      type="number"
                      value={erstzulassungJahr}
                      onChange={(e) => setErstzulassungJahr(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. 2022"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Fahrzeugfarbe</label>
                    <input
                      type="text"
                      value={fahrzeugFarbe}
                      onChange={(e) => setFahrzeugFarbe(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. Weiß"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Fahrzeugstatus</label>
                    <select
                      value={fahrzeugStatus}
                      onChange={(e) => setFahrzeugStatus(e.target.value)}
                      className="input mt-2"
                    >
                      <option value="">Bitte wählen</option>
                      <option value="Betriebsbereit">Betriebsbereit</option>
                      <option value="Defekt">Defekt</option>
                      <option value="In Reparatur">In Reparatur</option>
                      <option value="Reparatur nötig">Reparatur nötig</option>
                    </select>
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
                    <label className="text-xs muted">Nächster Service</label>
                    <input
                      type="date"
                      value={naechsterService}
                      onChange={(e) => setNaechsterService(e.target.value)}
                      className="input mt-2"
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
                  <div>
                    <label className="text-xs muted">Kraftstoffart</label>
                    <input
                      type="text"
                      value={kraftstoffArt}
                      onChange={(e) => setKraftstoffArt(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. Diesel"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs muted">Zugelassen auf Firma</label>
                    <input
                      type="text"
                      value={registrierteFirma}
                      onChange={(e) => setRegistrierteFirma(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. AH Exzellent Immobilien GmbH"
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
                  <div>
                    <label className="text-xs muted">Fahrernummer</label>
                    <input
                      type="text"
                      value={fahrerNummer}
                      onChange={(e) => setFahrerNummer(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. D-001"
                    />
                  </div>
                  <div>
                    <label className="text-xs muted">Führerschein gültig bis</label>
                    <input
                      type="date"
                      value={fuehrerscheinGueltigBis}
                      onChange={(e) => setFuehrerscheinGueltigBis(e.target.value)}
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
                  <div className="md:col-span-2">
                    <label className="text-xs muted">GPS-Tracking (Link/ID)</label>
                    <input
                      type="text"
                      value={gpsTrackingLink}
                      onChange={(e) => setGpsTrackingLink(e.target.value)}
                      className="input mt-2"
                      placeholder="z.B. https://... oder Geräte-ID"
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
          <div className="rounded-[28px] surface p-6 space-y-6 fuhrpark-main-panel">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedVehicle.kennzeichen}</h2>
                <p className="text-sm muted mt-1">{selectedVehicle.modell}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportVehiclePDF(selectedVehicle)}
                  className="rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  📄 PDF
                </button>
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
                    <div className="text-xs muted">Baujahr</div>
                    <div className="font-medium">{selectedVehicle.baujahr || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Erstzulassung (Jahr)</div>
                    <div className="font-medium">{selectedVehicle.erstzulassungJahr || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Fahrzeugfarbe</div>
                    <div className="font-medium">{selectedVehicle.fahrzeugFarbe || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Fahrzeugstatus</div>
                    <div className="font-medium">{selectedVehicle.fahrzeugStatus || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Kilometerstand</div>
                    <div className="font-medium">{selectedVehicle.kilometerstand || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Nächster Service</div>
                    <div className="font-medium">{selectedVehicle.naechsterService || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Letzter Service</div>
                    <div className="font-medium">{selectedVehicle.letzterService || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs muted">Kraftstoffart</div>
                    <div className="font-medium">{selectedVehicle.kraftstoffArt || "—"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs muted">Zugelassen auf Firma</div>
                    <div className="font-medium">{selectedVehicle.registrierteFirma || "—"}</div>
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
                      <div className="text-xs muted">Fahrernummer</div>
                      <div className="font-medium">{selectedVehicle.fahrerNummer || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs muted">Geburtsdatum</div>
                      <div className="font-medium">{selectedVehicle.fahrerGeburtsdatum || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs muted">Führerschein gültig bis</div>
                      <div className="font-medium">{selectedVehicle.fuehrerscheinGueltigBis || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs muted">Adresse</div>
                      <div className="font-medium">{selectedVehicle.fahrerAdresse || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs muted">GPS-Tracking</div>
                      <div className="font-medium break-all">
                        {selectedVehicle.gpsTrackingLink ? (
                          selectedVehicle.gpsTrackingLink.startsWith("http") ? (
                            <a
                              href={selectedVehicle.gpsTrackingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {selectedVehicle.gpsTrackingLink}
                            </a>
                          ) : (
                            selectedVehicle.gpsTrackingLink
                          )
                        ) : (
                          "—"
                        )}
                      </div>
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
          <div className="rounded-[28px] surface p-12 text-center flex flex-col items-center justify-center min-h-[500px] fuhrpark-main-panel">
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

"use client";

import "./wohnungen.css";
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
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";
import { useTheme } from "../../lib/themeContext";
import { generatePropertyPDF, downloadPDF } from "../../lib/generatePDF";
import { Home, MapPin, User, Calendar, Euro, CheckCircle, XCircle, Edit2, Trash2, Bed, DoorOpen, Plus, X, Download } from "lucide-react";

type Payment = {
  month: number;
  year: number;
  amount: string;
  paid: boolean;
  paidDate?: string;
  markedBy?: string;
  markedByName?: string;
  paymentMethod?: string;
};

type OpenPaymentSelection = {
  roomId: string;
  bedId: string;
  month: number;
  year: number;
  tenantName: string;
};
type PropertyEmailItem = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  ts: number;
};

type Bed = {
  id: string;
  number: number;
  tenant?: string;
  rent?: string;
  moveInDate?: string;
  moveOutDate?: string;
  notes?: string;
  occupied?: boolean;
  payments?: Payment[];
};

type Room = {
  id: string;
  name: string;
  beds: Bed[];
  suitableForCouple?: boolean;
  capacity?: number;
};

type Wohnung = {
  id: string;
  address?: string; // From Schlüsselübergabe
  adresse?: string; // From Wohnungen
  gmailLabel?: string;
  gmailQuery?: string;
  stadtplz?: string;
  zimmerzahl?: string;
  quadratmeter?: string;
  miete?: string;
  kaution?: string;
  status?: "verfügbar" | "vermietet" | "renovierung";
  aktuellerMieter?: string;
  mietbeginn?: string;
  mietende?: string;
  notizen?: string;
  rooms?: Room[];
  createdAt: any;
  createdByUid?: string;
  createdByName?: string;
  updatedAt?: any;
};

export default function WohnungenPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const { config: themeConfig } = useTheme();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("mitarbeiter");
  const [wohnungen, setWohnungen] = useState<Wohnung[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWohnung, setSelectedWohnung] = useState<Wohnung | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form fields
  const [adresse, setAdresse] = useState("");
  const [stadtplz, setStadtplz] = useState("");
  const [zimmerzahl, setZimmerzahl] = useState("");
  const [quadratmeter, setQuadratmeter] = useState("");
  const [miete, setMiete] = useState("");
  const [kaution, setKaution] = useState("");
  const [status, setStatus] = useState<"verfügbar" | "vermietet" | "renovierung">("verfügbar");
  const [aktuellerMieter, setAktuellerMieter] = useState("");
  const [mietbeginn, setMietbeginn] = useState("");
  const [mietende, setMietende] = useState("");
  const [notizen, setNotizen] = useState("");
  const [gmailLabel, setGmailLabel] = useState("");
  const [gmailQuery, setGmailQuery] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);

  // Room/Bed management
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomBeds, setRoomBeds] = useState<Bed[]>([]);
  const [roomSuitableForCouple, setRoomSuitableForCouple] = useState(false);
  const [roomCapacity, setRoomCapacity] = useState("1");

  // Tenant/Payment management
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedBedContext, setSelectedBedContext] = useState<{ roomId: string; bedId: string } | null>(null);
  const [showBedDetail, setShowBedDetail] = useState(false);
  const [showPaymentCalendar, setShowPaymentCalendar] = useState(false);
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [tempMoveOutDate, setTempMoveOutDate] = useState("");
  const [showOpenPaymentsDetails, setShowOpenPaymentsDetails] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingOpenPayment, setPendingOpenPayment] = useState<OpenPaymentSelection | null>(null);
  const [propertyEmails, setPropertyEmails] = useState<PropertyEmailItem[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [emailsReloadTick, setEmailsReloadTick] = useState(0);
  
  // PDF Export month selection
  const [showPDFMonthModal, setShowPDFMonthModal] = useState(false);
  const [pdfSelectedMonth, setPdfSelectedMonth] = useState(new Date().getMonth() + 1);
  const [pdfSelectedYear, setPdfSelectedYear] = useState(new Date().getFullYear());
  const [pendingPDFWohnung, setPendingPDFWohnung] = useState<Wohnung | null>(null);

  // Payment calendar save state
  const [unsavedPaymentChanges, setUnsavedPaymentChanges] = useState(false);

  // Mobile view state
  const [showMobileList, setShowMobileList] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const prevThemeAttr = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "midnight");

    const lightOverride = document.getElementById("astrein-light-overrides");
    if (lightOverride) lightOverride.remove();

    const existing = document.getElementById("wohnungen-force-dark-overrides");
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = "wohnungen-force-dark-overrides";
    style.textContent = `
      .wohnungen-page .bg-white,
      .wohnungen-page [class*="bg-white"],
      .wohnungen-page [class*="from-slate-50"],
      .wohnungen-page [class*="from-gray-50"],
      .wohnungen-page [class*="to-white"],
      .wohnungen-page [class*="from-blue-50"],
      .wohnungen-page [class*="from-emerald-50"],
      .wohnungen-page [class*="from-purple-50"],
      .wohnungen-page [class*="from-amber-50"] {
        background: linear-gradient(180deg, rgba(16, 31, 56, 0.96), rgba(12, 24, 44, 0.96)) !important;
      }

      .wohnungen-page [class*="border-gray"],
      .wohnungen-page [class*="border-slate"],
      .wohnungen-page [class*="border-blue-200"],
      .wohnungen-page [class*="border-emerald-200"],
      .wohnungen-page [class*="border-purple-200"],
      .wohnungen-page [class*="border-amber-200"] {
        border-color: #345d95 !important;
      }

      .wohnungen-page [class*="text-slate-900"],
      .wohnungen-page [class*="text-gray-900"],
      .wohnungen-page [class*="text-blue-900"],
      .wohnungen-page [class*="text-purple-900"] {
        color: #eaf2ff !important;
      }

      .wohnungen-page [class*="text-slate-700"],
      .wohnungen-page [class*="text-gray-700"],
      .wohnungen-page [class*="text-blue-700"],
      .wohnungen-page [class*="text-purple-700"],
      .wohnungen-page [class*="text-slate-600"],
      .wohnungen-page [class*="text-gray-600"],
      .wohnungen-page [class*="text-slate-500"],
      .wohnungen-page [class*="text-gray-500"] {
        color: #a7c3ea !important;
      }
    `;

    document.head.appendChild(style);

    return () => {
      if (prevThemeAttr) {
        root.setAttribute("data-theme", prevThemeAttr);
      } else {
        root.removeAttribute("data-theme");
      }

      const s = document.getElementById("wohnungen-force-dark-overrides");
      if (s) s.remove();
    };
  }, []);

  function getUserDisplayName(fullEmail: string): string {
    if (!fullEmail) return "Unbekannt";
    const parts = fullEmail.split("@")[0].split(".");
    if (parts.length >= 2) {
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    }
    return fullEmail.split("@")[0];
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      
      // Fetch user role
      try {
        const token = await u.getIdToken();
        const response = await fetch("/api/get-user-role", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setUserRole(data.role || "mitarbeiter");
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole("mitarbeiter");
      }
      
      setReady(true);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!ready) return;

    setLoading(true);
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Wohnung[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setWohnungen(list);

        // Aktualisiere selectedWohnung wenn es existiert
        if (selectedWohnung) {
          const updated = list.find((w) => w.id === selectedWohnung.id);
          if (updated) {
            setSelectedWohnung(updated);
            // Aktualisiere auch rooms state im Edit-Modus
            if (isEditing) {
              setRooms(updated.rooms || []);
            }
          }
        }

        setLoading(false);
      },
      () => {
        setWohnungen([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [ready, selectedWohnung, isEditing]);

  useEffect(() => {
    let cancelled = false;

    async function loadPropertyEmails() {
      if (!selectedWohnung?.id || !user) {
        setPropertyEmails([]);
        setEmailsError(null);
        return;
      }

      setEmailsLoading(true);
      setEmailsError(null);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/property-emails?propertyId=${encodeURIComponent(selectedWohnung.id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "E-Mails konnten nicht geladen werden");
        }

        if (!cancelled) {
          setPropertyEmails(Array.isArray(json?.emails) ? json.emails : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setPropertyEmails([]);
          setEmailsError(e?.message || "E-Mails konnten nicht geladen werden");
        }
      } finally {
        if (!cancelled) setEmailsLoading(false);
      }
    }

    loadPropertyEmails();

    return () => {
      cancelled = true;
    };
  }, [selectedWohnung?.id, user, emailsReloadTick]);

  function resetForm() {
    setAdresse("");
    setStadtplz("");
    setZimmerzahl("");
    setQuadratmeter("");
    setMiete("");
    setKaution("");
    setStatus("verfügbar");
    setAktuellerMieter("");
    setMietbeginn("");
    setMietende("");
    setNotizen("");
    setGmailLabel("");
    setGmailQuery("");
    setSelectedWohnung(null);
    setIsEditing(false);
    setError(null);
    setRooms([]);
    setShowRoomManager(false);
    setEditingRoom(null);
    setRoomName("");
    setRoomBeds([]);
    setShowOpenPaymentsDetails(false);
  }

  function handleEdit(wohnung: Wohnung) {
    setSelectedWohnung(wohnung);
    setShowOpenPaymentsDetails(false);
    setAdresse(wohnung.adresse || wohnung.address || "");
    setStadtplz(wohnung.stadtplz || "");
    setZimmerzahl(wohnung.zimmerzahl || "");
    setQuadratmeter(wohnung.quadratmeter || "");
    setMiete(wohnung.miete || "");
    setKaution(wohnung.kaution || "");
    setStatus(wohnung.status || "verfügbar");
    setAktuellerMieter(wohnung.aktuellerMieter || "");
    setMietbeginn(wohnung.mietbeginn || "");
    setMietende(wohnung.mietende || "");
    setNotizen(wohnung.notizen || "");
    setGmailLabel(wohnung.gmailLabel || "");
    setGmailQuery(wohnung.gmailQuery || "");
    setRooms(wohnung.rooms || []);
    setIsEditing(true);
    setError(null);
    setShowMobileList(false); // Hide list on mobile when editing
  }

  function handleNew() {
    resetForm();
    setSelectedWohnung(null);
    setShowOpenPaymentsDetails(false);
    setIsEditing(true);
    setError(null);
    setShowMobileList(false); // Hide list on mobile when creating new
  }

  async function handleSave() {
    if (!adresse.trim() || !stadtplz.trim()) {
      setError("Bitte Adresse und Stadt/PLZ ausfüllen!");
      return;
    }

    if (!user) {
      setError("Benutzer nicht authentifiziert!");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Recalculate payments if rent changed
      const roomsWithUpdatedPayments = rooms.map(room => ({
        ...room,
        beds: room.beds.map(bed => {
          // If bed has tenant and rent, recalculate payments
          if (bed.tenant && bed.rent && bed.moveInDate) {
            return {
              ...bed,
              payments: generatePayments(bed.moveInDate, bed.rent, bed.moveOutDate)
            };
          }
          return bed;
        })
      }));

      const data = {
        address: adresse.trim(), // For Schlüsselübergabe compatibility
        adresse: adresse.trim(), // Keep both fields
        stadtplz: stadtplz.trim(),
        zimmerzahl: zimmerzahl.trim(),
        quadratmeter: quadratmeter.trim(),
        miete: miete.trim(),
        kaution: kaution.trim(),
        status,
        aktuellerMieter: aktuellerMieter.trim(),
        mietbeginn: mietbeginn.trim(),
        mietende: mietende.trim(),
        notizen: notizen.trim(),
        gmailLabel: gmailLabel.trim(),
        gmailQuery: gmailQuery.trim(),
        rooms: roomsWithUpdatedPayments,
        updatedAt: serverTimestamp(),
      };

      if (selectedWohnung) {
        await updateDoc(doc(db, "properties", selectedWohnung.id), data);
      } else {
        await addDoc(collection(db, "properties"), {
          ...data,
          createdAt: serverTimestamp(),
          createdByUid: user.uid,
          createdByName: getUserDisplayName(user.email || ""),
        });
      }

      resetForm();
      setIsEditing(false);
      setShowMobileList(true); // Show list again after save
    } catch (error: any) {
      const errorMsg = error?.message || "Fehler beim Speichern";
      setError(`Speicherfehler: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(wohnung: Wohnung) {
    const wohnungAdresse = wohnung.adresse || wohnung.address || "diese Wohnung";
    if (!confirm(`Wohnung "${wohnungAdresse}" wirklich löschen?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "properties", wohnung.id));
      setSelectedWohnung(null);
      setIsEditing(false);
      setShowMobileList(true); // Show list again after delete
    } catch (error) {
      alert("Fehler beim Löschen!");
    }
  }

  function handleDownloadPDF(wohnung: Wohnung) {
    // Open modal to select month
    setPendingPDFWohnung(wohnung);
    setShowPDFMonthModal(true);
  }

  function confirmPDFDownload() {
    if (!pendingPDFWohnung) return;
    
    try {
      const rooms = pendingPDFWohnung.rooms || [];
      const doc = generatePropertyPDF(pendingPDFWohnung, rooms, pdfSelectedYear, pdfSelectedMonth);
      
      const filename = `${(pendingPDFWohnung.adresse || pendingPDFWohnung.address || 'Property').replace(/\s+/g, '_')}_${pdfSelectedYear}-${String(pdfSelectedMonth).padStart(2, '0')}.pdf`;
      downloadPDF(doc, filename);
      
      // Close modal and reset
      setShowPDFMonthModal(false);
      setPendingPDFWohnung(null);
    } catch (error) {
      console.error("Fehler beim Generieren des PDF:", error);
      alert("Fehler beim Erstellen des PDF!");
    }
  }

  const filteredWohnungen = wohnungen
    .filter(w => {
      const q = searchTerm.trim().toLowerCase();
      const wohnungAdresse = (w.adresse || w.address || "").toLowerCase();
      const stadtplz = (w.stadtplz || "").toLowerCase();
      const aktuellerMieter = (w.aktuellerMieter || "").toLowerCase();

      const hasTenantInBeds = (w.rooms || []).some((room) =>
        (room.beds || []).some((bed) => (bed.tenant || "").toLowerCase().includes(q))
      );

      const matchesSearch =
        q === "" ||
        wohnungAdresse.includes(q) ||
        stadtplz.includes(q) ||
        aktuellerMieter.includes(q) ||
        hasTenantInBeds;

      const matchesStatus = filterStatus === "all" || w.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

  const parseMoney = (value?: string): number => {
    if (!value) return 0;
    const normalized = String(value).replace(/\s/g, "").replace(",", ".");
    const amount = Number.parseFloat(normalized);
    return Number.isFinite(amount) ? amount : 0;
  };

  const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const stats = {
    total: wohnungen.length,
    verfügbar: wohnungen.filter(w => w.status === "verfügbar").length,
    vermietet: wohnungen.filter(w => w.status === "vermietet").length,
    renovierung: wohnungen.filter(w => w.status === "renovierung").length,
    totalRooms: wohnungen.reduce((acc, w) => acc + (w.rooms?.length || 0), 0),
    totalBeds: wohnungen.reduce((acc, w) => {
      return acc + (w.rooms?.reduce((sum, r) => sum + r.beds.length, 0) || 0);
    }, 0),
    occupiedBeds: wohnungen.reduce((acc, w) => {
      return acc + (w.rooms?.reduce((sum, r) => sum + r.beds.filter(b => b.occupied).length, 0) || 0);
    }, 0),
  };

  // Berechne Einnahmen vs. Gesamtmiete
  function calculateRentDifference(wohnung: Wohnung): number {
    const totalRent = parseMoney(wohnung.miete);
    const tenantsRent = (wohnung.rooms || []).reduce((sum, room) => {
      return sum + room.beds.reduce((bedSum, bed) => {
        return bedSum + parseMoney(bed.rent);
      }, 0);
    }, 0);
    return tenantsRent - totalRent;
  }

  // Berechne Gesamtmiete, Einnahmen und Differenz für alle Wohnungen
  function calculateTotalRentOverview() {
    let totalRentAmount = 0;
    let totalPaidAmount = 0;
    
    wohnungen.forEach(wohnung => {
      // Gesamtmiete von der Wohnung
      const wohnungMiete = parseMoney(wohnung.miete);
      totalRentAmount += wohnungMiete;
      
      // Bezahlte Mieten von allen Betten
      (wohnung.rooms || []).forEach(room => {
        room.beds.forEach(bed => {
          if (bed.payments) {
            bed.payments.forEach(payment => {
              if (payment.paid) {
                totalPaidAmount += parseFloat(payment.amount || "0");
              }
            });
          }
        });
      });
    });
    
    return {
      totalRent: totalRentAmount,
      totalPaid: Math.round(totalPaidAmount * 100) / 100,
      difference: Math.round((totalPaidAmount - totalRentAmount) * 100) / 100,
    };
  }

  // Berechne alle offenen Mieten mit Mieternamen (nur aktuelle Monat)
  // Mieten sind offen bis zum 3. des nächsten Monats
  function getOpenPayments() {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const openPayments: Array<{
      wohnungAdresse: string;
      roomName: string;
      bedNumber: number;
      tenantName: string;
      openAmount: number;
      month: number;
      year: number;
      isOverdue: boolean;
    }> = [];

    wohnungen.forEach(wohnung => {
      (wohnung.rooms || []).forEach(room => {
        room.beds.forEach(bed => {
          if (bed.payments) {
            bed.payments.forEach(payment => {
              // Nur zeigen wenn nicht bezahlt, Mieter existiert und es der aktuelle Monat ist
              if (!payment.paid && bed.tenant && payment.month === currentMonth && payment.year === currentYear) {
                const isOverdue = today.getDate() > 3; // Nach dem 3. des aktuellen Monats
                
                openPayments.push({
                  wohnungAdresse: wohnung.adresse || wohnung.address || "Unbekannt",
                  roomName: room.name,
                  bedNumber: bed.number,
                  tenantName: bed.tenant,
                  openAmount: parseFloat(payment.amount || "0"),
                  month: payment.month,
                  year: payment.year,
                  isOverdue: isOverdue,
                });
              }
            });
          }
        });
      });
    });

    return openPayments.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  // Berechne offene Mieten für ausgewählte Wohnung (nur aktueller Monat)
  function getOpenPaymentsForWohnung(wohnung: Wohnung) {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const openPayments: Array<{
      roomId: string;
      bedId: string;
      roomName: string;
      bedNumber: number;
      tenantName: string;
      openAmount: number;
      month: number;
      year: number;
      isOverdue: boolean;
    }> = [];

    (wohnung.rooms || []).forEach(room => {
      room.beds.forEach(bed => {
        // Überspringe Betten, die bereits einen Auszug haben
        if (bed.moveOutDate) return;
        
        if (bed.payments) {
          bed.payments.forEach(payment => {
            // Nur zeigen wenn nicht bezahlt, Mieter existiert und es der aktuelle Monat ist
            if (!payment.paid && bed.tenant && payment.month === currentMonth && payment.year === currentYear) {
              const isOverdue = today.getDate() > 3; // Nach dem 3. des aktuellen Monats
              
              openPayments.push({
                roomId: room.id,
                bedId: bed.id,
                roomName: room.name,
                bedNumber: bed.number,
                tenantName: bed.tenant,
                openAmount: parseFloat(payment.amount || "0"),
                month: payment.month,
                year: payment.year,
                isOverdue: isOverdue,
              });
            }
          });
        }
      });
    });

    return openPayments.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  function markOpenPaymentAsPaid(openPayment: OpenPaymentSelection) {
    setPendingOpenPayment(openPayment);
    setShowPaymentMethodModal(true);
  }

  async function confirmOpenPaymentMethod(paymentMethod: string) {
    if (!selectedWohnung || !user || !pendingOpenPayment) return;

    const userDisplayName = getUserDisplayName(user.email || "");

    const updatedRooms = (selectedWohnung.rooms || []).map((room) => {
      if (room.id !== pendingOpenPayment.roomId) return room;

      return {
        ...room,
        beds: room.beds.map((bed) => {
          if (bed.id !== pendingOpenPayment.bedId) return bed;

          const updatedPayments = (bed.payments || generatePayments(bed.moveInDate, bed.rent, bed.moveOutDate)).map((p) => {
            if (p.month === pendingOpenPayment.month && p.year === pendingOpenPayment.year) {
              return {
                ...p,
                paid: true,
                paidDate: new Date().toISOString().split("T")[0],
                markedBy: user.email || "",
                markedByName: userDisplayName,
                paymentMethod,
              } as Payment;
            }
            return p;
          });

          return { ...bed, payments: updatedPayments };
        }),
      };
    });

    setRooms(updatedRooms);
    setSelectedWohnung({ ...selectedWohnung, rooms: updatedRooms });
    setShowPaymentMethodModal(false);
    setPendingOpenPayment(null);

    try {
      const docRef = doc(db, "properties", selectedWohnung.id);
      await updateDoc(docRef, {
        rooms: updatedRooms,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      alert("Fehler beim Speichern der Zahlung");
    }
  }

  function addRoom() {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomName.trim() || `Zimmer ${rooms.length + 1}`,
      beds: roomBeds.length > 0 ? roomBeds : [{ id: Date.now().toString(), number: 1, occupied: false }],
      suitableForCouple: roomSuitableForCouple,
      capacity: parseInt(roomCapacity) || 1,
    };
    setRooms([...rooms, newRoom]);
    setRoomName("");
    setRoomBeds([]);
    setRoomSuitableForCouple(false);
    setRoomCapacity("1");
    setEditingRoom(null);
    setShowRoomManager(false);
  }

  function updateRoom() {
    if (!editingRoom) return;
    setRooms(rooms.map(r => r.id === editingRoom.id ? {
      ...r,
      name: roomName.trim(),
      beds: roomBeds,
      suitableForCouple: roomSuitableForCouple,
      capacity: parseInt(roomCapacity) || 1,
    } : r));
    setRoomName("");
    setRoomBeds([]);
    setRoomSuitableForCouple(false);
    setRoomCapacity("1");
    setEditingRoom(null);
    setShowRoomManager(false);
  }

  function deleteRoom(roomId: string) {
    if (confirm("Zimmer wirklich löschen?")) {
      setRooms(rooms.filter(r => r.id !== roomId));
    }
  }

  function editRoom(room: Room) {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomBeds([...room.beds]);
    setRoomSuitableForCouple(room.suitableForCouple || false);
    setRoomCapacity((room.capacity || 1).toString());
    setShowRoomManager(true);
  }

  function editRoomFromDetail(room: Room) {
    if (!selectedWohnung) return;
    handleEdit(selectedWohnung);
    setTimeout(() => {
      editRoom(room);
    }, 0);
  }

  function editBedFromDetail(room: Room) {
    if (!selectedWohnung) return;
    handleEdit(selectedWohnung);
    setTimeout(() => {
      editRoom(room);
    }, 0);
  }

  function addBedToRoom() {
    const newBed: Bed = {
      id: Date.now().toString(),
      number: roomBeds.length + 1,
      occupied: false,
    };
    setRoomBeds([...roomBeds, newBed]);
  }

  function updateBed(bedId: string, updates: Partial<Bed>) {
    setRoomBeds(roomBeds.map(b => b.id === bedId ? { ...b, ...updates } : b));
  }

  function deleteBed(bedId: string) {
    setRoomBeds(roomBeds.filter(b => b.id !== bedId));
  }

  // Generate payment schedule from moveInDate
  function generatePayments(moveInDate?: string, rent?: string, moveOutDate?: string): Payment[] {
    if (!moveInDate || !rent) return [];
    
    const payments: Payment[] = [];
    const startDate = new Date(moveInDate);
    const today = new Date();
    const monthlyRent = parseFloat(rent);
    
    // Bestimme Enddatum: moveOutDate oder 12 Monate in die Zukunft
    let endDate: Date;
    if (moveOutDate) {
      endDate = new Date(moveOutDate);
    } else {
      endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 12);
    }
    
    let currentDate = new Date(startDate);
    
    // Check if move-out is in the same month as move-in
    const moveOutDateObj = moveOutDate ? new Date(moveOutDate) : null;
    const isSameMonth = moveOutDateObj && 
      currentDate.getMonth() === moveOutDateObj.getMonth() && 
      currentDate.getFullYear() === moveOutDateObj.getFullYear();
    
    if (isSameMonth && moveOutDateObj) {
      // Same month - calculate pro-rata for partial month
      const firstMonth = currentDate.getMonth() + 1;
      const firstYear = currentDate.getFullYear();
      const moveInDay = currentDate.getDate();
      const moveOutDay = moveOutDateObj.getDate();
      const daysInMonth = new Date(firstYear, firstMonth, 0).getDate();
      const daysUsed = moveOutDay - moveInDay + 1;
      const proRataAmount = (monthlyRent / daysInMonth * daysUsed).toFixed(2);
      
      payments.push({
        month: firstMonth,
        year: firstYear,
        amount: proRataAmount,
        paid: false,
      });
      return payments;
    }
    
    // Erster Monat - Pro-rata Berechnung
    const firstMonth = currentDate.getMonth() + 1;
    const firstYear = currentDate.getFullYear();
    const moveInDay = currentDate.getDate();
    const daysInFirstMonth = new Date(firstYear, firstMonth, 0).getDate();
    const daysRemaining = daysInFirstMonth - moveInDay + 1;
    const proRataAmount = (monthlyRent / daysInFirstMonth * daysRemaining).toFixed(2);
    
    payments.push({
      month: firstMonth,
      year: firstYear,
      amount: proRataAmount,
      paid: false,
    });
    
    // Alle weiteren Monate bis zum Enddatum
    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1);
    
    while (currentDate <= endDate) {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      // Letzter Monat (bei Auszug) - Pro-rata Berechnung
      if (moveOutDate) {
        const lastMonth = moveOutDateObj!.getMonth() + 1;
        const lastYear = moveOutDateObj!.getFullYear();
        
        if (month === lastMonth && year === lastYear) {
          const moveOutDay = moveOutDateObj!.getDate();
          const daysInLastMonth = new Date(lastYear, lastMonth, 0).getDate();
          const daysUsed = moveOutDay; // moveOutDay includes the full day of move-out
          const lastMonthAmount = (monthlyRent / daysInLastMonth * daysUsed).toFixed(2);
          
          payments.push({
            month,
            year,
            amount: lastMonthAmount,
            paid: false,
          });
          break;
        }
      }
      
      payments.push({
        month,
        year,
        amount: rent,
        paid: false,
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return payments;
  }

  // Mark payment as paid/unpaid
  async function togglePayment(month: number, year: number) {
    if (!selectedBedContext || !user || !selectedWohnung) return;
    
    const userDisplayName = getUserDisplayName(user.email || "");
    
    // Aktualisiere die Rooms vom selectedWohnung
    const updatedRooms = (selectedWohnung.rooms || []).map(room => {
      if (room.id === selectedBedContext.roomId) {
        return {
          ...room,
          beds: room.beds.map(bed => {
            if (bed.id === selectedBedContext.bedId) {
              const updatedPayments = (bed.payments || generatePayments(bed.moveInDate, bed.rent, bed.moveOutDate)).map(p => {
                if (p.month === month && p.year === year) {
                  const newPaidStatus = !p.paid;
                  const updatedPayment: Payment = { 
                    ...p, 
                    paid: newPaidStatus, 
                  };
                  
                  // Nur definierte Werte hinzufügen
                  if (newPaidStatus) {
                    updatedPayment.paidDate = new Date().toISOString().split('T')[0];
                    updatedPayment.markedBy = user.email || "";
                    updatedPayment.markedByName = userDisplayName;
                  } else {
                    // Entferne diese Felder wenn unbezahlt
                    delete updatedPayment.paidDate;
                    delete updatedPayment.markedBy;
                    delete updatedPayment.markedByName;
                  }
                  
                  return updatedPayment;
                }
                return p;
              });
              const updatedBed = { ...bed, payments: updatedPayments };
              setSelectedBed(updatedBed);
              return updatedBed;
            }
            return bed;
          })
        };
      }
      return room;
    });
    
    // Aktualisiere beide States (lokal)
    setRooms(updatedRooms);
    setSelectedWohnung({ ...selectedWohnung, rooms: updatedRooms });
    // Markiere als ungespeichert; der Nutzer kann Änderungen gesammelt speichern
    setUnsavedPaymentChanges(true);
  }

  // Speichere alle Änderungen der Zahlungen gesammelt
  async function savePaymentChanges() {
    if (!selectedWohnung) return;
    setSaving(true);
    try {
      const docRef = doc(db, "properties", selectedWohnung.id);
      await updateDoc(docRef, {
        rooms: rooms,
        updatedAt: serverTimestamp(),
      });
      setUnsavedPaymentChanges(false);
      alert("Zahlungsänderungen gespeichert");
    } catch (err) {
      console.error("Fehler beim Speichern der Zahlungen:", err);
      alert("Fehler beim Speichern der Zahlungen");
    } finally {
      setSaving(false);
    }
  }

  function cancelPaymentChanges() {
    if (!selectedWohnung) return;
    // Rolle die Änderungen zurück auf den letzten gespeicherten Zustand
    setRooms(selectedWohnung.rooms || []);
    setUnsavedPaymentChanges(false);
    if (selectedBedContext) {
      const bed = (selectedWohnung.rooms || [])
        .find(r => r.id === selectedBedContext.roomId)?.beds
        .find(b => b.id === selectedBedContext.bedId);
      setSelectedBed(bed || null);
    }
  }

  // Handle Move Out - Save to both property and create auszug entry
  async function handleMoveOut() {
    if (!selectedBedContext || !selectedWohnung || !selectedBed || !tempMoveOutDate || !user) return;
    
    const moveOutDate = new Date(tempMoveOutDate);
    const userDisplayName = getUserDisplayName(user.email || "");
    
    // Berechne finale Miete
    const payments = generatePayments(selectedBed.moveInDate, selectedBed.rent, tempMoveOutDate);
    const totalRent = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    try {
      // 1. Update Wohnung mit Auszugsdatum
      const updatedRooms = (selectedWohnung.rooms || []).map(room => {
        if (room.id === selectedBedContext.roomId) {
          return {
            ...room,
            beds: room.beds.map(bed => {
              if (bed.id === selectedBedContext.bedId) {
                return { 
                  ...bed, 
                  moveOutDate: tempMoveOutDate,
                  occupied: false,  // Bett ist jetzt frei
                  tenant: "",       // Mieter löschen
                  rent: "",         // Miete zurücksetzen
                  moveInDate: "",   // Einzugsdatum zurücksetzen
                  payments: payments  // Zahlungen mit korrekter Auszugsberechnung speichern
                };
              }
              return bed;
            })
          };
        }
        return room;
      });
      
      const docRef = doc(db, "properties", selectedWohnung.id);
      await updateDoc(docRef, {
        rooms: updatedRooms,
        updatedAt: serverTimestamp(),
      });
      
      // 2. Erstelle Auszug-Eintrag
      await addDoc(collection(db, "moveouts"), {
        person: selectedBed.tenant,
        movedOutDate: tempMoveOutDate,
        fromWhere: `${selectedWohnung.adresse || selectedWohnung.address} - ${updatedRooms.find(r => r.id === selectedBedContext.roomId)?.name || "Unbekannt"} - Bett ${selectedBedContext.bedId}`,
        notes: `Monatliche Miete: ${formatMoney(parseMoney(selectedBed.rent))}€ | Gesamtmiete: ${formatMoney(totalRent)}€ | Einzugsdatum: ${selectedBed.moveInDate}`,
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByName: userDisplayName,
        propertyId: selectedWohnung.id,
        roomId: selectedBedContext.roomId,
        bedId: selectedBedContext.bedId,
        monthlyRent: selectedBed.rent,
        totalRent: totalRent.toFixed(2),
        moveInDate: selectedBed.moveInDate,
      });
      
      // Update States
      setRooms(updatedRooms);
      setSelectedWohnung({ ...selectedWohnung, rooms: updatedRooms });
      setShowMoveOutModal(false);
      setTempMoveOutDate("");
      alert("Auszug erfolgreich gespeichert!");
      
    } catch (err) {
      console.error("Fehler beim Speichern des Auszugs:", err);
      alert("Fehler beim Speichern des Auszugs");
    }
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  useEffect(() => {
    if (!selectedWohnung || isEditing || !normalizedSearchTerm) return;

    const timer = setTimeout(() => {
      const matchedBed = document.querySelector('[data-search-match="true"]') as HTMLElement | null;
      if (matchedBed) {
        matchedBed.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [selectedWohnung, isEditing, normalizedSearchTerm]);

  if (!ready || loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        Lädt...
      </div>
    );
  }

  // Check if user can manage properties (admin or mitarbeiter)
  const canManageProperties = userRole === "admin" || userRole === "mitarbeiter";

  return (
    <div
      className="pb-12 wohnungen-page"
      style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #e0e7ff 100%)" }}
    >
      {/* Professional Header with Clean Design */}
      <div className="mb-12">
        <button
          onClick={() => router.push('/immobilien')}
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-violet-50"
          style={{ color: "var(--color-primary)" }}
        >
          ← {t("common.back")}
        </button>
        
        {/* Hero Header - Refined */}
        <div
          dir="ltr"
          className="relative rounded-2xl overflow-hidden hero-compact"
          style={{
            direction: "ltr",
            background: "linear-gradient(145deg, rgba(11,27,52,0.98), rgba(15,39,74,0.95))",
            border: "1px solid rgba(99, 179, 255, 0.42)",
            boxShadow: "0 24px 48px -28px rgba(0,0,0,0.75), inset 0 0 100px rgba(56,189,248,0.07)"
          }}
        >
          <div className="p-7 md:p-8" style={{ direction: "ltr" }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ background: "rgba(59,130,246,0.16)", color: "#cbe6ff", border: "1px solid rgba(125,211,252,0.32)" }}>
                  <span>🏢</span>
                  <span>AH Exzellent Immobilien GmbH</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 hero-title" style={{ color: "#eef4ff", textAlign: "left" }}>
                  {t("wohnungen.title")}
                </h1>
                <p className="text-base md:text-lg hero-sub" style={{ color: "#c6daf8", textAlign: "left" }}>
                  Professionelle Verwaltung aller Wohnungen und Mieterverhältnisse
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto lg:min-w-[430px]">
                <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(16,31,56,0.92)", border: "1px solid rgba(167,139,250,0.45)" }}>
                  <div className="text-3xl font-extrabold" style={{ color: "#c4b5fd" }}>{stats.total}</div>
                  <div className="text-xs font-semibold" style={{ color: "#ddd6fe" }}>Wohnungen</div>
                </div>
                <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(16,31,56,0.92)", border: "1px solid rgba(74,222,128,0.45)" }}>
                  <div className="text-3xl font-extrabold" style={{ color: "#86efac" }}>{stats.verfügbar}</div>
                  <div className="text-xs font-semibold" style={{ color: "#bbf7d0" }}>Verfügbar</div>
                </div>
                <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(16,31,56,0.92)", border: "1px solid rgba(96,165,250,0.45)" }}>
                  <div className="text-3xl font-extrabold" style={{ color: "#93c5fd" }}>{stats.totalBeds}</div>
                  <div className="text-xs font-semibold" style={{ color: "#bfdbfe" }}>Betten</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics - Clean Minimal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10 wohnungen-stats-grid">
        <div className="group relative rounded-xl bg-white border-2 border-violet-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-violet-300 wohnungen-stat-card ws-1">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-t-xl"></div>
          <div className="text-2xl mb-2">🏢</div>
          <div className="text-3xl font-black text-gray-900 mb-1">{stats.total}</div>
          <div className="text-xs font-bold text-gray-500 uppercase">{t("wohnungen.stats.total")}</div>
        </div>
        <div className="group relative rounded-xl bg-white border-2 border-emerald-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-emerald-300 wohnungen-stat-card ws-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-t-xl"></div>
          <div className="text-2xl mb-2">✨</div>
          <div className="text-3xl font-black text-gray-900 mb-1">{stats.verfügbar}</div>
          <div className="text-xs font-bold text-gray-500 uppercase">{t("wohnungen.stats.verfuegbar")}</div>
        </div>
        <div className="group relative rounded-xl bg-white border-2 border-blue-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-blue-300 wohnungen-stat-card ws-3">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-xl"></div>
          <div className="text-2xl mb-2">🔑</div>
          <div className="text-3xl font-black text-gray-900 mb-1">{stats.vermietet}</div>
          <div className="text-xs font-bold text-gray-500 uppercase">{t("wohnungen.stats.vermietet")}</div>
        </div>
        <div className="group relative rounded-xl bg-white border-2 border-amber-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-amber-300 wohnungen-stat-card ws-4">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-xl"></div>
          <div className="text-2xl mb-2">🔧</div>
          <div className="text-3xl font-black text-gray-900 mb-1">{stats.renovierung}</div>
          <div className="text-xs font-bold text-gray-500 uppercase">{t("wohnungen.stats.renovierung")}</div>
        </div>
        <div className="group relative rounded-xl bg-white border-2 border-indigo-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-indigo-300 wohnungen-stat-card ws-5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-t-xl"></div>
          <div className="text-2xl mb-2">🚪</div>
          <div className="text-3xl font-black text-gray-900 mb-1">{stats.totalRooms}</div>
          <div className="text-xs font-bold text-gray-500 uppercase">{t("wohnungen.stats.zimmer")}</div>
        </div>
        <div className="group relative rounded-xl bg-white border-2 border-purple-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-purple-300 wohnungen-stat-card ws-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-t-xl"></div>
          <div className="text-2xl mb-2">🛏️</div>
          <div className="text-3xl font-black text-gray-900 mb-1">{stats.totalBeds}</div>
          <div className="text-xs font-bold text-gray-500 uppercase">{t("wohnungen.stats.betten")}</div>
        </div>
        <div className="group relative rounded-xl bg-white border-2 border-pink-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-pink-300 wohnungen-stat-card ws-7">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-xl"></div>
          <div className="text-2xl mb-2">👥</div>
          <div className="text-3xl font-black text-gray-900 mb-1">{stats.occupiedBeds}/{stats.totalBeds}</div>
          <div className="text-xs font-bold text-gray-500 uppercase">{t("wohnungen.stats.belegt")}</div>
        </div>
      </div>

      {/* Rent Overview Section - Modern Professional */}
      <div className="mb-10">
        {(() => {
          const rentOverview = calculateTotalRentOverview();
          const openPayments = getOpenPayments();
          
          return (
            <div className="space-y-5">
              {/* Main Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  className="group relative rounded-xl bg-white border-2 border-indigo-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-indigo-300 wohnungen-rent-card rc-total"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-t-xl"></div>
                  <div className="text-2xl mb-2">🏠</div>
                  <div className="text-xs font-bold mb-2 uppercase tracking-wider text-indigo-700">
                    Gesamtmiete
                  </div>
                  <div className="text-3xl font-black mb-1 text-gray-900">{formatMoney(rentOverview.totalRent)}€</div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Alle Wohnungen
                  </div>
                </div>
                <div
                  className="group relative rounded-xl bg-white border-2 border-emerald-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-emerald-300 wohnungen-rent-card rc-paid"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-t-xl"></div>
                  <div className="text-2xl mb-2">💶</div>
                  <div className="text-xs font-bold mb-2 uppercase tracking-wider text-emerald-700">
                    Einnahmen
                  </div>
                  <div className="text-3xl font-black mb-1 text-gray-900">{formatMoney(rentOverview.totalPaid)}€</div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Bezahlte Mieten
                  </div>
                </div>
                <div
                  className={`group relative rounded-xl bg-white border-2 p-5 transition-all duration-200 hover:shadow-lg ${
                    rentOverview.difference >= 0 
                      ? 'border-lime-200 hover:border-lime-300'
                      : 'border-rose-200 hover:border-rose-300'
                  } wohnungen-rent-card rc-diff`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${
                    rentOverview.difference >= 0
                      ? 'bg-gradient-to-r from-lime-500 to-emerald-500'
                      : 'bg-gradient-to-r from-rose-500 to-red-500'
                  }`}></div>
                  <div className="text-2xl mb-2">{rentOverview.difference >= 0 ? '📈' : '📉'}</div>
                  <div className={`text-xs font-bold mb-2 uppercase tracking-wider ${
                    rentOverview.difference >= 0 ? 'text-lime-700' : 'text-rose-700'
                  }`}>
                    Differenz
                  </div>
                  <div className={`text-3xl font-black mb-1 ${
                    rentOverview.difference >= 0 ? 'text-lime-700' : 'text-rose-700'
                  }`}>
                    {rentOverview.difference >= 0 ? "+" : ""}
                    {formatMoney(rentOverview.difference)}€
                  </div>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${
                    rentOverview.difference >= 0 ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    {rentOverview.difference >= 0 ? 'Überschuss' : 'Defizit'}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="space-y-8">
      {/* Filter Bar - Professional Style */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm wohnungen-filter-bar">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder={t("items.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input flex-1 rounded-lg"
          />
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input rounded-lg sm:w-auto"
          >
            <option value="all">{t("inventory.allStatuses")}</option>
            <option value="verfügbar">{t("wohnungen.stats.verfuegbar")}</option>
            <option value="vermietet">{t("wohnungen.stats.vermietet")}</option>
            <option value="renovierung">{t("wohnungen.stats.renovierung")}</option>
          </select>
          
          {canManageProperties && (
            <button
              onClick={handleNew}
              className="action-btn primary rounded-lg bg-violet-600 hover:bg-violet-700 px-6 py-2.5 text-sm font-semibold text-white transition shadow-sm whitespace-nowrap"
            >
              + {t("wohnungen.newWohnung")}
            </button>
          )}
          
          <div className="text-sm text-gray-500 py-2.5 whitespace-nowrap">
            {filteredWohnungen.length} von {wohnungen.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Wohnungen Liste - Professionell */}
      <div className={`lg:col-span-1 ${!showMobileList && (selectedWohnung || isEditing) ? 'hidden lg:block' : ''}`}>
        <div className="rounded-2xl bg-white border border-gray-200 p-5 sticky top-4 shadow-sm wohnungen-list-panel">
          <h2 className="text-lg font-semibold mb-4">{t("wohnungen.title")}</h2>

          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filteredWohnungen.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">🏢</div>
                <div className="text-sm opacity-60">{t("fahrzeuge.empty")}</div>
              </div>
            ) : (
              filteredWohnungen.map((wohnung) => (
                <button
                  key={wohnung.id}
                  onClick={() => {
                    setSelectedWohnung(wohnung);
                    setShowOpenPaymentsDetails(false);
                    setIsEditing(false);
                    setShowMobileList(false);
                  }}
                  className={`w-full text-left rounded-2xl p-5 transition-all duration-200 border-2 wohnungen-list-item ${
                    selectedWohnung?.id === wohnung.id 
                      ? "bg-violet-50 border-violet-300 shadow-md" 
                      : "bg-white border-gray-200 hover:border-violet-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base truncate text-gray-900">{wohnung.adresse || wohnung.address || "—"}</div>
                      <div className="text-sm text-gray-500 truncate mt-1 font-medium">{wohnung.stadtplz || "—"}</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 flex items-center gap-2 bg-slate-800 border border-blue-700/60 text-blue-100 status-pill" style={{ background: "rgba(18,34,59,0.96)", borderColor: "#4b77b5", color: "#dbeafe" }}>
                      {wohnung.status === "verfügbar" && <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></div>}
                      {wohnung.status === "vermietet" && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50"></div>}
                      {wohnung.status === "renovierung" && <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-lg shadow-orange-400/50"></div>}
                      {(() => {
                        if (wohnung.status === "verfügbar") {
                          const totalBeds = (wohnung.rooms || []).reduce((sum, room) => sum + room.beds.length, 0);
                          const occupiedBeds = (wohnung.rooms || []).reduce((sum, room) => 
                            sum + room.beds.filter(bed => bed.occupied).length, 0);
                          const freeBeds = totalBeds - occupiedBeds;
                          const totalRooms = (wohnung.rooms || []).length;
                          const freeRooms = (wohnung.rooms || []).filter(room => 
                            room.beds.every(bed => !bed.occupied)).length;
                          
                          // Wenn keine Zimmer/Betten existieren
                          if (totalBeds === 0) return "Verfügbar";
                          
                          // Wenn alle Betten belegt sind
                          if (freeBeds === 0) {
                            return "Vollständig";
                          }
                          
                          // Wenn komplette Zimmer frei sind
                          if (freeRooms > 0 && freeRooms === totalRooms) {
                            return `${freeRooms} Z. frei`;
                          }
                          
                          // Wenn einzelne Betten frei sind
                          if (freeBeds > 0) {
                            return `${freeBeds}B frei`;
                          }
                          
                          return "Frei";
                        }
                        return wohnung.status === "vermietet" ? "Vermietet" : "Renov.";
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-3">
                    <span className="px-3 py-1.5 rounded-lg bg-blue-950/55 border border-blue-700/60 text-blue-200 font-semibold">{wohnung.zimmerzahl || "?"} Zimmer</span>
                    <span className="px-3 py-1.5 rounded-lg bg-violet-950/45 border border-violet-700/60 text-violet-200 font-semibold">{wohnung.quadratmeter || "?"} m²</span>
                    {wohnung.miete && (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-950/35 border border-emerald-600/60 text-emerald-300 font-bold">
                        {formatMoney(parseMoney(wohnung.miete))}€
                      </span>
                    )}
                  </div>
                  
                  {/* Rent Calculation */}
                  {wohnung.status === "vermietet" && wohnung.miete && (
                    <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-emerald-950/25 border border-emerald-700/50">
                      {(() => {
                        const diff = calculateRentDifference(wohnung);
                        const tenantsRent = (wohnung.rooms || []).reduce((sum, room) => {
                          return sum + room.beds.reduce((bedSum, bed) => {
                            return bedSum + parseMoney(bed.rent);
                          }, 0);
                        }, 0);
                        
                        return (
                          <>
                            <span className="text-xs text-emerald-300 font-semibold">Einnahmen:</span>
                            <span className="text-sm font-extrabold text-emerald-300">{formatMoney(tenantsRent)}€</span>
                            {diff !== 0 && (
                              <>
                                <span className="text-xs text-emerald-400">•</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shadow-md ${
                                  diff > 0 ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-700/60' : 'bg-rose-950/40 text-rose-300 border border-rose-700/60'
                                }`}>
                                  {diff > 0 ? "+" : ""}
                                  {formatMoney(diff)}€
                                </span>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Hauptbereich: Detail/Edit - Professionell */}
      <div className={`lg:col-span-2 ${showMobileList && !isEditing && !selectedWohnung ? 'hidden lg:block' : ''}`}>
        {isEditing ? (
          // Edit Form - Modern Design
          <div className="rounded-2xl p-6 space-y-8 shadow-sm" style={{ background: "linear-gradient(180deg, rgba(13,25,46,0.98), rgba(10,19,36,0.98))", border: "1px solid #2f5490" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold" style={{ color: "#eef4ff" }}>
                {selectedWohnung ? "Wohnung bearbeiten" : "Neue Wohnung erstellen"}
              </h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowMobileList(true);
                }}
                className="hover:opacity-100 text-2xl"
                style={{ color: "#93c5fd", opacity: 0.7 }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Grunddaten */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "#c9dbf8" }}>Grunddaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs opacity-60 font-medium">Adresse *</label>
                  <input
                    type="text"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    className="input mt-2 rounded-lg"
                    placeholder="z.B. Musterstraße 123"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 font-medium">Stadt/PLZ *</label>
                  <input
                    type="text"
                    value={stadtplz}
                    onChange={(e) => setStadtplz(e.target.value)}
                    className="input mt-2 rounded-lg"
                    placeholder="z.B. 20095 Hamburg"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 font-medium">Zimmerzahl</label>
                  <input
                    type="text"
                    value={zimmerzahl}
                    onChange={(e) => setZimmerzahl(e.target.value)}
                    className="input mt-2 rounded-lg"
                    placeholder="z.B. 3"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 font-medium">Quadratmeter</label>
                  <input
                    type="text"
                    value={quadratmeter}
                    onChange={(e) => setQuadratmeter(e.target.value)}
                    className="input mt-2 rounded-lg"
                    placeholder="z.B. 85"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 font-medium">Miete (€)</label>
                  <input
                    type="text"
                    value={miete}
                    onChange={(e) => setMiete(e.target.value)}
                    className="input mt-2 rounded-lg"
                    placeholder="z.B. 1200"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 font-medium">Kaution (€)</label>
                  <input
                    type="text"
                    value={kaution}
                    onChange={(e) => setKaution(e.target.value)}
                    className="input mt-2 rounded-lg"
                    placeholder="z.B. 3600"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs opacity-60 font-medium">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="input mt-2 rounded-lg"
                  >
                    <option value="verfügbar">Verfügbar</option>
                    <option value="vermietet">Vermietet</option>
                    <option value="renovierung">Renovierung</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs opacity-60 font-medium">Gmail Label (optional)</label>
                  <input
                    type="text"
                    value={gmailLabel}
                    onChange={(e) => setGmailLabel(e.target.value)}
                    className="input mt-2 rounded-lg"
                    placeholder="z.B. wohnungen/kapellenstrasse-32"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 font-medium">Gmail Query (optional)</label>
                  <input
                    type="text"
                    value={gmailQuery}
                    onChange={(e) => setGmailQuery(e.target.value)}
                    className="input mt-2 rounded-lg"
                    placeholder='z.B. label:wohnungen-k32 OR subject:"Kapellenstraße 32"'
                  />
                </div>
              </div>
            </div>

            {/* Zimmer & Betten Verwaltung */}
              <div className="rounded-xl p-5" style={{ background: "rgba(18,34,59,0.92)", border: "1px solid #3a679f" }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-semibold" style={{ color: "#c9dbf8" }}>Zimmer & Betten</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomManager(true);
                    setEditingRoom(null);
                    setRoomName("");
                    setRoomBeds([{ id: Date.now().toString(), number: 1, occupied: false }]);
                  }}
                  className="action-btn primary rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-2 text-sm font-semibold text-white transition"
                >
                  + Zimmer
                </button>
              </div>

              {showRoomManager && (
                <div className="rounded-lg p-4 mb-4 shadow-sm" style={{ background: "rgba(12,24,44,0.98)", border: "1px solid #3a6090" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold" style={{ color: "#e0f0ff" }}>{editingRoom ? "Zimmer bearbeiten" : "Neues Zimmer"}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoomManager(false);
                        setEditingRoom(null);
                        setRoomName("");
                        setRoomBeds([]);
                      }}
                      className="hover:opacity-100"
                      style={{ color: "#93c5fd", opacity: 0.8 }}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs opacity-60 font-medium">Zimmername</label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="input mt-2 rounded-lg"
                        placeholder="z.B. Zimmer 1"
                      />
                    </div>

                    {/* Room Properties */}
                    <div className="rounded-lg p-3 space-y-3" style={{ background: "rgba(18,34,59,0.85)", border: "1px solid #355d8c" }}>
                      <div>
                        <label className="text-xs opacity-60 font-medium">Kapazität (Personen)</label>
                        <input
                          type="number"
                          value={roomCapacity}
                          onChange={(e) => setRoomCapacity(e.target.value)}
                          className="input mt-2 rounded-lg"
                          placeholder="1"
                          min="1"
                        />
                      </div>
                      
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roomSuitableForCouple}
                          onChange={(e) => setRoomSuitableForCouple(e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm font-medium" style={{ color: "#bfdbfe" }}>Geeignet für Paare</span>
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-xs opacity-60 font-medium flex-1">Betten</label>
                        <button
                          type="button"
                          onClick={addBedToRoom}
                          className="wohnungen-unified-btn text-xs px-2 py-1 rounded"
                          style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", color: "#082032", border: "1px solid rgba(186,230,253,0.95)" }}
                        >
                          + Bett
                        </button>
                      </div>

                      <div className="space-y-3">
                        {roomBeds.map((bed, idx) => (
                          <div key={bed.id} className="rounded-lg p-4" style={{ background: "rgba(18,34,59,0.92)", border: "1px solid #3a6ba8" }}>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-bold" style={{ color: "#e0f0ff" }}>Bett {idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => deleteBed(bed.id)}
                                className="wohnungen-unified-btn text-xs px-2 py-1 rounded"
                                style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", color: "#082032", border: "1px solid rgba(186,230,253,0.95)" }}
                              >
                                🗑️ Löschen
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs opacity-60 font-medium">Mieter Name</label>
                                <input
                                  type="text"
                                  value={bed.tenant || ""}
                                  onChange={(e) => updateBed(bed.id, { 
                                    tenant: e.target.value,
                                    occupied: e.target.value.trim() !== ""
                                  })}
                                  className="input mt-1.5 rounded text-sm"
                                  placeholder="z.B. Max Mustermann"
                                />
                              </div>
                              <div>
                                <label className="text-xs opacity-60 font-medium">Miete pro Monat (€)</label>
                                <input
                                  type="number"
                                  value={bed.rent || ""}
                                  onChange={(e) => updateBed(bed.id, { rent: e.target.value })}
                                  className="input mt-1.5 rounded text-sm"
                                  placeholder="z.B. 400"
                                  step="0.01"
                                />
                              </div>
                              <div>
                                <label className="text-xs opacity-60 font-medium">Einzugsdatum</label>
                                <input
                                  type="date"
                                  value={bed.moveInDate || ""}
                                  onChange={(e) => updateBed(bed.id, { moveInDate: e.target.value })}
                                  className="input mt-1.5 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs opacity-60 font-medium">Auszugsdatum (Optional)</label>
                                <input
                                  type="date"
                                  value={bed.moveOutDate || ""}
                                  onChange={(e) => updateBed(bed.id, { moveOutDate: e.target.value })}
                                  className="input mt-1.5 rounded text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="text-xs opacity-60 font-medium">Notizen (Optional)</label>
                              <input
                                type="text"
                                value={bed.notes || ""}
                                onChange={(e) => updateBed(bed.id, { notes: e.target.value })}
                                className="input mt-1.5 rounded text-sm"
                                placeholder="z.B. Besonderheiten..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={editingRoom ? updateRoom : addRoom}
                      className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition"
                    >
                      {editingRoom ? "Aktualisieren" : "Speichern"}
                    </button>
                  </div>
                </div>
              )}

              {/* Zimmer Liste */}
              <div className="space-y-3">
                {rooms.length === 0 ? (
                  <div className="text-center py-6 text-sm opacity-60">
                    Keine Zimmer angelegt
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="rounded-lg p-3 shadow-sm" style={{ background: "rgba(18,34,59,0.88)", border: "1px solid #355d8c" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DoorOpen className="w-4 h-4" style={{ color: "#7dd3fc", opacity: 0.8 }} />
                          <span className="font-medium" style={{ color: "#e0f0ff" }}>{room.name}</span>
                          <span className="text-xs" style={{ color: "#7dd3fc", opacity: 0.7 }}>({room.beds.length} Betten)</span>
                          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.35)" }}>
                            {room.capacity || 1} Pers.
                          </span>
                          {room.suitableForCouple && (
                            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.35)" }}>
                              👥 Paar
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editRoom(room)}
                            className="wohnungen-unified-btn text-xs px-2 py-1 rounded"
                            style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", color: "#082032", border: "1px solid rgba(186,230,253,0.95)" }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRoom(room.id)}
                            className="wohnungen-unified-btn text-xs px-2 py-1 rounded"
                            style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", color: "#082032", border: "1px solid rgba(186,230,253,0.95)" }}
                          >
                            Del
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {room.beds.map((bed, idx) => (
                          <button
                            key={bed.id}
                            onClick={() => {
                              setSelectedBed(bed);
                              setSelectedBedContext({ roomId: room.id, bedId: bed.id });
                              setShowBedDetail(true);
                            }}
                            className="rounded-lg p-2 text-left transition hover:scale-105"
                            style={{
                              background: bed.occupied
                                ? "linear-gradient(135deg, #7dd3fc, #38bdf8)"
                                : "linear-gradient(135deg, #6ee7b7, #34d399)",
                              border: bed.occupied
                                ? "1px solid rgba(186,230,253,0.95)"
                                : "1px solid rgba(110,231,183,0.95)",
                              color: "#082032"
                            }}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <Bed className="w-3 h-3" style={{ color: "#082032" }} />
                              <span className="font-bold" style={{ color: "#082032" }}>B{idx + 1}</span>
                            </div>
                            {bed.tenant && <div className="text-xs font-semibold" style={{ color: "#082032" }}>{bed.tenant}</div>}
                            {bed.rent && <div className="text-xs font-bold" style={{ color: "#082032" }}>{formatMoney(parseMoney(bed.rent))}€</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Mieterdaten */}
            {status === "vermietet" && (
              <div className="rounded-xl p-4" style={{ background: "rgba(18,34,59,0.92)", border: "1px solid #3a679f" }}>
                <h3 className="text-base font-semibold mb-4" style={{ color: "#c9dbf8" }}>Mieterdaten</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs opacity-60 font-medium">Aktueller Mieter</label>
                    <input
                      type="text"
                      value={aktuellerMieter}
                      onChange={(e) => setAktuellerMieter(e.target.value)}
                      className="input mt-2 rounded-lg"
                      placeholder="Name des Mieters"
                    />
                  </div>
                  <div>
                    <label className="text-xs opacity-60 font-medium">Mietbeginn</label>
                    <input
                      type="date"
                      value={mietbeginn}
                      onChange={(e) => setMietbeginn(e.target.value)}
                      className="input mt-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs opacity-60 font-medium">Mietende</label>
                    <input
                      type="date"
                      value={mietende}
                      onChange={(e) => setMietende(e.target.value)}
                      className="input mt-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notizen */}
            <div>
              <h3 className="text-base font-semibold mb-4" style={{ color: "#c9dbf8" }}>Notizen</h3>
              <textarea
                value={notizen}
                onChange={(e) => setNotizen(e.target.value)}
                className="input rounded-lg min-h-[100px]"
                placeholder="Zusätzliche Informationen..."
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4" style={{ borderTop: "1px solid #2f5490" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 action-btn primary rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {saving ? "Speichert..." : "💾 Speichern"}
              </button>
              {selectedWohnung && (
                <button
                  onClick={() => handleDelete(selectedWohnung)}
                  className="rounded-lg action-btn rounded-lg bg-red-600 hover:bg-red-700 px-4 py-3 text-sm font-semibold text-white transition"
                >
                  🗑️ Löschen
                </button>
              )}
            </div>
          </div>
        ) : selectedWohnung ? (
          // Detail View - Professional
          <div className="wohnungen-detail-panel rounded-2xl bg-slate-950/80 border border-blue-900/60 p-6 space-y-6 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.9)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <button
                  onClick={() => setShowMobileList(true)}
                  className="lg:hidden text-sm text-blue-400 hover:text-blue-300 mb-3 transition"
                >
                  ← Zurück
                </button>
                <h2
                  className="wohnungen-detail-title text-4xl font-bold text-blue-100"
                  style={{ color: "#eef4ff", textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}
                >
                  {selectedWohnung.adresse || selectedWohnung.address || "—"}
                </h2>
                <p className="text-base mt-2 font-medium text-blue-300/90" style={{ color: "#c9dbf8" }}>
                  {selectedWohnung.stadtplz || "—"}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {canManageProperties && (
                  <button
                    onClick={() => handleEdit(selectedWohnung)}
                    className="action-btn primary wohnungen-unified-btn rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #59c8ff, #3b82f6)",
                      color: "#082032",
                      border: "1px solid rgba(147, 197, 253, 0.9)",
                      boxShadow: "0 12px 24px rgba(24, 119, 242, 0.28)"
                    }}
                  >
                    ✎ Bearbeiten
                  </button>
                )}
                <button
                  onClick={() => handleDownloadPDF(selectedWohnung)}
                  className="action-btn pdf-action-btn rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #7dd3fc, #38bdf8)",
                    color: "#082032",
                    border: "1px solid rgba(186, 230, 253, 0.95)",
                    boxShadow: "0 12px 24px rgba(14, 116, 144, 0.28)"
                  }}
                >
                  <Download size={16} />
                  PDF
                </button>
                {canManageProperties && (
                  <button
                    onClick={() => handleDelete(selectedWohnung)}
                    className="action-btn rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #69c8ff, #58b9f4)",
                      color: "#0b2235",
                      border: "1px solid rgba(191, 219, 254, 0.92)",
                      boxShadow: "0 12px 24px rgba(34, 139, 230, 0.25)"
                    }}
                  >
                    🗑️ Löschen
                  </button>
                )}
              </div>
            </div>

            {/* Status Badge - Premium Style with Click to Scroll */}
            {(() => {
              const totalBeds = (selectedWohnung.rooms || []).reduce((sum, room) => sum + room.beds.length, 0);
              const occupiedBeds = (selectedWohnung.rooms || []).reduce((sum, room) => 
                sum + room.beds.filter(bed => bed.occupied).length, 0);
              const freeBeds = totalBeds - occupiedBeds;
              const totalRooms = (selectedWohnung.rooms || []).length;
              const freeRooms = (selectedWohnung.rooms || []).filter(room => 
                room.beds.every(bed => !bed.occupied)).length;
              
              let statusText = "";
              let statusIcon = "";
              let badgeBackground = "";
              let badgeBorder = "";
              let badgeText = "";
              let badgeShadow = "";
              let isClickable = false;
              let isFreeStatus = false;
              let isFullyOccupiedStatus = false;
              
              if (selectedWohnung.status === "verfügbar") {
                if (totalBeds === 0) {
                  statusText = "Verfügbar";
                  statusIcon = "🏠";
                  badgeBackground = "linear-gradient(135deg, rgba(41, 76, 120, 0.96), rgba(28, 55, 92, 0.96))";
                  badgeBorder = "rgba(110, 168, 255, 0.72)";
                  badgeText = "#dcedff";
                  badgeShadow = "0 12px 24px rgba(17, 44, 79, 0.36)";
                } else if (freeBeds === 0) {
                  statusText = "Vollständig belegt";
                  statusIcon = "🔒";
                  badgeBackground = "linear-gradient(135deg, #7dd3fc, #38bdf8)";
                  badgeBorder = "rgba(186, 230, 253, 0.95)";
                  badgeText = "#082032";
                  badgeShadow = "0 12px 24px rgba(14, 116, 144, 0.28)";
                  isFullyOccupiedStatus = true;
                } else if (freeRooms > 0 && freeRooms === totalRooms) {
                  statusText = `${freeRooms} Zimmer frei`;
                  statusIcon = "🚪";
                  badgeBackground = "linear-gradient(135deg, rgba(39, 92, 156, 0.96), rgba(27, 65, 121, 0.96))";
                  badgeBorder = "rgba(125, 211, 252, 0.76)";
                  badgeText = "#082032";
                  badgeShadow = "0 12px 24px rgba(8, 47, 73, 0.34)";
                  isClickable = true;
                  isFreeStatus = true;
                } else if (freeBeds > 0) {
                  statusText = `${freeBeds} Bett${freeBeds > 1 ? 'en' : ''} frei`;
                  statusIcon = "🛏️";
                  badgeBackground = "linear-gradient(135deg, rgba(74, 181, 255, 0.96), rgba(51, 133, 226, 0.96))";
                  badgeBorder = "rgba(191, 219, 254, 0.92)";
                  badgeText = "#082032";
                  badgeShadow = "0 14px 28px rgba(24, 119, 242, 0.34)";
                  isClickable = true;
                  isFreeStatus = true;
                } else {
                  statusText = "Verfügbar";
                  statusIcon = "✓";
                  badgeBackground = "linear-gradient(135deg, rgba(41, 76, 120, 0.96), rgba(28, 55, 92, 0.96))";
                  badgeBorder = "rgba(110, 168, 255, 0.72)";
                  badgeText = "#dcedff";
                  badgeShadow = "0 12px 24px rgba(17, 44, 79, 0.36)";
                }
              } else if (selectedWohnung.status === "vermietet") {
                statusText = "Vermietet";
                statusIcon = "🔑";
                badgeBackground = "linear-gradient(135deg, rgba(84, 72, 160, 0.96), rgba(62, 48, 131, 0.96))";
                badgeBorder = "rgba(165, 180, 252, 0.78)";
                badgeText = "#eef2ff";
                badgeShadow = "0 12px 24px rgba(49, 46, 129, 0.34)";
              } else {
                statusText = "In Renovierung";
                statusIcon = "🔧";
                badgeBackground = "linear-gradient(135deg, rgba(147, 51, 234, 0.95), rgba(99, 102, 241, 0.95))";
                badgeBorder = "rgba(196, 181, 253, 0.82)";
                badgeText = "#f5f3ff";
                badgeShadow = "0 12px 24px rgba(91, 33, 182, 0.34)";
              }
              
              const handleClick = () => {
                if (!isClickable) return;
                
                // Find first free bed or room
                const rooms = selectedWohnung.rooms || [];
                for (let i = 0; i < rooms.length; i++) {
                  const room = rooms[i];
                  const freeBed = room.beds.find(bed => !bed.occupied);
                  if (freeBed) {
                    // Scroll to the rooms section
                    const roomsSection = document.querySelector('.wohnungen-rooms-block');
                    if (roomsSection) {
                      roomsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      
                      // Highlight the free bed briefly
                      setTimeout(() => {
                        const allBedButtons = Array.from(document.querySelectorAll('.wohnungen-room-card button'));
                        const bedIndex = room.beds.indexOf(freeBed);
                        if (allBedButtons[bedIndex]) {
                          allBedButtons[bedIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                          allBedButtons[bedIndex].classList.add('ring-4', 'ring-purple-400', 'animate-pulse');
                          setTimeout(() => {
                            allBedButtons[bedIndex].classList.remove('ring-4', 'ring-purple-400', 'animate-pulse');
                          }, 2000);
                        }
                      }, 500);
                    }
                    break;
                  }
                }
              };
              
              return (
                <button
                  onClick={handleClick}
                  disabled={!isClickable}
                  className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-200 ${isFreeStatus ? 'status-pill-btn-free' : ''} ${isFullyOccupiedStatus ? 'status-pill-btn-full' : ''} ${
                    isClickable ? 'hover:scale-105 hover:shadow-xl cursor-pointer hover:border-opacity-100' : 'cursor-default'
                  }`}
                  style={{
                    background: badgeBackground,
                    border: `1px solid ${badgeBorder}`,
                    boxShadow: badgeShadow,
                    color: badgeText
                  }}
                >
                  <span className="text-2xl">{statusIcon}</span>
                  <span className="status-pill-text font-bold text-base tracking-wide" style={{ color: badgeText }}>
                    {statusText}
                  </span>
                  {isClickable && (
                    <span className="status-pill-hint text-xs ml-1" style={{ color: badgeText, opacity: 0.82 }}>👆</span>
                  )}
                </button>
              );
            })()}

            {/* Rent Overview */}
            {selectedWohnung.miete && (
              <div className="wohnungen-block rounded-xl bg-slate-900/70 border border-blue-900/60 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-200 mb-4 uppercase tracking-wide">Mietübersicht</h3>
                {(() => {
                  const totalRent = parseMoney(selectedWohnung.miete);
                  const tenantsRent = (selectedWohnung.rooms || []).reduce((sum, room) => {
                    return sum + room.beds.reduce((bedSum, bed) => {
                      return bedSum + parseMoney(bed.rent);
                    }, 0);
                  }, 0);
                  const diff = tenantsRent - totalRent;
                  
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl p-4 transition-all bg-slate-900/85 border border-blue-500/50 shadow-xl" style={{ background: "linear-gradient(180deg, rgba(17, 34, 59, 0.96), rgba(12, 25, 44, 0.96))", borderColor: "rgba(125, 211, 252, 0.7)", boxShadow: "0 14px 28px rgba(4, 28, 58, 0.34)" }}>
                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-300" style={{ color: "#9fd4ff" }}>Gesamtmiete</div>
                        <div className="text-3xl font-bold mt-2 text-blue-100" style={{ color: "#e8f3ff" }}>{formatMoney(totalRent)}€</div>
                      </div>
                      <div className="rounded-xl p-4 transition-all bg-slate-900/85 border border-emerald-500/50 shadow-xl" style={{ background: "linear-gradient(180deg, rgba(17, 34, 59, 0.96), rgba(12, 25, 44, 0.96))", borderColor: "rgba(74, 222, 128, 0.62)", boxShadow: "0 14px 28px rgba(4, 28, 58, 0.34)" }}>
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300" style={{ color: "#7ef0c0" }}>Einnahmen</div>
                        <div className="text-3xl font-bold mt-2 text-emerald-300" style={{ color: "#7ef0c0" }}>{formatMoney(tenantsRent)}€</div>
                      </div>
                      <div className={`rounded-xl p-4 transition-all border-2 shadow-xl ${
                        diff > 0 
                          ? 'bg-slate-900/85 border-emerald-500/60'
                          : 'bg-slate-900/85 border-rose-500/60'
                      }`} style={{
                        background: "linear-gradient(180deg, rgba(17, 34, 59, 0.96), rgba(12, 25, 44, 0.96))",
                        borderColor: diff > 0 ? "rgba(74, 222, 128, 0.62)" : "rgba(251, 113, 133, 0.72)",
                        boxShadow: "0 14px 28px rgba(4, 28, 58, 0.34)"
                      }}>
                        <div className={`text-xs font-semibold uppercase tracking-wider ${
                          diff > 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`} style={{ color: diff > 0 ? "#7ef0c0" : "#ff9ab0" }}>
                          Differenz
                        </div>
                        <div className={`text-3xl font-bold mt-2 ${
                          diff > 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`} style={{ color: diff > 0 ? "#7ef0c0" : "#ff9ab0" }}>
                          {diff > 0 ? "+" : ""}
                          {formatMoney(diff)}€
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Open Payments for Selected Property */}
            {(() => {
              const openPaymentsForProperty = getOpenPaymentsForWohnung(selectedWohnung);
              if (openPaymentsForProperty.length === 0) return null;
              
              return (
                <div
                  className="wohnungen-alert-block rounded-xl border p-4 shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(127, 29, 29, 0.35), rgba(136, 19, 55, 0.28))",
                    borderColor: "rgba(252, 165, 165, 0.45)",
                    boxShadow: "0 0 0 1px rgba(248, 113, 113, 0.25), 0 12px 28px rgba(127, 29, 29, 0.35)"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowOpenPaymentsDetails((prev) => !prev)}
                    className="w-full text-left flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 bg-red-600 hover:bg-red-700 border border-red-500 transition wohnungen-unified-btn offene-mieten-btn"
                    style={{
                      color: "#082032",
                      background: "linear-gradient(135deg, rgba(103, 36, 36, 0.96), rgba(127, 29, 29, 0.96))",
                      borderColor: "rgba(252, 165, 165, 0.55)",
                      boxShadow: "0 10px 24px rgba(127, 29, 29, 0.3)"
                    }}
                  >
                    <div className="text-lg font-semibold flex items-center gap-2" style={{ color: "#082032" }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Offene Mieten ({openPaymentsForProperty.length})
                    </div>
                    <div className="text-sm font-semibold" style={{ color: "#082032" }}>
                      {showOpenPaymentsDetails ? "Liste ausblenden ▲" : "Liste anzeigen ▼"}
                    </div>
                  </button>

                  {showOpenPaymentsDetails && (
                    <div className="space-y-2.5 mt-3 rounded-lg border p-2.5" style={{ borderColor: "rgba(252, 165, 165, 0.35)", background: "rgba(127, 29, 29, 0.18)" }}>
                      {openPaymentsForProperty.map((payment, idx) => (
                        <div key={idx} className={`wohnungen-alert-item flex items-center justify-between p-4 rounded-lg border transition-all ${
                          payment.isOverdue 
                            ? 'is-overdue bg-red-600/20 border-red-400/50 shadow-lg shadow-red-600/20' 
                            : 'bg-orange-600/15 border-orange-400/40'
                        }`}>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-slate-100 flex items-center gap-2" style={{ color: "#ffffff" }}>
                              {payment.tenantName}
                              {payment.isOverdue && (
                                <span className="text-xs bg-red-600 text-red-100 px-2.5 py-1 rounded font-bold">
                                  ÜBERFÄLLIG
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 mt-1.5">
                              {payment.roomName} • Bett {payment.bedNumber}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {new Date(payment.year, payment.month - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                              <span> • Fällig bis 03.</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className={`font-bold text-lg ${payment.isOverdue ? 'text-red-300' : 'text-orange-300'}`}>
                              {formatMoney(payment.openAmount)}€
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                markOpenPaymentAsPaid({
                                  roomId: payment.roomId,
                                  bedId: payment.bedId,
                                  month: payment.month,
                                  year: payment.year,
                                  tenantName: payment.tenantName,
                                })
                              }
                              className="mt-2 rounded-md border border-white/30 bg-green-700 hover:bg-green-800 px-3.5 py-2 text-sm font-bold leading-none tracking-wide transition"
                              style={{ color: "#ffffff" }}
                            >
                              Als bezahlt markieren
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Property E-Mails (Gmail) */}
            <div
              className="wohnungen-block rounded-2xl border p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.65)]"
              style={{ background: "linear-gradient(180deg, rgba(13,27,49,0.96), rgba(10,20,38,0.96))", borderColor: "#325b93" }}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-wide">E-Mails (Gmail)</h3>
                <button
                  type="button"
                  onClick={() => setEmailsReloadTick((v) => v + 1)}
                  className="action-btn wohnungen-unified-btn text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", color: "#082032", border: "1px solid rgba(186,230,253,0.95)" }}
                >
                  Aktualisieren
                </button>
              </div>

              {emailsLoading && (
                <div className="text-sm" style={{ color: "#bfdbfe" }}>
                  E-Mails werden geladen...
                </div>
              )}

              {emailsError && (
                <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "rgba(251,113,133,0.5)", color: "#fecdd3", background: "rgba(127,29,29,0.28)" }}>
                  {emailsError}
                </div>
              )}

              {!emailsLoading && !emailsError && propertyEmails.length === 0 && (
                <div className="text-sm" style={{ color: "#93c5fd" }}>
                  Keine E-Mails für diese Wohnung gefunden.
                </div>
              )}

              {!emailsLoading && !emailsError && propertyEmails.length > 0 && (
                <div className="space-y-3">
                  {propertyEmails.map((mail) => (
                    <div
                      key={mail.id}
                      className="rounded-xl border p-3"
                      style={{ background: "rgba(18,34,59,0.9)", borderColor: "#3a679f" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate" style={{ color: "#eef4ff" }}>{mail.subject}</div>
                          <div className="text-xs truncate mt-1" style={{ color: "#93c5fd" }}>{mail.from || "Unbekannt"}</div>
                        </div>
                        <div className="text-xs text-right whitespace-nowrap" style={{ color: "#bfdbfe" }}>
                          {mail.ts ? new Date(mail.ts).toLocaleString("de-DE") : (mail.date || "")}
                        </div>
                      </div>
                      {mail.snippet && (
                        <div className="text-sm mt-2" style={{ color: "#cfe2ff" }}>{mail.snippet}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wohnungsinfo */}
            <div
              className="wohnungen-block rounded-2xl bg-slate-900/70 border border-blue-900/60 p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.65)]"
              style={{ background: "linear-gradient(180deg, rgba(13,27,49,0.96), rgba(10,20,38,0.96))", borderColor: "#325b93" }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-wide">Wohnungsinformationen</h3>
                <span className="text-xs text-blue-300/80 font-medium">Übersicht</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="wohnungen-info-tile rounded-xl p-4 border border-blue-900/60 bg-slate-900/70 shadow-sm" style={{ background: "rgba(18,34,59,0.92)", borderColor: "#3a679f" }}>
                  <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Zimmerzahl</div>
                  <div className="font-extrabold text-blue-100 mt-2 text-2xl">{selectedWohnung.zimmerzahl || "—"}</div>
                </div>
                <div className="wohnungen-info-tile rounded-xl p-4 border border-blue-900/60 bg-slate-900/70 shadow-sm" style={{ background: "rgba(18,34,59,0.92)", borderColor: "#3a679f" }}>
                  <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Quadratmeter</div>
                  <div className="font-extrabold text-blue-100 mt-2 text-2xl">{selectedWohnung.quadratmeter ? `${selectedWohnung.quadratmeter} m²` : "—"}</div>
                </div>
                <div className="wohnungen-info-tile tile-success rounded-xl p-4 border border-emerald-500/45 bg-emerald-950/40 shadow-sm" style={{ background: "rgba(8,62,50,0.58)", borderColor: "#2bb887" }}>
                  <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Miete</div>
                  <div className="font-extrabold text-emerald-300 mt-2 text-2xl">{selectedWohnung.miete ? `${formatMoney(parseMoney(selectedWohnung.miete))} €` : "—"}</div>
                </div>
                <div className="wohnungen-info-tile tile-info rounded-xl p-4 border border-cyan-500/45 bg-cyan-950/30 shadow-sm" style={{ background: "rgba(9,53,76,0.52)", borderColor: "#43b8e7" }}>
                  <div className="text-xs text-cyan-300 font-semibold uppercase tracking-wider">Kaution</div>
                  <div className="font-extrabold text-cyan-300 mt-2 text-2xl">{selectedWohnung.kaution ? `${formatMoney(parseMoney(selectedWohnung.kaution))} €` : "—"}</div>
                </div>
              </div>
            </div>

            {/* Mieterinfo */}
            {selectedWohnung.status === "vermietet" && (
              <div className="wohnungen-block mieter-block rounded-xl bg-slate-900/70 border border-violet-700/40 p-6 shadow-sm" style={{ background: "linear-gradient(180deg, rgba(22,29,64,0.94), rgba(17,24,51,0.94))", borderColor: "#5a5db1" }}>
                <h3 className="text-sm font-semibold text-violet-300 mb-4 uppercase tracking-wide">Mieterinformationen</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="wohnungen-info-tile mieter-tile col-span-2 bg-violet-950/35 rounded-lg p-3.5 border border-violet-700/50" style={{ background: "rgba(53,38,95,0.5)", borderColor: "#6d63c8" }}>
                    <div className="text-xs text-violet-300 font-semibold uppercase tracking-wider">Aktueller Mieter</div>
                    <div className="font-bold text-violet-200 mt-2">{selectedWohnung.aktuellerMieter || "—"}</div>
                  </div>
                  <div className="wohnungen-info-tile mieter-tile bg-violet-950/35 rounded-lg p-3.5 border border-violet-700/50" style={{ background: "rgba(53,38,95,0.5)", borderColor: "#6d63c8" }}>
                    <div className="text-xs text-violet-300 font-semibold uppercase tracking-wider">Mietbeginn</div>
                    <div className="font-bold text-violet-200 mt-2">{selectedWohnung.mietbeginn || "—"}</div>
                  </div>
                  <div className="wohnungen-info-tile mieter-tile bg-violet-950/35 rounded-lg p-3.5 border border-violet-700/50" style={{ background: "rgba(53,38,95,0.5)", borderColor: "#6d63c8" }}>
                    <div className="text-xs text-violet-300 font-semibold uppercase tracking-wider">Mietende</div>
                    <div className="font-bold text-violet-200 mt-2">{selectedWohnung.mietende || "—"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Notizen */}
            {selectedWohnung.notizen && (
              <div className="wohnungen-block notes-block rounded-xl bg-slate-900/70 border border-amber-600/40 p-6 shadow-sm" style={{ background: "linear-gradient(180deg, rgba(54,40,16,0.46), rgba(39,31,15,0.46))", borderColor: "#c08b2f" }}>
                <h3 className="text-sm font-semibold text-amber-300 mb-3 uppercase tracking-wide">📝 Notizen</h3>
                <div className="text-sm text-amber-100 whitespace-pre-wrap leading-relaxed">{selectedWohnung.notizen}</div>
              </div>
            )}

            {/* Zimmer & Betten */}
            {selectedWohnung.rooms && selectedWohnung.rooms.length > 0 && (
              <div className="wohnungen-rooms-block rounded-2xl bg-slate-900/70 border border-blue-900/60 p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.75)]" style={{ background: "linear-gradient(180deg, rgba(14,28,52,0.96), rgba(10,21,39,0.96))", borderColor: "#325b93" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-wide">🛏️ Zimmer & Betten</h3>
                  <span className="text-xs text-blue-300/80 font-semibold">{selectedWohnung.rooms.length} Zimmer</span>
                </div>
                <div className="space-y-4">
                  {selectedWohnung.rooms.map((room) => (
                    <div key={room.id} className="wohnungen-room-card rounded-xl bg-slate-900/80 border border-blue-900/60 p-4 hover:border-blue-700 transition-all shadow-sm" style={{ background: "rgba(18,34,59,0.9)", borderColor: "#3a679f" }}>
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <DoorOpen className="w-5 h-5 text-blue-300" />
                        <span className="font-bold text-blue-100 text-base">{room.name}</span>
                        <span className="text-xs text-cyan-200 bg-slate-800 px-2.5 py-1.5 rounded-lg font-semibold border border-cyan-700/50">({room.beds.length} Betten)</span>
                        <span className="text-xs text-blue-200 bg-slate-800 px-2.5 py-1.5 rounded-lg font-bold border border-blue-700/60">
                          👥 {room.capacity || 1} Pers.
                        </span>
                        {room.suitableForCouple && (
                          <span className="text-xs text-violet-200 bg-violet-900/40 px-2.5 py-1.5 rounded-lg font-bold border border-violet-700/60">
                            💑 Paar
                          </span>
                        )}
                        {canManageProperties && (
                          <button
                            type="button"
                            onClick={() => editRoomFromDetail(room)}
                            className="ml-auto action-btn wohnungen-unified-btn text-xs font-semibold px-2.5 py-1 rounded-md bg-cyan-500/90 text-slate-900 border border-cyan-300 hover:bg-cyan-400 transition"
                          >
                            ✎ Zimmer bearbeiten
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {room.beds.map((bed, idx) => {
                          const tenantName = bed.tenant || "";
                          const tenantNameLower = tenantName.toLowerCase();
                          const isSearchMatch =
                            normalizedSearchTerm.length > 0 &&
                            tenantNameLower.includes(normalizedSearchTerm);
                          const matchStart = isSearchMatch
                            ? tenantNameLower.indexOf(normalizedSearchTerm)
                            : -1;
                          const matchEnd =
                            matchStart >= 0
                              ? matchStart + normalizedSearchTerm.length
                              : -1;

                          return (
                          <div
                            key={bed.id}
                            role="button"
                            tabIndex={0}
                            data-search-match={isSearchMatch ? "true" : "false"}
                            onClick={() => {
                              setSelectedBed(bed);
                              setSelectedBedContext({ roomId: room.id, bedId: bed.id });
                              setShowBedDetail(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedBed(bed);
                                setSelectedBedContext({ roomId: room.id, bedId: bed.id });
                                setShowBedDetail(true);
                              }
                            }}
                            className={`wohnungen-bed-card rounded-xl p-3 text-left transition hover:scale-[1.015] border shadow-sm cursor-pointer ${
                              bed.occupied
                                ? "is-occupied bg-slate-800/80 border-blue-700/60 hover:border-blue-500"
                                : "is-free bg-emerald-900/30 border-emerald-600/60 hover:border-emerald-500"
                            } ${
                              isSearchMatch ? "ring-4 ring-fuchsia-400 border-fuchsia-500 shadow-xl shadow-fuchsia-200" : ""
                            }`}
                            style={
                              bed.occupied
                                ? {
                                    background: "linear-gradient(135deg, rgba(30,58,138,0.35) 0%, rgba(30,41,59,0.8) 100%)",
                                    borderColor: "rgba(96, 165, 250, 0.6)",
                                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.35)",
                                  }
                                : {
                                    background: "linear-gradient(135deg, rgba(6,95,70,0.35) 0%, rgba(15,23,42,0.8) 100%)",
                                    borderColor: "rgba(74, 222, 128, 0.65)",
                                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.35)",
                                  }
                            }
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              <Bed className={`w-3.5 h-3.5 ${bed.occupied ? "text-blue-300" : "text-emerald-300"}`} />
                              <span className={`font-bold px-2 py-0.5 rounded-md text-xs border ${bed.occupied ? 'bg-blue-900/60 text-blue-200 border-blue-700/70' : 'bg-emerald-900/50 text-emerald-200 border-emerald-700/70'}`}>{bed.occupied ? 'Belegt' : 'Frei'}</span>
                              {canManageProperties && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editBedFromDetail(room);
                                  }}
                                  className="ml-auto action-btn ghost wohnungen-unified-btn text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/90 text-slate-900 border border-cyan-300 hover:bg-cyan-400 transition"
                                >
                                  ✎ Bett bearbeiten
                                </button>
                              )}
                            </div>
                            {bed.tenant && (
                              <div className="space-y-1 mt-2 border-t border-blue-900/60 pt-2 wohnungen-bed-meta">
                                <div className="font-semibold text-blue-100" style={{ color: "#ffffff" }}>
                                  {isSearchMatch && matchStart >= 0 ? (
                                    <>
                                      {tenantName.slice(0, matchStart)}
                                      <span className="bg-fuchsia-500/80 text-white px-1 rounded font-bold">
                                        {tenantName.slice(matchStart, matchEnd)}
                                      </span>
                                      {tenantName.slice(matchEnd)}
                                    </>
                                  ) : (
                                    tenantName
                                  )}
                                </div>
                                {bed.rent && <div className="text-emerald-300 font-bold" style={{ color: "#ffffff" }}>{formatMoney(parseMoney(bed.rent))}€</div>}
                                {bed.moveOutDate && (
                                  <div className="text-amber-300 text-[10px] mt-1 font-medium">
                                    📤 Auszug: {bed.moveOutDate}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Empty State
          <div className="rounded-2xl bg-slate-900/75 border border-blue-900/60 p-12 text-center flex flex-col items-center justify-center min-h-[500px] shadow-sm">
            <button
              onClick={() => setShowMobileList(true)}
              className="lg:hidden text-sm text-blue-300 hover:text-blue-200 mb-6"
            >
              ← Zurück
            </button>
            <div className="text-7xl mb-6">🏢</div>
            <h3 className="text-2xl font-bold mb-2 text-blue-100">
              Wohnung auswählen
            </h3>
            <p className="text-sm text-blue-200/80 mb-8 max-w-sm">
              Wählen Sie eine Wohnung aus der Liste oder erstellen Sie eine neue
            </p>
            <button
              onClick={handleNew}
              className="rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-6 py-3 text-sm font-semibold text-white transition shadow-lg"
            >
              + Neue Wohnung
            </button>
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Tenant Payment Detail Modal */}
      {showBedDetail && selectedBed && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: "linear-gradient(180deg, rgba(13,25,46,0.99), rgba(10,19,36,0.99))", border: "1px solid #2f5490", boxShadow: "0 30px 60px rgba(0,0,0,0.7)" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "#ffffff" }}>{selectedBed.tenant || "Mieter"}</h2>
                <p className="text-sm mt-1" style={{ color: "#93c5fd" }}>Miete: {formatMoney(parseMoney(selectedBed.rent))}€/Monat</p>
              </div>
              <button
                onClick={() => {
                  setShowBedDetail(false);
                  setSelectedBed(null);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-xl font-bold transition hover:scale-110"
                style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", color: "#082032", border: "1px solid rgba(186,230,253,0.95)" }}
              >
                ✕
              </button>
            </div>

            {/* Dates Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {selectedBed.moveInDate && (
                <div className="rounded-lg p-4" style={{ background: "rgba(18,34,59,0.92)", border: "1px solid #3a679f" }}>
                  <div className="text-xs font-medium" style={{ color: "#93c5fd" }}>📅 Einzugsdatum</div>
                  <div className="text-lg font-semibold mt-2" style={{ color: "#ffffff" }}>{selectedBed.moveInDate}</div>
                </div>
              )}
              {selectedBed.moveOutDate && (
                <div className="rounded-lg p-4" style={{ background: "rgba(18,34,59,0.92)", border: "1px solid rgba(251,146,60,0.5)" }}>
                  <div className="text-xs font-medium" style={{ color: "#fb923c" }}>📤 Auszugsdatum</div>
                  <div className="text-lg font-semibold mt-2" style={{ color: "#ffffff" }}>{selectedBed.moveOutDate}</div>
                </div>
              )}
            </div>

            {/* Move Out Button */}
            {selectedBed.tenant && !selectedBed.moveOutDate && (
              <button
                onClick={() => setShowMoveOutModal(true)}
                className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition mb-6 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", color: "#082032", border: "1px solid rgba(186,230,253,0.95)", boxShadow: "0 8px 20px rgba(14,116,144,0.25)" }}
              >
                📤 Auszug eintragen
              </button>
            )}

            {/* Button to show calendar */}
            <button
              onClick={() => setShowPaymentCalendar(!showPaymentCalendar)}
              className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition mb-6 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", color: "#082032", border: "1px solid rgba(186,230,253,0.95)", boxShadow: "0 8px 20px rgba(14,116,144,0.25)" }}
            >
              📅 {showPaymentCalendar ? 'Kalender ausblenden' : 'Zahlungskalender öffnen'}
            </button>

            {/* Payment History */}
            {showPaymentCalendar && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-6 text-center" style={{ color: "#e6f0ff" }}>📅 Zahlungskalender</h3>
                {unsavedPaymentChanges && (
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                      onClick={() => savePaymentChanges()}
                      disabled={saving}
                      style={{ backgroundColor: '#065f46', color: '#ffffff', opacity: 1 }}
                      className="rounded-lg hover:bg-emerald-800 text-white px-4 py-2 font-semibold shadow-lg min-w-[180px] whitespace-nowrap inline-flex items-center justify-center gap-2"
                    >
                      <span className="text-lg leading-none" style={{ color: '#ffffff', opacity: 1 }}>💾</span>
                      <span style={{ color: '#ffffff', opacity: 1 }}>Änderungen speichern</span>
                    </button>
                    <button
                      onClick={() => cancelPaymentChanges()}
                      disabled={saving}
                      style={{ backgroundColor: '#0f172a', color: '#ffffff', opacity: 1 }}
                      className="rounded-lg hover:bg-slate-700 text-white px-4 py-2 font-semibold border border-white/10 min-w-[120px] whitespace-nowrap inline-flex items-center justify-center gap-2"
                    >
                      <span className="text-lg leading-none" style={{ color: '#ffffff', opacity: 1 }}>↺</span>
                      <span style={{ color: '#ffffff', opacity: 1 }}>Abbrechen</span>
                    </button>
                  </div>
                )}
                {selectedBed.moveInDate && selectedBed.rent ? (
                  <div>
                    {/* Gruppiere Payments nach Jahr */}
                    {(() => {
                      const payments = selectedBed.payments || generatePayments(selectedBed.moveInDate, selectedBed.rent, selectedBed.moveOutDate);
                      const paymentsByYear = payments.reduce((acc, payment) => {
                        if (!acc[payment.year]) acc[payment.year] = [];
                        acc[payment.year].push(payment);
                        return acc;
                      }, {} as Record<number, typeof payments>);
                      
                      return Object.entries(paymentsByYear).map(([year, yearPayments]) => (
                        <div key={year} className="mb-8">
                          <h4 className="text-lg font-bold mb-4 text-center" style={{ color: "#93c5fd", opacity: 0.95 }}>{year}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {yearPayments.map((payment) => {
                              const monthName = new Date(payment.year, payment.month - 1).toLocaleDateString('de-DE', { month: 'long' });
                              const monthShort = new Date(payment.year, payment.month - 1).toLocaleDateString('de-DE', { month: 'short' });
                              const today = new Date();
                              const paymentDate = new Date(payment.year, payment.month - 1);
                              const isPast = paymentDate < new Date(today.getFullYear(), today.getMonth());
                              const isCurrent = paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
                              const isOverdue = !payment.paid && isPast;
                              
                              return (
                                <button
                                  key={`${payment.year}-${payment.month}`}
                                  onClick={() => togglePayment(payment.month, payment.year)}
                                  className="rounded-xl p-4 flex flex-col items-center justify-center transition border-2 cursor-pointer"
                                  style={{
                                    background: payment.paid
                                      ? "linear-gradient(180deg, rgba(8,62,50,0.72), rgba(7,49,41,0.72))"
                                      : isOverdue
                                      ? "linear-gradient(180deg, rgba(95,24,37,0.72), rgba(67,18,28,0.72))"
                                      : isCurrent
                                      ? "linear-gradient(180deg, rgba(31,64,104,0.72), rgba(20,44,76,0.72))"
                                      : "linear-gradient(180deg, rgba(18,34,59,0.78), rgba(13,26,46,0.78))",
                                    border: payment.paid
                                      ? "1px solid rgba(52,211,153,0.6)"
                                      : isOverdue
                                      ? "1px solid rgba(251,113,133,0.55)"
                                      : isCurrent
                                      ? "1px solid rgba(125,211,252,0.55)"
                                      : "1px solid rgba(148,163,184,0.35)",
                                    boxShadow: payment.paid
                                      ? "0 10px 24px rgba(6,78,59,0.24)"
                                      : isOverdue
                                      ? "0 10px 24px rgba(136,19,55,0.24)"
                                      : "0 10px 24px rgba(2,6,23,0.28)",
                                    color: "#eaf2ff"
                                  }}
                                  title={`${monthName} ${payment.year} - Klicken zum ${payment.paid ? 'Entmarkieren' : 'Markieren'}`}
                                >
                                  {/* Status Badge */}
                                  <div className="mb-2 text-lg font-bold" style={{ color: payment.paid ? "#0b5d46" : isOverdue ? "#fda4af" : "#93c5fd", opacity: payment.paid ? 1 : 0.95 }}>
                                    {payment.paid ? '✓' : '○'}
                                  </div>
                                  
                                  {/* Monat */}
                                  <div className="text-2xl font-bold mb-1 tracking-tight" style={{ color: "#f8fbff" }}>
                                    {monthShort.toUpperCase()}
                                  </div>
                                  
                                  {/* Betrag */}
                                  <div className="text-sm font-semibold" style={{ color: "#dbeafe", opacity: 0.95 }}>
                                    {formatMoney(parseMoney(payment.amount))}€
                                  </div>
                                  
                                  {/* Status */}
                                  <div className="text-[10px] font-semibold uppercase tracking-wider mt-2" style={{ color: payment.paid ? "#0b5d46" : isOverdue ? "#fda4af" : isCurrent ? "#93c5fd" : "#bfdbfe", opacity: 0.95 }}>
                                    {payment.paid 
                                      ? 'Bezahlt'
                                      : isPast 
                                      ? 'Überfällig' 
                                      : isCurrent
                                      ? 'Fällig'
                                      : 'Geplant'}
                                  </div>
                                  
                                  {/* Marked by info */}
                                  {payment.paid && payment.markedByName && (
                                    <div className="text-[9px] mt-2 text-center" style={{ color: "#0b2239", opacity: 0.95 }}>
                                      {payment.markedByName}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm opacity-60">
                    Keine Zahlungsdaten verfügbar
                  </div>
                )}
              </div>
            )}

            {/* Summary - Nur aktueller Monat */}
            {selectedBed.moveInDate && selectedBed.rent && (
              <div className="mt-6 pt-6 border-t border-white/10">
                {(() => {
                  const payments = selectedBed.payments || generatePayments(selectedBed.moveInDate, selectedBed.rent, selectedBed.moveOutDate);
                  const today = new Date();
                  const currentMonth = today.getMonth();
                  const currentYear = today.getFullYear();
                  
                  // Nur aktueller Monat
                  const currentMonthPayment = payments.find(p => 
                    p.month === currentMonth + 1 && p.year === currentYear
                  );
                  
                  if (!currentMonthPayment) {
                    return (
                      <div className="text-center py-4 text-sm opacity-60">
                        Keine Zahlung für diesen Monat
                      </div>
                    );
                  }
                  
                  const amount = parseFloat(currentMonthPayment.amount);
                  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
                  
                  return (
                    <div>
                      <div className="text-center text-sm mb-3" style={{ color: "#93c5fd" }}>
                        {monthName}
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="rounded-lg border p-4 text-center" style={{
                          background: currentMonthPayment.paid ? "rgba(6,78,59,0.4)" : "rgba(127,29,29,0.4)",
                          border: currentMonthPayment.paid ? "1px solid rgba(52,211,153,0.5)" : "1px solid rgba(252,165,165,0.45)"
                        }}>
                          <div className="text-xs font-medium mb-2" style={{ color: currentMonthPayment.paid ? "#6ee7b7" : "#fca5a5" }}>
                            {currentMonthPayment.paid ? 'Bezahlt' : 'Ausstehend'}
                          </div>
                          <div className="text-3xl font-bold" style={{ color: currentMonthPayment.paid ? "#6ee7b7" : "#fca5a5" }}>
                            {formatMoney(amount)}€
                          </div>
                          {currentMonthPayment.paid && currentMonthPayment.markedByName && (
                            <div className="text-xs mt-2" style={{ color: "#93c5fd", opacity: 0.75 }}>
                              von {currentMonthPayment.markedByName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentMethodModal && pendingOpenPayment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl border p-6 max-w-md w-full shadow-2xl"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Zahlung bestätigen</h3>
            <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>Mieter: {pendingOpenPayment.tenantName}</p>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>Wie wurde die Miete bezahlt?</p>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => confirmOpenPaymentMethod("Vom Lohn abgezogen")}
                className="w-full flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold transition"
                style={{ color: "#ffffff" }}
              >
                Vom Lohn abgezogen
              </button>
              <button
                type="button"
                onClick={() => confirmOpenPaymentMethod("Bar bezahlt")}
                className="w-full flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-sm font-semibold transition"
                style={{ color: "#ffffff" }}
              >
                Bar bezahlt
              </button>
              <button
                type="button"
                onClick={() => confirmOpenPaymentMethod("Auf das Konto überwiesen")}
                className="w-full flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-3 text-sm font-semibold transition"
                style={{ color: "#ffffff" }}
              >
                Auf das Konto überwiesen
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPaymentMethodModal(false);
                setPendingOpenPayment(null);
              }}
              className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition"
              style={{
                backgroundColor: "var(--color-surface-hover)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Move Out Modal */}
      {showMoveOutModal && selectedBed && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl surface border border-orange-500/30 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl">
                  📤
                </div>
                <div>
                  <h2 className="text-xl font-bold">Auszug eintragen</h2>
                  <p className="text-sm opacity-60">{selectedBed.tenant}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMoveOutModal(false);
                  setTempMoveOutDate("");
                }}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Info */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs opacity-60">Einzugsdatum</div>
                    <div className="font-semibold mt-1">{selectedBed.moveInDate || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-60">Monatliche Miete</div>
                    <div className="font-semibold text-green-400 mt-1" style={{ color: "#ffffff" }}>{formatMoney(parseMoney(selectedBed.rent))}€</div>
                  </div>
                </div>
              </div>

              {/* Move Out Date Picker */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Auszugsdatum auswählen</label>
                <input
                  type="date"
                  value={tempMoveOutDate}
                  onChange={(e) => setTempMoveOutDate(e.target.value)}
                  min={selectedBed.moveInDate}
                  className="input rounded-lg w-full"
                />
              </div>

              {/* Calculation Preview */}
              {tempMoveOutDate && selectedBed.moveInDate && selectedBed.rent && (
                <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
                  <div className="text-sm font-semibold mb-3">Mietberechnung</div>
                  {(() => {
                    const payments = generatePayments(selectedBed.moveInDate, selectedBed.rent, tempMoveOutDate);
                    const totalRent = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                    const months = payments.length;
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="opacity-70">Mietdauer:</span>
                          <span className="font-semibold">{months} Monat{months > 1 ? 'e' : ''}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Erster Monat (anteilig):</span>
                          <span className="font-semibold">{formatMoney(parseMoney(payments[0].amount))}€</span>
                        </div>
                        {payments.length > 2 && (
                          <div className="flex justify-between">
                            <span className="opacity-70">Volle Monate:</span>
                            <span className="font-semibold">{payments.length - 2} x {formatMoney(parseMoney(selectedBed.rent))}€</span>
                          </div>
                        )}
                        {payments.length > 1 && (
                          <div className="flex justify-between">
                            <span className="opacity-70">Letzter Monat (anteilig):</span>
                            <span className="font-semibold">{formatMoney(parseMoney(payments[payments.length - 1].amount))}€</span>
                          </div>
                        )}
                        <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                          <span className="font-bold">Gesamtmiete:</span>
                          <span className="font-bold text-lg text-green-400">{formatMoney(totalRent)}€</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowMoveOutModal(false);
                    setTempMoveOutDate("");
                  }}
                  className="flex-1 rounded-lg bg-gradient-to-br from-slate-700/60 to-slate-800/50 hover:from-slate-600/70 hover:to-slate-700/60 border-2 border-slate-500/50 px-4 py-3 text-sm font-semibold transition shadow-md"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleMoveOut}
                  disabled={!tempMoveOutDate}
                  className="flex-1 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💾 Auszug speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Month Selection Modal */}
      {showPDFMonthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl surface border border-blue-500/30 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl">
                  📄
                </div>
                <div>
                  <h2 className="text-xl font-bold">Monat für PDF auswählen</h2>
                  <p className="text-sm opacity-60">Wählen Sie den Berichtszeitraum</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPDFMonthModal(false);
                  setPendingPDFWohnung(null);
                }}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Month Selection */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Monat</label>
                <select
                  value={pdfSelectedMonth}
                  onChange={(e) => setPdfSelectedMonth(parseInt(e.target.value))}
                  className="input rounded-lg w-full"
                >
                  <option value={1}>Januar</option>
                  <option value={2}>Februar</option>
                  <option value={3}>März</option>
                  <option value={4}>April</option>
                  <option value={5}>Mai</option>
                  <option value={6}>Juni</option>
                  <option value={7}>Juli</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>Oktober</option>
                  <option value={11}>November</option>
                  <option value={12}>Dezember</option>
                </select>
              </div>

              {/* Year Selection */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Jahr</label>
                <input
                  type="number"
                  value={pdfSelectedYear}
                  onChange={(e) => setPdfSelectedYear(parseInt(e.target.value))}
                  min={2020}
                  max={2030}
                  className="input rounded-lg w-full"
                />
              </div>

              {/* Preview Info */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <div className="text-sm">
                  <div className="opacity-60 mb-1">Bericht wird erstellt für:</div>
                  <div className="font-semibold text-lg">
                    {['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][pdfSelectedMonth - 1]} {pdfSelectedYear}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPDFMonthModal(false);
                    setPendingPDFWohnung(null);
                  }}
                  className="flex-1 rounded-lg bg-gradient-to-br from-slate-700/60 to-slate-800/50 hover:from-slate-600/70 hover:to-slate-700/60 border-2 border-slate-500/50 px-4 py-3 text-sm font-semibold transition shadow-md"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmPDFDownload}
                  className="flex-1 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-4 py-3 text-sm font-semibold text-white transition"
                >
                  📥 PDF herunterladen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
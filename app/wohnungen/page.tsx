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
  
  // PDF Export month selection
  const [showPDFMonthModal, setShowPDFMonthModal] = useState(false);
  const [pdfSelectedMonth, setPdfSelectedMonth] = useState(new Date().getMonth() + 1);
  const [pdfSelectedYear, setPdfSelectedYear] = useState(new Date().getFullYear());
  const [pendingPDFWohnung, setPendingPDFWohnung] = useState<Wohnung | null>(null);

  // Mobile view state
  const [showMobileList, setShowMobileList] = useState(true);

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
          const updated = list.find(w => w.id === selectedWohnung.id);
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
  }, [ready]);

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
      const wohnungAdresse = w.adresse || w.address || "";
      const matchesSearch = 
        wohnungAdresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.stadtplz && w.stadtplz.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (w.aktuellerMieter && w.aktuellerMieter.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === "all" || w.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });

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
    const totalRent = parseInt(wohnung.miete || "0") || 0;
    const tenantsRent = (wohnung.rooms || []).reduce((sum, room) => {
      return sum + room.beds.reduce((bedSum, bed) => {
        return bedSum + (parseInt(bed.rent || "0") || 0);
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
      const wohnungMiete = parseInt(wohnung.miete || "0") || 0;
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
    
    // Aktualisiere beide States
    setRooms(updatedRooms);
    setSelectedWohnung({ ...selectedWohnung, rooms: updatedRooms });
    
    // Speichere in Firebase
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
        notes: `Monatliche Miete: ${selectedBed.rent}€ | Gesamtmiete: ${totalRent.toFixed(2)}€ | Einzugsdatum: ${selectedBed.moveInDate}`,
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
    <div className="pb-12 wohnungen-page">
      {/* Professional Header with Gradient */}
      <div className="mb-12">
        <button
          onClick={() => router.push('/immobilien')}
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ color: "var(--color-primary)" }}
        >
          ← {t("common.back")}
        </button>
        
        <div className="flex items-end gap-6 mb-4">
          <div className="text-7xl">🏢</div>
          <div>
            <h1 className="text-6xl font-bold tracking-tight mb-2" style={{ color: themeConfig.text }}>
              {t("wohnungen.title")}
            </h1>
            <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>
              Professionelle Verwaltung aller Wohnungen und Mieterverhältnisse
            </p>
          </div>
        </div>
      </div>

      {/* Statistics - Modern Professional Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
        <div className="rounded-xl border p-5 transition-all" style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}>
          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-primary)" }}>{t("wohnungen.stats.total")}</div>
          <div className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>{stats.total}</div>
        </div>
        <div className="rounded-xl border p-5 transition-all" style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}>
          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-success)" }}>{t("wohnungen.stats.verfuegbar")}</div>
          <div className="text-3xl font-bold" style={{ color: "var(--color-success)" }}>{stats.verfügbar}</div>
        </div>
        <div className="rounded-xl border p-5 transition-all" style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}>
          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-accent1)" }}>{t("wohnungen.stats.vermietet")}</div>
          <div className="text-3xl font-bold" style={{ color: "var(--color-accent1)" }}>{stats.vermietet}</div>
        </div>
        <div className="rounded-xl border p-5 transition-all" style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}>
          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-warning)" }}>{t("wohnungen.stats.renovierung")}</div>
          <div className="text-3xl font-bold" style={{ color: "var(--color-warning)" }}>{stats.renovierung}</div>
        </div>
        <div className="rounded-xl border p-5 transition-all" style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}>
          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-info)" }}>{t("wohnungen.stats.zimmer")}</div>
          <div className="text-3xl font-bold" style={{ color: "var(--color-info)" }}>{stats.totalRooms}</div>
        </div>
        <div className="rounded-xl border p-5 transition-all" style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}>
          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-accent2)" }}>{t("wohnungen.stats.betten")}</div>
          <div className="text-3xl font-bold" style={{ color: "var(--color-accent2)" }}>{stats.totalBeds}</div>
        </div>
        <div className="rounded-xl border p-5 transition-all" style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}>
          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-accent3)" }}>{t("wohnungen.stats.belegt")}</div>
          <div className="text-3xl font-bold" style={{ color: "var(--color-accent3)" }}>{stats.occupiedBeds}/{stats.totalBeds}</div>
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
                  className="rounded-xl border-2 p-6 transition-all shadow-xl bg-gradient-to-br from-indigo-200/95 via-blue-100/95 to-cyan-200/95 border-indigo-400/60"
                >
                  <div className="text-xs font-semibold mb-3 uppercase tracking-widest text-indigo-800">
                    Gesamtmiete
                  </div>
                  <div className="text-4xl font-bold mb-1 text-indigo-900">{rentOverview.totalRent}€</div>
                  <div className="text-xs text-indigo-700">
                    Alle Wohnungen
                  </div>
                </div>
                <div
                  className="rounded-xl border-2 p-6 transition-all shadow-xl bg-gradient-to-br from-emerald-200/95 via-green-100/95 to-teal-200/95 border-emerald-400/60"
                >
                  <div className="text-xs font-semibold mb-3 uppercase tracking-widest text-emerald-800">
                    Einnahmen
                  </div>
                  <div className="text-4xl font-bold mb-1 text-emerald-900">{rentOverview.totalPaid}€</div>
                  <div className="text-xs text-emerald-700">
                    Bezahlte Mieten
                  </div>
                </div>
                <div
                  className={`rounded-xl border-2 p-6 transition-all shadow-xl ${
                    rentOverview.difference >= 0 
                      ? 'bg-gradient-to-br from-green-200/95 via-green-100/95 to-lime-200/95 border-green-400/60'
                      : 'bg-gradient-to-br from-red-200/95 via-red-100/95 to-rose-200/95 border-red-400/60'
                  }`}
                >
                  <div className={`text-xs font-semibold mb-3 uppercase tracking-widest ${
                    rentOverview.difference >= 0 ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Differenz
                  </div>
                  <div className={`text-4xl font-bold mb-1 ${
                    rentOverview.difference >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {rentOverview.difference >= 0 ? '+' : ''}{rentOverview.difference}€
                  </div>
                  <div className={`text-xs ${
                    rentOverview.difference >= 0 ? 'text-green-700' : 'text-red-700'
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
      <div className="rounded-2xl surface border border-white/5 p-5">
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
              className="rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-6 py-2.5 text-sm font-semibold text-white transition shadow-lg whitespace-nowrap"
            >
              + {t("wohnungen.newWohnung")}
            </button>
          )}
          
          <div className="text-sm opacity-70 py-2.5 whitespace-nowrap">
            {filteredWohnungen.length} von {wohnungen.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Wohnungen Liste - Professionell */}
      <div className={`lg:col-span-1 ${!showMobileList && (selectedWohnung || isEditing) ? 'hidden lg:block' : ''}`}>
        <div className="rounded-2xl surface border border-white/5 p-5 sticky top-4">
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
                  className={`w-full text-left rounded-2xl p-5 transition-all duration-300 border-2 ${
                    selectedWohnung?.id === wohnung.id 
                      ? "bg-gradient-to-br from-violet-600/40 via-fuchsia-500/30 to-pink-500/35 border-fuchsia-400/70 shadow-2xl shadow-fuchsia-500/40 scale-[1.02]" 
                      : "bg-gradient-to-br from-indigo-900/50 via-purple-800/40 to-blue-900/45 border-indigo-500/40 hover:border-purple-400/60 hover:shadow-xl hover:shadow-purple-600/30 hover:scale-[1.01]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base truncate text-slate-100">{wohnung.adresse || wohnung.address || "—"}</div>
                      <div className="text-sm text-slate-300/80 truncate mt-1 font-medium">{wohnung.stadtplz || "—"}</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 flex items-center gap-2 bg-gradient-to-br from-slate-700/70 to-slate-800/60 border-2 border-slate-500/60 shadow-lg">
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
                    <span className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-indigo-600/30 to-indigo-500/20 border-2 border-indigo-500/40 text-indigo-200 font-semibold shadow-md">{wohnung.zimmerzahl || "?"} Zimmer</span>
                    <span className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-purple-600/30 to-purple-500/20 border-2 border-purple-500/40 text-purple-200 font-semibold shadow-md">{wohnung.quadratmeter || "?"} m²</span>
                    {wohnung.miete && (
                      <span className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-emerald-600/40 to-emerald-500/30 border-2 border-emerald-400/50 text-emerald-100 font-bold shadow-md">
                        {wohnung.miete}€
                      </span>
                    )}
                  </div>
                  
                  {/* Rent Calculation */}
                  {wohnung.status === "vermietet" && wohnung.miete && (
                    <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-gradient-to-br from-emerald-900/50 via-emerald-800/40 to-emerald-900/30 border-2 border-emerald-500/50 shadow-lg">
                      {(() => {
                        const diff = calculateRentDifference(wohnung);
                        const tenantsRent = (wohnung.rooms || []).reduce((sum, room) => {
                          return sum + room.beds.reduce((bedSum, bed) => {
                            return bedSum + (parseInt(bed.rent || "0") || 0);
                          }, 0);
                        }, 0);
                        
                        return (
                          <>
                            <span className="text-xs text-emerald-100 font-semibold">Einnahmen:</span>
                            <span className="text-sm font-extrabold text-emerald-50">{tenantsRent}€</span>
                            {diff !== 0 && (
                              <>
                                <span className="text-xs text-emerald-200/70">•</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shadow-md ${
                                  diff > 0 ? 'bg-gradient-to-br from-green-600/60 to-green-500/40 text-green-50 border-2 border-green-400/60' : 'bg-gradient-to-br from-red-600/60 to-red-500/40 text-red-50 border-2 border-red-400/60'
                                }`}>
                                  {diff > 0 ? '+' : ''}{diff}€
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
          <div className="rounded-2xl surface border border-white/5 p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {selectedWohnung ? "Wohnung bearbeiten" : "Neue Wohnung erstellen"}
              </h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowMobileList(true);
                }}
                className="opacity-60 hover:opacity-100 text-2xl"
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
              <h3 className="text-lg font-semibold mb-4">Grunddaten</h3>
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
              </div>
            </div>

            {/* Zimmer & Betten Verwaltung */}
            <div className="rounded-xl surface-2 border border-blue-500/10 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-semibold">Zimmer & Betten</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomManager(true);
                    setEditingRoom(null);
                    setRoomName("");
                    setRoomBeds([{ id: Date.now().toString(), number: 1, occupied: false }]);
                  }}
                  className="rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-2 text-sm font-semibold text-white transition"
                >
                  + Zimmer
                </button>
              </div>

              {showRoomManager && (
                <div className="rounded-lg bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/40 p-4 mb-4 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">{editingRoom ? "Zimmer bearbeiten" : "Neues Zimmer"}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoomManager(false);
                        setEditingRoom(null);
                        setRoomName("");
                        setRoomBeds([]);
                      }}
                      className="opacity-60 hover:opacity-100"
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
                    <div className="rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/50 border-2 border-slate-600/40 p-3 space-y-3 shadow-lg">
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
                        <span className="text-sm font-medium">Geeignet für Paare</span>
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-xs opacity-60 font-medium flex-1">Betten</label>
                        <button
                          type="button"
                          onClick={addBedToRoom}
                          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10"
                        >
                          + Bett
                        </button>
                      </div>

                      <div className="space-y-3">
                        {roomBeds.map((bed, idx) => (
                          <div key={bed.id} className="rounded-lg bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-2 border-blue-500/40 p-4 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-bold">Bett {idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => deleteBed(bed.id)}
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10"
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
                    <div key={room.id} className="rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-900/40 border-2 border-slate-600/40 p-3 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DoorOpen className="w-4 h-4 opacity-60" />
                          <span className="font-medium">{room.name}</span>
                          <span className="text-xs opacity-50">({room.beds.length} Betten)</span>
                          <span className="text-xs opacity-60 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                            {room.capacity || 1} Pers.
                          </span>
                          {room.suitableForCouple && (
                            <span className="text-xs opacity-60 bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                              👥 Paar
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editRoom(room)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRoom(room.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
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
                            className={`rounded-lg p-2 text-left transition hover:scale-105 ${
                              bed.occupied ? "bg-blue-500/10 border border-blue-500/20" : "bg-green-500/10 border border-green-500/20"
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <Bed className={`w-3 h-3 ${bed.occupied ? "text-blue-400" : "text-green-400"}`} />
                              <span className="font-medium">B{idx + 1}</span>
                            </div>
                            {bed.tenant && <div className="text-xs opacity-70">{bed.tenant}</div>}
                            {bed.rent && <div className="text-xs text-green-400 font-medium">{bed.rent}€</div>}
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
              <div className="rounded-xl surface-2 border border-white/5 p-4">
                <h3 className="text-base font-semibold mb-4">Mieterdaten</h3>
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
              <h3 className="text-base font-semibold mb-4">Notizen</h3>
              <textarea
                value={notizen}
                onChange={(e) => setNotizen(e.target.value)}
                className="input rounded-lg min-h-[100px]"
                placeholder="Zusätzliche Informationen..."
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {saving ? "Speichert..." : "💾 Speichern"}
              </button>
              {selectedWohnung && (
                <button
                  onClick={() => handleDelete(selectedWohnung)}
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-3 text-sm font-semibold text-white transition"
                >
                  🗑️ Löschen
                </button>
              )}
            </div>
          </div>
        ) : selectedWohnung ? (
          // Detail View - Professional
          <div className="wohnungen-detail-panel rounded-2xl surface border border-white/5 p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <button
                  onClick={() => setShowMobileList(true)}
                  className="lg:hidden text-sm text-blue-400 hover:text-blue-300 mb-3 transition"
                >
                  ← Zurück
                </button>
                <h2
                  className="wohnungen-detail-title text-4xl font-bold"
                  style={{ color: "var(--color-text)" }}
                >
                  {selectedWohnung.adresse || selectedWohnung.address || "—"}
                </h2>
                <p
                  className="text-base mt-2 font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {selectedWohnung.stadtplz || "—"}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {canManageProperties && (
                  <button
                    onClick={() => handleEdit(selectedWohnung)}
                    className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg"
                  >
                    ✎ Bearbeiten
                  </button>
                )}
                <button
                  onClick={() => handleDownloadPDF(selectedWohnung)}
                  className="rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  PDF
                </button>
                {canManageProperties && (
                  <button
                    onClick={() => handleDelete(selectedWohnung)}
                    className="rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg"
                  >
                    🗑️ Löschen
                  </button>
                )}
              </div>
            </div>

            {/* Status Badge - Premium Style */}
            <div className="wohnungen-status-pill inline-flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-slate-700/40 to-slate-800/40 border border-slate-500/40 shadow-lg">
              {selectedWohnung.status === "verfügbar" ? 
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div> :
               selectedWohnung.status === "vermietet" ? 
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div> :
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
              }
              <span className="text-slate-100">
                {(() => {
                  if (selectedWohnung.status === "verfügbar") {
                    const totalBeds = (selectedWohnung.rooms || []).reduce((sum, room) => sum + room.beds.length, 0);
                    const occupiedBeds = (selectedWohnung.rooms || []).reduce((sum, room) => 
                      sum + room.beds.filter(bed => bed.occupied).length, 0);
                    const freeBeds = totalBeds - occupiedBeds;
                    const totalRooms = (selectedWohnung.rooms || []).length;
                    const freeRooms = (selectedWohnung.rooms || []).filter(room => 
                      room.beds.every(bed => !bed.occupied)).length;
                    
                    // Wenn keine Zimmer/Betten existieren
                    if (totalBeds === 0) return "Verfügbar";
                    
                    // Wenn alle Betten belegt sind
                    if (freeBeds === 0) {
                      return "Vollständig belegt";
                    }
                    
                    // Wenn komplette Zimmer frei sind
                    if (freeRooms > 0 && freeRooms === totalRooms) {
                      return `${freeRooms} Zimmer frei`;
                    }
                    
                    // Wenn einzelne Betten frei sind
                    if (freeBeds > 0) {
                      return `${freeBeds} Bett${freeBeds > 1 ? 'en' : ''} frei`;
                    }
                    
                    return "Verfügbar";
                  }
                  return selectedWohnung.status === "vermietet" ? "Vermietet" : "In Renovierung";
                })()}
              </span>
            </div>

            {/* Rent Overview */}
            {selectedWohnung.miete && (
              <div className="wohnungen-block rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-600/40 p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Mietübersicht</h3>
                {(() => {
                  const totalRent = parseInt(selectedWohnung.miete || "0") || 0;
                  const tenantsRent = (selectedWohnung.rooms || []).reduce((sum, room) => {
                    return sum + room.beds.reduce((bedSum, bed) => {
                      return bedSum + (parseInt(bed.rent || "0") || 0);
                    }, 0);
                  }, 0);
                  const diff = tenantsRent - totalRent;
                  
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl p-4 transition-all bg-gradient-to-br from-blue-200/95 via-blue-100/95 to-cyan-200/95 border-2 border-blue-400/60 shadow-xl">
                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-800">Gesamtmiete</div>
                        <div className="text-3xl font-bold mt-2 text-blue-900">{totalRent}€</div>
                      </div>
                      <div className="rounded-xl p-4 transition-all bg-gradient-to-br from-emerald-200/95 via-green-100/95 to-teal-200/95 border-2 border-emerald-400/60 shadow-xl">
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Einnahmen</div>
                        <div className="text-3xl font-bold mt-2 text-emerald-900">{tenantsRent}€</div>
                      </div>
                      <div className={`rounded-xl p-4 transition-all border-2 shadow-xl ${
                        diff > 0 
                          ? 'bg-gradient-to-br from-green-200/95 via-green-100/95 to-lime-200/95 border-green-400/60'
                          : 'bg-gradient-to-br from-red-200/95 via-red-100/95 to-rose-200/95 border-red-400/60'
                      }`}>
                        <div className={`text-xs font-semibold uppercase tracking-wider ${
                          diff > 0 ? 'text-green-800' : 'text-red-800'
                        }`}>
                          Differenz
                        </div>
                        <div className={`text-3xl font-bold mt-2 ${
                          diff > 0 ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {diff > 0 ? '+' : ''}{diff}€
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
                    className="w-full text-left flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 bg-red-600 hover:bg-red-700 border border-red-500 transition"
                    style={{ color: "#ffffff" }}
                  >
                    <div className="text-lg font-semibold flex items-center gap-2" style={{ color: "#ffffff" }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Offene Mieten ({openPaymentsForProperty.length})
                    </div>
                    <div className="text-sm font-semibold" style={{ color: "#ffffff" }}>
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
                            <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
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
                              {payment.openAmount}€
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

            {/* Wohnungsinfo */}
            <div className="wohnungen-block rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-600/40 p-6 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Wohnungsinformationen</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="wohnungen-info-tile bg-gradient-to-br from-indigo-200/95 to-indigo-100/95 rounded-lg p-3.5 border-2 border-indigo-400/60 shadow-md">
                  <div className="text-xs text-indigo-800 font-semibold uppercase tracking-wider">Zimmerzahl</div>
                  <div className="font-bold text-indigo-900 mt-2 text-lg">{selectedWohnung.zimmerzahl || "—"}</div>
                </div>
                <div className="wohnungen-info-tile bg-gradient-to-br from-purple-200/95 to-purple-100/95 rounded-lg p-3.5 border-2 border-purple-400/60 shadow-md">
                  <div className="text-xs text-purple-800 font-semibold uppercase tracking-wider">Quadratmeter</div>
                  <div className="font-bold text-purple-900 mt-2 text-lg">{selectedWohnung.quadratmeter ? `${selectedWohnung.quadratmeter} m²` : "—"}</div>
                </div>
                <div className="wohnungen-info-tile tile-success bg-gradient-to-br from-emerald-200/95 to-emerald-100/95 rounded-lg p-3.5 border-2 border-emerald-400/60 shadow-md">
                  <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Miete</div>
                  <div className="font-bold text-emerald-900 mt-2 text-lg">{selectedWohnung.miete ? `${selectedWohnung.miete} €` : "—"}</div>
                </div>
                <div className="wohnungen-info-tile tile-info bg-gradient-to-br from-blue-200/95 to-blue-100/95 rounded-lg p-3.5 border-2 border-blue-400/60 shadow-md">
                  <div className="text-xs text-blue-800 font-semibold uppercase tracking-wider">Kaution</div>
                  <div className="font-bold text-blue-900 mt-2 text-lg">{selectedWohnung.kaution ? `${selectedWohnung.kaution} €` : "—"}</div>
                </div>
              </div>
            </div>

            {/* Mieterinfo */}
            {selectedWohnung.status === "vermietet" && (
              <div className="wohnungen-block mieter-block rounded-xl bg-gradient-to-br from-purple-900/40 to-purple-800/30 border border-purple-600/40 p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-purple-200 mb-4 uppercase tracking-wide">Mieterinformationen</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="wohnungen-info-tile mieter-tile col-span-2 bg-purple-900/50 rounded-lg p-3.5 border border-purple-700/50">
                    <div className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Aktueller Mieter</div>
                    <div className="font-bold text-purple-100 mt-2">{selectedWohnung.aktuellerMieter || "—"}</div>
                  </div>
                  <div className="wohnungen-info-tile mieter-tile bg-purple-900/50 rounded-lg p-3.5 border border-purple-700/50">
                    <div className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Mietbeginn</div>
                    <div className="font-bold text-purple-100 mt-2">{selectedWohnung.mietbeginn || "—"}</div>
                  </div>
                  <div className="wohnungen-info-tile mieter-tile bg-purple-900/50 rounded-lg p-3.5 border border-purple-700/50">
                    <div className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Mietende</div>
                    <div className="font-bold text-purple-100 mt-2">{selectedWohnung.mietende || "—"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Notizen */}
            {selectedWohnung.notizen && (
              <div className="wohnungen-block notes-block rounded-xl bg-gradient-to-br from-amber-900/40 to-amber-800/30 border border-amber-600/40 p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-amber-200 mb-3 uppercase tracking-wide">📝 Notizen</h3>
                <div className="text-sm text-amber-50/90 whitespace-pre-wrap leading-relaxed">{selectedWohnung.notizen}</div>
              </div>
            )}

            {/* Zimmer & Betten */}
            {selectedWohnung.rooms && selectedWohnung.rooms.length > 0 && (
              <div className="wohnungen-rooms-block rounded-xl bg-gradient-to-br from-slate-100/95 to-slate-200/90 border-2 border-slate-300/60 p-6 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wide">🛏️ Zimmer & Betten</h3>
                <div className="space-y-4">
                  {selectedWohnung.rooms.map((room) => (
                    <div key={room.id} className="wohnungen-room-card rounded-xl bg-gradient-to-br from-indigo-100/95 to-purple-100/90 border-2 border-indigo-300/60 p-4 hover:border-indigo-400/70 transition-all shadow-lg">
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <DoorOpen className="w-5 h-5 text-indigo-700" />
                        <span className="font-bold text-indigo-900 text-base">{room.name}</span>
                        <span className="text-xs text-indigo-800 bg-indigo-200/80 px-2.5 py-1.5 rounded-lg font-semibold border border-indigo-300/50">({room.beds.length} Betten)</span>
                        <span className="text-xs text-blue-800 bg-blue-200/80 px-2.5 py-1.5 rounded-lg font-bold border border-blue-300/50">
                          👥 {room.capacity || 1} Pers.
                        </span>
                        {room.suitableForCouple && (
                          <span className="text-xs text-purple-800 bg-purple-200/80 px-2.5 py-1.5 rounded-lg font-bold border border-purple-300/50">
                            💑 Paar
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {room.beds.map((bed, idx) => (
                          <button
                            key={bed.id}
                            onClick={() => {
                              setSelectedBed(bed);
                              setSelectedBedContext({ roomId: room.id, bedId: bed.id });
                              setShowBedDetail(true);
                            }}
                            className={`wohnungen-bed-card rounded-lg p-3 text-left transition hover:scale-105 border-2 ${
                              bed.occupied ? "is-occupied bg-gradient-to-br from-blue-200/95 to-blue-100/95 border-blue-400/70 hover:border-blue-500/80 shadow-md" : "is-free bg-gradient-to-br from-green-200/95 to-green-100/95 border-green-400/70 hover:border-green-500/80 shadow-md"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              <Bed className={`w-3.5 h-3.5 ${bed.occupied ? "text-blue-700" : "text-green-700"}`} />
                              <span className={`font-bold ${bed.occupied ? 'text-blue-900' : 'text-green-900'}`}>{bed.occupied ? 'Belegt' : 'Frei'}</span>
                            </div>
                            {bed.tenant && (
                              <div className="space-y-1 mt-2 border-t border-slate-400/30 pt-2 opacity-90 wohnungen-bed-meta">
                                <div className="font-semibold text-slate-800">{bed.tenant}</div>
                                {bed.rent && <div className="text-emerald-700 font-bold">{bed.rent}€</div>}
                                {bed.moveOutDate && (
                                  <div className="text-orange-300 text-[10px] mt-1 font-medium">
                                    📤 Auszug: {bed.moveOutDate}
                                  </div>
                                )}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Empty State
          <div className="rounded-2xl surface border border-white/5 p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
            <button
              onClick={() => setShowMobileList(true)}
              className="lg:hidden text-sm text-blue-400 hover:text-blue-300 mb-6"
            >
              ← Zurück
            </button>
            <div className="text-7xl mb-6">🏢</div>
            <h3 className="text-2xl font-bold mb-2">
              Wohnung auswählen
            </h3>
            <p className="text-sm opacity-70 mb-8 max-w-sm">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl surface border border-white/10 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedBed.tenant || "Mieter"}</h2>
                <p className="text-sm opacity-60 mt-1">Miete: {selectedBed.rent}€/Monat</p>
              </div>
              <button
                onClick={() => {
                  setShowBedDetail(false);
                  setSelectedBed(null);
                }}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            {/* Dates Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {selectedBed.moveInDate && (
                <div className="rounded-lg surface-2 border border-white/10 p-4">
                  <div className="text-xs opacity-60 font-medium">📅 Einzugsdatum</div>
                  <div className="text-lg font-semibold mt-2">{selectedBed.moveInDate}</div>
                </div>
              )}
              {selectedBed.moveOutDate && (
                <div className="rounded-lg surface-2 border border-orange-500/20 p-4">
                  <div className="text-xs text-orange-400 font-medium">📤 Auszugsdatum</div>
                  <div className="text-lg font-semibold mt-2">{selectedBed.moveOutDate}</div>
                </div>
              )}
            </div>

            {/* Move Out Button */}
            {selectedBed.tenant && !selectedBed.moveOutDate && (
              <button
                onClick={() => setShowMoveOutModal(true)}
                className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 px-4 py-3 text-sm font-semibold text-white transition mb-6 flex items-center justify-center gap-2 shadow-lg"
              >
                📤 Auszug eintragen
              </button>
            )}

            {/* Button to show calendar */}
            <button
              onClick={() => setShowPaymentCalendar(!showPaymentCalendar)}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600/50 to-pink-600/50 hover:from-purple-600/70 hover:to-pink-600/70 px-4 py-3 text-sm font-semibold transition mb-6 flex items-center justify-center gap-2 border-2 border-purple-400/50"
            >
              📅 {showPaymentCalendar ? 'Kalender ausblenden' : 'Zahlungskalender öffnen'}
            </button>

            {/* Payment History */}
            {showPaymentCalendar && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-6 text-center">📅 Zahlungskalender</h3>
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
                          <h4 className="text-lg font-bold mb-4 text-center opacity-80">{year}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {yearPayments.map((payment) => {
                              const monthName = new Date(payment.year, payment.month - 1).toLocaleDateString('de-DE', { month: 'long' });
                              const monthShort = new Date(payment.year, payment.month - 1).toLocaleDateString('de-DE', { month: 'short' });
                              const today = new Date();
                              const paymentDate = new Date(payment.year, payment.month - 1);
                              const isPast = paymentDate < new Date(today.getFullYear(), today.getMonth());
                              const isCurrent = paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
                              
                              return (
                                <button
                                  key={`${payment.year}-${payment.month}`}
                                  onClick={() => togglePayment(payment.month, payment.year)}
                                  className={`rounded-xl p-4 flex flex-col items-center justify-center transition border-2 cursor-pointer ${
                                    payment.paid 
                                      ? "bg-gradient-to-br from-green-600/50 to-emerald-600/50 border-green-400/60 shadow-lg shadow-green-500/30" 
                                      : "bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-slate-500/40 hover:border-slate-400/60 hover:shadow-lg"
                                  }`}
                                  title={`${monthName} ${payment.year} - Klicken zum ${payment.paid ? 'Entmarkieren' : 'Markieren'}`}
                                >
                                  {/* Status Badge */}
                                  <div className={`mb-2 text-lg font-bold ${
                                    payment.paid ? 'opacity-100' : 'opacity-60'
                                  }`}>
                                    {payment.paid ? '✓' : '○'}
                                  </div>
                                  
                                  {/* Monat */}
                                  <div className="text-2xl font-bold mb-1 tracking-tight">
                                    {monthShort.toUpperCase()}
                                  </div>
                                  
                                  {/* Betrag */}
                                  <div className="text-sm font-semibold opacity-80">
                                    {payment.amount}€
                                  </div>
                                  
                                  {/* Status */}
                                  <div className="text-[10px] font-semibold uppercase tracking-wider mt-2 opacity-60">
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
                                    <div className="text-[9px] opacity-70 mt-2 text-center text-green-200">
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
                      <div className="text-center text-sm opacity-60 mb-3">
                        {monthName}
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className={`rounded-lg border p-4 text-center ${
                          currentMonthPayment.paid 
                            ? 'bg-green-500/10 border-green-500/20' 
                            : 'bg-red-500/10 border-red-500/20'
                        }`}>
                          <div className={`text-xs font-medium mb-2 ${
                            currentMonthPayment.paid ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {currentMonthPayment.paid ? 'Bezahlt' : 'Ausstehend'}
                          </div>
                          <div className={`text-3xl font-bold ${
                            currentMonthPayment.paid ? 'text-green-300' : 'text-red-400'
                          }`}>
                            {amount.toFixed(2)}€
                          </div>
                          {currentMonthPayment.paid && currentMonthPayment.markedByName && (
                            <div className="text-xs opacity-60 mt-2">
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
                    <div className="font-semibold text-green-400 mt-1">{selectedBed.rent}€</div>
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
                          <span className="font-semibold">{payments[0].amount}€</span>
                        </div>
                        {payments.length > 2 && (
                          <div className="flex justify-between">
                            <span className="opacity-70">Volle Monate:</span>
                            <span className="font-semibold">{payments.length - 2} x {selectedBed.rent}€</span>
                          </div>
                        )}
                        {payments.length > 1 && (
                          <div className="flex justify-between">
                            <span className="opacity-70">Letzter Monat (anteilig):</span>
                            <span className="font-semibold">{payments[payments.length - 1].amount}€</span>
                          </div>
                        )}
                        <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                          <span className="font-bold">Gesamtmiete:</span>
                          <span className="font-bold text-lg text-green-400">{totalRent.toFixed(2)}€</span>
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

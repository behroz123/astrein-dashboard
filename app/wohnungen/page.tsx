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
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";
import { Home, MapPin, User, Calendar, Euro, CheckCircle, XCircle, Edit2, Trash2, Bed, DoorOpen, Plus, X } from "lucide-react";

type Payment = {
  month: number;
  year: number;
  amount: string;
  paid: boolean;
  paidDate?: string;
  markedBy?: string;
  markedByName?: string;
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
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
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
  }

  function handleEdit(wohnung: Wohnung) {
    setSelectedWohnung(wohnung);
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

  return (
    <div className="pb-12">
      {/* Professional Header */}
      <div className="mb-12">
        <button
          onClick={() => router.push('/immobilien')}
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "rgb(var(--foreground))" }}
        >
          {t("common.back")}
        </button>
        
        <div className="flex items-end gap-4 mb-2">
          <div className="text-6xl">🏢</div>
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2" style={{ color: "rgb(var(--foreground))" }}>
              {t("wohnungen.title")}
            </h1>
            <p className="text-base opacity-70">
              {t("fahrzeuge.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics - Minimalist Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <div className="rounded-2xl surface p-4 border border-white/10">
          <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.stats.total")}</div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-2xl surface p-4 border border-white/10">
          <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.stats.verfuegbar")}</div>
          <div className="text-3xl font-bold">{stats.verfügbar}</div>
        </div>
        <div className="rounded-2xl surface p-4 border border-white/10">
          <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.stats.vermietet")}</div>
          <div className="text-3xl font-bold">{stats.vermietet}</div>
        </div>
        <div className="rounded-2xl surface p-4 border border-white/10">
          <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.stats.renovierung")}</div>
          <div className="text-3xl font-bold">{stats.renovierung}</div>
        </div>
        <div className="rounded-2xl surface p-4 border border-white/10">
          <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.stats.zimmer")}</div>
          <div className="text-3xl font-bold">{stats.totalRooms}</div>
        </div>
        <div className="rounded-2xl surface p-4 border border-white/10">
          <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.stats.betten")}</div>
          <div className="text-3xl font-bold">{stats.totalBeds}</div>
        </div>
        <div className="rounded-2xl surface p-4 border border-white/10">
          <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.stats.belegt")}</div>
          <div className="text-3xl font-bold">{stats.occupiedBeds}/{stats.totalBeds}</div>
        </div>
      </div>

      {/* Rent Overview Section - Minimalist */}
      <div className="mb-8">
        {(() => {
          const rentOverview = calculateTotalRentOverview();
          const openPayments = getOpenPayments();
          
          return (
            <div className="space-y-4">
              {/* Main Overview Cards - Minimalist */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl surface border border-white/10 p-4">
                  <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.rent.total")}</div>
                  <div className="text-2xl font-bold">{rentOverview.totalRent}€</div>
                </div>
                <div className="rounded-2xl surface border border-white/10 p-4">
                  <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.rent.income")}</div>
                  <div className="text-2xl font-bold">{rentOverview.totalPaid}€</div>
                </div>
                <div className="rounded-2xl surface border border-white/10 p-4">
                  <div className="text-xs opacity-60 font-medium mb-2 uppercase tracking-wide">{t("wohnungen.rent.difference")}</div>
                  <div className="text-2xl font-bold">{rentOverview.difference >= 0 ? '+' : ''}{rentOverview.difference}€</div>
                </div>
              </div>

              {/* Open Payments List - Only show in detail view */}
              {!showMobileList && openPayments.length > 0 && selectedWohnung && (
                <div className="rounded-2xl surface border border-white/10 p-4">
                  <div className="text-sm font-semibold mb-3 opacity-80">{t("wohnungen.payments.open")} ({openPayments.length})</div>
                  <div className="space-y-2 text-sm">
                    {openPayments.map((payment, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg border border-white/5">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{payment.tenantName}</div>
                          <div className="text-xs opacity-60 truncate">{payment.wohnungAdresse} • {payment.roomName}</div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="font-semibold">{payment.openAmount}€</div>
                          {payment.isOverdue && (
                            <div className="text-xs opacity-70 font-medium">{t("wohnungen.payments.overdue")}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          
          <button
            onClick={handleNew}
            className="rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-6 py-2.5 text-sm font-semibold text-white transition shadow-lg whitespace-nowrap"
          >
            + {t("wohnungen.newWohnung")}
          </button>
          
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
                    setIsEditing(false);
                    setShowMobileList(false);
                  }}
                  className={`w-full text-left rounded-xl p-4 transition border ${
                    selectedWohnung?.id === wohnung.id 
                      ? "surface-2 border-blue-500/50 bg-blue-500/10" 
                      : "surface-2 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{wohnung.adresse || wohnung.address || "—"}</div>
                      <div className="text-xs opacity-60 truncate">{wohnung.stadtplz || "—"}</div>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 bg-white/10 border border-white/20">
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
                          if (totalBeds === 0) return "Frei";
                          
                          // Wenn alle Betten belegt sind
                          if (freeBeds === 0) {
                            return "Full";
                          }
                          
                          // Wenn komplette Zimmer frei sind
                          if (freeRooms > 0 && freeRooms === totalRooms) {
                            return `${freeRooms} Zimmer frei`;
                          }
                          
                          // Wenn einzelne Betten frei sind
                          if (freeBeds > 0) {
                            return `${freeBeds} Bett${freeBeds > 1 ? 'en' : ''} frei`;
                          }
                          
                          return "Frei";
                        }
                        return wohnung.status === "vermietet" ? "Vermietet" : "Ren.";
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs opacity-60 mb-2">
                    <span>{wohnung.zimmerzahl || "?"} Zi.</span>
                    <span>•</span>
                    <span>{wohnung.quadratmeter || "?"} m²</span>
                    {wohnung.miete && (
                      <>
                        <span>•</span>
                        <span>{wohnung.miete}€</span>
                      </>
                    )}
                  </div>
                  
                  {/* Rent Calculation */}
                  {wohnung.status === "vermietet" && wohnung.miete && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const diff = calculateRentDifference(wohnung);
                        const tenantsRent = (wohnung.rooms || []).reduce((sum, room) => {
                          return sum + room.beds.reduce((bedSum, bed) => {
                            return bedSum + (parseInt(bed.rent || "0") || 0);
                          }, 0);
                        }, 0);
                        
                        return (
                          <>
                            <span className="text-xs opacity-60">Einnahmen:</span>
                            <span className="text-xs font-semibold">{tenantsRent}€</span>
                            {diff !== 0 && (
                              <>
                                <span className="text-xs opacity-60">•</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 border border-white/20">
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
                <div className="rounded-lg bg-white/5 border border-purple-500/20 p-4 mb-4">
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
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-3">
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
                          <div key={bed.id} className="rounded-lg bg-white/5 border border-white/10 p-4">
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
                    <div key={room.id} className="rounded-lg bg-white/5 border border-white/10 p-3">
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
          <div className="rounded-2xl surface border border-white/5 p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <button
                  onClick={() => setShowMobileList(true)}
                  className="lg:hidden text-sm text-blue-400 hover:text-blue-300 mb-3"
                >
                  ← Zurück
                </button>
                <h2 className="text-3xl font-bold">{selectedWohnung.adresse || selectedWohnung.address || "—"}</h2>
                <p className="text-sm opacity-60 mt-1">{selectedWohnung.stadtplz || "—"}</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(selectedWohnung)}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  ✎ Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedWohnung)}
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  🗑️ Del
                </button>
              </div>
            </div>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 border border-white/40">
              {selectedWohnung.status === "verfügbar" ? <CheckCircle className="w-4 h-4" /> :
               selectedWohnung.status === "vermietet" ? <User className="w-4 h-4" /> :
               <XCircle className="w-4 h-4" />}
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
                    return "Full";
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
                return selectedWohnung.status === "vermietet" ? "Vermietet" : "Renovierung";
              })()}
            </div>

            {/* Rent Overview */}
            {selectedWohnung.miete && (
              <div className="rounded-lg surface-2 border border-white/10 p-4">
                <h3 className="text-sm font-semibold mb-4">Mietübersicht</h3>
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
                      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                        <div className="text-xs text-blue-400 font-medium">Gesamtmiete</div>
                        <div className="text-2xl font-bold text-blue-400 mt-2">{totalRent}€</div>
                      </div>
                      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                        <div className="text-xs opacity-60 font-medium">Einnahmen</div>
                        <div className="text-2xl font-bold mt-2">{tenantsRent}€</div>
                      </div>
                      <div className={`rounded-lg p-3 border ${
                        diff > 0 ? "bg-green-500/10 border-green-500/20" : diff < 0 ? "bg-red-500/10 border-red-500/20" : "bg-gray-500/10 border-gray-500/20"
                      }`}>
                        <div className={`text-xs font-medium ${
                          diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-gray-400"
                        }`}>
                          Differenz
                        </div>
                        <div className={`text-2xl font-bold mt-2 ${
                          diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-gray-400"
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
                <div className="rounded-2xl surface border border-orange-500/20 bg-orange-500/5 p-6">
                  <div className="text-lg font-semibold mb-4 text-orange-400">📋 Offene Mieten ({openPaymentsForProperty.length})</div>
                  <div className="space-y-3">
                    {openPaymentsForProperty.map((payment, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                        payment.isOverdue 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-black/20 border-orange-500/20'
                      }`}>
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {payment.tenantName}
                            {payment.isOverdue && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-semibold">
                                ÜBERFÄLLIG
                              </span>
                            )}
                          </div>
                          <div className="text-xs opacity-60 mt-1">
                            {payment.roomName} • Bett {payment.bedNumber}
                          </div>
                          <div className="text-xs opacity-60 mt-1">
                            {new Date(payment.year, payment.month - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                            <span className="opacity-50"> • Fällig bis 03.</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${payment.isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                            {payment.openAmount}€
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Wohnungsinfo */}
            <div className="rounded-lg surface-2 border border-white/10 p-4">
              <h3 className="text-sm font-semibold mb-3">Wohnungsinformationen</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs opacity-60 font-medium">Zimmerzahl</div>
                  <div className="font-semibold mt-1">{selectedWohnung.zimmerzahl || "—"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-60 font-medium">Quadratmeter</div>
                  <div className="font-semibold mt-1">{selectedWohnung.quadratmeter ? `${selectedWohnung.quadratmeter} m²` : "—"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-60 font-medium">Miete</div>
                  <div className="font-semibold opacity-80 mt-1">{selectedWohnung.miete ? `${selectedWohnung.miete} €` : "—"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-60 font-medium">Kaution</div>
                  <div className="font-semibold mt-1">{selectedWohnung.kaution ? `${selectedWohnung.kaution} €` : "—"}</div>
                </div>
              </div>
            </div>

            {/* Mieterinfo */}
            {selectedWohnung.status === "vermietet" && (
              <div className="rounded-lg surface-2 border border-white/10 p-4">
                <h3 className="text-sm font-semibold mb-3">Mieterinformationen</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <div className="text-xs opacity-60 font-medium">Aktueller Mieter</div>
                    <div className="font-semibold mt-1">{selectedWohnung.aktuellerMieter || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-60 font-medium">Mietbeginn</div>
                    <div className="font-semibold mt-1">{selectedWohnung.mietbeginn || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-60 font-medium">Mietende</div>
                    <div className="font-semibold mt-1">{selectedWohnung.mietende || "—"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Notizen */}
            {selectedWohnung.notizen && (
              <div className="rounded-lg surface-2 border border-white/10 p-4">
                <h3 className="text-sm font-semibold mb-3">Notizen</h3>
                <div className="text-sm opacity-90 whitespace-pre-wrap">{selectedWohnung.notizen}</div>
              </div>
            )}

            {/* Zimmer & Betten */}
            {selectedWohnung.rooms && selectedWohnung.rooms.length > 0 && (
              <div className="rounded-lg surface-2 border border-white/10 p-4">
                <h3 className="text-sm font-semibold mb-4">Zimmer & Betten</h3>
                <div className="space-y-4">
                  {selectedWohnung.rooms.map((room) => (
                    <div key={room.id} className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <DoorOpen className="w-4 h-4 opacity-60" />
                        <span className="font-semibold">{room.name}</span>
                        <span className="text-xs opacity-50">({room.beds.length})</span>
                        <span className="text-xs opacity-60 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                          {room.capacity || 1} Pers.
                        </span>
                        {room.suitableForCouple && (
                          <span className="text-xs opacity-60 bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                            👥 Paar
                          </span>
                        )}
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
                              <span className="font-medium">Bett {idx + 1}</span>
                            </div>
                            {bed.tenant && (
                              <div className="space-y-0.5 mt-1 opacity-80">
                                <div>{bed.tenant}</div>
                                {bed.rent && <div className="text-green-400">{bed.rent}€</div>}
                                {bed.moveOutDate && (
                                  <div className="text-orange-400 text-[10px] mt-1">
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
              className="w-full rounded-lg bg-white/20 hover:bg-white/30 px-4 py-3 text-sm font-semibold transition mb-6 flex items-center justify-center gap-2 border border-white/30"
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
                                  className={`rounded-xl p-4 flex flex-col items-center justify-center transition border cursor-pointer ${
                                    payment.paid 
                                      ? "bg-white/20 border-white/40" 
                                      : "bg-white/10 border-white/20 hover:bg-white/15"
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

            {/* Summary */}
            {selectedBed.moveInDate && selectedBed.rent && (
              <div className="mt-6 pt-6 border-t border-white/10">
                {(() => {
                  const payments = selectedBed.payments || generatePayments(selectedBed.moveInDate, selectedBed.rent, selectedBed.moveOutDate);
                  const today = new Date();
                  const currentMonth = today.getMonth();
                  const currentYear = today.getFullYear();
                  
                  // Nur vergangene und aktuelle Monate zählen
                  const duePayments = payments.filter(p => {
                    const paymentDate = new Date(p.year, p.month - 1);
                    return paymentDate <= new Date(currentYear, currentMonth);
                  });
                  
                  const paidPayments = duePayments.filter(p => p.paid);
                  const pendingPayments = duePayments.filter(p => !p.paid);
                  const totalPaid = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                  const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                  const totalDue = totalPaid + totalPending;
                  
                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                        <div className="text-xs opacity-60 font-medium">Bezahlt</div>
                        <div className="text-2xl font-bold mt-1">{totalPaid.toFixed(2)}€</div>
                        <div className="text-xs opacity-60 mt-1">{paidPayments.length} Monate</div>
                      </div>
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                        <div className="text-xs text-red-400 font-medium">Ausstehend</div>
                        <div className="text-2xl font-bold text-red-400 mt-1">{totalPending.toFixed(2)}€</div>
                        <div className="text-xs opacity-60 mt-1">{pendingPayments.length} Monate</div>
                      </div>
                      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                        <div className="text-xs text-blue-400 font-medium">Fällig Gesamt</div>
                        <div className="text-2xl font-bold text-blue-400 mt-1">{totalDue.toFixed(2)}€</div>
                        <div className="text-xs opacity-60 mt-1">{duePayments.length} Monate</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
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
                  className="flex-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 text-sm font-semibold transition"
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
    </div>
  );
}

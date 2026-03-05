"use client";

import { useEffect, useMemo, useState } from "react";
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
import jsPDF from "jspdf";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

type PropertyEntry = {
  id: string;
  address?: string;
};

type KeyProtocol = {
  id: string;
  type: "handover" | "return";
  personName: string;
  recipientName: string;
  objectAddress: string;
  keyDesc1: string;
  keyCount1: string;
  keyDesc2: string;
  keyCount2: string;
  issueDate: string;
  returnDate: string;
  propertyId?: string;
  archived?: boolean;
  createdAt?: any;
  createdByUid?: string;
  createdByName?: string;
};

const DECLARATION_TEXT =
  "Ich verpflichte mich hiermit die Schlüssel – ohne ausdrückliche Zustimmung des Arbeitgebers – " +
  "einer anderen Person zu übergeben oder zu überlassen. Im Falle eines Verlusts des Schlüssels " +
  "wird eine Summe von 50 Euro abgezogen.";

export default function SchluesseluebergabePage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [ready, setReady] = useState(false);
  const [properties, setProperties] = useState<PropertyEntry[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [showNewProperty, setShowNewProperty] = useState(false);
  const [newPropertyAddress, setNewPropertyAddress] = useState("");
  const [savingProperty, setSavingProperty] = useState(false);
  const [protocols, setProtocols] = useState<KeyProtocol[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState(true);
  const [protocolSearch, setProtocolSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [protocolType, setProtocolType] = useState<"handover" | "return">("handover");
  const [recipient, setRecipient] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [objectAddress, setObjectAddress] = useState("");
  const [keyDesc1, setKeyDesc1] = useState("Eingang Schlüssel");
  const [keyCount1, setKeyCount1] = useState("1");
  const [keyDesc2, setKeyDesc2] = useState("Zimmerschlüssel");
  const [keyCount2, setKeyCount2] = useState("1");
  const [issueDate, setIssueDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

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

    setPropertiesLoading(true);
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PropertyEntry[] = snap.docs.map((d) => ({
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

  useEffect(() => {
    if (!ready) return;

    setProtocolsLoading(true);
    const q = query(collection(db, "keyProtocols"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: KeyProtocol[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setProtocols(list);
        setProtocolsLoading(false);
      },
      () => {
        setProtocols([]);
        setProtocolsLoading(false);
      }
    );

    return () => unsub();
  }, [ready]);

  const totalCount = useMemo(() => properties.length, [properties]);
  const personSuggestions = useMemo(() => {
    const names = new Set<string>();
    protocols.forEach((p) => {
      if (p.personName) names.add(p.personName);
    });
    return Array.from(names).sort();
  }, [protocols]);

  const visibleProtocols = useMemo(() => {
    return protocols.filter((p) => (showArchived ? true : !p.archived));
  }, [protocols, showArchived]);

  async function handleAddProperty() {
    if (!newPropertyAddress.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    setSavingProperty(true);
    try {
      const docRef = await addDoc(collection(db, "properties"), {
        address: newPropertyAddress.trim(),
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByName: user.displayName || user.email || "Unbekannt",
      });

      setSelectedPropertyId(docRef.id);
      setObjectAddress(newPropertyAddress.trim());
      setNewPropertyAddress("");
      setShowNewProperty(false);
    } finally {
      setSavingProperty(false);
    }
  }

  function buildPdf(data: {
    type: "handover" | "return";
    personName: string;
    recipientName: string;
    objectAddress: string;
    keyDesc1: string;
    keyCount1: string;
    keyDesc2: string;
    keyCount2: string;
    issueDate: string;
    returnDate: string;
  }) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    let y = 15;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const title = data.type === "return" ? "Schlüsselrückgabeprotokoll" : "Schlüsselübergabeprotokoll";
    doc.text(title, width / 2, y, { align: "center" });

    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("AH Exzellent Immobilien GmbH", width / 2, y, { align: "center" });

    y += 20;

    // Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const personLabel = data.type === "return" ? "Rückgeber" : "Empfänger";
    doc.text(`${personLabel}: ` + (data.personName || "_______________________________"), 15, y);
    y += 8;

    if (data.type === "return") {
      doc.text("Empfänger: " + (data.recipientName || "_______________________________"), 15, y);
      y += 8;
    }

    doc.text("Objekt / Adresse: " + (data.objectAddress || "_______________________________"), 15, y);
    y += 8;

    doc.text("Datum Ausgabe: " + (data.issueDate ? new Date(data.issueDate).toLocaleDateString("de-DE") : "_______________"), 15, y);
    y += 8;

    doc.text("Datum Rückgabe: " + (data.returnDate ? new Date(data.returnDate).toLocaleDateString("de-DE") : "_______________"), 15, y);

    y += 15;

    // Schlüssel Tabelle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Schlüssel:", 15, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("1. " + (data.keyDesc1 || "________________") + " - Anzahl: " + (data.keyCount1 || "_"), 20, y);
    y += 7;

    doc.text("2. " + (data.keyDesc2 || "________________") + " - Anzahl: " + (data.keyCount2 || "_"), 20, y);

    y += 15;

    // Verpflichtungserklärung
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Verpflichtungserklärung:", 15, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const declLines = doc.splitTextToSize(DECLARATION_TEXT, 180);
    doc.text(declLines, 15, y);

    y += declLines.length * 4 + 20;

    // Unterschriften
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    
    const leftSignature = data.type === "return" ? "Rückgeber" : "Empfänger / Mieter";
    doc.text(leftSignature, 15, y);
    doc.text("Aussteller / Vermieterin", width / 2 + 15, y);

    y += 15;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, y, 70, y);
    doc.line(width / 2 + 15, y, width - 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Unterschrift / Datum", 15, y);
    doc.text("Unterschrift / Datum", width / 2 + 15, y);

    // Footer
    y = height - 8;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("AH Exzellent Immobilien GmbH | " + new Date().toLocaleDateString("de-DE"), width / 2, y, { align: "center" });

    return doc;
  }

  async function saveProtocol() {
    const user = auth.currentUser;
    if (!user) return;

    const recipientName = protocolType === "return"
      ? "AH Exzellent Immobilien GmbH"
      : recipient.trim();

    await addDoc(collection(db, "keyProtocols"), {
      type: protocolType,
      personName: recipient.trim(),
      recipientName,
      objectAddress: objectAddress.trim(),
      keyDesc1: keyDesc1.trim(),
      keyCount1: keyCount1.trim(),
      keyDesc2: keyDesc2.trim(),
      keyCount2: keyCount2.trim(),
      issueDate,
      returnDate,
      propertyId: selectedPropertyId || null,
      archived: false,
      createdAt: serverTimestamp(),
      createdByUid: user.uid,
      createdByName: user.displayName || user.email || "Unbekannt",
    });
  }

  async function handleArchiveProtocol(protocol: KeyProtocol) {
    await updateDoc(doc(db, "keyProtocols", protocol.id), {
      archived: true,
    });
  }

  async function handleDeleteProtocol(protocol: KeyProtocol) {
    if (!confirm("Protokoll wirklich löschen?")) return;
    await deleteDoc(doc(db, "keyProtocols", protocol.id));
  }

  async function handleSavePdf() {
    await saveProtocol();
    const recipientName = protocolType === "return"
      ? "AH Exzellent Immobilien GmbH"
      : recipient.trim();
    const doc = buildPdf({
      type: protocolType,
      personName: recipient.trim(),
      recipientName,
      objectAddress: objectAddress.trim(),
      keyDesc1,
      keyCount1,
      keyDesc2,
      keyCount2,
      issueDate,
      returnDate,
    });
    const name = recipient ? recipient.replace(/\s+/g, "_") : "Empfaenger";
    const fileLabel = protocolType === "return" ? "Rueckgabe" : "Uebergabe";
    doc.save(`Schluessel_${fileLabel}_${name}.pdf`);
  }

  async function handlePrintPdf() {
    await saveProtocol();
    const recipientName = protocolType === "return"
      ? "AH Exzellent Immobilien GmbH"
      : recipient.trim();
    const doc = buildPdf({
      type: protocolType,
      personName: recipient.trim(),
      recipientName,
      objectAddress: objectAddress.trim(),
      keyDesc1,
      keyCount1,
      keyDesc2,
      keyCount2,
      issueDate,
      returnDate,
    });
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) {
      win.onload = () => {
        win.focus();
        win.print();
      };
    }
  }

  function handlePrintSaved(protocol: KeyProtocol) {
    const doc = buildPdf({
      type: protocol.type || "handover",
      personName: protocol.personName || "",
      recipientName: protocol.recipientName || "",
      objectAddress: protocol.objectAddress || "",
      keyDesc1: protocol.keyDesc1 || "",
      keyCount1: protocol.keyCount1 || "",
      keyDesc2: protocol.keyDesc2 || "",
      keyCount2: protocol.keyCount2 || "",
      issueDate: protocol.issueDate || "",
      returnDate: protocol.returnDate || "",
    });
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) {
      win.onload = () => {
        win.focus();
        win.print();
      };
    }
  }

  if (!ready) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Modern Header */}
      <div className="mb-10">
        <button
          onClick={() => router.push('/immobilien')}
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
          Schlüsselübergabe
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: "rgb(var(--foreground))" }}>
              {t("schluesseluebergabe")}
            </h1>
            <p className="text-lg opacity-60">
              PDF nach A4-Standard
            </p>
          </div>
          <div className="text-sm font-semibold px-4 py-2 rounded-lg opacity-60"
               style={{ background: "rgba(var(--accent), 0.1)", color: "rgb(var(--accent))" }}>
            {totalCount} Wohnungen
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60">Protokoll-Typ</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setProtocolType("handover")}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold border ${
                    protocolType === "handover"
                      ? "border-emerald-400/60 text-emerald-300 bg-emerald-500/10"
                      : "border-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  Übergabe
                </button>
                <button
                  type="button"
                  onClick={() => setProtocolType("return")}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold border ${
                    protocolType === "return"
                      ? "border-orange-400/60 text-orange-300 bg-orange-500/10"
                      : "border-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  Rückgabe
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/60">
                {protocolType === "return" ? "Rückgeber" : "Empfänger"}
              </label>
              <input
                className="input mt-2"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={protocolType === "return" ? "Name des Rückgebers" : "Name des Empfängers"}
              />
              {recipient.trim().length > 0 && personSuggestions.length > 0 && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs">
                  <div className="text-white/50 mb-1">Vorschläge</div>
                  <div className="flex flex-wrap gap-2">
                    {personSuggestions
                      .filter((name) => name.toLowerCase().includes(recipient.toLowerCase()))
                      .slice(0, 8)
                      .map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setRecipient(name)}
                          className="rounded-md border border-white/10 px-2 py-1 text-white/80 hover:text-white"
                        >
                          {name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {protocolType === "return" && (
              <div>
                <label className="text-xs text-white/60">Empfänger</label>
                <div className="input mt-2 text-white/80">
                  AH Exzellent Immobilien GmbH
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-white/60">Objekt (Wohnung)</label>
              <select
                className="input mt-2"
                value={selectedPropertyId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedPropertyId(id);
                  const selected = properties.find((p) => p.id === id);
                  setObjectAddress(selected?.address || "");
                }}
                disabled={propertiesLoading || properties.length === 0}
              >
                <option value="">Wohnung auswählen</option>
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
                  Neue Wohnung eintragen
                </button>
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
                    {savingProperty ? t("common.pleaseWait") : "Wohnung speichern"}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Schlüsselbeschreibung</label>
                <input
                  className="input mt-2"
                  value={keyDesc1}
                  onChange={(e) => setKeyDesc1(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Anzahl</label>
                <input
                  className="input mt-2"
                  value={keyCount1}
                  onChange={(e) => setKeyCount1(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Schlüsselbeschreibung</label>
                <input
                  className="input mt-2"
                  value={keyDesc2}
                  onChange={(e) => setKeyDesc2(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Anzahl</label>
                <input
                  className="input mt-2"
                  value={keyCount2}
                  onChange={(e) => setKeyCount2(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Ausgabedatum</label>
                <input
                  type="date"
                  className="input mt-2"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Rückgabedatum</label>
                <input
                  type="date"
                  className="input mt-2"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSavePdf}
                className="btn-accent px-5 py-3 text-sm font-semibold"
              >
                Speichern (PDF)
              </button>
              <button
                onClick={handlePrintPdf}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/90 hover:text-white"
              >
                Drucken
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <div className="text-xs uppercase text-white/50">Vorschau-Text</div>
            <div className="mt-2 font-semibold text-white">
              {protocolType === "return" ? "Schlüsselrückgabeprotokoll" : "Schlüsselübergabeprotokoll"}
            </div>
            <div className="mt-3 space-y-2">
              <div>
                {protocolType === "return" ? "Rückgeber" : "Empfänger"}: {recipient || "—"}
              </div>
              {protocolType === "return" && (
                <div>Empfänger: AH Exzellent Immobilien GmbH</div>
              )}
              <div>Objekt: {objectAddress || "—"}</div>
              <div>
                Schlüssel 1: {keyDesc1 || "—"} ({keyCount1 || "—"}x)
              </div>
              <div>
                Schlüssel 2: {keyDesc2 || "—"} ({keyCount2 || "—"}x)
              </div>
              <div className="mt-3 text-white/70">{DECLARATION_TEXT}</div>
              <div className="mt-3">Ausgabedatum: {issueDate || "—"}</div>
              <div>Rückgabedatum: {returnDate || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Protokolle</h2>
            <p className="text-xs text-white/60">Alle gespeicherten Übergabe- und Rückgabeprotokolle</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              value={protocolSearch}
              onChange={(e) => setProtocolSearch(e.target.value)}
              placeholder="Suchen nach Name oder Objekt"
              className="input w-full sm:w-72"
            />
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 hover:text-white"
            >
              {showArchived ? "Archiv ausblenden" : "Archiv anzeigen"}
            </button>
          </div>
        </div>

        {protocolsLoading ? (
          <div className="text-sm muted">{t("common.loading")}</div>
        ) : (
          <div className="space-y-3">
            {visibleProtocols
              .filter((p) => {
                const query = protocolSearch.toLowerCase();
                return (
                  p.personName?.toLowerCase().includes(query) ||
                  p.objectAddress?.toLowerCase().includes(query) ||
                  p.recipientName?.toLowerCase().includes(query)
                );
              })
              .slice(0, 30)
              .map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs text-white/50">
                      {p.type === "return" ? "Rückgabe" : "Übergabe"}
                    </div>
                    <div className="text-sm text-white font-semibold">
                      {p.personName || "—"}
                    </div>
                    <div className="text-xs text-white/60">{p.objectAddress || "—"}</div>
                  </div>
                  <div className="text-xs text-white/50">
                    {p.issueDate || p.returnDate || "—"}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintSaved(p)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 hover:text-white"
                    >
                      Drucken
                    </button>
                    {!p.archived && (
                      <button
                        type="button"
                        onClick={() => handleArchiveProtocol(p)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white"
                      >
                        Archivieren
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteProtocol(p)}
                      className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:text-red-300"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

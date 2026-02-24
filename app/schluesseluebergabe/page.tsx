"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import jsPDF from "jspdf";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

type PropertyEntry = {
  id: string;
  address?: string;
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

  const totalCount = useMemo(() => properties.length, [properties]);

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

  function buildPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    let y = 15;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("Schlüsselübergabeprotokoll", width / 2, y, { align: "center" });

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

    doc.text("Empfänger: " + (recipient || "_______________________________"), 15, y);
    y += 8;

    doc.text("Objekt / Adresse: " + (objectAddress || "_______________________________"), 15, y);
    y += 8;

    doc.text("Datum Ausgabe: " + (issueDate ? new Date(issueDate).toLocaleDateString("de-DE") : "_______________"), 15, y);
    y += 8;

    doc.text("Datum Rückgabe: " + (returnDate ? new Date(returnDate).toLocaleDateString("de-DE") : "_______________"), 15, y);

    y += 15;

    // Schlüssel Tabelle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Schlüssel:", 15, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("1. " + (keyDesc1 || "________________") + " - Anzahl: " + (keyCount1 || "_"), 20, y);
    y += 7;

    doc.text("2. " + (keyDesc2 || "________________") + " - Anzahl: " + (keyCount2 || "_"), 20, y);

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
    
    doc.text("Empfänger / Mieter", 15, y);
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

  function handleSavePdf() {
    const doc = buildPdf();
    const name = recipient ? recipient.replace(/\s+/g, "_") : "Empfaenger";
    doc.save(`Schluesseluebergabe_${name}.pdf`);
  }

  function handlePrintPdf() {
    const doc = buildPdf();
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
    <div className="space-y-6">
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{t("schluesseluebergabe")}</h1>
            <div className="mt-1 text-sm muted">PDF nach A4-Standard</div>
          </div>
          <div className="text-sm text-white/70">{totalCount} Wohnungen</div>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60">Empfänger</label>
              <input
                className="input mt-2"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Name des Empfängers"
              />
            </div>

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
            <div className="mt-2 font-semibold text-white">Schlüsselübergabeprotokoll</div>
            <div className="mt-3 space-y-2">
              <div>Empfänger: {recipient || "—"}</div>
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
    </div>
  );
}

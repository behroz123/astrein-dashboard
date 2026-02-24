"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";
import { auth } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

export default function UntermietvertragPage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [ready, setReady] = useState(false);

  // Hauptmieter
  const [lessorFirstName, setLessorFirstName] = useState("");
  const [lessorLastName, setLessorLastName] = useState("");
  const [lessorStreet, setLessorStreet] = useState("");
  const [lessorCity, setLessorCity] = useState("");

  // Untermieter
  const [tenantFirstName, setTenantFirstName] = useState("");
  const [tenantLastName, setTenantLastName] = useState("");
  const [tenantStreet, setTenantStreet] = useState("");
  const [tenantCity, setTenantCity] = useState("");

  // Mietsache
  const [propertyAddress, setPropertyAddress] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [roomSize, setRoomSize] = useState("");
  const [totalRooms, setTotalRooms] = useState("");
  const [totalSize, setTotalSize] = useState("");
  const [furnished, setFurnished] = useState("nicht");
  const [keyCount, setKeyCount] = useState("");

  // Miete & Kaution
  const [coldRent, setColdRent] = useState("");
  const [heatingCosts, setHeatingCosts] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [deposit, setDeposit] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [paymentDay, setPaymentDay] = useState("3");

  // Mietdauer
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isIndefinite, setIsIndefinite] = useState(true);

  // Sonstige Vereinbarungen
  const [animals, setAnimals] = useState("");
  const [renovations, setRenovations] = useState("");
  const [otherTerms, setOtherTerms] = useState("");

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

  function buildPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    let y = 15;
    let pageNum = 1;

    const addFooter = () => {
      const footerY = height - 8;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Seite " + pageNum + " von 5", width / 2, footerY, { align: "center" });
    };

    const checkPageBreak = (minSpace = 30) => {
      if (y > height - minSpace) {
        addFooter();
        doc.addPage();
        pageNum++;
        y = 15;
      }
    };

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Untermietvertrag", width / 2, y, { align: "center" });

    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("zwischen", 15, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(lessorLastName + ", " + lessorFirstName, 15, y);
    y += 4;
    doc.text(lessorStreet, 15, y);
    y += 4;
    doc.text(lessorCity, 15, y);

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("- im Folgenden als Hauptmieter bezeichnet -", 15, y);

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("und", 15, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(tenantLastName + ", " + tenantFirstName, 15, y);
    y += 4;
    doc.text(tenantStreet, 15, y);
    y += 4;
    doc.text(tenantCity, 15, y);

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("- im Folgenden als Untermieter bezeichnet -", 15, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("wird nachfolgender privater Untermietvertrag geschlossen:", 15, y);

    checkPageBreak();

    // § 1. Mietsache
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 1. Mietsache", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text1 = doc.splitTextToSize(
      "Im Namen dieses Untermietvertrages werden in der oben genannten Adresse die nachfolgend aufgeführten Wohnräume des Hauptmieters zu Wohnzwecken und ausschließlichen Gebrauch an den Untermieter vermietet:",
      180
    );
    doc.text(text1, 15, y);
    y += text1.length * 4 + 3;

    doc.text("Adresse: " + (propertyAddress || "_______________________________"), 15, y);
    y += 6;
    doc.text("Anzahl Zimmer: " + (roomCount || "___") + "   Größe: " + (roomSize || "___") + " qm", 15, y);
    y += 6;
    doc.text(
      "Ausstattung: " + (furnished === "möbliert" ? "☑" : "☐") + " möbliert  " +
      (furnished === "teilmöbliert" ? "☑" : "☐") + " teilmöbliert  " +
      (furnished === "nicht" ? "☑" : "☐") + " nicht möbliert",
      15,
      y
    );
    y += 6;
    doc.text("Schlüssel übergeben: " + (keyCount || "___") + " Stück", 15, y);

    checkPageBreak();

    // § 2. Miete, Kaution und Nebenkosten
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 2. Miete, Kaution und Nebenkosten", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const totalRent =
      (parseFloat(coldRent) || 0) +
      (parseFloat(heatingCosts) || 0) +
      (parseFloat(otherCosts) || 0);

    doc.text("Kaltmiete monatlich: " + (coldRent || "___________") + " EUR", 15, y);
    y += 6;
    doc.text("Heizungs-/Warmwasserkosten: " + (heatingCosts || "___________") + " EUR", 15, y);
    y += 6;
    doc.text("Sonstige Nebenkosten: " + (otherCosts || "___________") + " EUR", 15, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Gesamtmiete monatlich: " + (totalRent > 0 ? totalRent.toFixed(2) : "___________") + " EUR", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text("Kaution: " + (deposit || "___________") + " EUR", 15, y);
    y += 6;
    doc.text("Die Kaution kann in 3 monatlichen Raten bezahlt werden.", 15, y);

    checkPageBreak();

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Zahlungsmodalitäten:", 15, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      "Zahlungstag: " + paymentDay + ". Werktag eines jeden Monats (im Voraus)",
      15,
      y
    );
    y += 6;
    doc.text("Kontoinhaber: " + (bankName || "_______________________________"), 15, y);
    y += 6;
    doc.text("IBAN: " + (iban || "_______________________________"), 15, y);

    checkPageBreak();

    // § 3. Mietdauer
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 3. Mietdauer", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const startDateStr = startDate ? new Date(startDate).toLocaleDateString("de-DE") : "_______________";
    const endDateStr = endDate ? new Date(endDate).toLocaleDateString("de-DE") : "_______________";

    doc.text("Mietbeginn: " + startDateStr, 15, y);
    y += 6;
    doc.text(
      "Mietdauer: " + (isIndefinite ? "☑" : "☐") + " auf unbestimmte Zeit  " +
      (!isIndefinite ? "☑" : "☐") + " bis: " + endDateStr,
      15,
      y
    );

    y += 10;
    const text3 = doc.splitTextToSize(
      "Die Dauer des Untermietverhältnisses entspricht maximal der Laufzeit des Hauptmietvertrages. Sollte der Hauptmietvertrag enden, so endet auch der Untermietvertrag.",
      180
    );
    doc.text(text3, 15, y);

    checkPageBreak();

    // § 4-7
    y += text3.length * 4 + 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 4. Weitere Untervermietung", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text4 = doc.splitTextToSize(
      "Der Untermieter darf ohne ausdrückliche Zustimmung des Hauptmieters weder weitervermieten noch die Räumlichkeiten Dritten überlassen.",
      180
    );
    doc.text(text4, 15, y);

    checkPageBreak();

    y += text4.length * 4 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 5. Besichtigungsrecht", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text5 = doc.splitTextToSize(
      "Der Hauptmieter, Vermieter oder Beauftragte können die Mietsache nach rechtzeitiger Ankündigung zu angemessener Tageszeit besichtigen. In dringenden Fällen (Feuer, Rohrbruch) ist eine Besichtigung auch ohne Vorankündigung möglich.",
      180
    );
    doc.text(text5, 15, y);

    y += text5.length * 4 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 6. Kündigung", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text6 = doc.splitTextToSize(
      "Hauptmieter: Kündigungsfrist 2 Wochen (bei unbefristeter Dauer). " +
      "Untermieter: Kündigung zum Ende eines Kalendermonats mit 4 Wochen Frist. " +
      "Außerordentliche fristlose Kündigung ist nach gesetzlichen Bestimmungen möglich.",
      180
    );
    doc.text(text6, 15, y);

    checkPageBreak();

    // § 7-10
    y += text6.length * 4 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 7. Schönheitsreparaturen", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text7 = doc.splitTextToSize(
      "Schönheitsreparaturen werden vom Untermieter in gleichem Umfang wie im Hauptmietvertrag durchgeführt.",
      180
    );
    doc.text(text7, 15, y);

    y += text7.length * 4 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 8. Rückgabe der Mietsache", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text8 = doc.splitTextToSize(
      "Bei Vertragsende hat der Untermieter die Wohnung in vereinbarter Kondition zurückzugeben. Alle Schlüssel sind herauszugeben. Der Untermieter trägt Verantwortung für Schäden. Bauliche Änderungen müssen auf Kosten des Untermieters rückgängig gemacht werden.",
      180
    );
    doc.text(text8, 15, y);

    checkPageBreak();

    y += text8.length * 4 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 9. Sonstige Vereinbarungen", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text("Tierhaltung:", 15, y);
    y += 4;
    const animalLines = doc.splitTextToSize(animals || "________________________________", 170);
    doc.text(animalLines, 20, y);
    y += animalLines.length * 3 + 3;

    doc.text("Bauliche Änderungen:", 15, y);
    y += 4;
    const renovationLines = doc.splitTextToSize(renovations || "________________________________", 170);
    doc.text(renovationLines, 20, y);
    y += renovationLines.length * 3 + 3;

    doc.text("Sonstiges:", 15, y);
    y += 4;
    const otherLines = doc.splitTextToSize(otherTerms || "________________________________", 170);
    doc.text(otherLines, 20, y);

    checkPageBreak();

    y += otherLines.length * 3 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 10. Unterschriften", 15, y);

    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Ort, Datum: ___________________________", 15, y);

    y += 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, y, 80, y);

    y += 3;
    doc.text("Unterschrift Hauptmieter", 15, y);

    y += 15;
    doc.text("Ort, Datum: ___________________________", 15, y);

    y += 10;
    doc.line(15, y, 80, y);

    y += 3;
    doc.text("Unterschrift Untermieter", 15, y);

    addFooter();

    return doc;
  }

  function handleSavePdf() {
    const doc = buildPdf();
    const name = tenantLastName ? tenantLastName.replace(/\s+/g, "_") : "Untermieter";
    doc.save(`Untermietvertrag_${name}.pdf`);
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
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {t("untermietvertrag")}
          </h1>
          <div className="mt-1 text-sm muted">Professioneller Untermietvertrag nach Mustervorlage</div>
        </div>
      </div>

      <div className="rounded-[28px] surface p-6">
        <div className="space-y-6">
          {/* Hauptmieter */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Hauptmieter</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Vorname</label>
                <input
                  type="text"
                  value={lessorFirstName}
                  onChange={(e) => setLessorFirstName(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Nachname</label>
                <input
                  type="text"
                  value={lessorLastName}
                  onChange={(e) => setLessorLastName(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Straße & Hausnummer</label>
                <input
                  type="text"
                  value={lessorStreet}
                  onChange={(e) => setLessorStreet(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">PLZ / Wohnort</label>
                <input
                  type="text"
                  value={lessorCity}
                  onChange={(e) => setLessorCity(e.target.value)}
                  className="input mt-2"
                />
              </div>
            </div>
          </div>

          {/* Untermieter */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Untermieter</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Vorname</label>
                <input
                  type="text"
                  value={tenantFirstName}
                  onChange={(e) => setTenantFirstName(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Nachname</label>
                <input
                  type="text"
                  value={tenantLastName}
                  onChange={(e) => setTenantLastName(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Straße & Hausnummer</label>
                <input
                  type="text"
                  value={tenantStreet}
                  onChange={(e) => setTenantStreet(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">PLZ / Wohnort</label>
                <input
                  type="text"
                  value={tenantCity}
                  onChange={(e) => setTenantCity(e.target.value)}
                  className="input mt-2"
                />
              </div>
            </div>
          </div>

          {/* Mietsache */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Mietsache (§ 1)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-white/60">Adresse der Wohnung</label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Anzahl Zimmer</label>
                <input
                  type="text"
                  value={roomCount}
                  onChange={(e) => setRoomCount(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Größe (qm)</label>
                <input
                  type="number"
                  value={roomSize}
                  onChange={(e) => setRoomSize(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Möblierung</label>
                <select
                  value={furnished}
                  onChange={(e) => setFurnished(e.target.value)}
                  className="input mt-2"
                >
                  <option value="möbliert">Möbliert</option>
                  <option value="teilmöbliert">Teilmöbliert</option>
                  <option value="nicht">Nicht möbliert</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60">Schlüssel (Anzahl)</label>
                <input
                  type="number"
                  value={keyCount}
                  onChange={(e) => setKeyCount(e.target.value)}
                  className="input mt-2"
                />
              </div>
            </div>
          </div>

          {/* Miete & Kaution */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Miete, Kaution & Nebenkosten (§ 2)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Kaltmiete (EUR/Monat)</label>
                <input
                  type="number"
                  value={coldRent}
                  onChange={(e) => setColdRent(e.target.value)}
                  step="0.01"
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Heizung/Warmwasser (EUR/Monat)</label>
                <input
                  type="number"
                  value={heatingCosts}
                  onChange={(e) => setHeatingCosts(e.target.value)}
                  step="0.01"
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Sonstige Nebenkosten (EUR/Monat)</label>
                <input
                  type="number"
                  value={otherCosts}
                  onChange={(e) => setOtherCosts(e.target.value)}
                  step="0.01"
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Kaution (EUR)</label>
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  step="0.01"
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Kontoinhaber</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">IBAN</label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Zahlungstag (Werktag)</label>
                <select
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(e.target.value)}
                  className="input mt-2"
                >
                  {[1, 2, 3, 4, 5].map((day) => (
                    <option key={day} value={day}>
                      {day}. Werktag
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Mietdauer */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Mietdauer (§ 3)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Mietbeginn</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input mt-2"
                />
              </div>
              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIndefinite}
                    onChange={(e) => setIsIndefinite(e.target.checked)}
                  />
                  <span className="text-sm text-white/60">Auf unbestimmte Zeit</span>
                </label>
              </div>
              {!isIndefinite && (
                <div>
                  <label className="text-xs text-white/60">Mietende</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input mt-2"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sonstige Vereinbarungen */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Sonstige Vereinbarungen (§ 9)</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/60">Tierhaltung</label>
                <textarea
                  value={animals}
                  onChange={(e) => setAnimals(e.target.value)}
                  placeholder="z.B. Keine Haustiere erlaubt / Hunde erlaubt / etc."
                  className="input mt-2 resize-none h-16"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Bauliche Veränderungen</label>
                <textarea
                  value={renovations}
                  onChange={(e) => setRenovations(e.target.value)}
                  placeholder="z.B. Nicht erlaubt / Nur mit schriftlicher Genehmigung / etc."
                  className="input mt-2 resize-none h-16"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Sonstige Vereinbarungen</label>
                <textarea
                  value={otherTerms}
                  onChange={(e) => setOtherTerms(e.target.value)}
                  placeholder="Weitere Vereinbarungen..."
                  className="input mt-2 resize-none h-16"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSavePdf}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-blue-600"
            >
              📥 PDF Herunterladen
            </button>
            <button
              onClick={handlePrintPdf}
              className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-green-700 hover:to-green-600"
            >
              🖨️ PDF Drucken
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";
import { auth } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

export default function MietvertragPage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [ready, setReady] = useState(false);

  // Vermieter
  const [lessorFirstName, setLessorFirstName] = useState("");
  const [lessorLastName, setLessorLastName] = useState("");
  const [lessorStreet, setLessorStreet] = useState("");
  const [lessorCity, setLessorCity] = useState("");

  // Mieter
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
    doc.text("Mietvertrag", width / 2, y, { align: "center" });

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
    doc.text("- im Folgenden als Vermieter bezeichnet -", 15, y);

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
    doc.text("- im Folgenden als Mieter bezeichnet -", 15, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("wird nachfolgender Mietvertrag geschlossen:", 15, y);

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
      "Der Vermieter vermietet an den Mieter die nachfolgend aufgeführten Wohnräume zu Wohnzwecken. Die Räumlichkeiten werden dem Mieter in einem ordentlichen und gebrauchsfähigen Zustand übergeben. Der Mieter erklärt sich mit dem Zustand der Räume einverstanden.",
      180
    );
    doc.text(text1, 15, y);
    y += text1.length * 4 + 3;

    doc.text("Adresse: " + (propertyAddress || "_______________________________"), 15, y);
    y += 6;
    doc.text("Anzahl Zimmer: " + (roomCount || "___") + "   Größe: " + (roomSize || "___") + " qm", 15, y);
    y += 6;
    doc.text("Gesamtwohnfläche: " + (totalSize || "___") + " qm", 15, y);
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

    checkPageBreak(80);

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

    checkPageBreak(80);

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
      "Die Mietdauer wird zu den oben genannten Bedingungen eingegangen.",
      180
    );
    doc.text(text3, 15, y);

    checkPageBreak(80);

    // § 4-7
    y += text3.length * 4 + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 4. Besichtigungsrecht", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text4 = doc.splitTextToSize(
      "Der Vermieter oder sein Beauftragte können die Mietsache nach rechtzeitiger Ankündigung (mindestens 24 Stunden vorher) zu angemessener Tageszeit zur Durchführung von Inspektionen, Reparaturen oder zur Besichtigung für potenzielle Käufer oder Mieter besichtigen. In dringenden Fällen (Feuer, Rohrbruch, Wasserschaden) ist eine Besichtigung auch ohne Vorankündigung möglich. Der Mieter ist verpflichtet, den Zutritt zu gewähren.",
      180
    );
    doc.text(text4, 15, y);

    checkPageBreak(80);

    y += text4.length * 4 + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 5. Kündigung", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text5 = doc.splitTextToSize(
      "Vermieter und Mieter können das Mietverhältnis zum Ende eines Kalendermonats mit einer Frist von 3 Monaten kündigen, wenn ein wichtiger Grund vorliegt (z.B. Eigenbedarf, schwere Pflichtverletzungen). Andernfalls beträgt die Kündigungsfrist einen Monat zum Ende eines Kalendermonats. Kündigungen müssen schriftlich erfolgen und müssen dem anderen Teil in angemessener Frist vorliegen. Bei Zahlungsverzug von mehr als zwei aufeinanderfolgenden Monatsmieten kann der Vermieter das Mietverhältnis außerordentlich kündigen.",
      180
    );
    doc.text(text5, 15, y);

    checkPageBreak(80);

    // § 6-9
    y += text5.length * 4 + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 6. Schönheitsreparaturen", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text6 = doc.splitTextToSize(
      "Der Mieter verpflichtet sich, die Wohnung und die Räume in einem sauberen und ordentlichen Zustand zu halten. Schönheitsreparaturen (wie Tapezieren, Anstreichen von Wänden und Decken) sind vom Mieter durchzuführen und müssen bei Auszug in einem verwendbaren Zustand übergeben werden. Der Mieter ist verantwortlich für die regelmäßige Reinigung sowie für anfallende Unterhaltsarbeiten.",
      180
    );
    doc.text(text6, 15, y);

    y += text6.length * 4 + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 7. Rückgabe der Mietsache", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text7 = doc.splitTextToSize(
      "Bei Vertragsende hat der Mieter die Wohnung in dem Zustand zurückzugeben, in dem sie übergeben wurde, mit Ausnahme normaler Abnutzung. Die Übergabe muss in Gegenwart des Vermieters stattfinden und ist schriftlich zu dokumentieren. Alle Schlüssel (Wohnungs-, Hausschlüssel, Briefkastenschlüssel, usw.) sind herauszugeben. Der Mieter trägt Verantwortung für alle Schäden, die während der Mietdauer entstanden sind und nicht auf normale Abnutzung zurückzuführen sind. Bauliche Änderungen müssen auf Kosten des Mieters rückgängig gemacht werden. Die Kaution wird nach Überprüfung der Wohnung und Abzug allfälliger Mietschulden und Schadensersatzforderungen innerhalb von 30 Tagen nach Übergabe erstattet.",
      180
    );
    doc.text(text7, 15, y);

    checkPageBreak(80);

    y += text7.length * 4 + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 8. Sonstige Vereinbarungen", 15, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text("Tierhaltung:", 15, y);
    y += 6;
    const animalLines = doc.splitTextToSize(animals || "________________________________", 170);
    doc.text(animalLines, 20, y);
    y += animalLines.length * 4 + 6;

    doc.text("Bauliche Änderungen:", 15, y);
    y += 6;
    const renovationLines = doc.splitTextToSize(renovations || "________________________________", 170);
    doc.text(renovationLines, 20, y);
    y += renovationLines.length * 4 + 6;

    doc.text("Sonstiges:", 15, y);
    y += 6;
    const otherLines = doc.splitTextToSize(otherTerms || "________________________________", 170);
    doc.text(otherLines, 20, y);

    checkPageBreak(80);

    y += otherLines.length * 4 + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("§ 9. Unterschriften", 15, y);

    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Ort, Datum: ___________________________", 15, y);

    y += 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, y, 80, y);

    y += 3;
    doc.text("Unterschrift Vermieter", 15, y);

    y += 15;
    doc.text("Ort, Datum: ___________________________", 15, y);

    y += 10;
    doc.line(15, y, 80, y);

    y += 3;
    doc.text("Unterschrift Mieter", 15, y);

    addFooter();

    return doc;
  }

  function handleSavePdf() {
    const doc = buildPdf();
    const name = tenantLastName ? tenantLastName.replace(/\s+/g, "_") : "Mieter";
    doc.save(`Mietvertrag_${name}.pdf`);
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
    <div className="pb-8">
      {/* Modern Header */}
      <div className="mb-10">
        <button
          onClick={() => router.push('/immobilien')}
          className="inline-flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "rgb(var(--foreground))" }}
        >
          {t("contract.back")}
        </button>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold" 
             style={{ 
               background: "rgba(var(--accent), 0.1)",
               color: "rgb(var(--accent))"
             }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgb(var(--accent))" }}></span>
          Mietvertrag
        </div>
        <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: "rgb(var(--foreground))" }}>
          {t("mietvertrag")}
        </h1>
        <p className="text-lg opacity-60">
          Professioneller Mietvertrag nach Mustervorlage
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-[28px] surface p-6">
          <div className="space-y-6">
          {/* Vermieter */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Vermieter</h3>
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

          {/* Mieter */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Mieter</h3>
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
            <h3 className="text-lg font-semibold text-white mb-4">Sonstige Vereinbarungen (§ 8)</h3>
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
    </div>
  );
}

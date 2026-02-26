"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

type Contract = {
  id: string;
  propertyName: string;
  monthlyPayment: string;
  accountNumber?: string;
  providerName?: string;
  meterNumber?: string;
};

export default function ReportsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [electricityContracts, setElectricityContracts] = useState<Contract[]>([]);
  const [waterContracts, setWaterContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "electricity" | "water" | "comparison">("overview");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function loadContracts() {
      try {
        // Load electricity contracts
        const elecQuery = query(collection(db, "electricityContracts"));
        const elecDocs = await getDocs(elecQuery);
        const elecData = elecDocs.docs.map((d) => ({
          id: d.id,
          propertyName: d.data().propertyName,
          monthlyPayment: d.data().monthlyPayment,
          accountNumber: d.data().accountNumber,
          providerName: d.data().providerName,
          meterNumber: d.data().meterNumber,
        }));

        // Load water contracts
        const waterQuery = query(collection(db, "waterContracts"));
        const waterDocs = await getDocs(waterQuery);
        const waterData = waterDocs.docs.map((d) => ({
          id: d.id,
          propertyName: d.data().propertyName,
          monthlyPayment: d.data().monthlyPayment,
          accountNumber: d.data().accountNumber,
          providerName: d.data().providerName,
          meterNumber: d.data().meterNumber,
        }));

        setElectricityContracts(elecData);
        setWaterContracts(waterData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading contracts:", error);
        setLoading(false);
      }
    }

    loadContracts();
  }, [authReady, user, router]);

  const totalElectricity = electricityContracts.reduce(
    (sum, c) => sum + parseFloat(c.monthlyPayment || "0"),
    0
  );
  const totalWater = waterContracts.reduce((sum, c) => sum + parseFloat(c.monthlyPayment || "0"), 0);
  const totalCosts = totalElectricity + totalWater;

  const allProperties = Array.from(
    new Set([
      ...electricityContracts.map((c) => c.propertyName),
      ...waterContracts.map((c) => c.propertyName),
    ])
  );

  const propertyBreakdown = allProperties.map((prop) => {
    const elec = electricityContracts.find((c) => c.propertyName === prop);
    const water = waterContracts.find((c) => c.propertyName === prop);
    const elecCost = elec ? parseFloat(elec.monthlyPayment || "0") : 0;
    const waterCost = water ? parseFloat(water.monthlyPayment || "0") : 0;
    return {
      property: prop,
      electricity: elecCost,
      water: waterCost,
      total: elecCost + waterCost,
    };
  });

  if (!authReady || loading) {
    return (
      <div className="p-6 min-h-screen">
        <div className="rounded-[28px] surface p-6 text-sm muted">Lädt Berichte...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-[28px] surface p-6">
        <div className="text-xs muted">Statistiken</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Kostenberichte & Analysen</h1>
        <p className="mt-2 text-sm muted">Detaillierte Übersicht aller Utility-Kosten</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto">
        {["overview", "electricity", "water", "comparison"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
              activeTab === tab
                ? "surface text-white"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            {tab === "overview" && "Übersicht"}
            {tab === "electricity" && "Strom"}
            {tab === "water" && "Wasser"}
            {tab === "comparison" && "Vergleich"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-[28px] surface p-6">
              <div className="text-xs text-white/60">Monatlich (Strom)</div>
              <div className="text-2xl font-bold text-blue-400 mt-2">
                {totalElectricity.toFixed(2)} €
              </div>
              <div className="text-xs text-white/50 mt-2">
                {electricityContracts.length} Verträge
              </div>
            </div>
            <div className="rounded-[28px] surface p-6">
              <div className="text-xs text-white/60">Monatlich (Wasser)</div>
              <div className="text-2xl font-bold text-cyan-400 mt-2">
                {totalWater.toFixed(2)} €
              </div>
              <div className="text-xs text-white/50 mt-2">
                {waterContracts.length} Verträge
              </div>
            </div>
            <div className="rounded-[28px] surface p-6">
              <div className="text-xs text-white/60">Monatlich (Gesamt)</div>
              <div className="text-2xl font-bold text-green-400 mt-2">
                {totalCosts.toFixed(2)} €
              </div>
              <div className="text-xs text-white/50 mt-2">
                {electricityContracts.length + waterContracts.length} Verträge
              </div>
            </div>
            <div className="rounded-[28px] surface p-6">
              <div className="text-xs text-white/60">Jährlich (Gesamt)</div>
              <div className="text-2xl font-bold text-purple-400 mt-2">
                {(totalCosts * 12).toFixed(2)} €
              </div>
              <div className="text-xs text-white/50 mt-2">
                Geschätzte Jahreskosten
              </div>
            </div>
          </div>

          {/* Property Breakdown */}
          <div className="rounded-[28px] surface p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Kostenaufschlüsselung nach Immobilie</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-white/70">Immobilie</th>
                    <th className="px-4 py-3 text-right text-white/70">Strom/Monat</th>
                    <th className="px-4 py-3 text-right text-white/70">Wasser/Monat</th>
                    <th className="px-4 py-3 text-right text-white/70">Gesamt/Monat</th>
                    <th className="px-4 py-3 text-right text-white/70">Jährlich</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyBreakdown.map((row, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-white font-medium">{row.property}</td>
                      <td className="px-4 py-3 text-right text-blue-400">
                        {row.electricity.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right text-cyan-400">
                        {row.water.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-semibold">
                        {row.total.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right text-purple-400">
                        {(row.total * 12).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-white/5 font-semibold">
                    <td className="px-4 py-3 text-white">GESAMT</td>
                    <td className="px-4 py-3 text-right text-blue-400">
                      {totalElectricity.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-cyan-400">
                      {totalWater.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-green-400">
                      {totalCosts.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-purple-400">
                      {(totalCosts * 12).toFixed(2)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Electricity Tab */}
      {activeTab === "electricity" && (
        <div className="rounded-[28px] surface p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Stromkosten Details</h2>
          <div className="space-y-3">
            {electricityContracts.length === 0 ? (
              <p className="text-sm muted">Keine Stromverträge vorhanden</p>
            ) : (
              electricityContracts.map((contract) => (
                <div key={contract.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white">{contract.propertyName}</div>
                    <div className="text-lg font-bold text-blue-400">
                      {parseFloat(contract.monthlyPayment || "0").toFixed(2)} €/Monat
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-white/60 mt-3">
                    <div>
                      <span className="muted">Anbieter:</span> {contract.providerName || "—"}
                    </div>
                    <div>
                      <span className="muted">Kontonr:</span> {contract.accountNumber || "—"}
                    </div>
                    <div>
                      <span className="muted">Zählernr:</span> {contract.meterNumber || "—"}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
                    Jährlich: {(parseFloat(contract.monthlyPayment || "0") * 12).toFixed(2)} €
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Water Tab */}
      {activeTab === "water" && (
        <div className="rounded-[28px] surface p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Wasserkosten Details</h2>
          <div className="space-y-3">
            {waterContracts.length === 0 ? (
              <p className="text-sm muted">Keine Wasserverträge vorhanden</p>
            ) : (
              waterContracts.map((contract) => (
                <div key={contract.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white">{contract.propertyName}</div>
                    <div className="text-lg font-bold text-cyan-400">
                      {parseFloat(contract.monthlyPayment || "0").toFixed(2)} €/Monat
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-white/60 mt-3">
                    <div>
                      <span className="muted">Anbieter:</span> {contract.providerName || "—"}
                    </div>
                    <div>
                      <span className="muted">Kontonr:</span> {contract.accountNumber || "—"}
                    </div>
                    <div>
                      <span className="muted">Zählernr:</span> {contract.meterNumber || "—"}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
                    Jährlich: {(parseFloat(contract.monthlyPayment || "0") * 12).toFixed(2)} €
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          {/* Pie Chart Equivalent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[28px] surface p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Kostenverteilung (Monatlich)</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Strom</span>
                    <span className="text-sm font-semibold text-blue-400">
                      {((totalElectricity / totalCosts) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                      style={{ width: `${(totalElectricity / totalCosts) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Wasser</span>
                    <span className="text-sm font-semibold text-cyan-400">
                      {((totalWater / totalCosts) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                      style={{ width: `${(totalWater / totalCosts) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">Gesamt monatlich</span>
                  <span className="text-lg font-bold text-green-400">{totalCosts.toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-white/60">
                  <span>Gesamt jährlich</span>
                  <span>{(totalCosts * 12).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] surface p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top Immobilien nach Kosten</h3>
              <div className="space-y-3">
                {propertyBreakdown
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 5)
                  .map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white mb-1">{item.property}</div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{
                              width: `${Math.max((item.total / propertyBreakdown[0].total) * 100, 5)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-semibold text-white">{item.total.toFixed(2)} €</div>
                        <div className="text-xs text-white/50">/Monat</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

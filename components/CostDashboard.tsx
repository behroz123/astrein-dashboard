"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../lib/firebase";

type ElectricityContract = {
  propertyName: string;
  monthlyPayment: string;
};

type WaterContract = {
  propertyName: string;
  monthlyPayment: string;
};

export default function CostDashboard() {
  const [electricityCosts, setElectricityCosts] = useState<ElectricityContract[]>([]);
  const [waterCosts, setWaterCosts] = useState<WaterContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCosts() {
      try {
        // Load electricity contracts
        const elecQuery = query(collection(db, "electricityContracts"));
        const elecDocs = await getDocs(elecQuery);
        const elecData = elecDocs.docs.map((d) => ({
          propertyName: d.data().propertyName,
          monthlyPayment: d.data().monthlyPayment,
        }));

        // Load water contracts
        const waterQuery = query(collection(db, "waterContracts"));
        const waterDocs = await getDocs(waterQuery);
        const waterData = waterDocs.docs.map((d) => ({
          propertyName: d.data().propertyName,
          monthlyPayment: d.data().monthlyPayment,
        }));

        setElectricityCosts(elecData);
        setWaterCosts(waterData);
      } catch (error) {
        console.error("Error loading costs:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCosts();
  }, []);

  const totalElectricity = electricityCosts.reduce(
    (sum, c) => sum + parseFloat(c.monthlyPayment || "0"),
    0
  );

  const totalWater = waterCosts.reduce((sum, c) => sum + parseFloat(c.monthlyPayment || "0"), 0);

  const totalCosts = totalElectricity + totalWater;

  if (loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        Lädt Kosten...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kosten Übersicht Karten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strom */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-white/60">Stromkosten</div>
              <div className="text-3xl font-bold text-white mt-1">
                {totalElectricity.toFixed(2)} €
              </div>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
          <div className="text-xs text-white/50">
            {electricityCosts.length} Verträge
          </div>
        </div>

        {/* Wasser */}
        <div className="rounded-[28px] surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-white/60">Wasserkosten</div>
              <div className="text-3xl font-bold text-white mt-1">
                {totalWater.toFixed(2)} €
              </div>
            </div>
            <div className="text-4xl">💧</div>
          </div>
          <div className="text-xs text-white/50">
            {waterCosts.length} Verträge
          </div>
        </div>

        {/* Gesamt */}
        <div className="rounded-[28px] surface p-6 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-white/60">Gesamtkosten (monatlich)</div>
              <div className="text-3xl font-bold text-green-400 mt-1">
                {totalCosts.toFixed(2)} €
              </div>
            </div>
            <div className="text-4xl">💰</div>
          </div>
          <div className="text-xs text-white/50">
            {electricityCosts.length + waterCosts.length} Verträge gesamt
          </div>
        </div>
      </div>

      {/* Wasserkosten Detail */}
      {waterCosts.length > 0 && (
        <div className="rounded-[28px] surface p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Wasserkosten Übersicht</h3>
          <div className="space-y-2">
            {waterCosts.map((contract, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <span className="text-sm text-white/80">{contract.propertyName}</span>
                <span className="text-sm font-semibold text-cyan-400">
                  {parseFloat(contract.monthlyPayment || "0").toFixed(2)} €/Monat
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jahreskosten */}
      <div className="rounded-[28px] surface p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <h3 className="text-lg font-semibold text-white mb-4">Geschätzte Jahreskosten</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-white/60">Strom/Jahr</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {(totalElectricity * 12).toFixed(2)} €
            </div>
          </div>
          <div>
            <div className="text-sm text-white/60">Wasser/Jahr</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {(totalWater * 12).toFixed(2)} €
            </div>
          </div>
          <div>
            <div className="text-sm text-white/60">Gesamt/Jahr</div>
            <div className="text-2xl font-bold text-green-400 mt-1">
              {(totalCosts * 12).toFixed(2)} €
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

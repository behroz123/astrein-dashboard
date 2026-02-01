"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { usePrefs } from "../lib/prefs";

type LogType = "wareneingang" | "warenausgang";

type LogEntry = {
  id: string;
  itemId: string;
  itemName: string;
  menge: number;
  alterBestand: number;
  neuerBestand: number;
  timestamp: Timestamp | Date | string;
  userId: string;
  userName?: string;
  type?: string;
};

interface LogsHistoryProps {
  logType: LogType;
}

export default function LogsHistory({ logType }: LogsHistoryProps) {
  const { t } = usePrefs();
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterUser, setFilterUser] = useState("");
  const [filterItemId, setFilterItemId] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  
  const [visibleCount, setVisibleCount] = useState(20);

  const isWareneingang = logType === "wareneingang";
  const color = isWareneingang ? "green" : "red";

  // Real-time listener
  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LogEntry[];

        // Filter nach Typ
        const typeFilter = isWareneingang ? "wareneingang" : ["warenausgang", "out"];
        const filtered = allLogs.filter(log => 
          Array.isArray(typeFilter) 
            ? typeFilter.includes(log.type || "") 
            : log.type === typeFilter
        );

        setLogs(filtered);
        setLoading(false);
      },
      (err) => {
        console.error("Fehler beim Laden der Logs:", err);
        setError(t("error.loadingLogs") || "Fehler beim Laden der Logs");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [logType, isWareneingang, t]);

  // Filter-Logik
  const filteredLogs = logs.filter((log) => {
    const userName = log.userName && !log.userName.includes('@') 
      ? log.userName 
      : log.userName?.split('@')[0] || log.userId || "";
    
    const matchUser = filterUser === "" || userName.toLowerCase().includes(filterUser.toLowerCase());
    const matchItemId = filterItemId === "" || log.itemId.toLowerCase().includes(filterItemId.toLowerCase());
    const matchCategory = filterCategory === "" || (log.itemName && log.itemName.toLowerCase().includes(filterCategory.toLowerCase()));
    
    let matchDate = true;
    if (filterDate) {
      const logDate = log.timestamp instanceof Timestamp 
        ? log.timestamp.toDate() 
        : log.timestamp instanceof Date 
        ? log.timestamp 
        : new Date(log.timestamp);
      const logDateStr = logDate.toISOString().split('T')[0];
      matchDate = logDateStr === filterDate;
    }
    
    return matchUser && matchItemId && matchDate && matchCategory;
  });

  // Extrahiere unique Werte
  const uniqueUsers = Array.from(new Set(logs.map(log => {
    const userName = log.userName && !log.userName.includes('@') 
      ? log.userName 
      : log.userName?.split('@')[0] || log.userId || "";
    return userName;
  }))).filter(Boolean).sort();

  const uniqueCategories = Array.from(new Set(logs.map(log => log.itemName).filter(Boolean))).sort();

  // Pagination
  const displayedLogs = filteredLogs.slice(0, visibleCount);
  const hasMore = filteredLogs.length > visibleCount;

  // Export Funktion
  const exportToCSV = () => {
    const headers = ["Datum", "Benutzer", "Artikel-ID", "Artikel", "Menge", "Alter Bestand", "Neuer Bestand"];
    const rows = filteredLogs.map(log => {
      const date = formatTimestamp(log.timestamp);
      const userName = log.userName && !log.userName.includes('@') 
        ? log.userName 
        : log.userName?.split('@')[0] || log.userId || t("log.unknownUser");
      return [
        date,
        userName,
        log.itemId,
        log.itemName,
        log.menge,
        log.alterBestand,
        log.neuerBestand
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${logType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setFilterUser("");
    setFilterItemId("");
    setFilterDate("");
    setFilterCategory("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] surface p-6">
          <div className="text-sm muted">{t(`${logType}.loading`)}</div>
        </div>
        <div className="rounded-[28px] surface p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-black/25 p-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="h-3 bg-white/10 rounded"></div>
                  <div className="h-3 bg-white/10 rounded"></div>
                  <div className="h-3 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] surface p-6">
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{t(`${logType}.title`)}</h1>
            <div className="mt-1 text-sm muted">
              {t(`${logType}.subtitle`)}
            </div>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/85 hover:bg-white/5 transition"
          >
            {t("common.back")}
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-[28px] surface p-6">
        <div className="mb-6">
          <div className="text-sm font-semibold text-white/90 mb-3">{t("filters")}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">{t("log.has")} {t("role")}</label>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/25 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none"
              >
                <option value="">{t("all")}</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">{t("log.articleId")}</label>
              <input
                type="text"
                placeholder="G-LA-001..."
                value={filterItemId}
                onChange={(e) => setFilterItemId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/25 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">{t("category")}</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/25 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none"
              >
                <option value="">{t("all")}</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Datum</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/25 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
          {(filterUser || filterItemId || filterDate || filterCategory) && (
            <button
              onClick={resetFilters}
              className="mt-3 text-xs text-white/60 hover:text-white transition"
            >
              {t("filter.reset")}
            </button>
          )}
        </div>
      </div>

      {/* Logs Liste */}
      <div className="rounded-[28px] surface p-6">
        {displayedLogs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/40 text-sm">
              {logs.length === 0 ? t(`${logType}.noData`) : t("filter.noResults")}
            </div>
          </div>
        )}
        {displayedLogs.length > 0 && (
          <>
            <div className="space-y-3">
              {displayedLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4 hover:bg-white/5 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className={`w-2 h-2 rounded-full bg-${color}-500`}></div>
                        <span className="font-semibold text-white">
                          {log.userName && !log.userName.includes('@') 
                            ? log.userName 
                            : log.userName?.split('@')[0] || log.userId || t("log.unknownUser")}
                        </span>
                        <span className="text-white/60">{t("log.has")}</span>
                        <span className="font-semibold text-white">
                          {log.itemName}
                        </span>
                        <span className="text-white/60">{t(`${logType}.${isWareneingang ? 'added' : 'removed'}`)}</span>
                        <span className="text-white/40 text-xs ml-auto">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                        <div>
                          <div className="text-xs text-white/50">{t("log.articleId")}</div>
                          <div className="text-sm text-white/80 font-mono">
                            {log.itemId}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-white/50">{t("log.quantity")}</div>
                          <div className="text-sm text-white/80">
                            <span className={`text-${color}-400 font-semibold`}>
                              {isWareneingang ? '+' : '-'}{log.menge}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-white/50">{t("log.stock")}</div>
                          <div className="text-sm text-white/80">
                            {log.alterBestand} → {log.neuerBestand}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
                        <svg
                          className={`w-6 h-6 text-${color}-400`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {isWareneingang ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination & Stats */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-white/40">
                {t(filteredLogs.length === 1 ? "log.showingEntry" : "log.showingEntries", { 
                  n: displayedLogs.length,
                  total: filteredLogs.length 
                })}
              </div>
              
              {hasMore && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 20)}
                  className="rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/85 hover:bg-white/5 transition"
                >
                  {t("pagination.loadMore")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(ts: Timestamp | Date | string): string {
  if (!ts) return "—";

  let date: Date;
  if (ts instanceof Timestamp) {
    date = ts.toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    date = new Date(ts);
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

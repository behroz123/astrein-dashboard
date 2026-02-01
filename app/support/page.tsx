"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

type SupportTicket = {
  id: string;
  userId: string;
  userName: string;
  messages: Array<{ text: string; sender: string; timestamp: any }>;
  status: "open" | "in-progress" | "closed";
  createdAt: any;
  updatedAt?: any;
};

export default function SupportTicketsPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const [ready, setReady] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

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

    const q = query(collection(db, "supportTickets"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketList: SupportTicket[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as SupportTicket));
      setTickets(ticketList);
    });

    return () => unsubscribe();
  }, [ready]);

  async function handleStatusChange(ticketId: string, newStatus: "open" | "in-progress" | "closed") {
    try {
      await updateDoc(doc(db, "supportTickets", ticketId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const user = auth.currentUser;
      const supportUserName = user?.displayName || user?.email || "Support";

      // Add reply to user's chat messages
      await addDoc(collection(db, "chatMessages"), {
        userId: selectedTicket.userId,
        userName: supportUserName,
        text: replyText,
        sender: "support",
        timestamp: Timestamp.now(),
      });

      // Update ticket status
      await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
        status: "in-progress",
        updatedAt: Timestamp.now(),
      });

      setReplyText("");
      alert("Antwort gesendet!");
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Fehler beim Senden");
    } finally {
      setSending(false);
    }
  }

  function formatTimestamp(timestamp: any): string {
    if (!timestamp) return "";
    
    let date: Date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!ready) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        {t("common.loading")}
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === "open");
  const inProgressTickets = tickets.filter(t => t.status === "in-progress");
  const closedTickets = tickets.filter(t => t.status === "closed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Support Tickets</h1>
            <div className="mt-1 text-sm muted">
              Mitarbeiter-Anfragen verwalten
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-[28px] surface p-6">
          <div className="text-sm text-white/60 mb-1">Offen</div>
          <div className="text-3xl font-bold text-red-400">{openTickets.length}</div>
        </div>
        <div className="rounded-[28px] surface p-6">
          <div className="text-sm text-white/60 mb-1">In Bearbeitung</div>
          <div className="text-3xl font-bold text-yellow-400">{inProgressTickets.length}</div>
        </div>
        <div className="rounded-[28px] surface p-6">
          <div className="text-sm text-white/60 mb-1">Geschlossen</div>
          <div className="text-3xl font-bold text-green-400">{closedTickets.length}</div>
        </div>
      </div>

      {/* Tickets List and Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <div className="rounded-[28px] surface p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Alle Tickets</h2>
          
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              Keine Tickets vorhanden
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 rounded-2xl border transition ${
                    selectedTicket?.id === ticket.id
                      ? "bg-blue-500/20 border-blue-500/50"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-white">{ticket.userName}</div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        ticket.status === "open"
                          ? "bg-red-500/20 text-red-400"
                          : ticket.status === "in-progress"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {ticket.status === "open" ? "Offen" : ticket.status === "in-progress" ? "In Bearbeitung" : "Geschlossen"}
                    </span>
                  </div>
                  <div className="text-sm text-white/70 mb-2 line-clamp-2">
                    {ticket.messages[0]?.text || "Keine Nachricht"}
                  </div>
                  <div className="text-xs text-white/50">
                    {formatTimestamp(ticket.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ticket Detail */}
        <div className="rounded-[28px] surface p-6">
          {!selectedTicket ? (
            <div className="text-center py-16 text-white/60">
              Wählen Sie ein Ticket aus
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedTicket.userName}</h3>
                  <div className="text-sm text-white/60">{formatTimestamp(selectedTicket.createdAt)}</div>
                </div>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as any)}
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="open">Offen</option>
                  <option value="in-progress">In Bearbeitung</option>
                  <option value="closed">Geschlossen</option>
                </select>
              </div>

              {/* Messages */}
              <div className="border-t border-white/10 pt-4 space-y-3 max-h-[400px] overflow-y-auto">
                {selectedTicket.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl ${
                      msg.sender === "user"
                        ? "bg-blue-500/20 text-white"
                        : "bg-white/10 text-white/90"
                    }`}
                  >
                    <div className="text-xs text-white/60 mb-1">
                      {msg.sender === "user" ? selectedTicket.userName : "Assistent"}
                    </div>
                    <div className="text-sm whitespace-pre-line">{msg.text}</div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Antwort schreiben..."
                  rows={4}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Wird gesendet..." : "Antwort senden"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

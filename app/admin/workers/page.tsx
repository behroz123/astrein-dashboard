"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { useRouter } from "next/navigation";
import { usePrefs } from "../../../lib/prefs";
import { Edit2, Save, X, Shield, Users } from "lucide-react";

type Worker = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "mitarbeiter";
  createdAt?: any;
};

export default function AdminWorkersPage() {
  const router = useRouter();
  const { t } = usePrefs();
  
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("mitarbeiter");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"admin" | "mitarbeiter">("mitarbeiter");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user is admin
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

        // Only admins can access this page
        if (data.role !== "admin") {
          router.replace("/");
          return;
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        router.replace("/");
        return;
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  // Load all workers
  useEffect(() => {
    if (userRole !== "admin") return;

    const loadWorkers = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const workersList: Worker[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().email || "",
          name: doc.data().name || doc.data().displayName || doc.id,
          role: doc.data().role || "mitarbeiter",
          createdAt: doc.data().createdAt,
        }));
        setWorkers(workersList);
      } catch (err) {
        console.error("Error loading workers:", err);
        setError("Fehler beim Laden der Arbeiter");
      }
    };

    loadWorkers();
  }, [userRole]);

  const handleSaveRole = async (workerId: string, newRole: "admin" | "mitarbeiter") => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateDoc(doc(db, "users", workerId), { role: newRole });
      
      // Update local state
      setWorkers(workers.map(w => w.id === workerId ? { ...w, role: newRole } : w));
      
      setSuccess("Rolle erfolgreich aktualisiert");
      setEditingId(null);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm text-white/60">
        Lädt...
      </div>
    );
  }

  if (userRole !== "admin") {
    return (
      <div className="rounded-[28px] surface p-6 text-sm text-red-400">
        {t("employees.noPermission")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] surface p-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-white" />
          <div>
            <h1 className="text-2xl font-bold text-white">Arbeiterverwaltung</h1>
            <p className="text-sm text-white/60 mt-1">Verwalten Sie Arbeiter und deren Berechtigungen</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-[28px] surface p-4 border border-red-500/50 bg-red-500/10 flex items-center gap-3">
          <X className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-[28px] surface p-4 border border-green-500/50 bg-green-500/10 flex items-center gap-3">
          <Save className="w-5 h-5 text-green-400" />
          <span className="text-sm text-green-300">{success}</span>
        </div>
      )}

      {/* Workers Table */}
      <div className="rounded-[28px] surface overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-white">
              {workers.length} {workers.length === 1 ? "Arbeiter" : "Arbeiter"}
            </h2>
          </div>
        </div>

        {workers.length === 0 ? (
          <div className="p-6 text-center text-white/60">
            {t("admin.workers.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/70">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/70">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/70">Rolle</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/70">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id} className="border-b border-white/10 hover:bg-white/5 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{worker.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white/60">{worker.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === worker.id ? (
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as "admin" | "mitarbeiter")}
                          className="rounded-lg border border-white/10 bg-black/30 text-white text-sm px-3 py-1"
                        >
                          <option value="mitarbeiter">Mitarbeiter</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                            worker.role === "admin"
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-green-500/20 text-green-300"
                          }`}
                        >
                          {worker.role === "admin" ? "Administrator" : "Mitarbeiter"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === worker.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleSaveRole(worker.id, editingRole)
                            }
                            disabled={saving}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
                          >
                            Speichern
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                            className="px-3 py-1 rounded-lg border border-white/10 bg-black/30 hover:bg-white/5 text-white text-xs font-semibold transition"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(worker.id);
                            setEditingRole(worker.role);
                          }}
                          className="px-3 py-1 rounded-lg border border-white/10 bg-black/30 hover:bg-white/5 text-white text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Bearbeiten
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

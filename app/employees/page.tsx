"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, updateDoc, serverTimestamp, deleteDoc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";
import { Edit2, Trash2, X } from "lucide-react";

type Role = "admin" | "mitarbeiter" | "inactive";

type Employee = {
  id: string;
  name: string;
  email: string;
  role: Role;
  photo?: string;
  lastSeen?: number;
  isOnline?: boolean;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  lastSignIn?: string;
  disabled?: boolean;
};

function pickName(data: any, email?: string) {
  if (data?.name) return String(data.name);
  if (data?.displayName) return String(data.displayName);
  if (data?.firstName || data?.lastName) {
    return `${data?.firstName ?? ""} ${data?.lastName ?? ""}`.trim();
  }
  return email || "Benutzer";
}

export default function EmployeesPage() {
  const router = useRouter();
  const { t } = usePrefs();

  const [role, setRole] = useState<Role>("mitarbeiter");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", role: "mitarbeiter" as Role });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Update lastSeen timestamp for current user
  useEffect(() => {
    if (!currentUser) return;

    const updateLastSeen = async () => {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        // Silently fail
      }
    };

    // Update on initial mount
    updateLastSeen();

    // Update every 30 seconds while page is active
    const interval = setInterval(updateLastSeen, 30000);
    window.addEventListener("focus", updateLastSeen);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", updateLastSeen);
    };
  }, [currentUser]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u || null);
      if (!u) {
        router.replace("/login");
        return;
      }

      try {
        const usnap = await getDoc(doc(db, "users", u.uid));
        const r = (usnap.exists() ? (usnap.data() as any).role : "mitarbeiter") as any;
        console.log("User role:", r);
        setRole(r === "admin" ? "admin" : "mitarbeiter");
      } catch (e) {
        console.error("Error getting user role:", e);
        setRole("mitarbeiter");
      }
      setReady(true);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    if (role !== "admin") {
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Get token from current user
        const idToken = await currentUser?.getIdToken();
        if (!idToken) throw new Error("No token available");

        // Try API first
        console.log("Attempting to fetch from API...");
        const response = await fetch("/api/get-all-employees", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const list = (data.employees || []).map((emp: any) => ({
            ...emp,
            isOnline: emp.lastSeen > 0 && Date.now() - emp.lastSeen < 5 * 60 * 1000,
          }));

          console.log("Total users loaded from API:", list.length);
          if (!alive) return;
          setEmployees(list);
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (e: any) {
        if (!alive) return;
        console.error("API failed, using fallback:", e.message);
        
        // Fallback: Load from Firestore
        try {
          const { collection, getDocs } = await import("firebase/firestore");
          const snap = await getDocs(collection(db, "users"));
          const list: Employee[] = snap.docs.map((d) => {
            const data = d.data() as any;
            const lastSeenMs = data?.lastSeen?.toMillis?.() || 0;
            const now = Date.now();
            const isOnline = lastSeenMs > 0 && now - lastSeenMs < 5 * 60 * 1000;
            const empRole = (data?.role === "admin" ? "admin" : data?.role === "inactive" ? "inactive" : "mitarbeiter") as Role;

            return {
              id: d.id,
              name: pickName(data, data?.email),
              email: String(data?.email ?? ""),
              role: empRole,
              photo: data?.profileImageUrl ? String(data.profileImageUrl) : undefined,
              lastSeen: lastSeenMs,
              isOnline,
              firstName: data?.firstName || "",
              lastName: data?.lastName || "",
            };
          });
          
          console.log("Fallback: Loaded from Firestore:", list.length);
          if (!alive) return;
          setEmployees(list);
        } catch (fallbackError: any) {
          console.error("Fallback also failed:", fallbackError);
          setError(String(fallbackError?.message ?? "Fehler beim Laden"));
          setEmployees([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ready, role, currentUser]);

  const sorted = useMemo(() => {
    return [...employees].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const handleEditOpen = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      role: emp.role,
    });
  };

  const handleEditClose = () => {
    setEditingId(null);
    setEditForm({ firstName: "", lastName: "", role: "mitarbeiter" });
    setActionError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setActionError(null);
    try {
      const userRef = doc(db, "users", editingId);
      
      // First check if document exists
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        // Document doesn't exist, create it
        console.log("Creating new user document...");
        await setDoc(userRef, {
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          role: editForm.role,
          email: "", // Will be updated by user later
          createdAt: serverTimestamp(),
        }, { merge: true });
      } else {
        // Document exists, update it
        console.log("Updating existing user document...");
        await updateDoc(userRef, {
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          role: editForm.role,
        });
      }

      // Update local state
      setEmployees(
        employees.map((e) =>
          e.id === editingId
            ? {
                ...e,
                firstName: editForm.firstName.trim(),
                lastName: editForm.lastName.trim(),
                name: `${editForm.firstName.trim()} ${editForm.lastName.trim()}`.trim(),
                role: editForm.role,
              }
            : e
        )
      );
      handleEditClose();
    } catch (e: any) {
      console.error("Edit error:", e);
      setActionError(e?.message || t("employees.error") || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("employees.confirmDelete") || "Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten?")) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await deleteDoc(doc(db, "users", id));
      setEmployees(employees.filter((e) => e.id !== id));
    } catch (e: any) {
      console.error("Delete error:", e);
      alert(e?.message || t("employees.error") || "Fehler beim Löschen");
    } finally {
      setSaving(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        {t("employees.loading")}
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="rounded-[28px] surface p-6">
        <div className="text-sm text-white/90 font-semibold">{t("employees.title")}</div>
        <div className="mt-2 text-sm muted">{t("employees.noPermission")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] surface p-6">
        <div className="text-xs muted">{t("employees.subtitle")}</div>
        <div className="mt-2 text-2xl font-semibold text-white">{t("employees.title")}</div>
        <div className="mt-1 text-sm muted">{employees.length} {t("employees.count")}</div>
      </div>

      {error && (
        <div className="rounded-[28px] surface p-6 text-sm text-red-300">{error}</div>
      )}

      {sorted.length === 0 && !error ? (
        <div className="rounded-[28px] surface p-6 text-sm muted">{t("employees.empty")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((u) => {
            const initial = (u.name?.trim()?.[0] || "U").toUpperCase();
            const isInactive = u.role === "inactive";
            return (
              <div key={u.id} className={`rounded-[24px] surface p-5 transition ${isInactive ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-4">
                  {u.photo ? (
                    <img
                      src={u.photo}
                      alt={u.name}
                      className="h-14 w-14 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, rgb(var(--accent)), rgba(var(--accent), 0.6))` }}
                    >
                      {initial}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold text-white truncate">{u.name}</div>
                    <div className="text-xs muted truncate">{u.email || "-"}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <div
                          className={`h-2 w-2 rounded-full transition ${
                            isInactive ? "bg-red-400" : u.isOnline ? "bg-green-400" : "bg-white/30"
                          }`}
                        />
                        <span className="text-[11px] muted">
                          {isInactive
                            ? t("employees.inactive")
                            : u.isOnline
                            ? t("employees.online")
                            : u.lastSeen
                            ? new Date(u.lastSeen).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : t("employees.neverSeen")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                        style={{
                          background:
                            u.role === "admin"
                              ? "rgba(139, 92, 246, 0.15)"
                              : u.role === "inactive"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(34, 197, 94, 0.15)",
                          color:
                            u.role === "admin"
                              ? "rgb(139, 92, 246)"
                              : u.role === "inactive"
                              ? "rgb(239, 68, 68)"
                              : "rgb(34, 197, 94)",
                        }}
                      >
                        {u.role === "admin" ? t("role.admin") : u.role === "inactive" ? t("role.inactive") : t("role.mitarbeiter")}
                      </div>
                    </div>
                  </div>

                  {/* Edit and Delete buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditOpen(u)}
                      className="p-2 rounded-lg hover:bg-white/10 transition text-blue-400 hover:text-blue-300"
                      title={t("employees.edit")}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition text-red-400 hover:text-red-300"
                      title={t("employees.delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-[24px] surface p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-white">{t("employees.editTitle")}</div>
              <button
                onClick={handleEditClose}
                className="p-1 hover:bg-white/10 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-lg bg-red-400/10 text-red-300 text-sm border border-red-400/20">
                {actionError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm muted block mb-2">{t("employees.firstName")}</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
                  placeholder="Vorname"
                />
              </div>

              <div>
                <label className="text-sm muted block mb-2">{t("employees.lastName")}</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
                  placeholder="Nachname"
                />
              </div>

              <div>
                <label className="text-sm muted block mb-2">{t("employees.role")}</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40"
                >
                  <option value="mitarbeiter" style={{ color: "#000" }}>
                    {t("role.mitarbeiter")}
                  </option>
                  <option value="admin" style={{ color: "#000" }}>
                    {t("role.admin")}
                  </option>
                  <option value="inactive" style={{ color: "#000" }}>
                    {t("role.inactive")}
                  </option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleEditClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
                  disabled={saving}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

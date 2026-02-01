"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDoc, getDocs, doc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

type Role = "admin" | "mitarbeiter";

type Employee = {
  id: string;
  name: string;
  email: string;
  role: Role;
  photo?: string;
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      const usnap = await getDoc(doc(db, "users", u.uid));
      const r = (usnap.exists() ? (usnap.data() as any).role : "mitarbeiter") as any;
      setRole(r === "admin" ? "admin" : "mitarbeiter");
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
        const snap = await getDocs(collection(db, "users"));
        const list: Employee[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: pickName(data, data?.email),
            email: String(data?.email ?? ""),
            role: (data?.role === "admin" ? "admin" : "mitarbeiter") as Role,
            photo: data?.profileImageUrl ? String(data.profileImageUrl) : undefined,
          };
        });
        if (!alive) return;
        setEmployees(list);
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message ?? "Fehler beim Laden"));
        setEmployees([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ready, role]);

  const sorted = useMemo(() => {
    return [...employees].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

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
            return (
              <div key={u.id} className="rounded-[24px] surface p-5">
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

                  <div className="min-w-0">
                    <div className="text-base font-semibold text-white truncate">{u.name}</div>
                    <div className="text-xs muted truncate">{u.email || "-"}</div>
                    <div
                      className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                      style={{
                        background: u.role === "admin" ? "rgba(139, 92, 246, 0.15)" : "rgba(34, 197, 94, 0.15)",
                        color: u.role === "admin" ? "rgb(139, 92, 246)" : "rgb(34, 197, 94)",
                      }}
                    >
                      {u.role === "admin" ? t("role.admin") : t("role.mitarbeiter")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { usePathname, useRouter } from "next/navigation";
import { PrefsProvider, usePrefs } from "../lib/prefs";
import { ThemeProvider } from "../lib/themeContext";
import ChatAssistant from "../components/ChatAssistant";
import SessionWarning from "../components/SessionWarning";
import Footer from "../components/Footer";
import { useSessionTimeout } from "../hooks/useSessionTimeout";

function NavItem({
  href,
  active,
  wohnungenTheme,
  children,
}: {
  href: string;
  active: boolean;
  wohnungenTheme?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl px-4 py-3 text-sm transition border ${
        wohnungenTheme
          ? active
            ? "text-cyan-100 border-cyan-400/60 bg-cyan-500/15 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
            : "text-slate-200/90 hover:text-cyan-100 hover:bg-cyan-500/10 border-blue-300/20"
          : active
            ? "link-active text-white border-white/10"
            : "text-white/75 hover:text-white hover:bg-white/5 border-transparent"
      }`}
    >
      {children}
    </Link>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = usePrefs();

  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("mitarbeiter");
  const [ready, setReady] = useState(false);

  // Session Timeout Hook
  const { showWarning, timeRemaining, handleLogout, continueSession } =
    useSessionTimeout(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setReady(true);
      if (!u && pathname !== "/login") router.replace("/login");
      
      if (u) {
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
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("mitarbeiter");
        }
      }
    });
    return () => unsub();
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-white/60">Loading…</div>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen">{children}</div>;

  const navItems = [
    { href: "/", label: t("dashboard") },
    { href: "/items", label: t("items") },
    { href: "/wareneingang", label: t("wareneingang") },
    { href: "/warenausgang", label: t("warenausgang") },
    // Immobilien is now handled by ImmobilienSubmenu
    { href: "/reports", label: "Reports" },
    { href: "/fuhrpark", label: "Fuhrpark" },
    { href: "/employees", label: t("employees") },
    { href: "/exports", label: t("exports") },
    { href: "/settings", label: t("settings") },
  ];
  const mobileNavItems = [
    { href: "/", label: t("dashboard") },
    { href: "/items", label: t("items") },
    { href: "/wareneingang", label: t("wareneingang") },
    { href: "/warenausgang", label: t("warenausgang") },
    { href: "/immobilien", label: "Immobilien" },
    { href: "/reports", label: "Reports" },
    { href: "/fuhrpark", label: "Fuhrpark" },
    { href: "/settings", label: t("settings") },
  ];

  const isWohnungenTheme = pathname.startsWith("/wohnungen");

  return (
    <div className="flex min-h-screen">
      <aside className={`hidden lg:flex w-72 shrink-0 backdrop-blur-xl flex-col ${
        isWohnungenTheme
          ? "border-r border-blue-400/25 bg-gradient-to-b from-[#0a1a34] via-[#0d2242] to-[#0a1a34]"
          : "border-r border-white/10 bg-black/25"
      }`}>
        <div className={`px-4 py-6 ${isWohnungenTheme ? "border-b border-blue-400/25" : "border-b border-white/10"}`}>
          <Link href="/" className="flex justify-center">
            <div className={`rounded-2xl px-4 py-3 shadow-lg ${isWohnungenTheme ? "bg-slate-100/95 border border-cyan-300/35" : "bg-white/90"}`}>
              <img src="/logo.png" alt="AH Exzellent Immobilien GmbH" className="h-10 object-contain" />
            </div>
          </Link>
          <div className={`mt-3 text-center text-xs ${isWohnungenTheme ? "text-slate-300/80" : "text-white/55"}`}>
            AH Exzellent Immobilien GmbH
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          <NavItem href="/" active={pathname === "/"} wohnungenTheme={isWohnungenTheme}>
            {t("dashboard")}
          </NavItem>
          <NavItem href="/items" active={pathname.startsWith("/items")} wohnungenTheme={isWohnungenTheme}>
            {t("items")}
          </NavItem>
          <NavItem href="/immobilien" active={pathname.startsWith("/immobilien") || pathname.startsWith("/auszuege") || pathname.startsWith("/einzuege") || pathname.startsWith("/wohnung-checken") || pathname.startsWith("/schluesseluebergabe") || pathname.startsWith("/mietvertrag") || pathname.startsWith("/strom-vertrag") || pathname.startsWith("/wasser-vertrag") || pathname.startsWith("/untermietvertrag")} wohnungenTheme={isWohnungenTheme}>
            Immobilien
          </NavItem>
          <NavItem href="/wareneingang" active={pathname.startsWith("/wareneingang")} wohnungenTheme={isWohnungenTheme}>
            {t("wareneingang")}
          </NavItem>
          <NavItem href="/warenausgang" active={pathname.startsWith("/warenausgang")} wohnungenTheme={isWohnungenTheme}>
            {t("warenausgang")}
          </NavItem>
          <NavItem href="/reports" active={pathname.startsWith("/reports")} wohnungenTheme={isWohnungenTheme}>
            Reports
          </NavItem>
          <NavItem href="/fuhrpark" active={pathname.startsWith("/fuhrpark")} wohnungenTheme={isWohnungenTheme}>
            Fuhrpark
          </NavItem>
          <NavItem href="/employees" active={pathname.startsWith("/employees")} wohnungenTheme={isWohnungenTheme}>
            {t("employees")}
          </NavItem>
          <NavItem href="/exports" active={pathname.startsWith("/exports")} wohnungenTheme={isWohnungenTheme}>
            {t("exports")}
          </NavItem>
          <NavItem href="/settings" active={pathname.startsWith("/settings")} wohnungenTheme={isWohnungenTheme}>
            {t("settings")}
          </NavItem>

          {/* Admin Only */}
          {userRole === "admin" && (
            <>
              <div className={`my-2 border-t ${isWohnungenTheme ? "border-blue-400/25" : "border-white/10"}`} />
              <NavItem href="/admin/workers" active={pathname.startsWith("/admin/workers")} wohnungenTheme={isWohnungenTheme}>
                🛡️ Arbeiter verwalten
              </NavItem>
            </>
          )}
        </nav>

        <div className={`px-3 py-4 border-t ${isWohnungenTheme ? "border-blue-400/25" : "border-white/10"}`}>
          <button
            onClick={async () => {
              await signOut(auth);
              router.replace("/login");
            }}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold ${isWohnungenTheme ? "border border-cyan-300/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/20" : "btn-accent"}`}
          >
            {t("logout")}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-sm text-white/90 font-semibold">
              {t("appName")}
            </Link>
            <button
              onClick={async () => {
                await signOut(auth);
                router.replace("/login");
              }}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/85"
            >
              {t("logout")}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">{children}</main>

        {/* Footer */}
        <Footer />

        <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-30 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl px-2 py-2">
          <div className="grid grid-cols-6 gap-1">
            {mobileNavItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-2 py-2 text-[11px] text-center transition ${
                    active ? "bg-white/10 text-white" : "text-white/70"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <ChatAssistant />
      <SessionWarning
        show={showWarning}
        timeRemaining={timeRemaining}
        onContinue={continueSession}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="text-white">
        <PrefsProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
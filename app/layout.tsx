"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { usePathname, useRouter } from "next/navigation";
import { PrefsProvider, usePrefs } from "../lib/prefs";
import ChatAssistant from "../components/ChatAssistant";
import SessionWarning from "../components/SessionWarning";
import { useSessionTimeout } from "../hooks/useSessionTimeout";

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl px-4 py-3 text-sm transition border ${
        active
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
  const [ready, setReady] = useState(false);

  // Session Timeout Hook
  const { showWarning, timeRemaining, handleLogout, continueSession } =
    useSessionTimeout(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
      if (!u && pathname !== "/login") router.replace("/login");
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
    { href: "/auszuege", label: t("moveouts") },
    { href: "/employees", label: t("employees") },
    { href: "/exports", label: t("exports") },
    { href: "/settings", label: t("settings") },
  ];
  const mobileNavItems = [
    { href: "/", label: t("dashboard") },
    { href: "/items", label: t("items") },
    { href: "/wareneingang", label: t("wareneingang") },
    { href: "/warenausgang", label: t("warenausgang") },
    { href: "/auszuege", label: t("moveouts") },
    { href: "/settings", label: t("settings") },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-72 shrink-0 border-r border-white/10 bg-black/25 backdrop-blur-xl flex-col">
        <div className="px-4 py-6 border-b border-white/10">
          <Link href="/" className="flex justify-center">
            <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-lg">
              <img src="/logo.png" alt="Astrein Exzellent" className="h-10 object-contain" />
            </div>
          </Link>
          <div className="mt-3 text-center text-xs text-white/55">
            Astrein Exzellent Gebäudemanagement
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
            >
              {item.label}
            </NavItem>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={async () => {
              await signOut(auth);
              router.replace("/login");
            }}
            className="w-full rounded-2xl btn-accent px-4 py-3 text-sm font-semibold"
          >
            {t("logout")}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
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

        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">{children}</main>

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
          <AppShell>{children}</AppShell>
        </PrefsProvider>
      </body>
    </html>
  );
}
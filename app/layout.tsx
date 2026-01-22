"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { usePathname, useRouter } from "next/navigation";
import { PrefsProvider, usePrefs } from "../lib/prefs";

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

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 shrink-0 border-r border-white/10 bg-black/25 backdrop-blur-xl flex flex-col">
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
          <NavItem href="/" active={pathname === "/"}>{t("dashboard")}</NavItem>
          <NavItem href="/items" active={pathname.startsWith("/items")}>{t("items")}</NavItem>
          <NavItem href="/settings" active={pathname === "/settings"}>{t("settings")}</NavItem>
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

      <main className="flex-1 p-6 lg:p-8">{children}</main>
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
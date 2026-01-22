"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";

export default function LoginPage() {
  const router = useRouter();
  const { lang, t } = usePrefs();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const welcome = useMemo(() => {
    const map: Record<string, string> = {
      de: "Willkommen bei Astrein Exzellent",
      en: "Welcome to Astrein Exzellent",
      tr: "Astrein Exzellent’e Hoş Geldiniz",
      ro: "Bine ai venit la Astrein Exzellent",
      ru: "Добро пожаловать в Astrein Exzellent",
    };
    return map[lang] ?? map.de;
  }, [lang]);

  async function onLogin() {
    setErr(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      router.replace("/");
    } catch {
      setErr(t("loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100svh] relative flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-indigo-950 to-black" />
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-500/30 blur-[140px] animate-pulse" />
      <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/20 blur-[160px] animate-pulse" />

      {/* Center card */}
      <div className="w-full max-w-md rounded-[36px] border border-white/10 bg-black/40 backdrop-blur-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-lg">
            <Image src="/logo.png" alt="Astrein Exzellent" width={220} height={220} priority />
          </div>

          <h1 className="mt-6 text-3xl font-semibold text-white">{welcome}</h1>
          <p className="mt-2 text-sm text-white/65">{t("loginSubtitle")}</p>
        </div>

        <div className="mt-8 space-y-4">
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
            placeholder="name@firma.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
            placeholder="••••••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />

          {err && <div className="text-xs text-red-300">{err}</div>}

          <button
            onClick={onLogin}
            disabled={busy}
            className="w-full rounded-2xl py-3 font-semibold transition"
            style={{ background: "rgb(var(--accent))", color: "white" }}
          >
            {busy ? t("loading") : t("login")}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-white/50">Astrein Exzellent Gebäudemanagment International GmbH</div>
      </div>
    </div>
  );
}
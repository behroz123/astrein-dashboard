"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { usePrefs } from "../../lib/prefs";
import SiteClock from "../../lib/SiteClock";

export default function LoginPage() {
  const router = useRouter();
  const { lang, t } = usePrefs();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bgIndex, setBgIndex] = useState(0);
  const [now, setNow] = useState(new Date());

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

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const id = setInterval(() => setBgIndex((s) => (s + 1) % 4), 6000);
    const el = document.getElementById('astrein-login-bg');
    if (el) el.className = `login-bg absolute inset-0 -z-10 bg-${bgIndex}`;
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = document.getElementById('astrein-login-bg');
    if (el) {
      el.className = `login-bg absolute inset-0 -z-10 bg-${bgIndex}`;
    }
  }, [bgIndex]);

  const dateStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang || undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now);
    } catch {
      return now.toDateString();
    }
  }, [now, lang]);

  const timeStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang || undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
    } catch {
      return now.toTimeString().slice(0,8);
    }
  }, [now, lang]);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-[100svh] relative flex items-center justify-center overflow-hidden login-neo">
        {/* Animated background (slideshow) */}
        <div className={`login-bg absolute inset-0 -z-10 bg-${0}`} id="astrein-login-bg">
          <div className="layer layer-0" />
          <div className="layer layer-1" />
          <div className="layer layer-2" />
          <div className="layer layer-3" />
        </div>
      <div className="login-orbs absolute inset-0 -z-10 pointer-events-none">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>
      {/* Multilingual animated welcome words—left and right side stacks (not Persian) */}
      <div className="login-multilang left absolute -z-5 pointer-events-none" aria-hidden>
        <div className="multilang-wrap vertical left">
          <span className="multi">Willkommen</span>
          <span className="multi">Welcome</span>
          <span className="multi">Astrein Exzellent’e Hoş Geldiniz</span>
          <span className="multi">Bine ai venit</span>
          <span className="multi">Добро пожаловать</span>
        </div>
      </div>

      <div className="login-multilang right absolute -z-5 pointer-events-none" aria-hidden>
        <div className="multilang-wrap vertical right">
          <span className="multi">Willkommen</span>
          <span className="multi">Welcome</span>
          <span className="multi">Astrein Exzellent’e Hoş Geldiniz</span>
          <span className="multi">Bine ai venit</span>
          <span className="multi">Добро пожаловать</span>
        </div>
      </div>
      <div className="login-streaks absolute inset-0 -z-10 pointer-events-none">
        <svg className="streaks" viewBox="0 0 800 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="s1" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <g stroke="url(#s1)" strokeWidth="1.8" strokeLinecap="round">
            <path className="streak" d="M-100 80 L900 20" fill="none" />
            <path className="streak" d="M-120 220 L920 160" fill="none" />
            <path className="streak" d="M-80 360 L880 300" fill="none" />
          </g>
        </svg>
      </div>
      <div className="login-particles absolute inset-0 -z-10 pointer-events-none" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} className={`particle p-${i % 6}`} />
        ))}
      </div>

      {/* Center card */}
      <div className="w-full max-w-md rounded-[36px] border border-white/10 bg-black/40 backdrop-blur-2xl p-8 shadow-2xl login-card-pop relative">
        {/* Only one clock, elegantly placed below the logo */}
        <div className="flex justify-center mt-2 mb-2">
          <SiteClock showDate className="card-clock" />
        </div>
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
            className="w-full rounded-2xl py-3 font-semibold transition login-action"
            style={{ background: "rgb(var(--accent))", color: "white" }}
          >
            {busy ? t("loading") : t("login")}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-white/50">Astrein Exzellent Gebäudemanagment International GmbH</div>
      </div>
      {/* Removed the duplicated bottom clock to avoid multiple clocks on login */}
    </div>
  );
}
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Lang = "de" | "en" | "tr" | "ro" | "ru";
type Theme = "glass" | "midnight" | "graphite" | "aurora" | "neon";

type Prefs = {
  lang: Lang;
  theme: Theme;
  accent: string; // "R G B" e.g. "99 102 241"
  setLang: (v: Lang) => void;
  setTheme: (v: Theme) => void;
  setAccent: (v: string) => void;

  // compatibility (older code)
  design: Theme;
  setDesign: (v: Theme) => void;

  t: (key: string) => string;
};

const PrefsCtx = createContext<Prefs | null>(null);

const DICT: Record<Lang, Record<string, string>> = {
  de: {
    appName: "Astrein Exzellent",
    companyLine: "Gebäudemanagement International GmbH",

    loginTitle: "Anmelden",
    email: "E-Mail",
    password: "Passwort",
    signIn: "Anmelden",
    signOut: "Abmelden",

    dashboard: "Dashboard",
    items: "Geräte & Material",
    addItem: "Neues Item",
    settings: "Einstellungen",

    topLager: "Top Lager",
whereMost: "Wo liegt am meisten?",
recentBookings: "Letzte Buchungen",
noBookingsYet: "Noch keine Buchungen.",
noBookingsHint: "Wenn die Collection „buchungen“ noch nicht existiert, bleibt dieser Bereich leer.",
available: "Verfügbar",
needsRepair: "Reparatur",
missing: "Fehlt",
inUse: "In Benutzung",
status: "Status",
count: "Anzahl",

    language: "Sprache",
    theme: "Design",
    color: "Farbe",
    preview: "Vorschau",

    filters: "Filter",
    search: "Suche",
    category: "Kategorie",
    lager: "Lager",
    condition: "Zustand",
    all: "Alle",

    delete: "Löschen",
    cancel: "Abbrechen",
    confirmDeleteTitle: "Wirklich löschen?",
    confirmDeleteBody: "Dieses Item wird dauerhaft gelöscht.",
    confirm: "Bestätigen",

    saved: "Gespeichert",
  },

  en: {
    appName: "Astrein Exzellent",
    companyLine: "Facility Management International GmbH",

    loginTitle: "Sign in",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signOut: "Sign out",
    topLager: "Top Warehouse",

whereMost: "Where is the most?",
recentBookings: "Recent bookings",
noBookingsYet: "No bookings yet.",
noBookingsHint: "If the “buchungen” collection does not exist yet, this section will be empty.",
available: "Available",
needsRepair: "Needs repair",
missing: "Missing",
inUse: "In use",
status: "Status",
count: "Count",

    dashboard: "Dashboard",
    items: "Items",
    addItem: "New item",
    settings: "Settings",

    language: "Language",
    theme: "Design",
    color: "Color",
    preview: "Preview",

    filters: "Filters",
    search: "Search",
    category: "Category",
    lager: "Warehouse",
    condition: "Condition",
    all: "All",

    delete: "Delete",
    cancel: "Cancel",
    confirmDeleteTitle: "Delete this item?",
    confirmDeleteBody: "This item will be permanently deleted.",
    confirm: "Confirm",

    saved: "Saved",
  },

  tr: {
    appName: "Astrein Exzellent",
    companyLine: "Tesis Yönetimi International GmbH",

    topLager: "En Çok Depo",
whereMost: "En çok nerede?",
recentBookings: "Son hareketler",
noBookingsYet: "Henüz kayıt yok.",
noBookingsHint: "“buchungen” koleksiyonu yoksa bu bölüm boş kalır.",
available: "Mevcut",
needsRepair: "Tamir gerekli",
missing: "Kayıp",
inUse: "Kullanımda",
status: "Durum",
count: "Sayı",

    loginTitle: "Giriş",
    email: "E-posta",
    password: "Şifre",
    signIn: "Giriş yap",
    signOut: "Çıkış",

    dashboard: "Gösterge Paneli",
    items: "Cihazlar & Malzeme",
    addItem: "Yeni öğe",
    settings: "Ayarlar",

    language: "Dil",
    theme: "Tasarım",
    color: "Renk",
    preview: "Önizleme",

    filters: "Filtreler",
    search: "Arama",
    category: "Kategori",
    lager: "Depo",
    condition: "Durum",
    all: "Tümü",

    delete: "Sil",
    cancel: "İptal",
    confirmDeleteTitle: "Silinsin mi?",
    confirmDeleteBody: "Bu öğe kalıcı olarak silinecek.",
    confirm: "Onayla",

    saved: "Kaydedildi",
  },

  ro: {
    appName: "Astrein Exzellent",
    companyLine: "Facility Management International GmbH",

    loginTitle: "Autentificare",
    email: "E-mail",
    password: "Parolă",
    signIn: "Intră",
    signOut: "Deconectare",

    topLager: "Depozit de top",
whereMost: "Unde este cel mai mult?",
recentBookings: "Mișcări recente",
noBookingsYet: "Nu există înregistrări încă.",
noBookingsHint: "Dacă colecția “buchungen” nu există încă, această secțiune va fi goală.",
available: "Disponibil",
needsRepair: "Necesită reparație",
missing: "Lipsă",
inUse: "În utilizare",
status: "Stare",
count: "Număr",

    dashboard: "Panou",
    items: "Echipamente & Materiale",
    addItem: "Item nou",
    settings: "Setări",

    language: "Limbă",
    theme: "Design",
    color: "Culoare",
    preview: "Previzualizare",

    filters: "Filtre",
    search: "Căutare",
    category: "Categorie",
    lager: "Depozit",
    condition: "Stare",
    all: "Toate",

    delete: "Șterge",
    cancel: "Anulează",
    confirmDeleteTitle: "Ștergi acest item?",
    confirmDeleteBody: "Acest item va fi șters definitiv.",
    confirm: "Confirmă",

    saved: "Salvat",
  },

  ru: {
    appName: "Astrein Exzellent",
    companyLine: "Facility Management International GmbH",

    loginTitle: "Вход",
    email: "Почта",
    password: "Пароль",
    signIn: "Войти",
    signOut: "Выйти",

    topLager: "Топ склад",
whereMost: "Где больше всего?",
recentBookings: "Последние операции",
noBookingsYet: "Пока нет записей.",
noBookingsHint: "Если коллекции “buchungen” ещё нет, этот блок будет пустым.",
available: "Доступно",
needsRepair: "Нужен ремонт",
missing: "Отсутствует",
inUse: "В использовании",
status: "Статус",
count: "Количество",

    dashboard: "Панель",
    items: "Оборудование и материалы",
    addItem: "Новый элемент",
    settings: "Настройки",

    language: "Язык",
    theme: "Дизайн",
    color: "Цвет",
    preview: "Предпросмотр",

    filters: "Фильтры",
    search: "Поиск",
    category: "Категория",
    lager: "Склад",
    condition: "Состояние",
    all: "Все",

    delete: "Удалить",
    cancel: "Отмена",
    confirmDeleteTitle: "Удалить элемент?",
    confirmDeleteBody: "Элемент будет удалён навсегда.",
    confirm: "Подтвердить",

    saved: "Сохранено",
  },
};

function normalizeAccent(v: string | undefined) {
  const s = String(v ?? "").trim();
  const parts = s.split(/\s+/).filter(Boolean).map((x) => Number(x));
  const r = Number.isFinite(parts[0]) ? Math.max(0, Math.min(255, parts[0])) : 99;
  const g = Number.isFinite(parts[1]) ? Math.max(0, Math.min(255, parts[1])) : 102;
  const b = Number.isFinite(parts[2]) ? Math.max(0, Math.min(255, parts[2])) : 241;
  return `${r} ${g} ${b}`;
}

// ✅ Important: apply background directly on body (always works)
function applyThemeToBody(theme: Theme, accentTriplet: string) {
  const accent = normalizeAccent(accentTriplet);

  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.setAttribute("data-theme", theme);

  const body = document.body;
  if (!body) return;

  body.style.color = "rgba(255,255,255,0.92)";
  body.style.minHeight = "100vh";
  body.style.backgroundRepeat = "no-repeat";
  body.style.backgroundAttachment = "fixed";
  body.style.backgroundColor = "#020617";

  const A = accent; // "R G B"

  if (theme === "glass") {
    body.style.backgroundImage = `
      radial-gradient(1200px 700px at 15% 10%, rgba(${A},0.18), transparent 60%),
      radial-gradient(900px 600px at 85% 20%, rgba(255,255,255,0.05), transparent 62%),
      linear-gradient(180deg, #030712, #020617)
    `;
    return;
  }

  if (theme === "midnight") {
    body.style.backgroundImage = `
      radial-gradient(900px 650px at 70% 10%, rgba(${A},0.26), transparent 58%),
      radial-gradient(900px 700px at 10% 90%, rgba(0,0,0,0.60), transparent 60%),
      linear-gradient(180deg, #020617, #00030a)
    `;
    return;
  }

  if (theme === "graphite") {
    body.style.backgroundImage = `
      repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 14px),
      radial-gradient(1000px 650px at 80% 70%, rgba(${A},0.14), transparent 60%),
      linear-gradient(180deg, #0b1020, #050814)
    `;
    return;
  }

  if (theme === "aurora") {
    body.style.backgroundImage = `
      radial-gradient(900px 600px at 20% 20%, rgba(${A},0.22), transparent 60%),
      radial-gradient(900px 700px at 80% 30%, rgba(45,212,191,0.16), transparent 62%),
      radial-gradient(900px 700px at 50% 90%, rgba(59,130,246,0.12), transparent 62%),
      linear-gradient(180deg, #020617, #02040f)
    `;
    return;
  }

  // neon
  body.style.backgroundImage = `
    radial-gradient(850px 520px at 20% 15%, rgba(${A},0.26), transparent 58%),
    radial-gradient(900px 640px at 85% 25%, rgba(236,72,153,0.14), transparent 62%),
    radial-gradient(900px 700px at 55% 95%, rgba(34,197,94,0.10), transparent 62%),
    linear-gradient(180deg, #030712, #00030a)
  `;
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("de");
  const [theme, setTheme] = useState<Theme>("graphite");
  const [accent, setAccent] = useState<string>("99 102 241");

  // load once
  useEffect(() => {
    const raw = localStorage.getItem("astrein:prefs");
    if (raw) {
      try {
        const p = JSON.parse(raw);
        const nextLang: Lang = p.lang || "de";
        const nextTheme: Theme = p.theme || p.design || "graphite";
        const nextAccent = normalizeAccent(p.accent || "99 102 241");
        setLang(nextLang);
        setTheme(nextTheme);
        setAccent(nextAccent);
        applyThemeToBody(nextTheme, nextAccent);
        return;
      } catch {}
    }
    applyThemeToBody(theme, accent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // apply & save
  useEffect(() => {
    const a = normalizeAccent(accent);
    applyThemeToBody(theme, a);
    localStorage.setItem("astrein:prefs", JSON.stringify({ lang, theme, accent: a, design: theme }));
  }, [lang, theme, accent]);

  const t = useMemo(() => (key: string) => DICT[lang]?.[key] ?? DICT.de[key] ?? key, [lang]);

  const value: Prefs = {
    lang,
    theme,
    accent: normalizeAccent(accent),
    setLang,
    setTheme,
    setAccent,
    design: theme,
    setDesign: setTheme,
    t,
  };

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePrefs() {
  const v = useContext(PrefsCtx);
  if (!v) throw new Error("usePrefs must be used inside PrefsProvider");
  return v;
}
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Lang = "de" | "en" | "tr" | "ro" | "ru";
type Theme = "glass" | "midnight" | "graphite" | "aurora" | "neon" | "light";

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

 t: (key: string, vars?: Record<string, string | number>) => string;
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
    // language labels
    "lang.de": "Deutsch",
    "lang.en": "English",
    "lang.tr": "Türkçe",
    "lang.ro": "Română",
    "lang.ru": "Русский",

    // theme names/descriptions
    "theme.glass.title": "Glas",
    "theme.glass.desc": "Transparentes Glas-Design",
    "theme.midnight.title": "Mitternacht",
    "theme.midnight.desc": "Tiefe, dunkle Farben",
    "theme.graphite.title": "Graphit",
    "theme.graphite.desc": "Neutraler Graphit-Look",
    "theme.aurora.title": "Aurora",
    "theme.aurora.desc": "Farbige Aurora-Akzente",
    "theme.neon.title": "Neon",
    "theme.neon.desc": "Kräftige Neonfarben",
    "theme.light.title": "Hell",
    "theme.light.desc": "Helles, kontrastreiches Design",

    active: "Aktiv",

    // accent preset names
    "accentPreset.indigo": "Indigo",
    "accentPreset.cyan": "Cyan",
    "accentPreset.emerald": "Smaragd",
    "accentPreset.orange": "Orange",
    "accentPreset.pink": "Pink",
    "accentPreset.violet": "Violett",

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
    // common.* aliases used across app
    "common.loading": "Lädt...",
    "common.refresh": "Aktualisieren",
    "common.edit": "Bearbeiten",
    "common.close": "Schließen",
    "common.pleaseWait": "Bitte warten...",
    "common.delete": "Löschen",

    // nav / role / items
    "role": "Rolle",
    "nav.dashboard": "Dashboard",
    "nav.reservations": "Reservierungen",

    "items.title": "Geräte & Material",
    "items.new": "Neues Gerät / Material",
    "items.searchPlaceholder": "Suche nach ID, Name...",
    "items.allWarehouses": "Alle Lager",
    "items.allCategories": "Alle Kategorien",
    "items.count": "{n} Einträge",
    "items.noMatches": "Keine Treffer",
    "items.col.id": "ID",
    "items.col.name": "Name",
    "items.col.type": "Typ",
    "items.col.category": "Kategorie",
    "items.col.warehouse": "Lager",
    "items.col.condition": "Zustand",
    "items.col.status": "Status",
    "items.col.actions": "Aktionen",
    "items.col.stock": "Bestand",

    // item form / edit / new
    "items.newSubtitle": "Gerät oder Material hinzufügen",
    "items.edit": "Item bearbeiten",
    "items.editSubtitle": "Gerät oder Material bearbeiten",

    "form.id": "ID",
    "form.name": "Name",
    "form.placeholder.name": "Waschmaschine / Staubsauger …",
    "form.type": "Typ",
    "type.device": "Gerät",
    "type.material": "Material",
    "item.device": "Gerät",
    "item.material": "Material",
    "form.category": "Kategorie",
    "form.noCategoryFound": "Keine Kategorie gefunden",
    "form.newCategory": "+ Neue Kategorie…",
    "form.newCategoryPlaceholder": "Neue Kategorie eingeben…",
    "form.warehouse": "Lager",
    "form.state": "Zustand",
    "form.condition": "Zustand",
    "state.new": "neu",
    "state.ok": "ok",
    "state.needsRepair": "reparatur nötig",
    "state.defect": "defekt",
    "state.disposed": "ausgesondert",
    "state.other": "Andere…",
    "form.statePlaceholder": "Zustand eingeben…",
    "form.status": "Status",
    "status.available": "verfügbar",
    "status.unavailable": "nicht verfügbar",
    "status.locked": "gesperrt",
    "form.stockTotal": "Bestand (Gesamt)",

    "action.save": "Speichern",
    "action.saving": "Bitte warten…",
    "action.cancel": "Abbrechen",
    "common.back": "Zurück",

    "role.admin": "Admin",
    "role.mitarbeiter": "Mitarbeiter",

    // reserve
    "reserve.errorPickDate": "Bitte Datum wählen.",
    "reserve.errorNotEnough": "Nicht genug verfügbar.",
    "reserve.errorGeneric": "Reservierung fehlgeschlagen.",
    "reserve.button": "Reservieren",
    "reserve.title": "Reservieren",
    "reserve.forDate": "Für Datum",
    "reserve.quantity": "Anzahl",
    "reserve.forWhomOptional": "Für wen (optional)",
    "reserve.forWhomPlaceholder": "Name oder Abteilung",
    "reserve.confirm": "Reservieren",

    // decrement
    "decrement.errorBelowReserved": "Weniger als reserviert ist nicht erlaubt.",
    "decrement.errorGeneric": "Aktualisierung fehlgeschlagen.",
    "decrement.title": "Bestand reduzieren",
    "decrement.currentStock": "Aktueller Bestand",
    "decrement.howMany": "Wie viele",
    "decrement.confirm": "Reduzieren",
    "decrement.hint": "Hinweis zur Bestandsänderung",
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
    // language labels
    "lang.de": "Deutsch",
    "lang.en": "English",
    "lang.tr": "Türkçe",
    "lang.ro": "Română",
    "lang.ru": "Русский",

    // theme names/descriptions
    "theme.glass.title": "Glass",
    "theme.glass.desc": "Transparent glass-like design",
    "theme.midnight.title": "Midnight",
    "theme.midnight.desc": "Deep dark tones",
    "theme.graphite.title": "Graphite",
    "theme.graphite.desc": "Neutral graphite look",
    "theme.aurora.title": "Aurora",
    "theme.aurora.desc": "Colorful aurora accents",
    "theme.neon.title": "Neon",
    "theme.neon.desc": "Vibrant neon palette",
    "theme.light.title": "Light",
    "theme.light.desc": "Bright, high-contrast light theme",

    active: "Active",

    // accent preset names
    "accentPreset.indigo": "Indigo",
    "accentPreset.cyan": "Cyan",
    "accentPreset.emerald": "Emerald",
    "accentPreset.orange": "Orange",
    "accentPreset.pink": "Pink",
    "accentPreset.violet": "Violet",

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
    // common.* aliases used across app
    "common.loading": "Loading...",
    "common.refresh": "Refresh",
    "common.edit": "Edit",
    "common.close": "Close",
    "common.pleaseWait": "Please wait...",
    "common.delete": "Delete",

    // nav / role / items
    "role": "Role",
    "nav.dashboard": "Dashboard",
    "nav.reservations": "Reservations",

    "items.title": "Items & Materials",
    "items.new": "New item",
    "items.searchPlaceholder": "Search by ID, name...",
    "items.allWarehouses": "All warehouses",
    "items.allCategories": "All categories",
    "items.count": "{n} items",
    "items.noMatches": "No matches",
    "items.col.id": "ID",
    "items.col.name": "Name",
    "items.col.type": "Type",
    "items.col.category": "Category",
    "items.col.warehouse": "Warehouse",
    "items.col.condition": "Condition",
    "items.col.status": "Status",
    "items.col.actions": "Actions",
    "items.col.stock": "Stock",

    // item form / edit / new
    "items.newSubtitle": "Add a device or material",
    "items.edit": "Edit item",
    "items.editSubtitle": "Edit device or material",

    "form.id": "ID",
    "form.name": "Name",
    "form.placeholder.name": "Washing machine / vacuum …",
    "form.type": "Type",
    "type.device": "Device",
    "type.material": "Material",
    "item.device": "Device",
    "item.material": "Material",
    "form.category": "Category",
    "form.noCategoryFound": "No category found",
    "form.newCategory": "+ New category…",
    "form.newCategoryPlaceholder": "Enter new category…",
    "form.warehouse": "Warehouse",
    "form.state": "Condition",
    "form.condition": "Condition",
    "state.new": "new",
    "state.ok": "ok",
    "state.needsRepair": "needs repair",
    "state.defect": "defect",
    "state.disposed": "disposed",
    "state.other": "Other…",
    "form.statePlaceholder": "Enter condition…",
    "form.status": "Status",
    "status.available": "available",
    "status.unavailable": "unavailable",
    "status.locked": "locked",
    "form.stockTotal": "Stock (total)",

    "action.save": "Save",
    "action.saving": "Please wait…",
    "action.cancel": "Cancel",
    "common.back": "Back",

    "role.admin": "Admin",
    "role.mitarbeiter": "Employee",

    // reserve
    "reserve.errorPickDate": "Please pick a date.",
    "reserve.errorNotEnough": "Not enough available.",
    "reserve.errorGeneric": "Reservation failed.",
    "reserve.button": "Reserve",
    "reserve.title": "Reserve",
    "reserve.forDate": "For date",
    "reserve.quantity": "Quantity",
    "reserve.forWhomOptional": "For whom (optional)",
    "reserve.forWhomPlaceholder": "Name or department",
    "reserve.confirm": "Confirm reservation",

    // decrement
    "decrement.errorBelowReserved": "Cannot go below reserved quantity.",
    "decrement.errorGeneric": "Update failed.",
    "decrement.title": "Decrease stock",
    "decrement.currentStock": "Current stock",
    "decrement.howMany": "How many",
    "decrement.confirm": "Decrease",
    "decrement.hint": "Note about changing stock",
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
    // language labels
    "lang.de": "Deutsch",
    "lang.en": "English",
    "lang.tr": "Türkçe",
    "lang.ro": "Română",
    "lang.ru": "Русский",

    // theme names/descriptions
    "theme.glass.title": "Cam",
    "theme.glass.desc": "Şeffaf cam benzeri tasarım",
    "theme.midnight.title": "Gece",
    "theme.midnight.desc": "Derin, koyu tonlar",
    "theme.graphite.title": "Grafit",
    "theme.graphite.desc": "Nötr grafit görünümü",
    "theme.aurora.title": "Aurora",
    "theme.aurora.desc": "Renkli aurora vurguları",
    "theme.neon.title": "Neon",
    "theme.neon.desc": "Canlı neon paleti",
    "theme.light.title": "Açık",
    "theme.light.desc": "Açık, yüksek kontrastlı tema",

    active: "Aktif",

    // accent preset names
    "accentPreset.indigo": "Çivit",
    "accentPreset.cyan": "Camgöbeği",
    "accentPreset.emerald": "Zümrüt",
    "accentPreset.orange": "Turuncu",
    "accentPreset.pink": "Pembe",
    "accentPreset.violet": "Menekşe",

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
    // common.* aliases used across app
    "common.loading": "Yükleniyor...",
    "common.refresh": "Yenile",
    "common.edit": "Düzenle",
    "common.close": "Kapat",
    "common.pleaseWait": "Lütfen bekleyin...",
    "common.delete": "Sil",

    // nav / role / items
    "role": "Rol",
    "nav.dashboard": "Gösterge Paneli",
    "nav.reservations": "Rezervasyonlar",

    "items.title": "Cihazlar & Malzeme",
    "items.new": "Yeni öğe",
    "items.searchPlaceholder": "ID, ad ile ara...",
    "items.allWarehouses": "Tüm depolar",
    "items.allCategories": "Tüm kategoriler",
    "items.count": "{n} öğe",
    "items.noMatches": "Eşleşme yok",
    "items.col.id": "ID",
    "items.col.name": "Ad",
    "items.col.type": "Tür",
    "items.col.category": "Kategori",
    "items.col.warehouse": "Depo",
    "items.col.condition": "Durum",
    "items.col.status": "Durum",
    "items.col.actions": "İşlemler",
    "items.col.stock": "Stok",

    // item form / edit / new
    "items.newSubtitle": "Cihaz veya malzeme ekle",
    "items.edit": "Öğeyi düzenle",
    "items.editSubtitle": "Cihaz veya malzemeyi düzenle",

    "form.id": "ID",
    "form.name": "İsim",
    "form.placeholder.name": "Çamaşır makinesi / elektrik süpürgesi …",
    "form.type": "Tür",
    "type.device": "Cihaz",
    "type.material": "Malzeme",
    "item.device": "Cihaz",
    "item.material": "Malzeme",
    "form.category": "Kategori",
    "form.noCategoryFound": "Kategori bulunamadı",
    "form.newCategory": "+ Yeni kategori…",
    "form.newCategoryPlaceholder": "Yeni kategori girin…",
    "form.warehouse": "Depo",
    "form.state": "Durum",
    "form.condition": "Durum",
    "state.new": "yeni",
    "state.ok": "ok",
    "state.needsRepair": "onarım gerekli",
    "state.defect": "arıza",
    "state.disposed": "ayrıldı",
    "state.other": "Diğer…",
    "form.statePlaceholder": "Durum girin…",
    "form.status": "Durum",
    "status.available": "mevcut",
    "status.unavailable": "mevcut değil",
    "status.locked": "kilitli",
    "form.stockTotal": "Stok (toplam)",

    "action.save": "Kaydet",
    "action.saving": "Lütfen bekleyin…",
    "action.cancel": "İptal",
    "common.back": "Geri",

    "role.admin": "Admin",
    "role.mitarbeiter": "Çalışan",

    // reserve
    "reserve.errorPickDate": "Lütfen tarih seçin.",
    "reserve.errorNotEnough": "Yeterli yok.",
    "reserve.errorGeneric": "Rezervasyon başarısız.",
    "reserve.button": "Rezerve",
    "reserve.title": "Rezerve et",
    "reserve.forDate": "Tarih için",
    "reserve.quantity": "Adet",
    "reserve.forWhomOptional": "Kimin için (opsiyonel)",
    "reserve.forWhomPlaceholder": "İsim veya birim",
    "reserve.confirm": "Onayla",

    // decrement
    "decrement.errorBelowReserved": "Rezerve edilenden az olamaz.",
    "decrement.errorGeneric": "Güncelleme başarısız.",
    "decrement.title": "Stok azalt",
    "decrement.currentStock": "Mevcut stok",
    "decrement.howMany": "Kaç tane",
    "decrement.confirm": "Azalt",
    "decrement.hint": "Stok değişikliği notu",
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
    // language labels
    "lang.de": "Deutsch",
    "lang.en": "English",
    "lang.tr": "Türkçe",
    "lang.ro": "Română",
    "lang.ru": "Русский",

    // theme names/descriptions
    "theme.glass.title": "Sticlă",
    "theme.glass.desc": "Design tip sticlă transparentă",
    "theme.midnight.title": "Miezul nopții",
    "theme.midnight.desc": "Tonuri adânci și întunecate",
    "theme.graphite.title": "Grafit",
    "theme.graphite.desc": "Aspect grafit neutru",
    "theme.aurora.title": "Aurora",
    "theme.aurora.desc": "Accente aurora colorate",
    "theme.neon.title": "Neon",
    "theme.neon.desc": "Paletă neon vibrantă",
    "theme.light.title": "Deschis",
    "theme.light.desc": "Temă deschisă, cu contrast ridicat",

    active: "Activ",

    // accent preset names
    "accentPreset.indigo": "Indigo",
    "accentPreset.cyan": "Cian",
    "accentPreset.emerald": "Smarald",
    "accentPreset.orange": "Portocaliu",
    "accentPreset.pink": "Roz",
    "accentPreset.violet": "Violet",

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
    // common.* aliases used across app
    "common.loading": "Se încarcă...",
    "common.refresh": "Reîmprospătează",
    "common.edit": "Editează",
    "common.close": "Închide",
    "common.pleaseWait": "Vă rugăm așteptați...",
    "common.delete": "Șterge",

    // nav / role / items
    "role": "Rol",
    "nav.dashboard": "Panou",
    "nav.reservations": "Rezervări",

    "items.title": "Echipamente & Materiale",
    "items.new": "Item nou",
    "items.searchPlaceholder": "Caută după ID, nume...",
    "items.allWarehouses": "Toate depozitele",
    "items.allCategories": "Toate categoriile",
    "items.count": "{n} elemente",
    "items.noMatches": "Niciun rezultat",
    "items.col.id": "ID",
    "items.col.name": "Nume",
    "items.col.type": "Tip",
    "items.col.category": "Categorie",
    "items.col.warehouse": "Depozit",
    "items.col.condition": "Stare",
    "items.col.status": "Status",
    "items.col.actions": "Acțiuni",
    "items.col.stock": "Stoc",

    // item form / edit / new
    "items.newSubtitle": "Adaugă un dispozitiv sau material",
    "items.edit": "Editează elementul",
    "items.editSubtitle": "Editează dispozitivul sau materialul",

    "form.id": "ID",
    "form.name": "Nume",
    "form.placeholder.name": "Mașină de spălat / aspirator …",
    "form.type": "Tip",
    "type.device": "Dispozitiv",
    "type.material": "Material",
    "item.device": "Dispozitiv",
    "item.material": "Material",
    "form.category": "Categorie",
    "form.noCategoryFound": "Nici o categorie găsită",
    "form.newCategory": "+ Categorie nouă…",
    "form.newCategoryPlaceholder": "Introduceți categoria nouă…",
    "form.warehouse": "Depozit",
    "form.state": "Stare",
    "form.condition": "Stare",
    "state.new": "nou",
    "state.ok": "ok",
    "state.needsRepair": "necesită reparație",
    "state.defect": "defect",
    "state.disposed": "retrospectat",
    "state.other": "Altele…",
    "form.statePlaceholder": "Introduceți starea…",
    "form.status": "Status",
    "status.available": "disponibil",
    "status.unavailable": "indisponibil",
    "status.locked": "blocat",
    "form.stockTotal": "Stoc (total)",

    "action.save": "Salvează",
    "action.saving": "Vă rugăm așteptați…",
    "action.cancel": "Anulează",
    "common.back": "Înapoi",

    "role.admin": "Admin",
    "role.mitarbeiter": "Angajat",

    // reserve
    "reserve.errorPickDate": "Vă rugăm selectați o dată.",
    "reserve.errorNotEnough": "Nu este suficient disponibil.",
    "reserve.errorGeneric": "Rezervare eșuată.",
    "reserve.button": "Rezervă",
    "reserve.title": "Rezervă",
    "reserve.forDate": "Pentru data",
    "reserve.quantity": "Cantitate",
    "reserve.forWhomOptional": "Pentru cine (opțional)",
    "reserve.forWhomPlaceholder": "Nume sau departament",
    "reserve.confirm": "Confirmă rezervarea",

    // decrement
    "decrement.errorBelowReserved": "Nu poate fi mai puțin decât rezervat.",
    "decrement.errorGeneric": "Actualizare eșuată.",
    "decrement.title": "Scade stocul",
    "decrement.currentStock": "Stoc curent",
    "decrement.howMany": "Câte",
    "decrement.confirm": "Scade",
    "decrement.hint": "Notă despre modificarea stocului",
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
    // language labels
    "lang.de": "Deutsch",
    "lang.en": "English",
    "lang.tr": "Türkçe",
    "lang.ro": "Română",
    "lang.ru": "Русский",

    // theme names/descriptions
    "theme.glass.title": "Стекло",
    "theme.glass.desc": "Прозрачный стеклянный дизайн",
    "theme.midnight.title": "Полночь",
    "theme.midnight.desc": "Глубокие тёмные тона",
    "theme.graphite.title": "Графит",
    "theme.graphite.desc": "Нейтральный графитовый вид",
    "theme.aurora.title": "Аврора",
    "theme.aurora.desc": "Цветные акценты авроры",
    "theme.neon.title": "Неон",
    "theme.neon.desc": "Яркая неоновая палитра",
    "theme.light.title": "Светлая",
    "theme.light.desc": "Яркая контрастная светлая тема",

    active: "Активен",

    // accent preset names
    "accentPreset.indigo": "Индиго",
    "accentPreset.cyan": "Циан",
    "accentPreset.emerald": "Изумрудный",
    "accentPreset.orange": "Оранжевый",
    "accentPreset.pink": "Розовый",
    "accentPreset.violet": "Фиолетовый",

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
    // common.* aliases used across app
    "common.loading": "Загрузка...",
    "common.refresh": "Обновить",
    "common.edit": "Редактировать",
    "common.close": "Закрыть",
    "common.pleaseWait": "Пожалуйста, подождите...",
    "common.delete": "Удалить",

    // nav / role / items
    "role": "Роль",
    "nav.dashboard": "Панель",
    "nav.reservations": "Бронирования",

    "items.title": "Оборудование & Материалы",
    "items.new": "Новый элемент",
    "items.searchPlaceholder": "Поиск по ID, названию...",
    "items.allWarehouses": "Все склады",
    "items.allCategories": "Все категории",
    "items.count": "{n} элементов",
    "items.noMatches": "Совпадений не найдено",
    "items.col.id": "ID",
    "items.col.name": "Название",
    "items.col.type": "Тип",
    "items.col.category": "Категория",
    "items.col.warehouse": "Склад",
    "items.col.condition": "Состояние",
    "items.col.status": "Статус",
    "items.col.actions": "Действия",
    "items.col.stock": "Остаток",

    // item form / edit / new
    "items.newSubtitle": "Добавить устройство или материал",
    "items.edit": "Редактировать элемент",
    "items.editSubtitle": "Редактировать устройство или материал",

    "form.id": "ID",
    "form.name": "Название",
    "form.placeholder.name": "Стиральная машина / пылесос …",
    "form.type": "Тип",
    "type.device": "Устройство",
    "type.material": "Материал",
    "item.device": "Устройство",
    "item.material": "Материал",
    "form.category": "Категория",
    "form.noCategoryFound": "Категория не найдена",
    "form.newCategory": "+ Новая категория…",
    "form.newCategoryPlaceholder": "Введите новую категорию…",
    "form.warehouse": "Склад",
    "form.state": "Состояние",
    "form.condition": "Состояние",
    "state.new": "новый",
    "state.ok": "ok",
    "state.needsRepair": "требуется ремонт",
    "state.defect": "неисправен",
    "state.disposed": "выведен из эксплуатации",
    "state.other": "Другое…",
    "form.statePlaceholder": "Введите состояние…",
    "form.status": "Статус",
    "status.available": "доступно",
    "status.unavailable": "недоступно",
    "status.locked": "заблокировано",
    "form.stockTotal": "Остаток (всего)",

    "action.save": "Сохранить",
    "action.saving": "Пожалуйста, подождите…",
    "action.cancel": "Отмена",
    "common.back": "Назад",

    "role.admin": "Админ",
    "role.mitarbeiter": "Сотрудник",

    // reserve
    "reserve.errorPickDate": "Пожалуйста, выберите дату.",
    "reserve.errorNotEnough": "Недостаточно в наличии.",
    "reserve.errorGeneric": "Не удалось забронировать.",
    "reserve.button": "Забронировать",
    "reserve.title": "Бронирование",
    "reserve.forDate": "На дату",
    "reserve.quantity": "Количество",
    "reserve.forWhomOptional": "Для кого (необязательно)",
    "reserve.forWhomPlaceholder": "Имя или отдел",
    "reserve.confirm": "Подтвердить",

    // decrement
    "decrement.errorBelowReserved": "Нельзя уменьшить ниже забронированного.",
    "decrement.errorGeneric": "Ошибка обновления.",
    "decrement.title": "Уменьшить запас",
    "decrement.currentStock": "Текущий запас",
    "decrement.howMany": "Сколько",
    "decrement.confirm": "Уменьшить",
    "decrement.hint": "Примечание по изменению запаса",
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

  // debug: log theme application
  try {
    // eslint-disable-next-line no-console
    console.debug("applyThemeToBody ->", { theme, accent: accentTriplet });
  } catch {}

  // visual debug indicator (non-intrusive)
  try {
    let ind = document.getElementById("astrein-theme-indicator");
    if (!ind) {
      ind = document.createElement("div");
      ind.id = "astrein-theme-indicator";
      ind.style.position = "fixed";
      ind.style.top = "12px";
      ind.style.right = "12px";
      ind.style.zIndex = "99999";
      ind.style.padding = "6px 10px";
      ind.style.borderRadius = "12px";
      ind.style.fontSize = "12px";
      ind.style.background = "rgba(0,0,0,0.5)";
      ind.style.color = "white";
      document.body.appendChild(ind);
    }
    ind.textContent = `Theme: ${theme}`;
    (ind.style as any).background = theme === "light" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.5)";
    (ind.style as any).color = theme === "light" ? "#0b1220" : "white";
  } catch {}

  const body = document.body;
  if (!body) return;

  // Remove any previous light-theme override stylesheet
  const existing = document.getElementById("astrein-light-overrides");
  if (existing) existing.remove();

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
    try { console.debug("applyThemeToBody branch=glass", { bg: body.style.backgroundImage, bgColor: body.style.backgroundColor, hasOverride: !!document.getElementById('astrein-light-overrides') }); } catch {}
    return;
  }

  if (theme === "midnight") {
    body.style.backgroundImage = `
      radial-gradient(900px 650px at 70% 10%, rgba(${A},0.26), transparent 58%),
      radial-gradient(900px 700px at 10% 90%, rgba(0,0,0,0.60), transparent 60%),
      linear-gradient(180deg, #020617, #00030a)
    `;
    try { console.debug("applyThemeToBody branch=midnight", { bg: body.style.backgroundImage, bgColor: body.style.backgroundColor, hasOverride: !!document.getElementById('astrein-light-overrides') }); } catch {}
    return;
  }

  if (theme === "graphite") {
    body.style.backgroundImage = `
      repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 14px),
      radial-gradient(1000px 650px at 80% 70%, rgba(${A},0.14), transparent 60%),
      linear-gradient(180deg, #0b1020, #050814)
    `;
    try { console.debug("applyThemeToBody branch=graphite", { bg: body.style.backgroundImage, bgColor: body.style.backgroundColor, hasOverride: !!document.getElementById('astrein-light-overrides') }); } catch {}
    return;
  }

  if (theme === "aurora") {
    body.style.backgroundImage = `
      radial-gradient(900px 600px at 20% 20%, rgba(${A},0.22), transparent 60%),
      radial-gradient(900px 700px at 80% 30%, rgba(45,212,191,0.16), transparent 62%),
      radial-gradient(900px 700px at 50% 90%, rgba(59,130,246,0.12), transparent 62%),
      linear-gradient(180deg, #020617, #02040f)
    `;
    try { console.debug("applyThemeToBody branch=aurora", { bg: body.style.backgroundImage, bgColor: body.style.backgroundColor, hasOverride: !!document.getElementById('astrein-light-overrides') }); } catch {}
    return;
  }

  if (theme === "light") {
    // light theme: white background, dark text, subtle borders
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.setAttribute("data-theme", "light");

    body.style.color = "#0b1220";
    body.style.minHeight = "100vh";
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundAttachment = "fixed";
    body.style.backgroundColor = "#fbfdff";
    // decorative, soft light background with subtle accent halos
    body.style.backgroundImage = `
      radial-gradient(800px 420px at 10% 8%, rgba(${A},0.06), transparent 28%),
      radial-gradient(600px 320px at 92% 28%, rgba(${A},0.04), transparent 40%),
      linear-gradient(180deg, #ffffff 0%, #fbfdff 40%, #f7fafc 100%)
    `;
    body.style.backgroundPosition = "center";
    body.style.backgroundSize = "cover";

    // tweak body font smoothing / contrast
    (body.style as any).webkitFontSmoothing = "antialiased";
    (body.style as any).MozOsxFontSmoothing = "grayscale";

    // Inject overrides to neutralize dark-tailwind classes used across the app
    const css = `
      [data-theme="light"] { background: #ffffff !important; }
      [data-theme="light"] [class*="text-white"] { color: #0b1220 !important; }
      [data-theme="light"] [class*="bg-black"] { background: #ffffff !important; color: #0b1220 !important; }
      [data-theme="light"] [class*="border-white"] { border-color: rgba(0,0,0,0.06) !important; }
      [data-theme="light"] .surface { background: rgba(255,255,255,0.96) !important; color: #0b1220 !important; border: 1px solid rgba(0,0,0,0.06) !important; }
      [data-theme="light"] .muted { color: rgba(11,18,32,0.68) !important; }
      [data-theme="light"] .btn-accent { color: white !important; }
      /* svg / chart overrides */
      [data-theme="light"] svg { color: #0b1220 !important; }
      [data-theme="light"] svg text { fill: rgba(11,18,32,0.92) !important; }
      [data-theme="light"] svg circle, [data-theme="light"] svg path, [data-theme="light"] svg rect, [data-theme="light"] svg line { stroke: rgba(11,18,32,0.85) !important; fill: rgba(11,18,32,0.06) !important; }

      /* remove dark gradient overlays used in hero/cards */
      [data-theme="light"] .absolute[style],
      [data-theme="light"] .absolute.inset-0,
      [data-theme="light"] .absolute.inset-0.opacity-70 {
        background: none !important;
      }

      /* fallback for elements with inline background gradients */
      [data-theme="light"] [style*="radial-gradient"] { background: none !important; }

      /* additional surface/card overrides */
      [data-theme="light"] .surface { background: #ffffff !important; color: #0b1220 !important; border: 1px solid rgba(0,0,0,0.06) !important; box-shadow: 0 6px 20px rgba(11,18,32,0.04) !important; }
      [data-theme="light"] .surface-2 { background: linear-gradient(180deg,#ffffff,#f7fafc) !important; color: #0b1220 !important; border: 1px solid rgba(0,0,0,0.03) !important; box-shadow: 0 4px 18px rgba(11,18,32,0.03) !important; }

      /* Tailwind opacity helpers that produce light overlays in dark mode */
      [data-theme="light"] [class*="bg-white"] { background: rgba(11,18,32,0.04) !important; color: #0b1220 !important; }
      [data-theme="light"] [class*="text-white"] { color: #0b1220 !important; }
      [data-theme="light"] [class*="text-white/"] { color: #0b1220 !important; }

      /* badges and small text */
      [data-theme="light"] .text-white/80, [data-theme="light"] .text-white\/80 { color: rgba(11,18,32,0.82) !important; }
      [data-theme="light"] .text-white/85, [data-theme="light"] .text-white\/85 { color: rgba(11,18,32,0.85) !important; }

      /* ensure progress bar backgrounds look appropriate */
      [data-theme="light"] .bg-white\/10, [data-theme="light"] [class*="bg-white/10"] { background: rgba(11,18,32,0.04) !important; }

      /* buttons with dark backgrounds should keep accent contrast */
      [data-theme="light"] .btn-accent { background: rgb(var(--accent)) !important; color: white !important; }


    `;

    const style = document.createElement("style");
    style.id = "astrein-light-overrides";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);

    try { console.debug("applyThemeToBody branch=light", { bg: body.style.backgroundImage, bgColor: body.style.backgroundColor, hasOverride: !!document.getElementById('astrein-light-overrides') }); } catch {}

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
  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccent] = useState<string>("99 102 241");

  // load once
  useEffect(() => {
    const raw = localStorage.getItem("astrein:prefs");
    if (raw) {
      try {
        const p = JSON.parse(raw);
        const nextLang: Lang = p.lang || "de";
        const nextTheme: Theme = p.theme || p.design || "light";
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

  function getByPath(obj: Record<string, any>, path: string) {
    if (!obj || !path) return path;

    // direct key (flat map) e.g. obj["items.title"]
    if (Object.prototype.hasOwnProperty.call(obj, path)) {
      const v = obj[path];
      return typeof v === "string" ? v : v;
    }

    // try dotted path traversal e.g. obj.items.title
    const parts = path.split(".");
    let cur: any = obj;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else {
        // fallback to direct key if present
        const direct = obj[path];
        if (typeof direct === "string") return direct;
        return path;
      }
    }
    return typeof cur === "string" ? cur : path;
  }

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      const raw = getByPath(DICT[lang] || DICT.de, key) || key;
      if (!vars) return raw;
      return Object.keys(vars).reduce(
        (s, k) => s.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), String(vars[k])),
        raw
      );
    };
  }, [lang]);

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
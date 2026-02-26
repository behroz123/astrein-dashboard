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
    employees: "Mitarbeiter",
    settings: "Einstellungen",
    wareneingang: "Wareneingang",
    warenausgang: "Warenausgang",
    moveouts: "Auszüge",
    exports: "Exporte",
    logout: "Abmelden",

    "moveouts.title": "Auszüge",
    "moveouts.subtitle": "Auszüge aus Wohnungen dokumentieren",
    "moveouts.form.title": "Neuen Auszug eintragen",
    "moveouts.form.person": "Wer ist ausgezogen?",
    "moveouts.form.date": "Wann ausgezogen?",
    "moveouts.form.from": "Von wo ausgezogen?",
    "moveouts.form.notes": "Notizen (optional)",
    "moveouts.form.save": "Eintrag speichern",
    "moveouts.count": "Einträge",
    "moveouts.list.title": "Auszugs-Liste",
    "moveouts.empty": "Noch keine Auszüge erfasst",
    "moveouts.col.person": "Name",
    "moveouts.col.date": "Datum",
    "moveouts.col.from": "Wohnung",
    "moveouts.col.by": "Eingetragen von",
    "moveouts.col.notes": "Notizen",

    moveins: "Einzüge",
    "moveins.title": "Einzüge",
    "moveins.subtitle": "Einzüge in Wohnungen dokumentieren",
    "moveins.form.title": "Neuen Einzug eintragen",
    "moveins.form.person": "Wer ist eingezogen?",
    "moveins.form.date": "Wann eingezogen?",
    "moveins.form.into": "Wohin eingezogen?",
    "moveins.form.notes": "Notizen (optional)",
    "moveins.form.save": "Eintrag speichern",
    "moveins.count": "Einträge",
    "moveins.list.title": "Einzugs-Liste",
    "moveins.empty": "Noch keine Einzüge erfasst",
    "moveins.col.person": "Name",
    "moveins.col.date": "Datum",
    "moveins.col.into": "Wohnung",
    "moveins.col.by": "Eingetragen von",
    "moveins.col.notes": "Notizen",

    immobilien: "Immobilien",
    "immobilien.header": "AH Exzellent Immobilien",
    "immobilien.description": "Immobilien, Auszüge und Einzüge verwalten",
    "immobilien.modules": "Module",
    "immobilien.integrated": "Vollständig integriert",
    "immobilien.costs": "Kostenübersicht",
    "immobilien.modulesTitle": "Module & Verwaltung",
    "immobilien.modulesDesc": "Verwalten Sie alle Aspekte Ihrer Immobilienportfolios",

    wohnungChecken: "Wohnung Checken",
    "wohnungChecken.title": "Wohnung Checken",
    "wohnungChecken.subtitle": "Checklisten & Protokolle",

    schluesseluebergabe: "Schlüsselübergabe",
    "schluesseluebergabe.title": "Schlüsselübergabeprotokoll",
    "schluesseluebergabe.subtitle": "Schlüsselübergaben dokumentieren",

    mietvertrag: "Mietvertrag",
    "mietvertrag.title": "Mietverträge",
    "mietvertrag.subtitle": "Mietverträge verwalten",

    stromVertrag: "Strom-Vertrag",
    "stromVertrag.title": "Stromverträge",
    "stromVertrag.subtitle": "Energieverträge verwalten",

    wasserVertrag: "Wasser-Vertrag",
    "wasserVertrag.title": "Wasserverträge",
    "wasserVertrag.subtitle": "Wasserverträge verwalten",

    untermietvertrag: "Untermietvertrag",
    "untermietvertrag.title": "Untermietverträge",
    "untermietvertrag.subtitle": "Untermietverträge verwalten",
    
    // Contract management
    "contract.myContracts": "Meine Verträge",
    "contract.selectNote": "Klicken Sie auf einen Vertrag, um Details zu sehen",
    "contract.noContracts": "Keine Verträge vorhanden",
    "contract.newContract": "Neuer Vertrag",
    "contract.edit": "Bearbeiten",
    "contract.delete": "Löschen",
    "contract.deleteConfirm": "Wirklich löschen?",
    "contract.cancellation": "Kündigung",
    "contract.monthlyPayment": "Monatlicher Abschlag",
    "contract.annualPayment": "Jährlich",
    "contract.object": "Objekt",
    "contract.address": "Adresse",
    "contract.provider": "Anbieter",
    "contract.accountNumber": "Kundennummer",
    "contract.meter": "Zähler",
    "contract.meterNumber": "Zähler-Nummer",
    "contract.meterReading": "Zählerstand",
    "contract.document": "Vertragsdokument",
    "contract.createdBy": "Erstellt von",
    "contract.save": "Speichern",
    "contract.cancel": "Abbrechen",
    "contract.loading": "Lädt...",
    "contract.propertyName": "Objektname",
    "contract.propertyAddress": "Adresse",
    "contract.contractPdf": "Vertrag (PDF)",
    "contract.currentContract": "Aktueller Vertrag",
    "contract.open": "Öffnen",
    "contract.pdfDocument": "PDF-Datei",
    "contract.uploading": "Lade PDF hoch...",
    "contract.saving": "Speichert...",
    "contract.back": "← Zurück",

    "employees.title": "Mitarbeiter",
    "employees.subtitle": "Profile der App-Nutzer",
    "employees.count": "Profile",
    "employees.empty": "Keine Mitarbeiter gefunden",
    "employees.noPermission": "Nur Administratoren können diese Seite sehen.",
    "employees.loading": "Lädt...",
    "employees.online": "Online",
    "employees.neverSeen": "Nie aktiv",
    "employees.inactive": "Inaktiv",
    "employees.edit": "Bearbeiten",
    "employees.delete": "Löschen",
    "employees.editTitle": "Mitarbeiter bearbeiten",
    "employees.firstName": "Vorname",
    "employees.lastName": "Nachname",
    "employees.role": "Berechtigung",
    "employees.error": "Fehler beim Speichern",
    "employees.confirmDelete": "Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten?",
    
    "wareneingang.title": "Wareneingang",
    "wareneingang.subtitle": "Historie aller eingebuchten Waren",
    "wareneingang.loading": "Lade Wareneingangs-Historie...",
    "wareneingang.noData": "Noch keine Wareneingänge erfasst",
    "wareneingang.added": "ins Lager gebracht",
    
    "warenausgang.title": "Warenausgang",
    "warenausgang.subtitle": "Historie aller ausgebuchten Waren",
    "warenausgang.loading": "Lade Warenausgangs-Historie...",
    "warenausgang.noData": "Noch keine Warenausgänge erfasst",
    "warenausgang.removed": "aus dem Lager entnommen",
    
    "log.articleId": "Artikel-ID",
    "log.quantity": "Menge",
    "log.stock": "Bestand",
    "log.has": "hat",
    "log.unknownUser": "Unbekannter Benutzer",
    "log.showingEntries": "Zeige {n} von {total} Einträgen",
    "log.showingEntry": "Zeige {n} von {total} Eintrag",
    
    "export.csv": "CSV Export",
    "filter.noResults": "Keine Einträge gefunden",
    "pagination.loadMore": "Mehr laden",
    "error.loadingLogs": "Fehler beim Laden der Logs",

    "exports.title": "Datenexporte",
    "exports.subtitle": "Exportieren Sie Lagerbestände und Historien als CSV-Dateien",
    "exports.items.title": "Lagerbestand",
    "exports.items.desc": "Aktuelle Lagerbestände exportieren",
    "exports.wareneingang.title": "Wareneingang",
    "exports.wareneingang.desc": "Historie der Wareneingänge exportieren",
    "exports.warenausgang.title": "Warenausgang",
    "exports.warenausgang.desc": "Historie der Warenausgänge exportieren",
    "exports.download": "Herunterladen",
    "exports.exporting": "Exportiere...",
    "exports.info": "Die Dateien werden im CSV-Format mit UTF-8-Kodierung heruntergeladen und können mit Excel oder Google Sheets geöffnet werden.",

    "chat.title": "Hilfe-Assistent",
    "chat.online": "Online",
    "chat.welcome": "Willkommen!",
    "chat.welcomeDesc": "Wie kann ich Ihnen heute helfen?",
    "chat.selectTopic": "Wählen Sie ein Thema oder stellen Sie eine Frage:",
    "chat.inputPlaceholder": "Ihre Frage...",
    "chat.openChat": "Chat öffnen",
    "chat.contactSupport": "📧 An Mitarbeiter weiterleiten",
    "chat.ticketCreated": "✅ Ihre Anfrage wurde an einen Mitarbeiter weitergeleitet. Sie werden sich schnellstmöglich bei Ihnen melden.",
    "chat.noMatch": "Entschuldigung, ich konnte keine passende Antwort finden. Möchten Sie Ihre Frage an einen Mitarbeiter weiterleiten?",
    "chat.topic.addItem": "Wie füge ich ein neues Gerät/Material hinzu?",
    "chat.answer.addItem": "Um ein neues Gerät oder Material hinzuzufügen:\n\n1. Gehen Sie zu 'Geräte & Material'\n2. Klicken Sie auf 'Neues Item'\n3. Füllen Sie die erforderlichen Felder aus (ID, Name, Typ, Kategorie, Lager, Zustand, Status, Bestand)\n4. Klicken Sie auf 'Speichern'\n\nDas neue Item wird sofort in der Liste angezeigt.",
    "chat.topic.wareneingang": "Wie buche ich einen Wareneingang?",
    "chat.answer.wareneingang": "So buchen Sie einen Wareneingang:\n\n1. Gehen Sie zu 'Geräte & Material'\n2. Finden Sie das gewünschte Item\n3. Klicken Sie auf 'Bearbeiten'\n4. Erhöhen Sie den Bestand\n5. Speichern Sie die Änderung\n\nDer Wareneingang wird automatisch in der Historie erfasst.",
    "chat.topic.warenausgang": "Wie buche ich einen Warenausgang?",
    "chat.answer.warenausgang": "So buchen Sie einen Warenausgang:\n\n1. Gehen Sie zu 'Geräte & Material'\n2. Finden Sie das gewünschte Item\n3. Klicken Sie auf 'Bearbeiten'\n4. Reduzieren Sie den Bestand\n5. Speichern Sie die Änderung\n\nDer Warenausgang wird automatisch in der Historie erfasst.",
    "chat.topic.export": "Wie exportiere ich Daten?",
    "chat.answer.export": "So exportieren Sie Daten:\n\n1. Gehen Sie zur 'Exporte' Seite in der Navigation\n2. Wählen Sie eine Export-Option:\n   - Lagerbestand (aktuelle Bestände)\n   - Wareneingang Historie\n   - Warenausgang Historie\n3. Klicken Sie auf 'Herunterladen'\n\nDie CSV-Datei wird heruntergeladen und kann mit Excel geöffnet werden.",
    "chat.topic.reserve": "Wie reserviere ich ein Item?",
    "chat.answer.reserve": "So reservieren Sie ein Item:\n\n1. Gehen Sie zu 'Geräte & Material'\n2. Finden Sie das gewünschte Item\n3. Klicken Sie auf 'Reservieren'\n4. Wählen Sie das Datum und die Menge\n5. Optional: Geben Sie an, für wen die Reservierung ist\n6. Bestätigen Sie die Reservierung\n\nDas Item wird für den gewählten Zeitraum reserviert.",

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
    "filter.reset": "Filter zurücksetzen",

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
    "role.inactive": "Inaktiv",

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

    dashboard: "Dashboard",
    items: "Items",
    addItem: "New item",
    employees: "Employees",
    settings: "Settings",
    wareneingang: "Goods Receipt",
    warenausgang: "Goods Issue",
    moveouts: "Move-outs",
    exports: "Exports",
    logout: "Sign out",

    "moveouts.title": "Move-outs",
    "moveouts.subtitle": "Document apartment move-outs",
    "moveouts.form.title": "Add move-out",
    "moveouts.form.person": "Who moved out?",
    "moveouts.form.date": "When moved out?",
    "moveouts.form.from": "Moved out from",
    "moveouts.form.notes": "Notes (optional)",
    "moveouts.form.save": "Save entry",
    "moveouts.count": "entries",
    "moveouts.list.title": "Move-out list",
    "moveouts.empty": "No move-outs recorded yet",
    "moveouts.col.person": "Name",
    "moveouts.col.date": "Date",
    "moveouts.col.from": "Apartment",
    "moveouts.col.by": "Recorded by",
    "moveouts.col.notes": "Notes",

    moveins: "Move-ins",

    immobilien: "Real Estate",
    "immobilien.header": "AH Exzellent Real Estate",
    "immobilien.description": "Manage apartments, move-outs and move-ins",
    "immobilien.modules": "Modules",
    "immobilien.integrated": "Fully integrated",
    "immobilien.costs": "Cost Overview",
    "immobilien.modulesTitle": "Modules & Management",
    "immobilien.modulesDesc": "Manage all aspects of your real estate portfolio",

    wohnungChecken: "Apartment Inspection",
    "wohnungChecken.title": "Apartment Inspection",
    "wohnungChecken.subtitle": "Checklists & protocols",

    schluesseluebergabe: "Key Handover",
    "schluesseluebergabe.title": "Key Handover Protocol",
    "schluesseluebergabe.subtitle": "Document key handovers",

    mietvertrag: "Rental Agreement",
    "mietvertrag.title": "Rental Agreements",
    "mietvertrag.subtitle": "Manage rental agreements",

    stromVertrag: "Electricity Contract",
    "stromVertrag.title": "Electricity Contracts",
    "stromVertrag.subtitle": "Manage energy contracts",

    wasserVertrag: "Water Contract",
    "wasserVertrag.title": "Water Contracts",
    "wasserVertrag.subtitle": "Manage water contracts",

    untermietvertrag: "Sublease Agreement",
    "untermietvertrag.title": "Sublease Agreements",
    "untermietvertrag.subtitle": "Manage sublease agreements",

    "employees.title": "Employees",
    "employees.subtitle": "Profiles of app users",
    "employees.count": "Profiles",
    "employees.empty": "No employees found",
    "employees.noPermission": "Only admins can view this page.",
    "employees.loading": "Loading...",
    "employees.online": "Online",
    "employees.neverSeen": "Never active",
    "employees.inactive": "Inactive",
    "employees.edit": "Edit",
    "employees.delete": "Delete",
    "employees.editTitle": "Edit Employee",
    "employees.firstName": "First Name",
    "employees.lastName": "Last Name",
    "employees.role": "Permission",
    "employees.error": "Error saving",
    "employees.confirmDelete": "Are you sure you want to delete this employee?",
    
    "wareneingang.title": "Goods Receipt",
    "wareneingang.subtitle": "History of all received goods",
    "wareneingang.loading": "Loading goods receipt history...",
    "wareneingang.noData": "No goods receipts recorded yet",
    "wareneingang.added": "added to warehouse",
    
    "warenausgang.title": "Goods Issue",
    "warenausgang.subtitle": "History of all issued goods",
    "warenausgang.loading": "Loading goods issue history...",
    "warenausgang.noData": "No goods issues recorded yet",
    "warenausgang.removed": "removed from warehouse",
    
    "log.articleId": "Article ID",
    "log.quantity": "Quantity",
    "log.stock": "Stock",
    "log.has": "has",
    "log.unknownUser": "Unknown user",
    "log.showingEntries": "Showing {n} of {total} entries",
    "log.showingEntry": "Showing {n} of {total} entry",
    
    "export.csv": "CSV Export",
    "filter.noResults": "No entries found",
    "pagination.loadMore": "Load more",
    "error.loadingLogs": "Error loading logs",

    "exports.title": "Data Exports",
    "exports.subtitle": "Export inventory and history as CSV files",
    "exports.items.title": "Inventory",
    "exports.items.desc": "Export current stock levels",
    "exports.wareneingang.title": "Goods Receipt",
    "exports.wareneingang.desc": "Export goods receipt history",
    "exports.warenausgang.title": "Goods Issue",
    "exports.warenausgang.desc": "Export goods issue history",
    "exports.download": "Download",
    "exports.exporting": "Exporting...",
    "exports.info": "Files will be downloaded in CSV format with UTF-8 encoding and can be opened with Excel or Google Sheets.",

    "chat.title": "Help Assistant",
    "chat.online": "Online",
    "chat.welcome": "Welcome!",
    "chat.welcomeDesc": "How can I help you today?",
    "chat.selectTopic": "Select a topic or ask a question:",
    "chat.inputPlaceholder": "Your question...",
    "chat.openChat": "Open chat",
    "chat.contactSupport": "📧 Forward to staff",
    "chat.ticketCreated": "✅ Your request has been forwarded to a staff member. They will contact you as soon as possible.",
    "chat.noMatch": "Sorry, I couldn't find a matching answer. Would you like to forward your question to a staff member?",
    "chat.topic.addItem": "How do I add a new device/material?",
    "chat.answer.addItem": "To add a new device or material:\n\n1. Go to 'Items & Materials'\n2. Click 'New item'\n3. Fill in the required fields (ID, Name, Type, Category, Warehouse, Condition, Status, Stock)\n4. Click 'Save'\n\nThe new item will appear immediately in the list.",
    "chat.topic.wareneingang": "How do I record goods receipt?",
    "chat.answer.wareneingang": "To record goods receipt:\n\n1. Go to 'Items & Materials'\n2. Find the desired item\n3. Click 'Edit'\n4. Increase the stock\n5. Save the change\n\nThe goods receipt will be automatically recorded in the history.",
    "chat.topic.warenausgang": "How do I record goods issue?",
    "chat.answer.warenausgang": "To record goods issue:\n\n1. Go to 'Items & Materials'\n2. Find the desired item\n3. Click 'Edit'\n4. Decrease the stock\n5. Save the change\n\nThe goods issue will be automatically recorded in the history.",
    "chat.topic.export": "How do I export data?",
    "chat.answer.export": "To export data:\n\n1. Go to the 'Exports' page in the navigation\n2. Choose an export option:\n   - Inventory (current stock levels)\n   - Goods Receipt History\n   - Goods Issue History\n3. Click 'Download'\n\nThe CSV file will be downloaded and can be opened with Excel.",
    "chat.topic.reserve": "How do I reserve an item?",
    "chat.answer.reserve": "To reserve an item:\n\n1. Go to 'Items & Materials'\n2. Find the desired item\n3. Click 'Reserve'\n4. Select the date and quantity\n5. Optional: Enter who the reservation is for\n6. Confirm the reservation\n\nThe item will be reserved for the selected period.",

    // Contract management (English)
    "contract.myContracts": "My Contracts",
    "contract.selectNote": "Click on a contract to see details",
    "contract.noContracts": "No contracts available",
    "contract.newContract": "New Contract",
    "contract.edit": "Edit",
    "contract.delete": "Delete",
    "contract.deleteConfirm": "Really delete?",
    "contract.cancellation": "Cancellation",
    "contract.monthlyPayment": "Monthly payment",
    "contract.annualPayment": "Annual",
    "contract.object": "Object",
    "contract.address": "Address",
    "contract.provider": "Provider",
    "contract.accountNumber": "Account number",
    "contract.meter": "Meter",
    "contract.meterNumber": "Meter number",
    "contract.meterReading": "Meter reading",
    "contract.document": "Contract document",
    "contract.createdBy": "Created by",
    "contract.save": "Save",
    "contract.cancel": "Cancel",
    "contract.loading": "Loading...",
    "contract.propertyName": "Property name *",
    "contract.propertyAddress": "Address",
    "contract.contractPdf": "Contract (PDF)",
    "contract.currentContract": "Current contract",
    "contract.open": "Open",
    "contract.pdfDocument": "PDF document",
    "contract.back": "← Back",

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
    "filter.reset": "Reset filters",

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
    "role.inactive": "Inactive",

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
    employees: "Çalışanlar",
    settings: "Ayarlar",
    wareneingang: "Mal Girişi",
    warenausgang: "Mal Çıkışı",
    moveouts: "Taşınanlar",
    exports: "Dışa Aktarımlar",
    logout: "Çıkış",

    "moveouts.title": "Taşınanlar",
    "moveouts.subtitle": "Daire taşınmalarını kaydedin",
    "moveouts.form.title": "Taşınan ekle",
    "moveouts.form.person": "Kim taşındı?",
    "moveouts.form.date": "Ne zaman taşındı?",
    "moveouts.form.from": "Nereden taşındı?",
    "moveouts.form.notes": "Notlar (isteğe bağlı)",
    "moveouts.form.save": "Kaydet",
    "moveouts.count": "kayıt",
    "moveouts.list.title": "Taşınanlar listesi",
    "moveouts.empty": "Henüz kayıt yok",
    "moveouts.col.person": "İsim",
    "moveouts.col.date": "Tarih",
    "moveouts.col.from": "Daire",
    "moveouts.col.by": "Kaydeden",
    "moveouts.col.notes": "Notlar",

    moveins: "Girenler",

    immobilien: "Gayrimenkul",
    "immobilien.header": "AH Exzellent Gayrimenkul",
    "immobilien.description": "Daireleri, taşınanları ve girenleri yönetin",
    "immobilien.modules": "Modüller",
    "immobilien.integrated": "Tam entegre",
    "immobilien.costs": "Maliyet Özeti",
    "immobilien.modulesTitle": "Modüller & Yönetim",
    "immobilien.modulesDesc": "Gayrimenkul portföyünüzün tüm yönlerini yönetin",

    wohnungChecken: "Daire Kontrol",
    "wohnungChecken.title": "Daire Kontrol",
    "wohnungChecken.subtitle": "Kontrol listeleri & protokoller",

    schluesseluebergabe: "Anahtar Teslimi",
    "schluesseluebergabe.title": "Anahtar Teslimi Protokolü",
    "schluesseluebergabe.subtitle": "Anahtar teslimleri kaydedin",

    mietvertrag: "Kiralama Sözleşmesi",
    "mietvertrag.title": "Kiralama Sözleşmeleri",
    "mietvertrag.subtitle": "Kiralama sözleşmelerini yönetin",

    stromVertrag: "Elektrik Sözleşmesi",
    "stromVertrag.title": "Elektrik Sözleşmeleri",
    "stromVertrag.subtitle": "Enerji sözleşmelerini yönetin",

    wasserVertrag: "Su Sözleşmesi",
    "wasserVertrag.title": "Su Sözleşmeleri",
    "wasserVertrag.subtitle": "Su sözleşmelerini yönetin",

    untermietvertrag: "Alt Kiralama Sözleşmesi",
    "untermietvertrag.title": "Alt Kiralama Sözleşmeleri",
    "untermietvertrag.subtitle": "Alt kiralama sözleşmelerini yönetin",
    
    // Contract management
    "contract.myContracts": "Sözleşmelerim",
    "contract.selectNote": "Ayrıntıları görmek için bir sözleşmeye tıklayın",
    "contract.noContracts": "Hiç sözleşme yok",
    "contract.newContract": "Yeni Sözleşme",
    "contract.edit": "Düzenle",
    "contract.delete": "Sil",
    "contract.deleteConfirm": "Gerçekten silinsin mi?",
    "contract.cancellation": "İptal",
    "contract.monthlyPayment": "Aylık Ödeme",
    "contract.annualPayment": "Yıllık",
    "contract.object": "Nesne",
    "contract.address": "Adres",
    "contract.provider": "Sağlayıcı",
    "contract.accountNumber": "Müşteri Numarası",
    "contract.meter": "Sayaç",
    "contract.meterNumber": "Sayaç-Numarası",
    "contract.meterReading": "Sayaç Okuması",
    "contract.document": "Sözleşme Belgesi",
    "contract.createdBy": "Tarafından Oluşturuldu",
    "contract.save": "Kaydet",
    "contract.cancel": "İptal",
    "contract.loading": "Yükleniyor...",
    "contract.propertyName": "Mülk Adı",
    "contract.propertyAddress": "Adres",
    "contract.contractPdf": "Sözleşme (PDF)",
    "contract.currentContract": "Geçerli Sözleşme",
    "contract.open": "Aç",
    "contract.pdfDocument": "PDF Belgesi",
    "contract.uploading": "PDF Yükleniyor...",
    "contract.saving": "Kaydediliyor...",
    "contract.back": "← Geri",

    "employees.title": "Çalışanlar",
    "employees.subtitle": "Uygulama kullanıcı profilleri",
    "employees.count": "Profil",
    "employees.empty": "Çalışan bulunamadı",
    "employees.noPermission": "Bu sayfayı yalnızca yöneticiler görebilir.",
    "employees.loading": "Yükleniyor...",
    "employees.online": "Çevrimi̇çi",
    "employees.neverSeen": "Hiçbir zaman aktif değil",
    "employees.inactive": "Pasif",
    "employees.edit": "Düzenle",
    "employees.delete": "Sil",
    "employees.editTitle": "Çalışanı Düzenle",
    "employees.firstName": "Ad",
    "employees.lastName": "Soyadı",
    "employees.role": "İzin",
    "employees.error": "Kaydetme hatası",
    "employees.confirmDelete": "Bu çalışanı silmek istediğinize emin misiniz?",
    
    "wareneingang.title": "Mal Girişi",
    "wareneingang.subtitle": "Tüm gelen malların geçmişi",
    "wareneingang.loading": "Mal giriş geçmişi yükleniyor...",
    "wareneingang.noData": "Henüz mal girişi kaydedilmedi",
    "wareneingang.added": "depoya eklendi",
    
    "warenausgang.title": "Mal Çıkışı",
    "warenausgang.subtitle": "Tüm çıkan malların geçmişi",
    "warenausgang.loading": "Mal çıkış geçmişi yükleniyor...",
    "warenausgang.noData": "Henüz mal çıkışı kaydedilmedi",
    "warenausgang.removed": "depodan alındı",
    
    "log.articleId": "Ürün ID",
    "log.quantity": "Miktar",
    "log.stock": "Stok",
    "log.has": "bir",
    "log.unknownUser": "Bilinmeyen kullanıcı",
    "log.showingEntries": "{total} içinden {n} gösteriliyor",
    "log.showingEntry": "{total} içinden {n} gösteriliyor",
    
    "export.csv": "CSV İndir",
    "filter.noResults": "Kayıt bulunamadı",
    "pagination.loadMore": "Daha fazla yükle",
    "error.loadingLogs": "Loglar yüklenirken hata",

    "exports.title": "Veri Dışa Aktarımları",
    "exports.subtitle": "Envanter ve geçmişi CSV dosyası olarak dışa aktarın",
    "exports.items.title": "Envanter",
    "exports.items.desc": "Mevcut stok seviyelerini dışa aktar",
    "exports.wareneingang.title": "Mal Girişi",
    "exports.wareneingang.desc": "Mal giriş geçmişini dışa aktar",
    "exports.warenausgang.title": "Mal Çıkışı",
    "exports.warenausgang.desc": "Mal çıkış geçmişini dışa aktar",
    "exports.download": "İndir",
    "exports.exporting": "Dışa aktarılıyor...",
    "exports.info": "Dosyalar UTF-8 kodlamalı CSV formatında indirilecek ve Excel veya Google Sheets ile açılabilir.",

    "chat.title": "Yardım Asistanı",
    "chat.online": "Çevrimiçi",
    "chat.welcome": "Hoş geldiniz!",
    "chat.welcomeDesc": "Bugün size nasıl yardımcı olabilirim?",
    "chat.selectTopic": "Bir konu seçin veya soru sorun:",
    "chat.inputPlaceholder": "Sorunuz...",
    "chat.openChat": "Sohbeti aç",
    "chat.contactSupport": "📧 Çalışana ilet",
    "chat.ticketCreated": "✅ Talebiniz bir çalışana iletildi. En kısa sürede sizinle iletişime geçecekler.",
    "chat.noMatch": "Üzgünüm, uygun bir cevap bulamadım. Sorunuzu bir çalışana iletmek ister misiniz?",
    "chat.topic.addItem": "Yeni cihaz/malzeme nasıl eklerim?",
    "chat.answer.addItem": "Yeni cihaz veya malzeme eklemek için:\n\n1. 'Cihazlar & Malzeme' bölümüne gidin\n2. 'Yeni öğe' düğmesine tıklayın\n3. Gerekli alanları doldurun (ID, Ad, Tür, Kategori, Depo, Durum, Statü, Stok)\n4. 'Kaydet' düğmesine tıklayın\n\nYeni öğe hemen listede görünecektir.",
    "chat.topic.wareneingang": "Mal girişi nasıl kaydedilir?",
    "chat.answer.wareneingang": "Mal girişi kaydetmek için:\n\n1. 'Cihazlar & Malzeme' bölümüne gidin\n2. İstediğiniz öğeyi bulun\n3. 'Düzenle' düğmesine tıklayın\n4. Stoğu artırın\n5. Değişikliği kaydedin\n\nMal girişi otomatik olarak geçmişe kaydedilecektir.",
    "chat.topic.warenausgang": "Mal çıkışı nasıl kaydedilir?",
    "chat.answer.warenausgang": "Mal çıkışı kaydetmek için:\n\n1. 'Cihazlar & Malzeme' bölümüne gidin\n2. İstediğiniz öğeyi bulun\n3. 'Düzenle' düğmesine tıklayın\n4. Stoğu azaltın\n5. Değişikliği kaydedin\n\nMal çıkışı otomatik olarak geçmişe kaydedilecektir.",
    "chat.topic.export": "Verileri nasıl dışa aktarırım?",
    "chat.answer.export": "Verileri dışa aktarmak için:\n\n1. Navigasyonda 'Dışa Aktarımlar' sayfasına gidin\n2. Bir dışa aktarım seçeneği seçin:\n   - Envanter (mevcut stok seviyeleri)\n   - Mal Girişi Geçmişi\n   - Mal Çıkışı Geçmişi\n3. 'İndir' düğmesine tıklayın\n\nCSV dosyası indirilecek ve Excel ile açılabilir.",
    "chat.topic.reserve": "Bir öğeyi nasıl rezerve ederim?",
    "chat.answer.reserve": "Bir öğeyi rezerve etmek için:\n\n1. 'Cihazlar & Malzeme' bölümüne gidin\n2. İstediğiniz öğeyi bulun\n3. 'Rezerve et' düğmesine tıklayın\n4. Tarihi ve miktarı seçin\n5. İsteğe bağlı: Rezervasyonun kimin için olduğunu girin\n6. Rezervasyonu onaylayın\n\nÖğe seçilen süre için rezerve edilecektir.",

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
    "filter.reset": "Filtreleri sıfırla",

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
    "role.inactive": "Pasif",

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
    employees: "Angajați",
    settings: "Setări",
    wareneingang: "Recepție Marfa",
    warenausgang: "Ieșire Marfa",
    moveouts: "Mutări",
    exports: "Exporturi",
    logout: "Deconectare",

    "moveouts.title": "Mutări",
    "moveouts.subtitle": "Înregistrați mutările din apartamente",
    "moveouts.form.title": "Adaugă mutare",
    "moveouts.form.person": "Cine s-a mutat?",
    "moveouts.form.date": "Când s-a mutat?",
    "moveouts.form.from": "De unde s-a mutat?",
    "moveouts.form.notes": "Note (opțional)",
    "moveouts.form.save": "Salvează",
    "moveouts.count": "înregistrări",
    "moveouts.list.title": "Lista mutărilor",
    "moveouts.empty": "Nu există mutări înregistrate",
    "moveouts.col.person": "Nume",
    "moveouts.col.date": "Data",
    "moveouts.col.from": "Apartament",
    "moveouts.col.by": "Înregistrat de",
    "moveouts.col.notes": "Note",

    moveins: "Intrări",

    immobilien: "Imobiliare",
    "immobilien.header": "AH Exzellent Imobiliare",
    "immobilien.description": "Gestionați apartamentele, mutările și intrările",
    "immobilien.modules": "Module",
    "immobilien.integrated": "Complet integrat",
    "immobilien.costs": "Prezentare generală costuri",
    "immobilien.modulesTitle": "Module & Gestionare",
    "immobilien.modulesDesc": "Gestionați toți aspectele portofoliului dvs. imobiliar",

    wohnungChecken: "Inspectare Apartament",
    "wohnungChecken.title": "Inspectare Apartament",
    "wohnungChecken.subtitle": "Liste de verificare & protocoale",

    schluesseluebergabe: "Predare Chei",
    "schluesseluebergabe.title": "Protocol Predare Chei",
    "schluesseluebergabe.subtitle": "Înregistrați predarile de chei",

    mietvertrag: "Contract de Închiriere",
    "mietvertrag.title": "Contracte de Închiriere",
    "mietvertrag.subtitle": "Gestionați contractele de închiriere",

    stromVertrag: "Contract Electricitate",
    "stromVertrag.title": "Contracte Electricitate",
    "stromVertrag.subtitle": "Gestionați contractele de energie",

    wasserVertrag: "Contract Apă",
    "wasserVertrag.title": "Contracte Apă",
    "wasserVertrag.subtitle": "Gestionați contractele de apă",

    untermietvertrag: "Contract Subînchiriere",
    "untermietvertrag.title": "Contracte Subînchiriere",
    "untermietvertrag.subtitle": "Gestionați contractele de subînchiriere",
    
    // Contract management
    "contract.myContracts": "Contractele mele",
    "contract.selectNote": "Faceți clic pe un contract pentru a vedea detaliile",
    "contract.noContracts": "Niciun contract",
    "contract.newContract": "Contract nou",
    "contract.edit": "Editare",
    "contract.delete": "Ștergere",
    "contract.deleteConfirm": "Sigur să ștergeți?",
    "contract.cancellation": "Reziliere",
    "contract.monthlyPayment": "Plată lunară",
    "contract.annualPayment": "Anual",
    "contract.object": "Obiect",
    "contract.address": "Adresă",
    "contract.provider": "Furnizor",
    "contract.accountNumber": "Numărul clientului",
    "contract.meter": "Contor",
    "contract.meterNumber": "Număr contor",
    "contract.meterReading": "Citire contor",
    "contract.document": "Document contract",
    "contract.createdBy": "Creat de",
    "contract.save": "Salvare",
    "contract.cancel": "Anulare",
    "contract.loading": "Se încarcă...",
    "contract.propertyName": "Nume proprietate",
    "contract.propertyAddress": "Adresă",
    "contract.contractPdf": "Contract (PDF)",
    "contract.currentContract": "Contract curent",
    "contract.open": "Deschideți",
    "contract.pdfDocument": "Document PDF",
    "contract.uploading": "Se încarcă PDF...",
    "contract.saving": "Se salvează...",
    "contract.back": "← Înapoi",

    "employees.title": "Angajați",
    "employees.subtitle": "Profilele utilizatorilor aplicației",
    "employees.count": "Profiluri",
    "employees.empty": "Niciun angajat găsit",
    "employees.noPermission": "Doar administratorii pot vedea această pagină.",
    "employees.loading": "Se încarcă...",
    "employees.online": "Online",
    "employees.neverSeen": "Niciodată activ",
    "employees.inactive": "Inactiv",
    "employees.edit": "Editare",
    "employees.delete": "Ștergere",
    "employees.editTitle": "Editare Angajat",
    "employees.firstName": "Prenume",
    "employees.lastName": "Nume",
    "employees.role": "Permisiune",
    "employees.error": "Eroare la salvare",
    "employees.confirmDelete": "Sunteți sigur că doriți să ștergeți acest angajat?",
    
    "wareneingang.title": "Recepție Marfa",
    "wareneingang.subtitle": "Istoricul tuturor mărfurilor primite",
    "wareneingang.loading": "Se încarcă istoricul recepției...",
    "wareneingang.noData": "Nicio recepție înregistrată încă",
    "wareneingang.added": "adăugat în depozit",
    
    "warenausgang.title": "Ieșire Marfa",
    "warenausgang.subtitle": "Istoricul tuturor mărfurilor eliberate",
    "warenausgang.loading": "Se încarcă istoricul ieșirilor...",
    "warenausgang.noData": "Nicio ieșire înregistrată încă",
    "warenausgang.removed": "scos din depozit",
    
    "log.articleId": "ID articol",
    "log.quantity": "Cantitate",
    "log.stock": "Stoc",
    "log.has": "a",
    "log.unknownUser": "Utilizator necunoscut",
    "log.showingEntries": "Se afișează {n} din {total} intrări",
    "log.showingEntry": "Se afișează {n} din {total} intrare",
    
    "export.csv": "Export CSV",
    "filter.noResults": "Nicio intrare găsită",
    "pagination.loadMore": "Încărcați mai multe",
    "error.loadingLogs": "Eroare la încărcarea istoricului",

    "exports.title": "Exporturi de Date",
    "exports.subtitle": "Exportați inventarul și istoricul ca fișiere CSV",
    "exports.items.title": "Inventar",
    "exports.items.desc": "Exportați nivelurile actuale de stoc",
    "exports.wareneingang.title": "Recepție Marfa",
    "exports.wareneingang.desc": "Exportați istoricul recepțiilor",
    "exports.warenausgang.title": "Ieșire Marfa",
    "exports.warenausgang.desc": "Exportați istoricul ieșirilor",
    "exports.download": "Descărcare",
    "exports.exporting": "Se exportă...",
    "exports.info": "Fișierele vor fi descărcate în format CSV cu codificare UTF-8 și pot fi deschise cu Excel sau Google Sheets.",

    "chat.title": "Asistent Ajutor",
    "chat.online": "Online",
    "chat.welcome": "Bun venit!",
    "chat.welcomeDesc": "Cum vă pot ajuta astăzi?",
    "chat.selectTopic": "Selectați un subiect sau puneți o întrebare:",
    "chat.inputPlaceholder": "Întrebarea dvs...",
    "chat.openChat": "Deschide chat",
    "chat.contactSupport": "📧 Trimite la personal",
    "chat.ticketCreated": "✅ Solicitarea dvs. a fost trimisă unui membru al personalului. Vă vor contacta cât mai curând posibil.",
    "chat.noMatch": "Ne pare rău, nu am putut găsi un răspuns potrivit. Doriți să transmiteți întrebarea către un membru al personalului?",
    "chat.topic.addItem": "Cum adaug un nou echipament/material?",
    "chat.answer.addItem": "Pentru a adăuga un nou echipament sau material:\n\n1. Mergeți la 'Echipamente & Materiale'\n2. Faceți clic pe 'Item nou'\n3. Completați câmpurile obligatorii (ID, Nume, Tip, Categorie, Depozit, Stare, Status, Stoc)\n4. Faceți clic pe 'Salvare'\n\nNoul item va apărea imediat în listă.",
    "chat.topic.wareneingang": "Cum înregistrez o recepție de marfă?",
    "chat.answer.wareneingang": "Pentru a înregistra o recepție de marfă:\n\n1. Mergeți la 'Echipamente & Materiale'\n2. Găsiți itemul dorit\n3. Faceți clic pe 'Editare'\n4. Creșteți stocul\n5. Salvați modificarea\n\nRecepția de marfă va fi înregistrată automat în istoric.",
    "chat.topic.warenausgang": "Cum înregistrez o ieșire de marfă?",
    "chat.answer.warenausgang": "Pentru a înregistra o ieșire de marfă:\n\n1. Mergeți la 'Echipamente & Materiale'\n2. Găsiți itemul dorit\n3. Faceți clic pe 'Editare'\n4. Reduceți stocul\n5. Salvați modificarea\n\nIeșirea de marfă va fi înregistrată automat în istoric.",
    "chat.topic.export": "Cum export date?",
    "chat.answer.export": "Pentru a exporta date:\n\n1. Mergeți la pagina 'Exporturi' din navigație\n2. Alegeți o opțiune de export:\n   - Inventar (niveluri curente de stoc)\n   - Istoric Recepții Marfă\n   - Istoric Ieșiri Marfă\n3. Faceți clic pe 'Descărcare'\n\nFișierul CSV va fi descărcat și poate fi deschis cu Excel.",
    "chat.topic.reserve": "Cum rezerv un item?",
    "chat.answer.reserve": "Pentru a rezerva un item:\n\n1. Mergeți la 'Echipamente & Materiale'\n2. Găsiți itemul dorit\n3. Faceți clic pe 'Rezervare'\n4. Selectați data și cantitatea\n5. Opțional: Introduceți pentru cine este rezervarea\n6. Confirmați rezervarea\n\nItemul va fi rezervat pentru perioada selectată.",

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
    "filter.reset": "Resetează filtrele",

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
    "role.inactive": "Inactiv",

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
    employees: "Сотрудники",
    settings: "Настройки",
    wareneingang: "Приём товаров",
    warenausgang: "Отпуск товаров",
    moveouts: "Съезды",
    exports: "Экспорты",
    logout: "Выйти",

    "moveouts.title": "Съезды",
    "moveouts.subtitle": "Учет съездов из квартир",
    "moveouts.form.title": "Добавить съезд",
    "moveouts.form.person": "Кто съехал?",
    "moveouts.form.date": "Когда съехал?",
    "moveouts.form.from": "Откуда съехал?",
    "moveouts.form.notes": "Заметки (необязательно)",
    "moveouts.form.save": "Сохранить",
    "moveouts.count": "записей",
    "moveouts.list.title": "Список съездов",
    "moveouts.empty": "Пока нет записей",
    "moveouts.col.person": "Имя",
    "moveouts.col.date": "Дата",
    "moveouts.col.from": "Квартира",
    "moveouts.col.by": "Кем внесено",
    "moveouts.col.notes": "Заметки",

    moveins: "Заезды",

    immobilien: "Недвижимость",
    "immobilien.header": "AH Exzellent Недвижимость",
    "immobilien.description": "Управление квартирами, съездами и заездами",
    "immobilien.modules": "Модули",
    "immobilien.integrated": "Полностью интегрировано",
    "immobilien.costs": "Обзор стоимости",
    "immobilien.modulesTitle": "Модули и управление",
    "immobilien.modulesDesc": "Управляйте всеми аспектами вашего портфеля недвижимости",

    wohnungChecken: "Проверка квартиры",
    "wohnungChecken.title": "Проверка квартиры",
    "wohnungChecken.subtitle": "Контрольные списки и протоколы",

    schluesseluebergabe: "Передача ключей",
    "schluesseluebergabe.title": "Протокол передачи ключей",
    "schluesseluebergabe.subtitle": "Учет передачи ключей",

    mietvertrag: "Договор аренды",
    "mietvertrag.title": "Договоры аренды",
    "mietvertrag.subtitle": "Управление договорами аренды",

    stromVertrag: "Договор электроэнергии",
    "stromVertrag.title": "Договоры электроэнергии",
    "stromVertrag.subtitle": "Управление энергоконтрактами",

    wasserVertrag: "Договор водоснабжения",
    "wasserVertrag.title": "Договоры водоснабжения",
    "wasserVertrag.subtitle": "Управление водоконтрактами",

    untermietvertrag: "Договор субаренды",
    "untermietvertrag.title": "Договоры субаренды",
    "untermietvertrag.subtitle": "Управление договорами субаренды",
    
    // Contract management
    "contract.myContracts": "Мои контракты",
    "contract.selectNote": "Нажмите на контракт, чтобы увидеть детали",
    "contract.noContracts": "Нет контрактов",
    "contract.newContract": "Новый контракт",
    "contract.edit": "Редактировать",
    "contract.delete": "Удалить",
    "contract.deleteConfirm": "Вы уверены?",
    "contract.cancellation": "Расторжение",
    "contract.monthlyPayment": "Ежемесячный платёж",
    "contract.annualPayment": "Ежегодно",
    "contract.object": "Объект",
    "contract.address": "Адрес",
    "contract.provider": "Поставщик",
    "contract.accountNumber": "Номер лицевого счёта",
    "contract.meter": "Счётчик",
    "contract.meterNumber": "Номер счётчика",
    "contract.meterReading": "Показание счётчика",
    "contract.document": "Договор",
    "contract.createdBy": "Создано",
    "contract.save": "Сохранить",
    "contract.cancel": "Отмена",
    "contract.loading": "Загрузка...",
    "contract.propertyName": "Название объекта",
    "contract.propertyAddress": "Адрес",
    "contract.contractPdf": "Контракт (PDF)",
    "contract.currentContract": "Текущий контракт",
    "contract.open": "Открыть",
    "contract.pdfDocument": "PDF-документ",
    "contract.uploading": "Загрузка PDF...",
    "contract.saving": "Сохранение...",
    "contract.back": "← Назад",

    "employees.title": "Сотрудники",
    "employees.subtitle": "Профили пользователей приложения",
    "employees.count": "Профили",
    "employees.empty": "Сотрудники не найдены",
    "employees.noPermission": "Эта страница доступна только администраторам.",
    "employees.loading": "Загрузка...",
    "employees.online": "В сети",
    "employees.neverSeen": "Никогда не активен",
    "employees.inactive": "Неактивен",
    "employees.edit": "Редактировать",
    "employees.delete": "Удалить",
    "employees.editTitle": "Редактировать сотрудника",
    "employees.firstName": "Имя",
    "employees.lastName": "Фамилия",
    "employees.role": "Разрешение",
    "employees.error": "Ошибка сохранения",
    "employees.confirmDelete": "Вы уверены, что хотите удалить этого сотрудника?",
    
    "wareneingang.title": "Приём товаров",
    "wareneingang.subtitle": "История всех полученных товаров",
    "wareneingang.loading": "Загрузка истории приёма...",
    "wareneingang.noData": "Приём товаров ещё не зарегистрирован",
    "wareneingang.added": "добавлен на склад",
    
    "warenausgang.title": "Отпуск товаров",
    "warenausgang.subtitle": "История всех выданных товаров",
    "warenausgang.loading": "Загрузка истории отпуска...",
    "warenausgang.noData": "Отпуск товаров ещё не зарегистрирован",
    "warenausgang.removed": "удалён со склада",
    
    "log.articleId": "ID товара",
    "log.quantity": "Количество",
    "log.stock": "Остаток",
    "log.has": "",
    "log.unknownUser": "Неизвестный пользователь",
    "log.showingEntries": "Показано {n} из {total} записей",
    "log.showingEntry": "Показана {n} из {total} запись",
    
    "export.csv": "CSV Экспорт",
    "filter.noResults": "Записи не найдены",
    "pagination.loadMore": "Загрузить ещё",
    "error.loadingLogs": "Ошибка загрузки истории",

    "exports.title": "Экспорт данных",
    "exports.subtitle": "Экспортируйте инвентарь и историю в файлы CSV",
    "exports.items.title": "Инвентарь",
    "exports.items.desc": "Экспорт текущих остатков",
    "exports.wareneingang.title": "Приём товаров",
    "exports.wareneingang.desc": "Экспорт истории приёма",
    "exports.warenausgang.title": "Отпуск товаров",
    "exports.warenausgang.desc": "Экспорт истории отпуска",
    "exports.download": "Скачать",
    "exports.exporting": "Экспортируется...",
    "exports.info": "Файлы будут скачаны в формате CSV с кодировкой UTF-8 и могут быть открыты в Excel или Google Sheets.",

    "chat.title": "Помощник",
    "chat.online": "Онлайн",
    "chat.welcome": "Добро пожаловать!",
    "chat.welcomeDesc": "Как я могу вам помочь сегодня?",
    "chat.selectTopic": "Выберите тему или задайте вопрос:",
    "chat.inputPlaceholder": "Ваш вопрос...",
    "chat.openChat": "Открыть чат",
    "chat.contactSupport": "📧 Переслать сотруднику",
    "chat.ticketCreated": "✅ Ваш запрос переслан сотруднику. Они свяжутся с вами как можно скорее.",
    "chat.noMatch": "Извините, я не смог найти подходящий ответ. Хотите переслать ваш вопрос сотруднику?",
    "chat.topic.addItem": "Как добавить новое оборудование/материал?",
    "chat.answer.addItem": "Чтобы добавить новое оборудование или материал:\n\n1. Перейдите в 'Оборудование и материалы'\n2. Нажмите 'Новый элемент'\n3. Заполните обязательные поля (ID, Название, Тип, Категория, Склад, Состояние, Статус, Остаток)\n4. Нажмите 'Сохранить'\n\nНовый элемент сразу появится в списке.",
    "chat.topic.wareneingang": "Как зарегистрировать приём товаров?",
    "chat.answer.wareneingang": "Чтобы зарегистрировать приём товаров:\n\n1. Перейдите в 'Оборудование и материалы'\n2. Найдите нужный элемент\n3. Нажмите 'Редактировать'\n4. Увеличьте остаток\n5. Сохраните изменение\n\nПриём товаров будет автоматически записан в историю.",
    "chat.topic.warenausgang": "Как зарегистрировать отпуск товаров?",
    "chat.answer.warenausgang": "Чтобы зарегистрировать отпуск товаров:\n\n1. Перейдите в 'Оборудование и материалы'\n2. Найдите нужный элемент\n3. Нажмите 'Редактировать'\n4. Уменьшите остаток\n5. Сохраните изменение\n\nОтпуск товаров будет автоматически записан в историю.",
    "chat.topic.export": "Как экспортировать данные?",
    "chat.answer.export": "Чтобы экспортировать данные:\n\n1. Перейдите на страницу 'Экспорты' в навигации\n2. Выберите вариант экспорта:\n   - Инвентарь (текущие остатки)\n   - История приёма товаров\n   - История отпуска товаров\n3. Нажмите 'Скачать'\n\nCSV файл будет загружен и может быть открыт в Excel.",
    "chat.topic.reserve": "Как зарезервировать элемент?",
    "chat.answer.reserve": "Чтобы зарезервировать элемент:\n\n1. Перейдите в 'Оборудование и материалы'\n2. Найдите нужный элемент\n3. Нажмите 'Зарезервировать'\n4. Выберите дату и количество\n5. Опционально: Укажите, для кого резервация\n6. Подтвердите резервацию\n\nЭлемент будет зарезервирован на выбранный период.",

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
    "filter.reset": "Сбросить фильтры",

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
    "role.inactive": "Неактивен",

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
      ind.style.display = "none"; // Verstecken
      document.body.appendChild(ind);
    }
    // ind.textContent = `Theme: ${theme}`; // Auskommentiert - nicht mehr anzeigen
    (ind.style as any).display = "none"; // Komplett versteckt
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
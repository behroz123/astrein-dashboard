# GitHub Actions Deployment Setup

Das Projekt ist konfiguriert für automatisierte Deployment via GitHub Actions. So richtest du es ein:

## Erforderliche Schritte

### 1. Firebase Token generieren
```bash
firebase login:ci
```
Dies generiert einen Token. Kopiere ihn.

### 2. GitHub Secrets hinzufügen
Gehe zu: https://github.com/behroz123/astrein-dashboard/settings/secrets/actions

Füge folgende Secrets hinzu:

| Secret Name | Wert | Quelle |
|---|---|---|
| `FIREBASE_TOKEN` | *Der Token aus Schritt 1* | `firebase login:ci` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Dein Firebase API Key | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | z.B. `astrein-exellent-lager.firebaseapp.com` | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | z.B. `astrein-exellent-lager` | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | z.B. `astrein-exellent-lager.firebasestorage.app` | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Deine Sender ID | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Deine App ID | Firebase Console |

### 3. Wie man die Firebase Credentials findet

1. Gehe zu https://console.firebase.google.com
2. Wähle dein Projekt "astrein-exellent-lager"
3. Klicke auf ⚙️ (Projekteinstellungen)
4. Gehe zum Tab "Allgemein"
5. Scrolle zu "Deine Apps" → "firebaseConfig" (JavaScript)
6. Die Werte dort entsprechen den erforderlichen Secrets

### 4. Deploy triggern

Nach dem Hinzufügen der Secrets:
```bash
git add .
git commit -m "Update deployment workflow"
git push origin main
```

GitHub Actions wird automatisch:
1. Den Code bauen
2. Firestore Rules deployen
3. Zur Firebase Hosting deployen

## Lokale Entwicklung

Für lokale Entwicklung brauchst du `.env.local`:

```bash
cp .env.local.example .env.local
```

Dann:
```bash
npm run dev
```

## Troubleshooting

**Problem:** "Fehler: Process completed with exit code 1"
- ✅ **Lösung:** Stelle sicher, dass alle GitHub Secrets korrekt hinzugefügt sind

**Problem:** "Firebase Token ist ungültig"
- ✅ **Lösung:** Regeneriere den Token mit `firebase login:ci` und update das FIREBASE_TOKEN Secret

**Problem:** Build schlägt fehl (Kompilierungsfehler)
- ✅ **Lösung:** Überprüfe `npm run build` lokal, um Fehler zu finden
# Updated Thu Feb 26 21:25:23 CET 2026

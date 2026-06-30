import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type ExtractedVehicleData = Partial<{
  kennzeichen: string;
  fin: string;
  modell: string;
  fahrzeugName: string;
  baujahr: string;
  erstzulassungJahr: string;
  fahrzeugFarbe: string;
  kraftstoffArt: string;
  kilometerstand: string;
  versicherungsnummer: string;
  versicherungsname: string;
  registrierteFirma: string;
  fahrerVorname: string;
  fahrerName: string;
  fahrerNummer: string;
  fahrerGeburtsdatum: string;
  fahrerAdresse: string;
  fuehrerscheinGueltigBis: string;
}>;

function sanitizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeExtracted(data: any): ExtractedVehicleData {
  return {
    kennzeichen: sanitizeText(data?.kennzeichen),
    fin: sanitizeText(data?.fin),
    modell: sanitizeText(data?.modell),
    fahrzeugName: sanitizeText(data?.fahrzeugName),
    baujahr: sanitizeText(data?.baujahr),
    erstzulassungJahr: sanitizeText(data?.erstzulassungJahr),
    fahrzeugFarbe: sanitizeText(data?.fahrzeugFarbe),
    kraftstoffArt: sanitizeText(data?.kraftstoffArt),
    kilometerstand: sanitizeText(data?.kilometerstand),
    versicherungsnummer: sanitizeText(data?.versicherungsnummer),
    versicherungsname: sanitizeText(data?.versicherungsname),
    registrierteFirma: sanitizeText(data?.registrierteFirma),
    fahrerVorname: sanitizeText(data?.fahrerVorname),
    fahrerName: sanitizeText(data?.fahrerName),
    fahrerNummer: sanitizeText(data?.fahrerNummer),
    fahrerGeburtsdatum: sanitizeText(data?.fahrerGeburtsdatum),
    fahrerAdresse: sanitizeText(data?.fahrerAdresse),
    fuehrerscheinGueltigBis: sanitizeText(data?.fuehrerscheinGueltigBis),
  };
}

function extractJsonObject(text: string): any | null {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function fileToInlineData(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return {
    inlineData: {
      data: bytes.toString("base64"),
      mimeType: file.type || "application/octet-stream",
    },
  };
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return !!value && typeof value === "object" && "arrayBuffer" in value;
}

type GeminiModelInfo = {
  name?: string;
  supportedGenerationMethods?: string[];
};

async function verifyIdTokenWithIdentityToolkit(idToken: string): Promise<boolean> {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    // fallback to current client key used in this project
    "AIzaSyC0-P0V_vmZMfOkgkyE6sQ2djC3xWVpUNM";

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      }
    );

    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json?.users) && json.users.length > 0;
  } catch {
    return false;
  }
}

function normalizeModelName(name: string): string {
  return name.replace(/^models\//, "").trim();
}

async function discoverGenerateContentModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { method: "GET", cache: "no-store" }
    );

    if (!response.ok) return [];

    const json = await response.json();
    const models: GeminiModelInfo[] = Array.isArray(json?.models) ? json.models : [];

    return models
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => normalizeModelName(m.name || ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildModelCandidates(discovered: string[]): string[] {
  const preferred = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];

  const set = new Set<string>();
  for (const p of preferred) {
    if (discovered.includes(p)) set.add(p);
  }
  for (const d of discovered) {
    if (d.startsWith("gemini")) set.add(d);
  }

  // fallback defaults in case discovery API is unavailable
  if (set.size === 0) {
    preferred.forEach((p) => set.add(p));
  }

  return Array.from(set);
}

async function generateWithModelFallback(
  genAI: any,
  candidateModels: string[],
  parts: any[]
): Promise<string> {
  let text = "";
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
      });
      text = result.response.text();
      if (text?.trim()) {
        lastError = null;
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw new Error(
      `Kein unterstütztes Gemini-Modell verfügbar. Versucht: ${candidateModels.join(", ")} | Letzter Fehler: ${lastError?.message || String(lastError)}`
    );
  }

  if (!text?.trim()) {
    throw new Error("Leere KI-Antwort erhalten.");
  }

  return text;
}

async function validateDocumentByAI(
  genAI: any,
  candidateModels: string[],
  file: File,
  expectedType: "driver_license" | "vehicle_registration"
): Promise<{ valid: boolean; message?: string }> {
  const expectedText =
    expectedType === "driver_license"
      ? "driver_license (Führerschein)"
      : "vehicle_registration (Fahrzeugschein/Zulassung)";

  const validationPrompt = `
Du bist ein Dokument-Klassifikator.
Prüfe das Dokument und entscheide, ob es dem erwarteten Dokumenttyp entspricht.

Erwarteter Typ: ${expectedText}

Antworte NUR als valides JSON:
{
  "docType": "driver_license|vehicle_registration|other",
  "isExpected": true,
  "reason": ""
}
`;

  const parts = [
    { text: validationPrompt },
    await fileToInlineData(file),
  ];

  const text = await generateWithModelFallback(genAI, candidateModels, parts);
  const parsed = extractJsonObject(text);

  if (!parsed || typeof parsed?.isExpected !== "boolean") {
    return {
      valid: false,
      message:
        expectedType === "driver_license"
          ? "Bitte laden Sie einen gültigen Führerschein des Fahrers hoch."
          : "Bitte laden Sie einen gültigen Fahrzeugschein bzw. Zulassungsdokument hoch.",
    };
  }

  if (!parsed.isExpected) {
    return {
      valid: false,
      message:
        expectedType === "driver_license"
          ? "Bitte laden Sie einen gültigen Führerschein des Fahrers hoch."
          : "Bitte laden Sie einen gültigen Fahrzeugschein bzw. Zulassungsdokument hoch.",
    };
  }

  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const authHeader = req.headers.get("authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : "";
    const tokenFromBody = typeof formData.get("idToken") === "string"
      ? String(formData.get("idToken"))
      : "";
    const token = (tokenFromHeader || tokenFromBody || "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Nicht autorisiert. Bitte erneut anmelden." },
        { status: 401 }
      );
    }

    try {
      await getAdminAuth().verifyIdToken(token);
    } catch (authError: any) {
      const validByFallback = await verifyIdTokenWithIdentityToolkit(token);
      if (!validByFallback) {
        return NextResponse.json(
          {
            error: "Ungültiges oder abgelaufenes Login. Bitte erneut anmelden.",
            details: authError?.message || "Tokenprüfung fehlgeschlagen",
          },
          { status: 401 }
        );
      }
    }

    const vehicleDoc = formData.get("vehicleDoc");
    const licenseDoc = formData.get("licenseDoc");

    if (!isUploadFile(vehicleDoc)) {
      return NextResponse.json(
        { error: "Bitte laden Sie einen gültigen Fahrzeugschein bzw. Zulassungsdokument hoch." },
        { status: 400 }
      );
    }

    if (!isUploadFile(licenseDoc)) {
      return NextResponse.json(
        { error: "Bitte laden Sie einen gültigen Führerschein des Fahrers hoch." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key fehlt. Bitte in der Deployment-Umgebung eine Variable setzen: GEMINI_API_KEY oder GOOGLE_API_KEY (alternativ NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY).",
        },
        { status: 500 }
      );
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const discoveredModels = await discoverGenerateContentModels(apiKey);
    const candidateModels = buildModelCandidates(discoveredModels);

    const vehicleValidation = await validateDocumentByAI(
      genAI,
      candidateModels,
      vehicleDoc,
      "vehicle_registration"
    );
    if (!vehicleValidation.valid) {
      return NextResponse.json(
        { error: vehicleValidation.message || "Dokumenttyp Fahrzeug ungültig." },
        { status: 400 }
      );
    }

    const licenseValidation = await validateDocumentByAI(
      genAI,
      candidateModels,
      licenseDoc,
      "driver_license"
    );
    if (!licenseValidation.valid) {
      return NextResponse.json(
        { error: licenseValidation.message || "Dokumenttyp Führerschein ungültig." },
        { status: 400 }
      );
    }

    const prompt = `
Du bist ein präziser Datenextraktor für deutsche Fahrzeug- und Führerscheindokumente.
Lies alle bereitgestellten Dokumente und gib NUR ein valides JSON-Objekt zurück (ohne Markdown, ohne Erklärung).
Wenn ein Feld nicht sicher erkennbar ist, gib einen leeren String zurück.

Erwartete Felder:
{
  "kennzeichen": "",
  "fin": "",
  "modell": "",
  "fahrzeugName": "",
  "baujahr": "",
  "erstzulassungJahr": "",
  "fahrzeugFarbe": "",
  "kraftstoffArt": "",
  "kilometerstand": "",
  "versicherungsnummer": "",
  "versicherungsname": "",
  "registrierteFirma": "",
  "fahrerVorname": "",
  "fahrerName": "",
  "fahrerNummer": "",
  "fahrerGeburtsdatum": "",
  "fahrerAdresse": "",
  "fuehrerscheinGueltigBis": ""
}

Hinweise zur Zuordnung:
- führerscheindaten -> fahrer* Felder
- fahrzeugdaten -> kennzeichen, fin, modell, etc.
- fahrzeugName: kurze interne Anzeige, bevorzugt aus Marke + Modell
- Datumswerte als ISO-Format YYYY-MM-DD, wenn klar erkennbar. Sonst Originaltext oder leer.
`;

    const parts: any[] = [{ text: prompt }];

    parts.push({ text: "Dokumenttyp: Fahrzeugschein/Zulassung" });
    parts.push(await fileToInlineData(vehicleDoc));
    parts.push({ text: "Dokumenttyp: Führerschein" });
    parts.push(await fileToInlineData(licenseDoc));

    const text = await generateWithModelFallback(genAI, candidateModels, parts);
    const parsed = extractJsonObject(text);

    if (!parsed) {
      return NextResponse.json(
        {
          error: "Antwort konnte nicht als JSON gelesen werden.",
          raw: text,
        },
        { status: 502 }
      );
    }

    const extracted = sanitizeExtracted(parsed);

    return NextResponse.json({ extracted });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Interner Fehler bei Dokumentanalyse.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

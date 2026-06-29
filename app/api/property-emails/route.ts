import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "../../../lib/firebase-admin";

type GmailMessageHeader = {
  name: string;
  value: string;
};

type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailMessageHeader[];
  };
};

function getHeader(headers: GmailMessageHeader[] | undefined, name: string): string {
  if (!headers) return "";
  const match = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return match?.value || "";
}

async function getAccessToken() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Gmail OAuth env vars");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Gmail token error: ${text}`);
  }

  const tokenJson = await tokenRes.json();
  return tokenJson.access_token as string;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    await adminAuth.verifyIdToken(token);

    const propertyId = request.nextUrl.searchParams.get("propertyId");
    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const propertyDoc = await adminDb.collection("properties").doc(propertyId).get();
    if (!propertyDoc.exists) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const property = propertyDoc.data() as any;
    const adresse = (property?.adresse || property?.address || "").toString().trim();
    const stadtplz = (property?.stadtplz || "").toString().trim();
    const gmailLabel = (property?.gmailLabel || "").toString().trim();
    const gmailQueryCustom = (property?.gmailQuery || "").toString().trim();

    let gmailQuery = "";

    if (gmailQueryCustom) {
      gmailQuery = gmailQueryCustom;
    } else if (gmailLabel) {
      gmailQuery = `label:${gmailLabel}`;
    } else if (adresse || stadtplz) {
      const chunks = [adresse, stadtplz].filter(Boolean).map((v) => `\"${v}\"`);
      gmailQuery = chunks.join(" OR ");
    } else {
      gmailQuery = "newer_than:180d";
    }

    const userEmail = process.env.GMAIL_USER_EMAIL || "info@immobilien-exzellent.de";
    const accessToken = await getAccessToken();

    const listUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userEmail)}/messages`);
    listUrl.searchParams.set("maxResults", "12");
    listUrl.searchParams.set("q", gmailQuery);

    const listRes = await fetch(listUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!listRes.ok) {
      const text = await listRes.text();
      throw new Error(`Gmail list error: ${text}`);
    }

    const listJson = await listRes.json();
    const items: Array<{ id: string; threadId: string }> = listJson.messages || [];

    if (!items.length) {
      return NextResponse.json({ emails: [], query: gmailQuery });
    }

    const messagePromises = items.map(async (item) => {
      const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userEmail)}/messages/${item.id}`);
      msgUrl.searchParams.set("format", "metadata");
      msgUrl.searchParams.append("metadataHeaders", "From");
      msgUrl.searchParams.append("metadataHeaders", "Subject");
      msgUrl.searchParams.append("metadataHeaders", "Date");

      const msgRes = await fetch(msgUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!msgRes.ok) return null;
      const msg = (await msgRes.json()) as GmailMessage;

      const headers = msg.payload?.headers || [];
      const from = getHeader(headers, "From");
      const subject = getHeader(headers, "Subject") || "(Ohne Betreff)";
      const dateRaw = getHeader(headers, "Date");

      return {
        id: msg.id,
        threadId: msg.threadId,
        from,
        subject,
        snippet: msg.snippet || "",
        dateRaw,
        internalDate: msg.internalDate ? Number(msg.internalDate) : 0,
      };
    });

    const resolved = (await Promise.all(messagePromises)).filter(Boolean) as Array<{
      id: string;
      threadId: string;
      from: string;
      subject: string;
      snippet: string;
      dateRaw: string;
      internalDate: number;
    }>;

    const emails = resolved
      .sort((a, b) => (b.internalDate || 0) - (a.internalDate || 0))
      .map((m) => ({
        id: m.id,
        threadId: m.threadId,
        from: m.from,
        subject: m.subject,
        snippet: m.snippet,
        date: m.dateRaw,
        ts: m.internalDate,
      }));

    return NextResponse.json({ emails, query: gmailQuery });
  } catch (error: any) {
    console.error("[property-emails] error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

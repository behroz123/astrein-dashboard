import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ role: "mitarbeiter" }, { status: 200 });
    }

    const token = authHeader.slice(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ role: "mitarbeiter" }, { status: 200 });
    }

    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();
    const role = userData?.role || "mitarbeiter";

    return NextResponse.json({ role });
  } catch (error: any) {
    console.error("Error in get-user-role:", error);
    return NextResponse.json({ role: "mitarbeiter" }, { status: 200 });
  }
}

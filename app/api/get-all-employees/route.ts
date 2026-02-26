import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("[API] get-all-employees called");

    // Check environment
    console.log("[API] FIREBASE_ADMIN_SDK set:", !!process.env.FIREBASE_ADMIN_SDK);

    // Dynamically import to get fresh initialization
    const { adminAuth, adminDb } = await import("../../../lib/firebase-admin");
    console.log("[API] Admin SDK imported successfully");

    // Verify token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[API] No auth header");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    console.log("[API] Verifying token...");

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log("[API] Token verified for user:", decodedToken.uid);
    } catch (e: any) {
      console.error("[API] Token verification failed:", e.message);
      return NextResponse.json(
        { error: "Unauthorized: " + e.message },
        { status: 401 }
      );
    }

    // Check admin status
    console.log("[API] Checking admin status...");
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();
    const isAdmin = userData?.role === "admin";
    console.log("[API] User role:", userData?.role, "Is admin:", isAdmin);

    if (!isAdmin) {
      return NextResponse.json({ error: "Not an admin" }, { status: 403 });
    }

    // Get all users
    console.log("[API] Fetching all Firebase Auth users...");
    const authUsers = await adminAuth.listUsers(1000);
    console.log("[API] Found", authUsers.users.length, "auth users");

    console.log("[API] Fetching Firestore users...");
    const usersCollection = await adminDb.collection("users").get();
    console.log("[API] Found", usersCollection.docs.length, "firestore users");

    // Create map of Firestore users
    const firestoreUsers: Record<string, any> = {};
    usersCollection.docs.forEach((doc) => {
      firestoreUsers[doc.id] = doc.data();
    });

    // Combine data
    const employees = authUsers.users.map((user) => {
      const firestoreData = firestoreUsers[user.uid] || {};
      const lastSignInMs = user.metadata.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).getTime()
        : 0;

      return {
        id: user.uid,
        email: user.email || "",
        name:
          firestoreData.firstName && firestoreData.lastName
            ? `${firestoreData.firstName} ${firestoreData.lastName}`
            : firestoreData.firstName || user.displayName || user.email || "Benutzer",
        firstName: firestoreData.firstName || "",
        lastName: firestoreData.lastName || "",
        role: firestoreData.role || "mitarbeiter",
        photo: firestoreData.profileImageUrl || undefined,
        lastSeen: firestoreData.lastSeen?.toMillis?.() || lastSignInMs || 0,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime,
        disabled: user.disabled,
      };
    });

    console.log("[API] Returning", employees.length, "employees");
    return NextResponse.json({ employees });
  } catch (error: any) {
    console.error("[API] Fatal error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}



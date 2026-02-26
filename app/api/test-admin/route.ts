import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("=== Testing Admin SDK ===");
    
    // Check environment
    console.log("FIREBASE_ADMIN_SDK exists:", !!process.env.FIREBASE_ADMIN_SDK);
    console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    // Try importing admin
    console.log("Attempting to import firebase-admin...");
    const admin = await import("firebase-admin");
    console.log("Firebase admin imported successfully");

    // Check if already initialized
    const apps = admin.apps || [];
    console.log("Existing Firebase apps:", apps.length);

    return NextResponse.json({
      status: "ok",
      env_set: !!process.env.FIREBASE_ADMIN_SDK,
      project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      apps_count: apps.length,
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

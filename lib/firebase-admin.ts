import * as admin from 'firebase-admin';

// Initialisiere Firebase Admin (benötigt Service Account JSON)
// Diese Funktion wird nur auf dem Server ausgeführt

let adminInstance: admin.app.App;

export function getAdmin() {
  if (!adminInstance) {
    // Versuche Service Account zu laden oder nutze FIREBASE_ADMIN_SDK
    const credential = process.env.FIREBASE_ADMIN_SDK
      ? admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK))
      : admin.credential.applicationDefault();

    adminInstance = admin.initializeApp({
      credential,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  return adminInstance;
}

// Alternativ für lokal ohne Service Account (Development)
export function getAdminFirestore() {
  try {
    const app = getAdmin();
    return app.firestore();
  } catch (e) {
    console.log('Firebase Admin not available, using fallback');
    // Return null und handle gracefully in API
    return null;
  }
}

export { admin };

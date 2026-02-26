import * as admin from 'firebase-admin';

let adminInstance: admin.app.App | null = null;

function initializeAdmin() {
  if (adminInstance) {
    return adminInstance;
  }

  try {
    // Check if Firebase Admin is already initialized
    const existingApp = admin.apps.find(app => app?.name === '[DEFAULT]');
    if (existingApp) {
      adminInstance = existingApp;
      return adminInstance;
    }

    // Parse Service Account from environment variable
    const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK;
    
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_ADMIN_SDK environment variable not set');
    }

    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error('FIREBASE_ADMIN_SDK is not valid JSON: ' + (e as any).message);
    }

    console.log('[Firebase Admin] Initializing with project:', serviceAccount.project_id);

    adminInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('[Firebase Admin] Successfully initialized');
    return adminInstance;
  } catch (error: any) {
    console.error('[Firebase Admin] Initialization error:', error.message);
    throw error;
  }
}

export function getAdmin(): admin.app.App {
  return initializeAdmin();
}

export const adminAuth = (() => {
  try {
    return admin.auth(getAdmin());
  } catch (e) {
    console.error('[Firebase Admin Auth] Error getting auth:', e);
    throw e;
  }
})();

export const adminDb = (() => {
  try {
    return admin.firestore(getAdmin());
  } catch (e) {
    console.error('[Firebase Admin Firestore] Error getting firestore:', e);
    throw e;
  }
})();

export { admin };

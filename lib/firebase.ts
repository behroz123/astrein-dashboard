import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0-P0V_vmZMfOkgkyE6sQ2djC3xWVpUNM",
  authDomain: "astrein-exellent-lager.firebaseapp.com",
  projectId: "astrein-exellent-lager",
  storageBucket: "astrein-exellent-lager.firebasestorage.app",
  messagingSenderId: "351010645601",
  appId: "1:351010645601:web:dd3d271750061d13226c20",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
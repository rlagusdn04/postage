import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB-mpZOTG4eDlpAenDNfdl9bIW4feYuvxg",
  authDomain: "postage-h1228.firebaseapp.com",
  projectId: "postage-h1228",
  storageBucket: "postage-h1228.firebasestorage.app",
  messagingSenderId: "205430193367",
  appId: "1:205430193367:web:03cb4f61245cfaed5f4492",
  measurementId: "G-YS55L89V9Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const analytics = getAnalytics(app); 
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase Configuration (Replace with your own)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "search-omura.firebaseapp.com",
  projectId: "search-omura",
  storageBucket: "search-omura.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

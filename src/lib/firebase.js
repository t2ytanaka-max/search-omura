import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase Configuration (Replace with your own)
const firebaseConfig = {
  apiKey: "AIzaSyDdOW3-INeDWRm0XKDGtn7pji_fXV2wQS0",
  authDomain: "search-omura-fire-corps.firebaseapp.com",
  projectId: "search-omura-fire-corps",
  storageBucket: "search-omura-fire-corps.firebasestorage.app",
  messagingSenderId: "94083214990",
  appId: "1:94083214990:web:5c11174b047392724c23df",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

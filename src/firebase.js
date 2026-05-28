import { initializeApp } from "firebase/app"; 
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBTNiEpc493NbTCUkbIeTeij4wbgxEzu0I",
  authDomain: "fokus-tracker.vercel.app",
  projectId: "focus-tracker-6c44b",
  storageBucket: "focus-tracker-6c44b.firebasestorage.app",
  messagingSenderId: "373977418147",
  appId: "1:373977418147:web:52e4ca04f186460edd3216" 
};
const app = initializeApp(firebaseConfig); 
export const db       = getFirestore(app); 
export const auth     = getAuth(app); 
export const provider = new GoogleAuthProvider();

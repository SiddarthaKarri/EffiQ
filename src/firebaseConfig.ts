// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Define Firebase configuration object type
const firebaseConfig = {
  apiKey: "AIzaSyBwxa1yFkA-WTPX1R_RZugfy18NwmRyuZM",
  authDomain: "effiq-b3e50.firebaseapp.com",
  databaseURL: "https://effiq-b3e50-default-rtdb.firebaseio.com",
  projectId: "effiq-b3e50",
  storageBucket: "effiq-b3e50.appspot.com",
  messagingSenderId: "109863914318",
  appId: "1:109863914318:web:03cf7f5c47088474952c1f",
  measurementId: "G-F00CM6KDYW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Export Firebase modules
export { auth, db };

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// These values are provided by the platform in firebase-applet-config.json
// In a real app, you'd use environment variables, but for this environment
// we can import the JSON or just use placeholders if they are injected.
// Since I can see the file, I'll use the values or better yet, 
// use an approach that works if they are injected via window or similar if applicable.
// However, the standard way in this environment is to use the config provided.

import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Vul hier uw eigen Firebase-configuratie in
const firebaseConfig = {
  apiKey: "AIzaSyAbnESf3jSOwA3-E77GfBM32UnCdCeYKG0",
  authDomain: "samen-28ee5.firebaseapp.com",
  projectId: "samen-28ee5",
  storageBucket: "samen-28ee5.firebasestorage.app",
  messagingSenderId: "791755924192",
  appId: "1:791755924192:web:8d5cfb8924b13d2550a685",
  measurementId: "G-E4K9DDQR3G"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

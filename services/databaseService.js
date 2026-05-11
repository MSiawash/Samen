import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// --- Stub voor preview (echte implementatie moet nog) ---
export async function initializeDemoData() {
  // no-op
}

// --- Helper: haal profiel op ---
export async function haalProfiel(userId) {
  if (!userId) return null;
  const snap = await getDoc(doc(db, 'profiles', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// --- Helper: haal contacten op ---
export async function haalContacten(userId) {
  if (!userId) return [];
  const snap = await getDocs(collection(db, 'profiles', userId, 'contacten'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Helper: haal activiteiten op ---
export async function haalActiviteiten() {
  const snap = await getDocs(collection(db, 'activiteiten'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Helper: haal hulpvragen op ---
export async function haalHulpvragen(userId) {
  if (!userId) return [];
  const q = query(collection(db, 'hulpvragen'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

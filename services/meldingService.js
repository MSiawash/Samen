// Centraal meldingen-service: schrijft meldingen naar
// profiles/{ontvangerUid}/notificaties/{id}. Een melding is een klein
// Firestore-document dat in de belletjes-modal van App.jsx verschijnt.
//
// Alle meldingen hebben dezelfde structuur zodat de UI ze uniform kan tonen.
// Gebruik de helpers hieronder i.p.v. rechtstreeks addDoc aan te roepen,
// zodat velden en typen consistent blijven.
//
// Types:
//   'hulp_aangeboden'    Iemand biedt hulp aan op jouw hulpvraag
//   'hulp_geaccepteerd'  Je aanbod van hulp is geaccepteerd
//   'hulp_geweigerd'     Je aanbod van hulp is geweigerd (met reden)
//   'activiteit_verzoek'   Iemand wil meedoen met jouw activiteit
//   'activiteit_goedgekeurd' Je bent toegelaten tot een activiteit
//   'activiteit_afgewezen'   Je bent afgewezen voor een activiteit
//   'contact_verzoek'    Iemand wil jou als contact toevoegen
//   'contact_geaccepteerd' Je contactverzoek is geaccepteerd
//   'alarm'              Een contact heeft een alarm afgegeven (niet check-in gebruikt dit nog; App.jsx maakt zelf interne alarmen)

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Basisfunctie: schrijft een melding naar de ontvanger. Faalt stil (alleen
// console.warn) zodat een mislukte melding nooit de hoofdactie breekt.
export async function stuurMelding({
  ontvangerUid,
  type,
  titel,
  bericht,
  extra = null,
}) {
  if (!ontvangerUid || !type) return;
  try {
    await addDoc(
      collection(db, 'profiles', ontvangerUid, 'notificaties'),
      {
        type,
        titel: titel || '',
        bericht: bericht || '',
        extra: extra || null,
        gelezen: false,
        aangemaakt: serverTimestamp(),
      }
    );
  } catch (e) {
    console.warn('Kon melding niet opslaan:', e);
  }
}

// Markeer één melding als gelezen.
export async function markeerGelezen(uid, meldingId) {
  if (!uid || !meldingId) return;
  try {
    await updateDoc(doc(db, 'profiles', uid, 'notificaties', meldingId), {
      gelezen: true,
    });
  } catch (e) {
    console.warn('Kon melding niet markeren als gelezen:', e);
  }
}

// Markeer alles als gelezen in één keer.
export async function markeerAllesGelezen(uid) {
  if (!uid) return;
  try {
    const q = query(
      collection(db, 'profiles', uid, 'notificaties'),
      where('gelezen', '==', false)
    );
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) =>
        updateDoc(doc(db, 'profiles', uid, 'notificaties', d.id), {
          gelezen: true,
        })
      )
    );
  } catch (e) {
    console.warn('Kon niet alle meldingen markeren:', e);
  }
}

// Verwijder een melding (bij swipe-to-dismiss of vanuit modal).
export async function verwijderMelding(uid, meldingId) {
  if (!uid || !meldingId) return;
  try {
    await deleteDoc(doc(db, 'profiles', uid, 'notificaties', meldingId));
  } catch (e) {
    console.warn('Kon melding niet verwijderen:', e);
  }
}

// Haal recente meldingen op (voor eenmalige fetch; abonneer via onSnapshot
// voor live updates). Max 50 items, nieuwste eerst.
export async function haalMeldingen(uid) {
  if (!uid) return [];
  try {
    const q = query(
      collection(db, 'profiles', uid, 'notificaties'),
      orderBy('aangemaakt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('Kon meldingen niet ophalen:', e);
    return [];
  }
}

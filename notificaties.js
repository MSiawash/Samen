// Web stub — expo-notifications werkt alleen op native (iOS/Android)
// Vite laadt dit bestand; Metro laadt notificaties.native.js

export async function registerForPushNotificationsAsync() {
  console.log('Push-meldingen zijn niet beschikbaar in de webbrowser.');
  return null;
}

export async function stuurAlarmMelding(contactId, contactNaam, noodcontactNaam) {
  console.log(`[Web] Alarm voor ${contactNaam} — noodcontact: ${noodcontactNaam}`);
}

export async function planHerhaaldAlarm(contactId, contactNaam, noodcontactNaam) {
  console.log(`[Web] Herhaald alarm gepland voor ${contactNaam}`);
}

export async function annuleerAlarmVoorContact(contactId) {
  console.log(`[Web] Alarm geannuleerd voor contact ${contactId}`);
}

export async function controleerAlarmStatus(contacten) {
  const nu = new Date();
  if (nu.getHours() < 12) return;

  for (const contact of contacten) {
    if (!contact.ingecheckt) {
      console.log(`[Web] ALARM: ${contact.naam} niet ingecheckt na 12:00`);
    }
  }
}

export function addNotificationResponseListener(callback) {
  // Geen notificaties in de browser
  return { remove: () => {} };
}

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// --- Meldingen ook tonen als de app op de voorgrond staat ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// --- Push-toestemming vragen & token ophalen ---
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Push-meldingen werken alleen op een echt apparaat.');
    return null;
  }

  // Android: alarm-kanaal met hoge prioriteit
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarm', {
      name: 'Alarm meldingen',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#FF3B30',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Standaard',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2A9D8F',
    });
  }

  const { status: bestaandeStatus } = await Notifications.getPermissionsAsync();
  let definitieveStatus = bestaandeStatus;

  if (bestaandeStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    definitieveStatus = status;
  }

  if (definitieveStatus !== 'granted') {
    console.log('Gebruiker heeft geen toestemming gegeven voor meldingen.');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log('Push token:', tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.error('Kon push token niet ophalen:', err);
    return null;
  }
}

// --- Directe alarm-melding bij status rood ---
export async function stuurAlarmMelding(contactId, contactNaam, noodcontactNaam) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 ALARM: ${contactNaam} heeft vandaag nog niet ingecheckt!`,
      body: `Het is na 12:00 uur en ${contactNaam} is nog niet bereikt. Noodcontact: ${noodcontactNaam}. Tik hier om actie te ondernemen.`,
      sound: true,
      data: { contactId, type: 'alarm' },
    },
    trigger: null,
  });
}

// --- Herhalende alarm-melding: elk uur opnieuw zolang status rood ---
export async function planHerhaaldAlarm(contactId, contactNaam, noodcontactNaam) {
  // Annuleer eerst eventuele bestaande herhaling voor dit contact
  await annuleerAlarmVoorContact(contactId);

  await Notifications.scheduleNotificationAsync({
    identifier: `alarm-herhaal-${contactId}`,
    content: {
      title: `🚨 ALARM: ${contactNaam} is nog steeds niet bereikt!`,
      body: `${contactNaam} heeft zich vandaag nog niet ingecheckt. Noodcontact: ${noodcontactNaam}. Tik hier om te bellen.`,
      sound: true,
      data: { contactId, type: 'alarm' },
    },
    trigger: {
      seconds: 3600, // elk uur
      repeats: true,
    },
  });
}

// --- Annuleer herhaalmelding voor specifiek contact ---
export async function annuleerAlarmVoorContact(contactId) {
  await Notifications.cancelScheduledNotificationAsync(
    `alarm-herhaal-${contactId}`
  );
}

// --- Controleer contacten en stuur alarm indien nodig ---
export async function controleerAlarmStatus(contacten) {
  const nu = new Date();
  const uur = nu.getHours();

  // Alleen na 12:00 uur alarm-meldingen sturen
  if (uur < 12) return;

  for (const contact of contacten) {
    if (!contact.ingecheckt) {
      // Direct alarm + herhaling inplannen
      await stuurAlarmMelding(
        contact.id,
        contact.naam,
        contact.naam_noodcontact
      );
      await planHerhaaldAlarm(
        contact.id,
        contact.naam,
        contact.naam_noodcontact
      );
    } else {
      // Contact is weer veilig, annuleer eventuele herhalingen
      await annuleerAlarmVoorContact(contact.id);
    }
  }
}

// --- Listener voor notificatie-response (gebruiker tikt op melding) ---
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.type === 'alarm' && data?.contactId) {
      callback(data.contactId);
    }
  });
}

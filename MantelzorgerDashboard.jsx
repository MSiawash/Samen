import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';

const TEAL = '#2A9D8F';
const ORANJE = '#F4A261';
const ROOD = '#E76F51';
const GROEN = '#4CAF50';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

// --- Dummy data: gekoppelde senioren ---
const senioren = [
  {
    id: '1',
    naam: 'Moeder (Ans)',
    laatsteCheckIn: 'Vandaag om 08:30',
    status: 'ok',
    mood: '☀️',
  },
  {
    id: '2',
    naam: 'Vader (Henk)',
    laatsteCheckIn: 'Gisteren om 21:15',
    status: 'alarm',
    mood: null,
  },
  {
    id: '3',
    naam: 'Buurvrouw (Corrie)',
    laatsteCheckIn: 'Vandaag om 09:45',
    status: 'ok',
    mood: '⛅',
  },
  {
    id: '4',
    naam: 'Oom (Wim)',
    laatsteCheckIn: 'Eergisteren om 17:00',
    status: 'alarm',
    mood: null,
  },
];

const schaduw = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
});

function SeniorCard({ senior }) {
  const isAlarm = senior.status === 'alarm';

  function handleBel() {
    Alert.alert('Bellen', `U belt nu ${senior.naam}...`);
  }

  function handleBeheer() {
    Alert.alert('Beheer', `Instellingen voor ${senior.naam} openen...`);
  }

  return (
    <View style={[styles.card, isAlarm && styles.cardAlarm]}>
      {/* Status-indicator */}
      <View style={styles.statusRij}>
        <Text style={styles.seniorNaam}>
          {senior.naam} <Text style={styles.seniorMood}>{senior.mood || '⚪'}</Text>
        </Text>
        {isAlarm ? (
          <Text style={styles.alarmBadge}>!</Text>
        ) : (
          <Text style={styles.okBadge}>✓</Text>
        )}
      </View>

      {/* Check-in info */}
      <Text style={styles.checkInTijd}>
        Laatste check-in: {senior.laatsteCheckIn}
      </Text>

      {/* Statusmelding */}
      {isAlarm ? (
        <View style={styles.alarmBlok}>
          <Text style={styles.alarmTekst}>
            ⚠️ Heeft zich nog niet gemeld!
          </Text>
        </View>
      ) : (
        <View style={styles.okBlok}>
          <Text style={styles.okTekst}>✅ Veilig ingecheckt</Text>
        </View>
      )}

      {/* Actieknoppen */}
      <View style={styles.actieRij}>
        <TouchableOpacity
          style={[styles.actieKnop, styles.belKnop]}
          activeOpacity={0.7}
          onPress={handleBel}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Bel ${senior.naam}`}
        >
          <Text style={styles.actieKnopTekst}>📞 Bel direct</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actieKnop, styles.beheerKnop]}
          activeOpacity={0.7}
          onPress={handleBeheer}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Beheer instellingen voor ${senior.naam}`}
        >
          <Text style={styles.beheerKnopTekst}>⚙️ Beheer instellingen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MantelzorgerDashboard() {
  return (
    <View style={styles.scherm}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitel}>Mijn Zorgnetwerk</Text>
        <Text style={styles.headerSubtitel}>
          {senioren.length} personen gekoppeld
        </Text>
      </View>

      {/* Seniorenlijst */}
      <FlatList
        data={senioren}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SeniorCard senior={item} />}
        contentContainerStyle={styles.lijstContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitel: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitel: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  lijstContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Card
  card: {
    backgroundColor: WIT,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    ...schaduw,
  },
  cardAlarm: {
    borderColor: ROOD,
  },

  // Status boven in card
  statusRij: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seniorNaam: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  seniorMood: {
    fontSize: 20,
  },
  okBadge: {
    fontSize: 22,
    fontWeight: '700',
    color: GROEN,
    backgroundColor: '#E8F5E9',
    width: 36,
    height: 36,
    borderRadius: 18,
    textAlign: 'center',
    lineHeight: 36,
    overflow: 'hidden',
  },
  alarmBadge: {
    fontSize: 22,
    fontWeight: '700',
    color: ROOD,
    backgroundColor: '#FFEBEE',
    width: 36,
    height: 36,
    borderRadius: 18,
    textAlign: 'center',
    lineHeight: 36,
    overflow: 'hidden',
  },

  // Check-in tijd
  checkInTijd: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
  },

  // Status blokken
  okBlok: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  okTekst: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
  },
  alarmBlok: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  alarmTekst: {
    fontSize: 18,
    fontWeight: '600',
    color: ROOD,
  },

  // Actieknoppen
  actieRij: {
    flexDirection: 'row',
    gap: 12,
  },
  actieKnop: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  belKnop: {
    backgroundColor: TEAL,
  },
  beheerKnop: {
    backgroundColor: ACHTERGROND,
    borderWidth: 2,
    borderColor: '#D0D0D0',
  },
  actieKnopTekst: {
    fontSize: 16,
    fontWeight: '700',
    color: WIT,
  },
  beheerKnopTekst: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
  },
});

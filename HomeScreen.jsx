import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

// --- Dummy data voor de Dagelijkse Mix ---
const dagelijkseMix = [
  {
    id: '1',
    type: 'weer',
  },
  {
    id: '2',
    type: 'nostalgie',
  },
  {
    id: '3',
    type: 'hulpvraag',
  },
  {
    id: '4',
    type: 'nieuws',
  },
  {
    id: '5',
    type: 'poll',
  },
];

// --- Helper: begroeting op basis van tijd ---
function getBegroeting() {
  const uur = new Date().getHours();
  if (uur < 12) return 'Goedemorgen';
  if (uur < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

// --- Kaartjes per type ---
function WeerKaart() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>☀️</Text>
      <Text style={styles.cardText}>
        Het is vandaag een zachte 15 graden in Rotterdam. Heerlijk weer voor een
        klein blokje om!
      </Text>
    </View>
  );
}

function NostalgieKaart() {
  return (
    <View style={styles.card}>
      <View style={styles.fotoPlaceholder}>
        <Text style={styles.placeholderText}>Foto</Text>
      </View>
      <Text style={[styles.cardText, { marginTop: 14 }]}>
        Historisch Rotterdam: Kwam u vroeger ook vaak rond de Wijnhaven?
      </Text>
    </View>
  );
}

function HulpvraagKaart() {
  return (
    <View style={[styles.card, styles.hulpvraagCard]}>
      <View style={styles.hulpvraagAccent} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardText}>
          Mevrouw de Vries vraagt: Kan iemand vanmiddag een halfje bruin
          meenemen?
        </Text>
        <TouchableOpacity
          style={styles.helpButton}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ik help mevrouw de Vries"
        >
          <Text style={styles.helpButtonText}>Ik help</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NieuwsKaart() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>📰</Text>
      <Text style={styles.cardText}>
        Wijkupdate: Er is een nieuw rustbankje geplaatst in het wijkpark.
      </Text>
    </View>
  );
}

function PollKaart() {
  const [antwoord, setAntwoord] = useState(null);

  return (
    <View style={styles.card}>
      <Text style={styles.cardSubtitle}>Spreekwoord van de dag</Text>
      <Text style={styles.cardText}>Wie goed doet, goed...</Text>
      {antwoord ? (
        <Text style={styles.bedanktTekst}>
          U koos: &quot;{antwoord}&quot; — Bedankt voor uw stem!
        </Text>
      ) : (
        <View style={styles.pollKnoppen}>
          <TouchableOpacity
            style={styles.pollKnop}
            activeOpacity={0.7}
            onPress={() => setAntwoord('ontmoet')}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Antwoord: ontmoet"
          >
            <Text style={styles.pollKnopText}>ontmoet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pollKnop}
            activeOpacity={0.7}
            onPress={() => setAntwoord('vergeet')}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Antwoord: vergeet"
          >
            <Text style={styles.pollKnopText}>vergeet</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function renderKaart(item) {
  switch (item.type) {
    case 'weer':
      return <WeerKaart key={item.id} />;
    case 'nostalgie':
      return <NostalgieKaart key={item.id} />;
    case 'hulpvraag':
      return <HulpvraagKaart key={item.id} />;
    case 'nieuws':
      return <NieuwsKaart key={item.id} />;
    case 'poll':
      return <PollKaart key={item.id} />;
    default:
      return null;
  }
}

// --- Hoofdscherm ---
export default function HomeScreen() {
  const [moodGedeeld, setMoodGedeeld] = useState(false);

  // Impliciete check-in bij laden
  useEffect(() => {
    console.log('Gebruiker actief - check-in voltooid in Samen');
  }, []);

  const begroeting = getBegroeting();

  return (
    <ScrollView
      style={styles.scherm}
      contentContainerStyle={styles.schermContent}
    >
      {/* ===== BOVENSTE HELFT ===== */}

      {/* Begroeting */}
      <Text style={styles.begroeting}>
        {begroeting}, Jan!
      </Text>

      {/* Mood Tracker */}
      <View style={styles.card}>
        {moodGedeeld ? (
          <Text style={styles.bedanktTekst}>
            Bedankt voor het delen! Geniet van uw dag.
          </Text>
        ) : (
          <>
            <Text style={styles.cardSubtitle}>Hoe voelt u zich vandaag?</Text>
            <View style={styles.moodRij}>
              <TouchableOpacity
                style={styles.moodKnop}
                activeOpacity={0.7}
                onPress={() => setMoodGedeeld(true)}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Ik voel me goed"
              >
                <Text style={styles.moodEmoji}>☀️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moodKnop}
                activeOpacity={0.7}
                onPress={() => setMoodGedeeld(true)}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Ik voel me gemiddeld"
              >
                <Text style={styles.moodEmoji}>⛅</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moodKnop}
                activeOpacity={0.7}
                onPress={() => setMoodGedeeld(true)}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Ik voel me niet zo goed"
              >
                <Text style={styles.moodEmoji}>🌧️</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ===== ONDERSTE HELFT ===== */}

      <Text style={styles.sectietitel}>Uw Dagelijkse Mix</Text>

      {dagelijkseMix.map(renderKaart)}

      {/* Extra ruimte onderaan voor tab bar */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// --- Styling ---
const TEAL = '#2A9D8F';
const ORANJE = '#F4A261';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

const schaduw = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  scherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
  },
  schermContent: {
    padding: 20,
    paddingTop: 20,
  },

  // Begroeting
  begroeting: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
  },

  // Sectietitel
  sectietitel: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 20,
  },

  // Kaartjes (basis)
  card: {
    backgroundColor: WIT,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...schaduw,
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 19,
    lineHeight: 28,
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 14,
  },

  // Mood tracker
  moodRij: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  moodKnop: {
    backgroundColor: ACHTERGROND,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  moodEmoji: {
    fontSize: 40,
  },

  // Bedankt-tekst (mood + poll)
  bedanktTekst: {
    fontSize: 20,
    color: TEAL,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 10,
  },

  // Nostalgie foto-placeholder
  fotoPlaceholder: {
    height: 160,
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#888',
  },

  // Hulpvraag
  hulpvraagCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    paddingLeft: 0,
  },
  hulpvraagAccent: {
    width: 6,
    backgroundColor: ORANJE,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginRight: 16,
  },
  helpButton: {
    backgroundColor: ORANJE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  helpButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: WIT,
  },

  // Poll
  pollKnoppen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  pollKnop: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  pollKnopText: {
    fontSize: 20,
    fontWeight: '700',
    color: WIT,
  },
});

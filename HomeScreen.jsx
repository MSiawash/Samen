import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { annuleerAlarmVoorContact } from './notificaties';

const SCHERM_BREEDTE = Dimensions.get('window').width;
const ALARM_KAART_BREEDTE = SCHERM_BREEDTE * 0.85;
const ALARM_KAART_MARGIN = (SCHERM_BREEDTE - ALARM_KAART_BREEDTE) / 2;

// --- Fallback hulpvragen (als Firestore niet beschikbaar is) ---
const FALLBACK_HULPVRAGEN = [
  {
    id: '1',
    naam: 'Ans (Dochter)',
    foto: 'https://i.pravatar.cc/120?img=32',
    categorie: 'Boodschappen',
    tekst: 'Paracetamol en fruit halen',
  },
  {
    id: '2',
    naam: 'Buurman Piet',
    foto: 'https://i.pravatar.cc/120?img=60',
    categorie: 'Klusje',
    tekst: 'Televisie doet het niet',
  },
  {
    id: '3',
    naam: 'Marie (Zus)',
    foto: 'https://i.pravatar.cc/120?img=9',
    categorie: 'Vervoer',
    tekst: 'Naar de huisarts gebracht worden',
  },
];

// --- Dummy data voor de Dagelijkse Mix ---
const dagelijkseMix = [
  {
    id: '1',
    type: 'weer',
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

// --- Hulp-samenvatting kaart ---
function HulpSamenvattingKaart({ onNavigeer, hulpvragen }) {
  if (!hulpvragen || hulpvragen.length === 0) return null;

  const eersteNaam = hulpvragen[0]?.naam?.split(' (')[0] || 'Iemand';
  const aantal = hulpvragen.length;
  const fotos = hulpvragen.slice(0, 3).map((v) => v.foto).filter(Boolean);

  return (
    <TouchableOpacity
      style={styles.hulpSamenvatting}
      activeOpacity={0.7}
      onPress={onNavigeer}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Bekijk het hulp-prikbord"
    >
      {/* Overlappende profielfoto's */}
      <View style={styles.hulpFotoStapel}>
        {fotos.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={[
              styles.hulpFoto,
              i > 0 && styles.hulpFotoOverlap,
              { zIndex: fotos.length - i },
            ]}
          />
        ))}
      </View>

      {/* Samenvatting tekst + pijl */}
      <View style={styles.hulpTekstBlok}>
        <Text style={styles.hulpTekst}>
          <Text style={{ fontWeight: '700' }}>{eersteNaam}</Text>
          {aantal > 1 && (
            <>
              {' '}en{' '}
              <Text style={{ fontWeight: '700' }}>{aantal - 1} {aantal - 1 === 1 ? 'ander' : 'anderen'}</Text>
            </>
          )}
          {' '}uit uw netwerk {aantal === 1 ? 'kan' : 'kunnen'} wat hulp gebruiken.
        </Text>
        <View style={styles.hulpPijl}>
          <Text style={styles.hulpPijlTekst}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
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

// --- Dummy data: alarm-contacten (status rood, niet ingecheckt na 12:00) ---
const initieleAlarmContacten = [
  {
    id: 'a1',
    naam: 'Marie (Zus)',
    foto: 'https://i.pravatar.cc/100?img=9',
    telefoon: '+31655667788',
    noodnummer: '+31644332211',
    naam_noodcontact: 'Dochter Anja',
    laatsteCheckIn: 'Gisteren om 20:00',
  },
  {
    id: 'a2',
    naam: 'Kees (Buurman)',
    foto: 'https://i.pravatar.cc/100?img=68',
    telefoon: '+31677889900',
    noodnummer: '+31600112233',
    naam_noodcontact: 'Vrouw Bep',
    laatsteCheckIn: 'Gisteren om 18:30',
  },
];

// --- Alarm kaart component ---
function AlarmKaart({ contact, onDemp }) {
  const korteNaam = contact.naam.split(' (')[0];

  function handleBel(nummer) {
    onDemp(contact.id);
    Linking.openURL(`tel:${nummer}`);
  }

  return (
    <View style={styles.alarmKaartWrapper}>
      <View style={styles.alarmKaart}>
        {/* Header met icoon */}
        <View style={styles.alarmHeader}>
          <Text style={styles.alarmIcoon}>🚨</Text>
          <Text style={styles.alarmTitel}>
            ALARM: {korteNaam} is nog niet bereikt!
          </Text>
        </View>

        {/* Profiel + info */}
        <View style={styles.alarmProfiel}>
          <Image
            source={{ uri: contact.foto }}
            style={styles.alarmFoto}
            accessible
            accessibilityLabel={`Foto van ${contact.naam}`}
          />
          <View style={styles.alarmInfo}>
            <Text style={styles.alarmNaam}>{contact.naam}</Text>
            <Text style={styles.alarmCheckIn}>
              Laatste check-in: {contact.laatsteCheckIn}
            </Text>
          </View>
        </View>

        {/* Bel knoppen */}
        <TouchableOpacity
          style={styles.alarmBelKnop}
          activeOpacity={0.7}
          onPress={() => handleBel(contact.telefoon)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Bel ${korteNaam}`}
        >
          <Text style={styles.alarmBelTekst}>📞 Bel {korteNaam}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.alarmNoodKnop}
          activeOpacity={0.7}
          onPress={() => handleBel(contact.noodnummer)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Bel noodcontact ${contact.naam_noodcontact}`}
        >
          <Text style={styles.alarmNoodTekst}>
            🚨 Bel Noodcontact ({contact.naam_noodcontact})
          </Text>
        </TouchableOpacity>

        {/* Demp alarm knop */}
        <TouchableOpacity
          style={styles.dempKnop}
          activeOpacity={0.7}
          onPress={() => onDemp(contact.id)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Alarm dempen voor ${korteNaam}`}
        >
          <Text style={styles.dempKnopTekst}>🔕 Alarm dempen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function renderKaart(item) {
  switch (item.type) {
    case 'weer':
      return <WeerKaart key={item.id} />;
    case 'poll':
      return <PollKaart key={item.id} />;
    default:
      return null;
  }
}

// --- Mood opslaan naar Firestore ---
async function slaanMoodOp(emoji) {
  try {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, 'profiles', user.uid), { huidige_mood: emoji });
      console.log('Mood opgeslagen:', emoji);
    }
  } catch (err) {
    console.error('Mood opslaan mislukt:', err);
  }
}

// --- Hoofdscherm ---
export default function HomeScreen({ onNavigeerHulp }) {
  const [moodGedeeld, setMoodGedeeld] = useState(false);
  const [alarmContacten, setAlarmContacten] = useState(initieleAlarmContacten);
  const [profiel, setProfiel] = useState(null);
  const [hulpvragen, setHulpvragen] = useState([]);
  const [isLaden, setIsLaden] = useState(true);

  // Haal profiel + hulpvragen uit Firestore
  useEffect(() => {
    async function laadData() {
      const user = auth.currentUser;
      if (!user) {
        setHulpvragen(FALLBACK_HULPVRAGEN);
        setIsLaden(false);
        return;
      }

      try {
        // Profiel ophalen
        const profielSnap = await getDoc(doc(db, 'profiles', user.uid));
        if (profielSnap.exists()) {
          setProfiel({ id: profielSnap.id, ...profielSnap.data() });
        }

        // Hulpvragen ophalen (alle hulpvragen, niet alleen van deze user)
        const hulpSnap = await getDocs(collection(db, 'hulpvragen'));
        const vragen = hulpSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHulpvragen(vragen.length > 0 ? vragen : FALLBACK_HULPVRAGEN);
      } catch (err) {
        console.warn('Data laden mislukt, fallback gebruikt:', err);
        setHulpvragen(FALLBACK_HULPVRAGEN);
      } finally {
        setIsLaden(false);
      }
    }

    const timeout = setTimeout(() => {
      setHulpvragen((prev) => prev.length > 0 ? prev : FALLBACK_HULPVRAGEN);
      setIsLaden(false);
    }, 4000);

    laadData().then(() => clearTimeout(timeout));
    console.log('Gebruiker actief - check-in voltooid in Samen');
    return () => clearTimeout(timeout);
  }, []);

  function dempAlarm(contactId) {
    annuleerAlarmVoorContact(contactId);
    setAlarmContacten((prev) => prev.filter((c) => c.id !== contactId));
  }

  function kiesMood(emoji) {
    setMoodGedeeld(true);
    slaanMoodOp(emoji);
  }

  const begroeting = getBegroeting();
  const profielNaam = profiel?.voornaam || 'daar';
  const profielFoto = profiel?.foto || 'https://i.pravatar.cc/100?img=12';

  if (isLaden) {
    return (
      <View style={styles.laadScherm}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.laadTekst}>Even geduld...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scherm}
      contentContainerStyle={styles.schermContent}
    >
      {/* ===== HEADER MET PROFIEL ===== */}
      <View style={styles.profielHeader}>
        <Image
          source={{ uri: profielFoto }}
          style={styles.profielFoto}
          accessible
          accessibilityLabel="Profielfoto"
        />
        <View style={styles.profielTekst}>
          <Text style={styles.begroeting}>{begroeting},</Text>
          <Text style={styles.profielNaam}>{profielNaam}!</Text>
        </View>
      </View>

      {/* ===== CHECK-IN & MOOD ===== */}
      <View style={styles.moodBlok}>
        {moodGedeeld ? (
          <Text style={styles.bedanktTekst}>
            Bedankt voor het delen! Geniet van uw dag.
          </Text>
        ) : (
          <>
            <Text style={styles.moodTitel}>Hoe voelt u zich vandaag?</Text>
            <View style={styles.moodRij}>
              <TouchableOpacity
                style={styles.moodKnop}
                activeOpacity={0.7}
                onPress={() => kiesMood('☀️')}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Ik voel me goed"
              >
                <Text style={styles.moodEmoji}>☀️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moodKnop}
                activeOpacity={0.7}
                onPress={() => kiesMood('⛅')}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Ik voel me gemiddeld"
              >
                <Text style={styles.moodEmoji}>⛅</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moodKnop}
                activeOpacity={0.7}
                onPress={() => kiesMood('🌧️')}
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

      {/* ===== HULP-SAMENVATTING ===== */}
      <HulpSamenvattingKaart onNavigeer={onNavigeerHulp} hulpvragen={hulpvragen} />

      {/* ===== ALARM SECTIE ===== */}
      {alarmContacten.length > 0 && (
        <View style={styles.alarmSectie}>
          <Text style={styles.alarmSectieTitel}>⚠️ Aandacht vereist</Text>
          <FlatList
            horizontal
            data={alarmContacten}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AlarmKaart contact={item} onDemp={dempAlarm} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={ALARM_KAART_BREEDTE + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.alarmLijst}
          />
          {alarmContacten.length > 1 && (
            <View style={styles.paginatieBolletjes}>
              {alarmContacten.map((_, i) => (
                <View
                  key={i}
                  style={[styles.bolletje, i === 0 && styles.bolletjeActief]}
                />
              ))}
            </View>
          )}
        </View>
      )}

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
const ROOD = '#FF3B30';
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
  laadScherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laadTekst: {
    fontSize: 18,
    color: '#888',
    marginTop: 12,
  },

  // Profiel header
  profielHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profielFoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: TEAL,
  },
  profielTekst: {
    flex: 1,
    marginLeft: 14,
  },
  begroeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#888',
  },
  profielNaam: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  // Mood blok
  moodBlok: {
    backgroundColor: '#E8F5F2',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  moodTitel: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 14,
  },

  // Alarm sectie
  alarmSectie: {
    marginBottom: 24,
    marginHorizontal: -20,
  },
  alarmSectieTitel: {
    fontSize: 22,
    fontWeight: '700',
    color: ROOD,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  alarmLijst: {
    paddingHorizontal: 12,
  },
  alarmKaartWrapper: {
    width: ALARM_KAART_BREEDTE,
    marginHorizontal: 8,
    paddingVertical: 8,
  },
  alarmKaart: {
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: ROOD,
    padding: 20,
    transform: [{ rotate: '-2deg' }],
    shadowColor: ROOD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  alarmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  alarmIcoon: {
    fontSize: 28,
    marginRight: 8,
  },
  alarmTitel: {
    fontSize: 18,
    fontWeight: '800',
    color: ROOD,
    flex: 1,
  },
  alarmProfiel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmFoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: ROOD,
    marginRight: 12,
  },
  alarmInfo: {
    flex: 1,
  },
  alarmNaam: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  alarmCheckIn: {
    fontSize: 15,
    color: '#888',
    marginTop: 2,
  },
  alarmBelKnop: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  alarmBelTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },
  alarmNoodKnop: {
    backgroundColor: ROOD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  alarmNoodTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },
  dempKnop: {
    backgroundColor: WIT,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  dempKnopTekst: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666',
  },
  paginatieBolletjes: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  bolletje: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  bolletjeActief: {
    backgroundColor: ROOD,
    width: 10,
    height: 10,
    borderRadius: 5,
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
    backgroundColor: WIT,
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

  // Hulp-samenvatting kaart
  hulpSamenvatting: {
    backgroundColor: '#E8F5F2',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...schaduw,
  },
  hulpFotoStapel: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  hulpFoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: WIT,
  },
  hulpFotoOverlap: {
    marginLeft: -20,
  },
  hulpTekstBlok: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hulpTekst: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    color: '#333',
    marginRight: 14,
  },
  hulpPijl: {
    backgroundColor: TEAL,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hulpPijlTekst: {
    fontSize: 24,
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

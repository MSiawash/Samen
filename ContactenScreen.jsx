import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
  Share,
  StyleSheet,
  Platform,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import Slider from '@react-native-community/slider';

// --- Kleuren ---
const TEAL = '#2A9D8F';
const ROOD_ZACHT = '#E76F51';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

// --- Afstanden voor zoekfunctie ---
const afstanden = [0, 1, 3, 5, 10, 20, 31, 40, 50, 'Max'];

// --- Fallback dummy data (als Firebase niet beschikbaar is) ---
const FALLBACK_CONTACTEN = [
  {
    id: '1',
    naam: 'Ans (Dochter)',
    foto: 'https://i.pravatar.cc/100?img=5',
    telefoon: '+31612345678',
    noodnummer: '+31698765432',
    naam_noodcontact: 'Huisarts De Groot',
    mood: '☀️',
    ingecheckt: true,
    laatsteCheckIn: 'Vandaag om 08:30',
    deelMood: true,
    deelCheckIn: true,
    categorie: 'Familie & Naasten',
  },
  {
    id: '2',
    naam: 'Buurman Piet',
    foto: 'https://i.pravatar.cc/100?img=14',
    telefoon: '+31611223344',
    noodnummer: '+31699887766',
    naam_noodcontact: 'Zoon Mark',
    mood: '⛅',
    ingecheckt: true,
    laatsteCheckIn: 'Vandaag om 09:15',
    deelMood: true,
    deelCheckIn: false,
    categorie: 'Vrienden & Buren',
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

// --- Contact Card ---
function ContactCard({ contact, onToggle }) {
  const korteNaam = contact.naam.split(' (')[0];

  return (
    <View style={[styles.card, !contact.ingecheckt && styles.cardWaarschuwing]}>
      {/* Foto + Naam + mood */}
      <View style={styles.contactHeader}>
        <Image
          source={{ uri: contact.foto }}
          style={styles.contactFoto}
          accessible
          accessibilityLabel={`Foto van ${contact.naam}`}
        />
        <Text style={styles.contactNaam}>{contact.naam}</Text>
        <Text style={styles.contactMood}>{contact.mood || '⚪'}</Text>
      </View>

      {/* Status */}
      <View style={styles.statusRij}>
        {contact.ingecheckt ? (
          <Text style={styles.statusOk}>✅ Veilig ingecheckt</Text>
        ) : (
          <Text style={styles.statusWaarschuwing}>⚠️ Nog niet ingecheckt</Text>
        )}
        <Text style={styles.checkInTijd}>{contact.laatsteCheckIn}</Text>
      </View>

      {/* Noodknoppen bij niet ingecheckt */}
      {!contact.ingecheckt && (
        <View style={styles.noodBlok}>
          <TouchableOpacity
            style={styles.belKnop}
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`tel:${contact.telefoon}`)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Bel ${korteNaam}`}
          >
            <Text style={styles.belKnopTekst}>📞 Bel {korteNaam}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.noodKnop}
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`tel:${contact.noodnummer}`)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Bel noodcontact ${contact.naam_noodcontact}`}
          >
            <Text style={styles.noodKnopTekst}>
              🚨 Bel Noodcontact ({contact.naam_noodcontact})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Praktijkdetails (bijv. huisarts) */}
      {contact.details && (
        <View style={styles.detailsBlok}>
          <Text style={styles.detailsTekst}>
            {contact.details.adres}, {contact.details.postcode} {contact.details.plaats}
          </Text>
          {contact.details.email && (
            <Text style={styles.detailsTekst}>
              E: {contact.details.email}
            </Text>
          )}
          {contact.details.artsen && (
            <Text style={styles.detailsTekstKlein}>{contact.details.artsen}</Text>
          )}
        </View>
      )}

      {/* Deel-instellingen (niet voor zakelijke contacten) */}
      {!contact.details && (
        <View style={styles.deelBlok}>
          <View style={styles.switchRij}>
            <View style={styles.switchTekstBlok}>
              <Text style={styles.switchTitel}>Mijn stemming delen</Text>
              <Text style={styles.switchSubtitel}>
                De ander ziet de zon, wolk of regen die u vandaag heeft gekozen.
              </Text>
            </View>
            <Switch
              value={contact.deelMood}
              onValueChange={(val) => onToggle(contact.id, 'deelMood', val)}
              trackColor={{ false: '#D0D0D0', true: '#A8DCD5' }}
              thumbColor={contact.deelMood ? TEAL : '#F4F4F4'}
              accessible
              accessibilityLabel={`Stemming delen met ${contact.naam}`}
            />
          </View>
          <View style={styles.switchRij}>
            <View style={styles.switchTekstBlok}>
              <Text style={styles.switchTitel}>Mijn veiligheid delen</Text>
              <Text style={styles.switchSubtitel}>
                De ander krijgt een seintje als u zich 's ochtends niet op tijd heeft gemeld.
              </Text>
            </View>
            <Switch
              value={contact.deelCheckIn}
              onValueChange={(val) => onToggle(contact.id, 'deelCheckIn', val)}
              trackColor={{ false: '#D0D0D0', true: '#A8DCD5' }}
              thumbColor={contact.deelCheckIn ? TEAL : '#F4F4F4'}
              accessible
              accessibilityLabel={`Veiligheid delen met ${contact.naam}`}
            />
          </View>
        </View>
      )}
    </View>
  );
}

// --- Hoofdscherm ---
export default function ContactenScreen() {
  const [actieveTab, setActieveTab] = useState('mijn');
  const [contacten, setContacten] = useState([]);
  const [isLaden, setIsLaden] = useState(true);
  const [actieveCategorie, setActieveCategorie] = useState('Alle');

  // Real-time contacten ophalen via onSnapshot
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setContacten(FALLBACK_CONTACTEN);
      setIsLaden(false);
      return;
    }

    let geladen = false;
    const timeout = setTimeout(() => {
      if (!geladen) {
        geladen = true;
        setContacten(FALLBACK_CONTACTEN);
        setIsLaden(false);
      }
    }, 4000);

    const contactenRef = collection(db, 'profiles', user.uid, 'contacten');
    const unsubscribe = onSnapshot(
      contactenRef,
      (snapshot) => {
        if (geladen) return;
        geladen = true;
        clearTimeout(timeout);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setContacten(data.length > 0 ? data : FALLBACK_CONTACTEN);
        setIsLaden(false);
      },
      (err) => {
        if (geladen) return;
        geladen = true;
        clearTimeout(timeout);
        console.warn('Contacten laden mislukt:', err);
        setContacten(FALLBACK_CONTACTEN);
        setIsLaden(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const categorieen = ['Alle', 'Familie & Naasten', 'Vrienden & Buren', 'Activiteiten', 'Zorg & Hulp'];

  const gefilterdeContacten = actieveCategorie === 'Alle'
    ? contacten
    : contacten.filter((c) => c.categorie === actieveCategorie);

  // Zoeken op nummer
  const [zoekNummer, setZoekNummer] = useState('');
  const [isZoeken, setIsZoeken] = useState(false);

  // Radar zoeken
  const [postcode, setPostcode] = useState('');
  const [afstandIndex, setAfstandIndex] = useState(3);

  function toggleDeelInstelling(contactId, veld, waarde) {
    setContacten((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, [veld]: waarde } : c))
    );
  }

  async function nodigUit() {
    try {
      await Share.share({
        message:
          'Hoi! Ik gebruik de Samen-app om in contact te blijven met de buurt. Doe je ook mee? Download hem hier: [URL_KOMT_LATER]',
      });
    } catch (e) {
      console.warn('Delen mislukt:', e);
    }
  }

  function zoekOpNummer() {
    if (!zoekNummer.trim() || isZoeken) return;
    setIsZoeken(true);
    // Simuleer zoekactie
    setTimeout(() => {
      Alert.alert(
        'Niet gevonden',
        'Dit nummer is nog niet bekend bij DAG. Vraag uw contactpersoon om eerst de gratis app te downloaden.'
      );
      setIsZoeken(false);
    }, 800);
  }

  return (
    <View style={styles.scherm}>
      {/* Tab knoppen */}
      <View style={styles.toggleBar}>
        <TouchableOpacity
          style={[styles.toggleKnop, actieveTab === 'mijn' && styles.toggleActief]}
          activeOpacity={0.7}
          onPress={() => setActieveTab('mijn')}
          accessible
          accessibilityRole="tab"
          accessibilityState={{ selected: actieveTab === 'mijn' }}
        >
          <Text style={[styles.toggleTekst, actieveTab === 'mijn' && styles.toggleTekstActief]}>
            Mijn contacten
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleKnop, actieveTab === 'zoeken' && styles.toggleActief]}
          activeOpacity={0.7}
          onPress={() => setActieveTab('zoeken')}
          accessible
          accessibilityRole="tab"
          accessibilityState={{ selected: actieveTab === 'zoeken' }}
        >
          <Text style={[styles.toggleTekst, actieveTab === 'zoeken' && styles.toggleTekstActief]}>
            Contacten zoeken
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========== TAB: MIJN CONTACTEN ========== */}
      {actieveTab === 'mijn' && isLaden && (
        <View style={styles.laadScherm}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.laadTekst}>Contacten laden...</Text>
        </View>
      )}
      {actieveTab === 'mijn' && !isLaden && (
        <>
          <FlatList
            data={gefilterdeContacten}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ContactCard contact={item} onToggle={toggleDeelInstelling} />
            )}
            contentContainerStyle={styles.lijstContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                <TouchableOpacity
                  style={styles.uitnodigKnop}
                  activeOpacity={0.7}
                  onPress={nodigUit}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Nodig een vriend of buur uit"
                >
                  <Text style={styles.uitnodigIcoon}>💌</Text>
                  <Text style={styles.uitnodigTekst}>Nodig een vriend of buur uit</Text>
                </TouchableOpacity>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterScroll}
                  contentContainerStyle={styles.filterContent}
                >
                  {categorieen.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.filterPill, actieveCategorie === cat && styles.filterPillActief]}
                      activeOpacity={0.7}
                      onPress={() => setActieveCategorie(cat)}
                      accessible
                      accessibilityRole="button"
                      accessibilityState={{ selected: actieveCategorie === cat }}
                      accessibilityLabel={`Filter: ${cat}`}
                    >
                      <Text style={[styles.filterPillTekst, actieveCategorie === cat && styles.filterPillTekstActief]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            }
            ListEmptyComponent={
              <View style={styles.leegBlok}>
                <Text style={styles.leegTekst}>Geen contacten in deze categorie.</Text>
              </View>
            }
          />
        </>
      )}

      {/* ========== TAB: CONTACTEN ZOEKEN ========== */}
      {actieveTab === 'zoeken' && (
        <FlatList
          data={[]}
          keyExtractor={() => 'empty'}
          renderItem={null}
          ListHeaderComponent={
            <View>
              {/* Zoek op telefoonnummer */}
              <View style={styles.card}>
                <Text style={styles.sectieKaartTitel}>Zoek op telefoonnummer</Text>
                <Text style={styles.zoekUitleg}>
                  Voeg een contact toe door hun mobiele nummer in te vullen.
                </Text>

                <TextInput
                  style={styles.invoerVeld}
                  placeholder="06 1234 5678"
                  placeholderTextColor="#B0B0B0"
                  keyboardType="phone-pad"
                  value={zoekNummer}
                  onChangeText={setZoekNummer}
                  editable={!isZoeken}
                  accessible
                  accessibilityLabel="Telefoonnummer invoeren"
                />

                <TouchableOpacity
                  style={[
                    styles.zoekKnop,
                    (!zoekNummer.trim() || isZoeken) && styles.knopDisabled,
                  ]}
                  activeOpacity={0.7}
                  onPress={zoekOpNummer}
                  disabled={!zoekNummer.trim() || isZoeken}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Zoek op nummer"
                >
                  <Text style={styles.zoekKnopTekst}>
                    {isZoeken ? 'Zoeken...' : 'Zoek op nummer'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Scheidingslijn */}
              <View style={styles.scheiding}>
                <View style={styles.scheidingsLijn} />
                <Text style={styles.scheidingsTekst}>OF</Text>
                <View style={styles.scheidingsLijn} />
              </View>

              {/* Zoek in de buurt */}
              <View style={styles.card}>
                <Text style={styles.sectieKaartTitel}>Zoek in de buurt</Text>

                <Text style={styles.veldLabel}>Uw postcode</Text>
                <TextInput
                  style={styles.invoerVeld}
                  placeholder="bijv. 3011 WR"
                  placeholderTextColor="#B0B0B0"
                  value={postcode}
                  onChangeText={setPostcode}
                  autoCapitalize="characters"
                  accessible
                  accessibilityLabel="Postcode invoeren"
                />

                {/* Schuifbalk */}
                <Text style={styles.afstandLabel}>
                  Zoek binnen:{' '}
                  <Text style={styles.afstandWaarde}>
                    {afstanden[afstandIndex]}
                    {afstandIndex < 9 ? ' km' : ''}
                  </Text>
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={9}
                  step={1}
                  value={afstandIndex}
                  onValueChange={(val) => setAfstandIndex(val)}
                  minimumTrackTintColor={TEAL}
                  maximumTrackTintColor="#D0D0D0"
                  thumbTintColor={TEAL}
                  accessible
                  accessibilityLabel={`Afstand: ${afstanden[afstandIndex]} ${afstandIndex < 9 ? 'km' : ''}`}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelTekst}>0 km</Text>
                  <Text style={styles.sliderLabelTekst}>Max</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.zoekKnop,
                    !postcode.trim() && styles.knopDisabled,
                  ]}
                  activeOpacity={0.7}
                  disabled={!postcode.trim()}
                  onPress={() => {
                    console.log('Zoek contacten in buurt:', {
                      postcode: postcode.trim(),
                      afstand: afstanden[afstandIndex],
                    });
                  }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Zoek in de buurt"
                >
                  <Text style={styles.zoekKnopTekst}>Zoek in de buurt</Text>
                </TouchableOpacity>
              </View>

              {/* Disclaimer */}
              <View style={styles.disclaimerBlok}>
                <Text style={styles.disclaimerTekst}>
                  U ziet hier alleen personen die hun profiel op Openbaar hebben gezet.
                </Text>
              </View>

              <View style={{ height: 20 }} />
            </View>
          }
          contentContainerStyle={styles.lijstContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
  },
  laadScherm: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laadTekst: {
    fontSize: 18,
    color: '#888',
    marginTop: 12,
  },

  // Toggle bar
  toggleBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#E8E8E2',
    borderRadius: 14,
    padding: 4,
  },
  toggleKnop: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleActief: {
    backgroundColor: TEAL,
    ...schaduw,
  },
  toggleTekst: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  toggleTekstActief: {
    color: WIT,
    fontWeight: '700',
  },

  // Filter pills
  uitnodigKnop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5F2',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: TEAL,
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  uitnodigIcoon: {
    fontSize: 24,
    marginRight: 10,
  },
  uitnodigTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: TEAL,
  },

  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    backgroundColor: '#EAEAEA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterPillActief: {
    backgroundColor: TEAL,
  },
  filterPillTekst: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  filterPillTekstActief: {
    color: WIT,
    fontWeight: '700',
  },
  leegBlok: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  leegTekst: {
    fontSize: 18,
    color: '#999',
    fontStyle: 'italic',
  },

  // Lijst
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
    ...schaduw,
  },

  // Card waarschuwing
  cardWaarschuwing: {
    borderWidth: 2,
    borderColor: ROOD_ZACHT,
  },

  // Contact header
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactFoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: TEAL,
  },
  contactNaam: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  contactMood: {
    fontSize: 24,
  },

  // Noodknoppen
  noodBlok: {
    marginBottom: 14,
    gap: 10,
  },
  belKnop: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  belKnopTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },
  noodKnop: {
    backgroundColor: ROOD_ZACHT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  noodKnopTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },

  // Status
  statusRij: {
    marginBottom: 14,
  },
  statusOk: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 2,
  },
  statusWaarschuwing: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E76F51',
    marginBottom: 2,
  },
  checkInTijd: {
    fontSize: 15,
    color: '#888',
  },

  // Praktijkdetails
  detailsBlok: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: TEAL,
  },
  detailsTekst: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  detailsTekstKlein: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Deel-instellingen
  deelBlok: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  switchRij: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 4,
  },
  switchTekstBlok: {
    flex: 1,
    marginRight: 16,
  },
  switchTitel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  switchSubtitel: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
    lineHeight: 18,
  },

  // Sectie titels
  sectieKaartTitel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  zoekUitleg: {
    fontSize: 17,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },

  // Invoervelden
  veldLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  invoerVeld: {
    backgroundColor: ACHTERGROND,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 16,
  },

  // Zoek knop
  zoekKnop: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  zoekKnopTekst: {
    fontSize: 20,
    fontWeight: '700',
    color: WIT,
  },
  knopDisabled: {
    opacity: 0.45,
  },

  // Scheiding
  scheiding: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    marginBottom: 20,
  },
  scheidingsLijn: {
    flex: 1,
    height: 1,
    backgroundColor: '#D0D0D0',
  },
  scheidingsTekst: {
    marginHorizontal: 16,
    fontSize: 16,
    color: '#999',
    fontWeight: '700',
  },

  // Slider
  afstandLabel: {
    fontSize: 18,
    color: '#444',
    marginBottom: 4,
  },
  afstandWaarde: {
    fontWeight: '700',
    color: TEAL,
    fontSize: 20,
  },
  slider: {
    width: '100%',
    height: 48,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sliderLabelTekst: {
    fontSize: 14,
    color: '#999',
  },

  // Disclaimer
  disclaimerBlok: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  disclaimerTekst: {
    fontSize: 16,
    color: '#7A6C00',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});

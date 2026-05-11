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
  Modal,
} from 'react-native';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import Slider from '@react-native-community/slider';

// --- Kleuren ---
const TEAL = '#2A9D8F';
const ROOD_ZACHT = '#E76F51';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

// Categorie-filter pas tonen vanaf dit aantal contacten
const TOON_FILTER_VANAF = 5;

// Categorieën (zonder "Alle"; die is alleen een filter-keuze)
const CATEGORIEEN = ['Familie & Naasten', 'Vrienden & Buren', 'Activiteiten', 'Zorg & Hulp'];

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

// --- Demo verzonden verzoeken (later via Firebase) ---
const FALLBACK_VERZOEKEN = [
  { id: 'v1', naam: 'Jorinde Linn', status: 'Wacht op reactie' },
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
function ContactCard({ contact, onToggle, onBewerken }) {
  const korteNaam = contact.naam.split(' (')[0];
  const heeftTelefoon = !!contact.telefoon;

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
        <View style={styles.contactNaamBlok}>
          <Text style={styles.contactNaam}>{contact.naam}</Text>
          {contact.categorie && (
            <Text style={styles.contactCategorie}>{contact.categorie}</Text>
          )}
        </View>
        <Text style={styles.contactMood}>{contact.mood || '⚪'}</Text>
      </View>

      {/* Status */}
      <View style={styles.statusRij}>
        {contact.ingecheckt ? (
          <Text style={styles.statusOk}>✅ Veilig ingecheckt</Text>
        ) : (
          <Text style={styles.statusWaarschuwing}>⚠️ Nog niet ingecheckt</Text>
        )}
        {contact.laatsteCheckIn && (
          <Text style={styles.checkInTijd}>{contact.laatsteCheckIn}</Text>
        )}
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
          {contact.noodnummer && (
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
          )}
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

      {/* Actieknoppen onderaan */}
      <View style={styles.actieRij}>
        {heeftTelefoon && contact.ingecheckt && (
          <TouchableOpacity
            style={[styles.actieKnop, styles.actieKnopPrimair]}
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`tel:${contact.telefoon}`)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Bel ${korteNaam}`}
          >
            <Text style={styles.actieKnopTekstPrimair}>📞 Bellen</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actieKnop, styles.actieKnopSecundair]}
          activeOpacity={0.7}
          onPress={() => onBewerken?.(contact)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Bewerk ${korteNaam}`}
        >
          <Text style={styles.actieKnopTekstSecundair}>✏️ Bewerken</Text>
        </TouchableOpacity>
      </View>

      {/* Deel-instellingen (niet voor zakelijke contacten) */}
      {!contact.details && (
        <View style={styles.deelBlok}>
          <View style={styles.switchRij}>
            <View style={styles.switchTekstBlok}>
              <Text style={styles.switchTitel}>Hoe ik mij voel delen</Text>
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
              <Text style={styles.switchTitel}>Alarmeren</Text>
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

// --- Modal: Contact toevoegen ---
function VoegContactToeModal({
  zichtbaar,
  stap,
  setStap,
  onSluit,
  onUitnodig,
  zoekNummer,
  setZoekNummer,
  isZoeken,
  zoekOpNummer,
  postcode,
  setPostcode,
  afstandIndex,
  setAfstandIndex,
}) {
  return (
    <Modal
      visible={zichtbaar}
      animationType="slide"
      transparent
      onRequestClose={onSluit}
    >
      <View style={styles.modalAchtergrond}>
        <View style={styles.modalVel}>
          {/* Kop met sluitknop */}
          <View style={styles.modalKop}>
            <Text style={styles.modalTitel}>
              {stap === 'keuze' && 'Contact toevoegen'}
              {stap === 'nummer' && 'Zoek op telefoonnummer'}
              {stap === 'buurt' && 'Zoek in de buurt'}
            </Text>
            <TouchableOpacity
              onPress={onSluit}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Sluiten"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.modalSluitTekst}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalInhoud}>
            {stap === 'keuze' && (
              <>
                <TouchableOpacity
                  style={styles.keuzeKnop}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSluit();
                    onUitnodig();
                  }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Nodig een vriend of buur uit via bericht"
                >
                  <Text style={styles.keuzeIcoon}>💌</Text>
                  <View style={styles.keuzeTekstBlok}>
                    <Text style={styles.keuzeTitel}>Uitnodigen via bericht</Text>
                    <Text style={styles.keuzeUitleg}>
                      Stuur een vriend of buur een berichtje om mee te doen.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.keuzeKnop}
                  activeOpacity={0.7}
                  onPress={() => setStap('nummer')}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Zoek op telefoonnummer"
                >
                  <Text style={styles.keuzeIcoon}>📞</Text>
                  <View style={styles.keuzeTekstBlok}>
                    <Text style={styles.keuzeTitel}>Zoek op telefoonnummer</Text>
                    <Text style={styles.keuzeUitleg}>
                      Vul het mobiele nummer in van iemand die de app al gebruikt.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.keuzeKnop}
                  activeOpacity={0.7}
                  onPress={() => setStap('buurt')}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Zoek in de buurt"
                >
                  <Text style={styles.keuzeIcoon}>📍</Text>
                  <View style={styles.keuzeTekstBlok}>
                    <Text style={styles.keuzeTitel}>Zoek in de buurt</Text>
                    <Text style={styles.keuzeUitleg}>
                      Vind mensen bij u in de buurt die hun profiel openbaar hebben.
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {stap === 'nummer' && (
              <>
                <Text style={styles.modalUitleg}>
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
                <TouchableOpacity
                  style={styles.terugKnop}
                  activeOpacity={0.7}
                  onPress={() => setStap('keuze')}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Terug naar keuzes"
                >
                  <Text style={styles.terugKnopTekst}>← Terug</Text>
                </TouchableOpacity>
              </>
            )}

            {stap === 'buurt' && (
              <>
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

                <View style={styles.disclaimerBlok}>
                  <Text style={styles.disclaimerTekst}>
                    U ziet hier alleen personen die hun profiel op Openbaar hebben gezet.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.terugKnop}
                  activeOpacity={0.7}
                  onPress={() => setStap('keuze')}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Terug naar keuzes"
                >
                  <Text style={styles.terugKnopTekst}>← Terug</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// --- Verzonden verzoeken (inklapbaar onderaan) ---
function VerzondenVerzoeken({ verzoeken, isOpen, setIsOpen }) {
  if (!verzoeken || verzoeken.length === 0) return null;

  return (
    <View style={styles.verzoekenBlok}>
      <TouchableOpacity
        style={styles.verzoekenKop}
        activeOpacity={0.7}
        onPress={() => setIsOpen(!isOpen)}
        accessible
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${verzoeken.length} uitnodiging verstuurd, ${isOpen ? 'inklappen' : 'uitklappen'}`}
      >
        <Text style={styles.verzoekenKopTekst}>
          ✉️ {verzoeken.length} uitnodiging verstuurd
        </Text>
        <Text style={styles.verzoekenPijl}>{isOpen ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.verzoekenLijst}>
          {verzoeken.map((v) => (
            <View key={v.id} style={styles.verzoekRij}>
              <Text style={styles.verzoekNaam}>{v.naam}</Text>
              <Text style={styles.verzoekStatus}>{v.status}...</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// --- Modal: Contact bewerken ---
function BewerkContactModal({ contact, onSluit, onOpslaan, onVerwijder }) {
  const [naam, setNaam] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [categorie, setCategorie] = useState(CATEGORIEEN[0]);
  const [naamNoodcontact, setNaamNoodcontact] = useState('');
  const [noodnummer, setNoodnummer] = useState('');
  const [bezig, setBezig] = useState(false);

  // Velden vullen wanneer een contact wordt geopend
  useEffect(() => {
    if (contact) {
      setNaam(contact.naam || '');
      setTelefoon(contact.telefoon || '');
      setCategorie(contact.categorie || CATEGORIEEN[0]);
      setNaamNoodcontact(contact.naam_noodcontact || '');
      setNoodnummer(contact.noodnummer || '');
      setBezig(false);
    }
  }, [contact]);

  if (!contact) return null;

  async function opslaan() {
    if (!naam.trim() || bezig) return;
    setBezig(true);
    try {
      await onOpslaan(contact.id, {
        naam: naam.trim(),
        telefoon: telefoon.trim(),
        categorie,
        naam_noodcontact: naamNoodcontact.trim(),
        noodnummer: noodnummer.trim(),
      });
      onSluit();
    } catch (e) {
      Alert.alert('Opslaan mislukt', 'Probeer het later opnieuw.');
    } finally {
      setBezig(false);
    }
  }

  function bevestigVerwijder() {
    Alert.alert(
      'Contact verwijderen',
      `Weet u zeker dat u ${contact.naam} wilt verwijderen?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            setBezig(true);
            try {
              await onVerwijder(contact.id);
              onSluit();
            } catch (e) {
              Alert.alert('Verwijderen mislukt', 'Probeer het later opnieuw.');
            } finally {
              setBezig(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={!!contact}
      animationType="slide"
      transparent
      onRequestClose={onSluit}
    >
      <View style={styles.modalAchtergrond}>
        <View style={styles.modalVel}>
          <View style={styles.modalKop}>
            <Text style={styles.modalTitel}>Contact bewerken</Text>
            <TouchableOpacity
              onPress={onSluit}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Sluiten"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.modalSluitTekst}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalInhoud}>
            <Text style={styles.veldLabel}>Naam</Text>
            <TextInput
              style={styles.invoerVeld}
              value={naam}
              onChangeText={setNaam}
              placeholder="Voor- en achternaam"
              placeholderTextColor="#B0B0B0"
              accessible
              accessibilityLabel="Naam"
            />

            <Text style={styles.veldLabel}>Telefoonnummer</Text>
            <TextInput
              style={styles.invoerVeld}
              value={telefoon}
              onChangeText={setTelefoon}
              placeholder="06 1234 5678"
              placeholderTextColor="#B0B0B0"
              keyboardType="phone-pad"
              accessible
              accessibilityLabel="Telefoonnummer"
            />

            <Text style={styles.veldLabel}>Categorie</Text>
            <View style={styles.categorieKeuze}>
              {CATEGORIEEN.map((cat) => {
                const actief = categorie === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categorieOptie, actief && styles.categorieOptieActief]}
                    activeOpacity={0.7}
                    onPress={() => setCategorie(cat)}
                    accessible
                    accessibilityRole="button"
                    accessibilityState={{ selected: actief }}
                    accessibilityLabel={`Categorie ${cat}`}
                  >
                    <Text style={[styles.categorieOptieTekst, actief && styles.categorieOptieTekstActief]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.veldLabel}>Naam noodcontact (optioneel)</Text>
            <TextInput
              style={styles.invoerVeld}
              value={naamNoodcontact}
              onChangeText={setNaamNoodcontact}
              placeholder="Bijv. Huisarts De Groot"
              placeholderTextColor="#B0B0B0"
              accessible
              accessibilityLabel="Naam noodcontact"
            />

            <Text style={styles.veldLabel}>Noodnummer (optioneel)</Text>
            <TextInput
              style={styles.invoerVeld}
              value={noodnummer}
              onChangeText={setNoodnummer}
              placeholder="06 1234 5678"
              placeholderTextColor="#B0B0B0"
              keyboardType="phone-pad"
              accessible
              accessibilityLabel="Noodnummer"
            />

            <TouchableOpacity
              style={[styles.zoekKnop, (!naam.trim() || bezig) && styles.knopDisabled]}
              activeOpacity={0.7}
              onPress={opslaan}
              disabled={!naam.trim() || bezig}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Opslaan"
            >
              <Text style={styles.zoekKnopTekst}>
                {bezig ? 'Opslaan...' : 'Opslaan'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.verwijderKnop}
              activeOpacity={0.7}
              onPress={bevestigVerwijder}
              disabled={bezig}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Contact verwijderen"
            >
              <Text style={styles.verwijderKnopTekst}>🗑️ Contact verwijderen</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// --- Hoofdscherm ---
export default function ContactenScreen() {
  const [contacten, setContacten] = useState([]);
  const [isLaden, setIsLaden] = useState(true);
  const [actieveCategorie, setActieveCategorie] = useState('Alle');

  // Modal-state
  const [modalZichtbaar, setModalZichtbaar] = useState(false);
  const [modalStap, setModalStap] = useState('keuze');

  // Verzonden verzoeken
  const [verzoeken, setVerzoeken] = useState([]);
  const [verzoekenOpen, setVerzoekenOpen] = useState(false);

  // Bewerken
  const [bewerkContact, setBewerkContact] = useState(null);

  // Zoek-state
  const [zoekNummer, setZoekNummer] = useState('');
  const [isZoeken, setIsZoeken] = useState(false);
  const [postcode, setPostcode] = useState('');
  const [afstandIndex, setAfstandIndex] = useState(3);

  // Real-time contacten ophalen via onSnapshot
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setContacten(FALLBACK_CONTACTEN);
      setVerzoeken(FALLBACK_VERZOEKEN);
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
    const unsubscribeContacten = onSnapshot(
      contactenRef,
      (snapshot) => {
        if (!geladen) {
          geladen = true;
          clearTimeout(timeout);
          setIsLaden(false);
        }
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setContacten(data.length > 0 ? data : FALLBACK_CONTACTEN);
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

    // Verzonden verzoeken: openstaande uitnodigingen die de gebruiker heeft verstuurd
    let verzoekenQuery;
    try {
      verzoekenQuery = query(
        collection(db, 'profiles', user.uid, 'verzoeken'),
        orderBy('aangemaakt', 'desc')
      );
    } catch {
      verzoekenQuery = collection(db, 'profiles', user.uid, 'verzoeken');
    }
    const unsubscribeVerzoeken = onSnapshot(
      verzoekenQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((v) => !v.status || v.status === 'wacht' || v.status === 'Wacht op reactie');
        setVerzoeken(data);
      },
      (err) => {
        console.warn('Verzoeken laden mislukt:', err);
        // Bij fout (bijv. collectie bestaat nog niet) tonen we niets in plaats van dummy data
        setVerzoeken([]);
      }
    );

    return () => {
      clearTimeout(timeout);
      unsubscribeContacten();
      unsubscribeVerzoeken();
    };
  }, []);

  const categorieen = ['Alle', ...CATEGORIEEN];
  const toonCategorieFilter = contacten.length >= TOON_FILTER_VANAF;

  const gefilterdeContacten = (!toonCategorieFilter || actieveCategorie === 'Alle')
    ? contacten
    : contacten.filter((c) => c.categorie === actieveCategorie);

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
    setTimeout(() => {
      Alert.alert(
        'Niet gevonden',
        'Dit nummer is nog niet bekend bij DAG. Vraag uw contactpersoon om eerst de gratis app te downloaden.'
      );
      setIsZoeken(false);
    }, 800);
  }

  function openVoegToe() {
    setModalStap('keuze');
    setModalZichtbaar(true);
  }

  function sluitVoegToe() {
    setModalZichtbaar(false);
    setModalStap('keuze');
  }

  function onBewerken(contact) {
    setBewerkContact(contact);
  }

  async function slaContactOp(contactId, velden) {
    // Lokale update direct toepassen (zodat de UI snel reageert, ook bij fallback)
    setContacten((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, ...velden } : c))
    );

    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, 'profiles', user.uid, 'contacten', contactId), velden);
  }

  async function verwijderContact(contactId) {
    setContacten((prev) => prev.filter((c) => c.id !== contactId));

    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, 'profiles', user.uid, 'contacten', contactId));
  }

  return (
    <View style={styles.scherm}>
      {/* Kop met titel + plusknop */}
      <View style={styles.kopBalk}>
        <Text style={styles.kopTitel}>Mijn contacten</Text>
        <TouchableOpacity
          style={styles.plusKnop}
          activeOpacity={0.7}
          onPress={openVoegToe}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Contact toevoegen"
        >
          <Text style={styles.plusKnopTekst}>+ Toevoegen</Text>
        </TouchableOpacity>
      </View>

      {/* Lijst of laadscherm */}
      {isLaden ? (
        <View style={styles.laadScherm}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.laadTekst}>Contacten laden...</Text>
        </View>
      ) : (
        <FlatList
          data={gefilterdeContacten}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactCard
              contact={item}
              onToggle={toggleDeelInstelling}
              onBewerken={onBewerken}
            />
          )}
          contentContainerStyle={styles.lijstContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            toonCategorieFilter ? (
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
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.leegBlok}>
              <Text style={styles.leegTekst}>
                {toonCategorieFilter
                  ? 'Geen contacten in deze categorie.'
                  : 'Nog geen contacten. Tik op + Toevoegen om iemand uit te nodigen.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            <VerzondenVerzoeken
              verzoeken={verzoeken}
              isOpen={verzoekenOpen}
              setIsOpen={setVerzoekenOpen}
            />
          }
        />
      )}

      {/* Modal: Contact toevoegen */}
      <VoegContactToeModal
        zichtbaar={modalZichtbaar}
        stap={modalStap}
        setStap={setModalStap}
        onSluit={sluitVoegToe}
        onUitnodig={nodigUit}
        zoekNummer={zoekNummer}
        setZoekNummer={setZoekNummer}
        isZoeken={isZoeken}
        zoekOpNummer={zoekOpNummer}
        postcode={postcode}
        setPostcode={setPostcode}
        afstandIndex={afstandIndex}
        setAfstandIndex={setAfstandIndex}
      />

      {/* Modal: Contact bewerken */}
      <BewerkContactModal
        contact={bewerkContact}
        onSluit={() => setBewerkContact(null)}
        onOpslaan={slaContactOp}
        onVerwijder={verwijderContact}
      />
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

  // Kopbalk
  kopBalk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  kopTitel: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  plusKnop: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    ...schaduw,
  },
  plusKnopTekst: {
    fontSize: 17,
    fontWeight: '700',
    color: WIT,
  },

  // Filter pills
  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterContent: {
    paddingVertical: 4,
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
    paddingHorizontal: 20,
  },
  leegTekst: {
    fontSize: 18,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
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
    marginBottom: 16,
    ...schaduw,
  },
  cardWaarschuwing: {
    borderWidth: 2,
    borderColor: ROOD_ZACHT,
  },

  // Contact header
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactFoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: TEAL,
  },
  contactNaamBlok: {
    flex: 1,
  },
  contactNaam: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  contactCategorie: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  contactMood: {
    fontSize: 24,
    marginLeft: 8,
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

  // Actieknoppen
  actieRij: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  actieKnop: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actieKnopPrimair: {
    backgroundColor: TEAL,
  },
  actieKnopSecundair: {
    backgroundColor: '#F0F0EC',
    borderWidth: 1,
    borderColor: '#D8D8D2',
  },
  actieKnopTekstPrimair: {
    fontSize: 17,
    fontWeight: '700',
    color: WIT,
  },
  actieKnopTekstSecundair: {
    fontSize: 17,
    fontWeight: '600',
    color: '#444',
  },

  // Deel-instellingen
  deelBlok: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 12,
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

  // Verzonden verzoeken
  verzoekenBlok: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#EFEFE9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  verzoekenKop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  verzoekenKopTekst: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  verzoekenPijl: {
    fontSize: 18,
    color: '#666',
  },
  verzoekenLijst: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#DDDCD2',
  },
  verzoekRij: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  verzoekNaam: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  verzoekStatus: {
    fontSize: 15,
    color: '#888',
    fontStyle: 'italic',
  },

  // Modal
  modalAchtergrond: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalVel: {
    backgroundColor: ACHTERGROND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalKop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  modalSluitTekst: {
    fontSize: 24,
    color: '#666',
    paddingHorizontal: 8,
  },
  modalInhoud: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalUitleg: {
    fontSize: 17,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },

  // Keuze-knoppen
  keuzeKnop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WIT,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...schaduw,
  },
  keuzeIcoon: {
    fontSize: 32,
    marginRight: 14,
  },
  keuzeTekstBlok: {
    flex: 1,
  },
  keuzeTitel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  keuzeUitleg: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Terug-knop binnen modal
  terugKnop: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 16,
  },
  terugKnopTekst: {
    fontSize: 16,
    fontWeight: '600',
    color: TEAL,
  },

  // Invoervelden
  veldLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  invoerVeld: {
    backgroundColor: WIT,
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

  // Categorie-keuze (in bewerken-modal)
  categorieKeuze: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categorieOptie: {
    backgroundColor: '#EAEAEA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categorieOptieActief: {
    backgroundColor: TEAL,
  },
  categorieOptieTekst: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  categorieOptieTekstActief: {
    color: WIT,
    fontWeight: '700',
  },

  // Verwijder-knop (in bewerken-modal)
  verwijderKnop: {
    marginTop: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ROOD_ZACHT,
    backgroundColor: '#FFF6F3',
  },
  verwijderKnopTekst: {
    fontSize: 16,
    fontWeight: '700',
    color: ROOD_ZACHT,
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
    marginTop: 16,
  },
  disclaimerTekst: {
    fontSize: 15,
    color: '#7A6C00',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});

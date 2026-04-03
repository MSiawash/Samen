import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

const TEAL = '#2A9D8F';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

// Fallback als Firestore niet beschikbaar is
const FALLBACK_HULPVRAGEN = [
  {
    id: '1',
    naam: 'Ans (Dochter)',
    foto: 'https://i.pravatar.cc/120?img=32',
    categorie: 'Boodschappen',
    icoon: '🛒',
    icoonKleur: '#E8F5E9',
    tekst: 'Ik heb een flinke griep, zou iemand vanmiddag een paracetamol en wat fruit voor me kunnen halen?',
    tijd: 'Zojuist',
  },
  {
    id: '2',
    naam: 'Buurman Piet',
    foto: 'https://i.pravatar.cc/120?img=60',
    categorie: 'Klusje',
    icoon: '🛠️',
    icoonKleur: '#FFF3E0',
    tekst: 'Mijn televisie geeft geen beeld meer. Is er iemand handig met de afstandsbediening?',
    tijd: 'Gisteren',
  },
];

const categorieen = [
  { key: 'boodschappen', icoon: '🛒', label: 'Boodschappen', kleur: '#E8F5E9' },
  { key: 'klusje', icoon: '🛠️', label: 'Klusje in huis', kleur: '#FFF3E0' },
  { key: 'vervoer', icoon: '🚗', label: 'Vervoer', kleur: '#E3F2FD' },
  { key: 'gezelschap', icoon: '☕', label: 'Gezelschap', kleur: '#F3E5F5' },
  { key: 'anders', icoon: '❓', label: 'Anders...', kleur: '#F5F5F5' },
];

// --- Modal: Nieuw verzoekje plaatsen ---
function NieuwVerzoekModal({ zichtbaar, onSluiten, onPlaatsen }) {
  const [stap, setStap] = useState(1);
  const [gekozenCategorie, setGekozenCategorie] = useState(null);
  const [verzoekTekst, setVerzoekTekst] = useState('');
  const [opnemen, setOpnemen] = useState(false);

  function reset() {
    setStap(1);
    setGekozenCategorie(null);
    setVerzoekTekst('');
    setOpnemen(false);
  }

  function handleSluiten() {
    reset();
    onSluiten();
  }

  function handlePlaatsen() {
    const cat = categorieen.find((c) => c.key === gekozenCategorie);
    onPlaatsen({
      categorie: cat?.label || 'Anders',
      icoon: cat?.icoon || '❓',
      icoonKleur: cat?.kleur || '#F5F5F5',
      tekst: verzoekTekst,
    });
    reset();
  }

  function kiesCategorie(key) {
    setGekozenCategorie(key);
    setStap(2);
  }

  return (
    <Modal
      visible={zichtbaar}
      animationType="slide"
      transparent
      onRequestClose={handleSluiten}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={modalStyles.header}>
              <Text style={modalStyles.titel}>
                {stap === 1 ? 'Kies een onderwerp' : 'Uw verzoekje'}
              </Text>
              <TouchableOpacity
                onPress={handleSluiten}
                activeOpacity={0.7}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Sluiten"
              >
                <Text style={modalStyles.sluitKnop}>✕</Text>
              </TouchableOpacity>
            </View>

            {stap === 1 ? (
              <>
                <Text style={modalStyles.uitleg}>
                  Waar heeft u hulp bij nodig?
                </Text>
                <View style={modalStyles.categorieGrid}>
                  {categorieen.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        modalStyles.categorieTegel,
                        { backgroundColor: cat.kleur },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => kiesCategorie(cat.key)}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={cat.label}
                    >
                      <Text style={modalStyles.categorieTegelIcoon}>
                        {cat.icoon}
                      </Text>
                      <Text style={modalStyles.categorieTegelLabel}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                {/* Gekozen categorie badge */}
                {gekozenCategorie && (
                  <TouchableOpacity
                    style={modalStyles.gekozenBadge}
                    activeOpacity={0.7}
                    onPress={() => setStap(1)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Wijzig categorie"
                  >
                    <Text style={modalStyles.gekozenBadgeIcoon}>
                      {categorieen.find((c) => c.key === gekozenCategorie)?.icoon}
                    </Text>
                    <Text style={modalStyles.gekozenBadgeLabel}>
                      {categorieen.find((c) => c.key === gekozenCategorie)?.label}
                    </Text>
                    <Text style={modalStyles.gekozenBadgeWijzig}> ✎</Text>
                  </TouchableOpacity>
                )}

                <Text style={modalStyles.uitleg}>
                  Beschrijf kort wat u nodig heeft.
                </Text>

                {/* Tekstveld met microfoon */}
                <View style={modalStyles.invoerContainer}>
                  <TextInput
                    style={modalStyles.tekstVeld}
                    placeholder="Typ hier uw verzoekje (of neem een stembericht op)..."
                    placeholderTextColor="#B0B0B0"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    value={verzoekTekst}
                    onChangeText={setVerzoekTekst}
                    accessible
                    accessibilityLabel="Uw hulpverzoek"
                  />
                  <TouchableOpacity
                    style={[
                      modalStyles.microfoonKnop,
                      opnemen && modalStyles.microfoonActief,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setOpnemen(!opnemen);
                      console.log(opnemen ? 'Opname gestopt' : 'Opname gestart');
                    }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={
                      opnemen ? 'Stop stembericht' : 'Neem stembericht op'
                    }
                  >
                    <Text style={modalStyles.microfoonIcoon}>
                      {opnemen ? '⏹️' : '🎙️'}
                    </Text>
                    <Text
                      style={[
                        modalStyles.microfoonLabel,
                        opnemen && modalStyles.microfoonLabelActief,
                      ]}
                    >
                      {opnemen ? 'Stoppen' : 'Inspreken'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Plaats knop */}
                <TouchableOpacity
                  style={[
                    modalStyles.plaatsKnop,
                    !verzoekTekst.trim() && modalStyles.plaatsKnopUit,
                  ]}
                  activeOpacity={0.7}
                  disabled={!verzoekTekst.trim()}
                  onPress={handlePlaatsen}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Plaats op het prikbord"
                >
                  <Text style={modalStyles.plaatsKnopTekst}>
                    Plaats op het prikbord
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Terug knop in stap 2 */}
            {stap === 2 && (
              <TouchableOpacity
                style={modalStyles.terugKnop}
                activeOpacity={0.7}
                onPress={() => setStap(1)}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Terug naar categoriekeuze"
              >
                <Text style={modalStyles.terugTekst}>← Terug</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function HulpKaart({ item }) {
  const [geholpen, setGeholpen] = useState(false);

  return (
    <View style={styles.kaart}>
      {/* Kop: foto + naam + tijd */}
      <View style={styles.kaartKop}>
        <Image
          source={{ uri: item.foto }}
          style={styles.profielFoto}
          accessible
          accessibilityLabel={`Foto van ${item.naam}`}
        />
        <View style={styles.kaartKopTekst}>
          <Text style={styles.naam}>{item.naam}</Text>
          <Text style={styles.tijd}>{item.tijd}</Text>
        </View>
      </View>

      {/* Categorie badge */}
      <View style={[styles.categorieBadge, { backgroundColor: item.icoonKleur }]}>
        <Text style={styles.categorieIcoon}>{item.icoon}</Text>
        <Text style={styles.categorieTekst}>{item.categorie}</Text>
      </View>

      {/* Hulpvraag tekst */}
      <Text style={styles.vraagTekst}>{item.tekst}</Text>

      {/* Actieknop */}
      <TouchableOpacity
        style={[styles.helpKnop, geholpen && styles.helpKnopActief]}
        activeOpacity={0.7}
        onPress={() => setGeholpen(!geholpen)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={geholpen ? `U helpt ${item.naam}` : `Help ${item.naam}`}
      >
        <Text style={[styles.helpKnopTekst, geholpen && styles.helpKnopTekstActief]}>
          {geholpen ? '✓ U helpt!' : '❤️ Ik kan helpen!'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HulpScreen() {
  const [toonModal, setToonModal] = useState(false);
  const [hulpvragen, setHulpvragen] = useState([]);
  const [isLaden, setIsLaden] = useState(true);

  useEffect(() => {
    let unsubscribe;
    let geladen = false;

    // Timeout: val terug op demo-data als Firestore niet antwoordt
    const timeout = setTimeout(() => {
      if (!geladen) {
        geladen = true;
        setHulpvragen(FALLBACK_HULPVRAGEN);
        setIsLaden(false);
      }
    }, 4000);

    try {
      const q = query(collection(db, 'hulpvragen'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (geladen) return;
        geladen = true;
        clearTimeout(timeout);
        if (snapshot.empty) {
          setHulpvragen(FALLBACK_HULPVRAGEN);
        } else {
          const data = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              naam: d.naam || 'Onbekend',
              foto: d.foto || 'https://i.pravatar.cc/120?img=1',
              categorie: d.categorie || 'Anders',
              icoon: d.icoon || '❓',
              icoonKleur: d.icoonKleur || '#F5F5F5',
              tekst: d.tekst || '',
              tijd: d.tijd || 'Zojuist',
            };
          });
          setHulpvragen(data);
        }
        setIsLaden(false);
      }, (error) => {
        if (geladen) return;
        geladen = true;
        clearTimeout(timeout);
        console.warn('Firestore hulpvragen fout:', error);
        setHulpvragen(FALLBACK_HULPVRAGEN);
        setIsLaden(false);
      });
    } catch (e) {
      geladen = true;
      clearTimeout(timeout);
      console.warn('Firebase niet beschikbaar, fallback data:', e);
      setHulpvragen(FALLBACK_HULPVRAGEN);
      setIsLaden(false);
    }
    return () => {
      clearTimeout(timeout);
      unsubscribe && unsubscribe();
    };
  }, []);

  async function handlePlaatsen({ categorie, icoon, icoonKleur, tekst }) {
    const user = auth.currentUser;
    const nieuw = {
      naam: user?.displayName || 'U',
      foto: user?.photoURL || 'https://i.pravatar.cc/120?img=12',
      categorie,
      icoon,
      icoonKleur,
      tekst,
      tijd: 'Zojuist',
      userId: user?.uid || 'demo',
      aangemaakt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'hulpvragen'), nieuw);
    } catch (e) {
      console.warn('Kon hulpvraag niet opslaan:', e);
      // Voeg lokaal toe als fallback
      setHulpvragen((prev) => [{ ...nieuw, id: `nieuw-${Date.now()}` }, ...prev]);
    }
    setToonModal(false);
  }

  if (isLaden) {
    return (
      <View style={styles.laadScherm}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.laadTekst}>Hulpvragen laden...</Text>
      </View>
    );
  }

  return (
    <View style={styles.scherm}>
      <NieuwVerzoekModal
        zichtbaar={toonModal}
        onSluiten={() => setToonModal(false)}
        onPlaatsen={handlePlaatsen}
      />
      <FlatList
        data={hulpvragen}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HulpKaart item={item} />}
        contentContainerStyle={styles.lijst}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Plaats verzoekje knop */}
            <TouchableOpacity
              style={styles.plaatsKnop}
              activeOpacity={0.7}
              onPress={() => setToonModal(true)}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Plaats een verzoekje"
            >
              <Text style={styles.plaatsKnopIcoon}>+</Text>
              <Text style={styles.plaatsKnopTekst}>Plaats een verzoekje</Text>
            </TouchableOpacity>

            {/* Sectie titel */}
            <Text style={styles.sectieTitel}>Hulpvragen uit uw netwerk</Text>
          </>
        }
      />
    </View>
  );
}

const schaduw = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});

const styles = StyleSheet.create({
  scherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
  },
  laadScherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laadTekst: {
    marginTop: 12,
    fontSize: 17,
    color: '#999',
  },
  lijst: {
    padding: 20,
    paddingBottom: 32,
  },

  // Plaats verzoekje
  plaatsKnop: {
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    ...schaduw,
  },
  plaatsKnopIcoon: {
    fontSize: 28,
    fontWeight: '700',
    color: WIT,
    marginRight: 10,
  },
  plaatsKnopTekst: {
    fontSize: 20,
    fontWeight: '700',
    color: WIT,
  },

  // Sectie titel
  sectieTitel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },

  // Hulpkaart
  kaart: {
    backgroundColor: WIT,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...schaduw,
  },
  kaartKop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  profielFoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: TEAL,
  },
  kaartKopTekst: {
    marginLeft: 14,
    flex: 1,
  },
  naam: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tijd: {
    fontSize: 15,
    color: '#999',
    marginTop: 2,
  },

  // Categorie badge
  categorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  categorieIcoon: {
    fontSize: 18,
    marginRight: 6,
  },
  categorieTekst: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },

  // Vraag tekst
  vraagTekst: {
    fontSize: 18,
    lineHeight: 26,
    color: '#333',
    marginBottom: 16,
  },

  // Help knop
  helpKnop: {
    borderWidth: 2,
    borderColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  helpKnopActief: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  helpKnopTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: TEAL,
  },
  helpKnopTekstActief: {
    color: WIT,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: WIT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sluitKnop: {
    fontSize: 24,
    color: '#999',
    padding: 8,
  },
  uitleg: {
    fontSize: 18,
    lineHeight: 26,
    color: '#555',
    marginBottom: 20,
  },

  // Categorie grid
  categorieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  categorieTegel: {
    width: '47%',
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
    ...schaduw,
  },
  categorieTegelIcoon: {
    fontSize: 36,
    marginBottom: 8,
  },
  categorieTegelLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },

  // Gekozen badge
  gekozenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  gekozenBadgeIcoon: {
    fontSize: 20,
    marginRight: 6,
  },
  gekozenBadgeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  gekozenBadgeWijzig: {
    fontSize: 14,
    color: TEAL,
    marginLeft: 4,
  },

  // Tekstveld + microfoon
  invoerContainer: {
    marginBottom: 20,
  },
  tekstVeld: {
    backgroundColor: ACHTERGROND,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 19,
    color: '#1A1A1A',
    minHeight: 130,
    lineHeight: 28,
  },
  microfoonKnop: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  microfoonActief: {
    backgroundColor: '#FFEBEE',
  },
  microfoonIcoon: {
    fontSize: 22,
    marginRight: 8,
  },
  microfoonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  microfoonLabelActief: {
    color: '#D32F2F',
  },

  // Plaats knop
  plaatsKnop: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 8,
    ...schaduw,
  },
  plaatsKnopUit: {
    opacity: 0.5,
  },
  plaatsKnopTekst: {
    fontSize: 20,
    fontWeight: '700',
    color: WIT,
  },

  // Terug
  terugKnop: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  terugTekst: {
    fontSize: 17,
    fontWeight: '600',
    color: TEAL,
  },
});

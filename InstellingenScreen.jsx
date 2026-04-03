import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

const TEAL = '#2A9D8F';
const ROOD = '#E76F51';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

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

export default function InstellingenScreen({ onTerug, onUitloggen }) {
  // Profiel
  const [naam, setNaam] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [foto, setFoto] = useState('https://i.pravatar.cc/200?img=12');
  const [isLaden, setIsLaden] = useState(true);

  // Telefoonnummer wijzigen
  const [isNummerModalZichtbaar, setIsNummerModalZichtbaar] = useState(false);
  const [nieuwNummer, setNieuwNummer] = useState('');

  // Zichtbaarheid
  const [zichtbaar, setZichtbaar] = useState(true);

  // Noodcontact
  const [noodNaam, setNoodNaam] = useState('');
  const [noodTelefoon, setNoodTelefoon] = useState('');
  const [noodRelatie, setNoodRelatie] = useState('');
  const [noodOpgeslagen, setNoodOpgeslagen] = useState(false);

  // Meldingen
  const [geluidBerichten, setGeluidBerichten] = useState(true);
  const [geluidAlarm, setGeluidAlarm] = useState(true);

  // Haal actuele instellingen op uit Firestore
  useEffect(() => {
    async function laadInstellingen() {
      try {
        const user = auth.currentUser;
        if (!user) {
          setIsLaden(false);
          return;
        }
        const profielRef = doc(db, 'profiles', user.uid);
        const snap = await getDoc(profielRef);
        if (snap.exists()) {
          const data = snap.data();
          setNaam(data.voornaam || '');
          setTelefoon(data.telefoon || user.phoneNumber || '');
          if (data.foto) setFoto(data.foto);
          setZichtbaar(data.zichtbaar !== false);
          setGeluidBerichten(data.geluidBerichten !== false);
          setGeluidAlarm(data.geluidAlarm !== false);
          const cp = data.contactpersoon || data.noodcontact;
          if (cp) {
            setNoodNaam(cp.naam || '');
            setNoodTelefoon(cp.telefoon || '');
            setNoodRelatie(cp.relatie || '');
          }
        }
      } catch (e) {
        console.warn('Instellingen laden mislukt:', e);
      } finally {
        setIsLaden(false);
      }
    }

    const timeout = setTimeout(() => setIsLaden(false), 4000);
    laadInstellingen().then(() => clearTimeout(timeout));
    return () => clearTimeout(timeout);
  }, []);

  // Sla een enkel veld direct op in Firestore
  async function slaInstellingOp(veld, waarde) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const profielRef = doc(db, 'profiles', user.uid);
      await updateDoc(profielRef, { [veld]: waarde });
    } catch (e) {
      console.warn('Instelling opslaan mislukt:', e);
    }
  }

  // Toggle handlers die lokaal + Firestore updaten
  function handleZichtbaar(val) {
    setZichtbaar(val);
    slaInstellingOp('zichtbaar', val);
  }

  function handleGeluidBerichten(val) {
    setGeluidBerichten(val);
    slaInstellingOp('geluidBerichten', val);
  }

  function handleGeluidAlarm(val) {
    setGeluidAlarm(val);
    slaInstellingOp('geluidAlarm', val);
  }

  // Noodcontact opslaan
  async function slaNoordcontactOp() {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const profielRef = doc(db, 'profiles', user.uid);
      await updateDoc(profielRef, {
        contactpersoon: {
          naam: noodNaam,
          telefoon: noodTelefoon,
          relatie: noodRelatie,
        },
      });
      setNoodOpgeslagen(true);
      setTimeout(() => setNoodOpgeslagen(false), 2500);
    } catch (e) {
      console.warn('Noodcontact opslaan mislukt:', e);
    }
  }

  if (isLaden) {
    return (
      <View style={styles.laadScherm}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.laadTekst}>Instellingen laden...</Text>
      </View>
    );
  }

  return (
    <View style={styles.scherm}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.titel}>Instellingen</Text>

        {/* ===== SECTIE 1: MIJN PROFIEL ===== */}
        <View style={styles.card}>
          <Text style={styles.sectieTitel}>Mijn Profiel</Text>

          {/* Profielfoto */}
          <View style={styles.fotoContainer}>
            <Image
              source={{ uri: foto }}
              style={styles.profielFoto}
              accessible
              accessibilityLabel="Profielfoto"
            />
            <TouchableOpacity
              style={styles.fotoWijzig}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Profielfoto wijzigen"
            >
              <Text style={styles.fotoWijzigIcoon}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* Naam */}
          <Text style={styles.veldLabel}>Naam</Text>
          <TextInput
            style={styles.invoerVeld}
            value={naam}
            onChangeText={setNaam}
            placeholder="Uw naam"
            placeholderTextColor="#B0B0B0"
            accessible
            accessibilityLabel="Naam wijzigen"
          />

          {/* Telefoon (alleen-lezen) */}
          <Text style={styles.veldLabel}>Telefoonnummer</Text>
          <View style={styles.alleenLezenVeld}>
            <Text style={styles.alleenLezenTekst}>{telefoon || '+31 6 ...'}</Text>
            <Text style={styles.alleenLezenHint}>Gekoppeld aan uw login</Text>
          </View>
          <TouchableOpacity
            style={styles.wijzigNummerKnop}
            activeOpacity={0.7}
            onPress={() => setIsNummerModalZichtbaar(true)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Telefoonnummer wijzigen"
          >
            <Text style={styles.wijzigNummerTekst}>Telefoonnummer wijzigen</Text>
          </TouchableOpacity>
        </View>

        {/* Modal: telefoonnummer wijzigen */}
        <Modal
          visible={isNummerModalZichtbaar}
          transparent
          animationType="fade"
          onRequestClose={() => setIsNummerModalZichtbaar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitel}>
                Nieuw telefoonnummer instellen
              </Text>
              <Text style={styles.modalUitleg}>
                Als u een nieuw telefoonnummer heeft, kunt u dat hier invoeren.
                U ontvangt een SMS met een code op uw nieuwe nummer om dit te
                bevestigen. Daarna logt u in met het nieuwe nummer.
              </Text>

              <Text style={styles.veldLabel}>Nieuw 06-nummer</Text>
              <TextInput
                style={styles.invoerVeld}
                value={nieuwNummer}
                onChangeText={setNieuwNummer}
                placeholder="06 1234 5678"
                placeholderTextColor="#B0B0B0"
                keyboardType="phone-pad"
                accessible
                accessibilityLabel="Nieuw telefoonnummer"
              />

              <TouchableOpacity
                style={[
                  styles.modalVerstuurKnop,
                  !nieuwNummer.trim() && styles.knopDisabled,
                ]}
                activeOpacity={0.7}
                disabled={!nieuwNummer.trim()}
                onPress={() => {
                  // TODO: SMS-verificatie logica
                  console.log('Verstuur SMS-code naar:', nieuwNummer);
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Verstuur SMS-code"
              >
                <Text style={styles.modalVerstuurTekst}>
                  Verstuur SMS-code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalAnnuleerKnop}
                activeOpacity={0.7}
                onPress={() => {
                  setNieuwNummer('');
                  setIsNummerModalZichtbaar(false);
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Annuleren"
              >
                <Text style={styles.modalAnnuleerTekst}>Annuleren</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ===== SECTIE 2: ZICHTBAARHEID ===== */}
        <View style={styles.card}>
          <Text style={styles.sectieTitel}>Mijn Zichtbaarheid</Text>

          <View style={styles.switchRij}>
            <View style={styles.switchTekstBlok}>
              <Text style={styles.switchTitel}>Zichtbaar in de buurt</Text>
              <Text style={styles.switchSubtitel}>
                Anderen kunnen u vinden op de radar om contact te leggen.
              </Text>
            </View>
            <Switch
              value={zichtbaar}
              onValueChange={handleZichtbaar}
              trackColor={{ false: '#D0D0D0', true: '#A8DCD5' }}
              thumbColor={zichtbaar ? TEAL : '#F4F4F4'}
              accessible
              accessibilityLabel="Zichtbaar in de buurt"
            />
          </View>
        </View>

        {/* ===== SECTIE 3: NOODCONTACT ===== */}
        <View style={styles.card}>
          <Text style={styles.sectieTitel}>Contactpersoon (in geval van nood)</Text>

          <Text style={styles.veldLabel}>Naam contactpersoon</Text>
          <TextInput
            style={styles.invoerVeld}
            value={noodNaam}
            onChangeText={setNoodNaam}
            placeholder="bijv. Ans"
            placeholderTextColor="#B0B0B0"
            accessible
            accessibilityLabel="Naam contactpersoon"
          />

          <Text style={styles.veldLabel}>Telefoonnummer contactpersoon</Text>
          <TextInput
            style={styles.invoerVeld}
            value={noodTelefoon}
            onChangeText={setNoodTelefoon}
            placeholder="06 1234 5678"
            placeholderTextColor="#B0B0B0"
            keyboardType="phone-pad"
            accessible
            accessibilityLabel="Telefoonnummer noodcontact"
          />

          <Text style={styles.veldLabel}>Relatie</Text>
          <TextInput
            style={styles.invoerVeld}
            value={noodRelatie}
            onChangeText={setNoodRelatie}
            placeholder="bijv. Dochter, Buurman"
            placeholderTextColor="#B0B0B0"
            accessible
            accessibilityLabel="Relatie met noodcontact"
          />

          <View style={styles.waarschuwingBlok}>
            <Text style={styles.waarschuwingTekst}>
              ⚠️ Dit nummer wordt alleen getoond aan uw vertrouwde contacten
              tijdens een rood alarm.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.opslaanKnop}
            activeOpacity={0.7}
            onPress={slaNoordcontactOp}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Noodcontact opslaan"
          >
            <Text style={styles.opslaanKnopTekst}>
              {noodOpgeslagen ? '✓ Opgeslagen!' : 'Opslaan'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===== SECTIE 4: MELDINGEN ===== */}
        <View style={styles.card}>
          <Text style={styles.sectieTitel}>Meldingen</Text>

          <View style={styles.switchRij}>
            <View style={styles.switchTekstBlok}>
              <Text style={styles.switchTitel}>
                Geluid bij nieuwe berichten & verhalen
              </Text>
              <Text style={styles.switchSubtitel}>
                U hoort een geluid bij elk nieuw bericht of verhaal.
              </Text>
            </View>
            <Switch
              value={geluidBerichten}
              onValueChange={handleGeluidBerichten}
              trackColor={{ false: '#D0D0D0', true: '#A8DCD5' }}
              thumbColor={geluidBerichten ? TEAL : '#F4F4F4'}
              accessible
              accessibilityLabel="Geluid bij berichten"
            />
          </View>

          <View style={styles.scheidingsLijn} />

          <View style={styles.switchRij}>
            <View style={styles.switchTekstBlok}>
              <Text style={styles.switchTitel}>
                Geluidsalarm bij rode veiligheidsmeldingen
              </Text>
              <Text style={styles.switchSubtitel}>
                Een luid alarm als een contactpersoon niet is ingecheckt.
              </Text>
            </View>
            <Switch
              value={geluidAlarm}
              onValueChange={handleGeluidAlarm}
              trackColor={{ false: '#D0D0D0', true: '#EDAFAF' }}
              thumbColor={geluidAlarm ? ROOD : '#F4F4F4'}
              accessible
              accessibilityLabel="Geluidsalarm bij rode meldingen"
            />
          </View>
        </View>

        {/* ===== OVER ===== */}
        <View style={styles.card}>
          <Text style={styles.sectieTitel}>Over Samen</Text>
          <Text style={styles.beschrijving}>
            Samen - omzien naar elkaar!{'\n'}
            Versie 1.0.0
          </Text>
        </View>

        {/* ===== UITLOGGEN ===== */}
        <TouchableOpacity
          style={styles.uitlogKnop}
          activeOpacity={0.7}
          onPress={onUitloggen}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Uitloggen"
        >
          <Text style={styles.uitlogTekst}>Uitloggen</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    backgroundColor: ACHTERGROND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laadTekst: {
    marginTop: 12,
    fontSize: 17,
    color: '#999',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  titel: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
  },

  // Card
  card: {
    backgroundColor: WIT,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...schaduw,
  },
  sectieTitel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },

  // Profielfoto
  fotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profielFoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: TEAL,
  },
  fotoWijzig: {
    position: 'absolute',
    bottom: 0,
    right: '33%',
    backgroundColor: WIT,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  fotoWijzigIcoon: {
    fontSize: 16,
  },

  // Velden
  veldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 4,
  },
  invoerVeld: {
    backgroundColor: ACHTERGROND,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  alleenLezenVeld: {
    backgroundColor: '#F0F0EA',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 8,
  },
  alleenLezenTekst: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  alleenLezenHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },

  // Wijzig nummer knop
  wijzigNummerKnop: {
    borderWidth: 2,
    borderColor: TEAL,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  wijzigNummerTekst: {
    fontSize: 17,
    fontWeight: '600',
    color: TEAL,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: WIT,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  modalUitleg: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginBottom: 20,
  },
  modalVerstuurKnop: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalVerstuurTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },
  modalAnnuleerKnop: {
    borderWidth: 2,
    borderColor: '#CCC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalAnnuleerTekst: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666',
  },
  knopDisabled: {
    opacity: 0.45,
  },

  // Switches
  switchRij: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
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
  scheidingsLijn: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 6,
  },

  // Waarschuwing
  waarschuwingBlok: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  waarschuwingTekst: {
    fontSize: 15,
    color: '#7A6C00',
    lineHeight: 22,
  },

  // Opslaan knop
  opslaanKnop: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  opslaanKnopTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },

  // Over
  beschrijving: {
    fontSize: 18,
    lineHeight: 26,
    color: '#555',
  },

  // Uitloggen
  uitlogKnop: {
    backgroundColor: ROOD,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    ...schaduw,
  },
  uitlogTekst: {
    fontSize: 20,
    fontWeight: '700',
    color: WIT,
  },
});

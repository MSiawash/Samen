import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import {
  PhoneAuthProvider,
  EmailAuthProvider,
  signInWithCredential,
  linkWithCredential,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import app, { auth, db } from './firebaseConfig';

const TEAL = '#2A9D8F';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';
const STAPPEN_TOTAAL = 5;

const schaduw = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});

// --- Voortgangsbalk ---
function Voortgang({ stap }) {
  return (
    <View style={styles.voortgangContainer}>
      <Text style={styles.voortgangTekst}>
        Stap {stap} van {STAPPEN_TOTAAL}
      </Text>
      <View style={styles.voortgangBalk}>
        {Array.from({ length: STAPPEN_TOTAAL }, (_, i) => (
          <View
            key={i}
            style={[
              styles.voortgangSegment,
              i < stap && styles.voortgangActief,
              i === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
              i === STAPPEN_TOTAAL - 1 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// --- Helper: NL nummer → internationaal formaat ---
function formatNaarInternationaal(nummer) {
  const schoon = nummer.replace(/[\s\-()]/g, '');
  if (schoon.startsWith('06')) return '+31' + schoon.slice(1);
  if (schoon.startsWith('316')) return '+' + schoon;
  if (schoon.startsWith('+31')) return schoon;
  if (schoon.startsWith('0031')) return '+31' + schoon.slice(4);
  return schoon.startsWith('+') ? schoon : '+' + schoon;
}

export default function OnboardingWizard({ onComplete }) {
  const [huidigeStap, setHuidigeStap] = useState(1);
  const recaptchaVerifier = useRef(null);

  // Stap 1 state
  const [telefoon, setTelefoon] = useState('');
  const [toonCode, setToonCode] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [isLaden, setIsLaden] = useState(false);

  // Stap 2 state
  const [voornaam, setVoornaam] = useState('');
  const [achternaam, setAchternaam] = useState('');
  const [heeftFoto, setHeeftFoto] = useState(false);

  // Stap 3 state (Reserve-sleutel)
  const [herstelEmail, setHerstelEmail] = useState('');
  const [herstelWachtwoord, setHerstelWachtwoord] = useState('');

  // Stap 4 state (Noodcontact)
  const [noodNaam, setNoodNaam] = useState('');
  const [noodTelefoon, setNoodTelefoon] = useState('');
  const [noodRelatie, setNoodRelatie] = useState('');

  // Stap 5 state
  const [postcode, setPostcode] = useState('');
  const [vindbaar, setVindbaar] = useState(true);

  function gaTerug() {
    if (toonCode && huidigeStap === 1) {
      setToonCode(false);
      setSmsCode('');
      return;
    }
    if (huidigeStap > 1) {
      setHuidigeStap(huidigeStap - 1);
    }
  }

  function renderStap() {
    switch (huidigeStap) {
      case 1:
        return renderStap1();
      case 2:
        return renderStap2();
      case 3:
        return renderStap3();
      case 4:
        return renderStap4();
      case 5:
        return renderStap5();
      default:
        return null;
    }
  }

  // --- STAP 1: Telefoonnummer + SMS code (Firebase Phone Auth) ---
  async function stuurSmsCode() {
    if (!telefoon.trim() || isLaden) return;
    setIsLaden(true);

    const internationaal = formatNaarInternationaal(telefoon.trim());

    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const vId = await phoneProvider.verifyPhoneNumber(
        internationaal,
        recaptchaVerifier.current
      );
      setVerificationId(vId);
      setToonCode(true);
      console.log('SMS verstuurd naar:', internationaal);
    } catch (err) {
      Alert.alert(
        'Er ging iets mis',
        'De SMS kon niet worden verstuurd. Controleer uw telefoonnummer en probeer het opnieuw.'
      );
      console.error('SMS versturen mislukt:', err);
    } finally {
      setIsLaden(false);
    }
  }

  async function bevestigCode() {
    if (smsCode.length < 6 || isLaden || !verificationId) return;
    setIsLaden(true);

    try {
      const credential = PhoneAuthProvider.credential(verificationId, smsCode);
      await signInWithCredential(auth, credential);
      console.log('Telefoonverificatie gelukt!');
      setHuidigeStap(2);
    } catch (err) {
      Alert.alert(
        'Code onjuist',
        'De ingevulde code is onjuist. Probeer het nog eens.'
      );
      console.error('Verificatie mislukt:', err);
    } finally {
      setIsLaden(false);
    }
  }

  function renderStap1() {
    if (!toonCode) {
      return (
        <>
          <Text style={styles.titel}>Wat is uw 06-nummer?</Text>
          <Text style={styles.uitleg}>
            Vul uw mobiele nummer in. We sturen u een eenmalige code per SMS om
            uw nummer te bevestigen.
          </Text>

          <Text style={styles.label}>Uw telefoonnummer</Text>
          <TextInput
            style={styles.invoerVeld}
            placeholder="06 1234 5678"
            placeholderTextColor="#B0B0B0"
            keyboardType="phone-pad"
            value={telefoon}
            onChangeText={setTelefoon}
            editable={!isLaden}
            accessible
            accessibilityLabel="Telefoonnummer invoeren"
          />

          <TouchableOpacity
            style={[
              styles.hoofdKnop,
              (!telefoon.trim() || isLaden) && styles.hoofdKnopUit,
            ]}
            activeOpacity={0.7}
            disabled={!telefoon.trim() || isLaden}
            onPress={stuurSmsCode}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Stuur SMS code"
          >
            {isLaden ? (
              <ActivityIndicator color={WIT} size="large" />
            ) : (
              <Text style={styles.hoofdKnopTekst}>Stuur SMS code</Text>
            )}
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <Text style={styles.titel}>Vul uw code in</Text>
        <Text style={styles.uitleg}>
          We hebben een SMS gestuurd naar{' '}
          <Text style={{ fontWeight: '700', color: '#1A1A1A' }}>{telefoon}</Text>.
          Vul hieronder de 6-cijferige code in.
        </Text>

        <Text style={styles.label}>Uw 6-cijferige code</Text>
        <TextInput
          style={styles.codeVeld}
          placeholder="000000"
          placeholderTextColor="#D0D0D0"
          keyboardType="number-pad"
          maxLength={6}
          value={smsCode}
          onChangeText={setSmsCode}
          editable={!isLaden}
          accessible
          accessibilityLabel="SMS code invoeren"
        />

        <TouchableOpacity
          style={[
            styles.hoofdKnop,
            (smsCode.length < 6 || isLaden) && styles.hoofdKnopUit,
          ]}
          activeOpacity={0.7}
          disabled={smsCode.length < 6 || isLaden}
          onPress={bevestigCode}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Bevestig"
        >
          {isLaden ? (
            <ActivityIndicator color={WIT} size="large" />
          ) : (
            <Text style={styles.hoofdKnopTekst}>Bevestig</Text>
          )}
        </TouchableOpacity>
      </>
    );
  }

  // --- STAP 2: Profiel ---
  function renderStap2() {
    return (
      <>
        <Text style={styles.titel}>Welkom! Hoe mogen we u noemen?</Text>

        {/* Profielfoto placeholder */}
        <View style={styles.fotoContainer}>
          <TouchableOpacity
            style={[styles.fotoCircle, heeftFoto && styles.fotoCircleGevuld]}
            activeOpacity={0.7}
            onPress={() => setHeeftFoto(true)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Voeg profielfoto toe"
          >
            {heeftFoto ? (
              <Text style={styles.fotoCheck}>✓</Text>
            ) : (
              <Text style={styles.fotoIcoon}>📷</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.fotoLabel}>
            {heeftFoto ? 'Foto toegevoegd' : 'Voeg foto toe'}
          </Text>
        </View>

        <Text style={styles.label}>Voornaam</Text>
        <TextInput
          style={styles.invoerVeld}
          placeholder="bijv. Jan"
          placeholderTextColor="#B0B0B0"
          value={voornaam}
          onChangeText={setVoornaam}
          autoCapitalize="words"
          accessible
          accessibilityLabel="Voornaam invoeren"
        />

        <Text style={styles.label}>Achternaam</Text>
        <TextInput
          style={styles.invoerVeld}
          placeholder="bijv. de Vries"
          placeholderTextColor="#B0B0B0"
          value={achternaam}
          onChangeText={setAchternaam}
          autoCapitalize="words"
          accessible
          accessibilityLabel="Achternaam invoeren"
        />

        <TouchableOpacity
          style={[
            styles.hoofdKnop,
            (!voornaam.trim() || !achternaam.trim()) && styles.hoofdKnopUit,
          ]}
          activeOpacity={0.7}
          disabled={!voornaam.trim() || !achternaam.trim()}
          onPress={() => setHuidigeStap(3)}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Volgende"
        >
          <Text style={styles.hoofdKnopTekst}>Volgende</Text>
        </TouchableOpacity>
      </>
    );
  }

  // --- STAP 3: Reserve-sleutel (e-mail koppelen aan Firebase account) ---
  //
  // Hoe account-herstel later werkt:
  // 1. Gebruiker logt normaal in via telefoon (PhoneAuthProvider).
  // 2. In deze stap wordt een e-mail + wachtwoord gekoppeld aan hetzelfde
  //    Firebase-account via linkWithCredential(). Dit voegt een tweede
  //    login-methode toe aan het bestaande account.
  // 3. Als de gebruiker later zijn telefoon kwijtraakt of een nieuw nummer
  //    krijgt, kan hij inloggen met signInWithEmailAndPassword() en
  //    vervolgens een nieuw telefoonnummer koppelen via linkWithCredential().
  // 4. Firebase bewaart beide providers (phone + email) onder dezelfde UID,
  //    dus alle Firestore-data (contacten, instellingen) blijft behouden.
  //
  async function koppelEmail() {
    if (!herstelEmail.trim() || !herstelWachtwoord.trim() || isLaden) return;
    setIsLaden(true);

    try {
      const emailCredential = EmailAuthProvider.credential(
        herstelEmail.trim(),
        herstelWachtwoord.trim()
      );
      // Koppel e-mail/wachtwoord aan het huidige telefoon-account
      await linkWithCredential(auth.currentUser, emailCredential);
      console.log('Reserve-sleutel gekoppeld:', herstelEmail);
      Alert.alert('Gelukt', 'Uw reserve-sleutel is veilig opgeslagen.');
      setHuidigeStap(4);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert(
          'E-mail al in gebruik',
          'Dit e-mailadres is al gekoppeld aan een ander account. Probeer een ander adres.'
        );
      } else if (err.code === 'auth/weak-password') {
        Alert.alert(
          'Wachtwoord te kort',
          'Kies een wachtwoord van minimaal 6 tekens.'
        );
      } else {
        Alert.alert(
          'Er ging iets mis',
          'De reserve-sleutel kon niet worden opgeslagen. Probeer het later opnieuw.'
        );
      }
      console.error('E-mail koppelen mislukt:', err);
    } finally {
      setIsLaden(false);
    }
  }

  function renderStap3() {
    return (
      <>
        <Text style={styles.titel}>Uw reserve-sleutel</Text>
        <Text style={styles.optioneel}>(optioneel)</Text>
        <Text style={styles.uitleg}>
          Stel dat u uw telefoon kwijtraakt of een nieuw nummer krijgt, dan
          kunt u via uw e-mailadres altijd de toegang tot uw veilige omgeving
          en contacten herstellen.
        </Text>

        <Text style={styles.label}>Uw e-mailadres</Text>
        <TextInput
          style={styles.invoerVeld}
          placeholder="bijv. jan@voorbeeld.nl"
          placeholderTextColor="#B0B0B0"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={herstelEmail}
          onChangeText={setHerstelEmail}
          editable={!isLaden}
          accessible
          accessibilityLabel="E-mailadres voor accountherstel"
        />

        <Text style={styles.label}>Kies een wachtwoord</Text>
        <TextInput
          style={styles.invoerVeld}
          placeholder="Minimaal 6 tekens"
          placeholderTextColor="#B0B0B0"
          secureTextEntry
          value={herstelWachtwoord}
          onChangeText={setHerstelWachtwoord}
          editable={!isLaden}
          accessible
          accessibilityLabel="Wachtwoord voor accountherstel"
        />

        <TouchableOpacity
          style={[
            styles.hoofdKnop,
            (!herstelEmail.trim() || !herstelWachtwoord.trim() || isLaden) &&
              styles.hoofdKnopUit,
          ]}
          activeOpacity={0.7}
          disabled={!herstelEmail.trim() || !herstelWachtwoord.trim() || isLaden}
          onPress={koppelEmail}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Opslaan en verder"
        >
          {isLaden ? (
            <ActivityIndicator color={WIT} size="large" />
          ) : (
            <Text style={styles.hoofdKnopTekst}>Opslaan & Verder</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.overslaanKnop}
          activeOpacity={0.7}
          disabled={isLaden}
          onPress={() => {
            console.log('Herstel e-mail overgeslagen');
            setHuidigeStap(4);
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Nu overslaan"
        >
          <Text style={styles.overslaanTekst}>Nu overslaan</Text>
        </TouchableOpacity>
      </>
    );
  }

  // --- STAP 4: Noodcontact ---
  function renderStap4() {
    return (
      <>
        <Text style={styles.titel}>
          Veiligheid voorop.{'\n'}Wie is uw vaste noodcontact?
        </Text>

        <Text style={styles.label}>Naam van het noodcontact</Text>
        <TextInput
          style={styles.invoerVeld}
          placeholder="bijv. Ans"
          placeholderTextColor="#B0B0B0"
          value={noodNaam}
          onChangeText={setNoodNaam}
          autoCapitalize="words"
          accessible
          accessibilityLabel="Naam noodcontact invoeren"
        />

        <Text style={styles.label}>Telefoonnummer</Text>
        <TextInput
          style={styles.invoerVeld}
          placeholder="06 9876 5432"
          placeholderTextColor="#B0B0B0"
          keyboardType="phone-pad"
          value={noodTelefoon}
          onChangeText={setNoodTelefoon}
          accessible
          accessibilityLabel="Telefoonnummer noodcontact invoeren"
        />

        <Text style={styles.label}>Relatie</Text>
        <TextInput
          style={styles.invoerVeld}
          placeholder="bijv. Dochter, Buurman, Verpleegkundige"
          placeholderTextColor="#B0B0B0"
          value={noodRelatie}
          onChangeText={setNoodRelatie}
          autoCapitalize="words"
          accessible
          accessibilityLabel="Relatie met noodcontact invoeren"
        />

        <View style={styles.infoBlok}>
          <Text style={styles.infoTekst}>
            Wij bellen dit nummer nooit zomaar. Dit wordt alleen gedeeld met uw
            vertrouwde contacten tijdens een alarm.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.hoofdKnop,
            (!noodNaam.trim() || !noodTelefoon.trim()) && styles.hoofdKnopUit,
          ]}
          activeOpacity={0.7}
          disabled={!noodNaam.trim() || !noodTelefoon.trim()}
          onPress={() => setHuidigeStap(5)}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Volgende"
        >
          <Text style={styles.hoofdKnopTekst}>Volgende</Text>
        </TouchableOpacity>
      </>
    );
  }

  // --- STAP 5: Vindbaarheid ---
  async function rondAf() {
    if (isLaden) return;
    setIsLaden(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Geen ingelogde gebruiker');

      await setDoc(doc(db, 'profiles', user.uid), {
        voornaam: voornaam.trim(),
        achternaam: achternaam.trim(),
        telefoon: user.phoneNumber || telefoon,
        foto: heeftFoto ? 'https://i.pravatar.cc/120?img=12' : '',
        postcode: postcode.trim(),
        zichtbaar: vindbaar,
        geluidBerichten: true,
        geluidAlarm: true,
        huidige_mood: null,
        noodcontact: {
          naam: noodNaam.trim(),
          telefoon: noodTelefoon.trim(),
          relatie: noodRelatie.trim(),
        },
        aangemaakt: serverTimestamp(),
      });

      console.log('Profiel opgeslagen in Firestore voor:', user.uid);
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Profiel opslaan mislukt:', err);
      Alert.alert(
        'Er ging iets mis',
        'Uw profiel kon niet worden opgeslagen. Controleer uw internetverbinding en probeer het opnieuw.'
      );
    } finally {
      setIsLaden(false);
    }
  }

  function renderStap5() {
    return (
      <>
        <Text style={styles.titel}>
          Wilt u nieuwe mensen ontmoeten via de app?
        </Text>
        <Text style={styles.uitleg}>
          Met uw postcode kunnen we u in contact brengen met mensen bij u in de
          buurt.
        </Text>

        <Text style={styles.label}>Postcode</Text>
        <TextInput
          style={styles.invoerVeld}
          placeholder="bijv. 3011 AA"
          placeholderTextColor="#B0B0B0"
          value={postcode}
          onChangeText={setPostcode}
          autoCapitalize="characters"
          editable={!isLaden}
          accessible
          accessibilityLabel="Postcode invoeren"
        />

        <View style={styles.switchRij}>
          <View style={styles.switchTekstBlok}>
            <Text style={styles.switchLabel}>
              Ja, ik wil gevonden kunnen worden door mensen in mijn buurt.
            </Text>
          </View>
          <Switch
            value={vindbaar}
            onValueChange={setVindbaar}
            disabled={isLaden}
            trackColor={{ false: '#D0D0D0', true: '#A7DDD4' }}
            thumbColor={vindbaar ? TEAL : '#F4F3F4'}
            accessible
            accessibilityRole="switch"
            accessibilityLabel="Vindbaar in de buurt"
          />
        </View>

        <TouchableOpacity
          style={[styles.hoofdKnop, isLaden && styles.hoofdKnopUit]}
          activeOpacity={0.7}
          disabled={isLaden}
          onPress={rondAf}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Afronden en starten"
        >
          {isLaden ? (
            <ActivityIndicator color={WIT} size="large" />
          ) : (
            <Text style={styles.hoofdKnopTekst}>Afronden & Starten</Text>
          )}
        </TouchableOpacity>
      </>
    );
  }

  const toonTerug = huidigeStap > 1 || toonCode;

  return (
    <KeyboardAvoidingView
      style={styles.scherm}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
        attemptInvisibleVerification
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Voortgangsbalk */}
        <Voortgang stap={huidigeStap} />

        {/* Terug-knop */}
        {toonTerug && (
          <TouchableOpacity
            style={styles.terugKnop}
            activeOpacity={0.7}
            onPress={gaTerug}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Terug"
          >
            <Text style={styles.terugTekst}>← Terug</Text>
          </TouchableOpacity>
        )}

        {/* Huidige stap */}
        {renderStap()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },

  // Voortgang
  voortgangContainer: {
    marginBottom: 24,
  },
  voortgangTekst: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textAlign: 'center',
  },
  voortgangBalk: {
    flexDirection: 'row',
    gap: 4,
    height: 8,
  },
  voortgangSegment: {
    flex: 1,
    backgroundColor: '#D9D9D9',
    height: 8,
  },
  voortgangActief: {
    backgroundColor: TEAL,
  },

  // Terug
  terugKnop: {
    alignSelf: 'flex-start',
    backgroundColor: TEAL,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  terugTekst: {
    fontSize: 17,
    fontWeight: '700',
    color: WIT,
  },

  // Titels en tekst
  titel: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    lineHeight: 36,
  },
  uitleg: {
    fontSize: 19,
    lineHeight: 28,
    color: '#555',
    marginBottom: 28,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },

  // Invoervelden
  invoerVeld: {
    backgroundColor: WIT,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 22,
    color: '#1A1A1A',
    marginBottom: 24,
    ...schaduw,
  },
  codeVeld: {
    backgroundColor: WIT,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontSize: 36,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: 14,
    marginBottom: 28,
    ...schaduw,
  },

  // Hoofdknop
  hoofdKnop: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    marginTop: 8,
    ...schaduw,
  },
  hoofdKnopUit: {
    opacity: 0.5,
  },
  hoofdKnopTekst: {
    fontSize: 22,
    fontWeight: '700',
    color: WIT,
  },

  // Profielfoto (Stap 2)
  fotoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  fotoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#D0D0D0',
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  fotoCircleGevuld: {
    backgroundColor: '#A7DDD4',
    borderColor: TEAL,
    borderStyle: 'solid',
  },
  fotoIcoon: {
    fontSize: 36,
  },
  fotoCheck: {
    fontSize: 40,
    color: WIT,
    fontWeight: '700',
  },
  fotoLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: TEAL,
  },

  // Optioneel label (Stap 3)
  optioneel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: -10,
    marginBottom: 16,
  },

  // Overslaan knop (Stap 3)
  overslaanKnop: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 14,
  },
  overslaanTekst: {
    fontSize: 18,
    color: '#888',
    fontWeight: '600',
  },

  // Info blok (Stap 4)
  infoBlok: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F9A825',
  },
  infoTekst: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5D4037',
  },

  // Switch rij (Stap 4)
  switchRij: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WIT,
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    ...schaduw,
  },
  switchTekstBlok: {
    flex: 1,
    marginRight: 14,
  },
  switchLabel: {
    fontSize: 18,
    lineHeight: 26,
    color: '#333',
    fontWeight: '500',
  },
});

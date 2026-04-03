import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { supabase } from './supabase';

import logoSamen from './assets/logo-samen.png';

const TEAL = '#2A9D8F';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

// --- Helper: NL nummer → internationaal formaat ---
function formatNaarInternationaal(nummer) {
  // Verwijder spaties, streepjes en haakjes
  const schoon = nummer.replace(/[\s\-()]/g, '');

  // 06... → +316...
  if (schoon.startsWith('06')) {
    return '+31' + schoon.slice(1);
  }
  // 316... → +316...
  if (schoon.startsWith('316')) {
    return '+' + schoon;
  }
  // +316... → al goed
  if (schoon.startsWith('+31')) {
    return schoon;
  }
  // 0031... → +31...
  if (schoon.startsWith('0031')) {
    return '+31' + schoon.slice(4);
  }
  // Anders: geef terug zoals het is (bijv. al internationaal)
  return schoon.startsWith('+') ? schoon : '+' + schoon;
}

export default function LoginScreen({ onLoginSuccess }) {
  const [telefoonnummer, setTelefoonnummer] = useState('');
  const [geformatteerdNummer, setGeformatteerdNummer] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [huidigeStap, setHuidigeStap] = useState(1);
  const [isLaden, setIsLaden] = useState(false);
  const [herstelEmail, setHerstelEmail] = useState('');
  const [sessieData, setSessieData] = useState(null);

  async function stuurCode() {
    if (!telefoonnummer.trim() || isLaden) return;
    setIsLaden(true);

    const internationaal = formatNaarInternationaal(telefoonnummer.trim());
    setGeformatteerdNummer(internationaal);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: internationaal,
      });

      if (error) {
        Alert.alert(
          'Er ging iets mis',
          'Het telefoonnummer kon niet worden verwerkt. Controleer of u een geldig mobiel nummer heeft ingevuld en probeer het opnieuw.'
        );
        console.error('OTP fout:', error.message);
      } else {
        console.log('OTP verstuurd naar:', internationaal);
        setHuidigeStap(2);
      }
    } catch (err) {
      Alert.alert(
        'Verbindingsfout',
        'Er kon geen verbinding worden gemaakt. Controleer uw internetverbinding en probeer het opnieuw.'
      );
      console.error('Netwerk fout:', err);
    } finally {
      setIsLaden(false);
    }
  }

  async function logIn() {
    if (smsCode.length < 6 || isLaden) return;
    setIsLaden(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: geformatteerdNummer,
        token: smsCode,
        type: 'sms',
      });

      if (error) {
        Alert.alert(
          'Code onjuist',
          'De ingevulde code is onjuist. Probeer het nog eens.'
        );
        console.error('Verificatie fout:', error.message);
      } else {
        console.log('Inloggen gelukt! Sessie:', data.session);
        setSessieData(data.session);
        setHuidigeStap(3);
      }
    } catch (err) {
      Alert.alert(
        'Verbindingsfout',
        'Er kon geen verbinding worden gemaakt. Controleer uw internetverbinding en probeer het opnieuw.'
      );
      console.error('Netwerk fout:', err);
    } finally {
      setIsLaden(false);
    }
  }

  async function stuurOpnieuw() {
    if (isLaden) return;
    setIsLaden(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: geformatteerdNummer,
      });

      if (error) {
        Alert.alert(
          'Er ging iets mis',
          'De code kon niet opnieuw worden verstuurd. Probeer het later nog eens.'
        );
        console.error('Opnieuw sturen fout:', error.message);
      } else {
        Alert.alert('Gelukt', 'Er is een nieuwe code verstuurd naar uw telefoon.');
        console.log('Code opnieuw gestuurd naar:', geformatteerdNummer);
      }
    } catch (err) {
      Alert.alert(
        'Verbindingsfout',
        'Er kon geen verbinding worden gemaakt. Probeer het later nog eens.'
      );
      console.error('Netwerk fout:', err);
    } finally {
      setIsLaden(false);
    }
  }

  function gaTerug() {
    setSmsCode('');
    setHuidigeStap(1);
  }

  return (
    <KeyboardAvoidingView
      style={styles.scherm}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={typeof logoSamen === 'string' ? { uri: logoSamen } : logoSamen}
            style={styles.logoAfbeelding}
            resizeMode="contain"
            accessible
            accessibilityLabel="Samen logo"
          />
        </View>

        {huidigeStap === 1 && (
          <>
            {/* Stap 1: Telefoonnummer */}
            <Text style={styles.titel}>Welkom bij Samen</Text>
            <Text style={styles.uitleg}>
              Vul uw mobiele nummer in om in te loggen of gratis een account aan
              te maken. U ontvangt een veilige code via SMS.
            </Text>

            <Text style={styles.label}>Uw telefoonnummer</Text>
            <TextInput
              style={styles.invoerVeld}
              placeholder="06 1234 5678"
              placeholderTextColor="#B0B0B0"
              keyboardType="phone-pad"
              value={telefoonnummer}
              onChangeText={setTelefoonnummer}
              editable={!isLaden}
              accessible
              accessibilityLabel="Telefoonnummer invoeren"
            />

            <TouchableOpacity
              style={[
                styles.hoofdKnop,
                (!telefoonnummer.trim() || isLaden) && styles.hoofdKnopDisabled,
              ]}
              activeOpacity={0.7}
              onPress={stuurCode}
              disabled={!telefoonnummer.trim() || isLaden}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Stuur inlogcode"
            >
              {isLaden ? (
                <ActivityIndicator color={WIT} size="large" />
              ) : (
                <Text style={styles.hoofdKnopTekst}>Stuur inlogcode</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {huidigeStap === 2 && (
          <>
            {/* Stap 2: SMS code invoeren */}
            <TouchableOpacity
              style={styles.terugKnop}
              activeOpacity={0.7}
              onPress={gaTerug}
              disabled={isLaden}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Ga terug naar telefoonnummer"
            >
              <Text style={styles.terugTekst}>← Wijzig nummer</Text>
            </TouchableOpacity>

            <Text style={styles.titel}>Vul uw code in</Text>
            <Text style={styles.uitleg}>
              We hebben een SMS gestuurd naar{' '}
              <Text style={styles.nummerHighlight}>{geformatteerdNummer}</Text>.
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
                (smsCode.length < 6 || isLaden) && styles.hoofdKnopDisabled,
              ]}
              activeOpacity={0.7}
              onPress={logIn}
              disabled={smsCode.length < 6 || isLaden}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Inloggen"
            >
              {isLaden ? (
                <ActivityIndicator color={WIT} size="large" />
              ) : (
                <Text style={styles.hoofdKnopTekst}>Inloggen</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.opnieuwKnop}
              activeOpacity={0.7}
              onPress={stuurOpnieuw}
              disabled={isLaden}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Code opnieuw versturen"
            >
              <Text style={styles.opnieuwTekst}>
                Code niet ontvangen? Stuur opnieuw.
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Stap 3: Reserve-sleutel (e-mail) */}
        {huidigeStap === 3 && (
          <>
            <Text style={styles.titel}>Uw reserve-sleutel</Text>
            <Text style={styles.subtitel}>(optioneel)</Text>
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
              accessible
              accessibilityLabel="E-mailadres voor accountherstel"
            />

            <TouchableOpacity
              style={[
                styles.hoofdKnop,
                !herstelEmail.trim() && styles.hoofdKnopDisabled,
              ]}
              activeOpacity={0.7}
              disabled={!herstelEmail.trim()}
              onPress={() => {
                // TODO: e-mail opslaan in Supabase profiel
                console.log('Herstel e-mail opgeslagen:', herstelEmail);
                if (onLoginSuccess) onLoginSuccess(sessieData);
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Opslaan en verder"
            >
              <Text style={styles.hoofdKnopTekst}>Opslaan & Verder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overslaanKnop}
              activeOpacity={0.7}
              onPress={() => {
                console.log('Herstel e-mail overgeslagen');
                if (onLoginSuccess) onLoginSuccess(sessieData);
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Nu overslaan"
            >
              <Text style={styles.overslaanTekst}>Nu overslaan</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const schaduw = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  android: {
    elevation: 3,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});

const styles = StyleSheet.create({
  scherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 60,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoAfbeelding: {
    width: 180,
    height: 180,
  },

  // Titels en tekst
  titel: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  uitleg: {
    fontSize: 19,
    lineHeight: 28,
    color: '#555',
    marginBottom: 32,
  },
  nummerHighlight: {
    fontWeight: '700',
    color: '#1A1A1A',
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
    marginBottom: 28,
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
    ...schaduw,
  },
  hoofdKnopDisabled: {
    opacity: 0.5,
  },
  hoofdKnopTekst: {
    fontSize: 22,
    fontWeight: '700',
    color: WIT,
  },

  // Terug knop
  terugKnop: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  terugTekst: {
    fontSize: 18,
    fontWeight: '600',
    color: TEAL,
  },

  // Subtitel (optioneel)
  subtitel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: -10,
    marginBottom: 16,
  },

  // Overslaan knop
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

  // Opnieuw versturen
  opnieuwKnop: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 12,
  },
  opnieuwTekst: {
    fontSize: 18,
    color: TEAL,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

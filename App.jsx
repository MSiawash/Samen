import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { supabase } from './supabase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { initializeDemoData } from './services/databaseService';
import logoRond from './assets/logo-rond.png';
import HomeScreen from './HomeScreen';
import ContactenScreen from './ContactenScreen';
import ActiviteitenScreen from './ActiviteitenScreen';
import LoginScreen from './LoginScreen';
import InstellingenScreen from './InstellingenScreen';
import HulpScreen from './HulpScreen';
import OnboardingWizard from './OnboardingWizard';
import {
  registerForPushNotificationsAsync,
  controleerAlarmStatus,
  addNotificationResponseListener,
} from './notificaties';

const TEAL = '#2A9D8F';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

const tabs = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'contacten', label: 'Contacten', icon: '👥' },
  { key: 'activiteiten', label: 'Activiteiten', icon: '📅' },
  { key: 'hulp', label: 'Hulp', icon: '❤️' },
];

// --- Splash / Laadscherm ---
function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <Image
        source={typeof logoRond === 'string' ? { uri: logoRond } : logoRond}
        style={splashStyles.logo}
        resizeMode="contain"
      />
      <Text style={splashStyles.naam}>Samen</Text>
      <Text style={splashStyles.slogan}>omzien naar elkaar!</Text>
      <ActivityIndicator
        size="large"
        color={TEAL}
        style={splashStyles.spinner}
      />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACHTERGROND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  naam: {
    fontSize: 36,
    fontWeight: '800',
    color: TEAL,
    letterSpacing: 2,
  },
  slogan: {
    fontSize: 18,
    color: '#888',
    marginTop: 4,
  },
  spinner: {
    marginTop: 40,
  },
});

// --- Placeholder scherm ---
function PlaceholderScreen({ title, icon }) {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.icon}>{icon}</Text>
      <Text style={placeholderStyles.title}>{title}</Text>
      <Text style={placeholderStyles.subtitle}>Binnenkort beschikbaar</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACHTERGROND,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#888',
  },
});

// --- Hoofdapp ---
export default function App() {
  const [isLaden, setIsLaden] = useState(true);
  // TODO: terug naar false bij publicatie
  const [isIngelogd, setIsIngelogd] = useState(true);
  // TODO: terug naar false bij publicatie
  const [isOnboarded, setIsOnboarded] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [toonInstellingen, setToonInstellingen] = useState(false);
  const [heeftMeldingen, setHeeftMeldingen] = useState(true);

  // Check bij opstarten of er een actieve sessie is (Supabase + Firebase)
  useEffect(() => {
    async function checkSessie() {
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        const sessieCheck = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessieCheck, timeout]);
        if (session) {
          console.log('Supabase sessie gevonden:', session.user?.phone);
          setIsIngelogd(true);
          setIsOnboarded(true);
        }
      } catch (err) {
        console.log('Geen Supabase sessie, check Firebase...');
      } finally {
        setIsLaden(false);
      }
    }
    checkSessie();

    // Firebase auth state listener + demo data seeding
    const unsubscribeFirebase = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('Firebase gebruiker ingelogd:', user.phoneNumber);
        setIsIngelogd(true);
        setIsOnboarded(true);

        // Seed demo data bij eerste login (controleert zelf of data al bestaat)
        try {
          await initializeDemoData(user.uid);
        } catch (err) {
          console.error('Demo data seeding mislukt:', err);
        }
      }
    });

    return () => unsubscribeFirebase();
  }, []);

  // Push-meldingen registreren bij opstarten
  useEffect(() => {
    registerForPushNotificationsAsync().catch((err) =>
      console.log('Push registratie overgeslagen:', err.message)
    );
  }, []);

  // Veiligheidscontrole: check elke 15 min of contacten ingecheckt zijn
  useEffect(() => {
    // Gedeelde contacten (later uit Supabase, nu dummy)
    const gedeeldeContacten = [
      { id: 'a1', naam: 'Marie (Zus)', ingecheckt: false, naam_noodcontact: 'Dochter Anja' },
      { id: 'a2', naam: 'Kees (Buurman)', ingecheckt: false, naam_noodcontact: 'Vrouw Bep' },
    ];

    // Eerste check direct uitvoeren
    controleerAlarmStatus(gedeeldeContacten);

    // Herhaal elke 15 minuten
    const interval = setInterval(() => {
      controleerAlarmStatus(gedeeldeContacten);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Bij tik op alarm-notificatie: navigeer naar Contacten-tab
  useEffect(() => {
    const subscription = addNotificationResponseListener((contactId) => {
      console.log('Alarm notificatie geopend voor contact:', contactId);
      setActiveTab('contacten');
      setToonInstellingen(false);
    });
    return () => subscription.remove();
  }, []);

  // Splash scherm tijdens sessie-check
  if (isLaden) {
    return <SplashScreen />;
  }

  // Login scherm
  if (!isIngelogd) {
    return (
      <LoginScreen
        onLoginSuccess={() => setIsIngelogd(true)}
      />
    );
  }

  // Onboarding wizard
  if (!isOnboarded) {
    return (
      <OnboardingWizard
        onComplete={() => setIsOnboarded(true)}
      />
    );
  }

  // Uitlog functie
  async function handleUitloggen() {
    try {
      await supabase.auth.signOut();
    } catch {
      // ook bij fout lokaal uitloggen
    }
    setIsIngelogd(false);
    setToonInstellingen(false);
    setActiveTab('home');
  }

  // Instellingen scherm
  if (toonInstellingen) {
    return (
      <View style={navStyles.container}>
        <View style={navStyles.header}>
          <TouchableOpacity
            onPress={() => setToonInstellingen(false)}
            activeOpacity={0.7}
            style={navStyles.headerTerugKnop}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Terug"
          >
            <Text style={navStyles.headerTerugTekst}>← Terug</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <View style={navStyles.screenArea}>
          <InstellingenScreen
            onTerug={() => setToonInstellingen(false)}
            onUitloggen={handleUitloggen}
          />
        </View>
      </View>
    );
  }

  // Hoofdscherm met tabs
  let screen;
  switch (activeTab) {
    case 'home':
      screen = <HomeScreen onNavigeerHulp={() => setActiveTab('hulp')} />;
      break;
    case 'contacten':
      screen = <ContactenScreen />;
      break;
    case 'activiteiten':
      screen = <ActiviteitenScreen />;
      break;
    case 'hulp':
      screen = <HulpScreen />;
      break;
    default:
      screen = <HomeScreen />;
  }

  return (
    <View style={navStyles.container}>
      {/* Header met logo + instellingen tandwiel */}
      <View style={navStyles.header}>
        <Image
          source={typeof logoRond === 'string' ? { uri: logoRond } : logoRond}
          style={navStyles.headerLogo}
          resizeMode="contain"
          accessible
          accessibilityLabel="Samen logo"
        />
        <Text style={navStyles.headerTitel}>Samen</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => {
            setHeeftMeldingen(false);
            // TODO: navigeer naar meldingen scherm
          }}
          activeOpacity={0.7}
          style={navStyles.belKnop}
          accessible
          accessibilityRole="button"
          accessibilityLabel={heeftMeldingen ? 'Meldingen (nieuw)' : 'Meldingen'}
        >
          <Text style={navStyles.belIcoon}>🔔</Text>
          {heeftMeldingen && <View style={navStyles.badge} />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setToonInstellingen(true)}
          activeOpacity={0.7}
          style={navStyles.instellingenKnop}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Instellingen"
        >
          <Text style={navStyles.instellingenIcoon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={navStyles.screenArea}>{screen}</View>

      {/* Tab bar */}
      <View style={navStyles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={navStyles.tab}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[navStyles.tabIcon, isActive && navStyles.tabIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[navStyles.tabLabel, isActive && navStyles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={navStyles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const navStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACHTERGROND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WIT,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
    }),
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerTitel: {
    fontSize: 22,
    fontWeight: '700',
    color: TEAL,
    marginLeft: 10,
  },
  headerTerugKnop: {
    backgroundColor: TEAL,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  headerTerugTekst: {
    fontSize: 17,
    fontWeight: '700',
    color: WIT,
  },
  belKnop: {
    padding: 8,
    marginRight: 12,
    position: 'relative',
  },
  belIcoon: {
    fontSize: 26,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E76F51',
    borderWidth: 2,
    borderColor: WIT,
  },
  instellingenKnop: {
    padding: 8,
  },
  instellingenIcoon: {
    fontSize: 26,
  },
  screenArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: WIT,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 26,
    marginBottom: 2,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  tabLabelActive: {
    color: TEAL,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
});

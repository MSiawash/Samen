import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import logoRond from './assets/logo-rond.png';
import HomeScreen from './HomeScreen';
import CirkelsScreen from './CirkelsScreen';
import LoginScreen from './LoginScreen';

const TEAL = '#2A9D8F';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';

const tabs = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'cirkels', label: 'Cirkels', icon: '👥' },
  { key: 'activiteiten', label: 'Activiteiten', icon: '📅' },
  { key: 'hulp', label: 'Hulp', icon: '❤️' },
];

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

export default function App() {
  const [isIngelogd, setIsIngelogd] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  if (!isIngelogd) {
    return <LoginScreen onLoginSuccess={() => setIsIngelogd(true)} />;
  }

  let screen;
  switch (activeTab) {
    case 'home':
      screen = <HomeScreen />;
      break;
    case 'cirkels':
      screen = <CirkelsScreen />;
      break;
    case 'activiteiten':
      screen = <PlaceholderScreen title="Activiteiten" icon="📅" />;
      break;
    case 'hulp':
      screen = <PlaceholderScreen title="Hulp" icon="❤️" />;
      break;
    default:
      screen = <HomeScreen />;
  }

  return (
    <View style={navStyles.container}>
      <View style={navStyles.header}>
        <Image
          source={{ uri: logoRond }}
          style={navStyles.headerLogo}
          resizeMode="contain"
          accessible
          accessibilityLabel="Samen logo"
        />
        <Text style={navStyles.headerTitel}>Samen</Text>
      </View>
      <View style={navStyles.screenArea}>{screen}</View>
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

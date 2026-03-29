import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';

// --- Kleuren ---
const TEAL = '#2A9D8F';
const ORANJE = '#F4A261';
const ROOD = '#E76F51';
const ACHTERGROND = '#F5F5F0';
const WIT = '#FFFFFF';
const GROEN_LICHT = '#E8F5E9';

// --- Afstanden voor zoekfunctie ---
const afstanden = [0, 1, 3, 5, 10, 20, 31, 40, 50, 'Max'];

// --- Helper: genereer unieke leesbare code (geen O/0) ---
function genereerUniekeCode() {
  const tekens = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += tekens.charAt(Math.floor(Math.random() * tekens.length));
    if (i === 1 || i === 3) code += '-';
  }
  return code;
}

// --- Dummy Data ---
const initieleCirckels = [
  {
    id: '1',
    naam: 'Wandelclubje Park',
    beschrijving: 'Elke dinsdag en donderdag een rondje door het Kralingse Bos.',
    huidigeRolGebruiker: 'beheerder',
    wachtendeVerzoeken: [
      { id: 'w1', naam: 'Henk Bakker' },
      { id: 'w2', naam: 'Ria van Dijk' },
    ],
    huidigeLeden: [
      { id: 'l1', naam: 'Jan (u)', rol: 'beheerder' },
      { id: 'l2', naam: 'Kees de Boer', rol: 'lid' },
      { id: 'l3', naam: 'Annie Jansen', rol: 'lid' },
      { id: 'l4', naam: 'Piet Visser', rol: 'mede-beheerder' },
    ],
  },
  {
    id: '2',
    naam: 'Familie de Vries',
    beschrijving: 'Onze familie-cirkel om bij te praten en foto\'s te delen.',
    huidigeRolGebruiker: 'mede-beheerder',
    wachtendeVerzoeken: [
      { id: 'w3', naam: 'Neef Sander' },
    ],
    huidigeLeden: [
      { id: 'l5', naam: 'Jan (u)', rol: 'mede-beheerder' },
      { id: 'l6', naam: 'Marie de Vries', rol: 'beheerder' },
      { id: 'l7', naam: 'Tom de Vries', rol: 'lid' },
    ],
  },
  {
    id: '3',
    naam: 'Bingo Vrijdagavond',
    beschrijving: 'Elke vrijdag gezellig bingo in het wijkcentrum.',
    huidigeRolGebruiker: 'lid',
    wachtendeVerzoeken: [],
    huidigeLeden: [],
  },
];

const initieleOpenbareCirckels = [
  {
    id: 'o1',
    naam: 'Schilderclub Rotterdam-Zuid',
    beschrijving: 'Samen schilderen in het atelier aan de Maas.',
    lidStatus: 'geen',
  },
  {
    id: 'o2',
    naam: 'Leesgroep De Boekenhoek',
    beschrijving: 'Maandelijks een boek bespreken met koffie en cake.',
    lidStatus: 'geen',
  },
  {
    id: 'o3',
    naam: 'Tuinieren voor Beginners',
    beschrijving: 'Tips en gezelligheid voor groene vingers.',
    lidStatus: 'geen',
  },
];

// --- Rol Label ---
function RolLabel({ rol }) {
  const kleuren = {
    beheerder: { bg: TEAL, tekst: WIT },
    'mede-beheerder': { bg: '#5BB5A8', tekst: WIT },
    lid: { bg: '#E0E0DA', tekst: '#555' },
  };
  const kleur = kleuren[rol] || kleuren.lid;
  const label = rol.charAt(0).toUpperCase() + rol.slice(1);
  return (
    <View style={[styles.rolLabel, { backgroundColor: kleur.bg }]}>
      <Text style={[styles.rolLabelTekst, { color: kleur.tekst }]}>{label}</Text>
    </View>
  );
}

// --- Beheer Modal ---
function BeheerModal({ cirkel, zichtbaar, onSluit, onUpdate }) {
  if (!cirkel) return null;

  function keurGoed(verzoekId) {
    const nieuw = { ...cirkel };
    const verzoek = nieuw.wachtendeVerzoeken.find((v) => v.id === verzoekId);
    nieuw.wachtendeVerzoeken = nieuw.wachtendeVerzoeken.filter((v) => v.id !== verzoekId);
    if (verzoek) {
      nieuw.huidigeLeden = [...nieuw.huidigeLeden, { id: verzoek.id, naam: verzoek.naam, rol: 'lid' }];
    }
    onUpdate(nieuw);
  }

  function wijsAf(verzoekId) {
    const nieuw = { ...cirkel };
    nieuw.wachtendeVerzoeken = nieuw.wachtendeVerzoeken.filter((v) => v.id !== verzoekId);
    onUpdate(nieuw);
  }

  function maakMedeBeheerder(lidId) {
    const nieuw = { ...cirkel };
    nieuw.huidigeLeden = nieuw.huidigeLeden.map((l) =>
      l.id === lidId ? { ...l, rol: 'mede-beheerder' } : l
    );
    onUpdate(nieuw);
  }

  return (
    <Modal visible={zichtbaar} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitel}>Beheer: {cirkel.naam}</Text>

            {/* Nieuwe Verzoeken */}
            <Text style={styles.sectieTitel}>Nieuwe Verzoeken</Text>
            {cirkel.wachtendeVerzoeken.length === 0 ? (
              <Text style={styles.geenItems}>Geen openstaande verzoeken.</Text>
            ) : (
              cirkel.wachtendeVerzoeken.map((v) => (
                <View key={v.id} style={styles.verzoekRij}>
                  <Text style={styles.verzoekNaam}>{v.naam}</Text>
                  <View style={styles.verzoekKnoppen}>
                    <TouchableOpacity
                      style={styles.goedkeurKnop}
                      activeOpacity={0.7}
                      onPress={() => keurGoed(v.id)}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`${v.naam} goedkeuren`}
                    >
                      <Text style={styles.knopTekstWit}>Goedkeuren</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.afwijsKnop}
                      activeOpacity={0.7}
                      onPress={() => wijsAf(v.id)}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`${v.naam} afwijzen`}
                    >
                      <Text style={styles.knopTekstWit}>Afwijzen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Huidige Leden */}
            <Text style={[styles.sectieTitel, { marginTop: 24 }]}>Huidige Leden</Text>
            {cirkel.huidigeLeden.map((lid) => (
              <View key={lid.id} style={styles.lidRij}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lidNaam}>{lid.naam}</Text>
                  <RolLabel rol={lid.rol} />
                </View>
                {lid.rol === 'lid' && (
                  <TouchableOpacity
                    style={styles.medeBeheerderKnop}
                    activeOpacity={0.7}
                    onPress={() => maakMedeBeheerder(lid.id)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Maak ${lid.naam} mede-beheerder`}
                  >
                    <Text style={styles.medeBeheerderTekst}>Maak mede-beheerder</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Sluit knop */}
            <TouchableOpacity
              style={styles.sluitKnop}
              activeOpacity={0.7}
              onPress={onSluit}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Sluit beheerpaneel"
            >
              <Text style={styles.sluitKnopTekst}>Sluiten</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// --- Hoofdscherm ---
export default function CirkelsScreen() {
  const [tab, setTab] = useState('mijn');
  const [cirkels, setCirkels] = useState(initieleCirckels);
  const [openbareCirkels, setOpenbareCirkels] = useState(initieleOpenbareCirckels);
  const [beheerCirckel, setBeheerCirckel] = useState(null);
  const [zoekTerm, setZoekTerm] = useState('');

  // Zoeken states
  const [postcode, setPostcode] = useState('');
  const [afstandIndex, setAfstandIndex] = useState(3);

  // Aanmaken states
  const [nieuweCirkelNaam, setNieuweCirkelNaam] = useState('');
  const [gegenereerdeCode, setGegenereerdeCode] = useState('');

  function openBeheer(cirkel) {
    setBeheerCirckel(cirkel);
  }

  function sluitBeheer() {
    setBeheerCirckel(null);
  }

  function updateCirckel(bijgewerkt) {
    setCirkels((prev) => prev.map((c) => (c.id === bijgewerkt.id ? bijgewerkt : c)));
    setBeheerCirckel(bijgewerkt);
  }

  function verzendVerzoek(cirkelId) {
    setOpenbareCirkels((prev) =>
      prev.map((c) => (c.id === cirkelId ? { ...c, lidStatus: 'verzonden' } : c))
    );
  }

  const gefilterdeOpenbare = openbareCirkels.filter((c) =>
    c.naam.toLowerCase().includes(zoekTerm.toLowerCase())
  );

  return (
    <View style={styles.scherm}>
      {/* Toggle knoppen */}
      <View style={styles.toggleBar}>
        <TouchableOpacity
          style={[styles.toggleKnop, tab === 'mijn' && styles.toggleActief]}
          activeOpacity={0.7}
          onPress={() => setTab('mijn')}
          accessible
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'mijn' }}
        >
          <Text style={[styles.toggleTekst, tab === 'mijn' && styles.toggleTekstActief]}>
            Mijn Cirkels
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleKnop, tab === 'ontdek' && styles.toggleActief]}
          activeOpacity={0.7}
          onPress={() => setTab('ontdek')}
          accessible
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'ontdek' }}
        >
          <Text style={[styles.toggleTekst, tab === 'ontdek' && styles.toggleTekstActief]}>
            Ontdek / Maak aan
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'mijn' ? (
          <>
            {cirkels.map((cirkel) => (
              <View key={cirkel.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardNaam}>{cirkel.naam}</Text>
                  <RolLabel rol={cirkel.huidigeRolGebruiker} />
                </View>
                <Text style={styles.cardBeschrijving}>{cirkel.beschrijving}</Text>

                {(cirkel.huidigeRolGebruiker === 'beheerder' ||
                  cirkel.huidigeRolGebruiker === 'mede-beheerder') && (
                  <TouchableOpacity
                    style={styles.beheerKnop}
                    activeOpacity={0.7}
                    onPress={() => openBeheer(cirkel)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Beheer leden en verzoeken van ${cirkel.naam}`}
                  >
                    <Text style={styles.beheerKnopTekst}>Beheer Leden & Verzoeken</Text>
                    {cirkel.wachtendeVerzoeken.length > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeTekst}>{cirkel.wachtendeVerzoeken.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        ) : (
          <>
            {/* ========== SECTIE 1: CIRKELS ZOEKEN ========== */}
            <View style={styles.card}>
              <Text style={styles.sectieKaartTitel}>Cirkels zoeken</Text>

              {/* Postcode */}
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

              {/* Zoek knop */}
              <TouchableOpacity
                style={[
                  styles.zoekKnop,
                  !postcode.trim() && styles.knopDisabled,
                ]}
                activeOpacity={0.7}
                disabled={!postcode.trim()}
                onPress={() => {
                  console.log('Zoek cirkels:', {
                    postcode: postcode.trim(),
                    afstand: afstanden[afstandIndex],
                  });
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Zoek cirkels"
              >
                <Text style={styles.zoekKnopTekst}>Zoek Cirkels</Text>
              </TouchableOpacity>
            </View>

            {/* Zoekbalk voor bestaande lijst */}
            <View style={styles.zoekContainer}>
              <TextInput
                style={styles.zoekVeld}
                placeholder="Zoek op naam..."
                placeholderTextColor="#999"
                value={zoekTerm}
                onChangeText={setZoekTerm}
                accessible
                accessibilityLabel="Zoek een cirkel op naam"
              />
            </View>

            {/* Openbare cirkels */}
            {gefilterdeOpenbare.map((cirkel) => (
              <View key={cirkel.id} style={styles.card}>
                <Text style={styles.cardNaam}>{cirkel.naam}</Text>
                <Text style={styles.cardBeschrijving}>{cirkel.beschrijving}</Text>
                {cirkel.lidStatus === 'verzonden' ? (
                  <View style={styles.verzondenContainer}>
                    <Text style={styles.verzondenTekst}>
                      Verzoek verzonden (wacht op goedkeuring)
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.verzoekKnop}
                    activeOpacity={0.7}
                    onPress={() => verzendVerzoek(cirkel.id)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Verzoek om lid te worden van ${cirkel.naam}`}
                  >
                    <Text style={styles.verzoekKnopTekst}>Verzoek om lid te worden</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Scheidingslijn */}
            <View style={styles.scheiding}>
              <View style={styles.scheidingsLijn} />
              <Text style={styles.scheidingsTekst}>of</Text>
              <View style={styles.scheidingsLijn} />
            </View>

            {/* ========== SECTIE 2: CIRKEL AANMAKEN ========== */}
            <View style={styles.card}>
              <Text style={styles.sectieKaartTitel}>Nieuwe cirkel aanmaken</Text>
              <Text style={styles.nieuweCirkelHint}>
                U wordt automatisch beheerder van deze nieuwe groep.
              </Text>

              {gegenereerdeCode ? (
                /* Succes-weergave */
                <View style={styles.succesBlok}>
                  <Text style={styles.succesEmoji}>🎉</Text>
                  <Text style={styles.succesTitel}>Gefeliciteerd!</Text>
                  <Text style={styles.succesTekst}>
                    Uw cirkel is aangemaakt.
                  </Text>

                  <Text style={styles.codeLabel}>Uw unieke uitnodigingscode:</Text>
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeTekst}>{gegenereerdeCode}</Text>
                  </View>

                  <Text style={styles.codeUitleg}>
                    Geef deze unieke code door aan de mensen die u wilt uitnodigen.
                  </Text>

                  <TouchableOpacity
                    style={styles.resetKnop}
                    activeOpacity={0.7}
                    onPress={() => {
                      setGegenereerdeCode('');
                      setNieuweCirkelNaam('');
                    }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Nog een cirkel aanmaken"
                  >
                    <Text style={styles.resetKnopTekst}>Nog een cirkel aanmaken</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Invoer-weergave */
                <>
                  <Text style={styles.veldLabel}>Naam van uw nieuwe cirkel</Text>
                  <TextInput
                    style={styles.invoerVeld}
                    placeholder="bijv. Wandelclubje"
                    placeholderTextColor="#B0B0B0"
                    value={nieuweCirkelNaam}
                    onChangeText={setNieuweCirkelNaam}
                    accessible
                    accessibilityLabel="Naam van uw nieuwe cirkel"
                  />

                  <TouchableOpacity
                    style={[
                      styles.aanmaakKnop,
                      !nieuweCirkelNaam.trim() && styles.knopDisabled,
                    ]}
                    activeOpacity={0.7}
                    disabled={!nieuweCirkelNaam.trim()}
                    onPress={() => {
                      const code = genereerUniekeCode();
                      setGegenereerdeCode(code);
                      console.log('Cirkel aangemaakt:', nieuweCirkelNaam, 'Code:', code);
                    }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Maak cirkel aan"
                  >
                    <Text style={styles.aanmaakKnopTekst}>Maak Cirkel Aan</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Beheer Modal */}
      <BeheerModal
        cirkel={beheerCirckel}
        zichtbaar={beheerCirckel !== null}
        onSluit={sluitBeheer}
        onUpdate={updateCirckel}
      />
    </View>
  );
}

// --- Styling ---
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
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
});

const styles = StyleSheet.create({
  scherm: {
    flex: 1,
    backgroundColor: ACHTERGROND,
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
    backgroundColor: WIT,
    ...schaduw,
  },
  toggleTekst: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
  },
  toggleTekstActief: {
    color: TEAL,
    fontWeight: '700',
  },

  // Scroll
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Card
  card: {
    backgroundColor: WIT,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...schaduw,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  cardNaam: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  cardBeschrijving: {
    fontSize: 18,
    lineHeight: 26,
    color: '#555',
    marginBottom: 4,
  },

  // Rol label
  rolLabel: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  rolLabelTekst: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Beheer knop op card
  beheerKnop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
  },
  beheerKnopTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },
  badge: {
    backgroundColor: ORANJE,
    borderRadius: 12,
    marginLeft: 10,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  badgeTekst: {
    fontSize: 15,
    fontWeight: '700',
    color: WIT,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: WIT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitel: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },

  // Secties in modal
  sectieTitel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  geenItems: {
    fontSize: 18,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },

  // Verzoek rij
  verzoekRij: {
    backgroundColor: ACHTERGROND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  verzoekNaam: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  verzoekKnoppen: {
    flexDirection: 'row',
    gap: 12,
  },
  goedkeurKnop: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  afwijsKnop: {
    flex: 1,
    backgroundColor: ROOD,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  knopTekstWit: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },

  // Lid rij
  lidRij: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACHTERGROND,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  lidNaam: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  medeBeheerderKnop: {
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 10,
  },
  medeBeheerderTekst: {
    fontSize: 14,
    fontWeight: '700',
    color: WIT,
  },

  // Sluit knop
  sluitKnop: {
    backgroundColor: '#E8E8E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sluitKnopTekst: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
  },

  // Ontdek tab
  nieuweCirkelKnop: {
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 8,
    ...schaduw,
  },
  nieuweCirkelTekst: {
    fontSize: 22,
    fontWeight: '700',
    color: WIT,
  },
  nieuweCirkelHint: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Zoek
  zoekContainer: {
    marginBottom: 20,
  },
  zoekVeld: {
    backgroundColor: WIT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 18,
    color: '#1A1A1A',
    ...schaduw,
  },

  // Verzoek knop (openbare cirkels)
  verzoekKnop: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  verzoekKnopTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: WIT,
  },
  verzondenContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 14,
    borderLeftWidth: 4,
    borderLeftColor: ORANJE,
  },
  verzondenTekst: {
    fontSize: 17,
    fontWeight: '600',
    color: ORANJE,
  },

  // --- Sectie kaart titels ---
  sectieKaartTitel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },

  // --- Invoervelden (zoeken & aanmaken) ---
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
    marginBottom: 20,
  },

  // --- Slider ---
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

  // --- Zoek knop ---
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

  // --- Scheiding ---
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
    fontWeight: '600',
  },

  // --- Aanmaak knop ---
  aanmaakKnop: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    ...schaduw,
  },
  aanmaakKnopTekst: {
    fontSize: 22,
    fontWeight: '700',
    color: WIT,
  },

  // --- Succes blok ---
  succesBlok: {
    backgroundColor: GROEN_LICHT,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  succesEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  succesTitel: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  succesTekst: {
    fontSize: 19,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  codeContainer: {
    backgroundColor: WIT,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
    ...schaduw,
  },
  codeTekst: {
    fontSize: 36,
    fontWeight: '800',
    color: TEAL,
    letterSpacing: 2,
    textAlign: 'center',
  },
  codeUitleg: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  resetKnop: {
    backgroundColor: WIT,
    borderWidth: 2,
    borderColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  resetKnopTekst: {
    fontSize: 18,
    fontWeight: '700',
    color: TEAL,
  },
});

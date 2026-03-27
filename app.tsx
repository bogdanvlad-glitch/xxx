# Roi du Quartier — MVP mobile (Expo + React Native + TypeScript)

Structure minimale du repo :

```text
roi-du-quartier/
  App.tsx
  app.json
  README.md
```

## 1) `App.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type DistrictId = 'centre' | 'universite' | 'tourisme';
type BusinessId = 'kiosque' | 'laverie' | 'foodtruck' | 'cafe' | 'parking' | 'hotel';

type DistrictConfig = {
  id: DistrictId;
  name: string;
  label: string;
  description: string;
  bonus: number;
  unlockCareerCash: number;
  accent: string;
};

type BusinessConfig = {
  id: BusinessId;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;
  baseIncome: number;
  unlockCareerCash: number;
};

type OwnedBusiness = {
  count: number;
  level: number;
};

type DistrictState = Record<BusinessId, OwnedBusiness>;

type SaveState = {
  cash: number;
  careerCash: number;
  prestigeLevel: number;
  tapPower: number;
  completedMissions: string[];
  districts: Record<DistrictId, DistrictState>;
  lastSavedAt: number;
};

type Mission = {
  id: string;
  title: string;
  reward: number;
  isCompleted: (state: SaveState) => boolean;
};

const STORAGE_KEY = 'roi_du_quartier_save_v1';

const DISTRICTS: DistrictConfig[] = [
  {
    id: 'centre',
    name: 'Centre',
    label: 'Centre-ville',
    description: 'Zone équilibrée, parfaite pour démarrer un petit empire local.',
    bonus: 1,
    unlockCareerCash: 0,
    accent: '#7C3AED',
  },
  {
    id: 'universite',
    name: 'Campus',
    label: 'Quartier étudiant',
    description: 'La restauration rapide et la laverie explosent ici.',
    bonus: 1.2,
    unlockCareerCash: 12000,
    accent: '#2563EB',
  },
  {
    id: 'tourisme',
    name: 'Tourisme',
    label: 'Zone touristique',
    description: 'Les parkings, cafés et hôtels y rapportent très gros.',
    bonus: 1.45,
    unlockCareerCash: 70000,
    accent: '#EA580C',
  },
];

const BUSINESSES: BusinessConfig[] = [
  {
    id: 'kiosque',
    name: 'Kiosque',
    emoji: '📰',
    description: 'Petit commerce à faible coût. Idéal pour lancer la machine.',
    baseCost: 50,
    baseIncome: 4,
    unlockCareerCash: 0,
  },
  {
    id: 'laverie',
    name: 'Laverie',
    emoji: '🧺',
    description: 'Excellent rendement dans les zones étudiantes.',
    baseCost: 180,
    baseIncome: 11,
    unlockCareerCash: 300,
  },
  {
    id: 'foodtruck',
    name: 'Food Truck',
    emoji: '🍔',
    description: 'Très rentable, avec une montée en puissance rapide.',
    baseCost: 450,
    baseIncome: 24,
    unlockCareerCash: 900,
  },
  {
    id: 'cafe',
    name: 'Café Premium',
    emoji: '☕',
    description: 'Fait grimper la valeur perçue du quartier.',
    baseCost: 1400,
    baseIncome: 72,
    unlockCareerCash: 5000,
  },
  {
    id: 'parking',
    name: 'Parking Privé',
    emoji: '🅿️',
    description: 'Génère de gros revenus passifs une fois lancé.',
    baseCost: 6000,
    baseIncome: 310,
    unlockCareerCash: 18000,
  },
  {
    id: 'hotel',
    name: 'Hôtel Boutique',
    emoji: '🏨',
    description: 'Le bâtiment signature pour les gros joueurs.',
    baseCost: 28000,
    baseIncome: 1400,
    unlockCareerCash: 85000,
  },
];

const MISSIONS: Mission[] = [
  {
    id: 'cash_2500',
    title: 'Atteins 2 500 € de cash',
    reward: 600,
    isCompleted: (state) => state.cash >= 2500,
  },
  {
    id: 'own_10',
    title: 'Possède 10 commerces au total',
    reward: 1500,
    isCompleted: (state) => getTotalBusinessCount(state) >= 10,
  },
  {
    id: 'career_10000',
    title: 'Génère 10 000 € au total',
    reward: 2200,
    isCompleted: (state) => state.careerCash >= 10000,
  },
  {
    id: 'level_5',
    title: 'Monte un commerce au niveau 5',
    reward: 4000,
    isCompleted: (state) => hasBusinessLevel(state, 5),
  },
  {
    id: 'career_100000',
    title: 'Génère 100 000 € au total',
    reward: 12000,
    isCompleted: (state) => state.careerCash >= 100000,
  },
];

function createDistrictState(): DistrictState {
  return {
    kiosque: { count: 0, level: 1 },
    laverie: { count: 0, level: 1 },
    foodtruck: { count: 0, level: 1 },
    cafe: { count: 0, level: 1 },
    parking: { count: 0, level: 1 },
    hotel: { count: 0, level: 1 },
  };
}

function createInitialState(prestigeLevel = 0): SaveState {
  return {
    cash: 150,
    careerCash: 0,
    prestigeLevel,
    tapPower: 18 + prestigeLevel * 8,
    completedMissions: [],
    districts: {
      centre: createDistrictState(),
      universite: createDistrictState(),
      tourisme: createDistrictState(),
    },
    lastSavedAt: Date.now(),
  };
}

function money(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.floor(value));
}

function prestigeMultiplier(level: number) {
  return 1 + level * 0.25;
}

function getDistrictById(id: DistrictId) {
  return DISTRICTS.find((district) => district.id === id)!;
}

function getBusinessById(id: BusinessId) {
  return BUSINESSES.find((business) => business.id === id)!;
}

function getBuyCost(state: SaveState, districtId: DistrictId, businessId: BusinessId) {
  const business = getBusinessById(businessId);
  const owned = state.districts[districtId][businessId].count;
  return Math.floor(business.baseCost * Math.pow(1.18, owned));
}

function getUpgradeCost(state: SaveState, districtId: DistrictId, businessId: BusinessId) {
  const business = getBusinessById(businessId);
  const level = state.districts[districtId][businessId].level;
  return Math.floor(business.baseCost * 2.8 * Math.pow(1.7, level - 1));
}

function getBusinessIncomePerSecond(
  state: SaveState,
  districtId: DistrictId,
  businessId: BusinessId
) {
  const district = getDistrictById(districtId);
  const business = getBusinessById(businessId);
  const owned = state.districts[districtId][businessId];

  if (owned.count <= 0) return 0;

  const levelMultiplier = 1 + (owned.level - 1) * 0.65;
  const prestige = prestigeMultiplier(state.prestigeLevel);

  return owned.count * business.baseIncome * district.bonus * levelMultiplier * prestige;
}

function getIncomePerSecond(state: SaveState) {
  return DISTRICTS.reduce((districtAcc, district) => {
    const districtIncome = BUSINESSES.reduce((businessAcc, business) => {
      return businessAcc + getBusinessIncomePerSecond(state, district.id, business.id);
    }, 0);
    return districtAcc + districtIncome;
  }, 0);
}

function getTotalBusinessCount(state: SaveState) {
  return DISTRICTS.reduce((districtAcc, district) => {
    return (
      districtAcc +
      BUSINESSES.reduce((businessAcc, business) => {
        return businessAcc + state.districts[district.id][business.id].count;
      }, 0)
    );
  }, 0);
}

function hasBusinessLevel(state: SaveState, minLevel: number) {
  return DISTRICTS.some((district) =>
    BUSINESSES.some((business) => state.districts[district.id][business.id].level >= minLevel)
  );
}

function getPrestigeTarget(state: SaveState) {
  return 250000 * (state.prestigeLevel + 1);
}

function canUnlockDistrict(state: SaveState, district: DistrictConfig) {
  return state.careerCash >= district.unlockCareerCash;
}

export default function App() {
  const [state, setState] = useState<SaveState>(createInitialState());
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>('centre');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setLoading(false);
          return;
        }

        const parsed: SaveState = JSON.parse(raw);
        const now = Date.now();
        const elapsedSeconds = Math.min(
          60 * 60 * 8,
          Math.max(0, Math.floor((now - parsed.lastSavedAt) / 1000))
        );
        const offlineGain = getIncomePerSecond(parsed) * elapsedSeconds;

        const hydrated: SaveState = {
          ...parsed,
          cash: parsed.cash + offlineGain,
          careerCash: parsed.careerCash + offlineGain,
          lastSavedAt: now,
        };

        setState(hydrated);
        if (offlineGain > 0) {
          setBanner(`Retour réussi : ${money(offlineGain)} gagnés hors ligne.`);
        }
      } catch (error) {
        console.error('Load failed', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      setState((prev) => {
        const income = getIncomePerSecond(prev);
        return {
          ...prev,
          cash: prev.cash + income,
          careerCash: prev.careerCash + income,
          lastSavedAt: Date.now(),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastSavedAt: Date.now() })).catch(
      (error) => console.error('Save failed', error)
    );
  }, [state, loading]);

  useEffect(() => {
    if (loading) return;

    const newlyCompleted = MISSIONS.filter(
      (mission) =>
        !state.completedMissions.includes(mission.id) && mission.isCompleted(state)
    );

    if (newlyCompleted.length === 0) return;

    const reward = newlyCompleted.reduce((sum, mission) => sum + mission.reward, 0);

    setState((prev) => ({
      ...prev,
      cash: prev.cash + reward,
      careerCash: prev.careerCash + reward,
      completedMissions: [...prev.completedMissions, ...newlyCompleted.map((m) => m.id)],
      lastSavedAt: Date.now(),
    }));

    setBanner(`Mission accomplie : +${money(reward)}`);
  }, [state, loading]);

  useEffect(() => {
    if (!banner) return;
    const timeout = setTimeout(() => setBanner(null), 3200);
    return () => clearTimeout(timeout);
  }, [banner]);

  const incomePerSecond = useMemo(() => getIncomePerSecond(state), [state]);
  const currentDistrict = getDistrictById(selectedDistrict);
  const prestigeGoal = getPrestigeTarget(state);
  const prestigeReady = state.careerCash >= prestigeGoal;

  const handleTap = () => {
    const gain = state.tapPower * prestigeMultiplier(state.prestigeLevel);
    setState((prev) => ({
      ...prev,
      cash: prev.cash + gain,
      careerCash: prev.careerCash + gain,
      lastSavedAt: Date.now(),
    }));
  };

  const handleBuy = (businessId: BusinessId) => {
    const district = getDistrictById(selectedDistrict);
    const business = getBusinessById(businessId);

    if (!canUnlockDistrict(state, district)) {
      setBanner(`Quartier verrouillé : il faut ${money(district.unlockCareerCash)} générés.`);
      return;
    }

    if (state.careerCash < business.unlockCareerCash) {
      setBanner(`Commerce verrouillé : il faut ${money(business.unlockCareerCash)} générés.`);
      return;
    }

    const cost = getBuyCost(state, selectedDistrict, businessId);
    if (state.cash < cost) {
      setBanner('Pas assez de cash pour acheter ce commerce.');
      return;
    }

    setState((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      districts: {
        ...prev.districts,
        [selectedDistrict]: {
          ...prev.districts[selectedDistrict],
          [businessId]: {
            ...prev.districts[selectedDistrict][businessId],
            count: prev.districts[selectedDistrict][businessId].count + 1,
          },
        },
      },
      lastSavedAt: Date.now(),
    }));
  };

  const handleUpgrade = (businessId: BusinessId) => {
    const owned = state.districts[selectedDistrict][businessId];
    if (owned.count <= 0) {
      setBanner('Achète d’abord ce commerce avant de l’améliorer.');
      return;
    }

    const cost = getUpgradeCost(state, selectedDistrict, businessId);
    if (state.cash < cost) {
      setBanner('Pas assez de cash pour améliorer ce commerce.');
      return;
    }

    setState((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      districts: {
        ...prev.districts,
        [selectedDistrict]: {
          ...prev.districts[selectedDistrict],
          [businessId]: {
            ...prev.districts[selectedDistrict][businessId],
            level: prev.districts[selectedDistrict][businessId].level + 1,
          },
        },
      },
      lastSavedAt: Date.now(),
    }));
  };

  const handlePrestige = () => {
    if (!prestigeReady) {
      setBanner(`Prestige verrouillé : objectif ${money(prestigeGoal)} générés.`);
      return;
    }

    Alert.alert(
      'Passer au prestige ?',
      'Tu réinitialises tes commerces mais tu gagnes un bonus permanent de revenus et de tap.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Prestige',
          style: 'default',
          onPress: () => {
            const nextPrestige = state.prestigeLevel + 1;
            setState(createInitialState(nextPrestige));
            setSelectedDistrict('centre');
            setBanner(`Prestige ${nextPrestige} activé : revenus globaux améliorés.`);
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert('Réinitialiser ?', 'Toute la progression sera effacée.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setState(createInitialState());
          setSelectedDistrict('centre');
          setBanner('Sauvegarde supprimée. Nouveau départ.');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loaderWrap}>
          <Text style={styles.title}>Roi du Quartier</Text>
          <Text style={styles.subtitle}>Chargement de ton empire…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.eyebrow}>TYCOON MOBILE</Text>
              <Text style={styles.title}>Roi du Quartier</Text>
              <Text style={styles.subtitle}>Construis ton empire local, quartier par quartier.</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Prestige {state.prestigeLevel}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Cash</Text>
              <Text style={styles.statValue}>{money(state.cash)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>/ seconde</Text>
              <Text style={styles.statValue}>{money(incomePerSecond)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Généré total</Text>
              <Text style={styles.statValue}>{money(state.careerCash)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Commerces</Text>
              <Text style={styles.statValue}>{getTotalBusinessCount(state)}</Text>
            </View>
          </View>

          <Pressable style={styles.tapButton} onPress={handleTap}>
            <Text style={styles.tapButtonText}>Collecter {money(state.tapPower * prestigeMultiplier(state.prestigeLevel))}</Text>
            <Text style={styles.tapButtonSubtext}>Tape pour accélérer ton empire</Text>
          </Pressable>
        </View>

        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quartiers</Text>
          <Text style={styles.sectionSub}>Choisis où investir en priorité.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {DISTRICTS.map((district) => {
            const unlocked = canUnlockDistrict(state, district);
            const selected = selectedDistrict === district.id;
            return (
              <Pressable
                key={district.id}
                onPress={() => unlocked && setSelectedDistrict(district.id)}
                style={[
                  styles.districtCard,
                  { borderColor: selected ? district.accent : '#1F2937' },
                  !unlocked && styles.lockedCard,
                ]}
              >
                <View style={[styles.colorDot, { backgroundColor: district.accent }]} />
                <Text style={styles.districtName}>{district.label}</Text>
                <Text style={styles.districtDesc}>{district.description}</Text>
                <Text style={styles.districtBonus}>Bonus x{district.bonus.toFixed(2)}</Text>
                <Text style={styles.unlockText}>
                  {unlocked ? 'Débloqué' : `Déblocage à ${money(district.unlockCareerCash)}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.focusCard, { borderColor: currentDistrict.accent }]}>
          <Text style={styles.focusTitle}>{currentDistrict.label}</Text>
          <Text style={styles.focusText}>{currentDistrict.description}</Text>
          <Text style={styles.focusText}>Bonus de revenus : x{currentDistrict.bonus.toFixed(2)}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Commerces</Text>
          <Text style={styles.sectionSub}>Achète, améliore, puis laisse tourner la machine.</Text>
        </View>

        {BUSINESSES.map((business) => {
          const owned = state.districts[selectedDistrict][business.id];
          const buyCost = getBuyCost(state, selectedDistrict, business.id);
          const upgradeCost = getUpgradeCost(state, selectedDistrict, business.id);
          const passiveIncome = getBusinessIncomePerSecond(state, selectedDistrict, business.id);
          const unlocked = state.careerCash >= business.unlockCareerCash;

          return (
            <View key={business.id} style={[styles.businessCard, !unlocked && styles.lockedCard]}>
              <View style={styles.rowBetweenTop}>
                <View style={styles.rowLeft}>
                  <Text style={styles.businessEmoji}>{business.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.businessName}>{business.name}</Text>
                    <Text style={styles.businessDesc}>{business.description}</Text>
                  </View>
                </View>
                <View style={styles.smallBadge}>
                  <Text style={styles.smallBadgeText}>Niv. {owned.level}</Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricPill}>
                  <Text style={styles.metricLabel}>Possédés</Text>
                  <Text style={styles.metricValue}>{owned.count}</Text>
                </View>
                <View style={styles.metricPill}>
                  <Text style={styles.metricLabel}>Revenus</Text>
                  <Text style={styles.metricValue}>{money(passiveIncome)}/s</Text>
                </View>
              </View>

              {!unlocked ? (
                <Text style={styles.unlockText}>Déblocage à {money(business.unlockCareerCash)} générés</Text>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable style={styles.buyButton} onPress={() => handleBuy(business.id)}>
                  <Text style={styles.buyButtonText}>Acheter</Text>
                  <Text style={styles.buyButtonPrice}>{money(buyCost)}</Text>
                </Pressable>
                <Pressable style={styles.upgradeButton} onPress={() => handleUpgrade(business.id)}>
                  <Text style={styles.upgradeButtonText}>Améliorer</Text>
                  <Text style={styles.upgradeButtonPrice}>{money(upgradeCost)}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Missions</Text>
          <Text style={styles.sectionSub}>Des récompenses courtes pour renforcer l’addiction positive.</Text>
        </View>

        {MISSIONS.map((mission) => {
          const done = state.completedMissions.includes(mission.id);
          return (
            <View key={mission.id} style={[styles.missionCard, done && styles.missionDone]}>
              <View>
                <Text style={styles.missionTitle}>{mission.title}</Text>
                <Text style={styles.missionReward}>Récompense : {money(mission.reward)}</Text>
              </View>
              <Text style={styles.missionState}>{done ? '✓ Fait' : 'En cours'}</Text>
            </View>
          );
        })}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prestige</Text>
          <Text style={styles.sectionSub}>Reset contre bonus permanent. C’est la boucle de rétention principale.</Text>
        </View>

        <View style={styles.prestigeCard}>
          <Text style={styles.prestigeTitle}>Objectif prestige</Text>
          <Text style={styles.prestigeText}>
            Progression : {money(state.careerCash)} / {money(prestigeGoal)}
          </Text>
          <Text style={styles.prestigeText}>
            Bonus actuel : x{prestigeMultiplier(state.prestigeLevel).toFixed(2)} sur les revenus passifs
          </Text>
          <Text style={styles.prestigeText}>
            Prochain bonus : x{prestigeMultiplier(state.prestigeLevel + 1).toFixed(2)}
          </Text>

          <Pressable
            style={[styles.prestigeButton, !prestigeReady && styles.prestigeDisabled]}
            onPress={handlePrestige}
          >
            <Text style={styles.prestigeButtonText}>
              {prestigeReady ? 'Passer au prestige' : 'Prestige verrouillé'}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Réinitialiser la sauvegarde</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  content: {
    padding: 18,
    paddingBottom: 48,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heroCard: {
    backgroundColor: '#11182E',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  eyebrow: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
    maxWidth: 260,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowBetweenTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  badge: {
    backgroundColor: '#1F163D',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3B2A75',
  },
  badgeText: {
    color: '#C4B5FD',
    fontWeight: '800',
    fontSize: 12,
  },
  statsGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  tapButton: {
    marginTop: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tapButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  tapButtonSubtext: {
    color: '#E9D5FF',
    fontSize: 12,
    marginTop: 4,
  },
  banner: {
    backgroundColor: '#132238',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1D3557',
    marginBottom: 16,
  },
  bannerText: {
    color: '#DBEAFE',
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSub: {
    color: '#94A3B8',
    marginTop: 3,
    fontSize: 13,
  },
  horizontalList: {
    gap: 10,
    paddingBottom: 6,
  },
  districtCard: {
    width: 220,
    backgroundColor: '#101827',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  lockedCard: {
    opacity: 0.6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginBottom: 12,
  },
  districtName: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 17,
    marginBottom: 6,
  },
  districtDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    minHeight: 56,
  },
  districtBonus: {
    color: '#E2E8F0',
    fontWeight: '700',
    marginTop: 10,
  },
  unlockText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
  },
  focusCard: {
    backgroundColor: '#101827',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  focusTitle: {
    color: '#F8FAFC',
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 6,
  },
  focusText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
  },
  businessCard: {
    backgroundColor: '#101827',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  businessEmoji: {
    fontSize: 28,
  },
  businessName: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 17,
    marginBottom: 4,
  },
  businessDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  smallBadge: {
    backgroundColor: '#172036',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#23314D',
  },
  smallBadgeText: {
    color: '#BFDBFE',
    fontWeight: '800',
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  metricPill: {
    flex: 1,
    backgroundColor: '#0B1220',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  buyButton: {
    flex: 1,
    backgroundColor: '#1D4ED8',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  buyButtonPrice: {
    color: '#DBEAFE',
    marginTop: 3,
    fontSize: 12,
  },
  upgradeButton: {
    flex: 1,
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  upgradeButtonPrice: {
    color: '#CCFBF1',
    marginTop: 3,
    fontSize: 12,
  },
  missionCard: {
    backgroundColor: '#101827',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  missionDone: {
    borderColor: '#14532D',
    backgroundColor: '#0E1A15',
  },
  missionTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    marginBottom: 4,
    maxWidth: 240,
  },
  missionReward: {
    color: '#94A3B8',
    fontSize: 12,
  },
  missionState: {
    color: '#86EFAC',
    fontWeight: '900',
  },
  prestigeCard: {
    backgroundColor: '#1A1330',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38205E',
    marginBottom: 14,
  },
  prestigeTitle: {
    color: '#F8FAFC',
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 10,
  },
  prestigeText: {
    color: '#DDD6FE',
    lineHeight: 20,
    marginBottom: 5,
  },
  prestigeButton: {
    marginTop: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  prestigeDisabled: {
    opacity: 0.55,
  },
  prestigeButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  resetButton: {
    marginTop: 4,
    marginBottom: 30,
    alignItems: 'center',
    padding: 14,
  },
  resetButtonText: {
    color: '#94A3B8',
    fontWeight: '700',
  },
});
```

## 2) `app.json`

```json
{
  "expo": {
    "name": "Roi du Quartier",
    "slug": "roi-du-quartier",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "splash": {
      "resizeMode": "contain",
      "backgroundColor": "#0B1020"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0B1020"
      }
    },
    "web": {
      "bundler": "metro"
    }
  }
}
```

## 3) `README.md`

````md
# Roi du Quartier

MVP mobile d'un jeu de tycoon/idle game pensé pour mobile.

## Stack
- Expo
- React Native
- TypeScript
- AsyncStorage pour la sauvegarde locale

## Installation

Option recommandée pour ce code :

```bash
npx create-expo-app@latest roi-du-quartier --template default@sdk-55
cd roi-du-quartier
npx expo install @react-native-async-storage/async-storage
````

Si tu veux absolument tester avec un projet Expo Go en mode transition, tu peux aussi générer un projet SDK 54 avec `npx create-expo-app@latest` puis y coller les fichiers.

Ensuite :

* remplace `App.tsx` par le fichier fourni
* remplace `app.json` par le fichier fourni
* lance le projet

```bash
npx expo start
```

## Boucle de jeu

* revenus passifs par seconde
* tap pour accélérer les gains
* quartiers avec multiplicateurs
* commerces achetables et améliorables
* missions automatiques
* prestige avec bonus permanent
* sauvegarde locale + gains hors ligne

## Idées de monétisation à ajouter ensuite

* pub récompensée : x2 revenus pendant 3 minutes
* achat intégré : suppression pub
* achat intégré : boost permanent x2
* skins premium de quartiers
* managers auto qui achètent automatiquement

## Roadmap simple

* ajouter des sons
* ajouter de vraies icônes
* animer le bouton de collecte
* équilibrer les coûts/revenus
* brancher AdMob et achats intégrés
* ajouter un écran d'accueil + settings

```
```

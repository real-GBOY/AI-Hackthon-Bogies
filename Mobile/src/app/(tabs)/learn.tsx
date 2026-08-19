import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PatientCard } from '@/components/patient/patient-card';
import { PatientScreen } from '@/components/patient/patient-screen';
import { ErrorState, LoadingState } from '@/components/patient/screen-status';
import { PatientColors, ToneColors } from '@/constants/patient-theme';
import { useLearnArticles } from '@/hooks/use-learn-articles';

export default function LearnScreen() {
  const { articles, status, error } = useLearnArticles();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const items = useMemo(
    () => articles.filter((item) => !normalized || item.title.toLowerCase().includes(normalized)),
    [articles, normalized],
  );
  const featured = items.find((item) => item.featured);
  const rest = items.filter((item) => !item.featured);

  if (status === 'loading') {
    return (
      <PatientScreen>
        <LoadingState label="Loading learn topics…" />
      </PatientScreen>
    );
  }

  if (status === 'error') {
    return (
      <PatientScreen>
        <ErrorState message={error ?? undefined} />
      </PatientScreen>
    );
  }

  return (
    <PatientScreen>
      <Text style={styles.title}>Learn</Text>

      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search topics"
          placeholderTextColor={PatientColors.textFaint}
          style={styles.searchInput}
        />
      </View>

      {featured && (
        <Pressable onPress={() => router.push(`/learn/${featured.slug}`)}>
          <PatientCard>
            <View style={styles.illustration} />
            <Text style={styles.featuredTitle}>{featured.title}</Text>
            <Text style={styles.meta}>{featured.meta}</Text>
          </PatientCard>
        </Pressable>
      )}

      {rest.map((item) => (
        <Pressable key={item.slug} onPress={() => router.push(`/learn/${item.slug}`)}>
          <PatientCard style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: ToneColors[item.tone].bg }]} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.meta}>{item.meta}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </PatientCard>
        </Pressable>
      ))}

      {items.length === 0 && <Text style={styles.empty}>No topics match “{query}”.</Text>}
    </PatientScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: PatientColors.ink,
  },
  searchBar: {
    backgroundColor: PatientColors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 16,
    color: PatientColors.ink,
  },
  illustration: {
    width: '100%',
    height: 96,
    borderRadius: 14,
    backgroundColor: PatientColors.overlayTint,
  },
  featuredTitle: {
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 24.7,
    color: PatientColors.ink,
  },
  featuredDetail: {
    fontSize: 15,
    lineHeight: 23.25,
    color: PatientColors.body,
  },
  meta: {
    fontSize: 13.5,
    color: PatientColors.textFaint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: PatientColors.ink,
  },
  chevron: {
    fontSize: 24,
    color: PatientColors.chevron,
  },
  empty: {
    fontSize: 14,
    color: PatientColors.textMuted,
    textAlign: 'center',
    paddingTop: 24,
  },
});

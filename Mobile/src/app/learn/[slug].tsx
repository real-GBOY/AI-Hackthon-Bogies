import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PatientCard } from '@/components/patient/patient-card';
import { PatientScreen } from '@/components/patient/patient-screen';
import { ErrorState, LoadingState } from '@/components/patient/screen-status';
import { PatientColors } from '@/constants/patient-theme';
import { useLearnArticle } from '@/hooks/use-learn-article';

export default function LearnArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { article, status } = useLearnArticle(slug);

  if (status === 'loading') {
    return (
      <PatientScreen isPushedScreen>
        <Stack.Screen options={{ title: 'Learn' }} />
        <LoadingState label="Loading article…" />
      </PatientScreen>
    );
  }

  if (status === 'error') {
    return (
      <PatientScreen isPushedScreen>
        <Stack.Screen options={{ title: 'Learn' }} />
        <ErrorState />
      </PatientScreen>
    );
  }

  return (
    <PatientScreen isPushedScreen>
      <Stack.Screen options={{ title: article?.title ?? 'Learn' }} />

      <PatientCard>
        <View style={styles.illustration} />
        <Text style={styles.title}>{article?.title ?? 'Article not found'}</Text>
        {article?.meta && <Text style={styles.meta}>{article.meta}</Text>}
        {article?.detail ? (
          <Text style={styles.body}>{article.detail}</Text>
        ) : (
          <Text style={styles.placeholder}>{"Full article content isn't available in this preview yet."}</Text>
        )}
      </PatientCard>

      <Text style={styles.disclaimer}>
        HDP Intelligence does not provide medical advice. Always contact your care team about symptoms.
      </Text>
    </PatientScreen>
  );
}

const styles = StyleSheet.create({
  illustration: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    backgroundColor: PatientColors.overlayTint,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28.6,
    color: PatientColors.ink,
  },
  meta: {
    fontSize: 13.5,
    color: PatientColors.textFaint,
  },
  body: {
    fontSize: 16,
    lineHeight: 25.6,
    color: PatientColors.body,
  },
  placeholder: {
    fontSize: 15,
    lineHeight: 22.5,
    color: PatientColors.textMuted,
    fontStyle: 'italic',
  },
  disclaimer: {
    fontSize: 13.5,
    color: PatientColors.textFaint,
    textAlign: 'center',
    lineHeight: 19.5,
  },
});

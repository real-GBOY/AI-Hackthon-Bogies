import { useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusDot } from '@/components/patient/status-dot';
import { Spacing } from '@/constants/theme';
import { PatientColors, PatientRadii, PatientShadow } from '@/constants/patient-theme';
import { usePatientProfileContext } from '@/context/patient-profile-context';
import { useRagQuery } from '@/hooks/use-rag-query';
import type { RagCitation } from '@/types/clinical';

type ChatTurn =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string; refused: boolean; citations: RagCitation[] }
  | { id: string; kind: 'escalation'; text: string }
  | { id: string; kind: 'error'; text: string };

let turnCounter = 0;
function nextId() {
  turnCounter += 1;
  return `turn-${turnCounter}`;
}

function renderWithCitations(text: string) {
  const parts = text.split(/(\[[^[\]]+\])/g);
  return parts.map((part, i) => {
    const isCitation = /^\[[^\]]+\]$/.test(part);
    if (!isCitation) return <Text key={i}>{part}</Text>;
    return (
      <Text key={i} style={styles.citationMarker}>
        {' '}
        [source]
      </Text>
    );
  });
}

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePatientProfileContext();
  const content = profile?.app_content;
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const { status, ask } = useRagQuery();
  const scrollRef = useRef<ScrollView>(null);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status === 'loading') return;

    setTurns((prev) => [...prev, { id: nextId(), kind: 'user', text: trimmed }]);
    setQuestion('');

    const response = await ask(trimmed, 'patient');
    if (!response) {
      setTurns((prev) => [...prev, { id: nextId(), kind: 'error', text: "Couldn't reach the assistant. Please try again." }]);
    } else if (response.escalation_flag) {
      setTurns((prev) => [...prev, { id: nextId(), kind: 'escalation', text: response.answer }]);
    } else {
      setTurns((prev) => [
        ...prev,
        { id: nextId(), kind: 'assistant', text: response.answer, refused: response.refused, citations: response.citations },
      ]);
    }

    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  const isEmpty = turns.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <Text style={styles.headerTitle}>Ask</Text>
        <View style={styles.headerSubtitleRow}>
          <StatusDot color={PatientColors.green} size={6} />
          <Text style={styles.headerSubtitle}>Uses your pregnancy record</Text>
        </View>
      </View>

      {isEmpty ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.emptyState}
          showsVerticalScrollIndicator={false}>
          <View style={styles.emptyIcon}>
            <StatusDot color={PatientColors.white} size={12} />
          </View>
          <Text style={styles.emptyTitle}>
            What would you like to know{content ? `, ${content.first_name}` : ''}?
          </Text>
          <Text style={styles.emptyBody}>
            Ask about your pregnancy, your readings or anything your team has told you. Answers come from
            national pregnancy guidance and your own record.
          </Text>
          <Text style={styles.emptyNote}>
            If you have symptoms right now, contact your care team instead of asking here.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {turns.map((turn) => {
            if (turn.kind === 'user') {
              return (
                <View key={turn.id} style={styles.userBubbleRow}>
                  <Text style={styles.userBubbleText}>{turn.text}</Text>
                </View>
              );
            }
            if (turn.kind === 'escalation') {
              return (
                <View key={turn.id} style={styles.escalationCard}>
                  <Text style={styles.escalationTitle}>Please speak with your healthcare provider now</Text>
                  <Text style={styles.escalationBody}>{turn.text}</Text>
                  <View style={styles.escalationButton}>
                    <Text style={styles.escalationButtonText}>Call maternity triage</Text>
                  </View>
                  <View style={styles.escalationButtonSecondary}>
                    <Text style={styles.escalationButtonSecondaryText}>Message my care team</Text>
                  </View>
                  <Text style={styles.escalationFooter}>
                    If you feel very unwell, or symptoms get worse, contact your care team or your nearest
                    emergency department right away.
                  </Text>
                </View>
              );
            }
            if (turn.kind === 'error') {
              return (
                <View key={turn.id} style={styles.errorBubble}>
                  <Text style={styles.errorText}>{turn.text}</Text>
                </View>
              );
            }
            const showSources = expandedSources[turn.id] ?? false;
            return (
              <View key={turn.id} style={styles.assistantBubble}>
                <Text style={[styles.assistantText, turn.refused && styles.assistantTextRefused]}>
                  {renderWithCitations(turn.text)}
                </Text>
                {!turn.refused && turn.citations.length > 0 && (
                  <View style={styles.sourcesBlock}>
                    <Pressable onPress={() => setExpandedSources((prev) => ({ ...prev, [turn.id]: !showSources }))}>
                      <Text style={styles.sourcesToggle}>
                        {showSources ? 'Hide source' : 'Based on an official clinical guideline — see source'}
                      </Text>
                    </Pressable>
                    {showSources &&
                      turn.citations.map((c, i) => (
                        <Text key={i} style={styles.sourceItem}>
                          {c.source} p.{c.page}
                        </Text>
                      ))}
                  </View>
                )}
              </View>
            );
          })}
          {status === 'loading' && (
            <View style={styles.assistantBubble}>
              <View style={styles.typingRow}>
                <StatusDot color={PatientColors.chevron} size={7} />
                <StatusDot color={PatientColors.chevron} size={7} />
                <StatusDot color={PatientColors.chevron} size={7} />
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <View style={[styles.composer, { paddingBottom: insets.bottom + Spacing.two }]}>
        {isEmpty && content && content.suggested_questions.length > 0 && (
          <View style={styles.suggestions}>
            <SectionCaption>Try asking</SectionCaption>
            {content.suggested_questions.map((q) => (
              <Pressable key={q} style={styles.suggestionChip} onPress={() => submit(q)}>
                <Text style={styles.suggestionText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Message"
            placeholderTextColor={PatientColors.textFaint}
            style={styles.input}
            editable={status !== 'loading'}
            onSubmitEditing={() => submit(question)}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={() => submit(question)}
            disabled={!question.trim() || status === 'loading'}
            style={({ pressed }) => [
              styles.sendButton,
              (!question.trim() || status === 'loading') && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}>
            <Text style={styles.sendButtonText}>↑</Text>
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>Not medical advice. For symptoms, contact your care team.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionCaption({ children }: { children: ReactNode }) {
  return <Text style={styles.suggestionsLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: PatientColors.screenBackground },
  // expo-router's web tab-screen wrapper renders with flex-shrink:0, so a
  // plain flex:1 root never gets clamped to the viewport when chat content
  // grows past it — absolute-filling the (already position:relative) tab
  // slot routes around that instead of depending on the broken shrink chain.
  screen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PatientColors.screenBackground,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: 2,
    backgroundColor: PatientColors.screenBackground,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: PatientColors.ink,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: PatientColors.textMuted,
  },
  emptyState: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    gap: 14,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: PatientColors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 31.2,
    letterSpacing: -0.3,
    color: PatientColors.ink,
  },
  emptyBody: {
    fontSize: 16,
    lineHeight: 25.6,
    color: PatientColors.body,
  },
  emptyNote: {
    fontSize: 14,
    lineHeight: 21.7,
    color: PatientColors.textMuted,
  },
  messages: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: 14,
  },
  userBubbleRow: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    backgroundColor: PatientColors.ink,
    borderRadius: 20,
    borderBottomRightRadius: 7,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  userBubbleText: {
    color: PatientColors.white,
    fontSize: 16,
    lineHeight: 24,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: PatientColors.card,
    borderRadius: 20,
    borderBottomLeftRadius: 7,
    padding: 17,
    gap: 11,
    ...PatientShadow,
  },
  assistantText: {
    fontSize: 16,
    lineHeight: 25.6,
    color: PatientColors.ink,
  },
  assistantTextRefused: {
    color: PatientColors.textMuted,
    fontStyle: 'italic',
  },
  citationMarker: {
    fontSize: 12,
    color: PatientColors.purple,
  },
  sourcesBlock: {
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PatientColors.divider,
    gap: 6,
  },
  sourcesToggle: {
    fontSize: 13,
    color: PatientColors.purple,
    fontWeight: '500',
  },
  sourceItem: {
    fontSize: 13,
    color: PatientColors.textMuted,
  },
  typingRow: {
    flexDirection: 'row',
    gap: 6,
  },
  errorBubble: {
    alignSelf: 'stretch',
    backgroundColor: PatientColors.redTint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PatientColors.redBorder,
    padding: 14,
  },
  errorText: {
    fontSize: 14,
    color: PatientColors.redDark,
  },
  escalationCard: {
    alignSelf: 'stretch',
    backgroundColor: PatientColors.card,
    borderRadius: 20,
    borderTopWidth: 4,
    borderTopColor: PatientColors.red,
    padding: 22,
    gap: 14,
    ...PatientShadow,
  },
  escalationTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.1,
    color: PatientColors.ink,
  },
  escalationBody: {
    fontSize: 16,
    lineHeight: 25.6,
    color: PatientColors.body,
  },
  escalationButton: {
    backgroundColor: PatientColors.red,
    borderRadius: PatientRadii.control,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalationButtonText: {
    color: PatientColors.white,
    fontSize: 16.5,
    fontWeight: '600',
  },
  escalationButtonSecondary: {
    backgroundColor: PatientColors.overlayTint,
    borderRadius: PatientRadii.control,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalationButtonSecondaryText: {
    color: PatientColors.ink,
    fontSize: 16,
    fontWeight: '500',
  },
  escalationFooter: {
    fontSize: 13.5,
    lineHeight: 19.5,
    color: PatientColors.textMuted,
  },
  composer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: 11,
    backgroundColor: PatientColors.screenBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PatientColors.divider,
  },
  suggestions: {
    gap: 10,
  },
  suggestionsLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: PatientColors.textFaint,
    textTransform: 'uppercase',
  },
  suggestionChip: {
    backgroundColor: PatientColors.card,
    borderRadius: 16,
    paddingHorizontal: 18,
    minHeight: 48,
    justifyContent: 'center',
    ...PatientShadow,
  },
  suggestionText: {
    fontSize: 15.5,
    color: PatientColors.ink,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PatientColors.card,
    borderRadius: PatientRadii.chip,
    paddingLeft: 18,
    paddingRight: 6,
    minHeight: 56,
    ...PatientShadow,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: PatientColors.ink,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PatientColors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: PatientColors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12.5,
    color: PatientColors.textFaint,
    textAlign: 'center',
    lineHeight: 18,
  },
});

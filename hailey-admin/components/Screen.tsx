// components/Screen.tsx: page frame with a header (optional back link, title, actions)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, MAX_CONTENT_WIDTH } from '../theme';

export function Screen({
  title,
  onBack,
  right,
  children,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerInner}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button">
              <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <View style={styles.right}>{right}</View>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: 12,
  },
  back: { paddingVertical: 4 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { flex: 1, fontSize: 20, fontWeight: 'bold' },
  right: { flexDirection: 'row', gap: 8 },
  body: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});

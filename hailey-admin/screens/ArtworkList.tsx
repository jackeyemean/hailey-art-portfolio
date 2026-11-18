// screens/ArtworkList.tsx: home screen, every artwork with search and collection filters
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, TouchableOpacity, Text, View, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, Artwork, CollectionSummary } from '../types';
import { getArtworks, getCollections, errorMessage } from '../api';
import { useTheme, MAX_CONTENT_WIDTH } from '../theme';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Thumbnail } from '../components/Thumbnail';

type Props = NativeStackScreenProps<RootStackParamList, 'List'>;

const ALL = 'all';
const UNFILED = 'unfiled';

export default function ArtworkList({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>(ALL);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"

  // Reload whenever the screen comes back into view, so edits made elsewhere show up
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadError('');
      Promise.all([getArtworks(), getCollections()])
        .then(([a, c]) => {
          if (!active) return;
          setArtworks(a);
          setCollections(c);
          setLoadError('');
        })
        .catch((e) => active && setLoadError(errorMessage(e, 'Could not load artworks.')))
        .finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [attempt]),
  );

  const unfiledCount = artworks.filter((a) => a.collections.length === 0).length;

  // A filter that no longer applies (collection deleted, nothing unfiled) falls back to All
  const activeFilter =
    filter === ALL || (filter === UNFILED && unfiledCount > 0) || collections.some((c) => c.id === filter) ? filter : ALL;
  const collectionFilter = activeFilter !== ALL && activeFilter !== UNFILED ? activeFilter : undefined;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return artworks.filter((a) => {
      if (activeFilter === UNFILED && a.collections.length > 0) return false;
      if (collectionFilter && !a.collections.some((c) => c.id === collectionFilter)) return false;
      return !query || a.title.toLowerCase().includes(query);
    });
  }, [artworks, search, activeFilter, collectionFilter]);

  const chips = [
    { key: ALL, label: `All (${artworks.length})` },
    ...collections.map((c) => ({ key: c.id, label: `${c.name} (${c.artworkCount})` })),
    ...(unfiledCount > 0 ? [{ key: UNFILED, label: `No collection (${unfiledCount})` }] : []),
  ];

  return (
    <Screen
      title="Admin Atelier"
      right={
        <>
          <Button small variant="secondary" title="Collections" onPress={() => navigation.navigate('Collections')} />
          <Button small variant="secondary" title="Profile" onPress={() => navigation.navigate('ProfileForm')} />
        </>
      }
    >
      <View style={styles.controls}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title"
          placeholderTextColor={colors.muted}
          style={[styles.search, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          clearButtonMode="while-editing"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chips.map((chip) => {
            const active = chip.key === activeFilter;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, { backgroundColor: active ? colors.primary : colors.chip }]}
              >
                <Text style={{ color: active ? colors.onPrimary : colors.text, fontWeight: active ? '600' : '400' }}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.status} color={colors.primary} />
      ) : loadError ? (
        <View style={styles.status}>
          <Text style={{ color: colors.danger, marginBottom: 12 }}>{loadError}</Text>
          <Button small variant="secondary" title="Try again" onPress={() => { setLoading(true); setAttempt((n) => n + 1); }} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 96 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>
              {search ? 'No artworks match your search.' : 'No artworks here yet.'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => navigation.navigate('Form', { artworkId: item.id })}
              accessibilityRole="button"
            >
              <Thumbnail uri={item.imageUrl} />
              <View style={styles.rowText}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={{ color: item.collections.length ? colors.muted : colors.warning }} numberOfLines={1}>
                  {item.collections.length ? item.collections.map((c) => c.name).join(' · ') : 'No collection'}
                </Text>
              </View>
              {item.isArtistPick ? (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>Artist's Pick</Text>
                </View>
              ) : null}
              <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title="Add Artwork"
          onPress={() => navigation.navigate('Form', collectionFilter ? { collectionId: collectionFilter } : {})}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  search: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  chips: { gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  status: { padding: 24, alignItems: 'center' },
  empty: { textAlign: 'center', padding: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 22 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
});

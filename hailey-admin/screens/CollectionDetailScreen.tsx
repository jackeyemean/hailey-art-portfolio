// screens/CollectionDetailScreen.tsx: rename a collection, order its artworks, choose its cover
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CollectionDetail, CollectionArtwork } from '../types';
import { getCollection, updateCollection, deleteCollection, errorMessage } from '../api';
import { useTheme } from '../theme';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Thumbnail } from '../components/Thumbnail';
import { MoveButtons, move } from '../components/MoveButtons';
import { useLeaveGuard } from '../components/useLeaveGuard';
import ConfirmationModal from '../components/ConfirmationModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CollectionDetail'>;

export default function CollectionDetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { collectionId } = route.params;

  const [saved, setSaved] = useState<CollectionDetail | null>(null);
  const [name, setName] = useState(route.params.name);
  const [artworks, setArtworks] = useState<CollectionArtwork[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The cover shown on the site: the chosen one, or the first artwork if none is chosen
  const effectiveCoverId = coverId ?? artworks[0]?.id ?? null;

  const isDirty = Boolean(
    saved &&
      (name.trim() !== saved.name ||
        coverId !== saved.coverArtworkId ||
        artworks.map((a) => a.id).join() !== saved.artworks.map((a) => a.id).join()),
  );
  const { leave, modal: leaveModal } = useLeaveGuard(navigation, isDirty);
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  const apply = (detail: CollectionDetail) => {
    setSaved(detail);
    setName(detail.name);
    setArtworks(detail.artworks);
    setCoverId(detail.coverArtworkId);
  };

  // After visiting an artwork, membership may have changed. Keep unsaved name/order/cover edits,
  // dropping artworks that left and adding new ones at the end.
  const merge = (detail: CollectionDetail) => {
    setSaved(detail);
    setArtworks((list) => {
      const fresh = new Map(detail.artworks.map((a) => [a.id, a]));
      const kept = list.filter((a) => fresh.has(a.id)).map((a) => fresh.get(a.id)!);
      return [...kept, ...detail.artworks.filter((a) => !list.some((l) => l.id === a.id))];
    });
    setCoverId((id) => (id && detail.artworks.some((a) => a.id === id) ? id : detail.coverArtworkId));
  };

  // Reload on focus, so artworks added or removed in the artwork form show up
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCollection(collectionId)
        .then((detail) => active && (dirtyRef.current ? merge(detail) : apply(detail)))
        .catch((e) => active && setError(errorMessage(e, 'Could not load this collection.')))
        .finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [collectionId]),
  );

  const save = async () => {
    if (!name.trim()) {
      setError('The collection needs a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      apply(await updateCollection(collectionId, {
        name: name.trim(),
        coverArtworkId: coverId,
        artworkOrder: artworks.map((a) => a.id),
      }));
    } catch (e) {
      setError(errorMessage(e, 'Could not save the collection.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setSaving(true);
    try {
      await deleteCollection(collectionId);
      leave();
    } catch (e) {
      setError(errorMessage(e, 'Could not delete the collection.'));
      setSaving(false);
    }
  };

  return (
    <Screen title={saved?.name ?? route.params.name} onBack={() => navigation.goBack()}>
      <FlatList
        data={artworks}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.label, { color: colors.text }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              accessibilityLabel="Collection name"
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            />
            <Text style={{ color: colors.muted }}>
              Artworks appear on the collection page in this order, left to right. The cover is the image on the homepage card.
            </Text>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {!loading && artworks.length === 0 ? (
              <Text style={{ color: colors.warning }}>No artworks yet. Add one below, or add this collection to an existing artwork.</Text>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const isCover = item.id === effectiveCoverId;
          return (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.position, { color: colors.muted }]}>{index + 1}</Text>
              <TouchableOpacity
                style={styles.rowMain}
                onPress={() => navigation.navigate('Form', { artworkId: item.id })}
                accessibilityRole="button"
              >
                <Thumbnail uri={item.imageUrl} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  {isCover ? (
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                      ★ Cover{coverId === null ? ' (first artwork)' : ''}
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={() => setCoverId(item.id)} accessibilityRole="button" disabled={saving}>
                      <Text style={{ color: colors.primary }}>Make cover</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
              <MoveButtons
                index={index}
                count={artworks.length}
                label={item.title}
                disabled={saving}
                onMove={(delta) => setArtworks((list) => move(list, index, delta))}
              />
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footerActions}>
            <Button variant="secondary" title="Add Artwork to This Collection" onPress={() => navigation.navigate('Form', { collectionId })} />
            <Button variant="danger" title="Delete Collection" onPress={() => setConfirmDelete(true)} disabled={saving || loading} style={{ marginTop: 24 }} />
          </View>
        }
      />
      {isDirty || error ? (
        <View style={[styles.saveBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
          {isDirty ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button variant="secondary" title="Undo" onPress={() => saved && apply(saved)} disabled={saving} style={{ flex: 1 }} />
              <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={save} disabled={saving} style={{ flex: 2 }} />
            </View>
          ) : null}
        </View>
      ) : null}
      <ConfirmationModal
        visible={confirmDelete}
        title="Delete collection?"
        message={`"${saved?.name}" will be deleted. Its ${artworks.length === 1 ? 'artwork stays' : `${artworks.length} artworks stay`} on the site, just no longer in this collection.`}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        isDestructive
      />
      {leaveModal}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 140 },
  header: { gap: 10, paddingVertical: 12 },
  label: { fontWeight: '600', fontSize: 15 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  position: { width: 22, textAlign: 'right' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  footerActions: { paddingVertical: 24 },
  saveBar: { padding: 16, borderTopWidth: 1 },
});

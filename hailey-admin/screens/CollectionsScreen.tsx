// screens/CollectionsScreen.tsx: every collection, in homepage order
import React, { useCallback, useState } from 'react';
import { FlatList, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CollectionSummary } from '../types';
import { getCollections, createCollection, reorderCollections, errorMessage } from '../api';
import { useTheme } from '../theme';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Thumbnail } from '../components/Thumbnail';
import { MoveButtons, move } from '../components/MoveButtons';
import { useLeaveGuard } from '../components/useLeaveGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'Collections'>;

export default function CollectionsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const order = collections.map((c) => c.id);
  const orderChanged = order.join() !== savedOrder.join();
  const { modal: leaveModal } = useLeaveGuard(navigation, orderChanged);

  const apply = (list: CollectionSummary[]) => {
    setCollections(list);
    setSavedOrder(list.map((c) => c.id));
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCollections()
        .then((list) => active && apply(list))
        .catch((e) => active && setError(errorMessage(e, 'Could not load collections.')))
        .finally(() => active && setLoading(false));
      return () => { active = false; };
    }, []),
  );

  const saveOrder = async () => {
    setSaving(true);
    setError('');
    try {
      apply(await reorderCollections(order));
    } catch (e) {
      setError(errorMessage(e, 'Could not save the order.'));
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError('');
    try {
      const created = await createCollection(name);
      setCollections((list) => [...list, created]);
      setSavedOrder((ids) => [...ids, created.id]);
      setNewName('');
    } catch (e) {
      setError(errorMessage(e, 'Could not create the collection.'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <Screen title="Collections" onBack={() => navigation.goBack()}>
      <FlatList
        data={collections}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={{ color: colors.muted }}>
              This is the order collections appear in on the homepage. Tap a collection to rename it, reorder its artworks or choose its cover.
            </Text>
            <View style={styles.addRow}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={add}
                placeholder="New collection name"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />
              <Button small title={adding ? 'Adding…' : 'Add'} onPress={add} disabled={!newName.trim() || adding} />
            </View>
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id, name: item.name })}
              accessibilityRole="button"
            >
              <Thumbnail uri={item.coverImageUrl} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: item.artworkCount ? colors.muted : colors.warning }}>
                  {item.artworkCount === 1 ? '1 artwork' : `${item.artworkCount} artworks`}
                  {item.artworkCount === 0 ? ' (hidden on the site until it has one)' : ''}
                </Text>
              </View>
            </TouchableOpacity>
            <MoveButtons
              index={index}
              count={collections.length}
              label={item.name}
              disabled={saving}
              onMove={(delta) => setCollections((list) => move(list, index, delta))}
            />
          </View>
        )}
      />
      {orderChanged ? (
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Button variant="secondary" title="Undo" onPress={() => setCollections((list) => savedOrder.map((id) => list.find((c) => c.id === id)!))} disabled={saving} style={{ flex: 1 }} />
          <Button title={saving ? 'Saving…' : 'Save Order'} onPress={saveOrder} disabled={saving} style={{ flex: 2 }} />
        </View>
      ) : null}
      {leaveModal}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  header: { gap: 12, paddingVertical: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1 },
});

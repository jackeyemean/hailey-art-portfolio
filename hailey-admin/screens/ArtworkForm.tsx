// screens/ArtworkForm.tsx: create or edit one artwork
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  Switch,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CollectionSummary, ArtworkInput } from '../types';
import {
  getArtwork,
  getArtworks,
  getCollections,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  createCollection,
  errorMessage,
  ApiError,
} from '../api';
import { useTheme, Theme } from '../theme';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';
import { useLeaveGuard } from '../components/useLeaveGuard';
import { prepareImageUpload } from '../utils/prepareImageUpload';

type Props = NativeStackScreenProps<RootStackParamList, 'Form'>;

interface FormValues {
  title: string;
  description: string;
  medium: string;
  dimensions: string;
  isArtistPick: boolean;
  collectionIds: string[];
  photoUri: string | null;
}

const EMPTY: FormValues = {
  title: '',
  description: '',
  medium: '',
  dimensions: '',
  isArtistPick: false,
  collectionIds: [],
  photoUri: null,
};

export default function ArtworkForm({ route, navigation }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme.isDark]);
  const { artworkId, collectionId } = route.params ?? {};
  const isEdit = Boolean(artworkId);

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [initial, setInitial] = useState<FormValues>(EMPTY);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false); // guards against a double tap before React re-renders

  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionError, setNewCollectionError] = useState('');
  const [addingCollection, setAddingCollection] = useState(false);

  const [duplicateTitle, setDuplicateTitle] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  useEffect(() => {
    let active = true;
    Promise.all([getCollections(), artworkId ? getArtwork(artworkId) : Promise.resolve(null)])
      .then(([cols, art]) => {
        if (!active) return;
        setCollections(cols);
        const loaded: FormValues = art
          ? {
              title: art.title,
              description: art.description || '',
              medium: art.medium || '',
              dimensions: art.dimensions || '',
              isArtistPick: art.isArtistPick,
              collectionIds: art.collections.map((c) => c.id),
              photoUri: art.imageUrl || null,
            }
          : { ...EMPTY, collectionIds: collectionId ? [collectionId] : [] };
        setValues(loaded);
        setInitial(loaded);
      })
      .catch((e) => active && setLoadError(errorMessage(e, 'Could not load this artwork.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [artworkId, collectionId]);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  const { leave, modal: leaveModal } = useLeaveGuard(navigation, isDirty);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets?.length) {
      setAsset(res.assets[0]);
      set('photoUri', res.assets[0].uri);
    }
  };

  const toggleCollection = (id: string) =>
    set('collectionIds', values.collectionIds.includes(id)
      ? values.collectionIds.filter((c) => c !== id)
      : [...values.collectionIds, id]);

  const addCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    setAddingCollection(true);
    setNewCollectionError('');
    try {
      const created = await createCollection(name);
      setCollections((cols) => [...cols, created]);
      set('collectionIds', [...values.collectionIds, created.id]);
      setNewCollectionName('');
    } catch (e) {
      setNewCollectionError(errorMessage(e, 'Could not create the collection.'));
    } finally {
      setAddingCollection(false);
    }
  };

  const titleMissing = !values.title.trim();
  const photoMissing = !values.photoUri;

  // Returns the title of an existing artwork that looks like the one being created (same title,
  // or a photo uploaded from the same original file), or null. Paintings have been re-added by
  // mistake under a new write-up before, so creating one asks for confirmation first.
  const findPossibleDuplicate = async (): Promise<string | null> => {
    try {
      const artworks = await getArtworks();
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const stripExt = (s: string) => s.replace(/\.[^.]+$/, '');
      const newTitle = norm(values.title);
      const newFile = asset?.fileName ? norm(stripExt(asset.fileName)) : '';
      const match = artworks.find((art) => {
        // Stored names look like "1794370855712-DSCN0734.webp": upload timestamp(s), then the original name
        const original = stripExt(decodeURIComponent(art.imageUrl.split('/').pop() || '')).replace(/^(\d+-)+/, '');
        return norm(art.title) === newTitle || (newFile !== '' && norm(original) === newFile);
      });
      return match ? match.title : null;
    } catch {
      return null; // a failed check shouldn't block saving
    }
  };

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError('');
    try {
      const input: ArtworkInput = {
        title: values.title.trim(),
        description: values.description.trim(),
        medium: values.medium.trim(),
        dimensions: values.dimensions.trim(),
        isArtistPick: values.isArtistPick,
        collectionIds: values.collectionIds,
      };
      if (asset) {
        try {
          Object.assign(input, await prepareImageUpload(asset, 'image.jpg'));
        } catch {
          throw new ApiError('That photo could not be processed. Try a different image.');
        }
      }
      if (artworkId) await updateArtwork(artworkId, input);
      else await createArtwork(input);
      leave();
    } catch (e) {
      setSaveError(errorMessage(e, 'Could not save the artwork.'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    if (titleMissing || photoMissing) {
      setShowErrors(true);
      return;
    }
    if (!isEdit) {
      savingRef.current = true;
      setIsSaving(true);
      const duplicate = await findPossibleDuplicate();
      savingRef.current = false;
      setIsSaving(false);
      if (duplicate) {
        setDuplicateTitle(duplicate);
        return;
      }
    }
    save();
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    if (!artworkId || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await deleteArtwork(artworkId);
      leave();
    } catch (e) {
      setSaveError(errorMessage(e, 'Could not delete the artwork.'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const field = (key: 'title' | 'medium' | 'dimensions', label: string, placeholder: string, error?: string) => (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={values[key]}
        onChangeText={(t) => set(key, t)}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? { borderColor: colors.danger } : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  if (loading || loadError) {
    return (
      <Screen title={isEdit ? 'Edit Artwork' : 'New Artwork'} onBack={leave}>
        {loadError ? <Text style={[styles.error, { padding: 16 }]}>{loadError}</Text> : <ActivityIndicator style={{ padding: 24 }} color={colors.primary} />}
      </Screen>
    );
  }

  return (
    <Screen title={isEdit ? 'Edit Artwork' : 'New Artwork'} onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <View style={styles.group}>
          <TouchableOpacity onPress={pickImage} style={[styles.photo, photoMissing && showErrors ? { borderColor: colors.danger } : null]} accessibilityRole="button">
            {values.photoUri ? (
              <Image source={{ uri: values.photoUri }} style={styles.photoImage} resizeMode="contain" />
            ) : (
              <Text style={{ color: colors.muted }}>Tap to choose a photo</Text>
            )}
          </TouchableOpacity>
          <Button small variant="secondary" title={values.photoUri ? 'Change Photo' : 'Choose Photo'} onPress={pickImage} style={styles.photoButton} />
          {photoMissing && showErrors ? <Text style={styles.error}>A photo is required.</Text> : null}
        </View>

        {field('title', 'Title', 'e.g. St. Gallen Marktplatz', titleMissing && showErrors ? 'A title is required.' : undefined)}

        <View style={styles.group}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={values.description}
            onChangeText={(t) => set('description', t)}
            placeholder="Where and when it was painted, the story behind it…"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multiline]}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.row}>
          <View style={styles.half}>{field('medium', 'Medium', 'e.g. Oil on canvas')}</View>
          <View style={styles.half}>{field('dimensions', 'Dimensions', 'e.g. 8" x 10"')}</View>
        </View>

        {/* Collections */}
        <View style={styles.group}>
          <Text style={styles.label}>Collections</Text>
          <Text style={styles.helper}>Select every collection this artwork belongs to.</Text>
          <View style={styles.chips}>
            {collections.map((c) => {
              const selected = values.collectionIds.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => toggleCollection(c.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={{ color: selected ? colors.onPrimary : colors.text }}>
                    {selected ? '✓ ' : ''}{c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.newCollection}>
            <TextInput
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              onSubmitEditing={addCollection}
              placeholder="New collection name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { flex: 1 }]}
            />
            <Button small title={addingCollection ? 'Adding…' : 'Add'} onPress={addCollection} disabled={!newCollectionName.trim() || addingCollection} />
          </View>
          {newCollectionError ? <Text style={styles.error}>{newCollectionError}</Text> : null}
          {values.collectionIds.length === 0 ? (
            <Text style={[styles.helper, { color: colors.warning }]}>Not in any collection: it won't appear on any collection page.</Text>
          ) : null}
        </View>

        {/* Artist's pick */}
        <View style={[styles.group, styles.switchRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Artist's Pick</Text>
            <Text style={styles.helper}>
              {values.isArtistPick ? 'Featured on the homepage. This replaces the current pick.' : 'Feature this artwork on the homepage.'}
            </Text>
          </View>
          <Switch
            value={values.isArtistPick}
            onValueChange={(v) => set('isArtistPick', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <Text style={styles.helper}>The order of artworks and each collection's cover image are set under Collections.</Text>

        {saveError ? <Text style={[styles.error, styles.saveError]}>{saveError}</Text> : null}
        <Button
          title={isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Artwork'}
          onPress={handleSave}
          disabled={isSaving || (isEdit && !isDirty)}
          style={{ marginTop: 16 }}
        />
        {isEdit ? (
          <Button variant="danger" title="Delete Artwork" onPress={() => setConfirmDelete(true)} disabled={isSaving} style={{ marginTop: 32 }} />
        ) : null}
      </ScrollView>

      <ConfirmationModal
        visible={duplicateTitle !== null}
        title="Possible duplicate"
        message={`"${duplicateTitle}" is already on the site with the same title or photo. Create this artwork anyway?`}
        onConfirm={() => { setDuplicateTitle(null); save(); }}
        onCancel={() => setDuplicateTitle(null)}
        confirmText="Create anyway"
      />
      <ConfirmationModal
        visible={confirmDelete}
        title="Delete artwork?"
        message={`"${values.title}" will be removed from the site and every collection. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        isDestructive
      />
      {leaveModal}
    </Screen>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: { padding: 16, paddingBottom: 48 },
    group: { marginBottom: 16 },
    label: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 6 },
    helper: { color: colors.muted, fontSize: 13, marginBottom: 8 },
    input: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
    },
    multiline: { minHeight: 96 },
    error: { color: colors.danger, fontSize: 13, marginTop: 4 },
    saveError: { marginTop: 8, fontSize: 15 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    photo: {
      height: 280,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoImage: { width: '100%', height: '100%' },
    photoButton: { alignSelf: 'flex-start', marginTop: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.chip },
    chipSelected: { backgroundColor: colors.primary },
    newCollection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  });

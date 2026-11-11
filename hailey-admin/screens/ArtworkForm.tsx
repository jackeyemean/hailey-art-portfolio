// screens/ArtworkForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Text,
  useColorScheme,
  Switch,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { API_URL } from '../constants';
import ConfirmationModal from '../components/ConfirmationModal';
import { prepareImageUpload } from '../utils/prepareImageUpload';

type Props = NativeStackScreenProps<RootStackParamList, 'Form'>;

export default function ArtworkForm({ route, navigation }: Props) {
  const isDark = useColorScheme() === 'dark';
  const { artworkId, adminKey } = route.params;

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [collection, setCollection]   = useState('');
  const [medium, setMedium]           = useState('');
  const [dimensions, setDimensions]   = useState('');
  const [isArtistPick, setIsArtistPick] = useState(false);
  const [isCollectionPick, setIsCollectionPick] = useState(false);
  const [viewOrder, setViewOrder] = useState('');
  const [uri, setUri]                 = useState<string | null>(null);
  const [isNewImage, setIsNewImage]   = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // React state updates aren't applied synchronously, so a ref backs the guard itself;
  // isSaving only drives the button's disabled look and label.
  const savingRef = useRef(false);
  const checkingRef = useRef(false);
  const [duplicateTitle, setDuplicateTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!artworkId) return;
    fetch(`${API_URL}/artworks/${artworkId}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then((art: any) => {
        setTitle(art.title);
        setDescription(art.description || '');
        setCollection(art.collection);
        setMedium(art.medium);
        setDimensions(art.dimensions);
        setIsArtistPick(art.isArtistPick || false);
        setIsCollectionPick(art.isCollectionPick || false);
        setViewOrder(art.viewOrder?.toString() || '');
        const existing = art.imageUrl; // Supabase Storage returns full URLs
        setUri(existing);
        setIsNewImage(false);
      })
      .catch(err => {
        console.error(err);
        setErrorMessage('Could not load artwork data.');
        setShowErrorModal(true);
      });
  }, [artworkId]);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) {
      const asset = res.assets[0];
      setUri(asset.uri);
      setIsNewImage(true);
      setSelectedAsset(asset);
    }
  };

  const submitForm = async () => {
    // Without this guard, a slow upload with no visible feedback invites a second
    // tap on Create/Update, which would submit the same artwork twice.
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);

    let upload: { image: string; filename: string } | null = null;

    // Shrink the image to fit the API's size limit if new image selected
    if (isNewImage && selectedAsset) {
      try {
        upload = await prepareImageUpload(selectedAsset, 'image.jpg');
      } catch (error) {
        console.error('Error converting image to base64:', error);
        setErrorMessage('Failed to process image');
        setShowErrorModal(true);
        savingRef.current = false;
        setIsSaving(false);
        return;
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      collection: collection.trim(),
      medium: medium.trim(),
      dimensions: dimensions.trim(),
      isArtistPick,
      isCollectionPick,
      viewOrder: viewOrder.trim() ? parseInt(viewOrder.trim()) : null,
      ...upload
    };

    const url = artworkId
      ? `${API_URL}/artworks/${artworkId}`
      : `${API_URL}/artworks`;
    try {
      const res = await fetch(url, {
        method: artworkId ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey 
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        setErrorMessage(text || `Status ${res.status}`);
        setShowErrorModal(true);
        return;
      }
      
      // If editing existing artwork, update the form with fresh data
      if (artworkId) {
        const updatedArtwork = await res.json();
        setTitle(updatedArtwork.title || '');
        setDescription(updatedArtwork.description || '');
        setCollection(updatedArtwork.collection || '');
        setMedium(updatedArtwork.medium || '');
        setDimensions(updatedArtwork.dimensions || '');
        setIsArtistPick(updatedArtwork.isArtistPick || false);
        setIsCollectionPick(updatedArtwork.isCollectionPick || false);
        setViewOrder(updatedArtwork.viewOrder?.toString() || '');
        if (updatedArtwork.imageUrl) {
          setUri(updatedArtwork.imageUrl);
        }
        setIsNewImage(false);
      }
      
      navigation.goBack();
    } catch {
      setErrorMessage('Unable to save artwork.');
      setShowErrorModal(true);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // Returns the title of an existing artwork that looks like the one being created (same title,
  // or a photo uploaded from the same original file), or null. Paintings have been re-added by
  // mistake under a new write-up before, so creating one asks for confirmation first.
  const findPossibleDuplicate = async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_URL}/artworks`);
      const artworks: { title: string; imageUrl: string }[] = await res.json();
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const stripExt = (s: string) => s.replace(/\.[^.]+$/, '');
      const newTitle = norm(title);
      const newFile = selectedAsset?.fileName ? norm(stripExt(selectedAsset.fileName)) : '';
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

  const handleSubmit = async () => {
    if (savingRef.current || checkingRef.current) return;
    if (!title.trim()) {
      setErrorMessage('Please enter a title.');
      setShowErrorModal(true);
      return;
    }
    if (!uri) {
      setErrorMessage('Please select an image.');
      setShowErrorModal(true);
      return;
    }
    if (artworkId) {
      setPendingAction(() => submitForm);
      setShowConfirmModal(true);
      return;
    }
    checkingRef.current = true;
    const duplicate = await findPossibleDuplicate();
    checkingRef.current = false;
    if (duplicate) {
      setDuplicateTitle(duplicate);
      setPendingAction(() => submitForm);
    } else {
      submitForm();
    }
  };

  const handleBack = () => {
    setPendingAction(() => () => navigation.goBack());
    setShowDiscardModal(true);
  };

  const handleConfirm = () => {
    setShowConfirmModal(false);
    setShowDiscardModal(false);
    setDuplicateTitle(null);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setShowDiscardModal(false);
    setShowErrorModal(false);
    setDuplicateTitle(null);
    setPendingAction(null);
  };

  const styles = createStyles(isDark);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: styles.container.backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back */}
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            placeholder="Enter title"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            placeholder="Enter description"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Collection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Collection</Text>
          <TextInput
            placeholder="e.g. Landscapes"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            value={collection}
            onChangeText={setCollection}
          />
        </View>

        {/* Medium */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medium</Text>
          <TextInput
            placeholder="e.g. Oil on canvas"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            value={medium}
            onChangeText={setMedium}
          />
        </View>

        {/* Dimensions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dimensions</Text>
          <TextInput
            placeholder="e.g. 30x40 in"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            value={dimensions}
            onChangeText={setDimensions}
          />
        </View>

        {/* Artist's Pick Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Set as Artist's Pick</Text>
            <Switch
              value={isArtistPick}
              onValueChange={setIsArtistPick}
              trackColor={{ false: isDark ? '#333' : '#ccc', true: isDark ? '#0A84FF' : '#007AFF' }}
              thumbColor={isArtistPick ? '#fff' : isDark ? '#666' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.helperText}>
            {isArtistPick 
              ? "This artwork will be featured on the homepage. Any existing artist's pick will be unset."
              : "Enable to feature this artwork on the homepage"
            }
          </Text>
        </View>

        {/* Collection Pick Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Set as Collection Card Image</Text>
            <Switch
              value={isCollectionPick}
              onValueChange={setIsCollectionPick}
              trackColor={{ false: isDark ? '#333' : '#ccc', true: isDark ? '#0A84FF' : '#007AFF' }}
              thumbColor={isCollectionPick ? '#fff' : isDark ? '#666' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.helperText}>
            {isCollectionPick 
              ? "This artwork will be used as the collection card image. Any existing collection pick in this collection will be unset."
              : "Enable to use this artwork as the collection card image"
            }
          </Text>
        </View>

        {/* View Order */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>View Order</Text>
          <TextInput
            placeholder="e.g. 1 (smaller numbers appear first)"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            value={viewOrder}
            onChangeText={setViewOrder}
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            Optional: Lower numbers appear first in the collection grid. Leave empty for default order.
          </Text>
        </View>

        {/* Image picker */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>
              {artworkId ? 'Change Photo' : 'Select Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {uri ? (
          <Image source={{ uri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}

        {/* Submit */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isSaving && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving…' : artworkId ? 'Update' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Update"
        message="Are you sure you want to update this record?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText="Update"
        cancelText="Cancel"
      />
      <ConfirmationModal
        visible={duplicateTitle !== null}
        title="Possible duplicate"
        message={`"${duplicateTitle}" is already on the site with the same title or photo. Create this artwork anyway?`}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText="Create anyway"
        cancelText="Cancel"
      />
      <ConfirmationModal
        visible={showDiscardModal}
        title="Discard changes?"
        message="Any unsaved changes will be lost."
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText="Discard"
        cancelText="Cancel"
        isDestructive
      />
      <ConfirmationModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        onConfirm={handleCancel}
        onCancel={handleCancel}
        confirmText="OK"
        cancelText="Cancel"
      />
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: {
      flexGrow: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    backButton: {
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    backButtonText: {
      color: isDark ? '#0A84FF' : '#007AFF',
      fontSize: 14,
      fontWeight: '600',
    },
    inputGroup: { marginBottom: 8 },
    label: {
      marginBottom: 2,
      color: isDark ? '#fff' : '#000',
      fontWeight: '600',
      fontSize: 14,
    },
    input: {
      backgroundColor: isDark ? '#1E1E1E' : '#f2f2f2',
      color: isDark ? '#fff' : '#000',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ccc',
      borderRadius: 4,
      padding: 6,
      fontSize: 14,
    },
    placeholder: { color: isDark ? '#888' : '#888' },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    helperText: {
      color: isDark ? '#888' : '#666',
      fontSize: 12,
      fontStyle: 'italic',
    },
    preview: {
      width: '100%',
      height: 120,
      marginVertical: 8,
      borderRadius: 4,
    },
    placeholderBox: {
      width: '100%',
      height: 120,
      marginVertical: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ccc',
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      color: isDark ? '#888' : '#888',
      fontSize: 12,
    },
    buttonContainer: { marginVertical: 8 },
    button: {
      backgroundColor: isDark ? '#0A84FF' : '#007AFF',
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

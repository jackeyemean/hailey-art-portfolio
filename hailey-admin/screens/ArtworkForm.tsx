// screens/ArtworkForm.tsx
import React, { useState, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { API_URL } from '../constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Form'>;

// Custom confirmation modal for web compatibility
const ConfirmationModal = ({ 
  visible, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false 
}: {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}) => {
  const isDark = useColorScheme() === 'dark';
  
  const modalStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      margin: 20,
      borderRadius: 12,
      padding: 24,
      minWidth: 300,
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    modalMessage: {
      fontSize: 16,
      marginBottom: 24,
      lineHeight: 22,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    modalButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      minWidth: 60,
      alignItems: 'center',
    },
    modalButtonSecondary: {
      backgroundColor: 'transparent',
    },
    modalButtonPrimary: {
      backgroundColor: '#007AFF',
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
  });
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={modalStyles.modalOverlay}>
        <View style={[modalStyles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#fff' }]}>
          <Text style={[modalStyles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>{title}</Text>
          <Text style={[modalStyles.modalMessage, { color: isDark ? '#ccc' : '#666' }]}>{message}</Text>
          <View style={modalStyles.modalButtons}>
            <TouchableOpacity 
              style={[modalStyles.modalButton, modalStyles.modalButtonSecondary]} 
              onPress={onCancel}
            >
              <Text style={[modalStyles.modalButtonText, { color: isDark ? '#0A84FF' : '#007AFF' }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                modalStyles.modalButton, 
                modalStyles.modalButtonPrimary,
                isDestructive && { backgroundColor: '#FF3B30' }
              ]} 
              onPress={onConfirm}
            >
              <Text style={modalStyles.modalButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) {
      const asset = res.assets[0];
      setUri(asset.uri);
      setIsNewImage(true);
      
      // For web, convert the asset to a File object
      if (Platform.OS === 'web' && asset.uri) {
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const file = new File([blob], asset.fileName || 'image.jpg', { type: asset.mimeType || 'image/jpeg' });
          setSelectedFile(file);
        } catch (error) {
          console.error('Error converting image to file:', error);
        }
      }
    }
  };

  const submitForm = async () => {
    const form = new FormData();
    if (isNewImage && uri) {
      if (Platform.OS === 'web' && selectedFile) {
        // For web, use the File object
        form.append('image', selectedFile);
      } else {
        // For mobile, use the uri object
        form.append('image', {
          uri,
          name: uri.split('/').pop()!,
          type: 'image/jpeg',
        } as any);
      }
    }
    form.append('title', title.trim());
    form.append('description', description.trim());
    form.append('collection', collection.trim());
    form.append('medium', medium.trim());
    form.append('dimensions', dimensions.trim());
    form.append('isArtistPick', isArtistPick.toString());
    form.append('isCollectionPick', isCollectionPick.toString());
    form.append('viewOrder', viewOrder.trim());

    const url = artworkId
      ? `${API_URL}/artworks/${artworkId}`
      : `${API_URL}/artworks`;
    try {
      const res = await fetch(url, {
        method: artworkId ? 'PUT' : 'POST',
        headers: { 'x-admin-key': adminKey },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        setErrorMessage(text || `Status ${res.status}`);
        setShowErrorModal(true);
        return;
      }
      navigation.goBack();
    } catch {
      setErrorMessage('Unable to save artwork.');
      setShowErrorModal(true);
    }
  };

  const handleSubmit = () => {
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
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setShowDiscardModal(false);
    setShowErrorModal(false);
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
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>
              {artworkId ? 'Update' : 'Create'}
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
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

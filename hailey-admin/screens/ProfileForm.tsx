// screens/ProfileForm.tsx
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
  Modal,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { API_URL } from '../constants';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileForm'>;

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

export default function ProfileForm({ route, navigation }: Props) {
  const isDark = useColorScheme() === 'dark';
  const { adminKey } = route.params;

  const [description, setDescription] = useState('');
  const [uri, setUri] = useState<string | null>(null);
  const [isNewImage, setIsNewImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('Attempting to fetch profile from:', `${API_URL}/profile`);
      console.log('Full API URL:', API_URL);
      const response = await fetch(`${API_URL}/profile`);
      console.log('Profile response status:', response.status);
      const profile = await response.json();
      
      setDescription(profile.description || '');
      if (profile.imageUrl) {
        const existing = profile.imageUrl.startsWith('http')
          ? profile.imageUrl
          : profile.imageUrl; // Supabase Storage returns full URLs
        setUri(existing);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      console.error('Profile error details:', JSON.stringify(error, null, 2));
      setErrorMessage('Could not load profile data.');
      setShowErrorModal(true);
      setIsLoading(false);
    }
  };

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
    let imageBase64 = null;
    let filename = null;

    // Convert image to base64 if new image selected
    if (isNewImage && uri) {
      try {
        if (Platform.OS === 'web' && selectedFile) {
          // For web, convert File to base64
          const reader = new FileReader();
          imageBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
            };
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });
          filename = selectedFile.name;
        } else {
          // For mobile, convert URI to base64
          const response = await fetch(uri);
          const blob = await response.blob();
          const reader = new FileReader();
          imageBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          filename = uri.split('/').pop() || 'profile.jpg';
        }
      } catch (error) {
        console.error('Error converting image to base64:', error);
        setErrorMessage('Failed to process image');
        setShowErrorModal(true);
        return;
      }
    }

    const payload = {
      description: description.trim(),
      ...(imageBase64 && { image: imageBase64, filename })
    };

    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
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
      
      // Get the updated profile data from the response
      const updatedProfile = await res.json();
      
      // Update the form state with the fresh data
      setDescription(updatedProfile.description || '');
      if (updatedProfile.imageUrl) {
        setUri(updatedProfile.imageUrl);
      }
      setIsNewImage(false);
      
      // Small delay to ensure state updates are applied before navigation
      setTimeout(() => {
        navigation.goBack();
      }, 50);
    } catch (error) {
      setErrorMessage('Unable to save profile.');
      setShowErrorModal(true);
    }
  };

  const handleSubmit = () => {
    setPendingAction(() => submitForm);
    setShowConfirmModal(true);
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
    setShowSuccessModal(false);
    setPendingAction(null);
  };

  const styles = createStyles(isDark);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: styles.container.backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: styles.container.backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back */}
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your portrait and description</Text>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Artist Description</Text>
          <TextInput
            placeholder="Enter your artist description..."
            placeholderTextColor={styles.placeholder.color}
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.helperText}>
            This will replace the default description on the about page
          </Text>
        </View>

        {/* Image picker */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>
              {uri ? 'Change Portrait Photo' : 'Select Portrait Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {uri ? (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Portrait Preview</Text>
            <Image source={{ uri }} style={styles.preview} />
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.previewLabel}>Portrait Preview</Text>
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>No portrait selected</Text>
            </View>
          </View>
        )}

        {/* Submit */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Update Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Update"
        message="Are you sure you want to update your profile?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText="Update"
        cancelText="Cancel"
      />

      {/* Discard Modal */}
      <ConfirmationModal
        visible={showDiscardModal}
        title="Discard changes?"
        message="Any unsaved changes will be lost."
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText="Discard"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Error Modal */}
      <ConfirmationModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        onConfirm={handleCancel}
        onCancel={handleCancel}
        confirmText="OK"
        cancelText="Cancel"
      />

      {/* Success Modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage}
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: isDark ? '#fff' : '#000',
      fontSize: 16,
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
    titleContainer: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? '#888' : '#666',
    },
    inputGroup: { marginBottom: 16 },
    label: {
      marginBottom: 8,
      color: isDark ? '#fff' : '#000',
      fontWeight: '600',
      fontSize: 16,
    },
    input: {
      backgroundColor: isDark ? '#1E1E1E' : '#f2f2f2',
      color: isDark ? '#fff' : '#000',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ccc',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
    },
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    placeholder: { color: isDark ? '#888' : '#888' },
    helperText: {
      color: isDark ? '#888' : '#666',
      fontSize: 12,
      marginTop: 4,
    },
    previewContainer: {
      marginVertical: 16,
    },
    placeholderContainer: {
      marginVertical: 16,
    },
    previewLabel: {
      marginBottom: 8,
      color: isDark ? '#fff' : '#000',
      fontWeight: '600',
      fontSize: 16,
    },
    preview: {
      width: '100%',
      height: 200,
      borderRadius: 8,
    },
    placeholderBox: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ccc',
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      color: isDark ? '#888' : '#888',
      fontSize: 14,
    },
    buttonContainer: { marginVertical: 8 },
    button: {
      backgroundColor: isDark ? '#0A84FF' : '#007AFF',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  }); 
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { API_URL, BUCKET_URL } from '../constants';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileForm'>;

export default function ProfileForm({ route, navigation }: Props) {
  const isDark = useColorScheme() === 'dark';
  const { adminKey } = route.params;

  const [description, setDescription] = useState('');
  const [uri, setUri] = useState<string | null>(null);
  const [isNewImage, setIsNewImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
          : `${BUCKET_URL}/${profile.imageUrl}`;
        setUri(existing);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      console.error('Profile error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'Could not load profile data.');
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) {
      setUri(res.assets[0].uri);
      setIsNewImage(true);
    }
  };

  const submitForm = async () => {
    const form = new FormData();
    if (isNewImage && uri) {
      form.append('image', {
        uri,
        name: uri.split('/').pop()!,
        type: 'image/jpeg',
      } as any);
    }
    form.append('description', description.trim());

    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: { 'x-admin-key': adminKey },
        body: form,
      });
      
      if (!res.ok) {
        const text = await res.text();
        return Alert.alert('Save failed', text || `Status ${res.status}`);
      }
      
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Unable to save profile.');
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      'Confirm Update',
      'Are you sure you want to update your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: submitForm },
      ]
    );
  };

  const handleBack = () => {
    Alert.alert(
      'Discard changes?',
      'Any unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
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
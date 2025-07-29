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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { API_URL, BUCKET_URL } from '../constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Form'>;

export default function ArtworkForm({ route, navigation }: Props) {
  const isDark = useColorScheme() === 'dark';
  const { artworkId, adminKey } = route.params;

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [collection, setCollection]   = useState('');
  const [medium, setMedium]           = useState('');
  const [dimensions, setDimensions]   = useState('');
  const [uri, setUri]                 = useState<string | null>(null);
  const [isNewImage, setIsNewImage]   = useState(false);

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
        const existing = art.imageUrl.startsWith('http')
          ? art.imageUrl
          : `${BUCKET_URL}/${art.imageUrl}`;
        setUri(existing);
        setIsNewImage(false);
      })
      .catch(err => {
        console.error(err);
        Alert.alert('Error', 'Could not load artwork data.');
      });
  }, [artworkId]);

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
    form.append('title', title.trim());
    form.append('description', description.trim());
    form.append('collection', collection.trim());
    form.append('medium', medium.trim());
    form.append('dimensions', dimensions.trim());

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
        return Alert.alert('Save failed', text || `Status ${res.status}`);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Unable to save artwork.');
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return Alert.alert('Please enter a title.');
    if (!uri)           return Alert.alert('Please select an image.');
    if (artworkId) {
      Alert.alert(
        'Confirm Update',
        'Are you sure you want to update this record?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: submitForm },
        ]
      );
    } else {
      submitForm();
    }
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

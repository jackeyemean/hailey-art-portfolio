// screens/ProfileForm.tsx: the About page's portrait and description
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, TextInput, TouchableOpacity, Image, StyleSheet, Text, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getProfile, updateProfile, errorMessage, ApiError } from '../api';
import { useTheme } from '../theme';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useLeaveGuard } from '../components/useLeaveGuard';
import { prepareImageUpload } from '../utils/prepareImageUpload';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileForm'>;

export default function ProfileForm({ navigation }: Props) {
  const { colors } = useTheme();

  const [description, setDescription] = useState('');
  const [savedDescription, setSavedDescription] = useState('');
  const [uri, setUri] = useState<string | null>(null);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false); // guards against a double tap before React re-renders

  const isDirty = description !== savedDescription || asset !== null;
  const { leave, modal: leaveModal } = useLeaveGuard(navigation, isDirty);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setDescription(profile.description || '');
        setSavedDescription(profile.description || '');
        setUri(profile.imageUrl);
      })
      .catch((e) => setError(errorMessage(e, 'Could not load the profile.')))
      .finally(() => setLoading(false));
  }, []);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets?.length) {
      setAsset(res.assets[0]);
      setUri(res.assets[0].uri);
    }
  };

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setError('');
    try {
      const input: { description: string; image?: string; filename?: string } = { description: description.trim() };
      if (asset) {
        try {
          Object.assign(input, await prepareImageUpload(asset, 'profile.jpg'));
        } catch {
          throw new ApiError('That photo could not be processed. Try a different image.');
        }
      }
      await updateProfile(input);
      leave();
    } catch (e) {
      setError(errorMessage(e, 'Could not save the profile.'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Screen title="Profile" onBack={() => navigation.goBack()}>
      {loading ? (
        <ActivityIndicator style={{ padding: 24 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>Portrait</Text>
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.photo, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
          >
            {uri ? (
              <Image source={{ uri }} style={styles.photoImage} resizeMode="contain" />
            ) : (
              <Text style={{ color: colors.muted }}>Tap to choose a portrait</Text>
            )}
          </TouchableOpacity>
          <Button small variant="secondary" title={uri ? 'Change Portrait' : 'Choose Portrait'} onPress={pickImage} style={styles.photoButton} />

          <Text style={[styles.label, { color: colors.text }]}>About</Text>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>Shown on the About page. Line breaks are kept.</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="A few words about you and your work…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            multiline
            textAlignVertical="top"
          />

          {error ? <Text style={{ color: colors.danger, marginTop: 16 }}>{error}</Text> : null}
          <Button
            title={isSaving ? 'Saving…' : 'Save Changes'}
            onPress={save}
            disabled={isSaving || !isDirty}
            style={{ marginTop: 16 }}
          />
        </ScrollView>
      )}
      {leaveModal}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  label: { fontWeight: '600', fontSize: 15, marginBottom: 6, marginTop: 8 },
  photo: { height: 280, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoButton: { alignSelf: 'flex-start', marginTop: 8, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 200 },
});

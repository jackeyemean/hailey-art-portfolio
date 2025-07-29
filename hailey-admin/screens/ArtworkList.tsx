import React, { useState, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { API_URL } from '../constants';

type Artwork = { id: string; title: string; imageUrl: string };
type Props = NativeStackScreenProps<RootStackParamList, 'List'>;

export default function ArtworkList({ route, navigation }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const { adminKey } = route.params;
  const [data, setData] = useState<Artwork[]>([]);

  const fetchArtworks = async () => {
    try {
      const res = await fetch(`${API_URL}/artworks`, {
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error('Fetch artworks failed:', err);
    }
  };

  useFocusEffect(useCallback(() => { fetchArtworks(); }, [adminKey]));

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_URL}/artworks/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      setData((cur) => cur.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this artwork?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) },
      ]
    );
  };

  const handleEdit = (id: string) =>
    navigation.navigate('Form', { artworkId: id, adminKey });

  const styles = createListStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => handleEdit(item.id)}
              >
                <Text style={styles.smallButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallDeleteButton}
                onPress={() => confirmDelete(item.id)}
              >
                <Text style={styles.smallButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 80,
        }}
      />

      <TouchableOpacity
        style={[styles.stickyButton, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('Form', { adminKey })}
      >
        <Text style={styles.stickyButtonText}>Add New</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createListStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 16,
      color: isDark ? '#fff' : '#000',
      flex: 1,
    },
    buttonGroup: {
      flexDirection: 'row',
    },
    smallButton: {
      backgroundColor: isDark ? '#0A84FF' : '#007AFF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginRight: 8,
    },
    smallDeleteButton: {
      backgroundColor: isDark ? '#cf6679' : '#FF3B30',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    smallButtonText: {
      color: isDark ? '#000' : '#fff',
      fontSize: 14,
    },
    stickyButton: {
      position: 'absolute',
      left: 16,
      right: 16,
      backgroundColor: isDark ? '#0A84FF' : '#007AFF',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    stickyButtonText: {
      color: isDark ? '#000' : '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

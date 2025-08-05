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

type Artwork = { 
  id: string; 
  title: string; 
  imageUrl: string; 
  isArtistPick: boolean;
};
type Props = NativeStackScreenProps<RootStackParamList, 'List'>;

export default function ArtworkList({ route, navigation }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const { adminKey } = route.params;
  const [data, setData] = useState<Artwork[]>([]);

  // Calculate space needed for sticky button
  const buttonHeight = 48; // Approximate height of the button
  const buttonMargin = 16; // Bottom margin of the button
  const extraPadding = 20; // Extra safety padding
  const totalBottomSpace = insets.bottom + buttonHeight + buttonMargin + extraPadding;

  const fetchArtworks = async () => {
    try {
      console.log('Attempting to fetch from:', `${API_URL}/artworks`);
      console.log('Full API URL:', API_URL);
      
      // Test if server is reachable
      try {
        const testResponse = await fetch(`${API_URL.replace('/api', '')}/health`);
        console.log('Server health check status:', testResponse.status);
      } catch (testErr) {
        console.log('Server health check failed:', testErr);
      }
      
      const res = await fetch(`${API_URL}/artworks`, {
        headers: { 'x-admin-key': adminKey },
      });
      console.log('Response status:', res.status);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error('Fetch artworks failed:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hailey Admin</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('ProfileForm', { adminKey })}
        >
          <Text style={styles.profileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{item.title}</Text>
              {item.isArtistPick && (
                <View style={styles.artistPickBadge}>
                  <Text style={styles.artistPickText}>Artist's Pick</Text>
                </View>
              )}
            </View>
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
          paddingBottom: totalBottomSpace, // Dynamic calculation based on button size
        }}
        showsVerticalScrollIndicator={true}
      />

      <TouchableOpacity
        style={[styles.stickyButton, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('Form', { adminKey })}
      >
        <Text style={styles.stickyButtonText}>Add New</Text>
      </TouchableOpacity>

      {/* Background container for sticky button area */}
      <View style={[styles.stickyButtonBackground, { bottom: insets.bottom }]} />
    </SafeAreaView>
  );
}

const createListStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#e0e0e0',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
    },
    profileButton: {
      backgroundColor: isDark ? '#333' : '#f0f0f0',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    profileButtonText: {
      color: isDark ? '#fff' : '#000',
      fontSize: 14,
      fontWeight: '500',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    titleContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: 16,
      color: isDark ? '#fff' : '#000',
      flex: 1,
    },
    artistPickBadge: {
      backgroundColor: isDark ? '#0A84FF' : '#007AFF',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    artistPickText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
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
      zIndex: 1000, // Ensure button is above background
    },
    stickyButtonText: {
      color: isDark ? '#000' : '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    stickyButtonBackground: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 80, // Height to cover button area
      backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8', // Different background color
      borderTopWidth: 1,
      borderTopColor: isDark ? '#333' : '#e0e0e0',
      zIndex: 999, // Below the button but above content
    },
  });

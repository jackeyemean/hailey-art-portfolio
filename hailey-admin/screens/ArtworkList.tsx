import React, { useState, useEffect } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Alert,
  useColorScheme,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { API_URL } from '../constants';

type Artwork = { 
  id: string; 
  title: string; 
  imageUrl: string; 
  isArtistPick: boolean;
};
type Props = NativeStackScreenProps<RootStackParamList, 'List'>;

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

export default function ArtworkList({ route, navigation }: Props) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { adminKey } = route.params;

  const [data, setData] = useState<Artwork[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string>('');

  // Calculate space needed for sticky button
  const buttonHeight = 48; // Approximate height of the button
  const buttonMargin = 16; // Bottom margin of the button
  const extraPadding = 20; // Extra safety padding
  const totalBottomSpace = insets.bottom + buttonHeight + buttonMargin + extraPadding;

  useEffect(() => {
    fetchArtworks();
  }, []);

  // Refresh when screen comes into focus
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchArtworks();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchArtworks = async () => {
    try {
      console.log('Attempting to fetch artworks from:', `${API_URL}/artworks`);
      console.log('Full API URL:', API_URL);
      const response = await fetch(`${API_URL}/artworks`);
      console.log('Artworks response status:', response.status);
      const artworks = await response.json();
      setData(artworks);
    } catch (error) {
      console.error('Fetch artworks failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setErrorMessage('Could not load artworks.');
      setShowErrorModal(true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/artworks/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete failed:', response.status, errorText);
        setErrorMessage(`Failed to delete artwork: ${errorText || response.status}`);
        setShowErrorModal(true);
        return;
      }
      
      // Only update UI if delete was successful
      setData((cur) => cur.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      setErrorMessage('Failed to delete artwork. Please try again.');
      setShowErrorModal(true);
    }
  };


  const confirmDelete = (id: string) => {
    const artwork = data.find(art => art.id === id);
    setPendingDeleteId(id);
    setPendingDeleteTitle(artwork?.title || 'this artwork');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      handleDelete(pendingDeleteId);
      setPendingDeleteId(null);
      setPendingDeleteTitle('');
    }
    setShowDeleteModal(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setShowErrorModal(false);
    setPendingDeleteId(null);
    setPendingDeleteTitle('');
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

      <ConfirmationModal
        visible={showDeleteModal}
        title="Confirm Delete"
        message={`Are you sure you want to delete '${pendingDeleteTitle}'?`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />

      <ConfirmationModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        onConfirm={handleDeleteCancel}
        onCancel={handleDeleteCancel}
        confirmText="OK"
        cancelText="Cancel"
      />
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

// components/ConfirmationModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';

// Custom confirmation modal for web compatibility (Alert.alert has no buttons on web)
export default function ConfirmationModal({ 
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
}) {
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
}

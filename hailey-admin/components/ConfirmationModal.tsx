// components/ConfirmationModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { Button } from './Button';

// Custom confirmation modal for web compatibility (Alert.alert has no buttons on web)
export default function ConfirmationModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
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
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: isDark ? colors.surface : colors.background }]} accessibilityRole="alert">
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
          <View style={styles.buttons}>
            <Button variant="secondary" title={cancelText} onPress={onCancel} />
            <Button variant={isDestructive ? 'danger' : 'primary'} title={confirmText} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { margin: 20, borderRadius: 12, padding: 24, minWidth: 300, maxWidth: 400 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  message: { fontSize: 16, marginBottom: 24, lineHeight: 22 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
});

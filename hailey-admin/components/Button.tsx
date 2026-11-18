// components/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  small = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const background = { primary: colors.primary, secondary: colors.chip, danger: colors.danger }[variant];
  const textColor = variant === 'secondary' ? colors.text : colors.onPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        small ? styles.small : styles.regular,
        { backgroundColor: background, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      <Text style={[small ? styles.smallText : styles.text, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  regular: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  small: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' },
  text: { fontSize: 16, fontWeight: '600' },
  smallText: { fontSize: 14, fontWeight: '500' },
});

// components/MoveButtons.tsx: up/down arrows for reordering a list, plus the move helper
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

// Returns a copy of `list` with the item at `index` moved by `delta` places
export function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function MoveButtons({
  index,
  count,
  onMove,
  disabled = false,
  label,
}: {
  index: number;
  count: number;
  onMove: (delta: number) => void;
  disabled?: boolean;
  label: string; // what is being moved, for screen readers
}) {
  const { colors } = useTheme();
  const arrow = (delta: number, symbol: string, a11y: string) => {
    const off = disabled || index + delta < 0 || index + delta >= count;
    return (
      <TouchableOpacity
        onPress={() => onMove(delta)}
        disabled={off}
        accessibilityRole="button"
        accessibilityLabel={`${a11y} ${label}`}
        style={[styles.arrow, { backgroundColor: colors.chip, opacity: off ? 0.3 : 1 }]}
      >
        <Text style={[styles.symbol, { color: colors.text }]}>{symbol}</Text>
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.wrap}>
      {arrow(-1, '↑', 'Move up')}
      {arrow(1, '↓', 'Move down')}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 6 },
  arrow: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 18, fontWeight: '600' },
});

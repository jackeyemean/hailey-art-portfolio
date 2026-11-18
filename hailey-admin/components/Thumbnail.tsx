// components/Thumbnail.tsx: small square artwork image, with a placeholder when there is none
import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../theme';

export function Thumbnail({ uri, size = 56 }: { uri?: string | null; size?: number }) {
  const { colors } = useTheme();
  const box = { width: size, height: size, borderRadius: 6, backgroundColor: colors.surface };
  return uri ? <Image source={{ uri }} style={box} resizeMode="cover" /> : <View style={box} />;
}

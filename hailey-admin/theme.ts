// theme.ts: colors shared by every screen, in light and dark mode
import { useColorScheme } from 'react-native';

// Fern green: the admin's accent for main buttons, selected filters and links
export const ACCENT = '#4C9A52';

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  return {
    isDark,
    colors: {
      background: isDark ? '#121212' : '#fff',
      surface: isDark ? '#1E1E1E' : '#f2f2f2',
      border: isDark ? '#333' : '#ddd',
      text: isDark ? '#fff' : '#000',
      muted: isDark ? '#999' : '#666',
      primary: isDark ? '#7CC383' : ACCENT,
      onPrimary: '#fff',
      danger: '#FF3B30',
      warning: isDark ? '#FFB340' : '#B25E00',
      chip: isDark ? '#2A2A2A' : '#ececec',
    },
  };
}

export type Theme = ReturnType<typeof useTheme>;

// Content never stretches wider than this on desktop browsers
export const MAX_CONTENT_WIDTH = 760;

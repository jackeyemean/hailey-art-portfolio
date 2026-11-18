// App.tsx
import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './types';
import ArtworkList from './screens/ArtworkList';
import ArtworkForm from './screens/ArtworkForm';
import ProfileForm from './screens/ProfileForm';
import CollectionsScreen from './screens/CollectionsScreen';
import CollectionDetailScreen from './screens/CollectionDetailScreen';
import PublishScreen from './screens/PublishScreen';
import { ADMIN_KEY } from './constants';
import { setAdminKey } from './api';
import { ACCENT } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// On the web, remember a successful login in this browser so the key isn't retyped every visit
const STORAGE_KEY = 'hailey-admin-key';
const storage = {
  get: () => {
    try { return Platform.OS === 'web' ? window.localStorage.getItem(STORAGE_KEY) : null; } catch { return null; }
  },
  set: (key: string) => {
    try { if (Platform.OS === 'web') window.localStorage.setItem(STORAGE_KEY, key); } catch {}
  },
};

// Simple login component
const LoginScreen = ({ onLogin }: { onLogin: (adminKey: string) => void }) => {
  const [adminKey, setAdminKeyInput] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (adminKey === ADMIN_KEY) {
      onLogin(adminKey);
    } else {
      setError('Invalid admin key');
    }
  };

  return (
    <View style={styles.loginContainer}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>Admin Atelier</Text>
        <Text style={styles.subtitle}>Enter admin key to continue</Text>
        <TextInput
          style={styles.input}
          value={adminKey}
          onChangeText={setAdminKeyInput}
          placeholder="Admin Key"
          secureTextEntry
          onSubmitEditing={handleLogin}
          autoFocus
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loginBox: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    minWidth: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    padding: 12,
    backgroundColor: ACCENT,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    marginTop: 10,
    fontSize: 14,
  },
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const remembered = storage.get();
    if (remembered && remembered === ADMIN_KEY) {
      setAdminKey(remembered);
      return true;
    }
    return false;
  });

  useEffect(() => {
    (async () => {
      // Only request permissions on mobile platforms
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission required',
            'Admin Atelier needs access to your photos to select artwork images.'
          );
        }
      }
    })();
  }, []);

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <LoginScreen
          onLogin={(adminKey) => {
            setAdminKey(adminKey);
            storage.set(adminKey);
            setIsAuthenticated(true);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        {...(Platform.OS === 'web' && {
          documentTitle: {
            formatter: (options, route) => `${options?.title ?? route?.name} - Admin Atelier`,
          },
        })}
      >
        <Stack.Navigator initialRouteName="List" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="List" component={ArtworkList} options={{ title: 'Artworks' }} />
          <Stack.Screen name="Form" component={ArtworkForm} options={{ title: 'Artwork' }} />
          <Stack.Screen name="ProfileForm" component={ProfileForm} options={{ title: 'Profile' }} />
          <Stack.Screen name="Collections" component={CollectionsScreen} options={{ title: 'Collections' }} />
          <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} options={{ title: 'Collection' }} />
          <Stack.Screen name="Publish" component={PublishScreen} options={{ title: 'Publish' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// App.tsx
import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions
} from '@react-navigation/native-stack';

import { RootStackParamList } from './types';
import ArtworkList from './screens/ArtworkList';
import ArtworkForm from './screens/ArtworkForm';
import ProfileForm from './screens/ProfileForm';
import { ADMIN_KEY } from './constants';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Simple login component
const LoginScreen = ({ onLogin }: { onLogin: (adminKey: string) => void }) => {
  const [adminKey, setAdminKey] = useState('');
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
        <Text style={styles.title}>Hailey Admin</Text>
        <Text style={styles.subtitle}>Enter admin key to continue</Text>
        <TextInput
          style={styles.input}
          value={adminKey}
          onChangeText={setAdminKey}
          placeholder="Admin Key"
          secureTextEntry
          onSubmitEditing={handleLogin}
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
    backgroundColor: '#007AFF',
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAdminKey, setCurrentAdminKey] = useState('');

  useEffect(() => {
    (async () => {
      // Only request permissions on mobile platforms
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission required',
            'Hailey Admin needs access to your photos to select artwork images.'
          );
        }
      }
    })();
  }, []);

  const sharedScreenOptions: NativeStackNavigationOptions = {
    headerShown: false
  };

  // Always show login screen first
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <LoginScreen 
          onLogin={(adminKey) => {
            setCurrentAdminKey(adminKey);
            setIsAuthenticated(true);
          }} 
        />
      </SafeAreaProvider>
    );
  }

  // Show main app after login
  return (
    <SafeAreaProvider>
      <NavigationContainer
        // Add web-specific configuration
        {...(Platform.OS === 'web' && {
          documentTitle: {
            formatter: (options, route) => 
              `${options?.title ?? route?.name} - Hailey Admin`,
          },
        })}
      >
         <Stack.Navigator
           initialRouteName="List"
           screenOptions={sharedScreenOptions}
         >
           <Stack.Screen
             name="List"
             component={ArtworkList}
             initialParams={{ adminKey: currentAdminKey }}
           />
           <Stack.Screen 
             name="Form" 
             component={ArtworkForm}
             initialParams={{ adminKey: currentAdminKey }}
           />
           <Stack.Screen 
             name="ProfileForm" 
             component={ProfileForm}
             initialParams={{ adminKey: currentAdminKey }}
           />
         </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
  
// App.tsx
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions
} from '@react-navigation/native-stack';

import { RootStackParamList } from './types';
import LoginScreen from './screens/LoginScreen';
import ArtworkList from './screens/ArtworkList';
import ArtworkForm from './screens/ArtworkForm';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Hailey Admin needs access to your photos to select artwork images.'
        );
      }
    })();
  }, []);

  const sharedScreenOptions: NativeStackNavigationOptions = {
    headerShown: false
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={sharedScreenOptions}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="List" component={ArtworkList} />
        <Stack.Screen name="Form" component={ArtworkForm} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
  
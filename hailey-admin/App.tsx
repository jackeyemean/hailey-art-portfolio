// App.tsx
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
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
import { ADMIN_KEY } from './constants';

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
    <SafeAreaProvider>
      <NavigationContainer>
         <Stack.Navigator
           initialRouteName="List"
           screenOptions={sharedScreenOptions}
         >
           <Stack.Screen
             name="List"
             component={ArtworkList}
             initialParams={{ adminKey: ADMIN_KEY }}
           />
           <Stack.Screen name="Form" component={ArtworkForm} />
         </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
  
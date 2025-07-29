import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [key, setKey] = useState('');

  const handleLogin = () => {
    if (!key.trim()) {
      return Alert.alert('Please enter the admin key.');
    }
    navigation.replace('List', { adminKey: key.trim() });
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Admin Key"
        secureTextEntry
        style={styles.input}
        value={key}
        onChangeText={setKey}
      />
      <Button title="Log In" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 8,
    borderRadius: 4,
  },
});

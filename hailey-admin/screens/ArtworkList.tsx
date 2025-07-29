// screens/ArtworkList.tsx
import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  Text,
  Button,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { RootStackParamList } from '../types'
import { API_URL } from '../constants'

type Artwork = { id: string; title: string; imageUrl: string }

type Props = NativeStackScreenProps<RootStackParamList, 'List'>

export default function ArtworkList({ route, navigation }: Props) {
  const { adminKey } = route.params
  const [data, setData] = useState<Artwork[]>([])

  const fetchArtworks = async () => {
    try {
      const res = await fetch(`${API_URL}/artworks`, {
        headers: { 'x-admin-key': adminKey },
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Fetch artworks failed:', err)
    }
  }

  // Re-fetch whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchArtworks()
    }, [adminKey])
  )

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_URL}/artworks/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      })
      setData(current => current.filter(a => a.id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleEdit = (id: string) => {
    navigation.navigate('Form', { artworkId: id, adminKey })
  }

  return (
    <View style={styles.container}>
      <Button
        title="Add New Artwork"
        onPress={() => navigation.navigate('Form', { adminKey })}
      />
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.buttonGroup}>
              <Button title="Edit" onPress={() => handleEdit(item.id)} />
              <Button
                title="Delete"
                color="red"
                onPress={() => handleDelete(item.id)}
              />
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
})

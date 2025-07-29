// screens/ArtworkForm.tsx
import React, { useState, useEffect } from 'react'
import {
  ScrollView,
  View,
  TextInput,
  Button,
  Image,
  StyleSheet,
  Alert,
  Text,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types'
import { API_URL } from '../constants'

type Props = NativeStackScreenProps<RootStackParamList, 'Form'>

const BUCKET_URL = 'https://hailey-art-portfolio-uploads.s3.amazonaws.com'

export default function ArtworkForm({ route, navigation }: Props) {
  const { artworkId, adminKey } = route.params

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [collection, setCollection] = useState('')
  const [medium, setMedium] = useState('')
  const [dimensions, setDimensions] = useState('')

  // uri holds either the full existing image URL or a new local URI
  const [uri, setUri] = useState<string | null>(null)
  const [isNewImage, setIsNewImage] = useState(false)

  // Prefill on edit, building a full URL if needed
  useEffect(() => {
    if (!artworkId) return
    fetch(`${API_URL}/artworks/${artworkId}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then((art: any) => {
        setTitle(art.title)
        setDescription(art.description || '')
        setCollection(art.collection)
        setMedium(art.medium)
        setDimensions(art.dimensions)

        // ensure full URL for the existing image
        const existingUri = art.imageUrl.startsWith('http')
          ? art.imageUrl
          : `${BUCKET_URL}/${art.imageUrl}`

        setUri(existingUri)
        setIsNewImage(false)
      })
      .catch(err => {
        console.error('Fetch artwork failed:', err)
        Alert.alert('Error', 'Could not load artwork data.')
      })
  }, [artworkId])

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (!result.canceled && result.assets?.length) {
      setUri(result.assets[0].uri)
      setIsNewImage(true)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      return Alert.alert('Please enter a title.')
    }
    if (!uri) {
      return Alert.alert('Please select or keep an image.')
    }

    const form = new FormData()
    if (isNewImage) {
      form.append('image', {
        uri,
        name: uri.split('/').pop() ?? 'photo.jpg',
        type: 'image/jpeg',
      } as any)
    }
    form.append('title', title.trim())
    form.append('description', description.trim())
    form.append('collection', collection.trim())
    form.append('medium', medium.trim())
    form.append('dimensions', dimensions.trim())

    const url = artworkId
      ? `${API_URL}/artworks/${artworkId}`
      : `${API_URL}/artworks`
    const method = artworkId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'x-admin-key': adminKey },
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('Save failed:', res.status, text)
        return Alert.alert('Save failed', text || `Status ${res.status}`)
      }
      navigation.goBack()
    } catch (err) {
      console.error('Network error:', err)
      Alert.alert('Error', 'Unable to save artwork. Please try again.')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        placeholder="Title"
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        placeholder="Description"
        style={styles.input}
        value={description}
        onChangeText={setDescription}
      />
      <TextInput
        placeholder="Collection"
        style={styles.input}
        value={collection}
        onChangeText={setCollection}
      />
      <TextInput
        placeholder="Medium"
        style={styles.input}
        value={medium}
        onChangeText={setMedium}
      />
      <TextInput
        placeholder="Dimensions (e.g. 30x40 in)"
        style={styles.input}
        value={dimensions}
        onChangeText={setDimensions}
      />

      <View style={{ marginVertical: 12 }}>
        <Button
          title={artworkId ? 'Select New Photo' : 'Select Photo'}
          onPress={pickImage}
        />
      </View>

      {uri ? (
        <Image source={{ uri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Button
          title={artworkId ? 'Update Artwork' : 'Create Artwork'}
          onPress={handleSubmit}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  preview: {
    width: '100%',
    height: 200,
    marginVertical: 12,
    borderRadius: 4,
  },
  placeholder: {
    width: '100%',
    height: 200,
    marginVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#888',
  },
})

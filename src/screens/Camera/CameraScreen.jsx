import React, { useState } from 'react';
import { View, StyleSheet, Text, Image, ActivityIndicator } from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { launchImageLibrary } from 'react-native-image-picker';
import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import { colors } from '@/theme/colors';

export default function CameraScreen({ navigation }) {
  const [scannedImage, setScannedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const startScan = async () => {
    try {
      setLoading(true);
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        responseType: 'imageFilePath',
      });

      if (status === 'success' && scannedImages && scannedImages.length > 0) {
        const imageUri = scannedImages[0];
        setScannedImage(imageUri);
        navigation.navigate('Result', { imageUri });
      }
    } catch (error) {
      console.log('Scan error:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      setLoading(true);
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        console.log('Gallery error:', result.errorMessage);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setScannedImage(imageUri);
        navigation.navigate('Result', { imageUri });
      }
    } catch (error) {
      console.log('Gallery pick error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {scannedImage ? (
          <Image source={{ uri: scannedImage }} style={styles.preview} resizeMode="contain" />
        ) : (
          <Text style={styles.hint}>
            Medicine ya lab report scan karein, ya gallery se image select karein
          </Text>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            <Button label="Scan Now" onPress={startScan} variant="primary" />
            <View style={{ height: 12 }} />
            <Button label="Upload from Gallery" onPress={pickFromGallery} variant="outline" />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  preview: { width: '100%', height: 300, marginBottom: 20, borderRadius: 16 },
  hint: { textAlign: 'center', color: colors.textMuted, marginBottom: 20, fontSize: 15 },
});
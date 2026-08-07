import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ScanLine,
  Image as ImageIcon,
  Pill,
  FileText,
} from 'lucide-react-native';
import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import { colors } from '@/theme/colors';

export default function CameraScreen() {
  const navigation = useNavigation();
  const [scannedImage, setScannedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState('medicine');

  const goToResult = (imageUri) => {
    setScannedImage(imageUri);
    navigation.navigate('Result', { imageUri, scanMode });
  };

  const startScan = async () => {
    try {
      setLoading(true);
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        responseType: 'imageFilePath',
      });
      if (status === 'success' && scannedImages?.length > 0) {
        goToResult(scannedImages[0]);
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
      if (result.assets?.length > 0) {
        goToResult(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Gallery pick error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setScanMode('medicine')}
            style={[
              styles.modeChip,
              scanMode === 'medicine' && styles.modeChipActive,
            ]}
          >
            <Pill
              size={16}
              color={scanMode === 'medicine' ? '#fff' : colors.primary}
            />
            <Text
              style={[
                styles.modeText,
                scanMode === 'medicine' && styles.modeTextActive,
              ]}
            >
              Medicine
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setScanMode('report')}
            style={[
              styles.modeChip,
              scanMode === 'report' && styles.modeChipActive,
            ]}
          >
            <FileText
              size={16}
              color={scanMode === 'report' ? '#fff' : colors.primary}
            />
            <Text
              style={[
                styles.modeText,
                scanMode === 'report' && styles.modeTextActive,
              ]}
            >
              Lab Report
            </Text>
          </Pressable>
        </View>

        <View style={styles.previewCard}>
          {scannedImage ? (
            <Image
              source={{ uri: scannedImage }}
              style={styles.preview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.emptyPreview}>
              <View style={styles.iconCircle}>
                <ScanLine size={36} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>
                {scanMode === 'medicine'
                  ? 'Medicine pack / strip'
                  : 'Lab report / prescription'}
              </Text>
              <Text style={styles.emptyHint}>
                Clear photo lo — edges frame ke andar, blur nahi
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 24 }}
          />
        ) : (
          <View style={styles.actions}>
            <Button
              label="Scan with Camera"
              onPress={startScan}
              variant="primary"
              icon={<ScanLine size={18} color="#fff" />}
            />
            <View style={{ height: 12 }} />
            <Button
              label="Upload from Gallery"
              onPress={pickFromGallery}
              variant="outline"
              icon={<ImageIcon size={18} color={colors.primary} />}
            />
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  body: { flex: 1 },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modeTextActive: { color: '#fff' },
  previewCard: {
    flex: 1,
    maxHeight: 340,
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
  },
  preview: { width: '100%', height: '100%' },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    marginTop: 20,
    marginBottom: 8,
  },
});
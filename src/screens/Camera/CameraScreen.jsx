import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  ScanLine,
  Image as ImageIcon,
  Pill,
  FileText,
  Scan,
  ClipboardList,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';

function buildScanTypes(c) {
  return [
    {
      id: 'medicine',
      title: c.medicine || 'Medicine',
      subtitle: c.medicineSub || 'Pack, strip, bottle, blister',
      icon: Pill,
      tip: c.medicineTip || '',
      frameHint: c.medicineFrame || '',
      color: '#0E9F8E',
    },
    {
      id: 'report',
      title: c.report || 'Lab Report',
      subtitle: c.reportSub || 'Blood, urine, pathology report',
      icon: FileText,
      tip: c.reportTip || '',
      frameHint: c.reportFrame || '',
      color: '#3B82F6',
    },
    {
      id: 'xray',
      title: c.xray || 'X-Ray / Scan',
      subtitle: c.xraySub || 'X-ray, CT, MRI print / film',
      icon: Scan,
      tip: c.xrayTip || '',
      frameHint: c.xrayFrame || '',
      color: '#8B5CF6',
    },
    {
      id: 'prescription',
      title: c.prescription || 'Prescription',
      subtitle: c.prescriptionSub || 'Doctor handwritten / printed Rx',
      icon: ClipboardList,
      tip: c.prescriptionTip || '',
      frameHint: c.prescriptionFrame || '',
      color: '#F59E0B',
    },
  ];
}

export default function CameraScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const SCAN_TYPES = buildScanTypes(t.camera || {});

  const initialType = route.params?.scanType || null;
  const [step, setStep] = useState(initialType ? 'capture' : 'select');
  const [scanType, setScanType] = useState(initialType);
  const [scannedImage, setScannedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const current = SCAN_TYPES.find((item) => item.id === scanType) || SCAN_TYPES[0];
  const Icon = current.icon;

  const goToResult = (imageUri) => {
    setScannedImage(imageUri);
    navigation.navigate('Result', {
      imageUri,
      scanMode: scanType === 'medicine' ? 'medicine' : 'report',
      scanType,
    });
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
      } else {
        // User cancelled or no image — stay on screen, no crash
        console.log('Scan cancelled or no image');
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
      console.log('Gallery error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectType = (type) => {
    setScanType(type.id);
    setStep('capture');
  };

  if (step === 'select') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={22} color={colors.textDark} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.camera?.whatScanning || 'What are you scanning?'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.selectList}
          showsVerticalScrollIndicator={false}
        >
          {SCAN_TYPES.map((type) => {
            const TypeIcon = type.icon;
            return (
              <Pressable
                key={type.id}
                style={styles.typeCard}
                onPress={() => selectType(type)}
              >
                <View
                  style={[
                    styles.typeIconWrap,
                    { backgroundColor: type.color + '18' },
                  ]}
                >
                  <TypeIcon size={26} color={type.color} />
                </View>
                <View style={styles.typeTextWrap}>
                  <Text style={styles.typeTitle}>{type.title}</Text>
                  <Text style={styles.typeSub}>{type.subtitle}</Text>
                </View>
                <ChevronLeft
                  size={18}
                  color={colors.textMuted}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (route.params?.scanType) {
              navigation.goBack();
            } else {
              setStep('select');
              setScannedImage(null);
            }
          }}
          style={styles.backBtn}
        >
          <ChevronLeft size={22} color={colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>{current.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tipBar, { backgroundColor: current.color + '15' }]}>
        <Icon size={16} color={current.color} />
        <Text style={[styles.tipBarText, { color: current.color }]}>
          {current.tip}
        </Text>
      </View>

      <View style={styles.body}>
        <View
          style={[
            styles.previewCard,
            { borderColor: current.color + '40' },
            scanType === 'medicine' ? styles.previewMedicine : styles.previewDoc,
          ]}
        >
          {scannedImage ? (
            <Image
              source={{ uri: scannedImage }}
              style={styles.preview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.emptyPreview}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: current.color + '18' },
                ]}
              >
                <Icon size={36} color={current.color} />
              </View>
              <Text style={styles.emptyTitle}>{current.frameHint}</Text>
              <Text style={styles.emptyHint}>
                {scanType === 'medicine'
                  ? t.camera?.medicineHint || 'Show strip / bottle label clearly'
                  : t.camera?.reportHint || 'Full page / film should fit in the frame'}
              </Text>

              {scanType === 'medicine' ? (
                <View style={[styles.guideFrame, styles.guideMedicine]}>
                  <View
                    style={[styles.corner, styles.tl, { borderColor: current.color }]}
                  />
                  <View
                    style={[styles.corner, styles.tr, { borderColor: current.color }]}
                  />
                  <View
                    style={[styles.corner, styles.bl, { borderColor: current.color }]}
                  />
                  <View
                    style={[styles.corner, styles.br, { borderColor: current.color }]}
                  />
                </View>
              ) : (
                <View style={[styles.guideFrame, styles.guideDoc]}>
                  <View
                    style={[styles.corner, styles.tl, { borderColor: current.color }]}
                  />
                  <View
                    style={[styles.corner, styles.tr, { borderColor: current.color }]}
                  />
                  <View
                    style={[styles.corner, styles.bl, { borderColor: current.color }]}
                  />
                  <View
                    style={[styles.corner, styles.br, { borderColor: current.color }]}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={current.color}
            style={{ marginTop: 24 }}
          />
        ) : (
          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: current.color }]}
              onPress={startScan}
            >
              <ScanLine size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {scanType === 'medicine' ? (t.camera?.scanMedicine || 'Scan Medicine') : (t.camera?.scanDocument || 'Scan Document')}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={pickFromGallery}>
              <ImageIcon size={18} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>{t.camera?.uploadGallery || 'Upload from Gallery'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9F9',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textDark,
  },
  selectList: {
    paddingBottom: 40,
    gap: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  typeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTextWrap: { flex: 1 },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  typeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  tipBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  tipBarText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  body: { flex: 1 },
  previewCard: {
    flex: 1,
    maxHeight: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    elevation: 2,
  },
  previewMedicine: { maxHeight: 320 },
  previewDoc: { maxHeight: 400 },
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  guideFrame: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderStyle: 'dashed',
  },
  guideMedicine: {
    width: '55%',
    height: '40%',
    borderRadius: 12,
  },
  guideDoc: {
    width: '78%',
    height: '70%',
    borderRadius: 8,
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderWidth: 3,
  },
  tl: {
    top: -1,
    left: -1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  tr: {
    top: -1,
    right: -1,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  bl: {
    bottom: -1,
    left: -1,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  br: {
    bottom: -1,
    right: -1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },
  actions: {
    marginTop: 18,
    marginBottom: 12,
    gap: 10,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border || '#E2E8F0',
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
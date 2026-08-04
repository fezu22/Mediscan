import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { X, Camera as CameraIcon, Image as ImageIcon, SwitchCamera, Zap, ZapOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { darkColors } from '../../theme/colors';

export default function CameraScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);

  const { hasPermission, requestPermission } = useCameraPermission();
  const [facing, setFacing] = useState('back'); // 'back' | 'front'
  const device = useCameraDevice(facing);
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState('medicine'); // 'medicine' | 'report'
  const [capturing, setCapturing] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      setPermissionChecked(true);
    })();
  }, [hasPermission, requestPermission]);
const onImageReady = useCallback(
  (uri) => {
    // Result screen mat kholo — seedha Home pe wapas
    console.log('Image captured:', uri, 'type:', mode);
    navigation.navigate('Main');
  },
  [navigation, mode],
);

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePhoto({
        flash: flash ? 'on' : 'off',
        enableShutterSound: true,
      });
    const uri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
                   onImageReady(uri);
    } catch (e) {
      console.error('Capture error', e);
      Alert.alert('Error', 'Could not take photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const openGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
        selectionLimit: 1,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Could not open gallery');
        return;
      }

     const uri = result.assets?.[0]?.uri;
if (uri) onImageReady(uri);
    } catch (e) {
      console.error('Gallery error', e);
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  const toggleFacing = () => setFacing((f) => (f === 'back' ? 'front' : 'back'));
  const toggleFlash = () => setFlash((f) => !f);

  // Permission not granted
  if (permissionChecked && !hasPermission) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <CameraIcon size={48} color={colors.primary} />
        <Text style={styles.permTitle}>Camera permission needed</Text>
        <Text style={styles.permText}>
          MedScan needs camera access to scan medicines and lab reports.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable style={styles.galleryBtn} onPress={openGallery}>
          <ImageIcon size={18} color={colors.primary} />
          <Text style={styles.galleryBtnText}>Pick from Gallery instead</Text>
        </Pressable>
        <Pressable style={styles.closeLink} onPress={() => navigation.goBack()}>
          <Text style={styles.closeLinkText}>Go back</Text>
        </Pressable>
        <Pressable
          style={styles.settingsLink}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.settingsText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  // Loading device
  if (!device || !permissionChecked) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Starting camera…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        enableZoomGesture
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <X size={24} color="#fff" />
        </Pressable>

        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modeBtn, mode === 'medicine' && styles.modeActive]}
            onPress={() => setMode('medicine')}
          >
            <Text style={[styles.modeText, mode === 'medicine' && styles.modeTextActive]}>
              Medicine
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'report' && styles.modeActive]}
            onPress={() => setMode('report')}
          >
            <Text style={[styles.modeText, mode === 'report' && styles.modeTextActive]}>
              Report
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.iconBtn} onPress={toggleFlash}>
          {flash ? <Zap size={22} color="#FFD60A" /> : <ZapOff size={22} color="#fff" />}
        </Pressable>
      </View>

      {/* Frame guide */}
      <View style={styles.frameGuide} pointerEvents="none">
        <View style={styles.frameCorner} />
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={styles.sideBtn} onPress={openGallery}>
          <ImageIcon size={26} color="#fff" />
          <Text style={styles.sideLabel}>Gallery</Text>
        </Pressable>

        <Pressable
          style={[styles.shutter, capturing && styles.shutterDisabled]}
          onPress={takePhoto}
          disabled={capturing}
        >
          {capturing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>

        <Pressable style={styles.sideBtn} onPress={toggleFacing}>
          <SwitchCamera size={26} color="#fff" />
          <Text style={styles.sideLabel}>Flip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: darkColors.background,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    padding: 4,
  },
  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeActive: {
    backgroundColor: darkColors.primary,
  },
  modeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#fff',
  },
  frameGuide: {
    position: 'absolute',
    top: '22%',
    left: '8%',
    right: '8%',
    bottom: '32%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
  },
  sideBtn: {
    alignItems: 'center',
    width: 72,
  },
  sideLabel: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkColors.textDark,
    marginTop: 16,
    textAlign: 'center',
  },
  permText: {
    fontSize: 14,
    color: darkColors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  permBtn: {
    marginTop: 24,
    backgroundColor: darkColors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  permBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  galleryBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  galleryBtnText: {
    color: darkColors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  closeLink: {
    marginTop: 12,
  },
  closeLinkText: {
    color: darkColors.textMuted,
    fontSize: 14,
  },
  settingsLink: {
    marginTop: 8,
  },
  settingsText: {
    color: darkColors.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  loadingText: {
    marginTop: 12,
    color: darkColors.textMuted,
  },
});
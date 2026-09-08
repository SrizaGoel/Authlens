import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, ScrollView, Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import BASE_URL from '../config';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4FF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#00D4FF" style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionDesc}>
          To register a face, we need access to your camera to take a photo.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name first.');
      return;
    }
    if (cameraRef.current) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });
        setCapturedPhoto(photo);
      } catch (err) {
        Alert.alert('Error', 'Failed to capture photo: ' + err.message);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !capturedPhoto) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('image', {
        uri: capturedPhoto.uri,
        name: `${name.replace(/\s+/g, '_')}.jpg`,
        type: 'image/jpeg',
      });

      const response = await axios.post(`${BASE_URL}/register-face`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 15000,
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          response.data.message || 'Face registered successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Registration Failed', response.data.message || 'Could not register face.');
      }
    } catch (err) {
      console.log(err);
      Alert.alert(
        'Connection Error',
        err.response?.data?.message || 'Could not connect to the NHAI server. Please check config/network.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Employee Credentials</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#00D4FF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Enter full name"
          placeholderTextColor="#4A5568"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
      </View>

      <Text style={styles.sectionTitle}>Face Capture</Text>
      <View style={styles.cameraFrame}>
        {capturedPhoto ? (
          <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} />
        ) : (
          <CameraView
            style={styles.camera}
            facing="front"
            ref={cameraRef}
          />
        )}
      </View>

      {capturedPhoto ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton]}
            onPress={() => setCapturedPhoto(null)}
            disabled={loading}
          >
            <Ionicons name="refresh-outline" size={20} color="#FF4D6D" />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.submitButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0A0F1E" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#0A0F1E" />
                <Text style={styles.submitText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator size="small" color="#0A0F1E" />
          ) : (
            <>
              <Ionicons name="camera-reverse-outline" size={24} color="#0A0F1E" />
              <Text style={styles.captureButtonText}>Capture Photo</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { padding: 24, alignItems: 'center' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0F1E', justifyContent: 'center', alignItems: 'center' },
  permissionContainer: { flex: 1, backgroundColor: '#0A0F1E', justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionIcon: { marginBottom: 20 },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  permissionDesc: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  permissionButton: { backgroundColor: '#00D4FF', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 25 },
  permissionButtonText: { color: '#0A0F1E', fontSize: 15, fontWeight: '700' },
  sectionTitle: { alignSelf: 'flex-start', color: '#4A5568', fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, marginTop: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24, width: '100%' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, color: '#FFFFFF', fontSize: 16 },
  cameraFrame: { width: '100%', aspectRatio: 3 / 4, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#00D4FF', backgroundColor: '#1A202C', marginBottom: 24, shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  camera: { flex: 1 },
  previewImage: { flex: 1, resizeMode: 'cover' },
  captureButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00D4FF', width: '100%', height: 56, borderRadius: 28, gap: 10 },
  captureButtonText: { color: '#0A0F1E', fontSize: 16, fontWeight: '700' },
  actionRow: { flexDirection: 'row', width: '100%', gap: 12 },
  actionButton: { flex: 1, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retakeButton: { borderWidth: 1, borderColor: '#FF4D6D', backgroundColor: 'rgba(255, 77, 109, 0.05)' },
  retakeText: { color: '#FF4D6D', fontSize: 16, fontWeight: '700' },
  submitButton: { backgroundColor: '#00FF9D' },
  submitText: { color: '#0A0F1E', fontSize: 16, fontWeight: '700' },
});

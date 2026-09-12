import * as FileSystem from 'expo-file-system/legacy';
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Image, Alert, Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import BASE_URL from '../config';
import ChallengeOverlay from '../components/ChallengeOverlay';

const { width } = Dimensions.get('window');

export default function VerifyScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Challenge states
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [challengeType, setChallengeType] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [attempts, setAttempts] = useState(1);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef(null);

  // Result states
  const [resultState, setResultState] = useState(null); // 'SUCCESS' | 'REJECTED' | 'UNKNOWN'
  const [resultDetails, setResultDetails] = useState({});
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);

  const cameraRef = useRef(null);

  // Timer countdown handler
  useEffect(() => {
    if (isChallengeActive && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleChallengeTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isChallengeActive, timer]);

  const handleChallengeTimeout = () => {
    setIsChallengeActive(false);
    setResultState('REJECTED');
    setResultDetails({
      title: 'Session Expired',
      message: 'Liveness verification timed out. You must complete the challenge within 30 seconds.',
    });
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF9D" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#00FF9D" style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionDesc}>
          We require camera access to perform facial authentication and liveness verification.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleVerify = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);
      setLoadingText('Scanning face...');
      setLoading(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      setCapturedPhotoUri(photo.uri);
      setLoadingText('Analyzing credentials...');

      const response = await FileSystem.uploadAsync(`${BASE_URL}/verify`, photo.uri, {
        httpMethod: 'POST',
        uploadType: 1,
        fieldName: 'image',
      });
      const data = JSON.parse(response.body);

      if (data.success && data.status === 'VERIFIED') {
        setResultState('SUCCESS');
        setResultDetails({
          user: data.user,
          confidence: data.confidence,
          message: 'Identity and liveness verified successfully.',
        });
      } else if (data.success && data.status === 'CHALLENGE_REQUIRED') {
        // Trigger challenge flow
        setSessionId(data.session_id);
        setChallengeType(data.challenge);
        setAttempts(1);
        setTimer(30);
        setIsChallengeActive(true);
      } else {
        setResultState('UNKNOWN');
        setResultDetails({
          message: data.message || 'Identity not matched in the records.',
        });
      }
    } catch (err) {
      console.log('ERROR MESSAGE:', err.message);

      if (err.response) {
        console.log('STATUS:', err.response.status);
        console.log('DATA:', err.response.data);
      }

      Alert.alert(
        'Verification Error',
        err.response?.data?.message || err.message
      );
    } finally {
      setIsCapturing(false);
      setLoading(false);
    }
  };

  const handleSubmitChallenge = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);
      setLoadingText('Capturing gesture...');
      setLoading(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      setCapturedPhotoUri(photo.uri);

      if (timerRef.current) clearInterval(timerRef.current);

      setLoadingText('Verifying liveness proof...');

      const response = await FileSystem.uploadAsync(`${BASE_URL}/verify-challenge`, photo.uri, {
        httpMethod: 'POST',
        uploadType: 1,
        fieldName: 'image',
        parameters: {
          session_id: sessionId
        }
      });
      const data = JSON.parse(response.body);

      if (data.success && data.status === 'VERIFIED') {
        setIsChallengeActive(false);
        setResultState('SUCCESS');
        setResultDetails({
          user: data.user,
          confidence: data.confidence,
          message: data.message || 'Challenge passed and face verified successfully!',
        });
      } else if (!data.success && data.status === 'CHALLENGE_REQUIRED') {
        // Liveness check failed but attempts left
        setChallengeType(data.challenge);
        setAttempts((prev) => prev + 1);
        setTimer(30); // reset timer
        Alert.alert('Attempt Failed', data.message || 'Liveness check failed. Try again.');
      } else {
        // Rejected completely
        setIsChallengeActive(false);
        setResultState('REJECTED');
        setResultDetails({
          title: 'Access Denied',
          message: data.message || 'Liveness check or identity verification failed.',
        });
      }
    } catch (err) {
      console.log(err);
      Alert.alert(
        'Challenge Submission Error',
        err.response?.data?.message || 'Could not connect to the NHAI server.'
      );
      // Resume timer if error occurred
      setTimer(timer);
    } finally {
      setIsCapturing(false);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResultState(null);
    setResultDetails({});
    setCapturedPhotoUri(null);
    setIsChallengeActive(false);
    setChallengeType('');
    setSessionId('');
    setAttempts(1);
    setTimer(30);
  };

  // Render Result Screen (Success / Rejected / Unknown)
  if (resultState) {
    const isSuccess = resultState === 'SUCCESS';
    const isUnknown = resultState === 'UNKNOWN';
    
    return (
      <View style={[styles.container, styles.resultContainer]}>
        <View style={styles.resultCard}>
          <View style={[
            styles.resultIconBg, 
            { 
              backgroundColor: isSuccess ? 'rgba(0, 255, 157, 0.1)' : isUnknown ? 'rgba(251, 146, 60, 0.1)' : 'rgba(255, 77, 109, 0.1)',
              borderWidth: 3,
              borderColor: isSuccess ? '#00FF9D' : isUnknown ? '#FB923C' : '#FF4D6D',
            }
          ]}>
            {capturedPhotoUri ? (
              <Image 
                source={{ uri: capturedPhotoUri }} 
                style={styles.resultPhoto} 
              />
            ) : (
              <Ionicons 
                name={isSuccess ? 'checkmark-shield' : isUnknown ? 'warning-outline' : 'close-circle-outline'} 
                size={72} 
                color={isSuccess ? '#00FF9D' : isUnknown ? '#FB923C' : '#FF4D6D'} 
              />
            )}
            <View style={[
              styles.resultStatusBadge,
              { backgroundColor: isSuccess ? '#00FF9D' : isUnknown ? '#FB923C' : '#FF4D6D' }
            ]}>
              <Ionicons 
                name={isSuccess ? 'checkmark' : isUnknown ? 'help' : 'close'} 
                size={16} 
                color="#0A0F1E" 
              />
            </View>
          </View>

          <Text style={[
            styles.resultTitle, 
            { color: isSuccess ? '#00FF9D' : isUnknown ? '#FB923C' : '#FF4D6D' }
          ]}>
            {isSuccess ? 'ACCESS GRANTED' : isUnknown ? 'UNKNOWN WORKER' : 'ACCESS DENIED'}
          </Text>

          {isSuccess && (
            <View style={styles.userDetails}>
              <Text style={styles.userNameText}>{resultDetails.user}</Text>
              <Text style={styles.userConfidenceText}>Match Confidence: {resultDetails.confidence?.toFixed(1)}%</Text>
            </View>
          )}

          <Text style={styles.resultMessage}>{resultDetails.message}</Text>

          <TouchableOpacity 
            style={[
              styles.resultButton, 
              { backgroundColor: isSuccess ? '#00FF9D' : isUnknown ? '#FB923C' : '#FF4D6D' }
            ]}
            onPress={isSuccess ? () => navigation.goBack() : handleReset}
          >
            <Text style={styles.resultButtonText}>
              {isSuccess ? 'Done' : 'Try Again'}
            </Text>
          </TouchableOpacity>
          
          {!isSuccess && (
            <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelLinkText}>Back to Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Upper Status/Instruction */}
      <View style={styles.headerInfo}>
        <Ionicons name="scan-outline" size={24} color="#00D4FF" />
        <Text style={styles.headerText}>
          {isChallengeActive
            ? 'Align face and perform the gesture instruction'
            : 'Position your face clearly in the camera frame'}
        </Text>
      </View>

      {/* Camera Frame */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="front"
          ref={cameraRef}
        />
        {isChallengeActive && (
          <ChallengeOverlay
            challenge={challengeType}
            timer={timer}
            attempts={attempts}
          />
        )}

        {/* Full-Screen Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00FF9D" />
            <Text style={styles.loadingOverlayText}>{loadingText}</Text>
          </View>
        )}
      </View>

      {/* Verification Action Buttons */}
      <View style={styles.bottomControls}>
        {isChallengeActive ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.submitBtn]}
            onPress={handleSubmitChallenge}
            disabled={isCapturing || loading}
          >
            <Ionicons name="checkmark-done-circle-outline" size={24} color="#0A0F1E" />
            <Text style={styles.submitBtnText}>Verify Challenge Proof</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.verifyBtn]}
            onPress={handleVerify}
            disabled={isCapturing || loading}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color="#0A0F1E" />
            <Text style={styles.verifyBtnText}>Capture & Verify</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          disabled={isCapturing || loading}
        >
          <Text style={styles.backBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0F1E', justifyContent: 'center', alignItems: 'center' },
  permissionContainer: { flex: 1, backgroundColor: '#0A0F1E', justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionIcon: { marginBottom: 20 },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  permissionDesc: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  permissionButton: { backgroundColor: '#00FF9D', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 25 },
  permissionButtonText: { color: '#0A0F1E', fontSize: 15, fontWeight: '700' },
  
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  headerText: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00D4FF',
    backgroundColor: '#1A202C',
    position: 'relative',
  },
  camera: { flex: 1 },
  bottomControls: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
    borderRadius: 28,
    gap: 10,
  },
  verifyBtn: { backgroundColor: '#00D4FF' },
  verifyBtnText: { color: '#0A0F1E', fontSize: 16, fontWeight: '700' },
  submitBtn: { backgroundColor: '#00FF9D' },
  submitBtnText: { color: '#0A0F1E', fontSize: 16, fontWeight: '700' },
  backBtn: {
    paddingVertical: 12,
  },
  backBtnText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 30, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingOverlayText: {
    color: '#00FF9D',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Results Screen Styles
  resultContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
  },
  resultIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  resultPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  resultStatusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0F1E',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  userDetails: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  userConfidenceText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '600',
  },
  resultMessage: {
    color: '#A0AEC0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  resultButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultButtonText: {
    color: '#0A0F1E',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelLink: {
    marginTop: 18,
  },
  cancelLinkText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '700',
  },
});

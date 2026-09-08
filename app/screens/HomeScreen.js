import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import BASE_URL from '../config';

const CARDS = [
  {
    key: 'Register',
    label: 'Register Face',
    icon: 'person-add-outline',
    color: '#00D4FF',
    bg: 'rgba(0,212,255,0.1)',
    desc: 'Enroll a new field worker',
  },
  {
    key: 'Verify',
    label: 'Verify Access',
    icon: 'shield-checkmark-outline',
    color: '#00FF9D',
    bg: 'rgba(0,255,157,0.1)',
    desc: 'Authenticate with liveness check',
  },
  {
    key: 'Users',
    label: 'Personnel',
    icon: 'people-outline',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)',
    desc: 'View registered workers',
  },
  {
    key: 'Logs',
    label: 'Auth Logs',
    icon: 'list-outline',
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.1)',
    desc: 'View authentication history',
  },
];

export default function HomeScreen({ navigation }) {
  const [status, setStatus] = React.useState('Checking...');
  const [statusColor, setStatusColor] = React.useState('#FB923C');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    axios.get(`${BASE_URL}/`, { timeout: 3000 })
      .then(() => { setStatus('Server Online'); setStatusColor('#00FF9D'); })
      .catch(() => { setStatus('Server Offline'); setStatusColor('#FF4D6D'); });
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.dot, { backgroundColor: statusColor, transform: [{ scale: pulse }] }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
      </View>

      <Text style={styles.title}>NHAI</Text>
      <Text style={styles.subtitle}>Field Authentication System</Text>
      <Text style={styles.tagline}>Secure • Fast • Reliable</Text>

      {/* Cards */}
      <View style={styles.grid}>
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={[styles.card, { backgroundColor: card.bg, borderColor: card.color }]}
            onPress={() => navigation.navigate(card.key)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, { backgroundColor: card.bg }]}>
              <Ionicons name={card.icon} size={32} color={card.color} />
            </View>
            <Text style={[styles.cardLabel, { color: card.color }]}>{card.label}</Text>
            <Text style={styles.cardDesc}>{card.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.footer}>NHAI Hackathon 7.0  •  Face Auth v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { padding: 20, paddingTop: 40, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  title: {
    fontSize: 52, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: 6, textAlign: 'center',
  },
  subtitle: { fontSize: 14, color: '#00D4FF', letterSpacing: 3, marginTop: 4 },
  tagline: { fontSize: 11, color: '#4A5568', letterSpacing: 2, marginTop: 6, marginBottom: 36 },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  card: {
    width: '47%', borderRadius: 18, borderWidth: 1,
    padding: 20, alignItems: 'center', marginBottom: 4,
  },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  cardDesc: { fontSize: 11, color: '#718096', textAlign: 'center', lineHeight: 16 },
  footer: { fontSize: 11, color: '#2D3748', marginTop: 36, letterSpacing: 1 },
});

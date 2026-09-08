import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import BASE_URL from '../config';

export default function LogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    try {
      setError(null);
      const response = await axios.get(`${BASE_URL}/logs`, { timeout: 8000 });
      // Sort logs descending by ID or timestamp
      const sortedLogs = (response.data.logs || []).sort((a, b) => b.id - a.id);
      setLogs(sortedLogs);
    } catch (err) {
      console.log(err);
      setError('Could not connect to the NHAI server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'VERIFIED':
      case 'CHALLENGE_PASSED':
        return {
          bg: 'rgba(0, 255, 157, 0.05)',
          border: 'rgba(0, 255, 157, 0.15)',
          color: '#00FF9D',
          icon: 'checkmark-circle-outline'
        };
      case 'UNKNOWN':
        return {
          bg: 'rgba(251, 146, 60, 0.05)',
          border: 'rgba(251, 146, 60, 0.15)',
          color: '#FB923C',
          icon: 'help-circle-outline'
        };
      case 'CHALLENGE_FAILED':
      case 'REJECTED':
      default:
        return {
          bg: 'rgba(255, 77, 109, 0.05)',
          border: 'rgba(255, 77, 109, 0.15)',
          color: '#FF4D6D',
          icon: 'close-circle-outline'
        };
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    // Expected database format: "YYYY-MM-DD HH:MM:SS"
    // Let's make it look cleaner: e.g. "04 Jun, 07:34 PM"
    try {
      const parts = ts.split(' ');
      if (parts.length < 2) return ts;
      const dateParts = parts[0].split('-');
      const timeParts = parts[1].split(':');
      
      const year = parseInt(dateParts[0]);
      const monthIndex = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);
      
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      
      const dateObj = new Date(year, monthIndex, day, hours, minutes);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const cleanHours = hours % 12 || 12;
      const cleanMinutes = minutes < 10 ? '0' + minutes : minutes;
      
      return `${day} ${months[monthIndex]}, ${cleanHours}:${cleanMinutes} ${ampm}`;
    } catch (e) {
      return ts;
    }
  };

  const renderLogItem = ({ item }) => {
    const style = getStatusStyles(item.result);
    return (
      <View style={[styles.logCard, { backgroundColor: style.bg, borderColor: style.border }]}>
        <View style={[styles.statusIcon, { backgroundColor: style.bg }]}>
          <Ionicons name={style.icon} size={28} color={style.color} />
        </View>
        <View style={styles.logInfo}>
          <View style={styles.logRow}>
            <Text style={styles.logUser}>{item.user || 'Unknown User'}</Text>
            <Text style={[styles.logStatusText, { color: style.color }]}>{item.result}</Text>
          </View>
          <View style={styles.logRow}>
            <Text style={styles.logTime}>{formatTimestamp(item.timestamp)}</Text>
            {item.confidence !== undefined && item.confidence > 0 ? (
              <Text style={styles.logConfidence}>Match: {item.confidence.toFixed(1)}%</Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FB923C" />
        <Text style={styles.loadingText}>Fetching access history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={20} color="#FF4D6D" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLogs}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FB923C" />
        }
        ListEmptyComponent={
          !error && (
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={64} color="#4A5568" />
              <Text style={styles.emptyTitle}>No Log Entries Yet</Text>
              <Text style={styles.emptySubtitle}>All authentication attempts will be logged here.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  centerContainer: { flex: 1, backgroundColor: '#0A0F1E', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#718096', marginTop: 12, fontSize: 14, letterSpacing: 0.5 },
  listContent: { padding: 20, paddingBottom: 40 },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logInfo: { flex: 1, gap: 4 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logUser: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  logStatusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  logTime: { color: '#718096', fontSize: 12 },
  logConfidence: { color: '#4A5568', fontSize: 11, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 77, 109, 0.2)',
    padding: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  errorText: { color: '#FF4D6D', fontSize: 13, flex: 1 },
  retryButton: { backgroundColor: '#FF4D6D', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  retryButtonText: { color: '#0A0F1E', fontSize: 12, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#718096', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

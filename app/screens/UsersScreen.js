import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import BASE_URL from '../config';

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setError(null);
      const response = await axios.get(`${BASE_URL}/users`, { timeout: 8000 });
      setUsers(response.data.users || []);
    } catch (err) {
      console.log(err);
      setError('Could not connect to the NHAI server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ID: #{item.id}</Text>
        </View>
      </View>
      <View style={styles.checkIconContainer}>
        <Ionicons name="checkmark-circle" size={24} color="#00FF9D" />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={styles.loadingText}>Fetching personnel records...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={20} color="#FF4D6D" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A78BFA" />
        }
        ListEmptyComponent={
          !error && (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#4A5568" />
              <Text style={styles.emptyTitle}>No Personnel Registered</Text>
              <Text style={styles.emptySubtitle}>Go back and register a new face to get started.</Text>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#A78BFA',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userInfo: { flex: 1 },
  userName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: '#718096', fontSize: 11, fontWeight: '600' },
  checkIconContainer: { justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
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

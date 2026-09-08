import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import VerifyScreen from './screens/VerifyScreen';
import UsersScreen from './screens/UsersScreen';
import LogsScreen from './screens/LogsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0F1E' },
          headerTintColor: '#00D4FF',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          cardStyle: { backgroundColor: '#0A0F1E' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'NHAI • Field Auth' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Register Face' }}
        />
        <Stack.Screen
          name="Verify"
          component={VerifyScreen}
          options={{ title: 'Verify Identity' }}
        />
        <Stack.Screen
          name="Users"
          component={UsersScreen}
          options={{ title: 'Registered Personnel' }}
        />
        <Stack.Screen
          name="Logs"
          component={LogsScreen}
          options={{ title: 'Authentication Logs' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

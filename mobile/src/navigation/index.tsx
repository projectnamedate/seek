import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';

import { RootStackParamList } from '../types';
import { colors } from '../theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import BountyRevealScreen from '../screens/BountyRevealScreen';
import CameraScreen from '../screens/CameraScreen';
import ValidatingScreen from '../screens/ValidatingScreen';
import ResultScreen from '../screens/ResultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.dark },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="BountyReveal"
          component={BountyRevealScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Validating"
          component={ValidatingScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

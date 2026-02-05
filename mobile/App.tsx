import React from 'react';
import { StatusBar } from 'expo-status-bar';
import Navigation from './src/navigation';
import { AppProvider } from './src/context';

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Navigation />
    </AppProvider>
  );
}

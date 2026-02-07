import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { clusterApiUrl } from '@solana/web3.js';
import Navigation from './src/navigation';
import { AppProvider } from './src/context';
import SplashScreen from './src/screens/SplashScreen';

// Solana network configuration
const SOLANA_NETWORK = 'devnet';
const ENDPOINT = clusterApiUrl(SOLANA_NETWORK);

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </>
    );
  }

  return (
    <MobileWalletProvider
      chain={`solana:${SOLANA_NETWORK}`}
      endpoint={ENDPOINT}
      identity={{
        name: 'Seek',
        uri: 'https://seek.app',
        icon: 'favicon.png',
      }}
    >
      <AppProvider>
        <StatusBar style="light" />
        <Navigation />
      </AppProvider>
    </MobileWalletProvider>
  );
}

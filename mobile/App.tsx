import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { clusterApiUrl } from '@solana/web3.js';
import Navigation from './src/navigation';
import { AppProvider } from './src/context';
import SplashScreen from './src/screens/SplashScreen';
import { NETWORK } from './src/config';
import { initSentry } from './src/services/sentry.service';

// Solana cluster endpoint — follows NETWORK toggle in src/config/index.ts
const ENDPOINT = clusterApiUrl(NETWORK === 'mainnet-beta' ? 'mainnet-beta' : 'devnet');

// Initialize Sentry as early as possible (no-op if SENTRY_DSN not set)
initSentry();

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
      chain={`solana:${NETWORK}`}
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

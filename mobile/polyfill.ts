// Polyfills for Solana - must be imported before anything else
import { install } from 'react-native-quick-crypto';
import { Buffer } from 'buffer';

// Install crypto polyfills
install();

// Make Buffer available globally
global.Buffer = Buffer;

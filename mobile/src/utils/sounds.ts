import { Audio } from 'expo-av';

// Sound objects cache
let winSound: Audio.Sound | null = null;
let loseSound: Audio.Sound | null = null;

// Initialize audio mode
export async function initAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  } catch (error) {
    console.log('[Sounds] Failed to init audio:', error);
  }
}

// Play win sound
export async function playWinSound() {
  try {
    if (!winSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/win.mp3')
      );
      winSound = sound;
    }
    await winSound.setPositionAsync(0);
    await winSound.playAsync();
  } catch (error) {
    console.log('[Sounds] Failed to play win sound:', error);
  }
}

// Play lose sound
export async function playLoseSound() {
  try {
    if (!loseSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/lose.mp3')
      );
      loseSound = sound;
    }
    await loseSound.setPositionAsync(0);
    await loseSound.playAsync();
  } catch (error) {
    console.log('[Sounds] Failed to play lose sound:', error);
  }
}

// Cleanup sounds
export async function unloadSounds() {
  if (winSound) {
    await winSound.unloadAsync();
    winSound = null;
  }
  if (loseSound) {
    await loseSound.unloadAsync();
    loseSound = null;
  }
}

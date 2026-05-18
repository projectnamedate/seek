import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

export type SeekPermissionName = 'camera' | 'location';

export type SeekPermissionState = {
  cameraGranted: boolean;
  locationGranted: boolean;
  canAskAgain: boolean;
  missing: SeekPermissionName[];
};

type PermissionStatus = {
  granted: boolean;
  canAskAgain: boolean;
};

const DENIED_PERMISSION: PermissionStatus = {
  granted: false,
  canAskAgain: false,
};

function buildPermissionState(
  camera: PermissionStatus,
  location: PermissionStatus,
): SeekPermissionState {
  const missing: SeekPermissionName[] = [];
  if (!camera.granted) missing.push('camera');
  if (!location.granted) missing.push('location');

  return {
    cameraGranted: camera.granted,
    locationGranted: location.granted,
    canAskAgain: (camera.granted || camera.canAskAgain) && (location.granted || location.canAskAgain),
    missing,
  };
}

export function hasSeekPermissions(state: SeekPermissionState | null): boolean {
  return Boolean(state?.cameraGranted && state.locationGranted);
}

export function formatMissingPermissions(state: SeekPermissionState | null): string {
  if (!state || state.missing.length === 0) return 'Camera and location';
  return state.missing
    .map((permission) => (permission === 'camera' ? 'Camera' : 'Location'))
    .join(' and ');
}

async function getCameraPermission(request: boolean): Promise<PermissionStatus> {
  try {
    let camera = await Camera.getCameraPermissionsAsync();
    if (request && !camera.granted && camera.canAskAgain) {
      camera = await Camera.requestCameraPermissionsAsync();
    }
    return {
      granted: camera.granted,
      canAskAgain: camera.canAskAgain,
    };
  } catch {
    return DENIED_PERMISSION;
  }
}

async function getLocationPermission(request: boolean): Promise<PermissionStatus> {
  try {
    let location = await Location.getForegroundPermissionsAsync();
    if (request && !location.granted && location.canAskAgain) {
      location = await Location.requestForegroundPermissionsAsync();
    }
    return {
      granted: location.granted,
      canAskAgain: location.canAskAgain,
    };
  } catch {
    return DENIED_PERMISSION;
  }
}

export async function getSeekPermissions(): Promise<SeekPermissionState> {
  const [camera, location] = await Promise.all([
    getCameraPermission(false),
    getLocationPermission(false),
  ]);
  return buildPermissionState(camera, location);
}

export async function requestSeekPermissions(): Promise<SeekPermissionState> {
  const camera = await getCameraPermission(true);
  const location = await getLocationPermission(true);
  return buildPermissionState(camera, location);
}

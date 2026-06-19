import { accelerometer, SensorTypes, setUpdateIntervalForType } from 'react-native-sensors';

import { isShakeSample } from './shakeDetection';

const SENSOR_UPDATE_INTERVAL_MS = 100;
const SHAKE_DEBOUNCE_MS = 1800;

type ShakeListener = () => void;

const listeners = new Set<ShakeListener>();
let teardownSensor: (() => void) | null = null;

function notifyShakeListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function ensureSensorSubscription(): void {
  if (teardownSensor) {
    return;
  }

  let lastX = 0;
  let lastY = 0;
  let lastZ = 0;
  let lastSensorUpdateAt = 0;
  let lastShakeAt = 0;

  try {
    setUpdateIntervalForType(SensorTypes.accelerometer, SENSOR_UPDATE_INTERVAL_MS);
  } catch {
    return;
  }

  const subscription = accelerometer.subscribe(
    ({ x, y, z }) => {
      const now = Date.now();
      const elapsed = now - lastSensorUpdateAt;
      if (elapsed < SENSOR_UPDATE_INTERVAL_MS * 0.75) {
        return;
      }

      const isShake = isShakeSample(x, y, z, lastX, lastY, lastZ, elapsed);

      lastSensorUpdateAt = now;
      lastX = x;
      lastY = y;
      lastZ = z;

      if (!isShake) {
        return;
      }

      if (now - lastShakeAt < SHAKE_DEBOUNCE_MS) {
        return;
      }

      lastShakeAt = now;
      notifyShakeListeners();
    },
    () => {},
  );

  teardownSensor = () => {
    subscription.unsubscribe();
    teardownSensor = null;
  };
}

export function addShakeListener(listener: ShakeListener): () => void {
  listeners.add(listener);
  ensureSensorSubscription();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && teardownSensor) {
      teardownSensor();
    }
  };
}

/** @deprecated Prefer addShakeListener. */
export function subscribeShake(listener: ShakeListener): () => void {
  return addShakeListener(listener);
}

/** Test-only reset. */
export function resetShakeSensorForTests(): void {
  if (teardownSensor) {
    teardownSensor();
  }
  listeners.clear();
}

import { accelerometer, SensorTypes, setUpdateIntervalForType } from 'react-native-sensors';

const SHAKE_SPEED_THRESHOLD = 900;
const SENSOR_UPDATE_INTERVAL_MS = 100;
const SHAKE_DEBOUNCE_MS = 2000;

export function subscribeShake(onShake: () => void): () => void {
  let lastX = 0;
  let lastY = 0;
  let lastZ = 0;
  let lastSensorUpdateAt = 0;
  let lastShakeAt = 0;

  try {
    setUpdateIntervalForType(SensorTypes.accelerometer, SENSOR_UPDATE_INTERVAL_MS);
  } catch {
    return () => {};
  }

  const subscription = accelerometer.subscribe(
    ({ x, y, z }) => {
      const now = Date.now();
      const elapsed = now - lastSensorUpdateAt;
      if (elapsed < SENSOR_UPDATE_INTERVAL_MS * 0.75) {
        return;
      }

      const speed = (Math.abs(x + y + z - lastX - lastY - lastZ) / Math.max(elapsed, 1)) * 10000;

      lastSensorUpdateAt = now;
      lastX = x;
      lastY = y;
      lastZ = z;

      if (speed <= SHAKE_SPEED_THRESHOLD) {
        return;
      }

      if (now - lastShakeAt < SHAKE_DEBOUNCE_MS) {
        return;
      }

      lastShakeAt = now;
      onShake();
    },
    () => {},
  );

  return () => {
    subscription.unsubscribe();
  };
}

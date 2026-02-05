import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  endTime: number;
  onExpire?: () => void;
  interval?: number;
}

interface UseTimerReturn {
  timeLeft: number;
  isExpired: boolean;
  isWarning: boolean;
  formatted: string;
  restart: (newEndTime: number) => void;
}

/**
 * Hook for countdown timers
 */
export function useTimer({
  endTime,
  onExpire,
  interval = 1000,
}: UseTimerOptions): UseTimerReturn {
  const [targetTime, setTargetTime] = useState(endTime);
  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.floor((endTime - Date.now()) / 1000))
  );
  const onExpireRef = useRef(onExpire);

  // Keep callback ref updated
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Timer logic
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        onExpireRef.current?.();
      }
    };

    // Initial tick
    tick();

    // Start interval
    const timer = setInterval(tick, interval);

    return () => clearInterval(timer);
  }, [targetTime, interval]);

  // Format time as MM:SS
  const formatted = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
    .toString()
    .padStart(2, '0')}`;

  // Restart with new end time
  const restart = useCallback((newEndTime: number) => {
    setTargetTime(newEndTime);
  }, []);

  return {
    timeLeft,
    isExpired: timeLeft <= 0,
    isWarning: timeLeft > 0 && timeLeft <= 30,
    formatted,
    restart,
  };
}

export default useTimer;

import React, { useState, useEffect } from 'react';

export default function CountdownBadge({ temp_paused_until }) {
  const calculateSeconds = () => {
    if (!temp_paused_until) return 0;
    const diff = new Date(temp_paused_until).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = calculateSeconds();
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [temp_paused_until]);

  return <span>{secondsLeft}</span>;
}

import React, { useEffect, useState } from 'react';
import { useLucasStore } from '../../../app/store/lucasStore';
import './GlitchOverlay.css';

export const GlitchOverlay: React.FC = () => {
  const glitchLevel = useLucasStore((state) => state.glitchLevel);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (glitchLevel > 0) {
      setActive(true);
      // Optional: auto-disable after some time if it's meant to be a burst
      // but for now let it be controlled by the store.
    } else {
      setActive(false);
    }
  }, [glitchLevel]);

  if (!active) return null;

  // Map 1-10 glitchLevel to intensity
  const intensity = Math.min(10, Math.max(0, glitchLevel));

  return (
    <div className={`glitch-layer intensity-${intensity}`}>
      <div className="glitch-copy" />
      <div className="glitch-copy" />
      <div className="glitch-copy" />
      <div className="glitch-scanlines" />
    </div>
  );
};

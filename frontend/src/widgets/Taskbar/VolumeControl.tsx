import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { audioManager } from '../../features/story-runtime/audioManager';

export const VolumeControl = () => {
  const [volume, setVolume] = useState(audioManager.getVolume());
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowVolumeSlider(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 2000);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    audioManager.setVolume(newVol);
  };

  return (
    <div 
      className="relative flex items-center h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="text-white text-xs cursor-pointer select-none">
        {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
      </span>
      {showVolumeSlider && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 mb-2 p-2 bg-black/80 border border-white/20 rounded shadow-lg backdrop-blur-md z-[5000]">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleChange}
            className="w-24 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      )}
    </div>
  );
};

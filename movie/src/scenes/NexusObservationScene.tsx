import { useEffect, useState, useRef } from 'react';

const OVERLAY_TEXT = '[NEXUS OBSERVATION LAYER]';

function NexusObservationScene() {
  const [isVisible, setIsVisible] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Audio Context
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudio);
    return () => window.removeEventListener('click', initAudio);
  }, []);

  const playLowMechSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Very low mechanical sound as requested
    osc.frequency.setValueAtTime(30, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1);
  };

  useEffect(() => {
    // 0.5s rapid flashing
    let count = 0;
    const interval = setInterval(() => {
      setIsVisible(prev => !prev);
      count++;
      if (count >= 10) { // roughly 0.5s if interval is 50ms
        clearInterval(interval);
        setIsVisible(true);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="scene-container" style={{ background: '#fff', justifyContent: 'center', alignItems: 'center' }}>
      <div className={`nexus-logo ${isVisible ? 'visible' : 'hidden'}`}>
        <div className="nexus-text">NEXUS</div>
        <div className="nexus-subtext">{OVERLAY_TEXT}</div>
      </div>

      {!audioContextRef.current && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: '10px', color: '#888' }} onClick={playLowMechSound}>
          Click to enable audio
        </div>
      )}

      {audioContextRef.current && (
        <button 
          onClick={playLowMechSound}
          style={{ position: 'absolute', bottom: 20, right: 20, background: '#000', color: '#fff', border: 'none', padding: '10px' }}
        >
          START SENSORS
        </button>
      )}
    </div>
  );
}

export default NexusObservationScene;

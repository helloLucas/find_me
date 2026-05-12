import { useEffect, useRef } from 'react';

const OVERLAY_TEXT = '';

function SandboxSaveScene() {
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

  const playSaveSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Deep, steady low electronic sound
    osc.frequency.setValueAtTime(60, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  useEffect(() => {
    const intervalId = setInterval(playSaveSound, 3000);
    playSaveSound();
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="scene-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Central Node */}
      <div className="safe-node-container">
        <div className="safe-node-core"></div>
        <div className="safe-node-pulse"></div>
        <div className="safe-node-label">safe_zone</div>
      </div>

      <div className="save-overlay-text" style={{
        position: 'absolute',
        bottom: '80px',
        top: 'auto',
        fontSize: '1.5rem',
        border: 'none',
        background: 'transparent',
        width: '100%',
        textAlign: 'center',
        left: '0',
        transform: 'none'
      }}>
        {OVERLAY_TEXT}
      </div>

      {!audioContextRef.current && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: '10px', color: '#004400' }}>
          Click to enable sound
        </div>
      )}
    </div>
  );
}

export default SandboxSaveScene;

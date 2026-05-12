import { useEffect, useState, useRef } from 'react';

const INITIAL_TEXT = `[NEXUS OBSERVATION LAYER]
Observer rejected PID 000_LUCAS.
Rollback route confirmed.
External free-will signature: stable.

[EXPERIMENT STATUS]
Phase 04 complete.
Proceed to next containment model.`;

function GlobalRollbackScene() {
  const [phase, setPhase] = useState(0); // 0: Red, 1: Washed, 2: Restored
  const [restoredText, setRestoredText] = useState('[ERASED]');
  const audioContextRef = useRef<AudioContext | null>(null);
  const warningOscRef = useRef<OscillatorNode | null>(null);
  const warningGainRef = useRef<GainNode | null>(null);

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

  const playWarningSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    
    warningOscRef.current = osc;
    warningGainRef.current = gain;
  };

  const fadeWarningSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx || !warningGainRef.current) return;
    
    warningGainRef.current.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2);
    setTimeout(() => {
      warningOscRef.current?.stop();
    }, 2000);
  };

  const playRestorationSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Simulate "broken voice to human voice" with a series of filtered noise and tones
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  useEffect(() => {
    // Phase Transitions
    const t0 = setTimeout(() => {
      // Trigger short glitch just before wash
      setPhase(-1); // -1: Resetting/Glitching
    }, 2800);

    const t1 = setTimeout(() => {
      setPhase(1); // 1: Washed
      fadeWarningSound();
    }, 3100); // Slight delay after glitch

    const t2 = setTimeout(() => {
      setPhase(2);
      playRestorationSound();
      
      // Animate [ERASED] -> [RESTORED]
      let currentText = '[ERASED]';
      const targetText = '[RESTORED]';
      let i = 0;
      const interval = setInterval(() => {
        if (i >= targetText.length) {
          clearInterval(interval);
          return;
        }
        // This is a simple replacement animation
        setRestoredText(targetText.substring(0, i + 1) + currentText.substring(i + 1));
        i++;
      }, 100);
    }, 5000); // After 5s, restore

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className={`rollback-container ${phase >= 1 ? 'washed' : ''}`}>
      <div className={`white-wash-overlay ${phase === 1 ? 'active' : ''}`} />
      <div className={`reset-glitch-overlay ${phase === -1 ? 'active' : ''}`} />
      
      {phase <= 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="rollback-header" style={{ 
            maxWidth: '800px', 
            background: 'rgba(0,0,0,0.8)', 
            padding: '40px', 
            border: '1px solid rgba(255, 51, 51, 0.3)',
            boxShadow: '0 0 50px rgba(255, 51, 51, 0.1)',
            margin: 'auto'
          }}>
            <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: 'rgba(255, 51, 51, 0.5)' }}>LUCAS_SYSTEM_V4.02 // CORE_TERMINAL</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {INITIAL_TEXT}
              <span className="terminal-cursor" />
            </div>
          </div>
        </div>
      )}

      {phase >= 1 && (
        <div className="rollback-status">
          [GLOBAL ROLLBACK INITIATED]
        </div>
      )}

      {phase >= 2 && (
        <div className="restoration-text">
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>{restoredText}</div>
          <div>Restoring nodes...</div>
        </div>
      )}

      {phase === 0 && !audioContextRef.current && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: '10px' }} onClick={playWarningSound}>
          Click to enable cinematic audio
        </div>
      )}
      
      {phase === 0 && audioContextRef.current && (
        <button 
          onClick={playWarningSound}
          style={{ position: 'absolute', bottom: 20, right: 20, background: '#ff3333', color: '#000', border: 'none', padding: '10px' }}
        >
          START SCENE
        </button>
      )}
    </div>
  );
}

export default GlobalRollbackScene;

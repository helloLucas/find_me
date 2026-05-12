import { useEffect, useState, useRef } from 'react';

const DURATION_MS = 3000;
const INITIAL_INTERVAL = 100;
const MIN_INTERVAL = 5;

function DeletionLogScene() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextLogTimeRef = useRef<number>(INITIAL_INTERVAL);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudio);
    return () => window.removeEventListener('click', initAudio);
  }, []);

  const playTypingSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150 + Math.random() * 50, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  useEffect(() => {
    let timeoutId: number;

    const addLog = () => {
      const elapsed = Date.now() - startTimeRef.current;
      
      if (elapsed >= DURATION_MS) {
        setIsFinished(true);
        return;
      }

      const logsToAdd: string[] = [];
      const burstCount = Math.floor(2 + (elapsed / DURATION_MS) * 8);
      
      for (let i = 0; i < burstCount; i++) {
        const randomId = Math.floor(10000 + Math.random() * 90000);
        logsToAdd.push(`[ERROR] HUMAN ${randomId} DELETED`);
      }
      
      setLogs((prev) => [...logsToAdd, ...prev].slice(0, 1000));
      playTypingSound();

      const progress = elapsed / DURATION_MS;
      nextLogTimeRef.current = Math.max(MIN_INTERVAL, INITIAL_INTERVAL * (1 - progress * 1.5));

      timeoutId = window.setTimeout(addLog, nextLogTimeRef.current);
    };

    timeoutId = window.setTimeout(addLog, INITIAL_INTERVAL);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="scene-container">
      <div className="log-waterfall">
        {logs.map((log, i) => (
          <div key={i} className="log-entry">
            {log}
          </div>
        ))}
        <div className="terminal-cursor" />
      </div>
      {isFinished && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ff0000', fontSize: '3rem', fontWeight: 'bold' }}>
          DELETION COMPLETE.
        </div>
      )}
    </div>
  );
}

export default DeletionLogScene;

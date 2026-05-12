import { useEffect, useRef, useState } from 'react';

function NullBootScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [showText, setShowText] = useState(false);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playBootSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // Very short, high-pitched digital boot sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14;
    const columns = Math.ceil(canvas.width / fontSize);
    const rows = Math.ceil(canvas.height / (fontSize * 1.2));

    let animationFrame: number;

    const draw = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let x = 0; x < columns; x++) {
        for (let y = 0; y < rows; y++) {
          // Increased opacity for better visibility
          const opacity = 0.3 + Math.random() * 0.4;
          ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
          ctx.fillText('0', x * fontSize, y * fontSize * 1.2);
        }
      }

      // Occasionally add brighter patches
      if (Math.random() > 0.95) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 200, 2);
      }

      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    const bootTimer = setTimeout(() => {
      initAudio();
      playBootSound();
      setShowText(true);
    }, 1200);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
      clearTimeout(bootTimer);
    };
  }, []);

  return (
    <div className="scene-container" style={{ background: '#000', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      {showText

        // && (
        //   <div 
        //     className="null-boot-text"
        //     style={{
        //       position: 'absolute',
        //       top: '50%',
        //       left: '50%',
        //       transform: 'translate(-50%, -50%)',
        //       color: '#ff0000',
        //       fontFamily: 'Courier New, monospace',
        //       fontSize: '2.5rem',
        //       fontWeight: 'bold',
        //       textShadow: '0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.4)',
        //       textAlign: 'center',
        //       letterSpacing: '0.8rem',
        //       padding: '40px 60px',
        //       background: 'rgba(0,0,0,0.85)',
        //       border: '2px solid #ff0000',
        //       boxShadow: '0 0 50px rgba(255, 0, 0, 0.3)',
        //       zIndex: 10,
        //       whiteSpace: 'nowrap'
        //     }}
        //   >
        //     [UNIVERSE STATE: NULL_BOOT]
        //   </div>
        // )

      }
    </div>
  );
}

export default NullBootScene;

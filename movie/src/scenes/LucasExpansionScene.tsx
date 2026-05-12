import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  r: number;
  g: number;
  b: number;
  size: number;
  ease: number;
}

function LucasExpansionScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'display' | 'transforming' | 'expanding'>('display');
  const [bgColor, setBgColor] = useState('#000');
  const [showGlitch, setShowGlitch] = useState(false);
  
  const phaseRef = useRef<'display' | 'transforming' | 'expanding'>('display');
  const bgColorRef = useRef('#000');
  const particles = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const expansionScale = useRef(1);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sync refs for the animation loop
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { bgColorRef.current = bgColor; }, [bgColor]);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playTransformSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = '/lucas.svg';
    img.onload = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const imgWidth = 300;
      const imgHeight = (img.height / img.width) * imgWidth;
      const startX = (canvas.width - imgWidth) / 2;
      const startY = (canvas.height - imgHeight) / 2;

      ctx.drawImage(img, startX, startY, imgWidth, imgHeight);
      const imageData = ctx.getImageData(startX, startY, imgWidth, imgHeight);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const step = 4;
      const newParticles: Particle[] = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      for (let y = 0; y < imgHeight; y += step) {
        for (let x = 0; x < imgWidth; x += step) {
          const index = (y * imgWidth + x) * 4;
          const alpha = imageData.data[index + 3];
          if (alpha > 128) {
            const r = imageData.data[index];
            const g = imageData.data[index + 1];
            const b = imageData.data[index + 2];
            
            const a = 120;
            const b_axis = 80;
            const rho = Math.sqrt(Math.random());
            const phi = Math.random() * Math.PI * 2;
            const ovalX = centerX + rho * Math.cos(phi) * a;
            const ovalY = centerY + rho * Math.sin(phi) * b_axis;

            newParticles.push({
              x: startX + x,
              y: startY + y,
              originX: startX + x,
              originY: startY + y,
              targetX: ovalX,
              targetY: ovalY,
              r, g, b,
              size: step,
              ease: 0.03 + Math.random() * 0.07
            });
          }
        }
      }
      particles.current = newParticles;
      startLoop();
    };

    const startLoop = () => {
      const animate = () => {
        const pPhase = phaseRef.current;
        const cX = canvas.width / 2;
        const cY = canvas.height / 2;

        // Finale: Solid Dark Red with Glitches
        if (pPhase === 'expanding' && expansionScale.current > 8.5) {
          // Even darker, more ominous red
          ctx.fillStyle = '#4a0000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Intensive static noise
          const noiseData = ctx.createImageData(canvas.width, canvas.height);
          const data = noiseData.data;
          for (let i = 0; i < data.length; i += 4) {
            const val = Math.random() * 100;
            data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = val;
          }
          ctx.putImageData(noiseData, 0, 0);

          // Aggressive Black Line Glitches
          for (let i = 0; i < 8; i++) {
            if (Math.random() > 0.2) {
              ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.9})`;
              const h = Math.random() * 30;
              const y = Math.random() * canvas.height;
              // Horizontal glitch bars
              ctx.fillRect(0, y, canvas.width, h);
              
              // Occasionally add thin vertical lines
              if (Math.random() > 0.8) {
                ctx.fillRect(Math.random() * canvas.width, 0, 1 + Math.random() * 3, canvas.height);
              }
            }
          }

          // Frame jitter / Tearing effect
          if (Math.random() > 0.8) {
            const sliceY = Math.random() * canvas.height;
            const sliceH = Math.random() * 100;
            const offset = (Math.random() - 0.5) * 40;
            const slice = ctx.getImageData(0, sliceY, canvas.width, sliceH);
            ctx.putImageData(slice, offset, sliceY);
          }

          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (pPhase === 'expanding') {
          expansionScale.current += 0.15;
          if (expansionScale.current > 7) setShowGlitch(true);
        }

        particles.current.forEach(p => {
          let tX = p.originX;
          let tY = p.originY;

          if (pPhase !== 'display') {
            tX = p.targetX;
            tY = p.targetY;
          }

          const currentEase = pPhase === 'transforming' ? p.ease * 0.3 : p.ease;
          p.x += (tX - p.x) * currentEase;
          p.y += (tY - p.y) * currentEase;

          let dX = p.x;
          let dY = p.y;
          let dS = p.size;
          let r = p.r;
          let g = p.g;
          let b = p.b;

          if (pPhase === 'expanding') {
            const dx = p.x - cX;
            const dy = p.y - cY;
            dX = cX + dx * expansionScale.current;
            dY = cY + dy * expansionScale.current;
            
            const factor = Math.min(1, (expansionScale.current - 1) / 7.5);
            r = p.r + (74 - p.r) * factor; // Leading towards #4a0000
            g = p.g * (1 - factor);
            b = p.b * (1 - factor);
            dS = p.size * expansionScale.current * (1 + factor);
            
            if (factor >= 1 && bgColorRef.current !== '#4a0000') {
              setBgColor('#4a0000');
            }
          }

          ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
          ctx.fillRect(dX, dY, dS, dS);
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    };

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => {
      initAudio(); // Attempt auto-init
      setPhase('transforming');
      playTransformSound();
    }, 1000); // Shortened initial delay for better flow

    const t2 = setTimeout(() => {
      setPhase('expanding');
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="scene-container" style={{ background: bgColor, transition: 'background 1s' }}>
      <div className={`tv-glitch-overlay ${showGlitch ? 'active' : ''}`} />
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default LucasExpansionScene;

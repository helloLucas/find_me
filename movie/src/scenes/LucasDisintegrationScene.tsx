import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  r: number;
  g: number;
  b: number;
  vx: number;
  vy: number;
  size: number;
  friction: number;
  ease: number;
  life: number;
  maxLife: number;
}

function LucasDisintegrationScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const isDisintegratingRef = useRef(false);

  // Initialize Audio
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudio);
    return () => window.removeEventListener('click', initAudio);
  }, []);

  const playShatterSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(5000, ctx.currentTime + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
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

      const imgWidth = 400;
      const imgHeight = (img.height / img.width) * imgWidth;
      const startX = (canvas.width - imgWidth) / 2;
      const startY = (canvas.height - imgHeight) / 2;

      ctx.drawImage(img, startX, startY, imgWidth, imgHeight);
      const imageData = ctx.getImageData(startX, startY, imgWidth, imgHeight);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const step = 4;
      const newParticles: Particle[] = [];
      for (let y = 0; y < imgHeight; y += step) {
        for (let x = 0; x < imgWidth; x += step) {
          const index = (y * imgWidth + x) * 4;
          const alpha = imageData.data[index + 3];

          if (alpha > 128) {
            const r = imageData.data[index];
            const g = imageData.data[index + 1];
            const b = imageData.data[index + 2];

            newParticles.push({
              x: startX + x,
              y: startY + y,
              originX: startX + x,
              originY: startY + y,
              r, g, b,
              vx: 0,
              vy: 0,
              size: step,
              friction: 0.98,
              ease: 0.1,
              life: 1,
              maxLife: 2 + Math.random() * 4
            });
          }
        }
      }
      particles.current = newParticles;
      requestAnimationFrame(animate);
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Filter out dead particles
      particles.current = particles.current.filter(p => p.life > 0);

      particles.current.forEach(p => {
        if (isDisintegratingRef.current) {
          // Disintegrating movement
          if (p.vx === 0 && p.vy === 0) {
            p.vx = (Math.random() - 0.5) * 8;
            p.vy = (Math.random() - 0.5) * 8;
          }
          p.vx *= p.friction;
          p.vy *= p.friction;
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.003;
        } else {
          // Keep in place before disintegration
          p.x += (p.originX - p.x) * p.ease;
          p.y += (p.originY - p.y) * p.ease;
        }

        const opacity = Math.max(0, p.life);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${opacity})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []); // Only run once on mount

  const handleStart = () => {
    setIsDisintegrating(true);
    isDisintegratingRef.current = true;
    playShatterSound();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleStart();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="scene-container" style={{ background: '#000' }} onClick={playShatterSound}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default LucasDisintegrationScene;

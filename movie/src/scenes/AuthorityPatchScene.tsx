import { useEffect, useRef, useState } from 'react';

/**
 * AuthorityPatchScene - "Global Cascade"
 * 
 * Features:
 * - 100+ random arcs spreading from KOREA.
 * - Surface shockwaves expanding from the source.
 * - High-density data flow.
 * - No city labels (except KOREA).
 */
function AuthorityPatchScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>();
  const [isInitialized, setIsInitialized] = useState(false);

  const stateRef = useRef({
    time: 0,
    lastHeartbeat: 0,
    pulse: 0,
    pathProgress: 0,
    camera: { rotX: 0, rotY: 0, zoom: 1.25 }, // Start zoomed in for sharpness
    // Generate many random targets
    targets: Array.from({ length: 120 }, () => ({
      lat: (Math.random() - 0.5) * 1.3,
      lon: (Math.random() * 2 - 1.2),
      color: `hsla(${180 + Math.random() * 60}, 100%, 65%, ${0.6 + Math.random() * 0.4})`, // Higher base opacity
      delay: Math.random() * 0.4,
      speed: 0.006 + Math.random() * 0.012
    }))
  });

  const sourceCity = { name: 'KOREA', lat: 0.22, lon: 0.72 };

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playHeartbeatSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const playThump = (freq: number, startTime: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(5, startTime + 0.6);
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(startTime); osc.stop(startTime + 0.7);
    };
    playThump(45, now, 0.6);
    playThump(35, now + 0.2, 0.5);
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
    window.addEventListener('resize', resize);
    resize();

    const project = (lat: number, lon: number, radius: number = 300) => {
      const state = stateRef.current;
      const zoom = state.camera.zoom * (canvas.width / 1600);
      const x = radius * Math.cos(lat * Math.PI) * Math.sin(lon * Math.PI);
      const y = radius * Math.sin(lat * Math.PI);
      const z = radius * Math.cos(lat * Math.PI) * Math.cos(lon * Math.PI);
      
      // Manual rotation logic for cleaner depth
      const ry = lon * Math.PI + state.camera.rotY;
      const rz = z * Math.cos(state.camera.rotY) - x * Math.sin(state.camera.rotY);
      const rx = x * Math.cos(state.camera.rotY) + z * Math.sin(state.camera.rotY);

      const scale = (rz + radius * 2.5) / (radius * 2.5);
      return {
        x: canvas.width / 2 + rx * zoom * scale,
        y: canvas.height / 2 - y * zoom * scale,
        z: rz,
        scale: scale
      };
    };

    const animate = (t: number) => {
      const state = stateRef.current;
      state.time = t;

      if (t - state.lastHeartbeat > 1600) {
        state.lastHeartbeat = t;
        state.pulse = 1.0;
        if (isInitialized) playHeartbeatSound();
      }
      state.pulse *= 0.96;

      state.camera.rotY = t * 0.00015;
      if (isInitialized && state.camera.zoom < 1.4) state.camera.zoom += 0.001; // Slower zoom, already sharp
      if (isInitialized && state.pathProgress < 1.5) state.pathProgress += 0.008;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#020205';
      ctx.fillRect(0, 0, w, h);

      const radius = 300;

      // 1. Digital Globe Mesh
      ctx.fillStyle = 'rgba(0, 255, 200, 0.25)';
      const step = 0.04;
      for (let lat = -0.5; lat <= 0.5; lat += step) {
        for (let lon = -1; lon <= 1; lon += step) {
          const p = project(lat, lon, radius);
          if (p.z < -50) continue; 
          
          // Surface shockwave effect
          const distToSource = Math.sqrt(Math.pow(lat - sourceCity.lat, 2) + Math.pow(lon - sourceCity.lon, 2));
          const wave = Math.max(0, 1 - Math.abs(distToSource - state.pathProgress * 0.8) * 10);
          
          const dotSize = (1.2 + wave * 3) * p.scale;
          ctx.globalAlpha = ((p.z + radius) / (radius * 2)) * (0.8 + wave * 0.2); // Higher base alpha for sharpness
          if (wave > 0.1) ctx.fillStyle = '#fff';
          else ctx.fillStyle = 'rgba(0, 255, 200, 0.85)'; // Much more vivid dots
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      // 2. 100+ Spreading Arcs
      const sourcePt = project(sourceCity.lat, sourceCity.lon, radius + 5);

      state.targets.forEach((target, i) => {
        const targetPt = project(target.lat, target.lon, radius + 5);
        if (sourcePt.z < -100 && targetPt.z < -100) return;

        const progress = Math.max(0, state.pathProgress - target.delay);
        if (progress <= 0) return;

        const midPt = project((sourceCity.lat + target.lat) / 2, (sourceCity.lon + target.lon) / 2, radius + 150);

        ctx.strokeStyle = target.color;
        ctx.lineWidth = 1.5 * sourcePt.scale;
        ctx.lineCap = 'round';
        ctx.shadowBlur = state.pulse * 15;
        ctx.shadowColor = target.color;
        ctx.globalAlpha = Math.max(0, (sourcePt.z + radius) / (radius * 2));

        ctx.beginPath();
        ctx.moveTo(sourcePt.x, sourcePt.y);
        ctx.quadraticCurveTo(midPt.x, midPt.y, targetPt.x, targetPt.y);
        
        const drawLimit = Math.min(1, progress * 2);
        ctx.setLineDash([drawLimit * 1000, 2000]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Data flow packets
        if (isInitialized && progress > 0.1) {
          const flowT = ((t + i * 100) % 1500) / 1500;
          if (flowT < drawLimit) {
            const fx = (1-flowT)*(1-flowT)*sourcePt.x + 2*(1-flowT)*flowT*midPt.x + flowT*flowT*targetPt.x;
            const fy = (1-flowT)*(1-flowT)*sourcePt.y + 2*(1-flowT)*flowT*midPt.y + flowT*flowT*targetPt.y;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
          }
        }
      });

      // 3. Source Node (KOREA)
      if (sourcePt.z > -100) {
        ctx.fillStyle = '#00ffcc';
        ctx.shadowBlur = 30 * state.pulse;
        ctx.shadowColor = '#00ffcc';
        ctx.beginPath(); ctx.arc(sourcePt.x, sourcePt.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('KOREA', sourcePt.x, sourcePt.y - 25);
      }

      ctx.globalAlpha = 1.0;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isInitialized]);

  return (
    <div 
      className="scene-container" 
      onClick={() => {
        initAudio();
        setIsInitialized(true);
      }}
      style={{ background: '#000', cursor: 'pointer' }}
    >
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        color: 'rgba(0, 255, 255, 0.1)', fontFamily: '"JetBrains Mono", monospace',
        fontSize: '15vw', fontWeight: 900, pointerEvents: 'none', zIndex: 0
      }}>
        GLOBAL
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1 }} />
    </div>
  );
}

export default AuthorityPatchScene;

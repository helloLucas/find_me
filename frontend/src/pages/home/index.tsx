import CyberpunkBackground from '../../widgets/landing/CyberpunkBackground';

const MenuButton = ({ label, delay = 0 }: { label: string; delay?: number }) => (
  <button 
    className="group relative w-80 py-4 text-left transition-all duration-300 animate-in fade-in slide-in-from-left-12"
    style={{ 
      animationDelay: `${delay}ms`, 
      animationFillMode: 'both',
      fontFamily: "'Press Start 2P', cursive"
    }}
  >
    <div className="relative flex items-center gap-6 px-4 z-10">
      {/* Selector Icon */}
      <span className="text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        &gt;
      </span>
      
      <span className="text-sm tracking-widest uppercase text-white group-hover:text-cyan-400 group-hover:translate-x-4 transition-all duration-200 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
        {label}
      </span>
      
      {/* HUD line decoration on hover */}
      <div className="absolute left-0 bottom-0 w-0 h-[1px] bg-cyan-400/50 group-hover:w-full transition-all duration-500" />
    </div>
  </button>
);

export default function HomePage() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden text-white font-mono">
      <CyberpunkBackground />
      
      {/* Landing Content */}
      <div className="z-10 flex flex-col items-center w-full max-w-4xl space-y-20">
        
        {/* Glitch Title Section */}
        <div className="relative group select-none">
          <h1 className="glitch text-7xl md:text-9xl font-black italic tracking-normal text-white uppercase text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              data-text="VOID CITY"
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: 'clamp(2.5rem, 10vw, 6rem)' }}>
            VOID CITY
          </h1>
          
          <div className="mt-8 flex flex-col items-center gap-2 animate-pulse">
            <span className="text-[10px] font-mono tracking-[1.5em] text-cyan-400 opacity-70 ml-4">
              NEURAL_PROTO_0.14
            </span>
            <div className="w-64 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          </div>
        </div>
        
        {/* HUD Menu Section */}
        <nav className="flex flex-col gap-1 items-start relative pl-12 border-l border-white/10">
          <MenuButton label="New Game" delay={1200} />
          <MenuButton label="Continue" delay={1400} />
          <MenuButton label="Settings" delay={1600} />
          <MenuButton label="Credits" delay={1800} />
          
          {/* Corner HUD decorations */}
          <div className="absolute top-0 left-0 w-4 h-[1px] bg-pink-500" />
          <div className="absolute bottom-0 left-0 w-4 h-[1px] bg-pink-500" />
        </nav>
      </div>

      {/* Subtle scanline effect */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-20 opacity-40 mix-blend-overlay" />
      
      {/* CRT Overlay Effect */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle,rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_100%)] z-30" />

      {/* Meta HUD Decorations */}
      <div className="absolute top-8 left-8 flex flex-col gap-2 font-mono text-[10px] text-cyan-500/30 tracking-tight">
        <span>LOC_SEOUL_B102 / NODE_S14</span>
        <div className="flex gap-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`w-1 h-3 ${i < 7 ? 'bg-cyan-500/40' : 'bg-cyan-500/10'}`} />
          ))}
        </div>
      </div>
      
      <div className="absolute bottom-8 right-8 font-mono text-[10px] text-pink-500/30 text-right uppercase">
        <span>© 2026 VOID_INDUSTRIES</span><br />
        <span className="animate-pulse">CONNECTION STATUS: UNSTABLE</span>
      </div>

      <style>{`
        .glitch {
          position: relative;
          color: white;
        }

        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
        }

        .glitch::before {
          left: 2px;
          text-shadow: -2px 0 #ff00ff;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          animation: glitch-anim 2s infinite linear alternate-reverse;
        }

        .glitch::after {
          left: -2px;
          text-shadow: -2px 0 #00ffff, 2px 2px #ff00ff;
          animation: glitch-anim2 3s infinite linear alternate-reverse;
          clip-path: polygon(0 80%, 100% 20%, 100% 100%, 0 100%);
        }

        @keyframes glitch-anim {
          0% { clip-path: inset(40% 0 61% 0); transform: skew(0.58deg); }
          20% { clip-path: inset(92% 0 1% 0); transform: skew(0.12deg); }
          40% { clip-path: inset(43% 0 1% 0); transform: skew(0.32deg); }
          60% { clip-path: inset(25% 0 58% 0); transform: skew(0.99deg); }
          80% { clip-path: inset(54% 0 7% 0); transform: skew(0.86deg); }
          100% { clip-path: inset(58% 0 43% 0); transform: skew(0.44deg); }
        }

        @keyframes glitch-anim2 {
          0% { clip-path: inset(12% 0 78% 0); transform: skew(0.12deg); }
          20% { clip-path: inset(21% 0 12% 0); transform: skew(0.32deg); }
          40% { clip-path: inset(76% 0 1% 0); transform: skew(0.99deg); }
          60% { clip-path: inset(43% 0 43% 0); transform: skew(0.86deg); }
          80% { clip-path: inset(56% 0 12% 0); transform: skew(0.44deg); }
          100% { clip-path: inset(89% 0 2% 0); transform: skew(0.58deg); }
        }
      `}</style>
    </main>
  );
}

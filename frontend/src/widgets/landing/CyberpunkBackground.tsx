import React from 'react';

const CyberpunkBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#050208]">
      {/* Background Stars/Distant Layer */}
      <div 
        className="absolute inset-0 w-full h-full opacity-30"
        style={{
          backgroundImage: 'url("/assets/landing/pixel_city_layer_1.png")',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Middle Layer (Scrolling) */}
      <div 
        className="absolute inset-0 w-[400%] h-full opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'url("/assets/landing/pixel_city_layer_2.png")',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          animation: 'scroll-left-slow 120s linear infinite',
          mixBlendMode: 'screen',
        }}
      />
      
      {/* Foreground Layer (Scrolling) */}
      <div 
        className="absolute inset-0 w-[400%] h-full opacity-80 pointer-events-none"
        style={{
          backgroundImage: 'url("/assets/landing/pixel_city_layer_3.png")',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          animation: 'scroll-left-fast 60s linear infinite',
          mixBlendMode: 'screen',
        }}
      />

      {/* Central Vignette/Focus Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,#050208_80%)] opacity-60 z-5" />

      {/* Bottom Glow/Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-[#050208] via-[#050208]/80 to-transparent z-10" />
      
      {/* Scanline Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20 z-20" />

      <style>{`
        @keyframes scroll-left-slow {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes scroll-left-fast {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default CyberpunkBackground;

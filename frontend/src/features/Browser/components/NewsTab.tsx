import React from 'react';

export const NewsTab: React.FC = () => {
  return (
    <div className="w-full h-full p-4 overflow-y-auto bg-[#0a0514] font-pixel selection:bg-[#a48cff] selection:text-[#0a0514]">
      <div className="max-w-[600px] border-2 border-[#543ab7] p-6 rounded-sm bg-[#110a26] shadow-[inset_0_0_20px_rgba(84,58,183,0.3)]">
        
        {/* Title */}
        <h1 className="text-4xl text-[#c7b3ff] drop-shadow-[0_0_8px_#c7b3ff] mb-4 border-b-2 border-[#543ab7] pb-2 font-serif font-bold tracking-wide" style={{ textShadow: "0 0 10px #c7b3ff, 0 0 20px #8b5cf6" }}>
          Retro Web News
        </h1>

        <div className="flex flex-col gap-8 mt-6">
          <article>
            <h2 className="text-[#ff9d76] text-xl mb-2 drop-shadow-[0_0_5px_#ff9d76]">
              Internet Explorer 3.0 Released!
            </h2>
            <p className="text-[#0ff] text-base leading-relaxed drop-shadow-[0_0_2px_#00ffff]">
              Microsoft has just released the highly anticipated version 3 of its Internet Explorer browser. Users can now enjoy support for CSS and MIDI background music.
            </p>
          </article>

          <article>
            <h2 className="text-[#ff9d76] text-xl mb-2 drop-shadow-[0_0_5px_#ff9d76]">
              Y2K Bug Looming
            </h2>
            <p className="text-[#0ff] text-base leading-relaxed drop-shadow-[0_0_2px_#00ffff]">
              Experts warn that the impending year 2000 bug could cause computers world-wide to crash. Prepare your floppy disks and backups today.
            </p>
          </article>
        </div>

      </div>
    </div>
  );
};

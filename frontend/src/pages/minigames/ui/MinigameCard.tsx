import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface MinigameCardProps {
  id: string;
  title: string;
  chapter: number;
  description: string;
  status: 'available' | 'locked';
  onClick: () => void;
  icon: React.ReactNode;
  backgroundImage: string;
}

const PixelLock = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
        <path d="M5 5V4C5 2.34315 6.34315 1 8 1C9.65685 1 11 2.34315 11 4V5H13V15H3V5H5ZM7 5H9V4C9 3.44772 8.55228 3 8 3C7.44772 3 7 3.44772 7 4V5Z" />
    </svg>
);

const PixelPlay = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
        <path d="M4 3H6V5H8V7H10V9H8V11H6V13H4V11H6V9H8V7H6V5H4V3Z" />
    </svg>
);

export const MinigameCard: React.FC<MinigameCardProps> = ({
  title,
  chapter,
  description,
  status,
  onClick,
  icon,
  backgroundImage,
}) => {
  const { t } = useTranslation();
  const isLocked = status === 'locked';

  return (
    <div
      onClick={!isLocked ? onClick : undefined}
      className={`group relative flex-1 border px-6 py-6 flex flex-col justify-center overflow-hidden rounded-sm transition-all duration-300 ${
        isLocked
          ? 'border-gray-800 bg-black/40 cursor-not-allowed opacity-60'
          : 'border-gray-600 bg-[#0a0c08] hover:border-[#a3e635] hover:bg-[#12170d] cursor-pointer shadow-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.15)]'
      }`}
    >
      {/* Background Decorative Element */}
      <div 
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(100%)',
        }}
      />

      <div className="z-10">
        <span className={`text-[10px] md:text-xs tracking-widest flex items-center mb-1 font-lobby ${
          isLocked ? 'text-gray-500' : 'text-[#a3e635]'
        }`}>
          {isLocked ? <PixelLock /> : <PixelPlay />}
          {isLocked ? 'ACCESS RESTRICTED' : 'READY TO RUN'}
        </span>
        <h2 className={`text-xl md:text-2xl tracking-widest font-lobby ${
          isLocked ? 'text-gray-400' : 'text-white'
        }`}>
          {title}
        </h2>
        <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm font-mono ${
                isLocked ? 'border-gray-800 text-gray-600' : 'border-[#a3e635]/30 text-[#a3e635]/70'
            }`}>
                CHAPTER {chapter}
            </span>
            <h3 className={`text-[10px] md:text-xs uppercase tracking-wider font-lobby opacity-70 ${
                isLocked ? 'text-gray-500' : 'text-gray-300'
            }`}>
                {description}
            </h3>
        </div>
      </div>

      <div className={`absolute right-4 -bottom-4 text-6xl md:text-[80px] font-bold pointer-events-none leading-none font-lobby transition-colors ${
        isLocked ? 'text-gray-900' : 'text-white/5 group-hover:text-[#a3e635]/10'
      }`}>
        {String(chapter).padStart(2, '0')}
      </div>
    </div>
  );
};

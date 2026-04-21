import React from 'react';
import { useAuthStore } from '../../app/store/authStore';
import { useNavigate } from 'react-router-dom';

interface MainMenuProps {
  onLoginClick?: () => void;
  onGuestClick?: () => void;
  onLogoutClick?: () => void;
}

/**
 * 메뉴 영역 (Login / Guest or Chapter / Logout)
 */
const MainMenu: React.FC<MainMenuProps> = ({ onLoginClick, onGuestClick, onLogoutClick }) => {
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();

  // 공통 스타일 클래스 정의
  const baseClass = "font-pixel cursor-pointer transition-colors drop-shadow-md hover:text-gray-400";
  const sizeClass = "text-2xl md:text-3xl"; // 폰트 크기 통일

  return (
    <nav className="flex flex-col gap-6 ml-2 select-none">
      {isLoggedIn ? (
        <>
          <div
            onClick={() => navigate('/lobby')}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            Select Chapter
          </div>
          <div
            onClick={onLogoutClick}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            Logout
          </div>
        </>
      ) : (
        <>
          <div
            onClick={onLoginClick}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            Login
          </div>
          <div
            onClick={onGuestClick}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            Guest
          </div>
        </>
      )}
    </nav>
  );
};

export default MainMenu;

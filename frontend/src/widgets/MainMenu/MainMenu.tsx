import React from 'react';
import { useAuthStore } from '../../app/store/authStore';
import { useNavigate } from 'react-router-dom';
import { trackAnalyticsEvent } from '../../shared/analytics';

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
  const baseClass = "font-app-text cursor-pointer transition-colors drop-shadow-md hover:text-gray-400";
  const sizeClass = "text-4xl md:text-5xl uppercase tracking-tighter";

  return (
    <nav className="flex flex-col gap-6 ml-2 select-none">
      {isLoggedIn ? (
        <>
          <div
            onClick={() => {
              trackAnalyticsEvent('main_menu_select_chapter_clicked');
              navigate('/lobby');
            }}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            Select Chapter
          </div>
          <div
            onClick={() => {
              trackAnalyticsEvent('main_menu_logout_clicked');
              onLogoutClick?.();
            }}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            Logout
          </div>
        </>
      ) : (
        <>
          <div
            onClick={() => {
              trackAnalyticsEvent('main_menu_login_clicked');
              onLoginClick?.();
            }}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            Login
          </div>
          <div
            onClick={() => {
              trackAnalyticsEvent('main_menu_guest_clicked');
              onGuestClick?.();
            }}
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

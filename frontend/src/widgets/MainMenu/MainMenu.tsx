import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { isLoggedIn, role } = useAuthStore();
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
            {t('lobby.selectChapter')}
          </div>
          {role === 'ADMIN' && (
            <div
              onClick={() => {
                trackAnalyticsEvent('main_menu_dashboard_clicked');
                navigate('/admin');
              }}
              className={`${baseClass} ${sizeClass} text-white`}
            >
              Dashboard
            </div>
          )}
          <div
            onClick={() => {
              trackAnalyticsEvent('main_menu_logout_clicked');
              onLogoutClick?.();
            }}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            {t('common.logout')}
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
            {t('common.login')}
          </div>
          <div
            onClick={() => {
              trackAnalyticsEvent('main_menu_guest_clicked');
              onGuestClick?.();
            }}
            className={`${baseClass} ${sizeClass} text-white`}
          >
            {t('common.guest')}
          </div>
        </>
      )}
    </nav>
  );
};

export default MainMenu;

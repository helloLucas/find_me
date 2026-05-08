import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationKO from './locales/ko/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
  ko: { translation: translationKO },
  en: { translation: translationEN },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // 기본 언어를 한국어로 설정
    fallbackLng: 'en', // 번역이 없을 경우 영어를 사용
    interpolation: {
      escapeValue: false, // React는 기본적으로 XSS를 방지하므로 false
    },
  });

export default i18n;

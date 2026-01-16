import { useLanguage } from '../context/LanguageContext';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switcher">
      <button
        className={language === 'ua' ? 'active' : ''}
        onClick={() => setLanguage('ua')}
        title="Українська"
      >
        UA
      </button>
      <button
        className={language === 'ru' ? 'active' : ''}
        onClick={() => setLanguage('ru')}
        title="Русский"
      >
        RU
      </button>
      <button
        className={language === 'en' ? 'active' : ''}
        onClick={() => setLanguage('en')}
        title="English"
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;

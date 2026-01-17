import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getProfile, updateProfile } from '../api/profile';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import TimezoneSelector from '../components/ui/TimezoneSelector';
import LogoutConfirmModal from '../components/modals/LogoutConfirmModal';
import './Settings.css';

const Settings = () => {
  const { logout } = useAuth();
  const { setLanguage, t } = useLanguage();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profile = await getProfile();
      if (profile.timezone) {
        setTimezone(profile.timezone);
      }
      if (profile.language) {
        setLanguage(profile.language as 'en' | 'ua' | 'ru');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (lang: 'en' | 'ua' | 'ru') => {
    setLanguage(lang);
    try {
      await updateProfile({ language: lang });
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    setTimezone(tz);
    try {
      setSaving(true);
      await updateProfile({ timezone: tz });
    } catch (error) {
      console.error('Error saving timezone:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
  };

  return (
    <div className="settings">
      <main className="settings-main">
        <div className="settings-card">
          <div className="settings-header">
            <h2>{t('settings.title')}</h2>
            <button onClick={() => setIsLogoutModalOpen(true)} className="btn-logout-icon" title={t('settings.logout')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="loading">{t('common.loading')}</div>
          ) : (
            <>
              <div className="settings-section">
                <h3>{t('settings.language')}</h3>
                <div className="language-switcher-container">
                  <LanguageSwitcher onLanguageChange={handleLanguageChange} />
                </div>
              </div>

              <div className="settings-section">
                <h3>{t('settings.timezone')}</h3>
                <TimezoneSelector
                  value={timezone}
                  onChange={handleTimezoneChange}
                  disabled={saving}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default Settings;

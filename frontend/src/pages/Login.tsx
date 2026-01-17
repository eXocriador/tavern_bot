import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import './Login.css';

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          auth_date: number;
          hash: string;
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

const Login = () => {
  const { login, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'your_bot_username';
  const [telegramId, setTelegramId] = useState('');
  const [useDevMode, setUseDevMode] = useState(false);
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Auto-login via Telegram Web App
  useEffect(() => {
    const handleTelegramWebAppAuth = async () => {
      // Check if running inside Telegram Web App
      if (!window.Telegram?.WebApp) {
        setIsTelegramWebApp(false);
        return; // Not in Telegram, use regular login widget
      }

      const webApp = window.Telegram.WebApp;
      setIsTelegramWebApp(true);
      webApp.ready();
      webApp.expand();

      const initData = webApp.initDataUnsafe;

      // Check if we have user data
      if (!initData.user || !initData.user.id) {
        console.log('No user data in Telegram Web App');
        return; // No user data, fall back to widget
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || '/api';

        // Send initData string to backend for verification
        const response = await axios.post(`${API_URL}/auth/webapp`, {
          initData: webApp.initData, // Send raw initData string for verification
        });

        if (response.data.success && response.data.user) {
          const userData = response.data.user;
          // Update auth context
          localStorage.setItem('user', JSON.stringify(userData));
          window.location.href = '/'; // Force reload to update auth state
        }
      } catch (error) {
        console.error('Telegram Web App auth failed:', error);
        // Fall back to regular login widget
      }
    };

    handleTelegramWebAppAuth();
  }, [login, navigate]);

  useEffect(() => {
    if (useDevMode) return; // Skip widget loading in dev mode

    // Telegram Login Widget callback
    window.onTelegramAuth = async (user: any) => {
      try {
        await login(user);
        navigate('/');
      } catch (error) {
        console.error('Login failed:', error);
        alert(t('login.error'));
      }
    };

    // Load Telegram Login Widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    const container = document.getElementById('telegram-login-container');
    if (container) {
      container.appendChild(script);
    }

    return () => {
      if (container && container.contains(script)) {
        container.removeChild(script);
      }
    };
  }, [login, navigate, botName, useDevMode]);

  const handleDevLogin = async () => {
    if (!telegramId || isNaN(Number(telegramId))) {
      alert(t('login.checkId'));
      return;
    }

    try {
      // For dev mode, always use local API (not ngrok URL)
      const API_URL = '/api'; // Use relative path to leverage Vite proxy
      const response = await axios.post(`${API_URL}/auth/dev`, {
        id: Number(telegramId),
        username: `dev_${telegramId}`,
        first_name: 'Dev',
      }, {
        headers: {
          'x-telegram-id': telegramId.toString(),
        },
      });

      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        // Manually set user and reload to update auth state
        localStorage.setItem('user', JSON.stringify(userData));
        window.location.href = '/'; // Force reload to update auth state
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Dev login failed:', error);
      const errorMessage = error.response?.data?.error || error.message || t('common.error');
      alert(`${t('login.error')}: ${errorMessage}`);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>{t('login.title')}</h1>
          <div className="login-language-switcher">
            <LanguageSwitcher />
          </div>
        </div>
        <p className="subtitle">{t('login.subtitle')}</p>

        {useDevMode ? (
          <div className="dev-login">
            <input
              type="text"
              placeholder={t('login.devInputPlaceholder')}
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              className="dev-input"
            />
            <button onClick={handleDevLogin} className="dev-button">
              {t('login.devButton')}
            </button>
            <button
              onClick={() => setUseDevMode(false)}
              className="dev-toggle"
            >
              {t('login.returnToTelegram')}
            </button>
            <p className="dev-hint">
              {t('login.devHint')}
            </p>
          </div>
        ) : (
          <>
            {!isTelegramWebApp && (
              <>
                <div id="telegram-login-container"></div>
                <button
                  onClick={() => setUseDevMode(true)}
                  className="dev-toggle"
                >
                  {t('login.devMode')}
                </button>
              </>
            )}
            {isTelegramWebApp && (
              <p className="hint">{t('common.loading')}</p>
            )}
          </>
        )}

        <p className="hint">
          {t('login.hint')}
        </p>
      </div>
    </div>
  );
};

export default Login;


import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
  }
}

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'your_bot_username';

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Telegram Login Widget callback
    window.onTelegramAuth = async (user: any) => {
      try {
        await login(user);
        navigate('/');
      } catch (error) {
        console.error('Login failed:', error);
        alert('Помилка авторизації. Спробуйте ще раз.');
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
  }, [login, navigate, botName]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Tavern Bot</h1>
        <p className="subtitle">Відстеження інстанс-зон Lineage 2</p>
        <div id="telegram-login-container"></div>
        <p className="hint">
          Увійдіть через Telegram, щоб почати відстежувати свої проходження інстансів
        </p>
      </div>
    </div>
  );
};

export default Login;


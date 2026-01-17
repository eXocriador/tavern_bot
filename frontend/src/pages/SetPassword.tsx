import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import './SetPassword.css';

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const telegramIdParam = searchParams.get('telegramId');

  const [telegramId, setTelegramId] = useState(telegramIdParam || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (telegramIdParam) {
      setTelegramId(telegramIdParam);
    }
  }, [telegramIdParam]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!telegramId) {
      setError('Введите Telegram ID');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await axios.post(`${API_URL}/auth/set-password`, {
        telegramId: Number(telegramId),
        password,
      });

      if (response.data?.success) {
        // Auto-login after setting password
        localStorage.setItem('user', JSON.stringify(response.data.user));
        window.location.href = '/';
      } else {
        setError('Failed to set password');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-password-container">
      <div className="set-password-panel">
        <div className="set-password-header">
          <h1>Установка пароля</h1>
          <p className="set-password-subtitle">Установите пароль для вашего аккаунта</p>
        </div>

        <form onSubmit={handleSetPassword} className="set-password-form">
          <div className="set-password-input-group">
            <label htmlFor="telegramId">Telegram ID</label>
            <input
              id="telegramId"
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="Введите ваш Telegram ID"
              required
              disabled={!!telegramIdParam}
              autoComplete="username"
            />
            <p className="set-password-hint">
              Узнайте свой ID через бота: <code>/id</code>
            </p>
          </div>

          <div className="set-password-input-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="set-password-input-group">
            <label htmlFor="confirmPassword">Подтвердите пароль</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {error && <div className="set-password-error">{error}</div>}

          <button type="submit" className="set-password-button" disabled={loading}>
            {loading ? 'Установка...' : 'Установить пароль'}
          </button>
        </form>

        <div className="set-password-links">
          <Link to="/login" className="set-password-link">
            Вернуться к входу
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;

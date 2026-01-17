import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [telegramId, setTelegramId] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [useOldPassword, setUseOldPassword] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      await axios.post(`${API_URL}/auth/forgot-password`, {
        telegramId: Number(telegramId),
      });

      setSuccess('Код отправлен в Telegram. Проверьте сообщения от бота.');
      setCodeSent(true);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to request reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        telegramId: Number(telegramId),
        newPassword,
        ...(useOldPassword
          ? { oldPassword }
          : { resetCode }),
      });

      if (response.data?.success) {
        setSuccess('Пароль успешно изменен. Теперь вы можете войти.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError('Failed to reset password');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-panel">
        <div className="forgot-password-header">
          <h1>Восстановление пароля</h1>
          <p className="forgot-password-subtitle">Восстановить доступ к аккаунту</p>
        </div>

        {!codeSent && !useOldPassword ? (
          <form onSubmit={handleRequestCode} className="forgot-password-form">
            <div className="forgot-password-input-group">
              <label htmlFor="telegramId">Telegram ID</label>
              <input
                id="telegramId"
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="Введите ваш Telegram ID"
                required
              />
            </div>

            {error && <div className="forgot-password-error">{error}</div>}
            {success && <div className="forgot-password-success">{success}</div>}

            <button type="submit" className="forgot-password-button" disabled={loading}>
              {loading ? 'Отправка...' : 'Получить код'}
            </button>

            <button
              type="button"
              className="forgot-password-toggle"
              onClick={() => setUseOldPassword(true)}
            >
              Использовать старый пароль
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            <div className="forgot-password-input-group">
              <label htmlFor="telegramId">Telegram ID</label>
              <input
                id="telegramId"
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="Введите ваш Telegram ID"
                required
                disabled={codeSent}
              />
            </div>

            {useOldPassword ? (
              <div className="forgot-password-input-group">
                <label htmlFor="oldPassword">Старый пароль</label>
                <input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Введите старый пароль"
                  required
                />
              </div>
            ) : (
              <div className="forgot-password-input-group">
                <label htmlFor="resetCode">Код восстановления</label>
                <input
                  id="resetCode"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Введите код из Telegram"
                  required
                />
                <p className="forgot-password-hint">
                  Код отправлен ботом в личные сообщения
                </p>
              </div>
            )}

            <div className="forgot-password-input-group">
              <label htmlFor="newPassword">Новый пароль</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                minLength={6}
              />
            </div>

            <div className="forgot-password-input-group">
              <label htmlFor="confirmPassword">Подтвердите пароль</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль"
                required
                minLength={6}
              />
            </div>

            {error && <div className="forgot-password-error">{error}</div>}
            {success && <div className="forgot-password-success">{success}</div>}

            <button type="submit" className="forgot-password-button" disabled={loading}>
              {loading ? 'Изменение...' : 'Изменить пароль'}
            </button>

            {!useOldPassword && (
              <button
                type="button"
                className="forgot-password-toggle"
                onClick={() => {
                  setCodeSent(false);
                  setResetCode('');
                }}
              >
                Запросить новый код
              </button>
            )}
          </form>
        )}

        <div className="forgot-password-links">
          <Link to="/login" className="forgot-password-link">
            Вернуться к входу
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

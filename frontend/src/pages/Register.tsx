import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [telegramId, setTelegramId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const response = await axios.post(`${API_URL}/auth/register`, {
        telegramId: Number(telegramId),
        password,
      });

      if (response.data?.success) {
        // Auto-login after registration
        localStorage.setItem('user', JSON.stringify(response.data.user));
        window.location.href = '/';
      } else {
        setError('Registration failed');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-panel">
        <div className="register-header">
          <h1>Регистрация</h1>
          <p className="register-subtitle">Создать новый аккаунт</p>
        </div>

        <form onSubmit={handleRegister} className="register-form">
          <div className="register-input-group">
            <label htmlFor="telegramId">Telegram ID</label>
            <input
              id="telegramId"
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="Введите ваш Telegram ID"
              required
              autoComplete="username"
            />
            <p className="register-hint">
              Узнайте свой ID через бота: <code>/id</code>
            </p>
          </div>

          <div className="register-input-group">
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

          <div className="register-input-group">
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

          {error && <div className="register-error">{error}</div>}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="register-links">
          <Link to="/login" className="register-link">
            Уже есть аккаунт? Войти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

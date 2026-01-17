import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { useLanguage } from '../context/LanguageContext';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const { t } = useLanguage();
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
      await apiClient.post('/auth/forgot-password', {
        telegramId: Number(telegramId),
      });

      setSuccess(t('forgotPassword.codeSent'));
      setCodeSent(true);
    } catch (error: any) {
      setError(error.response?.data?.error || t('forgotPassword.errors.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('forgotPassword.errors.mismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('forgotPassword.errors.tooShort'));
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/reset-password', {
        telegramId: Number(telegramId),
        newPassword,
        ...(useOldPassword
          ? { oldPassword }
          : { resetCode }),
      });

      if (response.data?.success) {
        setSuccess(t('forgotPassword.passwordReset'));
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(t('forgotPassword.errors.resetFailed'));
      }
    } catch (error: any) {
      setError(error.response?.data?.error || t('forgotPassword.errors.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-panel">
        <div className="forgot-password-header">
          <h1>{t('forgotPassword.title')}</h1>
          <p className="forgot-password-subtitle">{t('forgotPassword.subtitle')}</p>
        </div>

        {!codeSent && !useOldPassword ? (
          <form onSubmit={handleRequestCode} className="forgot-password-form">
            <div className="forgot-password-input-group">
              <label htmlFor="telegramId">{t('forgotPassword.telegramId')}</label>
              <input
                id="telegramId"
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder={t('forgotPassword.telegramIdPlaceholder')}
                required
              />
            </div>

            {error && <div className="forgot-password-error">{error}</div>}
            {success && <div className="forgot-password-success">{success}</div>}

            <button type="submit" className="forgot-password-button" disabled={loading}>
              {loading ? t('forgotPassword.sending') : t('forgotPassword.requestCode')}
            </button>

            <button
              type="button"
              className="forgot-password-toggle"
              onClick={() => setUseOldPassword(true)}
            >
              {t('forgotPassword.useOldPassword')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            <div className="forgot-password-input-group">
              <label htmlFor="telegramId">{t('forgotPassword.telegramId')}</label>
              <input
                id="telegramId"
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder={t('forgotPassword.telegramIdPlaceholder')}
                required
                disabled={codeSent}
              />
            </div>

            {useOldPassword ? (
              <div className="forgot-password-input-group">
                <label htmlFor="oldPassword">{t('forgotPassword.oldPassword')}</label>
                <input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t('forgotPassword.oldPasswordPlaceholder')}
                  required
                />
              </div>
            ) : (
              <div className="forgot-password-input-group">
                <label htmlFor="resetCode">{t('forgotPassword.resetCode')}</label>
                <input
                  id="resetCode"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder={t('forgotPassword.resetCodePlaceholder')}
                  required
                />
                <p className="forgot-password-hint">
                  {t('forgotPassword.resetCodeHint')}
                </p>
              </div>
            )}

            <div className="forgot-password-input-group">
              <label htmlFor="newPassword">{t('forgotPassword.newPassword')}</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('forgotPassword.newPasswordPlaceholder')}
                required
                minLength={6}
              />
            </div>

            <div className="forgot-password-input-group">
              <label htmlFor="confirmPassword">{t('forgotPassword.confirmPassword')}</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('forgotPassword.confirmPasswordPlaceholder')}
                required
                minLength={6}
              />
            </div>

            {error && <div className="forgot-password-error">{error}</div>}
            {success && <div className="forgot-password-success">{success}</div>}

            <button type="submit" className="forgot-password-button" disabled={loading}>
              {loading ? t('forgotPassword.resetting') : t('forgotPassword.resetButton')}
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
                {t('forgotPassword.requestNewCode')}
              </button>
            )}
          </form>
        )}

        <div className="forgot-password-links">
          <Link to="/login" className="forgot-password-link">
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
